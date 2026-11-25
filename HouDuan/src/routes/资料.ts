import { Router } from 'express'
import type { Response } from 'express'
import Busboy from 'busboy'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { debug日志 } from '../utils/debug日志'
import { liaoTianXianLiu } from '../middleware/限流'
import type { RenZhengQingQiu } from '../middleware/认证'
import { 数据库 } from '../数据库'
import { yanZhengUUID } from '../utils/验证'
import { 清洗玩家文本 } from '../utils/控制字符'
import { ShenHeFuWuBuKeYongJian } from '../config/媒体配置'
import {
  KeJianXingLieBiao,
  shiHeFaKeJianXing,
  panDuanKeJian,
  chaXunShiHaoYou,
  duQuQianMingKeJianXinXi,
  type KeJianXing,
} from '../services/可见性'
import { shenHeNeiRongAnQuan } from '../services/安全审核'
import {
  liuShiBaoCunMeiTi,
  MeiTiCunChuCuoWu,
  shengChengMeiTiYinYong,
  zhongXinQianMingMeiTiURL,
} from '../services/媒体存储'
import { panDingMeiTiShenHeChuCan } from '../services/媒体审核出参'
import {
  chaXunZhangHaoFengJin,
  jiLuZhangHaoWeiGui,
  tiJiaoShenSu,
} from '../services/账号封禁'
import { 获取IP } from '../services/IP封禁'
import { QiPaoAiMoRen, QiPaoYuSheXuanXiang, QiPaoZiJiMoRen } from '../config/气泡主题'

const luYou = Router()

const QiPaoYuShe = new Set<string>(QiPaoYuSheXuanXiang as readonly string[])

const QianMingZuiDaZiFu = 500
const BaiMingDanZuiDaRenShu = 200
const TouXiangZuiDaZiJie = 2 * 1024 * 1024
const TouXiangMimeBaiMingDan = new Set(['image/jpeg', 'image/png', 'image/webp'])

function quZiFuChuan(qingQiuTi: Record<string, unknown>, ...jians: string[]): string {
  for (const jian of jians) {
    if (typeof qingQiuTi[jian] === 'string') return qingQiuTi[jian] as string
  }
  return ''
}

async function yanZhengBaiMingDan(zhi: unknown): Promise<{ he_fa: boolean; lie_biao: string[] }> {
  if (!Array.isArray(zhi)) return { he_fa: false, lie_biao: [] }
  const quChong = [...new Set(zhi.filter((x) => typeof x === 'string'))] as string[]
  if (quChong.length > BaiMingDanZuiDaRenShu) return { he_fa: false, lie_biao: [] }
  if (!quChong.every((id) => yanZhengUUID(id))) return { he_fa: false, lie_biao: [] }
  if (quChong.length === 0) return { he_fa: true, lie_biao: [] }
  const cunZai = await 数据库.query(
    `SELECT COUNT(*) AS shu FROM "用户" WHERE "ID" = ANY($1::uuid[])`,
    [quChong],
  )
  if (Number(cunZai.rows[0]?.shu || 0) !== quChong.length) return { he_fa: false, lie_biao: [] }
  return { he_fa: true, lie_biao: quChong }
}

luYou.put('/签名', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const qianMingFengJin = await chaXunZhangHaoFengJin(yongHu.用户ID)
  if (qianMingFengJin.beiFengJin) {
    return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('anQuan', 'zhangHaoYiBeiFengJin'))
  }
  const qingQiuTi = qingQiu.body as Record<string, unknown>
  const qianMing = 清洗玩家文本(quZiFuChuan(qingQiuTi, 'qianMing', 'qian_ming'))
  if (Array.from(qianMing).length > QianMingZuiDaZiFu) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('ziLiao', 'qianMingTaiChang'))
  }
  const keJianXingRaw = quZiFuChuan(qingQiuTi, 'keJianXing', 'ke_jian_xing') || 'gong_kai'
  if (!shiHeFaKeJianXing(keJianXingRaw)) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('ziLiao', 'keJianXingFeiFa'))
  }
  const keJianXing: KeJianXing = keJianXingRaw
  let 白名单: string[] = []
  if (keJianXing === 'jin_bu_fen_ren') {
    const yuanShiZhi = (qingQiuTi['白名单'] ?? qingQiuTi['bai_ming_dan']) as unknown
    try {
      const yanZheng = await yanZhengBaiMingDan(yuanShiZhi)
      if (!yanZheng.he_fa) {
        return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('ziLiao', '白名单FeiFa'))
      }
      白名单 = yanZheng.lie_biao.filter((id) => id !== yongHu.用户ID)
    } catch (cuoWu) {
      debug日志.error('资料接口', '校验签名白名单失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  }
  try {
    if (qianMing) {
      const shenHe = await shenHeNeiRongAnQuan(qianMing)
      if (shenHe.wei_gui && shenHe.lei_xing === ShenHeFuWuBuKeYongJian) {
        return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
      }
      if (shenHe.wei_gui) {
        await jiLuZhangHaoWeiGui({
          用户ID: yongHu.用户ID,
          ip: 获取IP(qingQiu),
          yuanYin: shenHe.li_you || shenHe.lei_xing || '签名违规',
          leiXing: '签名',
        })
        return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('ziLiao', 'qianMingHanWeiGui'))
      }
    }
    await 数据库.query(
      `UPDATE "用户" SET "签名" = $1, "签名可见性" = $2, "签名白名单" = $3::uuid[], "更新时间" = NOW() WHERE "ID" = $4`,
      [qianMing || null, keJianXing, 白名单, yongHu.用户ID],
    )
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('资料接口', '保存签名失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
