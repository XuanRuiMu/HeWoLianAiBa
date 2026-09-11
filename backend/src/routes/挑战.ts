import { debug日志 } from '../utils/debug日志'
import { Router } from 'express'
import type { Response } from 'express'
import { huoQuFanYi } from '../config/translations'
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

const luYou = Router()

function yanZhengXingBie(zhi: unknown): zhi is '男' | '女' {
  return zhi === '男' || zhi === '女'
}

/** 开始一局挑战（仅选自身性别与对象性别，其余全部系统随机隐藏） */
luYou.post('/开始', changGuiXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  }

  const body = qingQiu.body as Record<string, unknown>
  if (!yanZhengXingBie(body.woDeXingBie) || !yanZhengXingBie(body.duiXiangXingBie)) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tiaoZhan', 'xingBieBuHeFa'))
  }

  try {
    const jiaoSe = await kaiShiTiaoZhan(yongHu.yongHuId, body.woDeXingBie, body.duiXiangXingBie)
    return chengGongXiangYing(xiangYing, jiaoSe)
  } catch (cuoWu) {
    const zhuangTaiMa = (cuoWu as Error & { zhuang_tai_ma?: number }).zhuang_tai_ma ?? 500
    if (zhuangTaiMa === 500) {
      debug日志.error('挑战接口', '开始挑战失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    }
    return shiBaiXiangYing(
      xiangYing,
      zhuangTaiMa,
      cuoWu instanceof Error && cuoWu.message ? cuoWu.message : huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'),
    )
  }
})

/** 当前进行中的挑战对局 */
luYou.get('/当前', changGuiXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  }
  try {
    const duiJu = await huoQuDangQianDuiJu(yongHu.yongHuId)
    return chengGongXiangYing(xiangYing, { dui_ju: duiJu })
  } catch (cuoWu) {
    debug日志.error('挑战接口', '查询当前挑战对局失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

/** 放弃本局挑战：按失败-放弃结算扣分并封存档案 */
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
    // 校验角色归属
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

/** 公开积分榜：按组别查询（男女/女男/男男/女女） */
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
      cuoWu instanceof Error && cuoWu.message ? cuoWu.message : huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'),
    )
  }
})

/** 我的四组别挑战概况（段位/积分/排名） */
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
