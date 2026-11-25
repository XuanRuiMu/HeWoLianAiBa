import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'
import type { ChongTuZhuangTaiMing } from '../types'

const RiZhiLeiXing = '冲突弧'

export const ChongTuZhuangTaiLieBiao = ['wu', 'lengZhan', 'huiBi', 'yiDuBuHui'] as const

export const ChongTuZhuangTaiZhongWen: Record<ChongTuZhuangTaiMing, string> = {
  wu: '无冲突',
  lengZhan: '冷战',
  huiBi: '回避',
  yiDuBuHui: '已读不回',
}

const ShengJiXiaYiDang: Record<ChongTuZhuangTaiMing, ChongTuZhuangTaiMing | null> = {
  wu: 'lengZhan',
  lengZhan: 'huiBi',
  huiBi: 'yiDuBuHui',
  yiDuBuHui: null,
}

export const ChongTuWanFaPeiZhi = {
  shengJiXinQingQiangDu: 90,
  huaJieXinQingQiangDu: 15,
  huaJieXinQingMing: '平静',
  shengJiXinQingMing: '生气',
  shengQiXingTaiZuiDiQiangDu: 60,
  kuaiReHuaJieJiaCheng: 6,
  manReHuaJieJiaCheng: 3,
  moRenHuaJieJiaCheng: 4,
  xiuFuPanDuanPinKongChuangKouHaoMiao: 60 * 1000,
  xiuFuPanDuanPinKongShangXian: 3,
  xiuFuPanDuanLianXuShiBaiYuZhi: 3,
} as const

export function shiHeFaChongTuZhuangTai(zhi: unknown): zhi is ChongTuZhuangTaiMing {
  return typeof zhi === 'string' && (ChongTuZhuangTaiLieBiao as readonly string[]).includes(zhi)
}

export function shiFouZaiChongTuHu(zhuangTai: ChongTuZhuangTaiMing): boolean {
  return zhuangTai !== 'wu'
}

export function shengJiXiaYiDangMing(dangQian: ChongTuZhuangTaiMing): ChongTuZhuangTaiMing | null {
  return ShengJiXiaYiDang[dangQian]
}

export function shiFouYunXuZhuanYi(dangQian: ChongTuZhuangTaiMing, muBiao: ChongTuZhuangTaiMing): boolean {
  if (dangQian === muBiao) return true
  return ShengJiXiaYiDang[dangQian] === muBiao
}

export interface ChongTuXinXi {
  zhuangTai: ChongTuZhuangTaiMing
  shiYou: string
  shengJiJiShu: number
}

export interface ChongTuShengJiJieGuo {
  chengGong: boolean
  shengJi: boolean
  zhuangTai: ChongTuZhuangTaiMing | null
}

const UUIDGeShi = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function qingJieShiYou(shiYou: string): string {
  const ganJing = (shiYou || '').trim().slice(0, 200)
  return ganJing === '' ? '严重冒犯' : ganJing
}

function quFeiFuJiShu(zhi: unknown): number {
  const shu = Number(zhi)
  return Number.isFinite(shu) && shu >= 0 ? Math.floor(shu) : 0
}

export async function huoQuChongTuXinXi(
  yongHuId: string,
  jiaoSeId: string,
): Promise<ChongTuXinXi | null> {
  const jieGuo = await 数据库.query(
    `SELECT "冲突状态" AS "zhuangTai", "冲突事由" AS "shiYou", "冲突升级计数" AS "shengJiJiShu"
     FROM "好感度" WHERE "用户ID" = $1 AND "角色ID" = $2 LIMIT 1`,
    [yongHuId, jiaoSeId],
  )
  const hang = jieGuo.rows[0]
  if (!hang) return null
  return {
    zhuangTai: shiHeFaChongTuZhuangTai(hang.zhuangTai) ? hang.zhuangTai : 'wu',
    shiYou: String(hang.shiYou ?? ''),
    shengJiJiShu: quFeiFuJiShu(hang.shengJiJiShu),
  }
}

export async function huoQuChongTuZhuangTai(
  yongHuId: string,
  jiaoSeId: string,
): Promise<ChongTuZhuangTaiMing> {
  const xinXi = await huoQuChongTuXinXi(yongHuId, jiaoSeId)
  return xinXi?.zhuangTai ?? 'wu'
}

export async function shengJiChongTu(
  yongHuId: string,
  jiaoSeId: string,
  shiYou: string,
): Promise<ChongTuShengJiJieGuo> {
  try {
    const dangQian = await huoQuChongTuZhuangTai(yongHuId, jiaoSeId)
    const muBiao = ShengJiXiaYiDang[dangQian] ?? dangQian
    if (!shiFouYunXuZhuanYi(dangQian, muBiao)) {
      return { chengGong: false, shengJi: false, zhuangTai: dangQian }
    }
    const ganJingShiYou = qingJieShiYou(shiYou)
    const gengXin = await 数据库.query(
      `UPDATE "好感度" SET "冲突状态" = $3, "冲突事由" = $4
       WHERE "用户ID" = $1 AND "角色ID" = $2 AND "冲突状态" = $5
       RETURNING *`,
      [yongHuId, jiaoSeId, muBiao, ganJingShiYou, dangQian],
    )
    if ((gengXin.rowCount ?? 0) === 0) {
      debug日志.warn(RiZhiLeiXing, '冲突升档未生效：档位已被并发修改或关系行不存在', {
        xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, dang_qian: dangQian, mu_biao: muBiao },
      })
      return { chengGong: false, shengJi: false, zhuangTai: dangQian }
    }
    debug日志.info(RiZhiLeiXing, dangQian === muBiao ? '冲突同级维持，事由已更新' : '冲突升档', {
      xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, cong: dangQian, dao: muBiao, shi_you_zi_shu: ganJingShiYou.length },
    })
    debug日志.debug(RiZhiLeiXing, '冲突事由原文', {
      xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, shi_you: ganJingShiYou },
    })
    return { chengGong: true, shengJi: dangQian !== muBiao, zhuangTai: muBiao }
  } catch (cuoWu) {
    debug日志.error(RiZhiLeiXing, '冲突升档失败，本轮忽略冲突事件', {
      xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, cuo_wu: String(cuoWu) },
    })
    return { chengGong: false, shengJi: false, zhuangTai: null }
  }
}

export async function huaJieChongTu(yongHuId: string, jiaoSeId: string): Promise<boolean> {
  try {
    const gengXin = await 数据库.query(
      `UPDATE "好感度" SET "冲突状态" = 'wu', "冲突事由" = NULL, "冲突升级计数" = 0
       WHERE "用户ID" = $1 AND "角色ID" = $2 AND "冲突状态" <> 'wu'
       RETURNING *`,
      [yongHuId, jiaoSeId],
    )
    const chengGong = (gengXin.rowCount ?? 0) > 0
    if (chengGong) {
      debug日志.info(RiZhiLeiXing, '冲突化解：弧内档位归零，事由与敷衍计数已清空', {
        xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId },
      })
    }
    return chengGong
  } catch (cuoWu) {
    debug日志.error(RiZhiLeiXing, '冲突化解失败', {
      xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, cuo_wu: String(cuoWu) },
    })
    return false
  }
}

export async function diZengFuYanJiShu(yongHuId: string, jiaoSeId: string): Promise<number> {
  try {
    const gengXin = await 数据库.query(
      `UPDATE "好感度" SET "冲突升级计数" = "冲突升级计数" + 1
       WHERE "用户ID" = $1 AND "角色ID" = $2 AND "冲突状态" <> 'wu'
       RETURNING "冲突升级计数" AS "ji_shu"`,
      [yongHuId, jiaoSeId],
    )
    return quFeiFuJiShu(gengXin.rows[0]?.ji_shu)
  } catch (cuoWu) {
    debug日志.error(RiZhiLeiXing, '敷衍计数递增失败', {
      xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, cuo_wu: String(cuoWu) },
    })
    return 0
  }
}

export async function biaoJiXiaoXiYiDu(
  yongHuId: string,
  jiaoSeId: string,
  xiaoXiIdLieBiao: string[],
): Promise<void> {
  const heFaIdLieBiao = (xiaoXiIdLieBiao || []).filter(
    (id) => typeof id === 'string' && UUIDGeShi.test(id),
  )
  if (heFaIdLieBiao.length === 0) return
  await 数据库.query(
    `UPDATE "消息" SET "已读" = true
     WHERE "用户ID" = $1 AND "角色ID" = $2 AND "ID" = ANY($3::uuid[])`,
    [yongHuId, jiaoSeId, heFaIdLieBiao],
  )
}

export function renSheHuaJieJiaCheng(reShenLeiXing?: '慢热' | '快热'): number {
  if (reShenLeiXing === '快热') return ChongTuWanFaPeiZhi.kuaiReHuaJieJiaCheng
  if (reShenLeiXing === '慢热') return ChongTuWanFaPeiZhi.manReHuaJieJiaCheng
  return ChongTuWanFaPeiZhi.moRenHuaJieJiaCheng
}
