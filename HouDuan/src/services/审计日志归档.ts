import { 数据库 } from '../数据库'
import { peiZhi } from '../config'
import { 日志引擎 } from '../utils/日志引擎'

// C6 审计日志容量治理：定期归档删除策略。
// 保留期默认 185 天（≥6 个月，满足任一条目可追溯≥6个月的验收线），
// 到期条目按批次删除，磁盘占用存在可预测上限。
const PI_LIANG_DA_XIAO = 5000

export async function qingLiGuoQiShenJiRiZhi(): Promise<number> {
  const baoLiuTian = peiZhi.shenJiRiZhiBaoLiuTian
  let zongShanChu = 0
  // 分批删除，避免单条大 DELETE 长事务锁表
  for (;;) {
    const jieGuo = await 数据库.query(
      `DELETE FROM "审计日志"
       WHERE "ID" IN (
         SELECT "ID" FROM "审计日志"
         WHERE "创建时间" < NOW() - ($1 || ' days')::interval
         LIMIT $2
       )`,
      [String(baoLiuTian), PI_LIANG_DA_XIAO],
    )
    const benPi = jieGuo.rowCount ?? 0
    zongShanChu += benPi
    if (benPi < PI_LIANG_DA_XIAO) break
  }
  if (zongShanChu > 0) {
    日志引擎.info('shenJiGuiDang', `审计日志归档清理完成`, { shan_chu_tiao_shu: zongShanChu, bao_liu_tian: baoLiuTian })
  }
  return zongShanChu
}

let dingShiQi: ReturnType<typeof setInterval> | null = null
let qiDingYanShi: ReturnType<typeof setTimeout> | null = null

/** 启动每日定时归档（启动后延迟首跑一次；计时器 unref 不阻塞进程退出） */
export function qiDongShenJiRiZhiGuiDangDingShiQi(): void {
  if (dingShiQi) return
  const jianGeHaoMiao = 24 * 60 * 60 * 1000
  qiDingYanShi = setTimeout(() => {
    void qingLiGuoQiShenJiRiZhi().catch((cuoWu) => {
      日志引擎.error('shenJiGuiDang', '审计日志归档失败', { cuo_wu: String(cuoWu) })
    })
    dingShiQi = setInterval(() => {
      void qingLiGuoQiShenJiRiZhi().catch((cuoWu) => {
        日志引擎.error('shenJiGuiDang', '审计日志归档失败', { cuo_wu: String(cuoWu) })
      })
    }, jianGeHaoMiao)
    dingShiQi.unref()
  }, 30 * 1000)
  qiDingYanShi.unref()
}

export function tingZhiShenJiRiZhiGuiDang(): void {
  if (qiDingYanShi) {
    clearTimeout(qiDingYanShi)
    qiDingYanShi = null
  }
  if (dingShiQi) {
    clearInterval(dingShiQi)
    dingShiQi = null
  }
}
