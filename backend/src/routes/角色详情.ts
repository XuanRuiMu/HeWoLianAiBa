import { Router } from 'express'
import type { Response } from 'express'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { anIdChaJiaoSeXiangQing } from '../services/角色生成'
import { huoQuJiaoSeSuoYouZhe } from '../services/消息'
import type { RenZhengQingQiu } from '../middleware/认证'

// 角色详情路由
const luYou = Router()

luYou.get(
  '/详情/:jiaoSeId',
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const jiaoSeId = String(qingQiu.params.jiaoSeId || '')
    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const [jiaoSe, suoYouZhe] = await Promise.all([
        anIdChaJiaoSeXiangQing(jiaoSeId),
        huoQuJiaoSeSuoYouZhe(jiaoSeId),
      ])

      if (!jiaoSe || !suoYouZhe) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
      }

      if (suoYouZhe.yong_hu_id !== yongHu.yongHuId) {
        return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('liaoTian', 'wuQuanXian'))
      }

      return chengGongXiangYing(xiangYing, {
        jiao_se: jiaoSe,
        dang_an_zhuang_tai: {
          jie_guo_lei_xing: suoYouZhe.jie_ju_zhuang_tai,
          shi_fou_feng_cun: suoYouZhe.shi_fou_feng_cun,
          you_xi_yi_jie_shu: suoYouZhe.shi_fou_feng_cun && !suoYouZhe.ke_ji_xu_liao_tian,
          ke_ji_xu_liao_tian: suoYouZhe.ke_ji_xu_liao_tian,
        },
      })
    } catch (cuoWu) {
      console.error('获取角色详情失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

export default luYou
