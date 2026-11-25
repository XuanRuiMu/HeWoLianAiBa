import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'

const RiZhiLeiXing = '角色日程'

const ZuiDaDuanShu = 16

export interface RiChengDuan {
  shiJian: string
  huoDong: string
}

export interface RiChengZhuangTai {
  riQi: string
  xingQi: number
  duanLu: RiChengDuan[]
}

export function zhengZeRiQi(riQi: Date, shiQu: string): { riQi: string; xingQi: number } {
  try {
    const 格式 = new Intl.DateTimeFormat('en-CA', {
      timeZone: shiQu,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    })
    const 部分 = 格式.formatToParts(riQi)
    const 取 = (类: string): string => 部分.find((项) => 项.type === 类)?.value ?? ''
    const yingZhou: Record<string, number> = { Sun: 7, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    const nian = 取('year')
    const yue = 取('month')
    const ri = 取('day')
    const zhou = 取('weekday')
    if (nian === '' || yue === '' || ri === '') return { riQi: '', xingQi: 1 }
    return { riQi: `${nian}-${yue}-${ri}`, xingQi: yingZhou[zhou] ?? 1 }
  } catch {
    const beiFen = new Date(riQi.getTime() + 8 * 60 * 60 * 1000)
    return {
      riQi: beiFen.toISOString().slice(0, 10),
      xingQi: beiFen.getUTCDay() === 0 ? 7 : beiFen.getUTCDay(),
    }
  }
}

function zhengSeDuan(laiYuan: unknown): RiChengDuan[] {
  if (!Array.isArray(laiYuan)) return []
  const jieGuo: RiChengDuan[] = []
  for (const xiang of laiYuan) {
    if (typeof xiang !== 'object' || xiang === null) continue
    const yuan = xiang as Record<string, unknown>
    const shiJian = String(yuan.shiJian ?? yuan.shi_jian ?? '').trim()
    const huoDong = String(yuan.huoDong ?? yuan.huo_dong ?? '').trim()
    if (!/^\d{1,2}:\d{2}$/.test(shiJian)) continue
    if (huoDong === '') continue
    jieGuo.push({ shiJian, huoDong })
  }
  return jieGuo.sort((甲, 乙) => shiJianDaoMiao(甲.shiJian) - shiJianDaoMiao(乙.shiJian)).slice(0, ZuiDaDuanShu)
}

function shiJianDaoMiao(shiJian: string): number {
  const [shi, fen] = shiJian.split(':')
  return Number(shi) * 60 + Number(fen || 0)
}

export async function duQuRiCheng(jiaoSeId: string, riQi: string, xingQi: number): Promise<RiChengZhuangTai | null> {
  try {
    const jieGuo = await 数据库.query(
      `SELECT "星期", "内容" FROM "角色日程" WHERE "角色ID" = $1 AND "日期" = $2 LIMIT 1`,
      [jiaoSeId, riQi],
    )
    const hang = jieGuo.rows[0]
    if (!hang) return null
    const duanLu = zhengSeDuan(hang.内容)
    if (duanLu.length === 0) return null
    return { riQi, xingQi: Number(hang.星期) || xingQi, duanLu }
  } catch (错误) {
    debug日志.warn(RiZhiLeiXing, '读取日程失败', {
      xiang_qing: { jiao_se_id: jiaoSeId, ri_qi: riQi, cuo_wu: String(错误) },
    })
    return null
  }
}

export async function xieRuRiCheng(
  jiaoSeId: string,
  riQi: string,
  xingQi: number,
  duanLu: RiChengDuan[],
): Promise<boolean> {
  const zhengSe = zhengSeDuan(duanLu)
  if (zhengSe.length === 0) return false
  try {
    await 数据库.query(
      `INSERT INTO "角色日程" ("角色ID", "日期", "星期", "内容")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("角色ID", "日期") DO UPDATE SET "星期" = $3, "内容" = $4`,
      [jiaoSeId, riQi, xingQi, JSON.stringify(zhengSe)],
    )
    return true
  } catch (错误) {
    debug日志.error(RiZhiLeiXing, '写入日程失败', {
      xiang_qing: { jiao_se_id: jiaoSeId, ri_qi: riQi, cuo_wu: String(错误) },
    })
    return false
  }
}

export interface DangQianHuoDong {
  shiJian: string
  huoDong: string
  keNengXing: 'mang' | 'banMang' | 'xian'
}

export function quDangQianHuoDong(zhuangTai: RiChengZhuangTai | null, xianZaiMiao: number): DangQianHuoDong | null {
  if (!zhuangTai || zhuangTai.duanLu.length === 0) return null
  let dangQian: RiChengDuan | null = null
  for (const duan of zhuangTai.duanLu) {
    if (shiJianDaoMiao(duan.shiJian) > xianZaiMiao) continue
    if (dangQian === null || shiJianDaoMiao(duan.shiJian) > shiJianDaoMiao(dangQian.shiJian)) dangQian = duan
  }
  if (!dangQian) return null
  return { shiJian: dangQian.shiJian, huoDong: dangQian.huoDong, keNengXing: renDingKeNengXing(dangQian.huoDong) }
}

const MangHuoDong = /上课|上班|工作|会议|开会|考试|面试|加班|写代码|做饭|通勤|路上|赶|忙|学习|上课/
const XianHuoDong = /睡|休息|放空|发呆|刷手机|看剧|看番|听歌|咖啡|阳台|窗边|泡澡|洗澡/

export function renDingKeNengXing(huoDong: string): 'mang' | 'banMang' | 'xian' {
  if (MangHuoDong.test(huoDong)) return 'mang'
  if (XianHuoDong.test(huoDong)) return 'xian'
  return 'banMang'
}

export function riChengMiaoShu(zhuangTai: RiChengZhuangTai | null, dangQian: DangQianHuoDong | null): string {
  if (!zhuangTai || !dangQian) return ''
  const xingQiMing = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'][zhuangTai.xingQi] || ''
  const zhuang = dangQian.keNengXing === 'mang' ? '在忙' : dangQian.keNengXing === 'xian' ? '闲着' : '半忙半闲'
  return `${xingQiMing}，现在是${dangQian.shiJian}，你在${dangQian.huoDong}（${zhuang}）`
}