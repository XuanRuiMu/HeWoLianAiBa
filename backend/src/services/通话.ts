import { randomUUID } from 'crypto'
import type { Server } from 'socket.io'
import { 数据库 } from '../数据库'
import { huoQuIo } from '../socket/io'
import { huoQuFanYi } from '../config/translations'
import { TONG_HUA_PEI_ZHI } from '../config/通话配置'
import { jiLuSocketShiJian } from '../utils/debug日志'
import type { XiaoXiXinXi } from './消息'

export type TongHuaLeiXing = 'yuYin' | 'shiPin'
export type TongHuaZhongTai = 'yiJieTong' | 'yiQuXiao' | 'yiJuJie' | 'yiChaoShi'

type HuiHuaZhuangTai = 'zhenLing' | 'yiJieTong' | 'yiJieShu'

interface TongHuaHuiHua {
  tongHuaId: string
  yongHuId: string
  jiaoSeId: string
  leiXing: TongHuaLeiXing
  zhuangTai: HuiHuaZhuangTai
  faQiShiJian: number
  jieTongShiJian: number | null
  jieTingDingShiQi: NodeJS.Timeout | null
  chaoShiDingShiQi: NodeJS.Timeout | null
}

export interface TongHuaCaoZuoJieGuo {
  chengGong: boolean
  tongHuaId?: string
  tiShi?: string
  shiChangMiao?: number
}

const huiHuaMap = new Map<string, TongHuaHuiHua>()
const yongHuHuoYueHuiHua = new Map<string, string>()

let tongHuaIo: Server | null = null

export function sheZhiTongHuaIo(serverIo: Server): void {
  tongHuaIo = serverIo
}

function tuiSongDaoYongHu(yongHuId: string, shiJianMing: string, zaiHe: unknown): void {
  const muBiaoIo = tongHuaIo ?? huoQuIo()
  if (!muBiaoIo) return
  muBiaoIo.to(yongHuId).emit(shiJianMing, zaiHe)
}

function geShiHuaShiChang(shiChangMiao: number): string {
  const fen = Math.floor(shiChangMiao / 60)
  const miao = shiChangMiao % 60
  return `${String(fen).padStart(2, '0')}:${String(miao).padStart(2, '0')}`
}

function huoQuTongHuaNeiRong(huiHua: TongHuaHuiHua, shiChangMiao: number): string {
  const yiJieTong = huiHua.jieTongShiJian != null
  if (yiJieTong) {
    const qianZhui = huoQuFanYi(
      'tongHua',
      huiHua.leiXing === 'yuYin' ? 'yuYinYiTongShi' : 'shiPinYiTongShi',
    )
    return `${qianZhui} ${geShiHuaShiChang(shiChangMiao)}`
  }
  return huoQuFanYi('tongHua', huiHua.leiXing === 'yuYin' ? 'yuYinYiQuXiao' : 'shiPinYiQuXiao')
}

async function chaRuXiTongXiaoXi(huiHua: TongHuaHuiHua, neiRong: string): Promise<XiaoXiXinXi> {
  const xuHaoJieGuo = await 数据库.query(
    `SELECT COALESCE(MAX("客户端序号"), 0) as zui_da FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
    [huiHua.yongHuId, huiHua.jiaoSeId],
  )
  const keHuDuanXuHao = Number(xuHaoJieGuo.rows[0]?.zui_da ?? 0) + 1

  const jieGuo = await 数据库.query(
    `INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读", "客户端序号")
     VALUES ($1, $2, $3, 'xitong', 'wenben', true, $4)
     RETURNING *`,
    [huiHua.yongHuId, huiHua.jiaoSeId, neiRong, keHuDuanXuHao],
  )

  const row = jieGuo.rows[0]
  return {
    id: String(row.ID),
    hui_hua_id: huiHua.jiaoSeId,
    fa_song_zhe_id: '',
    fa_song_zhe_lei_xing: 'xitong',
    nei_rong: String(row.内容),
    lei_xing: String(row.类型 || 'wenben'),
    shi_jian_chuo: new Date(String(row.创建时间)).getTime(),
    yi_du: Boolean(row.已读),
    yi_che_hui: Boolean(row.已撤回),
    che_hui_shi_jian: null,
    yuan_shi_nei_rong: null,
    ke_hu_duan_xu_hao: keHuDuanXuHao,
    mei_ti_id: null,
    mei_ti_url: null,
  }
}

function qingLiHuiHuaDingShiQi(huiHua: TongHuaHuiHua): void {
  if (huiHua.jieTingDingShiQi) {
    clearTimeout(huiHua.jieTingDingShiQi)
    huiHua.jieTingDingShiQi = null
  }
  if (huiHua.chaoShiDingShiQi) {
    clearTimeout(huiHua.chaoShiDingShiQi)
    huiHua.chaoShiDingShiQi = null
  }
}

export async function faQi(
  yongHuId: string,
  jiaoSeId: string,
  leiXing: TongHuaLeiXing,
): Promise<TongHuaCaoZuoJieGuo> {
  const jiuTongHuaId = yongHuHuoYueHuiHua.get(yongHuId)
  if (jiuTongHuaId) {
    const jiuHuiHua = huiHuaMap.get(jiuTongHuaId)
    if (jiuHuiHua && jiuHuiHua.zhuangTai !== 'yiJieShu') {
      await jieShuDianHua(jiuHuiHua, jiuHuiHua.jieTongShiJian != null ? 'yiJieTong' : 'yiQuXiao')
    }
  }

  const tongHuaId = randomUUID()
  const huiHua: TongHuaHuiHua = {
    tongHuaId,
    yongHuId,
    jiaoSeId,
    leiXing,
    zhuangTai: 'zhenLing',
    faQiShiJian: Date.now(),
    jieTongShiJian: null,
    jieTingDingShiQi: null,
    chaoShiDingShiQi: null,
  }
  huiHuaMap.set(tongHuaId, huiHua)
  yongHuHuoYueHuiHua.set(yongHuId, tongHuaId)

  const zhenLingQuJian = Math.max(
    0,
    TONG_HUA_PEI_ZHI.zhenLingZuiDaHaoMiao - TONG_HUA_PEI_ZHI.zhenLingZuiXiaoHaoMiao,
  )
  const yanChiHaoMiao = TONG_HUA_PEI_ZHI.zhenLingZuiXiaoHaoMiao + Math.random() * zhenLingQuJian
  huiHua.jieTingDingShiQi = setTimeout(() => {
    huiHua.jieTingDingShiQi = null
    void AIziDongJieTing(tongHuaId).catch((cuoWu) => console.error('AI自动接听失败', cuoWu))
  }, yanChiHaoMiao)

  jiLuSocketShiJian('通话邀请', yongHuId, {
    jiao_se_id: jiaoSeId,
    tong_hua_id: tongHuaId,
    lei_xing: leiXing,
  })
  return { chengGong: true, tongHuaId }
}

export async function AIziDongJieTing(tongHuaId: string): Promise<void> {
  const huiHua = huiHuaMap.get(tongHuaId)
  if (!huiHua || huiHua.zhuangTai !== 'zhenLing') return

  huiHua.zhuangTai = 'yiJieTong'
  huiHua.jieTongShiJian = Date.now()

  const chaoShiHaoMiao = TONG_HUA_PEI_ZHI.yingJianShangXianMiao * 1000
  huiHua.chaoShiDingShiQi = setTimeout(() => {
    huiHua.chaoShiDingShiQi = null
    void yingJianChaoShi(tongHuaId).catch((cuoWu) => console.error('通话硬上限超时处理失败', cuoWu))
  }, chaoShiHaoMiao)

  tuiSongDaoYongHu(huiHua.yongHuId, '通话接受', {
    tongHuaId,
    leiXing: huiHua.leiXing,
    jieTongShiJian: huiHua.jieTongShiJian,
  })
  jiLuSocketShiJian('通话接受', huiHua.yongHuId, { tong_hua_id: tongHuaId })
}

export async function yingJianChaoShi(tongHuaId: string): Promise<void> {
  const huiHua = huiHuaMap.get(tongHuaId)
  if (!huiHua || huiHua.zhuangTai !== 'yiJieTong') return

  tuiSongDaoYongHu(huiHua.yongHuId, '通话超时', { tongHuaId })
  await jieShuDianHua(huiHua, 'yiChaoShi')
}

export async function yongHuQuXiao(
  yongHuId: string,
  tongHuaId: string,
): Promise<TongHuaCaoZuoJieGuo> {
  const huiHua = huiHuaMap.get(tongHuaId)
  if (!huiHua || huiHua.zhuangTai === 'yiJieShu') {
    return { chengGong: false, tiShi: huoQuFanYi('tongHua', 'huiHuaBuCunZai') }
  }
  if (huiHua.yongHuId !== yongHuId) {
    return { chengGong: false, tiShi: huoQuFanYi('tongHua', 'wuQuanXian') }
  }
  if (huiHua.zhuangTai !== 'zhenLing') {
    return { chengGong: false, tiShi: huoQuFanYi('tongHua', 'zhuangTaiCuoWu') }
  }

  await jieShuDianHua(huiHua, 'yiQuXiao')
  return { chengGong: true }
}

export async function yongHuGuaDuan(
  yongHuId: string,
  tongHuaId: string,
): Promise<TongHuaCaoZuoJieGuo> {
  const huiHua = huiHuaMap.get(tongHuaId)
  if (!huiHua || huiHua.zhuangTai === 'yiJieShu') {
    return { chengGong: false, tiShi: huoQuFanYi('tongHua', 'huiHuaBuCunZai') }
  }
  if (huiHua.yongHuId !== yongHuId) {
    return { chengGong: false, tiShi: huoQuFanYi('tongHua', 'wuQuanXian') }
  }
  if (huiHua.zhuangTai !== 'yiJieTong') {
    return { chengGong: false, tiShi: huoQuFanYi('tongHua', 'zhuangTaiCuoWu') }
  }

  const { shiChangMiao } = await jieShuDianHua(huiHua, 'yiJieTong')
  return { chengGong: true, shiChangMiao }
}

export async function jieShuDianHua(
  huiHua: TongHuaHuiHua,
  zhongTai: TongHuaZhongTai,
): Promise<{ shiChangMiao: number }> {
  if (huiHua.zhuangTai === 'yiJieShu') {
    return { shiChangMiao: 0 }
  }

  qingLiHuiHuaDingShiQi(huiHua)
  const shiChangMiao =
    huiHua.jieTongShiJian != null
      ? Math.max(0, Math.floor((Date.now() - huiHua.jieTongShiJian) / 1000))
      : 0

  huiHua.zhuangTai = 'yiJieShu'
  huiHuaMap.delete(huiHua.tongHuaId)
  if (yongHuHuoYueHuiHua.get(huiHua.yongHuId) === huiHua.tongHuaId) {
    yongHuHuoYueHuiHua.delete(huiHua.yongHuId)
  }

  try {
    await 数据库.query(
      `INSERT INTO "通话记录" ("用户ID", "角色ID", "类型", "状态", "接通时间", "结束时间", "时长秒")
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
      [
        huiHua.yongHuId,
        huiHua.jiaoSeId,
        huiHua.leiXing,
        zhongTai,
        huiHua.jieTongShiJian != null ? new Date(huiHua.jieTongShiJian) : null,
        shiChangMiao,
      ],
    )

    const neiRong = huoQuTongHuaNeiRong(huiHua, shiChangMiao)
    const xiTongXiaoXi = await chaRuXiTongXiaoXi(huiHua, neiRong)
    tuiSongDaoYongHu(huiHua.yongHuId, '角色回复', {
      角色ID: huiHua.jiaoSeId,
      消息列表: [xiTongXiaoXi],
    })
    jiLuSocketShiJian('角色回复', huiHua.yongHuId, {
      jiao_se_id: huiHua.jiaoSeId,
      xiao_xi_shu: 1,
      lei_xing: 'xi_tong',
    })
  } catch (cuoWu) {
    console.error('通话终态落库失败', cuoWu)
  }

  tuiSongDaoYongHu(huiHua.yongHuId, '通话结束', {
    tongHuaId: huiHua.tongHuaId,
    zhuangTai: zhongTai,
    shiChangMiao,
  })
  jiLuSocketShiJian('通话结束', huiHua.yongHuId, {
    tong_hua_id: huiHua.tongHuaId,
    zhuang_tai: zhongTai,
    shi_chang_miao: shiChangMiao,
  })

  return { shiChangMiao }
}

export function qingKongQuanBuHuiHua(): void {
  for (const huiHua of huiHuaMap.values()) {
    qingLiHuiHuaDingShiQi(huiHua)
    huiHua.zhuangTai = 'yiJieShu'
  }
  huiHuaMap.clear()
  yongHuHuoYueHuiHua.clear()
}
