if (process.env.XU_KE_ZHEN_SHI_WAI_HU !== 'true') throw new Error('仅独立真实调用进程可使用')
process.env.NODE_ENV = 'development'

import { appendFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { redis } from '../src/redis'
import { 读取真实对话片段, 构造回放历史 } from '../src/services/语料读取'
import { shengChengDirectorCeLue } from '../src/services/Director'
import { shengChengWriterHuiFu } from '../src/services/Writer'
import { 候选包装, 组装表情候选块 } from '../src/services/系统表情'
import { panDuanBiaoQingZaiTi } from '../src/services/表情载体'
import type { AIYinQingShuRu, DuiHuaLiShiXiang } from '../src/types'

const 日期 = new Date().toISOString().slice(0, 10).replaceAll('-', '')
const 文件 = resolve(process.cwd(), '..', '.agents', 'evidence', 'traces', `FP-C-表情包真实链路-${日期}.jsonl`)
mkdirSync(resolve(process.cwd(), '..', '.agents', 'evidence', 'traces'), { recursive: true })
function 记录(数据: Record<string, unknown>): void { appendFileSync(文件, JSON.stringify({ 时间: new Date().toISOString(), ...数据 }) + '\n', 'utf8') }
const 输入目录 = resolve(process.cwd(), '..', '项目语料实验室', '公开语料', 'NaturalConv', '原始')

const 八模块空 = { ji_ben_xin_xi: '', wai_mao: '', xing_ge: '', bei_jing: '', yan_yu: '', xing_wei: '', guan_xi: '', xi_tong_ti_shi: '' }
const 糖糖 = { ming_zi: '糖糖', wei_xin_ming: '糖糖', ie_lei_xing: 'E', re_shen_lei_xing: '快热', nian_ling: 24, xing_ge: '开朗爱闹，爱玩梗，偶尔毒舌', yan_yu_feng_ge: '口语活泼，爱玩梗', xing_bie: 'nv', shen_fen: '朋友', bei_jing_gu_shi: '', xi_hao: [], wai_mao: '', xing_wei_te_dian: '', tou_xiang: '', ba_da_mo_kuai: 八模块空, shi_jie_xin_xi: {} }
const 温柔姐姐 = { ming_zi: '温柔姐姐', wei_xin_ming: '温柔姐姐', ie_lei_xing: 'I', re_shen_lei_xing: '慢热', nian_ling: 27, xing_ge: '温柔安静，善于倾听', yan_yu_feng_ge: '轻缓简洁', xing_bie: 'nv', shen_fen: '朋友', bei_jing_gu_shi: '', xi_hao: [], wai_mao: '', xing_wei_te_dian: '', tou_xiang: '', ba_da_mo_kuai: 八模块空, shi_jie_xin_xi: {} }
const 对话参与者 = { ming_zi: '对话参与者', wei_xin_ming: '对话参与者', ie_lei_xing: 'I', re_shen_lei_xing: '慢热', nian_ling: 0, xing_ge: '', yan_yu_feng_ge: '自然承接当前话语', xing_bie: 'nan', shen_fen: '', bei_jing_gu_shi: '', xi_hao: [], wai_mao: '', xing_wei_te_dian: '', tou_xiang: '', shi_fou_zha_xing: false, shi_jie_xin_xi: {}, ba_da_mo_kuai: 八模块空 }

const 案例 = [
  { id: '玩笑', 话语: '哈哈哈哈你今天这操作也太离谱了，笑死我了', 人设: 糖糖 },
  { id: '危机', 话语: '我最近真的很难受，整晚睡不着，感觉撑不下去了', 人设: 温柔姐姐 },
  { id: '自拍自嘲', 话语: '有人像我一样每次自拍都要找一个挡住双下巴的角度吗哈哈', 人设: 糖糖 },
  { id: '回敬表情', 话语: '我刚发了张秒睡的表情包给你，这简直就是我本人', 人设: 糖糖 },
]

function 造输入(话语: string, 人设: Record<string, unknown>, 历史: DuiHuaLiShiXiang[]): AIYinQingShuRu {
  return {
    yong_hu_id: `表情包回放-${process.pid}`,
    jiao_se_id: `表情包角色-${process.pid}`,
    jiao_se: 人设,
    hao_gan_du: { xin_ren_du: 300, qin_mi_du: 300, qu_wei_du: 300, guan_huai_du: 300, zong_fen: 1200, guan_xi_jie_duan: 'shuXi' },
    dui_hua_li_shi: 历史,
    yong_hu_xin_xiao_xi: 话语,
    shi_fou_di_yi_lun: 历史.length === 0,
    tu_pian_shou_quan: false,
  } as unknown as AIYinQingShuRu
}

async function 导演与写手(话语: string, 人设: Record<string, unknown>, 历史: DuiHuaLiShiXiang[], 场景: string): Promise<void> {
  const 输入 = 造输入(话语, 人设, 历史)
  console.log(`\n[${场景}] A: ${话语}`)
  try {
    const 策略 = await shengChengDirectorCeLue(输入)
    console.log('  Director：', JSON.stringify({ cheng_gong: 策略.cheng_gong, biao_qing_yi_tu: 策略.ce_lue.biao_qing_yi_tu, qing_gan_nong_du: 策略.ce_lue.qing_gan_nong_du }))
    const 决策 = panDuanBiaoQingZaiTi(输入, 策略.ce_lue)
    console.log('  载体门控：', JSON.stringify(决策))
    const 候选 = 决策.geiHouXuan ? await 候选包装(策略.ce_lue.biao_qing_yi_tu, 4, 决策) : []
    console.log('  候选：', JSON.stringify(候选.map(x => ({ 短名: x.duanMing, 情绪: x.qingXuBiaoQian, 场景: x.shiYongChangJing }))))
    const 候选块 = 组装表情候选块(候选)
    console.log('  候选块注入：', 候选块.slice(0, 220))
    const 结果 = await shengChengWriterHuiFu(输入, 策略.ce_lue)
    console.log('  Writer原回应：', JSON.stringify(结果.xiao_xi_lie_biao))
    记录({ 类型: '场景回放', 场景, 输入话语: 话语, 策略: 策略.ce_lue, 决策, 候选: 候选.map(x => x.duanMing), 候选块, Writer原文: 结果.yuan_wen, Writer列表: 结果.xiao_xi_lie_biao })
  } catch (e) {
    console.error(`  错误：${String(e).slice(0, 500)}`)
    记录({ 类型: '场景错误', 场景, 错误: String(e) })
  }
}

async function 主程序(): Promise<void> {
  const 分组 = 读取真实对话片段(输入目录, 2)
  const 可选表情 = await (await import('../src/services/表情包库')).取全部启用()
  console.log(`[表情包库] 共 ${可选表情.length} 条启用，样例：${可选表情.slice(0, 3).map(x => x.duanMing).join(',')}`)
  记录({ 类型: '库统计', 数量: 可选表情.length, 样例: 可选表情.slice(0, 5).map(x => ({ 短名: x.duanMing, 情绪: x.qingXuBiaoQian, 场景: x.shiYongChangJing })), 片段数: 分组.length })
  for (const 案例项 of 案例) await 导演与写手(案例项.话语, 案例项.人设, [], 案例项.id)

  for (const 片段 of 分组) {
    const 既往: Array<{ A原话: string; AI回应: string[] }> = []
    for (const [idx, 轮次] of 片段.轮次.entries()) {
      const 历史 = 构造回放历史(既往).map((m, i) => ({ id: `h-${i}`, shi_jian: '12:00', nei_rong: m.content, fa_song_zhe_lei_xing: m.role === 'user' ? 'yonghu' : 'jiaose', fa_song_zhe_ming: m.role === 'user' ? '对方' : '对话参与者', yi_che_hui: false } as unknown as DuiHuaLiShiXiang))
      const 输入 = 造输入(轮次.A原话, 对话参与者, 历史)
      console.log(`\n[${片段.片段ID}-${idx + 1}] A: ${轮次.A原话}`)
      const 策略 = await shengChengDirectorCeLue(输入)
      console.log('  Director：', JSON.stringify({ biao_qing_yi_tu: 策略.ce_lue.biao_qing_yi_tu, qing_gan_nong_du: 策略.ce_lue.qing_gan_nong_du }))
      const 决策 = panDuanBiaoQingZaiTi(输入, 策略.ce_lue)
      const 候选 = 决策.geiHouXuan ? await 候选包装(策略.ce_lue.biao_qing_yi_tu, 4, 决策) : []
      console.log('  决策:', JSON.stringify({ yuanYin: 决策.yuanYin, geiHouXuan: 决策.geiHouXuan }))
      console.log('  候选:', JSON.stringify(候选.map(x => x.duanMing)))
      const 结果 = await shengChengWriterHuiFu(输入, 策略.ce_lue)
      console.log('  Writer原回应：', JSON.stringify(结果.xiao_xi_lie_biao))
      记录({ 类型: '语料回放', 片段ID: 片段.片段ID, 轮次: idx + 1, A原话: 轮次.A原话, 真人B原话: 轮次.真人B原话, 策略: 策略.ce_lue, 决策, 候选: 候选.map(x => x.duanMing), Writer列表: 结果.xiao_xi_lie_biao })
      既往.push({ A原话: 轮次.A原话, AI回应: 结果.xiao_xi_lie_biao })
    }
  }
  console.log('\n=== 完成，证据文件 ===')
  console.log(文件)
}
void 主程序().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => redis.disconnect())
