import { 数据库 } from '../数据库'
import { peiZhi } from '../config'
import { 日志引擎 } from '../utils/日志引擎'
import { shanChuMeiTiWenJian } from './媒体存储'

const PI_LIANG_DA_XIAO = 5000

export const SHU_JU_BAO_CUN_QI_XIAN = {
  liaoTianJiLuTian: 30,
  yuYinWenJianTian: 7,
  tongZhiTian: 90,
} as const

export async function qingLiGuoQiLiaoTianJiLu(): Promise<number> {
  let zongShanChu = 0
  for (;;) {
    const jieGuo = await 数据库.query(
      `DELETE FROM "消息"
       WHERE "ID" IN (
         SELECT "ID" FROM "消息"
         WHERE "创建时间" < NOW() - ($1 || ' days')::interval
         LIMIT $2
       )`,
      [String(SHU_JU_BAO_CUN_QI_XIAN.liaoTianJiLuTian), PI_LIANG_DA_XIAO],
    )
    const benPi = jieGuo.rowCount ?? 0
    zongShanChu += benPi
    if (benPi < PI_LIANG_DA_XIAO) break
  }
  return zongShanChu
}

export async function qingLiGuoQiTongZhi(): Promise<number> {
  let zongShanChu = 0
  for (;;) {
    const jieGuo = await 数据库.query(
      `DELETE FROM "通知"
       WHERE "ID" IN (
         SELECT "ID" FROM "通知"
         WHERE "创建时间" < NOW() - ($1 || ' days')::interval
         LIMIT $2
       )`,
      [String(SHU_JU_BAO_CUN_QI_XIAN.tongZhiTian), PI_LIANG_DA_XIAO],
    )
    const benPi = jieGuo.rowCount ?? 0
    zongShanChu += benPi
    if (benPi < PI_LIANG_DA_XIAO) break
  }
  return zongShanChu
}

export async function qingLiGuoQiYuYinWenJian(): Promise<number> {
  let zongShanChu = 0
  for (;;) {
    const jieGuo = await 数据库.query<{ SHA256: string }>(
      `DELETE FROM "媒体文件"
       WHERE "ID" IN (
         SELECT "ID" FROM "媒体文件"
         WHERE "类别" = 'yuyin'
           AND "创建时间" < NOW() - ($1 || ' days')::interval
         LIMIT $2
       )
       RETURNING "SHA256"`,
      [String(SHU_JU_BAO_CUN_QI_XIAN.yuYinWenJianTian), PI_LIANG_DA_XIAO],
    )
    const benPi = jieGuo.rowCount ?? 0
    zongShanChu += benPi
    const shaJiHe = new Set(jieGuo.rows.map((hang) => hang.SHA256))
    for (const sha of shaJiHe) {
      const yinYong = await 数据库.query('SELECT 1 FROM "媒体文件" WHERE "SHA256" = $1 LIMIT 1', [sha])
      if ((yinYong.rowCount ?? 0) === 0) await shanChuMeiTiWenJian(sha)
    }
    if (benPi < PI_LIANG_DA_XIAO) break
  }
  return zongShanChu
}

export async function zhiXingShuJuBaoCunQiXianQingLi(): Promise<{ liaoTian: number; tongZhi: number; yuYin: number }> {
  const liaoTian = await qingLiGuoQiLiaoTianJiLu()
  const tongZhi = await qingLiGuoQiTongZhi()
  const yuYin = await qingLiGuoQiYuYinWenJian()
  if (liaoTian + tongZhi + yuYin > 0) {
    日志引擎.info('shuJuBaoCun', '保存期限清理完成', {
      liao_tian: liaoTian,
      tong_zhi: tongZhi,
      yu_yin: yuYin,
    })
  }
  return { liaoTian, tongZhi, yuYin }
}

let dingShiQi: ReturnType<typeof setInterval> | null = null
let qiDingYanShi: ReturnType<typeof setTimeout> | null = null

export function qiDongShuJuBaoCunQingLiDingShiQi(): void {
  if (dingShiQi) return
  const jianGeHaoMiao = 24 * 60 * 60 * 1000
  void peiZhi.shenJiRiZhiBaoLiuTian
  qiDingYanShi = setTimeout(() => {
    void zhiXingShuJuBaoCunQiXianQingLi().catch((cuoWu) => {
      日志引擎.error('shuJuBaoCun', '保存期限清理失败', { cuo_wu: String(cuoWu) })
    })
    dingShiQi = setInterval(() => {
      void zhiXingShuJuBaoCunQiXianQingLi().catch((cuoWu) => {
        日志引擎.error('shuJuBaoCun', '保存期限清理失败', { cuo_wu: String(cuoWu) })
      })
    }, jianGeHaoMiao)
    dingShiQi.unref()
  }, 60 * 1000)
  qiDingYanShi.unref()
}

export function tingZhiShuJuBaoCunQingLi(): void {
  if (qiDingYanShi) {
    clearTimeout(qiDingYanShi)
    qiDingYanShi = null
  }
  if (dingShiQi) {
    clearInterval(dingShiQi)
    dingShiQi = null
  }
}
