import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { debug日志 } from '../utils/debug日志'
import { huoQuFanYi, huoQuFanYiMiaoShu } from '../config/translations'
import { chuangJianTongZhi } from './通知'
import { jiLuShenJiRiZhi } from './审计日志'

/**
 * 账号维度四级封禁（YH-027收敛，用户口径）：
 * 第1次违规 → 封禁1分钟；第2次 → 封禁1天；第3次 → 封禁7天；第4次及以上 → 封禁30天封顶。
 * 非法数据拦截在落库前（等同撤回销毁）；已落库消息走 cheHuiWeiGuiXiaoXi 撤回。
 * 与 IP 封禁并行：账号记人、IP 防换号。AI 识别只做初筛（安全审核服务），
 * 误判纠正靠申诉（通过后违规次数清零）与管理员解封（保留次数、再犯升级）。
 * YH-111 封禁语义统一以迁移015为准：四级yong_feng即30天封顶，禁无期限永封。
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
// YH-027 最长30天封顶：禁无期限永封
const ZUI_CHANG_FENG_JIN_HAO_MIAO = 30 * 24 * 60 * 60 * 1000
const WEI_GUI_JI_SHU_YOU_XIAO_HAO_MIAO = 30 * 24 * 60 * 60 * 1000
// 时长陈述的单位（自然常量，只用于把真实毫秒数换算成玩家读得懂的「N天/N分钟」）
const FEN_ZHONG_HAO_MIAO = 60 * 1000
const TIAN_HAO_MIAO = 24 * 60 * 60 * 1000

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

/** 用户口径四级时长：1分钟→1天→7天→30天封顶 */
export function jiSuanZhangHaoFengJinShiChang(ciShu: number): number | undefined {
  if (ciShu === 1) return 60 * 1000
  if (ciShu === 2) return 24 * 60 * 60 * 1000
  if (ciShu === 3) return 7 * 24 * 60 * 60 * 1000
  if (ciShu >= 4) return ZUI_CHANG_FENG_JIN_HAO_MIAO
  return undefined
}

/**
 * 通知里的时长陈述与真实处罚同源：数值一律由 jiSuanZhangHaoFengJinShiChang 的毫秒数换算。
 * 级别枚举 yong_feng 一档同时盖着 7 天（第3次）与 30 天（第4次起），
 * 拿它生成时长陈述等于对玩家说谎，故 jiBie 只用于未封禁（zheng_chang）等无时长场景。
 */
function fengJinShiChangChenShu(ciShu: number, jiBie: FengJinJiBie): string {
  const haoMiao = jiSuanZhangHaoFengJinShiChang(ciShu)
  if (jiBie === 'zheng_chang' || haoMiao === undefined) return huoQuFanYi('fengJinJiBie', jiBie)
  const tianShu = haoMiao / TIAN_HAO_MIAO
  if (Number.isInteger(tianShu)) {
    return huoQuFanYiMiaoShu('fengJinJiBie', 'fengJinShiChangTian', { shiChang: tianShu })
  }
  return huoQuFanYiMiaoShu('fengJinJiBie', 'fengJinShiChangFenZhong', {
    shiChang: haoMiao / FEN_ZHONG_HAO_MIAO,
  })
}

/** 封禁通知正文：占位符文案全部来自 translations，业务侧不做中文字符串拼接 */
export function fengJinTongZhiZhengWen(
  ciShu: number,
  jiBie: FengJinJiBie,
  jieFengShiJian: Date | null,
): string {
  const jieFengZhui = jieFengShiJian
    ? huoQuFanYiMiaoShu('tongZhi', 'jieFengShiJianZhui', {
        shiJian: jieFengShiJian.toLocaleString('zh-CN'),
      })
    : ''
  return huoQuFanYiMiaoShu('tongZhi', 'zhangHaoShouXianZhengWen', {
    ciShu,
    jiBie: fengJinShiChangChenShu(ciShu, jiBie),
    jieFengZhui,
  })
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

  // YH-027 复核语义：yong_feng统一为30天封顶，解封时间过期视为未封禁
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
  // YH-061 封禁分级以DB次数行锁定级，Redis只做缓存禁作真相源
  // 根因：Redis计数30天过期洗白一级，与DB账本对不上；收敛为DB行锁读-算-写
  const keHuDuan = await 数据库.connect()
  let ciShu = 1
  let jiBie: FengJinJiBie = 'feng_jin_1_fen'
  let jieFengShiJian: Date | null = new Date(Date.now() + 60 * 1000)
  try {
    await keHuDuan.query('BEGIN')
    const suoHang = await keHuDuan.query(
      `SELECT "违规次数" FROM "账号封禁" WHERE "用户ID" = $1 FOR UPDATE`,
      [yongHuId],
    )
    const shangCi = suoHang.rows.length > 0 ? Number(suoHang.rows[0].违规次数 || 0) : 0
    ciShu = shangCi + 1
    const shiChang = jiSuanZhangHaoFengJinShiChang(ciShu)
    jiBie = ciShu === 1 ? 'feng_jin_1_fen' : ciShu === 2 ? 'feng_jin_1_tian' : 'yong_feng'
    jieFengShiJian = shiChang === undefined ? null : new Date(Date.now() + shiChang)
    await keHuDuan.query(
      `INSERT INTO "账号封禁" ("用户ID", "违规次数", "级别", "解封时间", "最后原因", "申诉状态", "更新时间")
       VALUES ($1, $2, $3, $4, $5, 'wu', NOW())
       ON CONFLICT ("用户ID") DO UPDATE SET "违规次数" = "账号封禁"."违规次数" + 1, "级别" = $3, "解封时间" = $4, "最后原因" = $5, "申诉状态" = 'wu', "更新时间" = NOW()`,
      [yongHuId, ciShu, jiBie, jieFengShiJian, `${leiXing}：${yuanYin}`.slice(0, 500)],
    )
    await keHuDuan.query('COMMIT')
  } catch (cuoWu) {
    await keHuDuan.query('ROLLBACK').catch(() => undefined)
    debug日志.error('账号封禁', 'DB行锁定级失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    throw cuoWu
  } finally {
    keHuDuan.release()
  }
  // Redis仅回写缓存对齐DB真相，失败不阻断
  try {
    await redis.set(`${ZHANG_HAO_WEI_GUI_QIAN_ZHUI}${yongHuId}`, String(ciShu), 'PX', WEI_GUI_JI_SHU_YOU_XIAO_HAO_MIAO)
  } catch {
    /* 缓存回写失败不阻断封禁 */
  }
  // YH-014 封禁联动吊销：记违规即吊销其媒体签名存量URL
  try {
    const { cheXiaoYongHuMeiTiQianMing } = await import('./媒体存储')
    await cheXiaoYongHuMeiTiQianMing(yongHuId)
  } catch {
    return { ciShu, jiBie, jieFengShiJian }
  }
  try {
    await chuangJianTongZhi({
      jie_shou_zhe_id: yongHuId,
      biao_ti: huoQuFanYi('tongZhi', 'zhangHaoShouXianBiaoTi'),
      nei_rong: fengJinTongZhiZhengWen(ciShu, jiBie, jieFengShiJian),
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
      await redis.del(`${ZHANG_HAO_WEI_GUI_QIAN_ZHUI}${muBiaoId}`)
    } catch {
      /* 缓存清理失败不阻断 */
    }
    await chuangJianTongZhi({
      jie_shou_zhe_id: muBiaoId,
      biao_ti: huoQuFanYi('tongZhi', 'shenSuJieGuoBiaoTi'),
      nei_rong: huoQuFanYi('tongZhi', 'shenSuTongGuoZhengWen'),
    }).catch(() => {})
  } else {
    await 数据库.query(
      `UPDATE "账号封禁" SET "申诉状态" = 'bo_hui', "更新时间" = NOW() WHERE "用户ID" = $1`,
      [muBiaoId],
    )
    await chuangJianTongZhi({
      jie_shou_zhe_id: muBiaoId,
      biao_ti: huoQuFanYi('tongZhi', 'shenSuJieGuoBiaoTi'),
      nei_rong: huoQuFanYi('tongZhi', 'shenSuBoHuiZhengWen'),
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
  // YH-014 封禁联动吊销：解封/封禁状态变更即吊销其媒体签名，防旧URL继续通行
  const { cheXiaoYongHuMeiTiQianMing } = await import('./媒体存储')
  await cheXiaoYongHuMeiTiQianMing(muBiaoId).catch(() => undefined)
  await chuangJianTongZhi({
    jie_shou_zhe_id: muBiaoId,
    biao_ti: huoQuFanYi('tongZhi', 'zhangHaoHuiFuBiaoTi'),
    nei_rong: huoQuFanYi('tongZhi', 'zhangHaoHuiFuZhengWen'),
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
