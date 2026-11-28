if (process.env.XU_KE_ZHEN_SHI_WAI_HU !== 'true') throw new Error('仅独立真实调用进程可使用')
process.env.NODE_ENV = 'development'

import { appendFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { redis } from '../src/redis'
import { peiZhi } from '../src/config'
import { AI回复调度器 } from '../src/services/AI回复调度器'
import { shengChengDirectorCeLue } from '../src/services/Director'
import { shengChengWriterHuiFu } from '../src/services/Writer'
import type { AIYinQingShuChu } from '../src/types'

const 日期 = new Date().toISOString().slice(0, 10).replaceAll('-', '')
const 文件 = resolve(process.cwd(), '..', '.agents', 'evidence', 'traces', `FP-C-表情包真实调度-${日期}.jsonl`)
mkdirSync(resolve(process.cwd(), '..', '.agents', 'evidence', 'traces'), { recursive: true })
function 记录(数据: Record<string, unknown>): void { appendFileSync(文件, JSON.stringify({ 时间: new Date().toISOString(), ...数据 }) + '\n', 'utf8') }
const emit记录: Array<{ shiJian: string; fuZai: unknown }> = []
const 角色 = { jiao_se_id: 'sql-test-role', wei_xin_ming: '糖糖', ie_lei_xing: 'E', re_shen_lei_xing: '快热', nian_ling: 24, xing_ge: '开朗爱闹，爱玩梗，偶尔毒舌', yan_yu_feng_ge: '口语活泼，爱玩梗' }

const emit = (shiJian: string, fuZai: unknown): void => {
  emit记录.push({ shiJian, fuZai })
  if (shiJian === '角色回复') {
    const lis = (fuZai as { 消息列表?: Array<Record<string, unknown>> }).消息列表 ?? []
    if (lis.length) console.log(`[emit角色回复] ${lis.map(x => `${x.lei_xing}:${x.duan_ming || x.nei_rong}`).join(' | ')}`)
  }
}
const io = { to: () => ({ emit }) } as unknown as Record<string, unknown>

let thisIndex = 0
const 用户输入 = ['哈哈哈哈你今天这操作也太离谱了，笑死我了', '有人像我一样每次自拍都要找一个挡住双下巴的角度吗哈哈', '我刚发了张秒睡的表情包给你，这简直就是我本人', '我最近真的很难受，整晚睡不着，感觉撑不下去了', '嗯嗯，我也会的，你不是也会犯错吗？'] as const
;(AI回复调度器.prototype as unknown as Record<string, unknown>).运行AI = async function (this: { 角色ID: string; 用户ID: string }): Promise<AIYinQingShuChu> {
  const 话语 = 用户输入[thisIndex++ % 用户输入.length]
  const 输入参数 = {
    yong_hu_id: this.用户ID, jiao_se_id: this.角色ID, jiao_se: 角色,
    hao_gan_du: { xin_ren_du: 300, qin_mi_du: 300, qu_wei_du: 300, guan_huai_du: 300, zong_fen: 1200, guan_xi_jie_duan: 'shuXi' },
    dui_hua_li_shi: [], yong_hu_xin_xiao_xi: 话语, shi_fou_di_yi_lun: false, tu_pian_shou_quan: false,
  } as unknown as Parameters<typeof shengChengDirectorCeLue>[0]
  const 策略 = await shengChengDirectorCeLue(输入参数)
  记录({ 类型: 'director', 话语, ce_lue: 策略.ce_lue })
  const 结果 = await shengChengWriterHuiFu(输入参数, 策略.ce_lue)
  记录({ 类型: 'writer', 话语, 结果 })
  return {
    xiao_xi_lie_biao: 结果.xiao_xi_lie_biao, shi_fou_hui_fu: true, shi_fou_che_hui: false, ce_lue: 策略.ce_lue, jiang_ji_mo_shi: false,
  } satisfies AIYinQingShuChu
}
;(AI回复调度器.prototype as unknown as Record<string, unknown>).获取最新消息文本 = async () => '在吗'
;(AI回复调度器.prototype as unknown as Record<string, unknown>).更新好感度 = async () => null
;(AI回复调度器.prototype as unknown as Record<string, unknown>).读取用户性别 = async () => null
;(AI回复调度器.prototype as unknown as Record<string, unknown>).读取本轮记忆摘要 = async () => ''
;(AI回复调度器.prototype as unknown as Record<string, unknown>).同步用户语言 = async () => undefined
;(AI回复调度器.prototype as unknown as Record<string, unknown>).执行沉默表现 = () => undefined

async function 主程序(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    const 调度器 = new AI回复调度器('sql-test-role', 'sql-test-user', 'E', io, 0)
    const inner = 调度器 as unknown as Record<string, unknown>
    inner.沉默计时器 = null
    inner.追加计时器 = null
    try { await (inner.触发AI处理 as () => Promise<void>)() } catch (e) { console.error('调度异常:', String(e).slice(0, 300)) }
    调度器.重置()
  }
  const 表情包实际 = emit记录.filter(x => x.shiJian === '角色回复').flatMap(x => ((x.fuZai as { 消息列表?: Array<Record<string, unknown>> }).消息列表 ?? []).filter(m => String(m.lei_xing || '').includes('biaoqingshu') || Boolean(m.duan_ming)))
  console.log(`最终消息表情包数: ${表情包实际.length}`)
  console.log(`emit总数: ${emit记录.length}`)
  console.log('模型:', peiZhi.deepSeek.模型, peiZhi.deepSeek.基础地址)
}

void 主程序().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => redis.disconnect())
