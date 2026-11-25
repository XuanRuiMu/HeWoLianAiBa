import type { PoolClient, QueryResult } from 'pg'
import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { XiaoXiPeiZhi, huoQuCheHuiShiXianHaoMiao } from '../config/消息配置'
import { 表情书类别, 类别到消息类型, YunXuXiaoXiLeiXing } from '../config/媒体配置'
import { 表情短名最大长 } from '../config/表情包配置'
import { huoQuIo } from '../socket/io'
import { yanZhengUUID } from '../utils/验证'
import { huoQuJiaoSeBianHao } from './公开编号'
import { 解析结局类型, 解析结局文案 } from '../utils/结局'
import { 归一角色性别 } from '../utils/性别'
import { debug日志, jiLuXiaoXiCaoZuo, jiLuSocketShiJian } from '../utils/debug日志'
import { shengChengQianMingURL } from './媒体存储'
import { 按短名查, 短名转UUID } from './表情包库'
import {
  消息块LeiXing,
  diuQiDaoCuoWuJian,
  fanGouKuai,
  jiLuKuaiDiuQi,
  leiXingDaoMeiTiLeiBie,
  paiShengJianRong,
  qingLiLuoKuKuai,
  qingLiTiJiaoKuai,
  yingYongMeiTiPanDing,
  type 兼容剪映,
  type 消息块,
} from './消息内容块'

const 表情消息类型 = 类别到消息类型[表情书类别]

const 贴纸短名正则 = /^\s*\[贴纸[:：]\s*([^\]】]+?)\s*\]\s*$/

export interface 消息块ChuCan extends 消息块 {
  mei_ti_url?: string | null
  mei_ti_lei_bie?: string | null
  duan_ming?: string | null
}

interface 块媒体信息 {
  sha256: string
  lei_bie: string
}

export interface 消息信息 {
  id: string
  hui_hua_id: string
  fa_song_zhe_id: string
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose' | 'xitong'
  ai_biao_shi: boolean
  nei_rong: string
  lei_xing: string
  nei_rong_kuai?: 消息块ChuCan[]
  bei_yong_xiao_xi_id?: string | null
  shi_jian_chuo: number
  yi_du: boolean
  yi_che_hui?: boolean
  che_hui_shi_jian?: string | null
  neiRongYuanWen?: string | null
  ke_hu_duan_xu_hao?: number | null
  mi_deng_jian?: string | null
  mei_ti_id?: string | null
  mei_ti_url?: string | null
  mei_ti_lei_bie?: string | null
  mei_ti_shi_chang_hao_miao?: number | null
  mei_ti_yuan_shi_wen_jian_ming?: string | null
}

export interface 发消息参数 {
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

export interface 取消息参数 {
  yong_hu_id: string
  jiao_se_id: string
  ye_ma?: number
  mei_ye_tiao_shu?: number
  you_biao_xu_hao?: number | null
  you_biao_shi_jian_chuo?: number | null
  you_biao_id?: string | null
}

export interface 撤回消息参数 {
  yong_hu_id: string
  jiao_se_id: string
  xiao_xi_id: string
}

export interface 撤回角色消息参数 {
  yong_hu_id: string
  jiao_se_id: string
}

export interface 重新编辑原文参数 {
  yong_hu_id: string
  jiao_se_id: string
  xiao_xi_id: string
}

function 推送撤回事件(
  yong_hu_id: string,
  jiao_se_id: string,
  xiao_xi_id: string,
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose',
  dui_wai_hui_hua_id: string,
): void {
  const io = huoQuIo()
  if (io) {
    io.to(yong_hu_id).emit('消息撤回', {
      hui_hua_id: dui_wai_hui_hua_id,
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

export interface 块上下文 {
  kuaiOf(xiaoXiId: string): 消息块[] | null
  meiTiOf(meiTiId: string): 块媒体信息 | null
  biaoQingShaOf?(duanMing: string): string | null
}

function 取块数组(zhi: unknown): Record<string, unknown>[] {
  if (!Array.isArray(zhi)) return []
  const jieGuo: Record<string, unknown>[] = []
  for (const yuan of zhi) {
    if (typeof yuan !== 'object' || yuan === null || Array.isArray(yuan)) continue
    jieGuo.push(yuan as Record<string, unknown>)
  }
  return jieGuo
}

function 取贴纸短名(xiang: Record<string, unknown>): string | null {
  if (xiang.lei_xing !== 消息块LeiXing.tuPian) return null
  const meiTiId = typeof xiang.mei_ti_id === 'string' ? xiang.mei_ti_id.trim() : ''
  if (meiTiId !== '') return null
  const duanMing = typeof xiang.duan_ming === 'string' ? xiang.duan_ming.trim() : ''
  if (duanMing === '' || duanMing.length > 表情短名最大长) return null
  return duanMing
}

function 解析贴纸短名(zhi: unknown): string | null {
  if (typeof zhi !== 'string') return null
  const piPei = 贴纸短名正则.exec(zhi)
  if (!piPei) return null
  const duanMing = piPei[1].trim()
  if (duanMing === '' || duanMing.length > 表情短名最大长) return null
  return duanMing
}

function shouJiTieZhiDuanMing(row: Record<string, unknown>): Set<string> {
  const jieGuo = new Set<string>()
  for (const xiang of 取块数组(row.内容块)) {
    const duanMing = 取贴纸短名(xiang)
    if (duanMing) jieGuo.add(duanMing)
  }
  return jieGuo
}

function 映射贴纸块(
  duanMing: string,
  shangXiaWen: 块上下文,
  zhuTi: string,
): 消息块ChuCan {
  const sha256 = shangXiaWen.biaoQingShaOf?.(duanMing) ?? null
  return {
    lei_xing: 消息块LeiXing.tuPian,
    duan_ming: duanMing,
    mei_ti_id: 短名转UUID(duanMing),
    mei_ti_url: sha256 ? shengChengQianMingURL(sha256, zhuTi) : null,
    mei_ti_lei_bie: 表情书类别,
  }
}

export interface 块头像面向 {
  cheHuiLie: string
  sha256Lie: string
  leiBieLie: string
  qianMingZhuTi(hang: Record<string, unknown>): string
}

const AI块头像: 块头像面向 = {
  cheHuiLie: '已撤回',
  sha256Lie: '媒体SHA256',
  leiBieLie: '媒体类别',
  qianMingZhuTi: (hang) => String(hang.用户ID),
}

export function 好友块头像(duZheId: string): 块头像面向 {
  return {
    cheHuiLie: '撤回',
    sha256Lie: 'SHA256',
    leiBieLie: '类别',
    qianMingZhuTi: () => duZheId,
  }
}

const Wu块上下文: 块上下文 = {
  kuaiOf: () => null,
  meiTiOf: () => null,
}

async function 查块媒体归属(
  meiTiIds: string[],
  用户ID: string,
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
      suo_shu: String(hang.上传者ID) === 用户ID,
    })
  }
  return jieGuo
}

export interface 块写入结果 {
  cheng_gong: boolean
  kuai: 消息块[] | null
  jianYing: 兼容剪映 | null
  ti_shi?: string
  zhuang_tai_ma?: number
}

export async function qingLi消息块XieRu(
  zhi: unknown,
  用户ID: string,
  changDing: string,
): Promise<块写入结果> {
  const tiJiao = qingLiTiJiaoKuai(zhi, changDing)
  if (tiJiao.chaoXian) {
    jiLuKuaiDiuQi(tiJiao.diuQi, `${changDing}·长度超限`, 用户ID)
    return {
      cheng_gong: false,
      kuai: null,
      jianYing: null,
      ti_shi: huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'),
      zhuang_tai_ma: 400,
    }
  }
  if (tiJiao.kuai === null) {
    jiLuKuaiDiuQi(tiJiao.diuQi, changDing, 用户ID)
    return { cheng_gong: true, kuai: null, jianYing: null }
  }
  const meiTiXinXi = await 查块媒体归属(tiJiao.daiPanDingMeiTiId, 用户ID)
  const panDing = yingYongMeiTiPanDing(tiJiao.kuai, meiTiXinXi)
  const quanBuDiuQi = [...tiJiao.diuQi, ...panDing.diuQi]
  jiLuKuaiDiuQi(quanBuDiuQi, changDing, 用户ID)
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

function anHangKuai(row: Record<string, unknown>): 消息块[] {
  return (
    qingLiLuoKuKuai(row.内容块, String(row.ID ?? '')) ??
    fanGouKuai({
      nei_rong: String(row.内容 ?? ''),
      lei_xing: String(row.类型 || 'wenben'),
      mei_ti_id: row.媒体ID ? String(row.媒体ID) : null,
    })
  )
}

export async function gou块上下文(
  rows: Record<string, unknown>[],
  mianXiang: 块头像面向 = AI块头像,
): Promise<块上下文> {
  const kuaiAnId = new Map<string, 消息块[]>()
  const meiTiIds = new Set<string>()
  const duanMingJi = new Set<string>()
  for (const row of rows) {
    if (row[mianXiang.cheHuiLie]) continue
    const tieZhiMing = shouJiTieZhiDuanMing(row)
    if (tieZhiMing.size > 0) {
      for (const duanMing of tieZhiMing) duanMingJi.add(duanMing)
      for (const xiang of 取块数组(row.内容块)) {
        if (xiang.lei_xing !== 消息块LeiXing.tuPian) continue
        const meiTiId = typeof xiang.mei_ti_id === 'string' ? xiang.mei_ti_id.trim() : ''
        if (meiTiId !== '' && yanZhengUUID(meiTiId)) meiTiIds.add(meiTiId)
      }
      continue
    }
    const xiaoXiId = String(row.ID ?? '')
    const kuai = anHangKuai(row)
    kuaiAnId.set(xiaoXiId, kuai)
    for (const xiang of kuai) {
      if (xiang.lei_xing === 'tupian' && xiang.mei_ti_id) meiTiIds.add(xiang.mei_ti_id)
    }
  }
  const meiTiAnId = new Map<string, 块媒体信息>()
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
  const biaoQingAnDuanMing = new Map<string, string>()
  if (duanMingJi.size > 0) {
    const mingLie = [...duanMingJi]
    const tiaoMuLie = await Promise.all(mingLie.map((duanMing) => 按短名查(duanMing)))
    mingLie.forEach((duanMing, wei) => {
      const tiaoMu = tiaoMuLie[wei]
      if (tiaoMu) biaoQingAnDuanMing.set(duanMing, tiaoMu.sha256.toLowerCase())
    })
  }
  return {
    kuaiOf: (xiaoXiId) => kuaiAnId.get(xiaoXiId) ?? null,
    meiTiOf: (meiTiId) => meiTiAnId.get(meiTiId) ?? null,
    biaoQingShaOf: (duanMing) => biaoQingAnDuanMing.get(duanMing.trim()) ?? null,
  }
}

function 映射单块(
  xiang: 消息块,
  beiYongLeiBie: string | null,
  zhuTi: string,
  benHangMeiTi: (meiTiId: string) => 块媒体信息 | null,
): 消息块ChuCan {
  if (xiang.lei_xing !== 消息块LeiXing.tuPian) return { ...xiang }
  const meiTi = benHangMeiTi(xiang.mei_ti_id ?? '')
  if (!meiTi) return { ...xiang, mei_ti_url: null, mei_ti_lei_bie: beiYongLeiBie }
  return {
    ...xiang,
    mei_ti_url: shengChengQianMingURL(meiTi.sha256, zhuTi),
    mei_ti_lei_bie: meiTi.lei_bie || beiYongLeiBie,
  }
}

function 映射原始块(
  xiang: Record<string, unknown>,
  shangXiaWen: 块上下文,
  zhuTi: string,
  beiYongLeiBie: string | null,
  benHangMeiTi: (meiTiId: string) => 块媒体信息 | null,
): 消息块ChuCan | null {
  const duanMing = 取贴纸短名(xiang)
  if (duanMing) return 映射贴纸块(duanMing, shangXiaWen, zhuTi)
  if (xiang.lei_xing === 消息块LeiXing.wenZi) {
    return {
      lei_xing: 消息块LeiXing.wenZi,
      nei_rong: typeof xiang.nei_rong === 'string' ? xiang.nei_rong : '',
    }
  }
  const meiTiId = typeof xiang.mei_ti_id === 'string' ? xiang.mei_ti_id.trim() : ''
  if (meiTiId === '' || !yanZhengUUID(meiTiId)) return null
  return 映射单块(
    { lei_xing: 消息块LeiXing.tuPian, mei_ti_id: meiTiId },
    beiYongLeiBie,
    zhuTi,
    benHangMeiTi,
  )
}

export function 映射块出参(
  row: Record<string, unknown>,
  shangXiaWen: 块上下文,
  cheHuiWenAn: string,
  mianXiang: 块头像面向 = AI块头像,
): 消息块ChuCan[] {
  if (row[mianXiang.cheHuiLie]) {
    return [{ lei_xing: 'wenzi', nei_rong: cheHuiWenAn }]
  }
  const xiaoXiId = String(row.ID ?? '')
  const beiYongLeiBie = leiXingDaoMeiTiLeiBie(String(row.类型 || 'wenben'))
  const benHangMeiTi = (meiTiId: string): 块媒体信息 | null => {
    const caiDao = shangXiaWen.meiTiOf(meiTiId)
    if (caiDao) return caiDao
    const benHangSha = row[mianXiang.sha256Lie]
    if (!row.媒体ID || String(row.媒体ID) !== meiTiId || !benHangSha) return null
    return {
      sha256: String(benHangSha).toLowerCase(),
      lei_bie: String(row[mianXiang.leiBieLie] ?? '') || beiYongLeiBie || '',
    }
  }
  const zhuTi = String(mianXiang.qianMingZhuTi(row))
  const yuanKuai = 取块数组(row.内容块)
  if (yuanKuai.some((xiang) => 取贴纸短名(xiang) !== null)) {
    const jieGuo: 消息块ChuCan[] = []
    for (const xiang of yuanKuai) {
      const chuCan = 映射原始块(xiang, shangXiaWen, zhuTi, beiYongLeiBie, benHangMeiTi)
      if (chuCan) jieGuo.push(chuCan)
    }
    return jieGuo
  }
  const kuai: 消息块[] = shangXiaWen.kuaiOf(xiaoXiId) ?? anHangKuai(row)
  return kuai.map((xiang) => 映射单块(xiang, beiYongLeiBie, zhuTi, benHangMeiTi))
}

async function 查贴纸哈希(row: Record<string, unknown>): Promise<string | null> {
  const duanMing = 解析贴纸短名(row.内容)
  if (duanMing === null) return null
  const tiaoMu = await 按短名查(duanMing)
  if (!tiaoMu) {
    debug日志.warn('消息服务', '贴纸短名未命中表情包库，按无媒体出参', {
      xiang_qing: { xiao_xi_id: String(row.ID ?? ''), duan_ming: duanMing },
    })
    return null
  }
  return tiaoMu.sha256.toLowerCase()
}

async function 映射消息(
  row: Record<string, unknown>,
  shangXiaWen: 块上下文 = Wu块上下文,
): Promise<消息信息> {
  const faSongZheLeiXing =
    row.发送者 === 'yonghu' ? 'yonghu' : row.发送者 === 'jiaose' ? 'jiaose' : 'xitong'
  const faSongZheId =
    faSongZheLeiXing === 'yonghu'
      ? String(row.用户ID)
      : faSongZheLeiXing === 'jiaose'
        ? String(row.角色ID)
        : ''
  const yiCheHui = Boolean(row.已撤回)
  const cheHuiWenAn =
    faSongZheLeiXing === 'yonghu'
      ? huoQuFanYi('liaoTian', 'ninCheHuiLeYiTiaoXiaoXi')
      : huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
  const meiTiId = row.媒体ID ? String(row.媒体ID) : null
  const yuanShiNeiRong = yiCheHui && row.原始内容 ? String(row.原始内容) : null
  const neiRong = yiCheHui ? cheHuiWenAn : String(row.内容)
  const leiXing = String(row.类型 || 'wenben')
  const meiTiSha256 = row.媒体SHA256 ? String(row.媒体SHA256).toLowerCase() : ''
  const tieZhiSha256 =
    meiTiSha256 === '' && leiXing === 表情消息类型 ? await 查贴纸哈希(row) : null
  const qianMingSha256 = meiTiSha256 !== '' ? meiTiSha256 : tieZhiSha256

  return {
    id: String(row.ID),
    hui_hua_id: String(row.角色ID),
    fa_song_zhe_id: faSongZheId,
    fa_song_zhe_lei_xing: faSongZheLeiXing,
    ai_biao_shi: faSongZheLeiXing === 'jiaose',
    nei_rong: neiRong,
    lei_xing: leiXing,
    nei_rong_kuai: 映射块出参(row, shangXiaWen, cheHuiWenAn),
    bei_yong_xiao_xi_id: row.被引用消息ID ? String(row.被引用消息ID) : null,
    shi_jian_chuo: new Date(String(row.创建时间)).getTime(),
    yi_du: Boolean(row.已读),
    yi_che_hui: yiCheHui,
    che_hui_shi_jian: row.撤回时间 ? String(row.撤回时间) : null,
    neiRongYuanWen: yuanShiNeiRong,
    ke_hu_duan_xu_hao: row.客户端序号 != null ? Number(row.客户端序号) : null,
    mi_deng_jian: row.幂等键 ? String(row.幂等键) : null,
    mei_ti_id: meiTiId,
    mei_ti_url: qianMingSha256
      ? shengChengQianMingURL(qianMingSha256, String(row.用户ID))
      : null,
    mei_ti_lei_bie: row.媒体类别
      ? String(row.媒体类别)
      : leiXing === 表情消息类型
        ? 表情书类别
        : null,
    mei_ti_shi_chang_hao_miao: row.媒体时长毫秒 != null ? Number(row.媒体时长毫秒) : null,
    mei_ti_yuan_shi_wen_jian_ming: row.媒体原始文件名 ? String(row.媒体原始文件名) : null,
  }
}

export interface 角色所有者信息 {
  yong_hu_id: string | null
  shi_fou_feng_cun: boolean
  ke_ji_xu_liao_tian: boolean
  jie_ju_zhuang_tai: string
  shi_fou_zha_xing: boolean
}

export async function 取角色所有者(
  jiao_se_id: string,
): Promise<角色所有者信息 | null> {
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

export async function 按ID查消息(xiao_xi_id: string): Promise<消息信息 | null> {
  const jieGuo = await 数据库.query(
    `SELECT m.*, mf."SHA256" AS "媒体SHA256", mf."时长毫秒" AS "媒体时长毫秒"
     FROM "消息" m LEFT JOIN "媒体文件" mf ON m."媒体ID" = mf."ID"
     WHERE m."ID" = $1 LIMIT 1`,
    [xiao_xi_id],
  )
  if (jieGuo.rows.length === 0) return null
  const shangXiaWen = await gou块上下文(jieGuo.rows as Record<string, unknown>[])
  return await 映射消息(jieGuo.rows[0], shangXiaWen)
}

function huoQuZongShuHuanCunJian(yong_hu_id: string, jiao_se_id: string): string {
  return `xiao_xi_zong_shu:${yong_hu_id}:${jiao_se_id}`
}

export function 会话消息所辖(yong_hu_id: string, jiao_se_id: string): number {
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

const ZongShuHuanCunMiao = 60

async function suoDingHuiHua(
  keHuDuan: PoolClient,
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<void> {
  await keHuDuan.query('SELECT pg_advisory_xact_lock($1)', [
    会话消息所辖(yong_hu_id, jiao_se_id),
  ])
}

async function huoQuXiaYiKeHuDuanXuHao(
  keHuDuan: PoolClient,
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<number> {
  const xuHaoJieGuo = await keHuDuan.query(
    `SELECT COALESCE(MAX("客户端序号"), 0) as zui_da FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
    [yong_hu_id, jiao_se_id],
  )
  return Number(xuHaoJieGuo.rows[0]?.zui_da ?? 0) + 1
}

export interface 被引用检验 {
  cheng_gong: boolean
  id?: string | null
  ti_shi?: string
  zhuang_tai_ma?: number
}

export interface 被引用面向 {
  yuJu: string
  shuYuBenRen(hang: Record<string, unknown>, benRenId: string, duiXiangId: string): boolean
  shiZaiTongYiDuiHua(hang: Record<string, unknown>, benRenId: string, duiXiangId: string): boolean
  quYiCheHui(hang: Record<string, unknown>): boolean
}

export const Ai被引用面向: 被引用面向 = {
  yuJu: `SELECT "用户ID", "角色ID", "已撤回" FROM "消息" WHERE "ID" = $1 LIMIT 1`,
  shuYuBenRen: (hang, benRenId) => String(hang.用户ID) === String(benRenId),
  shiZaiTongYiDuiHua: (hang, _benRenId, duiXiangId) => String(hang.角色ID) === String(duiXiangId),
  quYiCheHui: (hang) => Boolean(hang.已撤回),
}

export const HaoYou被引用面向: 被引用面向 = {
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

export function 是自引用(
  benXingId: string | null | undefined,
  beiYongId: string | null | undefined,
): boolean {
  if (!benXingId || !beiYongId) return false
  return String(benXingId) === String(beiYongId)
}

export async function 校验被引用(
  zhi: unknown,
  yong_hu_id: string,
  dui_xiang_id: string,
  mianXiang: 被引用面向 = Ai被引用面向,
): Promise<被引用检验> {
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

export async function 失效消息总数缓存(
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
  }
  const zongShuJieGuo = await 数据库.query(
    `SELECT COUNT(*) as zong_shu FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
    [yong_hu_id, jiao_se_id],
  )
  const zongShu = parseInt(String(zongShuJieGuo.rows[0].zong_shu), 10)
  try {
    const { redis } = await import('../redis')
    await redis.setex(huanCunJian, ZongShuHuanCunMiao, String(zongShu))
  } catch {
  }
  return zongShu
}

export async function 取消息列表(
  canShu: 取消息参数,
): Promise<{ lie_biao: 消息信息[]; zong_shu: number; hai_you_geng_duo?: boolean }> {
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
  const buQuKuai = await gou块上下文(rows)
  const lieBiao = await Promise.all(
    (haiYouGengDuo ? rows.slice(0, meiYeTiaoShu) : rows).map((hang) =>
      映射消息(hang, buQuKuai),
    ),
  )

  if (shiYongYouBiao) {
    const zongShu = await huoQuZongShu(canShu.yong_hu_id, canShu.jiao_se_id)
    return { lie_biao: lieBiao, zong_shu: zongShu, hai_you_geng_duo: haiYouGengDuo }
  }

  const zongShu = await huoQuZongShu(canShu.yong_hu_id, canShu.jiao_se_id)
  return { lie_biao: lieBiao, zong_shu: zongShu, hai_you_geng_duo: haiYouGengDuo }
}

export async function 创建用户消息(
  canShu: 发消息参数,
): Promise<{ cheng_gong: boolean; xiao_xi?: 消息信息; ti_shi?: string; zhuang_tai_ma?: number }> {
  const kuaiXieRu = await qingLi消息块XieRu(
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
  if (!YunXuXiaoXiLeiXing.includes(leiXing)) {
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

  const jiaoSe = await 取角色所有者(canShu.jiao_se_id)
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

  const beiYong = await 校验被引用(
    canShu.bei_yong_xiao_xi_id,
    canShu.yong_hu_id,
    canShu.jiao_se_id,
  )
  if (!beiYong.cheng_gong) {
    return { cheng_gong: false, ti_shi: beiYong.ti_shi, zhuang_tai_ma: beiYong.zhuang_tai_ma }
  }
  const beiYongXiaoXiId = beiYong.id ?? null

  const miDengJian = qingLiMiDengJian(canShu.mi_deng_jian, canShu.yong_hu_id)
  const ZuiDaChongShiCiShu = 10
  let luo_ku_id: string | null = null
  let cuoWu: unknown = null

  for (let ciShu = 0; ciShu <= ZuiDaChongShiCiShu; ciShu++) {
    const keHuDuan = await 数据库.connect()
    try {
      await keHuDuan.query('BEGIN')
      await suoDingHuiHua(keHuDuan, canShu.yong_hu_id, canShu.jiao_se_id)
      const benTiaoXuHao = await huoQuXiaYiKeHuDuanXuHao(
        keHuDuan,
        canShu.yong_hu_id,
        canShu.jiao_se_id,
      )
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
        if (beiYongXiaoXiId && 是自引用(mingZhong.ID, beiYongXiaoXiId)) {
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
      }
      keHuDuan.release()
      const pgCuoWu = yiChang as { code?: string; constraint?: string }
      if (
        pgCuoWu.code === '23505' &&
        pgCuoWu.constraint?.includes('客户端序号') &&
        ciShu < ZuiDaChongShiCiShu
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
    `SELECT m.*, mf."SHA256" AS "媒体SHA256", mf."时长毫秒" AS "媒体时长毫秒"
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

  const xiaoXi = await 映射消息(
    jieGuo.rows[0],
    await gou块上下文(jieGuo.rows as Record<string, unknown>[]),
  )
  await 失效消息总数缓存(canShu.yong_hu_id, canShu.jiao_se_id)
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

export async function 撤回用户消息(
  canShu: 撤回消息参数,
): Promise<{ cheng_gong: boolean; xiao_xi?: 消息信息; ti_shi?: string; zhuang_tai_ma?: number }> {
  const jiaoSe = await 取角色所有者(canShu.jiao_se_id)
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
  if (Date.now() - chuangJianShiJian > huoQuCheHuiShiXianHaoMiao(xiaoXi.类型)) {
    debug日志.warn('消息服务', '用户消息撤回超时被拒绝', {
      xiang_qing: { xiao_xi_id: canShu.xiao_xi_id, lei_xing: String(xiaoXi.类型 ?? '') },
    })
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'cheHuiShiBai'), zhuang_tai_ma: 400 }
  }
  if (xiaoXi.已撤回) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'cheHuiShiBai'), zhuang_tai_ma: 400 }
  }

  const gengXinJieGuo = await 数据库.query(
    `WITH upd AS (
       UPDATE "消息" SET "已撤回" = true, "撤回时间" = NOW(), "原始内容" = "内容"
       WHERE "ID" = $1 AND "已撤回" = false
       RETURNING *
     )
     SELECT upd.*, mf."SHA256" AS "媒体SHA256", mf."时长毫秒" AS "媒体时长毫秒"
     FROM upd LEFT JOIN "媒体文件" mf ON upd."媒体ID" = mf."ID"`,
    [canShu.xiao_xi_id],
  )
  if (gengXinJieGuo.rows.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'cheHuiShiBai'), zhuang_tai_ma: 400 }
  }

  推送撤回事件(
    canShu.yong_hu_id,
    canShu.jiao_se_id,
    canShu.xiao_xi_id,
    'yonghu',
    await huoQuJiaoSeBianHao(canShu.jiao_se_id),
  )
  jiLuCheHuiCaoZuo('用户消息撤回', canShu.yong_hu_id, canShu.jiao_se_id, canShu.xiao_xi_id)

  return { cheng_gong: true, xiao_xi: await 映射消息(gengXinJieGuo.rows[0]) }
}

export async function 撤回角色消息(
  canShu: 撤回角色消息参数,
): Promise<{ cheng_gong: boolean; xiao_xi?: 消息信息; ti_shi?: string; zhuang_tai_ma?: number }> {
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
  if (Date.now() - chuangJianShiJian > huoQuCheHuiShiXianHaoMiao(xiaoXi.类型)) {
    debug日志.warn('消息服务', '角色消息撤回超时被拒绝', {
      xiang_qing: { xiao_xi_id: String(xiaoXi.ID ?? ''), lei_xing: String(xiaoXi.类型 ?? '') },
    })
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'cheHuiShiBai') }
  }

  const gengXinJieGuo = await 数据库.query(
    `WITH upd AS (
       UPDATE "消息" SET "已撤回" = true, "撤回时间" = NOW(), "原始内容" = "内容"
       WHERE "ID" = $1 AND "已撤回" = false
       RETURNING *
     )
     SELECT upd.*, mf."SHA256" AS "媒体SHA256", mf."时长毫秒" AS "媒体时长毫秒"
     FROM upd LEFT JOIN "媒体文件" mf ON upd."媒体ID" = mf."ID"`,
    [xiaoXi.ID],
  )
  if (gengXinJieGuo.rows.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'cheHuiShiBai') }
  }

  const cheHuiXiaoXi = await 映射消息(gengXinJieGuo.rows[0])
  推送撤回事件(
    canShu.yong_hu_id,
    canShu.jiao_se_id,
    cheHuiXiaoXi.id,
    'jiaose',
    await huoQuJiaoSeBianHao(canShu.jiao_se_id),
  )
  jiLuXiaoXiCaoZuo('角色消息撤回', canShu.yong_hu_id, canShu.jiao_se_id, 'jiaose', { xiao_xi_id: cheHuiXiaoXi.id })

  return { cheng_gong: true, xiao_xi: cheHuiXiaoXi }
}

export async function huoQuCheHuiYuanWen(
  canShu: 重新编辑原文参数,
): Promise<{ cheng_gong: boolean; yuanWen?: string; ti_shi?: string; zhuang_tai_ma?: number }> {
  const xiaoXiJieGuo = await 数据库.query(
    `SELECT * FROM "消息"
     WHERE "ID" = $1 AND "用户ID" = $2 AND "角色ID" = $3 AND "发送者" = 'yonghu' AND "已撤回" = true
     LIMIT 1`,
    [canShu.xiao_xi_id, canShu.yong_hu_id, canShu.jiao_se_id],
  )
  if (xiaoXiJieGuo.rows.length === 0) {
    debug日志.warn('消息服务', '重新编辑原文查询无本人已撤回消息', {
      xiang_qing: { xiao_xi_id: canShu.xiao_xi_id },
    })
    return { cheng_gong: false, zhuang_tai_ma: 404 }
  }

  const xiaoXi = xiaoXiJieGuo.rows[0]
  const leiXing = String(xiaoXi.类型 ?? '')
  if (leiXing !== 'wenben' && leiXing !== 'tuPian') {
    debug日志.warn('消息服务', '重新编辑原文类型不可编辑', {
      xiang_qing: { xiao_xi_id: canShu.xiao_xi_id, lei_xing: leiXing },
    })
    return { cheng_gong: false, zhuang_tai_ma: 400, ti_shi: huoQuFanYi('liaoTian', 'cheHuiShiBai') }
  }

  const chuangJianShiJian = new Date(String(xiaoXi.创建时间)).getTime()
  if (!Number.isFinite(chuangJianShiJian) || Date.now() - chuangJianShiJian > huoQuCheHuiShiXianHaoMiao(xiaoXi.类型)) {
    debug日志.warn('消息服务', '重新编辑原文超出撤回时限被拒绝', {
      xiang_qing: { xiao_xi_id: canShu.xiao_xi_id, lei_xing: leiXing },
    })
    return { cheng_gong: false, zhuang_tai_ma: 400, ti_shi: huoQuFanYi('liaoTian', 'cheHuiShiBai') }
  }

  if (leiXing === 'tuPian') {
    const kuaiLieBiao = Array.isArray(xiaoXi.内容块)
      ? (xiaoXi.内容块 as unknown[])
      : jieXiKuaiShuZu(xiaoXi.内容块)
    const wenZiKuai = kuaiLieBiao
      .filter(
        (xiang): xiang is Record<string, unknown> =>
          typeof xiang === 'object' && xiang !== null && (xiang as Record<string, unknown>).lei_xing === 'wenzi',
      )
      .map((xiang) => (typeof xiang.nei_rong === 'string' ? xiang.nei_rong : ''))
      .filter((wenZi) => wenZi !== '')
    const yuanWen = wenZiKuai.length > 0 ? wenZiKuai.join('\n') : ''
    return { cheng_gong: true, yuanWen }
  }

  const yuanWen = String(xiaoXi.原始内容 ?? xiaoXi.内容 ?? '')
  return { cheng_gong: true, yuanWen }
}

function jieXiKuaiShuZu(zhi: unknown): unknown[] {
  if (typeof zhi !== 'string' || zhi.trim() === '') return []
  try {
    const jieXi: unknown = JSON.parse(zhi)
    return Array.isArray(jieXi) ? jieXi : []
  } catch {
    return []
  }
}

export async function 标记所有维度(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<void> {
  await 数据库.query(
    `UPDATE "消息" SET "已读" = true WHERE "用户ID" = $1 AND "角色ID" = $2 AND "已读" = false`,
    [yong_hu_id, jiao_se_id],
  )
}

export interface 保存角色媒体参数 {
  yong_hu_id: string
  jiao_se_id: string
  nei_rong: string
  lei_xing: string
  mei_ti_id: string | null
  duan_ming?: string | null
}

interface CunChuNeiRongKuai {
  lei_xing: string
  mei_ti_id?: string
  mei_ti_lei_bie?: string
  duan_ming?: string
}

function qingLiJiaoSeDuanMing(zhi: unknown, yong_hu_id: string): string | null {
  if (zhi === null || zhi === undefined) return null
  if (typeof zhi !== 'string') {
    debug日志.warn('消息服务', '表情包短名类型非法，按无短名处理', { yong_hu_id })
    return null
  }
  const jianHua = zhi.trim()
  if (jianHua === '') return null
  if (jianHua.length > 表情短名最大长) {
    debug日志.warn('消息服务', '表情包短名超长，按无短名处理', {
      yong_hu_id,
      xiang_qing: { chang_du: jianHua.length, shang_xian: 表情短名最大长 },
    })
    return null
  }
  return jianHua
}

function qingLiJiaoSeMeiTiId(zhi: unknown, yong_hu_id: string): string | null {
  if (zhi === null || zhi === undefined || zhi === '') return null
  if (!yanZhengUUID(zhi)) {
    debug日志.warn('消息服务', '角色多媒体消息媒体ID非法，按无媒体行处理', { yong_hu_id })
    return null
  }
  return zhi
}

function gouZaoJiaoSeNeiRongKuai(
  leiXing: string,
  meiTiId: string | null,
  duanMing: string | null,
): CunChuNeiRongKuai[] | null {
  if (leiXing === 表情消息类型 && duanMing !== null) {
    return [
      {
        lei_xing: 消息块LeiXing.tuPian,
        mei_ti_lei_bie: 表情书类别,
        duan_ming: duanMing,
      },
    ]
  }
  if (meiTiId === null) return null
  const leiBie = leiXingDaoMeiTiLeiBie(leiXing)
  if (leiBie === null) return null
  return [{ lei_xing: 消息块LeiXing.tuPian, mei_ti_id: meiTiId, mei_ti_lei_bie: leiBie }]
}

async function xieRuJiaoSeMeiTiHang(
  canShu: 保存角色媒体参数,
  leiXing: string,
  meiTiId: string | null,
  kuai: CunChuNeiRongKuai[] | null,
  qingLiNeiRong: string,
): Promise<QueryResult> {
  const keHuDuan = await 数据库.connect()
  try {
    await keHuDuan.query('BEGIN')
    await suoDingHuiHua(keHuDuan, canShu.yong_hu_id, canShu.jiao_se_id)
    const benTiaoXuHao = await huoQuXiaYiKeHuDuanXuHao(
      keHuDuan,
      canShu.yong_hu_id,
      canShu.jiao_se_id,
    )
    const jieGuo = await keHuDuan.query(
      `WITH xin AS (
         INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读", "客户端序号", "媒体ID", "内容块")
         VALUES ($1, $2, $3, 'jiaose', $4, true, $5, $6, $7::jsonb)
         ON CONFLICT DO NOTHING
         RETURNING *
       )
       SELECT xin.*, mf."SHA256" AS "媒体SHA256", mf."时长毫秒" AS "媒体时长毫秒"
       FROM xin LEFT JOIN "媒体文件" mf ON xin."媒体ID" = mf."ID"`,
      [
        canShu.yong_hu_id,
        canShu.jiao_se_id,
        qingLiNeiRong,
        leiXing,
        benTiaoXuHao,
        meiTiId,
        kuai ? JSON.stringify(kuai) : null,
      ],
    )
    await keHuDuan.query('COMMIT')
    return jieGuo
  } catch (cuoWu) {
    await keHuDuan.query('ROLLBACK').catch(() => undefined)
    const { faSongGaoJing } = await import('../utils/邮件告警')
    await faSongGaoJing(
      'xiao_xi_luo_ku_shi_bai',
      '消息落库失败告警',
      `角色多媒体消息落库失败：${String(cuoWu).slice(0, 300)}`,
    ).catch(() => undefined)
    throw cuoWu
  } finally {
    keHuDuan.release()
  }
}

export async function 保存角色媒体消息(
  canShu: 保存角色媒体参数,
): Promise<消息信息> {
  const leiXing = String(canShu.lei_xing || '')
  if (!YunXuXiaoXiLeiXing.includes(leiXing)) {
    debug日志.warn('消息服务', '角色多媒体消息类型非法，已拒绝落库', {
      yong_hu_id: canShu.yong_hu_id,
      jiao_se_id: canShu.jiao_se_id,
      xiang_qing: { lei_xing: leiXing },
    })
    throw new Error('角色多媒体消息类型非法')
  }
  const qingLiNeiRong = (canShu.nei_rong || '').trim().slice(0, XiaoXiPeiZhi.zuiDaXiaoXiChangDu)
  const meiTiId = qingLiJiaoSeMeiTiId(canShu.mei_ti_id, canShu.yong_hu_id)
  const duanMing =
    leiXing === 表情消息类型
      ? qingLiJiaoSeDuanMing(canShu.duan_ming, canShu.yong_hu_id)
      : null
  if (meiTiId === null && duanMing === null) {
    debug日志.warn('消息服务', '角色多媒体消息既无媒体ID也无表情包短名，已拒绝落库', {
      yong_hu_id: canShu.yong_hu_id,
      jiao_se_id: canShu.jiao_se_id,
      xiang_qing: { lei_xing: leiXing },
    })
    throw new Error('角色多媒体消息缺少媒体标识')
  }
  const kuai = gouZaoJiaoSeNeiRongKuai(leiXing, meiTiId, duanMing)
  const jieGuo = await xieRuJiaoSeMeiTiHang(canShu, leiXing, meiTiId, kuai, qingLiNeiRong)
  if (jieGuo.rows.length === 0) {
    const { faSongGaoJing } = await import('../utils/邮件告警')
    await faSongGaoJing('xiao_xi_luo_ku_shi_bai', '消息落库失败告警', '角色多媒体消息落库返回空行').catch(() => undefined)
    throw new Error('角色多媒体消息落库返回空行')
  }
  const xiaoXi = await 映射消息(
    jieGuo.rows[0],
    await gou块上下文(jieGuo.rows as Record<string, unknown>[]),
  )
  await 失效消息总数缓存(canShu.yong_hu_id, canShu.jiao_se_id)
  jiLuXiaoXiCaoZuo('角色多媒体消息发送', canShu.yong_hu_id, canShu.jiao_se_id, 'jiaose', { xiao_xi_id: xiaoXi.id })
  return xiaoXi
}

