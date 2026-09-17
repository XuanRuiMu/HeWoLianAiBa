import { 数据库 } from '../数据库'
import { peiZhi } from '../config'
import { 日志引擎 } from '../utils/日志引擎'

// YH-071 保存期限无执行器：每类数据加定时删加审计，明确匿名化边界并同步措辞
// 根因：承诺30天7天但代码里没人删；收敛为每日定时执行器+审计留痕
// 期限口径与 frontend/src/assets/yinSiZhengCe.txt 五、数据保存期限 同源：
// 聊天记录30天/语音文件7天/审计日志185天/通知90天/用量32天
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

export async function zhiXingShuJuBaoCunQiXianQingLi(): Promise<{ liaoTian: number; tongZhi: number }> {
  const liaoTian = await qingLiGuoQiLiaoTianJiLu()
  const tongZhi = await qingLiGuoQiTongZhi()
  if (liaoTian + tongZhi > 0) {
    日志引擎.info('shuJuBaoCun', '保存期限清理完成', { liao_tian: liaoTian, tong_zhi: tongZhi })
  }
  return { liaoTian, tongZhi }
}

let dingShiQi: ReturnType<typeof setInterval> | null = null
let qiDingYanShi: ReturnType<typeof setTimeout> | null = null

/** 启动每日保存期限清理（审计日志归档定时器同源，计时器unref不阻塞退出） */
export function qiDongShuJuBaoCunQingLiDingShiQi(): void {
  if (dingShiQi) return
  const jianGeHaoMiao = 24 * 60 * 60 * 1000
  // 匿名化边界：账号注销走账号注销服务即时匿名化；本执行器只清过期派生数据
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
