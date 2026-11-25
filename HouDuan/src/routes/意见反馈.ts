import { debug日志 } from '../utils/debug日志'
import { Router } from 'express'
import type { Request, Response } from 'express'
import { huoQuFanYi, type FanYiJian } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { huoQuZhenShiIP } from '../utils/真实IP'
import { redis } from '../redis'
import type { RenZhengQingQiu } from '../middleware/认证'
import { fanKuiXianLiu } from '../middleware/限流'
import { 反馈提交验证中间件, 反馈读取字符串, 反馈读取数组 } from '../middleware/输入验证'
import { tiJiaoFanKui, huoQuWoDeFanKuiLieBiao } from '../services/意见反馈'
import { CuoWuDaiMa } from '../config/错误码注册表'

const luYou = Router()

const fanKuiMeiYeTiaoShu = 20
const sheBeiXinXiWenBenJian: Readonly<Record<string, number>> = {
  yeMian: 100,
  yuYan: 35,
  pingTai: 200,
  shiQu: 64,
}
const sheBeiXinXiShuZiJian: readonly string[] = [
  'shiKouKuanGao',
  'shiKouGaoDu',
  'pingMuKuan',
  'pingMuGao',
  'xiangSuBi',
  'shiJianChuo',
]
const userAgentZuiDaChangDu = 200
const miDengJianZuiDaChangDu = 64
const miDengJianGeShi = /^[A-Za-z0-9_-]+$/
const miDengJianCunXuMiao = 24 * 60 * 60

function huoQuIp(qingQiu: Request): string {
  return huoQuZhenShiIP(qingQiu)
}

function huoQuShuZi(zhi: unknown, moRen: number): number {
  if (typeof zhi === 'number' && Number.isInteger(zhi) && zhi > 0) return zhi
  if (typeof zhi === 'string') {
    const jieXi = parseInt(zhi, 10)
    if (!Number.isNaN(jieXi) && jieXi > 0) return jieXi
  }
  return moRen
}

function huoQuMiDengJian(qingQiu: Request): string {
  const zhi = qingQiu.headers['idempotency-key']
  if (typeof zhi !== 'string') return ''
  return zhi.trim()
}

function fanKuiTiShi(jian: string): string {
  return huoQuFanYi('fanKui', jian as FanYiJian<'fanKui'>)
}

function guiZhengSheBeiXinXi(qingQiuTi: Record<string, unknown>, qingQiu: Request): Record<string, unknown> {
  const yuanShi = qingQiuTi['she_bei_xin_xi'] ?? qingQiuTi['sheBeiXinXi']
  const yuan =
    yuanShi && typeof yuanShi === 'object' && !Array.isArray(yuanShi)
      ? (yuanShi as Record<string, unknown>)
      : {}
  const jieGuo: Record<string, unknown> = {}
  for (const [jian, zuiDaChangDu] of Object.entries(sheBeiXinXiWenBenJian)) {
    const zhi = yuan[jian]
    if (typeof zhi === 'string') {
      jieGuo[jian] = zhi.slice(0, zuiDaChangDu)
    }
  }
  for (const jian of sheBeiXinXiShuZiJian) {
    const zhi = yuan[jian]
    if (typeof zhi === 'number' && Number.isFinite(zhi)) {
      jieGuo[jian] = zhi
    }
  }
  jieGuo['ip'] = huoQuIp(qingQiu)
  const userAgent = qingQiu.headers['user-agent']
  if (typeof userAgent === 'string' && userAgent) {
    jieGuo['user_agent'] = userAgent.slice(0, userAgentZuiDaChangDu)
  }
  return jieGuo
}

luYou.post(
  '/',
  fanKuiXianLiu,
  反馈提交验证中间件,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const qingQiuTi = qingQiu.body as Record<string, unknown>
    const manYiDuYuanShi = qingQiuTi['man_yi_du'] ?? qingQiuTi['manYiDu']
    const manYiDu = typeof manYiDuYuanShi === 'number' ? manYiDuYuanShi : undefined

    const miDengJian = huoQuMiDengJian(qingQiu)
    if (miDengJian && (miDengJian.length > miDengJianZuiDaChangDu || !miDengJianGeShi.test(miDengJian))) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'), CuoWuDaiMa.REQUEST_PARAMETER_INVALID)
    }
    let miDengJianCunChuJian = ''
    if (miDengJian) {
      miDengJianCunChuJian = `fan_kui_mi_deng:${yongHu.用户ID}:${miDengJian}`
      const shouCiZhanWei = await redis.set(miDengJianCunChuJian, '', 'EX', miDengJianCunXuMiao, 'NX')
      if (shouCiZhanWei !== 'OK') {
        const yiYouId = await redis.get(miDengJianCunChuJian)
        if (yiYouId) {
          return chengGongXiangYing(xiangYing, { id: yiYouId })
        }
        return shiBaiXiangYing(xiangYing, 409, fanKuiTiShi('fanKuiChongFuZhong'))
      }
    }

    try {
      const jieGuo = await tiJiaoFanKui({
        yong_hu_id: yongHu.用户ID,
        ye_mian_biao_shi: 反馈读取字符串(qingQiuTi, 'ye_mian_biao_shi', 'yeMianBiaoShi'),
        fen_lei: 反馈读取字符串(qingQiuTi, 'fen_lei', 'fenLei'),
        man_yi_du: manYiDu,
        zheng_wen: 反馈读取字符串(qingQiuTi, 'zheng_wen', 'zhengWen'),
        biao_qian: 反馈读取数组(qingQiuTi, 'biao_qian', 'biaoQian').filter(
          (xiang): xiang is string => typeof xiang === 'string',
        ),
        xiao_xi_yin_yong: 反馈读取数组(qingQiuTi, 'xiao_xi_yin_yong', 'xiaoXiYinYong'),
        biao_qing_bao_yin_yong: 反馈读取数组(qingQiuTi, 'biao_qing_bao_yin_yong', 'biaoQingBaoYinYong'),
        she_bei_xin_xi: guiZhengSheBeiXinXi(qingQiuTi, qingQiu),
      })
      if (!jieGuo.cheng_gong || !jieGuo.fan_kui) {
        if (miDengJianCunChuJian) await redis.del(miDengJianCunChuJian).catch(() => null)
        return shiBaiXiangYing(
          xiangYing,
          jieGuo.zhuang_tai_ma || 400,
          jieGuo.ti_shi || huoQuFanYi('tongYong', 'caoZuoShiBai'),
          CuoWuDaiMa.REQUEST_PARAMETER_INVALID,
        )
      }
      if (miDengJianCunChuJian) {
        await redis.set(miDengJianCunChuJian, jieGuo.fan_kui.id, 'EX', miDengJianCunXuMiao).catch(() => null)
      }
      debug日志.info('反馈接口', '收到新的意见反馈', {
        xiang_qing: {
          fan_kui_id: jieGuo.fan_kui.id,
          fen_lei: jieGuo.fan_kui.fen_lei,
          ye_mian: jieGuo.fan_kui.ye_mian_biao_shi,
        },
      })
      return chengGongXiangYing(xiangYing, {
        id: jieGuo.fan_kui.id,
        fen_lei: jieGuo.fan_kui.fen_lei,
        zhuang_tai: jieGuo.fan_kui.zhuang_tai,
        chuang_jian_shi_jian: jieGuo.fan_kui.chuang_jian_shi_jian,
      })
    } catch (cuoWu) {
      if (miDengJianCunChuJian) await redis.del(miDengJianCunChuJian).catch(() => null)
      debug日志.error('反馈接口', '提交反馈失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.get(
  '/我的',
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const yeMaYuanShi = qingQiu.query.ye_ma ?? qingQiu.query.yeMa
    const yeMa = huoQuShuZi(yeMaYuanShi, 1)

    try {
      const jieGuo = await huoQuWoDeFanKuiLieBiao(yongHu.用户ID, yeMa, fanKuiMeiYeTiaoShu)
      return chengGongXiangYing(xiangYing, {
        lie_biao: jieGuo.lie_biao,
        zong_shu: jieGuo.zong_shu,
        hai_you_geng_duo: jieGuo.hai_you_geng_duo,
        ye_ma: jieGuo.ye_ma,
        mei_ye_tiao_shu: jieGuo.mei_ye_tiao_shu,
      })
    } catch (cuoWu) {
      debug日志.error('反馈接口', '获取我的反馈列表失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

export default luYou
