import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { debug日志 } from '../utils/debug日志'

export interface ShiYongLiangJiLu {
  moXingLeiXing: string
  moXing: string
  shuRuToken: number
  shuChuToken: number
  zongToken: number
  /** 官方上下文硬盘缓存命中的输入 token 数 */
  mingZhongToken?: number
  yongHuId?: string
}

export interface YongLiangHuiZong {
  moXingLeiXing: string
  ciShu: number
  shuRuToken: number
  shuChuToken: number
  zongToken: number
  mingZhongToken: number
}

function jinRiBiaoJi(): string {
  return new Date().toISOString().slice(0, 10)
}

function huoQuJiShuJian(riQi: string): string {
  return `llm_shi_yong_liang:${riQi}`
}

function huoQuChengYuan(moXingLeiXing: string, moXing: string): string {
  return `${moXingLeiXing}|${moXing}`
}

function jieXiChengYuan(chengYuan: string): { moXingLeiXing: string; moXing: string } {
  const fenGe = chengYuan.indexOf('|')
  if (fenGe < 0) return { moXingLeiXing: chengYuan, moXing: '' }
  return { moXingLeiXing: chengYuan.slice(0, fenGe), moXing: chengYuan.slice(fenGe + 1) }
}

export async function jiLuShiYongLiang(jiLu: ShiYongLiangJiLu): Promise<void> {
  const shuRu = Number.isFinite(jiLu.shuRuToken) ? Math.max(0, Math.floor(jiLu.shuRuToken)) : 0
  const shuChu = Number.isFinite(jiLu.shuChuToken) ? Math.max(0, Math.floor(jiLu.shuChuToken)) : 0
  const zong = Number.isFinite(jiLu.zongToken) ? Math.max(0, Math.floor(jiLu.zongToken)) : shuRu + shuChu
  const 命中量 = typeof jiLu.mingZhongToken === 'number' && Number.isFinite(jiLu.mingZhongToken) ? jiLu.mingZhongToken : 0
  const mingZhong = Math.min(shuRu, Math.max(0, Math.floor(命中量)))
  if (shuRu <= 0 && shuChu <= 0 && zong <= 0) return
  const riQi = jinRiBiaoJi()
  const jian = huoQuJiShuJian(riQi)
  const chengYuan = huoQuChengYuan(jiLu.moXingLeiXing, jiLu.moXing)
  try {
    await redis.hincrby(jian, `${chengYuan}:ci_shu`, 1)
    await redis.hincrby(jian, `${chengYuan}:shu_ru`, shuRu)
    await redis.hincrby(jian, `${chengYuan}:shu_chu`, shuChu)
    await redis.hincrby(jian, `${chengYuan}:zong`, zong)
    await redis.hincrby(jian, `${chengYuan}:ming_zhong`, mingZhong)
    await redis.expire(jian, 32 * 24 * 60 * 60)
  } catch (cuoWu) {
    debug日志.error('用量统计', 'Redis用量聚合写入失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
  }
  try {
    await 数据库.query(
      `INSERT INTO "LLM用量" ("日期", "模型类型", "模型", "次数", "输入Token", "输出Token", "总Token", "缓存命中Token")
       VALUES ($1, $2, $3, 1, $4, $5, $6, $7)
       ON CONFLICT ("日期", "模型类型", "模型") DO UPDATE SET
         "次数" = "LLM用量"."次数" + 1,
         "输入Token" = "LLM用量"."输入Token" + EXCLUDED."输入Token",
         "输出Token" = "LLM用量"."输出Token" + EXCLUDED."输出Token",
         "总Token" = "LLM用量"."总Token" + EXCLUDED."总Token",
         "缓存命中Token" = "LLM用量"."缓存命中Token" + EXCLUDED."缓存命中Token",
         "更新时间" = NOW()`,
      [riQi, jiLu.moXingLeiXing, jiLu.moXing, shuRu, shuChu, zong, mingZhong],
    )
  } catch (cuoWu) {
    debug日志.error('用量统计', 'PG用量持久化失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
  }
}

export async function huoQuJinRiHuiZong(riQi: string = jinRiBiaoJi()): Promise<YongLiangHuiZong[]> {
  const jian = huoQuJiShuJian(riQi)
  let yuanShi: Record<string, string> = {}
  try {
    yuanShi = await redis.hgetall(jian)
  } catch (cuoWu) {
    debug日志.error('用量统计', 'Redis用量聚合读取失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
  }
  const huiZong = new Map<string, YongLiangHuiZong>()
  for (const [jianMing, zhi] of Object.entries(yuanShi)) {
    const fenGe = jianMing.lastIndexOf(':')
    if (fenGe < 0) continue
    const chengYuan = jianMing.slice(0, fenGe)
    const ziDuan = jianMing.slice(fenGe + 1)
    const { moXingLeiXing, moXing } = jieXiChengYuan(chengYuan)
    if (!moXingLeiXing) continue
    const xianYou = huiZong.get(chengYuan) ?? { moXingLeiXing, ciShu: 0, shuRuToken: 0, shuChuToken: 0, zongToken: 0, mingZhongToken: 0 }
    const shuZhi = Number(zhi) || 0
    if (ziDuan === 'ci_shu') xianYou.ciShu = shuZhi
    else if (ziDuan === 'shu_ru') xianYou.shuRuToken = shuZhi
    else if (ziDuan === 'shu_chu') xianYou.shuChuToken = shuZhi
    else if (ziDuan === 'zong') xianYou.zongToken = shuZhi
    else if (ziDuan === 'ming_zhong') xianYou.mingZhongToken = shuZhi
    else continue
    huiZong.set(chengYuan, xianYou)
  }
  if (huiZong.size > 0) {
    return [...huiZong.values()].sort((a, b) => b.zongToken - a.zongToken)
  }
  try {
    const jieGuo = await 数据库.query(
      `SELECT "模型类型", "模型", "次数", "输入Token", "输出Token", "总Token", "缓存命中Token" FROM "LLM用量" WHERE "日期" = $1 ORDER BY "总Token" DESC`,
      [riQi],
    )
    return jieGuo.rows.map((hang): YongLiangHuiZong => ({
      moXingLeiXing: String(hang.模型类型 || ''),
      ciShu: Number(hang.次数 || 0),
      shuRuToken: Number(hang.输入Token || 0),
      shuChuToken: Number(hang.输出Token || 0),
      zongToken: Number(hang.总Token || 0),
      mingZhongToken: Number(hang.缓存命中Token || 0),
    }))
  } catch (cuoWu) {
    debug日志.error('用量统计', 'PG用量聚合读取失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return []
  }
}
