import { debug日志 } from '../utils/debug日志'
import { Router } from 'express'
import type { Response } from 'express'
import { huoQuFanYi } from '../config/translations'
import { 取业务错误文案 } from '../utils/业务错误'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { changGuiXianLiu } from '../middleware/限流'
import type { RenZhengQingQiu } from '../middleware/认证'
import {
  kaiShiTiaoZhan,
  huoQuDangQianDuiJu,
  huoQuPaiHangBang,
  huoQuWoDeGaiKuang,
} from '../services/挑战积分'
import { chuLiYouXiJieShu } from '../services/胜利失败条件'
import { 解析性别, type 性别内部形态 } from '../utils/性别'
import { huoQuJiaoSeBianHao } from '../services/公开编号'

const luYou = Router()

luYou.post('/开始', changGuiXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  }

  const qingQiuTi = qingQiu.body as Record<string, unknown>
  const woDeXingBie: 性别内部形态 | null = 解析性别(qingQiuTi.woDeXingBie)
  const duiXiangXingBie: 性别内部形态 | null = 解析性别(qingQiuTi.duiXiangXingBie)
  if (!woDeXingBie || !duiXiangXingBie) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tiaoZhan', 'xingBieBuHeFa'))
  }

  try {
    const jiaoSe = await kaiShiTiaoZhan(yongHu.yongHuId, woDeXingBie, duiXiangXingBie)
    return chengGongXiangYing(xiangYing, jiaoSe)
  } catch (cuoWu) {
    const zhuangTaiMa = (cuoWu as Error & { zhuang_tai_ma?: number }).zhuang_tai_ma ?? 500
    if (zhuangTaiMa === 500) {
      debug日志.error('挑战接口', '开始挑战失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    }
    return shiBaiXiangYing(
      xiangYing,
      zhuangTaiMa,
      取业务错误文案(cuoWu, huoQuFanYi('tiaoZhan', 'kaiShiTiaoZhanShiBai')),
      zhuangTaiMa === 500 ? undefined : 'REQUEST_PARAMETER_INVALID',
    )
  }
})

luYou.get('/当前', changGuiXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  }
  try {
    const duiJu = await huoQuDangQianDuiJu(yongHu.yongHuId)
    return chengGongXiangYing(xiangYing, {
      dui_ju: duiJu ? { ...duiJu, jiao_se_id: await huoQuJiaoSeBianHao(duiJu.jiao_se_id) } : duiJu,
    })
  } catch (cuoWu) {
    debug日志.error('挑战接口', '查询当前挑战对局失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/放弃', changGuiXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  }
  try {
    const duiJu = await huoQuDangQianDuiJu(yongHu.yongHuId)
    if (!duiJu) {
      return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tiaoZhan', 'wuJinXingZhongDuiJu'))
    }
    const jieGuo = await chuLiYouXiJieShu(
      yongHu.yongHuId,
      duiJu.jiao_se_id,
      'shi_bai_fang_qi_tiao_zhan',
      { lei_xing: '用户主动放弃挑战' },
    )
    return chengGongXiangYing(xiangYing, { jie_guo: jieGuo })
  } catch (cuoWu) {
    debug日志.error('挑战接口', '放弃挑战失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.get('/排行榜', changGuiXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  }
  try {
    const zuBie = String((qingQiu.query.zuBie as string | undefined) ?? '')
    const paiHang = await huoQuPaiHangBang(zuBie)
    return chengGongXiangYing(xiangYing, { pai_hang: paiHang })
  } catch (cuoWu) {
    const zhuangTaiMa = (cuoWu as Error & { zhuang_tai_ma?: number }).zhuang_tai_ma ?? 500
    if (zhuangTaiMa === 500) {
      debug日志.error('挑战接口', '查询挑战排行榜失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    }
    return shiBaiXiangYing(
      xiangYing,
      zhuangTaiMa,
      取业务错误文案(cuoWu, huoQuFanYi('tiaoZhan', 'paiHangBangChaXunShiBai')),
      zhuangTaiMa === 500 ? undefined : 'REQUEST_PARAMETER_INVALID',
    )
  }
})

luYou.get('/我的概况', changGuiXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  }
  try {
    const gaiKuang = await huoQuWoDeGaiKuang(yongHu.yongHuId)
    return chengGongXiangYing(xiangYing, { gai_kuang: gaiKuang })
  } catch (cuoWu) {
    debug日志.error('挑战接口', '查询挑战概况失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

export default luYou
