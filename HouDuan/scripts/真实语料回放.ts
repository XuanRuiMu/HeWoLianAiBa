if (process.env.VITEST === 'true' || process.env.XU_KE_ZHEN_SHI_WAI_HU !== 'true') throw new Error('回放脚本仅可在允许本地真实调用的独立进程中运行')
if (process.env.NODE_ENV === 'production') throw new Error('回放不得连接生产环境')

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { 读取真实对话片段, 构造回放历史, 构造语义评审提示词, 解析语义评审, 创建回放记录器, 汇总问题标签, type 真实对话片段, type 语义评审轮次 } from '../src/services/语料读取'
import { shengChengDirectorCeLue } from '../src/services/Director'
import { shengChengWriterHuiFu } from '../src/services/Writer'
import { 按配置调用, chongZhiRongDuan } from '../src/utils/通用模型调用'
import { peiZhi } from '../src/config'
import { redis } from '../src/redis'
import type { AIYinQingShuRu, DuiHuaLiShiXiang } from '../src/types'

const 根 = resolve(__dirname, '..', '..')
const 日期 = new Date().toISOString().slice(0, 10).replaceAll('-', '')
const 文件 = resolve(根, '.agents', 'evidence', 'traces', `FP04-回放-${日期}-完整链路.jsonl`)
const 记录 = 创建回放记录器(文件, `FP04完整链路-${日期}-${process.pid}`)
const 原文目录 = resolve(根, '项目语料实验室', '公开语料', 'NaturalConv', '原始')
const 源哈希 = createHash('sha256').update(
  readFileSync(resolve(原文目录, 'datasets-server-rows-0-2.json')),
).digest('hex')
if (源哈希 !== '634768c4a6ca483fba145592d64f373c2dc938494fee5de29aec0e9b38dc7158') throw new Error('来源摘要与已核验公开语料不符')

const 配置哈希 = createHash('sha256')
for (const 子路径 of ['src/utils/通用模型调用.ts', 'src/services/Director.ts', 'src/services/Writer.ts', 'src/services/Prompt构建器.ts']) {
  配置哈希.update(readFileSync(resolve(__dirname, '..', 子路径)))
}
const 配置摘要 = 配置哈希.digest('hex')
let 调用计数 = 0
const 原网络 = globalThis.fetch.bind(globalThis)
let 动作 = ''
globalThis.fetch = async (输入, 参数) => {
  if (new URL(String(输入)).host === new URL(peiZhi.deepSeek.基础地址).host) {
    调用计数 += 1
    if (调用计数 > 40) throw new Error('总AI调用40次硬上限')
    console.log(`[真实模型 ${调用计数}/40] ${动作}`)
  }
  return 原网络(输入, 参数)
}

function 原始错误(原因: unknown): string {
  const 原文 = 原因 instanceof Error ? `${原因.name}: ${原因.message}` : String(原因)
  return 脱敏错误文本(原文)
}
function 脱敏错误文本(原文: string): string {
  return 原文.replaceAll(/sk-[\w.-]+/g, '[凭据已移除]').slice(0, 1800)
}
function 环境原因(原因: unknown): boolean {
  return /fetch failed|econn|etimedout|timeout|network|abort|超时|总AI调用40次/.test(原始错误(原因).toLowerCase())
}
async function 调用限时<T>(行为: (信号: AbortSignal) => Promise<T>): Promise<T> {
  const 控制 = new AbortController()
  const 终止 = setTimeout(() => 控制.abort(new Error('单次完整生成超过75000毫秒')), 75000)
  try {
    return await 行为(控制.signal)
  } finally {
    clearTimeout(终止)
  }
}

function 构造参与者(话语: string, 历史: DuiHuaLiShiXiang[]): AIYinQingShuRu {
  return {
    yong_hu_id: `FP04-${process.pid}`, jiao_se_id: '公开语料对话参与者',
    jiao_se: {
      id: '公开语料对话参与者', ming_zi: '对话参与者', wei_xin_ming: '对话参与者', xing_bie: 'nan', mbti_lei_xing: '', ie_lei_xing: 'I', re_shen_lei_xing: '慢热',
      nian_ling: 0, shen_fen: '', wai_mao: '', xing_ge: '', bei_jing_gu_shi: '', xi_hao: [], yan_yu_feng_ge: '自然承接当前话语', xing_wei_te_dian: '',
      tou_xiang: '', xi_huan_de_lei_xing: '', jia_ting_bei_jing: '', qing_gan_jing_li: '', shi_fou_zha_xing: false, shi_jie_xin_xi: {},
      ren_she_ka: '你是中文真人对话参与者之一，与对方围绕共享新闻语境进行日常聊天。新闻语境涉及中国女排电影、女排与演员。没有额外的性别、年龄、职业、恋爱身份、人格设定。不得自行编造自己的身份信息。',
      ba_da_mo_kuai: { ji_ben_xin_xi: '', wai_mao: '', xing_ge: '', bei_jing: '', yan_yu: '', xing_wei: '', guan_xi: '', xi_tong_ti_shi: '' },
    },
    hao_gan_du: { xin_ren_du: 100, qin_mi_du: 100, qu_wei_du: 100, guan_huai_du: 100, zong_fen: 400, guan_xi_jie_duan: 'renShi' },
    dui_hua_li_shi: 历史, yong_hu_xin_xiao_xi: 话语, shi_fou_di_yi_lun: 历史.length === 0, tu_pian_shou_quan: false,
  }
}

async function 运行片段(片段: 真实对话片段): Promise<{ 回应列表: Array<{ AI回应: string[]; 调用错误: string | null }>; 错误: unknown }> {
  const 回放: Array<{ AI回应: string[]; 调用错误: string | null }> = []
  const 既往: Array<{ A原话: string; AI回应: string[] }> = []
  let 最后错误: unknown = null
  for (const [序号, 轮次] of 片段.轮次.entries()) {
    const 历史 = 构造回放历史(既往)
    记录.写入({ 类型: '实际输入', 片段ID: 片段.片段ID, 轮次: 序号 + 1, A原话: 轮次.A原话, 模型历史: 历史, 真人B是否进入生成提示: false })
    try {
      const 回应 = await 调用限时(async (信号) => {
        const 历史消息: DuiHuaLiShiXiang[] = 历史.map((消息, 索引) => ({
          id: `${process.pid}-${索引}`, shi_jian: '12:00', nei_rong: 消息.content,
          fa_song_zhe_lei_xing: 消息.role === 'user' ? 'yonghu' : 'jiaose',
          fa_song_zhe_ming: 消息.role === 'user' ? '对方' : '对话参与者', yi_che_hui: false,
        }))
        const 输入 = 构造参与者(轮次.A原话, 历史消息)
        动作 = `${片段.片段ID}/第${序号 + 1}次/导演`
        const 策略 = await shengChengDirectorCeLue(输入, undefined, 信号)
        if (!策略.cheng_gong) throw new Error(`本地导演端点失败：${策略.cuo_wu ?? '未知'}`)
        动作 = `${片段.片段ID}/第${序号 + 1}次/写手`
        const 结果 = await shengChengWriterHuiFu(输入, 策略.ce_lue, undefined, 信号)
        if (策略.ce_lue.shi_fou_hui_fu && 结果.xiao_xi_lie_biao.length === 0) throw new Error('需要回复时模型产生空回应')
        return { AI回应: 结果.xiao_xi_lie_biao, 调用错误: !策略.ce_lue.shi_fou_hui_fu ? `导演选择不回：${策略.ce_lue.bu_hui_li_you ?? '未说明'}` : null }
      })
      回放.push(回应)
      既往.push({ A原话: 轮次.A原话, AI回应: 回应.AI回应 })
    } catch (原因) {
      最后错误 = 原因
      记录.写入({ 类型: '环境错误', 环境限制: 环境原因(原因), 片段ID: 片段.片段ID, 轮次: 序号 + 1, 错误: 原始错误(原因) })
      break
    }
  }
  return { 回应列表: 回放, 错误: 最后错误 }
}


async function 主程序(): Promise<void> {
  const 全部片段 = 读取真实对话片段(原文目录, 6)
  if (全部片段.length !== 6) throw new Error(`实际只有${全部片段.length}段三回合片段，不足以形成完整六组`)
  记录.写入({
    类型: '运行信息', 原始完整公开对话组: 2, 本次连续真实三回合片段: 6, 模型: peiZhi.deepSeek.模型,
    端点: peiZhi.deepSeek.基础地址, 调用硬上限: 40, 定额: '36次完整导演写手；3次按6回合一批语义评审；1次冗余',
    源文件摘要: 源哈希, 配置文件摘要: 配置摘要, 来源: 'https://huggingface.co/datasets/xywang1/NaturalConv固定adb38574e8014ada1d8404247167582e76b22d05',
    许可证据: '项目语料实验室/公开语料/来源.json；本地非商业研究；source_scope_review，4b来源要求待进一步核验',
    样本边界: '只落地2条原始完整对话，按连续顺序取6个各自不重叠三回合片段，未跑完整42回合，不证明恋爱质量',
    上下文规则: '先前仅有A与先前实际AI；无B答案泄漏给生成端；每组清空历史',
  })
  const 回放记录: Array<{ 片段: 真实对话片段; 回应列表: Array<{ AI回应: string[]; 调用错误: string | null }> }> = []
  let 生成失败: unknown = null
  for (const 片段 of 全部片段) {
    chongZhiRongDuan()
    const 结果 = await 运行片段(片段)
      回放记录.push({ 片段, 回应列表: 结果.回应列表 })
    if (结果.错误) {
      生成失败 = 结果.错误
      break
    }
  }
  interface 单轮评审输入 {
    全局序号: number
    片段: 真实对话片段
    局部轮次: number
    原轮次: { A原话: string; 真人B原话: string }
    实际: { AI回应: string[]; 调用错误: string | null }
  }
  const 单轮列表: 单轮评审输入[] = []
  for (const 当前 of 回放记录) {
    for (const [序号, 实际] of 当前.回应列表.entries()) {
      const 局轮次 = 当前.片段.轮次[序号]!
      单轮列表.push({ 全局序号: 单轮列表.length + 1, 片段: 当前.片段, 局部轮次: 序号 + 1, 原轮次: 局轮次, 实际 })
      记录.写入({ 类型: '实际生成原回应', 全局序号: 单轮列表.length, 片段ID: 当前.片段.片段ID, 轮次: 序号 + 1, A原话: 局轮次.A原话, 真人B原话: 局轮次.真人B原话, AI回应: 实际.AI回应, 调用错误: 实际.调用错误 })
    }
  }
  const 评审齐全列表: 语义评审轮次[] = []
  let 评审失败数量 = 0
  for (let 起点 = 0; 起点 < 单轮列表.length; 起点 += 6) {
    const 当前组 = 单轮列表.slice(起点, 起点 + 6)
    const 评审轮次映射: number[] = []
    try {
      动作 = `语义评审 ${1 + Math.floor(起点 / 6)}批第${起点 + 1}到${起点 + 当前组.length}全局轮次`
      const 实际评审 = await 调用限时(async (信号) => {
        const 请求 = 构造语义评审提示词({ 片段ID: `综合评审${起点 + 1}到${起点 + 当前组.length}`, 来源文件: '同固定源文件', 轮次: 当前组.map((项) => 项.原轮次) }, 当前组.map((项) => 项.实际))
        const 评价 = await 按配置调用('QingGanFenXi', [{ jiaoSe: 'user', neiRong: 请求 }], undefined, 信号)
        return 解析语义评审(评价.neiRong, 当前组.length)
      })
      for (const 评价结果 of 实际评审) {
        评审轮次映射.push(评价结果.轮次)
        const 原条目 = 当前组[评价结果.轮次 - 1]!
        记录.记录轮次({ 片段ID: 原条目.片段.片段ID, 来源文件: 原条目.片段.来源文件, 轮次: 原条目.局部轮次, A原话: 原条目.原轮次.A原话, 真人B原话: 原条目.原轮次.真人B原话, AI回应: 原条目.实际.AI回应, 语义接近: 评价结果.语义接近, 问题标签: 评价结果.问题标签, 判定理由: 评价结果.理由, 调用错误: 原条目.实际.调用错误 })
        评审齐全列表.push(评价结果)
      }
    } catch (原因) {
      评审失败数量++
      记录.写入({ 类型: '语义评审未完成', 解析或环境错误: 原始错误(原因), 全局序号: 当前组.map((项) => 项.全局序号), 原始A_B_AI: 当前组.map((项) => ({ ID: 项.全局序号, A原话: 项.原轮次.A原话, 真人B原话: 项.原轮次.真人B原话, AI回应: 项.实际.AI回应 }) ) })
      for (const 原条目 of 当前组) {
        记录.记录轮次({ 片段ID: 原条目.片段.片段ID, 来源文件: 原条目.片段.来源文件, 轮次: 原条目.局部轮次, A原话: 原条目.原轮次.A原话, 真人B原话: 原条目.原轮次.真人B原话, AI回应: 原条目.实际.AI回应, 语义接近: null, 问题标签: 原条目.实际.AI回应.length === 0 ? ['空回应'] : [], 判定理由: '语义评审因返回结构或调用原因未完成，按可疑结果留原文供人工复核，不推定其质量。', 调用错误: 原条目.实际.调用错误 })
      }
    }
  }
  const 汇总 = { 类型: '完整链路汇总', 来源原始完整对话: 2, 实际片段总数: 回放记录.length, 实际生成轮次数: 单轮列表.length, 实际响应非空: 单轮列表.filter((项) => 项.实际.AI回应.length > 0).length, 语义评审覆盖轮次: 评审齐全列表.length, 语义评审接近轮次: 评审齐全列表.filter((项) => 项.语义接近).length, 评审失败批次数: 评审失败数量, 问题标签汇总: 汇总问题标签(评审齐全列表), AI真实HTTP调用数: 调用计数, 主生成中止原因: 生成失败 ? 原始错误(生成失败) : null, 文件 }
  记录.写入(汇总)
  console.log(JSON.stringify(汇总, null, 2))
  if (生成失败 || 回放记录.length < 6) throw new Error(`环境或模型未支持完整运行，停止于${回放记录.length}片段${单轮列表.length}实际轮`)
}

主程序()
  .catch((原因: unknown) => {
    const 错误 = 原始错误(原因)
    记录.写入({ 类型: '主程序未完成', 环境限制: 环境原因(原因), 错误 })
    console.error(`真实回放执行结果不足目标：${错误}\n证据文件：${文件}`)
    process.exitCode = 1
  })
  .finally(() => {
    redis.disconnect()
  })

