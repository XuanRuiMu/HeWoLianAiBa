import { debug日志 } from '../utils/debug日志'
import { Router } from 'express'
import type { Response } from 'express'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { anIdChaJiaoSeXiangQing, touYingGuanLiJiaoSe, touYingWanJiaKeJianJiaoSe } from '../services/角色生成'
import { anYongHuIdJuBeiNengLi } from '../middleware/管理员'
import { huoQuJiaoSeSuoYouZhe } from '../services/消息'
import { zhongXinQianMingMeiTiURL } from '../services/媒体存储'
import { guiYiHuaJiaoSeBiaoShi } from '../services/公开编号'
import type { RenZhengQingQiu } from '../middleware/认证'

const luYou = Router()

luYou.get(
  '/详情/:jiaoSeId',
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const jiaoSeId = await guiYiHuaJiaoSeBiaoShi(qingQiu.params.jiaoSeId)
    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
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

      let youYunYingNengLi = false
      try {
        youYunYingNengLi = await anYongHuIdJuBeiNengLi(yongHu.yongHuId, 'cha_kan')
      } catch (cuoWu) {
        debug日志.error('角色接口', '运营读取能力判定失败，按无权限处理', {
          xiang_qing: { jiao_se_id: jiaoSeId, cuo_wu: String(cuoWu) },
        })
        youYunYingNengLi = false
      }

      const touYingJiaoSe = youYunYingNengLi
        ? touYingGuanLiJiaoSe(jiaoSe)
        : touYingWanJiaKeJianJiaoSe(jiaoSe)

      return chengGongXiangYing(xiangYing, {
        jiao_se: {
          ...touYingJiaoSe,
          tou_xiang: zhongXinQianMingMeiTiURL(jiaoSe.tou_xiang, yongHu.yongHuId) ?? '',
        },
        dang_an_zhuang_tai: {
          jie_guo_lei_xing: suoYouZhe.jie_ju_zhuang_tai,
          shi_fou_feng_cun: suoYouZhe.shi_fou_feng_cun,
          you_xi_yi_jie_shu: suoYouZhe.shi_fou_feng_cun && !suoYouZhe.ke_ji_xu_liao_tian,
          ke_ji_xu_liao_tian: suoYouZhe.ke_ji_xu_liao_tian,
        },
      })
    } catch (cuoWu) {
      debug日志.error('角色接口', '获取角色详情失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

export default luYou
