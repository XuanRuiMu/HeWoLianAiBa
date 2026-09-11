import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { debug日志 } from '../utils/debug日志'
import { huoQuFanYi } from '../config/translations'
import { chuangJianTongZhi } from './通知'
import { jiLuShenJiRiZhi } from './审计日志'

/**
 * 账号维度三级封禁（任务3方案A，用户口径）：
 * 第1次违规 → 提醒并封禁1分钟；第2次 → 封禁1天；第3次及以上 → 永封。
 * 非法数据拦截在落库前（等同撤回销毁）；已落库消息走 cheHuiWeiGuiXiaoXi 撤回。
 * 与 IP 封禁并行：账号记人、IP 防换号。AI 识别只做初筛（安全审核服务），
 * 误判纠正靠申诉（通过后违规次数清零）与管理员解封（保留次数、再犯升级）。
 */
export type FengJinJiBie = 'zheng_chang' | 'feng_jin_1_fen' | 'feng_jin_1_tian' | 'yong_feng'

export type ShenSuZhuangTai = 'wu' | 'shen_su_zhong' | 'yi_jie_chu' | 'bo_hui'

export interface ZhangHaoFengJinZhuangTai {
  beiFengJin: boolean
  jiBie: FengJinJiBie
  weiGuiCiShu: number
  jieFengShiJian: Date | null
  yuanYin: string
  shenSuZhuangTai: ShenSuZhuangTai
}

const ZHANG_HAO_WEI_GUI_QIAN_ZHUI = '账号违规:'
const ZHANG_HAO_FENG_JIN_QIAN_ZHUI = '账号封禁:'
const YONG_JIU_FENG_JIN = -1
const WEI_GUI_JI_SHU_YOU_XIAO_HAO_MIAO = 30 * 24 * 60 * 60 * 1000

const KONG_ZHUANG_TAI: ZhangHaoFengJinZhuangTai = {
  beiFengJin: false,
  jiBie: 'zheng_chang',
  weiGuiCiShu: 0,
  jieFengShiJian: null,
  yuanYin: '',
  shenSuZhuangTai: 'wu',
}

function shiHeFaJiBie(zhi: unknown): zhi is FengJinJiBie {
  return zhi === 'zheng_chang' || zhi === 'feng_jin_1_fen' || zhi === 'feng_jin_1_tian' || zhi === 'yong_feng'
}

function shiHeFaShenSu(zhi: unknown): zhi is ShenSuZhuangTai {
  return zhi === 'wu' || zhi === 'shen_su_zhong' || zhi === 'yi_jie_chu' || zhi === 'bo_hui'
}

/** 用户口径三级时长：第1次1分钟，第2次1天，第3次及以上永封 */
export function jiSuanZhangHaoFengJinShiChang(ciShu: number): number | undefined {
  if (ciShu === 1) return 60 * 1000
  if (ciShu === 2) return 24 * 60 * 60 * 1000
  if (ciShu >= 3) return YONG_JIU_FENG_JIN
  return undefined
}

function jiBieWenAn(jiBie: FengJinJiBie): string {
  if (jiBie === 'feng_jin_1_fen') return '封禁1分钟'
  if (jiBie === 'feng_jin_1_tian') return '封禁1天'
  if (jiBie === 'yong_feng') return '永久封禁'
  return '正常'
}

export async function chaXunZhangHaoFengJin(yongHuId: string): Promise<ZhangHaoFengJinZhuangTai> {
  if (!yongHuId) return KONG_ZHUANG_TAI
  let hang: Record<string, unknown> | null = null
  try {
    const jieGuo = await 数据库.query(
      `SELECT "违规次数", "级别", "解封时间", "最后原因", "申诉状态" FROM "账号封禁" WHERE "用户ID" = $1 LIMIT 1`,
      [yongHuId],
    )
    hang = (jieGuo.rows[0] as Record<string, unknown> | undefined) || null
  } catch (cuoWu) {
    debug日志.error('账号封禁', '查询封禁行失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return KONG_ZHUANG_TAI
  }
  const ciShu = Number(hang?.['违规次数'] || 0)
  const jiBieRaw = hang?.['级别']
  const jiBie: FengJinJiBie = shiHeFaJiBie(jiBieRaw) ? jiBieRaw : 'zheng_chang'
  const shenSuRaw = hang?.['申诉状态']
  const shenSu: ShenSuZhuangTai = shiHeFaShenSu(shenSuRaw) ? shenSuRaw : 'wu'
  const yuanYin = hang?.['最后原因'] ? String(hang['最后原因']) : ''

  try {
    const huanCun = await redis.get(`${ZHANG_HAO_FENG_JIN_QIAN_ZHUI}${yongHuId}`)
    if (huanCun) {
      const jieXi = JSON.parse(huanCun) as { jieFengShiJian?: string | null; jiBie?: unknown; yuanYin?: string }
      return {
        beiFengJin: true,
        jiBie: shiHeFaJiBie(jieXi.jiBie) ? jieXi.jiBie : jiBie,
        weiGuiCiShu: ciShu,
        jieFengShiJian: jieXi.jieFengShiJian ? new Date(jieXi.jieFengShiJian) : null,
        yuanYin: jieXi.yuanYin || yuanYin,
        shenSuZhuangTai: shenSu,
      }
    }
  } catch (cuoWu) {
    debug日志.error('账号封禁', '读取封禁缓存失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
  }

  if (jiBie === 'yong_feng') {
    return { beiFengJin: true, jiBie, weiGuiCiShu: ciShu, jieFengShiJian: null, yuanYin, shenSuZhuangTai: shenSu }
  }
  const jieFengShiJian = hang?.['解封时间'] ? new Date(String(hang['解封时间'])) : null
  if (jieFengShiJian && jieFengShiJian.getTime() > Date.now()) {
    return { beiFengJin: true, jiBie, weiGuiCiShu: ciShu, jieFengShiJian, yuanYin, shenSuZhuangTai: shenSu }
  }
  return { beiFengJin: false, jiBie: 'zheng_chang', weiGuiCiShu: ciShu, jieFengShiJian: null, yuanYin, shenSuZhuangTai: shenSu }
}

export interface WeiGuiJiLuJieGuo {
  ciShu: number
  jiBie: FengJinJiBie
  jieFengShiJian: Date | null
}

export async function jiLuZhangHaoWeiGui(canShu: {
  yongHuId: string
  ip: string
  yuanYin: string
  leiXing: string
}): Promise<WeiGuiJiLuJieGuo> {
  const { yongHuId, ip, yuanYin, leiXing } = canShu
  const weiGuiJian = `${ZHANG_HAO_WEI_GUI_QIAN_ZHUI}${yongHuId}`
  const ciShu = await redis.incr(weiGuiJian)
  if (ciShu === 1) {
    await redis.pexpire(weiGuiJian, WEI_GUI_JI_SHU_YOU_XIAO_HAO_MIAO)
  }
  const shiChang = jiSuanZhangHaoFengJinShiChang(ciShu)
  const jiBie: FengJinJiBie = ciShu === 1 ? 'feng_jin_1_fen' : ciShu === 2 ? 'feng_jin_1_tian' : 'yong_feng'
  const jieFengShiJian = shiChang === undefined || shiChang === YONG_JIU_FENG_JIN ? null : new Date(Date.now() + shiChang)
  try {
    await 数据库.query(
      `INSERT INTO "账号封禁" ("用户ID", "违规次数", "级别", "解封时间", "最后原因", "申诉状态", "更新时间")
       VALUES ($1, $2, $3, $4, $5, 'wu', NOW())
       ON CONFLICT ("用户ID") DO UPDATE SET "违规次数" = "账号封禁"."违规次数" + 1, "级别" = $3, "解封时间" = $4, "最后原因" = $5, "申诉状态" = 'wu', "更新时间" = NOW()`,
      [yongHuId, ciShu, jiBie, jieFengShiJian, `${leiXing}：${yuanYin}`.slice(0, 500)],
    )
  } catch (cuoWu) {
    debug日志.error('账号封禁', '持久化封禁行失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
  }
  try {
    const huanCunZhi = JSON.stringify({
      jieFengShiJian: jieFengShiJian ? jieFengShiJian.toISOString() : null,
      jiBie,
      yuanYin: yuanYin.slice(0, 200),
    })
    if (shiChang === YONG_JIU_FENG_JIN) {
      await redis.set(`${ZHANG_HAO_FENG_JIN_QIAN_ZHUI}${yongHuId}`, huanCunZhi)
    } else if (shiChang !== undefined) {
      await redis.set(`${ZHANG_HAO_FENG_JIN_QIAN_ZHUI}${yongHuId}`, huanCunZhi, 'PX', shiChang)
    }
  } catch (cuoWu) {
    debug日志.error('账号封禁', '写入封禁缓存失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
  }
  try {
    await chuangJianTongZhi({
      jie_shou_zhe_id: yongHuId,
      biao_ti: '账号受限通知',
      nei_rong: `你发送的内容违规已被撤回，这是第${ciShu}次违规，账号${jiBieWenAn(jiBie)}${jieFengShiJian ? `，解封时间${jieFengShiJian.toLocaleString('zh-CN')}` : ''}。如有异议可在账号与安全页申诉。`,
    })
  } catch {
    /* 通知失败不阻断封禁 */
  }
  try {
    await jiLuShenJiRiZhi({
      yong_hu_id: yongHuId,
      ip,
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'zhangHaoWeiGui'),
      xiang_qing: { ci_shu: ciShu, ji_bie: jiBie, lei_xing: leiXing, yuan_yin: yuanYin.slice(0, 200) },
      lei_xing: '安全',
    })
  } catch {
    /* 审计失败不阻断封禁 */
  }
  return { ciShu, jiBie, jieFengShiJian }
}

/** 撤回已落库的非法数据（AI 聊天消息 / 好友消息），返回是否实际撤回 */
export async function cheHuiWeiGuiXiaoXi(
  biaoLeiXing: 'liaoTian' | 'haoYou',
  xiaoXiId: string,
): Promise<boolean> {
  try {
    if (biaoLeiXing === 'liaoTian') {
      const gengXin = await 数据库.query(
        `UPDATE "消息" SET "已撤回" = true, "撤回时间" = NOW(), "原始内容" = "内容" WHERE "ID" = $1 AND "已撤回" = false`,
        [xiaoXiId],
      )
      return (gengXin.rowCount || 0) > 0
    }
    const gengXin = await 数据库.query(`UPDATE "好友消息" SET "撤回" = TRUE WHERE "ID" = $1 AND "撤回" = FALSE`, [xiaoXiId])
    return (gengXin.rowCount || 0) > 0
  } catch (cuoWu) {
    debug日志.error('账号封禁', '撤回违规消息失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return false
  }
}

export async function tiJiaoShenSu(yongHuId: string, liYou: string): Promise<{ cheng_gong: boolean; ti_shi?: string }> {
  const zhuangTai = await chaXunZhangHaoFengJin(yongHuId)
  if (!zhuangTai.beiFengJin) return { cheng_gong: false }
  const qingLi = liYou.trim().slice(0, 500)
  if (!qingLi) return { cheng_gong: false }
  await 数据库.query(
    `UPDATE "账号封禁" SET "申诉状态" = 'shen_su_zhong', "申诉理由" = $1, "更新时间" = NOW() WHERE "用户ID" = $2`,
    [qingLi, yongHuId],
  )
  return { cheng_gong: true }
}

export async function shenHeShenSu(
  guanLiYuanId: string,
  muBiaoId: string,
  tongGuo: boolean,
  ip: string,
): Promise<void> {
  if (tongGuo) {
    await 数据库.query(`DELETE FROM "账号封禁" WHERE "用户ID" = $1`, [muBiaoId])
    try {
      await redis.del(`${ZHANG_HAO_FENG_JIN_QIAN_ZHUI}${muBiaoId}`)
      await redis.del(`${ZHANG_HAO_WEI_GUI_QIAN_ZHUI}${muBiaoId}`)
    } catch {
      /* 缓存清理失败不阻断 */
    }
    await chuangJianTongZhi({
      jie_shou_zhe_id: muBiaoId,
      biao_ti: '申诉结果通知',
      nei_rong: '你的申诉已通过，账号已恢复正常，历史违规记录已清除。',
    }).catch(() => {})
  } else {
    await 数据库.query(
      `UPDATE "账号封禁" SET "申诉状态" = 'bo_hui', "更新时间" = NOW() WHERE "用户ID" = $1`,
      [muBiaoId],
    )
    await chuangJianTongZhi({
      jie_shou_zhe_id: muBiaoId,
      biao_ti: '申诉结果通知',
      nei_rong: '你的申诉未通过，账号限制继续生效。如仍有异议请联系客服。',
    }).catch(() => {})
  }
  await jiLuShenJiRiZhi({
    yong_hu_id: guanLiYuanId,
    ip,
    shi_jian_lei_xing: huoQuFanYi('shenJi', 'shenHeShenSu'),
    xiang_qing: { mu_biao: muBiaoId, tong_guo: tongGuo },
    lei_xing: '管理',
  }).catch(() => {})
}

export async function jieChuZhangHaoFengJin(
  guanLiYuanId: string,
  muBiaoId: string,
  ip: string,
): Promise<void> {
  await 数据库.query(
    `UPDATE "账号封禁" SET "级别" = 'zheng_chang', "解封时间" = NULL, "申诉状态" = 'yi_jie_chu', "更新时间" = NOW() WHERE "用户ID" = $1`,
    [muBiaoId],
  )
  try {
    await redis.del(`${ZHANG_HAO_FENG_JIN_QIAN_ZHUI}${muBiaoId}`)
  } catch {
    /* 缓存清理失败不阻断 */
  }
  await chuangJianTongZhi({
    jie_shou_zhe_id: muBiaoId,
    biao_ti: '账号恢复通知',
    nei_rong: '管理员已解除你的账号限制，但历史违规次数保留，再次违规将升级处罚。',
  }).catch(() => {})
  await jiLuShenJiRiZhi({
    yong_hu_id: guanLiYuanId,
    ip,
    shi_jian_lei_xing: huoQuFanYi('shenJi', 'jieChuFengJin'),
    xiang_qing: { mu_biao: muBiaoId },
    lei_xing: '管理',
  }).catch(() => {})
}

export async function lieChuFengJinShenSu(): Promise<
  Array<{ yong_hu_id: string; wei_gui_ci_shu: number; ji_bie: string; jie_feng_shi_jian: string | null; shen_su_zhuang_tai: string; yuan_yin: string }>
> {
  const jieGuo = await 数据库.query(
    `SELECT "用户ID", "违规次数", "级别", "解封时间", "申诉状态", "最后原因" FROM "账号封禁" ORDER BY "更新时间" DESC LIMIT 200`,
  )
  return jieGuo.rows.map((r) => ({
    yong_hu_id: String(r['用户ID']),
    wei_gui_ci_shu: Number(r['违规次数'] || 0),
    ji_bie: String(r['级别'] || ''),
    jie_feng_shi_jian: r['解封时间'] ? String(r['解封时间']) : null,
    shen_su_zhuang_tai: String(r['申诉状态'] || 'wu'),
    yuan_yin: String(r['最后原因'] || ''),
  }))
}
