import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { XIAO_XI_PEI_ZHI } from '../config/消息配置'
import { YUN_XU_XIAO_XI_LEI_XING } from '../config/媒体配置'
import { huoQuIo } from '../socket/io'
import { yanZhengUUID } from '../utils/验证'
import { 解析结局类型, 解析结局文案 } from '../utils/结局'
import { 归一角色性别 } from '../utils/性别'
import { debug日志, jiLuXiaoXiCaoZuo, jiLuSocketShiJian } from '../utils/debug日志'
import { shengChengQianMingURL } from './媒体存储'
import {
  diuQiDaoCuoWuJian,
  fanGouKuai,
  jiLuKuaiDiuQi,
  leiXingDaoMeiTiLeiBie,
  paiShengJianRong,
  qingLiLuoKuKuai,
  qingLiTiJiaoKuai,
  yingYongMeiTiPanDing,
  type JianRongJianYing,
  type XiaoXiKuai,
} from './消息内容块'

export interface XiaoXiKuaiChuCan extends XiaoXiKuai {
  mei_ti_url?: string | null
  mei_ti_lei_bie?: string | null
}

interface KuaiMeiTiXinXi {
  sha256: string
  lei_bie: string
}

export interface XiaoXiXinXi {
  id: string
  hui_hua_id: string
  fa_song_zhe_id: string
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose' | 'xitong'
  ai_biao_shi: boolean
  nei_rong: string
  lei_xing: string
  nei_rong_kuai?: XiaoXiKuaiChuCan[]
  bei_yong_xiao_xi_id?: string | null
  shi_jian_chuo: number
  yi_du: boolean
  yi_che_hui?: boolean
  che_hui_shi_jian?: string | null
  yuan_shi_nei_rong?: string | null
  ke_hu_duan_xu_hao?: number | null
  mi_deng_jian?: string | null
  mei_ti_id?: string | null
  mei_ti_url?: string | null
  mei_ti_lei_bie?: string | null
  mei_ti_shi_chang_hao_miao?: number | null
  mei_ti_yuan_shi_wen_jian_ming?: string | null
}

export interface FaSongXiaoXiCanShu {
  yong_hu_id: string
  jiao_se_id: string
  nei_rong: string
  ke_hu_duan_xu_hao?: number | null
  mi_deng_jian?: string | null
  lei_xing?: string
  mei_ti_id?: string | null
  nei_rong_kuai?: unknown
  bei_yong_xiao_xi_id?: string | null
}

export interface HuoQuXiaoXiCanShu {
  yong_hu_id: string
  jiao_se_id: string
  ye_ma?: number
  mei_ye_tiao_shu?: number
  you_biao_xu_hao?: number | null
  you_biao_shi_jian_chuo?: number | null
  you_biao_id?: string | null
}

export interface CheHuiXiaoXiCanShu {
  yong_hu_id: string
  jiao_se_id: string
  xiao_xi_id: string
}

export interface CheHuiJiaoSeXiaoXiCanShu {
  yong_hu_id: string
  jiao_se_id: string
}

function tuiSongCheHuiShiJian(
  yong_hu_id: string,
  jiao_se_id: string,
  xiao_xi_id: string,
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose',
): void {
  const io = huoQuIo()
  if (io) {
    io.to(yong_hu_id).emit('消息撤回', {
      hui_hua_id: jiao_se_id,
      xiao_xi_id,
      fa_song_zhe_lei_xing,
    })
    jiLuSocketShiJian('消息撤回', yong_hu_id, {
      jiao_se_id,
      xiao_xi_id,
      fa_song_zhe_lei_xing,
    })
  }
}

export interface KuaiShangXiaWen {
  kuaiOf(xiaoXiId: string): XiaoXiKuai[] | null
  meiTiOf(meiTiId: string): KuaiMeiTiXinXi | null
}

export interface KuaiTouYingMianXiang {
  cheHuiLie: string
  sha256Lie: string
  leiBieLie: string
  qianMingZhuTi(hang: Record<string, unknown>): string
}

const AI_KUAI_TOU_YING: KuaiTouYingMianXiang = {
  cheHuiLie: '已撤回',
  sha256Lie: '媒体SHA256',
  leiBieLie: '媒体类别',
  qianMingZhuTi: (hang) => String(hang.用户ID),
}

export function haoYouKuaiTouYing(duZheId: string): KuaiTouYingMianXiang {
  return {
    cheHuiLie: '撤回',
    sha256Lie: 'SHA256',
    leiBieLie: '类别',
    qianMingZhuTi: () => duZheId,
  }
}

const WU_KUAI_SHANG_XIA_WEN: KuaiShangXiaWen = {
  kuaiOf: () => null,
  meiTiOf: () => null,
}

async function chaKuaiMeiTiGuiShu(
  meiTiIds: string[],
  yongHuId: string,
): Promise<Map<string, { lei_bie: string; suo_shu: boolean }>> {
  const jieGuo = new Map<string, { lei_bie: string; suo_shu: boolean }>()
  if (meiTiIds.length === 0) return jieGuo
  const chaXun = await 数据库.query(
    `SELECT "ID", "类别", "上传者ID" FROM "媒体文件" WHERE "ID" = ANY($1::uuid[])`,
    [meiTiIds],
  )
  for (const hang of chaXun.rows as Record<string, unknown>[]) {
    jieGuo.set(String(hang.ID), {
      lei_bie: String(hang.类别 ?? ''),
      suo_shu: String(hang.上传者ID) === yongHuId,
    })
  }
  return jieGuo
}

export interface KuaiXieRuJieGuo {
  cheng_gong: boolean
  kuai: XiaoXiKuai[] | null
  jianYing: JianRongJianYing | null
  ti_shi?: string
  zhuang_tai_ma?: number
}

export async function qingLiXiaoXiKuaiXieRu(
  zhi: unknown,
  yongHuId: string,
  changDing: string,
): Promise<KuaiXieRuJieGuo> {
  const tiJiao = qingLiTiJiaoKuai(zhi, changDing)
  if (tiJiao.chaoXian) {
    jiLuKuaiDiuQi(tiJiao.diuQi, `${changDing}·长度超限`, yongHuId)
    return {
      cheng_gong: false,
      kuai: null,
      jianYing: null,
      ti_shi: huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'),
      zhuang_tai_ma: 400,
    }
  }
  if (tiJiao.kuai === null) {
    jiLuKuaiDiuQi(tiJiao.diuQi, changDing, yongHuId)
    return { cheng_gong: true, kuai: null, jianYing: null }
  }
  const meiTiXinXi = await chaKuaiMeiTiGuiShu(tiJiao.daiPanDingMeiTiId, yongHuId)
  const panDing = yingYongMeiTiPanDing(tiJiao.kuai, meiTiXinXi)
  const quanBuDiuQi = [...tiJiao.diuQi, ...panDing.diuQi]
  jiLuKuaiDiuQi(quanBuDiuQi, changDing, yongHuId)
  if (panDing.baoLiu.length === 0) {
    return {
      cheng_gong: false,
      kuai: null,
      jianYing: null,
      ti_shi: huoQuFanYi('liaoTian', diuQiDaoCuoWuJian(quanBuDiuQi)),
      zhuang_tai_ma: 400,
    }
  }
  return {
    cheng_gong: true,
    kuai: panDing.baoLiu,
    jianYing: paiShengJianRong(panDing.baoLiu, meiTiXinXi),
  }
}

function anHangKuai(row: Record<string, unknown>): XiaoXiKuai[] {
  return (
    qingLiLuoKuKuai(row.内容块, String(row.ID ?? '')) ??
    fanGouKuai({
      nei_rong: String(row.内容 ?? ''),
      lei_xing: String(row.类型 || 'wenben'),
      mei_ti_id: row.媒体ID ? String(row.媒体ID) : null,
    })
  )
}

export async function gouKuaiShangXiaWen(
  rows: Record<string, unknown>[],
  mianXiang: KuaiTouYingMianXiang = AI_KUAI_TOU_YING,
): Promise<KuaiShangXiaWen> {
  const kuaiAnId = new Map<string, XiaoXiKuai[]>()
  const meiTiIds = new Set<string>()
  for (const row of rows) {
    const xiaoXiId = String(row.ID ?? '')
    if (row[mianXiang.cheHuiLie]) continue
    const kuai = anHangKuai(row)
    kuaiAnId.set(xiaoXiId, kuai)
    for (const xiang of kuai) {
      if (xiang.lei_xing === 'tupian' && xiang.mei_ti_id) meiTiIds.add(xiang.mei_ti_id)
    }
  }
  const meiTiAnId = new Map<string, KuaiMeiTiXinXi>()
  if (meiTiIds.size > 0) {
    const jieGuo = await 数据库.query(
      `SELECT "ID", "SHA256", "类别" FROM "媒体文件" WHERE "ID" = ANY($1::uuid[])`,
      [[...meiTiIds]],
    )
    for (const xing of jieGuo.rows as Record<string, unknown>[]) {
      const sha = xing.SHA256 ? String(xing.SHA256) : ''
      if (!sha) continue
      meiTiAnId.set(String(xing.ID), {
        sha256: sha.toLowerCase(),
        lei_bie: String(xing.类别 ?? ''),
      })
    }
  }
  return {
    kuaiOf: (xiaoXiId) => kuaiAnId.get(xiaoXiId) ?? null,
    meiTiOf: (meiTiId) => meiTiAnId.get(meiTiId) ?? null,
  }
}

export function yingSheKuaiChuCan(
  row: Record<string, unknown>,
  shangXiaWen: KuaiShangXiaWen,
  cheHuiWenAn: string,
  mianXiang: KuaiTouYingMianXiang = AI_KUAI_TOU_YING,
): XiaoXiKuaiChuCan[] {
  if (row[mianXiang.cheHuiLie]) {
    return [{ lei_xing: 'wenzi', nei_rong: cheHuiWenAn }]
  }
  const xiaoXiId = String(row.ID ?? '')
  const kuai: XiaoXiKuai[] = shangXiaWen.kuaiOf(xiaoXiId) ?? anHangKuai(row)
  const beiYongLeiBie = leiXingDaoMeiTiLeiBie(String(row.类型 || 'wenben'))
  const benHangMeiTi = (meiTiId: string): KuaiMeiTiXinXi | null => {
    const caiDao = shangXiaWen.meiTiOf(meiTiId)
    if (caiDao) return caiDao
    const benHangSha = row[mianXiang.sha256Lie]
    if (!row.媒体ID || String(row.媒体ID) !== meiTiId || !benHangSha) return null
    return {
      sha256: String(benHangSha).toLowerCase(),
      lei_bie: String(row[mianXiang.leiBieLie] ?? '') || beiYongLeiBie || '',
    }
  }
  return kuai.map((xiang) => {
    if (xiang.lei_xing !== 'tupian') return { ...xiang }
    const meiTiId = xiang.mei_ti_id ?? ''
    const meiTi = benHangMeiTi(meiTiId)
    if (!meiTi) return { ...xiang, mei_ti_url: null, mei_ti_lei_bie: beiYongLeiBie }
    return {
      ...xiang,
      mei_ti_url: shengChengQianMingURL(meiTi.sha256, mianXiang.qianMingZhuTi(row)),
      mei_ti_lei_bie: meiTi.lei_bie || beiYongLeiBie,
    }
  })
}

function yingSheXiaoXi(
  row: Record<string, unknown>,
  shangXiaWen: KuaiShangXiaWen = WU_KUAI_SHANG_XIA_WEN,
): XiaoXiXinXi {
  const faSongZheLeiXing =
    row.发送者 === 'yonghu' ? 'yonghu' : row.发送者 === 'jiaose' ? 'jiaose' : 'xitong'
  const faSongZheId =
    faSongZheLeiXing === 'yonghu'
      ? String(row.用户ID)
      : faSongZheLeiXing === 'jiaose'
        ? String(row.角色ID)
        : ''
  const yiCheHui = Boolean(row.已撤回)
  const cheHuiWenAn = huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
  const meiTiId = row.媒体ID ? String(row.媒体ID) : null
  const neiRong = yiCheHui ? cheHuiWenAn : String(row.内容)

  return {
    id: String(row.ID),
    hui_hua_id: String(row.角色ID),
    fa_song_zhe_id: faSongZheId,
    fa_song_zhe_lei_xing: faSongZheLeiXing,
    ai_biao_shi: faSongZheLeiXing === 'jiaose',
    nei_rong: neiRong,
    lei_xing: String(row.类型 || 'wenben'),
    nei_rong_kuai: yingSheKuaiChuCan(row, shangXiaWen, cheHuiWenAn),
    bei_yong_xiao_xi_id: row.被引用消息ID ? String(row.被引用消息ID) : null,
    shi_jian_chuo: new Date(String(row.创建时间)).getTime(),
    yi_du: Boolean(row.已读),
    yi_che_hui: yiCheHui,
    che_hui_shi_jian: row.撤回时间 ? String(row.撤回时间) : null,
    yuan_shi_nei_rong: row.已撤回 && row.原始内容 ? String(row.原始内容) : null,
    ke_hu_duan_xu_hao: row.客户端序号 != null ? Number(row.客户端序号) : null,
    mi_deng_jian: row.幂等键 ? String(row.幂等键) : null,
    mei_ti_id: meiTiId,
    mei_ti_url: row.媒体SHA256
      ? shengChengQianMingURL(String(row.媒体SHA256).toLowerCase(), String(row.用户ID))
      : null,
    mei_ti_lei_bie: row.媒体类别 ? String(row.媒体类别) : null,
    mei_ti_shi_chang_hao_miao: row.媒体时长毫秒 != null ? Number(row.媒体时长毫秒) : null,
    mei_ti_yuan_shi_wen_jian_ming: row.媒体原始文件名 ? String(row.媒体原始文件名) : null,
  }
}

export interface JiaoSeSuoYouZheXinXi {
  yong_hu_id: string | null
  shi_fou_feng_cun: boolean
  ke_ji_xu_liao_tian: boolean
  jie_ju_zhuang_tai: string
  shi_fou_zha_xing: boolean
}

export async function huoQuJiaoSeSuoYouZhe(
  jiao_se_id: string,
): Promise<JiaoSeSuoYouZheXinXi | null> {
  if (!yanZhengUUID(jiao_se_id)) {
    return null
  }

  const jieGuo = await 数据库.query(
    `SELECT "用户ID", "封存", "可继续聊天", "结局状态", "是否渣型", "性别", "结局文案" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [jiao_se_id],
  )
  if (jieGuo.rows.length === 0) return null
  return {
    yong_hu_id: jieGuo.rows[0].用户ID ? String(jieGuo.rows[0].用户ID) : null,
    shi_fou_feng_cun: Boolean(jieGuo.rows[0].封存),
    ke_ji_xu_liao_tian: Boolean(jieGuo.rows[0].可继续聊天),
    jie_ju_zhuang_tai: 解析结局文案(
      解析结局类型(jieGuo.rows[0].结局状态, Boolean(jieGuo.rows[0].封存)),
      归一角色性别(jieGuo.rows[0].性别),
      jieGuo.rows[0].结局文案 ?? null,
    ),
    shi_fou_zha_xing: Boolean(jieGuo.rows[0].是否渣型),
  }
}

export async function anIdChaXiaoXi(xiao_xi_id: string): Promise<XiaoXiXinXi | null> {
  const jieGuo = await 数据库.query(
    `SELECT m.*, mf."SHA256" AS "媒体SHA256"
     FROM "消息" m LEFT JOIN "媒体文件" mf ON m."媒体ID" = mf."ID"
     WHERE m."ID" = $1 LIMIT 1`,
    [xiao_xi_id],
  )
  if (jieGuo.rows.length === 0) return null
  const shangXiaWen = await gouKuaiShangXiaWen(jieGuo.rows as Record<string, unknown>[])
  return yingSheXiaoXi(jieGuo.rows[0], shangXiaWen)
}

function huoQuZongShuHuanCunJian(yong_hu_id: string, jiao_se_id: string): string {
  return `xiao_xi_zong_shu:${yong_hu_id}:${jiao_se_id}`
}

export function huiHuaXiaoXiSuoJian(yong_hu_id: string, jiao_se_id: string): number {
  return (
    Math.abs(
      [...`${yong_hu_id}:${jiao_se_id}`].reduce((lei, zi) => (lei * 31 + zi.charCodeAt(0)) | 0, 7),
    ) % 2147483647
  )
}

function qingLiMiDengJian(zhi: unknown, yong_hu_id: string): string | null {
  if (zhi == null || zhi === '') return null
  if (typeof zhi !== 'string' || !yanZhengUUID(zhi)) {
    debug日志.warn('消息服务', '幂等键非法，按无幂等键处理', {
      xiang_qing: { yong_hu_id, chang_du: String(zhi).slice(0, 8) },
    })
    return null
  }
  return zhi
}

const ZONG_SHU_HUAN_CUN_MIAO = 60

export interface BeiYinYongJianYan {
  cheng_gong: boolean
  id?: string | null
  ti_shi?: string
  zhuang_tai_ma?: number
}

export interface BeiYinYongMianXiang {
  yuJu: string
  shuYuBenRen(hang: Record<string, unknown>, benRenId: string, duiXiangId: string): boolean
  shiZaiTongYiDuiHua(hang: Record<string, unknown>, benRenId: string, duiXiangId: string): boolean
  quYiCheHui(hang: Record<string, unknown>): boolean
}

export const AI_BEI_YIN_YONG_MIAN_XIANG: BeiYinYongMianXiang = {
  yuJu: `SELECT "用户ID", "角色ID", "已撤回" FROM "消息" WHERE "ID" = $1 LIMIT 1`,
  shuYuBenRen: (hang, benRenId) => String(hang.用户ID) === String(benRenId),
  shiZaiTongYiDuiHua: (hang, _benRenId, duiXiangId) => String(hang.角色ID) === String(duiXiangId),
  quYiCheHui: (hang) => Boolean(hang.已撤回),
}

export const HAO_YOU_BEI_YIN_YONG_MIAN_XIANG: BeiYinYongMianXiang = {
  yuJu: `SELECT "发送者ID", "接收者ID", "撤回" FROM "好友消息" WHERE "ID" = $1 LIMIT 1`,
  shuYuBenRen: (hang, benRenId) =>
    String(hang.发送者ID) === String(benRenId) || String(hang.接收者ID) === String(benRenId),
  shiZaiTongYiDuiHua: (hang, benRenId, duiXiangId) => {
    const fa = String(hang.发送者ID)
    const jie = String(hang.接收者ID)
    return (fa === benRenId && jie === duiXiangId) || (fa === duiXiangId && jie === benRenId)
  },
  quYiCheHui: (hang) => Boolean(hang.撤回),
}

export function shiZiYinYong(
  benXingId: string | null | undefined,
  beiYongId: string | null | undefined,
): boolean {
  if (!benXingId || !beiYongId) return false
  return String(benXingId) === String(beiYongId)
}

export async function yanZhengBeiYinYong(
  zhi: unknown,
  yong_hu_id: string,
  dui_xiang_id: string,
  mianXiang: BeiYinYongMianXiang = AI_BEI_YIN_YONG_MIAN_XIANG,
): Promise<BeiYinYongJianYan> {
  if (zhi == null || zhi === '') return { cheng_gong: true, id: null }
  if (typeof zhi !== 'string' || !yanZhengUUID(zhi)) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'yinYongXiaoXiFeiFa'), zhuang_tai_ma: 400 }
  }
  const jieGuo = await 数据库.query(mianXiang.yuJu, [zhi])
  if (jieGuo.rows.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'yinYongXiaoXiBuCunZai'), zhuang_tai_ma: 400 }
  }
  const xing = jieGuo.rows[0] as Record<string, unknown>
  if (!mianXiang.shuYuBenRen(xing, yong_hu_id, dui_xiang_id)) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'yinYongXiaoXiWuQuanXian'), zhuang_tai_ma: 403 }
  }
  if (!mianXiang.shiZaiTongYiDuiHua(xing, yong_hu_id, dui_xiang_id)) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'yinYongXiaoXiHuiHuaBuFu'), zhuang_tai_ma: 400 }
  }
  if (mianXiang.quYiCheHui(xing)) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'yinYongXiaoXiYiCheHui'), zhuang_tai_ma: 400 }
  }
  return { cheng_gong: true, id: zhi }
}

export async function shiXiaoXiaoXiZongShuHuanCun(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<void> {
  try {
    const { redis } = await import('../redis')
    await redis.del(huoQuZongShuHuanCunJian(yong_hu_id, jiao_se_id))
  } catch (cuoWu) {
    debug日志.error('消息服务', '消息总数缓存失效失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
  }
}

async function huoQuZongShu(yong_hu_id: string, jiao_se_id: string): Promise<number> {
  const huanCunJian = huoQuZongShuHuanCunJian(yong_hu_id, jiao_se_id)
  try {
    const { redis } = await import('../redis')
    const huanCun = await redis.get(huanCunJian)
    if (huanCun !== null) return parseInt(huanCun, 10)
  } catch {
    // 缓存读取失败退回直查
  }
  const zongShuJieGuo = await 数据库.query(
    `SELECT COUNT(*) as zong_shu FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
    [yong_hu_id, jiao_se_id],
  )
  const zongShu = parseInt(String(zongShuJieGuo.rows[0].zong_shu), 10)
  try {
    const { redis } = await import('../redis')
    await redis.setex(huanCunJian, ZONG_SHU_HUAN_CUN_MIAO, String(zongShu))
  } catch {
    // 缓存写入失败不影响主流程
  }
  return zongShu
}

export async function huoQuXiaoXiLieBiao(
  canShu: HuoQuXiaoXiCanShu,
): Promise<{ lie_biao: XiaoXiXinXi[]; zong_shu: number; hai_you_geng_duo?: boolean }> {
  const yeMa = Math.max(1, canShu.ye_ma || 1)
  const meiYeTiaoShu = Math.min(999, Math.max(1, canShu.mei_ye_tiao_shu || 50))

  const shiYongYouBiao =
    canShu.you_biao_shi_jian_chuo != null && !!canShu.you_biao_id

  let rows: Record<string, unknown>[]
  if (shiYongYouBiao) {
    const youBiaoShiJian = new Date(canShu.you_biao_shi_jian_chuo as number)
    const jieGuo = await 数据库.query(
      `SELECT m.*, mf."SHA256" AS "媒体SHA256", mf."类别" AS "媒体类别",
              mf."时长毫秒" AS "媒体时长毫秒", mf."原始文件名" AS "媒体原始文件名"
       FROM "消息" m LEFT JOIN "媒体文件" mf ON m."媒体ID" = mf."ID"
       WHERE m."用户ID" = $1 AND m."角色ID" = $2 AND (
         ($3::bigint IS NOT NULL AND m."客户端序号" IS NULL)
         OR ($3::bigint IS NOT NULL AND m."客户端序号" IS NOT NULL AND (
               m."客户端序号" < $3::bigint
               OR (m."客户端序号" = $3::bigint AND (
                     m."创建时间" < $4::timestamptz
                     OR (m."创建时间" = $4::timestamptz AND m."ID"::text < $5::text)))))
         OR ($3::bigint IS NULL AND m."客户端序号" IS NULL AND (
               m."创建时间" < $4::timestamptz
               OR (m."创建时间" = $4::timestamptz AND m."ID"::text < $5::text)))
       )
       ORDER BY m."客户端序号" DESC NULLS LAST, m."创建时间" DESC, m."ID" DESC
       LIMIT $6`,
      [
        canShu.yong_hu_id,
        canShu.jiao_se_id,
        canShu.you_biao_xu_hao ?? null,
        youBiaoShiJian,
        canShu.you_biao_id,
        meiYeTiaoShu + 1,
      ],
    )
    rows = jieGuo.rows as Record<string, unknown>[]
  } else {
    const pianYi = (yeMa - 1) * meiYeTiaoShu
    const jieGuo = await 数据库.query(
      `SELECT m.*, mf."SHA256" AS "媒体SHA256", mf."类别" AS "媒体类别",
              mf."时长毫秒" AS "媒体时长毫秒", mf."原始文件名" AS "媒体原始文件名"
       FROM "消息" m LEFT JOIN "媒体文件" mf ON m."媒体ID" = mf."ID"
       WHERE m."用户ID" = $1 AND m."角色ID" = $2
       ORDER BY m."客户端序号" DESC NULLS LAST, m."创建时间" DESC, m."ID" DESC
       LIMIT $3 OFFSET $4`,
      [canShu.yong_hu_id, canShu.jiao_se_id, meiYeTiaoShu + 1, pianYi],
    )
    rows = jieGuo.rows as Record<string, unknown>[]
  }

  const haiYouGengDuo = rows.length > meiYeTiaoShu
  const buQuKuai = await gouKuaiShangXiaWen(rows)
  const lieBiao = (haiYouGengDuo ? rows.slice(0, meiYeTiaoShu) : rows).map((hang) =>
    yingSheXiaoXi(hang, buQuKuai),
  )

  if (shiYongYouBiao) {
    const zongShu = await huoQuZongShu(canShu.yong_hu_id, canShu.jiao_se_id)
    return { lie_biao: lieBiao, zong_shu: zongShu, hai_you_geng_duo: haiYouGengDuo }
  }

  const zongShu = await huoQuZongShu(canShu.yong_hu_id, canShu.jiao_se_id)
  return { lie_biao: lieBiao, zong_shu: zongShu, hai_you_geng_duo: haiYouGengDuo }
}

export async function chuangJianYongHuXiaoXi(
  canShu: FaSongXiaoXiCanShu,
): Promise<{ cheng_gong: boolean; xiao_xi?: XiaoXiXinXi; ti_shi?: string; zhuang_tai_ma?: number }> {
  const kuaiXieRu = await qingLiXiaoXiKuaiXieRu(
    canShu.nei_rong_kuai,
    canShu.yong_hu_id,
    '用户消息发送',
  )
  if (!kuaiXieRu.cheng_gong) {
    return { cheng_gong: false, ti_shi: kuaiXieRu.ti_shi, zhuang_tai_ma: kuaiXieRu.zhuang_tai_ma ?? 400 }
  }
  const luoKuKuai = kuaiXieRu.kuai
  const jianYing = kuaiXieRu.jianYing

  const leiXing = jianYing ? jianYing.lei_xing : canShu.lei_xing ?? 'wenben'
  if (!YUN_XU_XIAO_XI_LEI_XING.includes(leiXing)) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'xiaoXiLeiXingFeiFa'), zhuang_tai_ma: 400 }
  }
  const shiMeiTi = leiXing !== 'wenben'
  const meiTiId = jianYing ? jianYing.mei_ti_id : canShu.mei_ti_id ?? null

  if (shiMeiTi && !meiTiId) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'meiTiBiXuXianChuanShu'), zhuang_tai_ma: 400 }
  }

  const yuanMeiTiWenBen = shiMeiTi && typeof canShu.nei_rong === 'string' ? canShu.nei_rong.trim().slice(0, 500) : ''
  const qingLiNeiRong = jianYing
    ? jianYing.nei_rong
    : shiMeiTi
      ? yuanMeiTiWenBen
      : canShu.nei_rong.trim()
  if (!shiMeiTi && !qingLiNeiRong) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'xiaoXiNeiRongWeiKong'), zhuang_tai_ma: 400 }
  }
  if (!shiMeiTi && !jianYing && qingLiNeiRong.length > 500) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'), zhuang_tai_ma: 400 }
  }

  const jiaoSe = await huoQuJiaoSeSuoYouZhe(canShu.jiao_se_id)
  if (!jiaoSe) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'jiaoSeBuCunZai'), zhuang_tai_ma: 404 }
  }
  if (jiaoSe.yong_hu_id !== canShu.yong_hu_id) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'wuQuanXian'), zhuang_tai_ma: 403 }
  }

  if (jiaoSe.shi_fou_feng_cun && !jiaoSe.ke_ji_xu_liao_tian) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'youXiYiJieShu'), zhuang_tai_ma: 400 }
  }

  if (shiMeiTi) {
    const meiTiChaXun = await 数据库.query(
      `SELECT "上传者ID" FROM "媒体文件" WHERE "ID" = $1 LIMIT 1`,
      [meiTiId],
    )
    if (meiTiChaXun.rows.length === 0) {
      return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'meiTiBuCunZai'), zhuang_tai_ma: 400 }
    }
    if (String(meiTiChaXun.rows[0].上传者ID) !== canShu.yong_hu_id) {
      return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'meiTiWuQuanXian'), zhuang_tai_ma: 400 }
    }
  }

  const beiYong = await yanZhengBeiYinYong(
    canShu.bei_yong_xiao_xi_id,
    canShu.yong_hu_id,
    canShu.jiao_se_id,
  )
  if (!beiYong.cheng_gong) {
    return { cheng_gong: false, ti_shi: beiYong.ti_shi, zhuang_tai_ma: beiYong.zhuang_tai_ma }
  }
  const beiYongXiaoXiId = beiYong.id ?? null

  const miDengJian = qingLiMiDengJian(canShu.mi_deng_jian, canShu.yong_hu_id)
  const ZUI_DA_CHONG_SHI_CI_SHU = 10
  let luo_ku_id: string | null = null
  let cuoWu: unknown = null

  for (let ciShu = 0; ciShu <= ZUI_DA_CHONG_SHI_CI_SHU; ciShu++) {
    const keHuDuan = await 数据库.connect()
    try {
      await keHuDuan.query('BEGIN')
      await keHuDuan.query('SELECT pg_advisory_xact_lock($1)', [
        huiHuaXiaoXiSuoJian(canShu.yong_hu_id, canShu.jiao_se_id),
      ])
      const xuHaoJieGuo = await keHuDuan.query(
        `SELECT COALESCE(MAX("客户端序号"), 0) as zui_da FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [canShu.yong_hu_id, canShu.jiao_se_id],
      )
      const benTiaoXuHao = Number(xuHaoJieGuo.rows[0]?.zui_da ?? 0) + 1
      const chaRu = await keHuDuan.query(
        `INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读", "客户端序号", "媒体ID", "幂等键", "内容块", "被引用消息ID")
         VALUES ($1, $2, $3, 'yonghu', $4, true, $5, $6, $7, $8::jsonb, $9)
         ON CONFLICT ("用户ID", "角色ID", "幂等键") DO NOTHING
         RETURNING "ID"`,
        [
          canShu.yong_hu_id,
          canShu.jiao_se_id,
          qingLiNeiRong,
          leiXing,
          benTiaoXuHao,
          meiTiId,
          miDengJian,
          luoKuKuai ? JSON.stringify(luoKuKuai) : null,
          beiYongXiaoXiId,
        ],
      )
      if (chaRu.rows.length === 0) {
        const yiCunZai = await keHuDuan.query(
          `SELECT "ID" FROM "消息"
           WHERE "用户ID" = $1 AND "角色ID" = $2 AND "幂等键" = $3 AND "发送者" = 'yonghu' LIMIT 1`,
          [canShu.yong_hu_id, canShu.jiao_se_id, miDengJian],
        )
        await keHuDuan.query('COMMIT')
        keHuDuan.release()
        const mingZhong = yiCunZai.rows[0]
        if (!mingZhong) {
          debug日志.warn('消息服务', '幂等冲突但回查无用户消息行', {
            xiang_qing: { yong_hu_id: canShu.yong_hu_id, jiao_se_id: canShu.jiao_se_id },
          })
          return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'faSongShiBai'), zhuang_tai_ma: 500 }
        }
        debug日志.warn('消息服务', '用户消息重复提交，按幂等键返回原行', {
          xiang_qing: { yong_hu_id: canShu.yong_hu_id, jiao_se_id: canShu.jiao_se_id, xiao_xi_id: String(mingZhong.ID) },
        })
        if (beiYongXiaoXiId && shiZiYinYong(mingZhong.ID, beiYongXiaoXiId)) {
          return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'yinYongXiaoXiFeiFa'), zhuang_tai_ma: 400 }
        }
        luo_ku_id = String(mingZhong.ID)
        break
      }
      await keHuDuan.query('COMMIT')
      keHuDuan.release()
      luo_ku_id = String(chaRu.rows[0].ID)
      break
    } catch (yiChang) {
      cuoWu = yiChang
      try {
        await keHuDuan.query('ROLLBACK')
      } catch {
        // 忽略回滚失败
      }
      keHuDuan.release()
      const pgCuoWu = yiChang as { code?: string; constraint?: string }
      if (
        pgCuoWu.code === '23505' &&
        pgCuoWu.constraint?.includes('客户端序号') &&
        ciShu < ZUI_DA_CHONG_SHI_CI_SHU
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50 * Math.pow(2, ciShu)))
        continue
      }
      break
    }
  }

  if (luo_ku_id === null) {
    const { faSongGaoJing } = await import('../utils/邮件告警')
    await faSongGaoJing(
      'xiao_xi_luo_ku_shi_bai',
      '消息落库失败告警',
      `用户消息落库失败：${String(cuoWu).slice(0, 300)}`,
    ).catch(() => undefined)
    if (cuoWu) throw cuoWu
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'faSongShiBai'), zhuang_tai_ma: 500 }
  }

  const jieGuo = await 数据库.query(
    `SELECT m.*, mf."SHA256" AS "媒体SHA256"
     FROM "消息" m LEFT JOIN "媒体文件" mf ON m."媒体ID" = mf."ID"
     WHERE m."ID" = $1 LIMIT 1`,
    [luo_ku_id],
  )
  if (jieGuo.rows.length === 0) {
    debug日志.error('消息服务', '用户消息已落库但回查为空', {
      xiang_qing: { yong_hu_id: canShu.yong_hu_id, jiao_se_id: canShu.jiao_se_id, xiao_xi_id: luo_ku_id },
    })
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'faSongShiBai'), zhuang_tai_ma: 500 }
  }

  const xiaoXi = yingSheXiaoXi(
    jieGuo.rows[0],
    await gouKuaiShangXiaWen(jieGuo.rows as Record<string, unknown>[]),
  )
  await shiXiaoXiaoXiZongShuHuanCun(canShu.yong_hu_id, canShu.jiao_se_id)
  jiLuXiaoXiCaoZuo('用户消息发送', canShu.yong_hu_id, canShu.jiao_se_id, 'yonghu', { xiao_xi_id: xiaoXi.id })
  return { cheng_gong: true, xiao_xi: xiaoXi }
}

function jiLuCheHuiCaoZuo(
  caoZuo: string,
  yong_hu_id: string,
  jiao_se_id: string,
  xiao_xi_id: string,
): void {
  jiLuXiaoXiCaoZuo(caoZuo, yong_hu_id, jiao_se_id, 'yonghu', { xiao_xi_id })
}

export async function cheHuiYongHuXiaoXi(
  canShu: CheHuiXiaoXiCanShu,
): Promise<{ cheng_gong: boolean; xiao_xi?: XiaoXiXinXi; ti_shi?: string; zhuang_tai_ma?: number }> {
  const jiaoSe = await huoQuJiaoSeSuoYouZhe(canShu.jiao_se_id)
  if (!jiaoSe) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'jiaoSeBuCunZai'), zhuang_tai_ma: 404 }
  }
  if (jiaoSe.yong_hu_id !== canShu.yong_hu_id) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'wuQuanXian'), zhuang_tai_ma: 403 }
  }

  const xiaoXiJieGuo = await 数据库.query(
    `SELECT * FROM "消息" WHERE "ID" = $1 AND "用户ID" = $2 AND "角色ID" = $3 AND "发送者" = 'yonghu' LIMIT 1`,
    [canShu.xiao_xi_id, canShu.yong_hu_id, canShu.jiao_se_id],
  )
  if (xiaoXiJieGuo.rows.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai'), zhuang_tai_ma: 404 }
  }

  const xiaoXi = xiaoXiJieGuo.rows[0]
  const chuangJianShiJian = new Date(String(xiaoXi.创建时间)).getTime()
  if (Date.now() - chuangJianShiJian > XIAO_XI_PEI_ZHI.cheHuiShiXian) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'cheHuiShiBai'), zhuang_tai_ma: 400 }
  }
  if (xiaoXi.已撤回) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'cheHuiShiBai'), zhuang_tai_ma: 400 }
  }

  const gengXinJieGuo = await 数据库.query(
    `WITH upd AS (
       UPDATE "消息" SET "已撤回" = true, "撤回时间" = NOW(), "原始内容" = "内容"
       WHERE "ID" = $1
       RETURNING *
     )
     SELECT upd.*, mf."SHA256" AS "媒体SHA256"
     FROM upd LEFT JOIN "媒体文件" mf ON upd."媒体ID" = mf."ID"`,
    [canShu.xiao_xi_id],
  )

  tuiSongCheHuiShiJian(canShu.yong_hu_id, canShu.jiao_se_id, canShu.xiao_xi_id, 'yonghu')
  jiLuCheHuiCaoZuo('用户消息撤回', canShu.yong_hu_id, canShu.jiao_se_id, canShu.xiao_xi_id)

  return { cheng_gong: true, xiao_xi: yingSheXiaoXi(gengXinJieGuo.rows[0]) }
}

export async function cheHuiJiaoSeXiaoXi(
  canShu: CheHuiJiaoSeXiaoXiCanShu,
): Promise<{ cheng_gong: boolean; xiao_xi?: XiaoXiXinXi; ti_shi?: string; zhuang_tai_ma?: number }> {
  const xiaoXiJieGuo = await 数据库.query(
    `SELECT * FROM "消息"
     WHERE "用户ID" = $1 AND "角色ID" = $2 AND "发送者" = 'jiaose' AND "已撤回" = false
     ORDER BY "客户端序号" DESC NULLS LAST, "创建时间" DESC
     LIMIT 1`,
    [canShu.yong_hu_id, canShu.jiao_se_id],
  )
  if (xiaoXiJieGuo.rows.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai') }
  }

  const xiaoXi = xiaoXiJieGuo.rows[0]
  const chuangJianShiJian = new Date(String(xiaoXi.创建时间)).getTime()
  if (Date.now() - chuangJianShiJian > XIAO_XI_PEI_ZHI.cheHuiShiXian) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'cheHuiShiBai') }
  }

  const gengXinJieGuo = await 数据库.query(
    `WITH upd AS (
       UPDATE "消息" SET "已撤回" = true, "撤回时间" = NOW(), "原始内容" = "内容"
       WHERE "ID" = $1
       RETURNING *
     )
     SELECT upd.*, mf."SHA256" AS "媒体SHA256"
     FROM upd LEFT JOIN "媒体文件" mf ON upd."媒体ID" = mf."ID"`,
    [xiaoXi.ID],
  )

  const cheHuiXiaoXi = yingSheXiaoXi(gengXinJieGuo.rows[0])
  tuiSongCheHuiShiJian(canShu.yong_hu_id, canShu.jiao_se_id, cheHuiXiaoXi.id, 'jiaose')
  jiLuXiaoXiCaoZuo('角色消息撤回', canShu.yong_hu_id, canShu.jiao_se_id, 'jiaose', { xiao_xi_id: cheHuiXiaoXi.id })

  return { cheng_gong: true, xiao_xi: cheHuiXiaoXi }
}

export async function biaoJiSuoYouWeiDu(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<void> {
  await 数据库.query(
    `UPDATE "消息" SET "已读" = true WHERE "用户ID" = $1 AND "角色ID" = $2 AND "已读" = false`,
    [yong_hu_id, jiao_se_id],
  )
}

export interface BaoCunJiaoSeMeiTiCanShu {
  yong_hu_id: string
  jiao_se_id: string
  nei_rong: string
  lei_xing: string
  mei_ti_id: string
}

export async function baoCunJiaoSeMeiTiXiaoXi(
  canShu: BaoCunJiaoSeMeiTiCanShu,
): Promise<XiaoXiXinXi> {
  const qingLiNeiRong = (canShu.nei_rong || '').trim().slice(0, 500)
  let jieGuo
  try {
    jieGuo = await 数据库.query(
      `WITH xin AS (
         INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读", "媒体ID")
         VALUES ($1, $2, $3, 'jiaose', $4, true, $5)
         ON CONFLICT DO NOTHING
         RETURNING *
       )
       SELECT xin.*, mf."SHA256" AS "媒体SHA256"
       FROM xin LEFT JOIN "媒体文件" mf ON xin."媒体ID" = mf."ID"`,
      [canShu.yong_hu_id, canShu.jiao_se_id, qingLiNeiRong, canShu.lei_xing, canShu.mei_ti_id],
    )
  } catch (cuoWu) {
    const { faSongGaoJing } = await import('../utils/邮件告警')
    await faSongGaoJing('xiao_xi_luo_ku_shi_bai', '消息落库失败告警', `角色多媒体消息落库失败：${String(cuoWu).slice(0, 300)}`).catch(() => undefined)
    throw cuoWu
  }
  if (jieGuo.rows.length === 0) {
    const { faSongGaoJing } = await import('../utils/邮件告警')
    await faSongGaoJing('xiao_xi_luo_ku_shi_bai', '消息落库失败告警', '角色多媒体消息落库返回空行').catch(() => undefined)
    throw new Error('角色多媒体消息落库返回空行')
  }
  const xiaoXi = yingSheXiaoXi(jieGuo.rows[0])
  await shiXiaoXiaoXiZongShuHuanCun(canShu.yong_hu_id, canShu.jiao_se_id)
  jiLuXiaoXiCaoZuo('角色多媒体消息发送', canShu.yong_hu_id, canShu.jiao_se_id, 'jiaose', { xiao_xi_id: xiaoXi.id })
  return xiaoXi
}

