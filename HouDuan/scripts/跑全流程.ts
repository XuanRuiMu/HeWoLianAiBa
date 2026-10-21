import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { shengChengJiaoSe } from '../src/services/角色生成'
import { gouJianWriterPrompt, gouJianHaoGanDuPingPanPrompt } from '../src/services/Prompt构建器'
import { shiXueShengShenFen } from '../src/config/角色配置'
import type { MBTILeiXing } from '../src/config/角色配置'
import type { DuiHuaLiShiXiang } from '../src/types'
import { 清洗回复 } from './直连适配器'
import { GouJianYuTaiKuai, ShengChengZaiMang, QuZaiMangWeiShuo } from '../../语料实验室/工作区/语态控制器'
import { PanYongHu, DingMoShi, JueDingFanYing, GouJianDuiHuaKuai, ChouYuTaiAnLeiXing, QingXiShuChu } from '../../语料实验室/工作区/对话系统'

const 出 = join(__dirname, '..', '..', '语料实验室', '全流程')
mkdirSync(出, { recursive: true })

const SF键 = process.env.SF_KEY || ''
const SF址 = 'https://api.siliconflow.cn/v1/chat/completions'
const SF模型 = process.env.SF_MODEL || 'deepseek-ai/DeepSeek-V4.1-Flash'

async function 外呼(系统: string, 用户: string, 上限 = 14): Promise<string> {
  let 末错 = ''
  for (let i = 0; i < 上限; i++) {
    try {
      const r = await fetch(SF址, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + SF键, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: SF模型,
          messages: [{ role: 'system', content: 系统 }, { role: 'user', content: 用户 }],
          stream: false, temperature: 0.92, max_tokens: 900,
        }),
      })
      if (r.ok) {
        const j = (await r.json()) as { choices: Array<{ message: { content: string } }> }
        return j.choices[0].message.content
      }
      末错 = 'HTTP ' + r.status
      if (r.status !== 429 && r.status < 500) throw new Error(末错 + ' ' + (await r.text()).slice(0, 150))
    } catch (e) {
      末错 = String(e).slice(0, 160)
    }
    await new Promise((z) => setTimeout(z, 2000 + 1500 * i))
  }
  throw new Error('外呼重试超限: ' + 末错)
}

function 造随机(种子: number) {
  let s = 种子 >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const MBTI表: MBTILeiXing[] = ['ISTJ','ISFJ','INFJ','INTJ','ISTP','ISFP','INFP','INTP','ESTP','ESFP','ENFP','ENFJ','ENTJ','ESTJ','ESFJ','ENTP']
const 起分表: Record<string, [number, number]> = {
  ISTJ:[320,390],ISFJ:[350,420],INFJ:[330,400],INTJ:[300,370],ISTP:[340,410],ISFP:[360,430],
  INFP:[350,420],INTP:[300,370],ESTP:[400,470],ESFP:[450,500],ENFP:[420,490],ENFJ:[400,470],
  ENTJ:[380,450],ESTJ:[360,430],ESFJ:[450,500],ENTP:[400,470],
}

const 玩家状态 = ['心情不错', '今天很累', '有点想她', '有点敷衍', '想约她出来', '在分享一件小事', '在问她的事', '有点吃醋', '有点冷淡']

export const 池: Record<string, string[]> = {
  熟: [
    '今天加班到八点 饿得不行 刚吃了碗面',
    '你说那个展我昨天去了 确实比想象的好',
    '今天地铁上有人拎了只猫 还戴着口罩',
    '刚跟朋友吃完饭 他们说我最近状态好多了',
    '你说那家店我记下了 改天去试试',
    '今天被客户气到了 改到第五版说还是第一版好',
    '周末一般你都在干嘛',
    '我突然想起来 你上次说想换工作 后来呢',
    '今天下雨了 你带伞没',
    '我妈又念叨我了 跟你吐槽一下 别嫌我烦',
    '你上次那个想法 我觉得比我想的周全',
    '这两天在想要不要换工作 有点犹豫',
    '刚看完你推荐的那部片子 结尾我没看懂',
    '你今天过得怎么样 有没有被气到',
    '下班路上经过一片海 突然想找人说话',
    '早点睡 别又熬到一两点',
  ],
  暧昧: [
    '你今天回得比平时慢 是忙还是不想聊',
    '刚才那句话我看了三遍才回',
    '周末那个展 再不看就撤了 你哪天有空',
    '我发现我最近老想起你说的某句话',
    '你对谁都这么好说话吗',
    '要是不方便就算了 当我没说',
    '今天路过你公司楼下 差点上去找你',
    '我可能有点贪心 想多占你一点时间',
    '你这个人 说话总留一半',
    '周六下午我空着 你看着办',
    '刚跟我妈说我在跟一个人聊天 她问是谁 我说不知道怎么说',
    '算了 不说了 睡了',
  ],
  恋人: [
    '我到楼下了 你不用下来',
    '今天买了你爱吃那个 放冰箱了',
    '你晚上几点回来 我先做饭',
    '我有点累 想早点睡',
    '今天被经理当着全组说了一顿 其实不是我的错',
    '你在忙吗 忙就晚点回我',
    '周末要不要去你上次说的那个地方',
    '刚洗完澡 头发还没干',
    '今天特别想你 说不上来为什么',
    '你妈那边我该怎么说',
  ],
  表白: ['林萱 我喜欢你 不是聊得来的那种喜欢'],
}

interface 轮记 { 轮: number; 玩家: string; 判定: string; 语态: string; 模式: string; 分前: number; 分后: number; 增量: number; 四维?: number[]; 回复: string; 不回?: boolean; 错?: string | null }

async function 打分(玩家消息: string, 角色回复: string, 角色名: string, 慢热: boolean): Promise<number[]> {
  const 提示 = gouJianHaoGanDuPingPanPrompt(玩家消息, 角色回复, 角色名, 慢热 ? ({ jiaoSe: { re_shen_lei_xing: '慢热' } } as never) : undefined)
  const 文原 = await 外呼('根据一轮对话判断好感变化，只输出 JSON。', 提示)
  const 反引 = String.fromCharCode(96).repeat(3)
  const 文 = 文原.split(反引).join('').replace(/^\s*json/, '').trim()
  const m = 文.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('打分不是JSON: ' + 文.slice(0, 120))
  const j = JSON.parse(m[0]) as Record<string, unknown>
  const 取 = (a: string, b: string) => Math.round(Number(j[a] ?? j[b] ?? 0))
  return [取('信任度变化','xin_ren_du_bian_hua'), 取('亲密度变化','qin_mi_du_bian_hua'), 取('趣味度变化','qu_wei_du_bian_hua'), 取('关怀度变化','guan_huai_du_bian_hua')]
}

async function 求玩家消息(历史: DuiHuaLiShiXiang[], 状态: string, 角色名: string, 阶段: string, 要表白: boolean): Promise<string> {
  const 记录 = 历史.map((x) => (x.fa_song_zhe_lei_xing === 'yonghu' ? '我: ' : '她: ') + x.nei_rong).join('\n')
  const 要求 = 要表白
    ? '这一轮你要正式跟她表白。直接说喜欢她，想在一起。一句话。'
    : '这一轮你的状态是「' + 状态 + '」，按这个状态回一句。'
  const 提示 = [
    '你在玩一个恋爱聊天游戏，对面是「' + 角色名 + '」，现在是「' + 阶段 + '」阶段。',
    '你是玩家，一个普通上班的人。',
    '',
    '【聊天记录】',
    记录 || '（还没开始）',
    '',
    '【你要做的】',
    '写你这一轮要发的那条消息。',
    要求,
    '',
    '【硬要求】',
    '- 一句话，20 字以内，像微信随手打的，不要标点太工整',
    '- 只能聊聊天记录里真实出现过的事，不要编造她没说过的话、没发生过的约定',
    '- 不要提你不知道的她的信息',
    '- 只输出这句话本身，不要引号、不要解释、不要写"我："',
  ].join('\n')
  const 出 = (await 外呼('你是一个普通玩家，正在跟人聊天。只输出你要发的那一句话。', 提示)).trim().replace(/^["'「]|["'」]$/g, '').split('\n')[0]
  return 出.slice(0, 40)
}

async function 主(种子: number) {
  const 随 = 造随机(种子)
  const 强制 = (process.env.FORCE_MBTI || '').toUpperCase()
  const 型 = (MBTI表.includes(强制 as MBTILeiXing) ? 强制 : MBTI表[Math.floor(随() * MBTI表.length)]) as MBTILeiXing
  const 性别: 'nv' | 'nan' = 随() < 0.5 ? 'nv' : 'nan'
  const [低, 高] = 起分表[型]
  let 分 = 低 + Math.floor(随() * (高 - 低 + 1))
  const 起始值 = 分
  const jiaoSe = shengChengJiaoSe({ yong_hu_id: 'quanliucheng-' + 种子, mbti_lei_xing: 型, xing_bie: 性别 } as never)
  const 全部待办 = ShengChengZaiMang(shiXueShengShenFen(jiaoSe.shen_fen))
  const 是E = 型.charAt(0) === 'E'
  const 慢热 = (jiaoSe as unknown as { re_shen_lei_xing?: string }).re_shen_lei_xing === '慢热'
  const 角色名 = (jiaoSe as unknown as { ming_zi?: string }).ming_zi || '林萱'
  const 历史: DuiHuaLiShiXiang[] = []
  const 记录: 轮记[] = []
  let 连续异常 = 0
  let 已恋爱 = false
  let 轮 = 0
  const 上限 = 42

  console.log('=== 随机一局 ===')
  console.log('种子 ' + 种子 + ' | MBTI ' + 型 + ' | 性别 ' + 性别 + ' | 起始好感 ' + 分 + ' | 慢热 ' + 慢热 + ' | 角色 ' + 角色名)

  while (轮 < 上限) {
    轮++
    const 模式 = DingMoShi(分, 已恋爱)
    const 要表白 = !已恋爱 && 分 >= 800
    const 状态 = 玩家状态[Math.floor(随() * 玩家状态.length)]
    let 对方 = await 求玩家消息(历史, 状态, 角色名, 模式, 要表白)
    if (!对方) 对方 = '在吗'

    const 判定 = PanYongHu(对方)
    连续异常 = 判定.类型 === '正常' || 判定.类型 === '推进' ? 0 : 连续异常 + 1
    const 反应 = JueDingFanYing(判定, 连续异常, 是E)
    const 语态 = ChouYuTaiAnLeiXing(判定, 对方, false, '热情')
    const 已说 = 历史.filter((值) => 值.fa_song_zhe_lei_xing === 'jiaose').map((值) => 值.nei_rong)
    const 在忙 = QuZaiMangWeiShuo(全部待办, 已说)
    历史.push({ fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: 对方, shi_jian: '21:' + String(10 + 轮) } as never)

    let 回复 = ''
    let 错: string | null = null
    if (反应.会不会) {
      const shuRu = {
        yong_hu_id: 'quanliucheng', jiao_se_id: 'qf-' + 种子 + '-' + 轮, jiao_se: jiaoSe,
        hao_gan_du: {
          xin_ren_du: Math.round(分 * 0.35), qin_mi_du: Math.round(分 * 0.25),
          qu_wei_du: Math.round(分 * 0.2), guan_huai_du: Math.round(分 * 0.2),
          zong_fen: Math.round(分), guan_xi_jie_duan: 模式,
        },
        dui_hua_li_shi: 历史.slice(0, -1), yong_hu_xin_xiao_xi: 对方,
        shi_fou_di_yi_lun: 历史.length <= 1, tu_pian_shou_quan: false, shi_jian_chang_jing: 'riChang',
      } as never
      const 块 = GouJianDuiHuaKuai(判定, 反应, 模式, {
        好感度: 分, 已恋爱, 是渣型: false, 是E型: 是E, 连续次数: 连续异常,
      })
      const 提示 = gouJianWriterPrompt(shuRu, { shi_fou_hui_fu: true, shi_jian_qing_xu: '正常' })
        + '\n\n' + GouJianYuTaiKuai(语态, 在忙) + '\n\n' + 块
      try {
        const 名 = (shuRu.jiao_se.wei_xin_ming || '').trim()
        const 系统 = 名
          ? '完全代入下面这个角色（' + 名 + '），只输出你要发的消息。像平时微信里真实的两个人在聊天，自然口语化，允许短句、留白和真实停顿。'
          : '完全代入下面这个角色，只输出你要发的消息。像平时微信里真实的两个人在聊天，自然口语化，允许短句、留白和真实停顿。'
        const ceLueKuai = '【你这会儿的感觉】\n这次要回\n情绪：正常'
        const 净 = QingXiShuChu(清洗回复(await 外呼(系统, 提示 + '\n\n' + ceLueKuai)))
        回复 = 净.length > 0 ? 净.join(' / ') : '【不出话】'
      } catch (e) { 错 = String(e).slice(0, 200) }
    }

    历史.push({ fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '微信名', nei_rong: 回复, shi_jian: '21:' + String(11 + 轮) } as never)

    let 增量 = 0
    let 四维: number[] | undefined
    try {
      四维 = await 打分(对方, 回复 || '（未回复）', 角色名, 慢热)
      const 乘 = 慢热 ? 1.15 : 1
      const 原始 = (四维[0] * 0.35 + 四维[1] * 0.25 + 四维[2] * 0.2 + 四维[3] * 0.2) * 乘
      const 前 = 分
      const 实 = 原始 * Math.max(1 - 分 / 1000, 0.1)
      分 = Math.max(0, Math.min(1000, Math.round(分 + 实)))
      增量 = 分 - 前
    } catch (e) { 错 = (错 ? 错 + ' | ' : '') + '打分失败: ' + String(e).slice(0, 120) }

    记录.push({ 轮, 玩家: 对方, 判定: 判定.类型, 语态, 模式, 分前: 分 - 增量, 分后: 分, 增量, 四维, 回复, 不回: !反应.会不会, 错 })
    console.log('[' + 轮 + '] ' + 模式 + ' ' + 判定.类型 + '/' + 语态 + ' ' + (分 - 增量) + '->' + 分 + ' (' + (增量 >= 0 ? '+' : '') + 增量 + ')')
    console.log('    对方: ' + 对方)
    console.log('    对象: ' + (回复 || '【不回】'))

    if (要表白) {
      console.log('=== 表白判定 ===')
      console.log('好感 ' + 分 + ' ' + (分 >= 800 ? '>= 800 -> 恋爱胜利' : '< 800 -> 过早表白，失败'))
      console.log('ke_ji_xu_liao_tian=true -> 结算后仍会补一条角色回复（本次改动）')
      break
    }
    if (分 >= 1000) break
    if (已恋爱) break
  }

  writeFileSync(join(出, '全流程_' + 种子 + '.json'), JSON.stringify({ 种子, 型, 性别, 角色名, 慢热, 起始分: 起始值, 最终分: 分, 轮数: 记录.length, 记录 }, null, 1), 'utf8')
  console.log('=== 结束：' + 记录.length + ' 轮，最终好感 ' + 分 + ' ===')
  process.exit(0)
}

const 种子 = Number(process.argv[2] || Date.now() % 1000000)
void 主(种子).catch((e) => { console.error('流程失败:', e); process.exit(1) })
