import { 数据库 } from '../数据库'
import { yanZhengUUID } from '../utils/验证'

export const JiaoSeBianHaoZhengZe = /^JS[0-9A-F]{16}$/
export const YongHuBianHaoZhengZe = /^YH[0-9A-F]{16}$/

const HuanCunShangXian = 2000
const HuanCunHaoMiao = 5 * 60 * 1000

interface HuanCunXiang {
  zhi: string | null
  shiJian: number
}

const jiaoSeHuanCun = new Map<string, HuanCunXiang>()
const yongHuHuanCun = new Map<string, HuanCunXiang>()
const jiaoSeFanXiangHuanCun = new Map<string, HuanCunXiang>()
const yongHuFanXiangHuanCun = new Map<string, HuanCunXiang>()

function xieHuanCun(cun: Map<string, HuanCunXiang>, jian: string, zhi: string | null): void {
  if (cun.size >= HuanCunShangXian) cun.clear()
  cun.set(jian, { zhi, shiJian: Date.now() })
}

function duHuanCun(cun: Map<string, HuanCunXiang>, jian: string): string | null | undefined {
  const xiang = cun.get(jian)
  if (!xiang) return undefined
  if (Date.now() - xiang.shiJian > HuanCunHaoMiao) {
    cun.delete(jian)
    return undefined
  }
  return xiang.zhi
}

export function qingKongGongKaiBianHaoHuanCun(): void {
  jiaoSeHuanCun.clear()
  yongHuHuanCun.clear()
  jiaoSeFanXiangHuanCun.clear()
  yongHuFanXiangHuanCun.clear()
}

export function shiHeFaJiaoSeBianHao(zhi: unknown): zhi is string {
  return typeof zhi === 'string' && JiaoSeBianHaoZhengZe.test(zhi)
}

export function shiHeFaYongHuBianHao(zhi: unknown): zhi is string {
  return typeof zhi === 'string' && YongHuBianHaoZhengZe.test(zhi)
}

export function shiHeFaGongKaiBianHao(zhi: unknown): zhi is string {
  return shiHeFaJiaoSeBianHao(zhi) || shiHeFaYongHuBianHao(zhi)
}

export async function huoQuJiaoSeBianHao(jiaoSeId: string): Promise<string> {
  if (!jiaoSeId) return jiaoSeId
  const yiHuanCun = duHuanCun(jiaoSeHuanCun, jiaoSeId)
  if (yiHuanCun !== undefined) return yiHuanCun || jiaoSeId
  const jieGuo = await 数据库.query(
    'SELECT "公开编号" FROM "角色" WHERE "ID" = $1 LIMIT 1',
    [jiaoSeId],
  )
  const zhi = jieGuo.rows.length > 0 ? String(jieGuo.rows[0]['公开编号'] || '').trim() : ''
  if (!zhi) return jiaoSeId
  xieHuanCun(jiaoSeHuanCun, jiaoSeId, zhi)
  xieHuanCun(jiaoSeFanXiangHuanCun, zhi, jiaoSeId)
  return zhi
}

export async function huoQuYongHuBianHao(用户ID: string): Promise<string> {
  if (!用户ID) return 用户ID
  const yiHuanCun = duHuanCun(yongHuHuanCun, 用户ID)
  if (yiHuanCun !== undefined) return yiHuanCun || 用户ID
  const jieGuo = await 数据库.query(
    'SELECT "公开编号" FROM "用户" WHERE "ID" = $1 LIMIT 1',
    [用户ID],
  )
  const zhi = jieGuo.rows.length > 0 ? String(jieGuo.rows[0]['公开编号'] || '').trim() : ''
  if (!zhi) return 用户ID
  xieHuanCun(yongHuHuanCun, 用户ID, zhi)
  xieHuanCun(yongHuFanXiangHuanCun, zhi, 用户ID)
  return zhi
}

export async function guiYiHuaJiaoSeBiaoShi(zhi: unknown): Promise<string | null> {
  const wenBen = typeof zhi === 'string' ? zhi.trim() : ''
  if (!wenBen) return null
  if (yanZhengUUID(wenBen)) return wenBen
  return await jieXiJiaoSeBianHao(wenBen)
}

export async function guiYiHuaYongHuBiaoShi(zhi: unknown): Promise<string | null> {
  const wenBen = typeof zhi === 'string' ? zhi.trim() : ''
  if (!wenBen) return null
  if (yanZhengUUID(wenBen)) return wenBen
  return await jieXiYongHuBianHao(wenBen)
}

export async function jieXiJiaoSeBianHao(bianHao: unknown): Promise<string | null> {
  if (!shiHeFaJiaoSeBianHao(bianHao)) return null
  const yiHuanCun = duHuanCun(jiaoSeFanXiangHuanCun, bianHao)
  if (yiHuanCun !== undefined) return yiHuanCun
  const jieGuo = await 数据库.query(
    'SELECT "ID" FROM "角色" WHERE "公开编号" = $1 LIMIT 1',
    [bianHao],
  )
  const zhi = jieGuo.rows.length > 0 ? String(jieGuo.rows[0].ID) : null
  xieHuanCun(jiaoSeFanXiangHuanCun, bianHao, zhi)
  if (zhi) xieHuanCun(jiaoSeHuanCun, zhi, bianHao)
  return zhi
}

export async function jieXiYongHuBianHao(bianHao: unknown): Promise<string | null> {
  if (!shiHeFaYongHuBianHao(bianHao)) return null
  const yiHuanCun = duHuanCun(yongHuFanXiangHuanCun, bianHao)
  if (yiHuanCun !== undefined) return yiHuanCun
  const jieGuo = await 数据库.query(
    'SELECT "ID" FROM "用户" WHERE "公开编号" = $1 LIMIT 1',
    [bianHao],
  )
  const zhi = jieGuo.rows.length > 0 ? String(jieGuo.rows[0].ID) : null
