import { 数据库 } from '../数据库'
import { yanZhengUUID } from '../utils/验证'

export const JIAO_SE_BIAN_HAO_ZHENG_ZE = /^JS[0-9A-F]{16}$/
export const YONG_HU_BIAN_HAO_ZHENG_ZE = /^YH[0-9A-F]{16}$/

const HUAN_CUN_SHANG_XIAN = 2000
const HUAN_CUN_HAO_MIAO = 5 * 60 * 1000

interface HuanCunXiang {
  zhi: string | null
  shiJian: number
}

const jiaoSeHuanCun = new Map<string, HuanCunXiang>()
const yongHuHuanCun = new Map<string, HuanCunXiang>()
const jiaoSeFanXiangHuanCun = new Map<string, HuanCunXiang>()
const yongHuFanXiangHuanCun = new Map<string, HuanCunXiang>()

function xieHuanCun(cun: Map<string, HuanCunXiang>, jian: string, zhi: string | null): void {
  if (cun.size >= HUAN_CUN_SHANG_XIAN) cun.clear()
  cun.set(jian, { zhi, shiJian: Date.now() })
}

function duHuanCun(cun: Map<string, HuanCunXiang>, jian: string): string | null | undefined {
  const xiang = cun.get(jian)
  if (!xiang) return undefined
  if (Date.now() - xiang.shiJian > HUAN_CUN_HAO_MIAO) {
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
  return typeof zhi === 'string' && JIAO_SE_BIAN_HAO_ZHENG_ZE.test(zhi)
}

export function shiHeFaYongHuBianHao(zhi: unknown): zhi is string {
  return typeof zhi === 'string' && YONG_HU_BIAN_HAO_ZHENG_ZE.test(zhi)
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

export async function huoQuYongHuBianHao(yongHuId: string): Promise<string> {
  if (!yongHuId) return yongHuId
  const yiHuanCun = duHuanCun(yongHuHuanCun, yongHuId)
  if (yiHuanCun !== undefined) return yiHuanCun || yongHuId
  const jieGuo = await 数据库.query(
    'SELECT "公开编号" FROM "用户" WHERE "ID" = $1 LIMIT 1',
    [yongHuId],
  )
  const zhi = jieGuo.rows.length > 0 ? String(jieGuo.rows[0]['公开编号'] || '').trim() : ''
  if (!zhi) return yongHuId
  xieHuanCun(yongHuHuanCun, yongHuId, zhi)
  xieHuanCun(yongHuFanXiangHuanCun, zhi, yongHuId)
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
  xieHuanCun(yongHuFanXiangHuanCun, bianHao, zhi)
  if (zhi) xieHuanCun(yongHuHuanCun, zhi, bianHao)
  return zhi
}

export async function jieXiJiaoSeBianHaoPiLiang(bianHaoLieBiao: unknown[]): Promise<Map<string, string>> {
  const duiZhao = new Map<string, string>()
  const xuCha = bianHaoLieBiao.filter((zhi): zhi is string => shiHeFaJiaoSeBianHao(zhi))
  for (const bianHao of xuCha) {
    const yiHuanCun = duHuanCun(jiaoSeFanXiangHuanCun, bianHao)
    if (yiHuanCun) duiZhao.set(bianHao, yiHuanCun)
  }
  const weiZhi = xuCha.filter((bianHao) => !duiZhao.has(bianHao))
  if (weiZhi.length === 0) return duiZhao
  const jieGuo = await 数据库.query(
    'SELECT "ID", "公开编号" FROM "角色" WHERE "公开编号" = ANY($1::text[])',
    [weiZhi],
  )
  for (const hang of jieGuo.rows as Record<string, unknown>[]) {
    const bianHao = String(hang['公开编号'])
    const jiaoSeId = String(hang.ID)
    duiZhao.set(bianHao, jiaoSeId)
    xieHuanCun(jiaoSeFanXiangHuanCun, bianHao, jiaoSeId)
    xieHuanCun(jiaoSeHuanCun, jiaoSeId, bianHao)
  }
  return duiZhao
}

export async function jieXiYongHuBianHaoPiLiang(bianHaoLieBiao: unknown[]): Promise<Map<string, string>> {
  const duiZhao = new Map<string, string>()
  const xuCha = bianHaoLieBiao.filter((zhi): zhi is string => shiHeFaYongHuBianHao(zhi))
  for (const bianHao of xuCha) {
    const yiHuanCun = duHuanCun(yongHuFanXiangHuanCun, bianHao)
    if (yiHuanCun) duiZhao.set(bianHao, yiHuanCun)
  }
  const weiZhi = xuCha.filter((bianHao) => !duiZhao.has(bianHao))
  if (weiZhi.length === 0) return duiZhao
  const jieGuo = await 数据库.query(
    'SELECT "ID", "公开编号" FROM "用户" WHERE "公开编号" = ANY($1::text[])',
    [weiZhi],
  )
  for (const hang of jieGuo.rows as Record<string, unknown>[]) {
    const bianHao = String(hang['公开编号'])
    const yongHuId = String(hang.ID)
    duiZhao.set(bianHao, yongHuId)
    xieHuanCun(yongHuFanXiangHuanCun, bianHao, yongHuId)
    xieHuanCun(yongHuHuanCun, yongHuId, bianHao)
  }
  return duiZhao
}

export async function jiaoSeBianHaoBiao(yongHuId: string): Promise<Map<string, string>> {
  const duiZhao = new Map<string, string>()
  const jieGuo = await 数据库.query(
    'SELECT "ID", "公开编号" FROM "角色" WHERE "用户ID" = $1',
    [yongHuId],
  )
  for (const hang of jieGuo.rows as Record<string, unknown>[]) {
    const jiaoSeId = String(hang.ID)
    const bianHao = String(hang['公开编号'])
    duiZhao.set(jiaoSeId, bianHao)
    xieHuanCun(jiaoSeHuanCun, jiaoSeId, bianHao)
    xieHuanCun(jiaoSeFanXiangHuanCun, bianHao, jiaoSeId)
  }
  return duiZhao
}
