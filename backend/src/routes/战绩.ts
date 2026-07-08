import { Router } from 'express'
import type { Response } from 'express'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { changGuiXianLiu } from '../middleware/限流'
import type { RenZhengQingQiu } from '../middleware/认证'
import { huoQuDangAnLieBiao, huoQuDangAnXiangQing } from '../services/战绩'
import { shengChengFuPan } from '../services/复盘'
import { pingGuLiaoTianShuiPing, huoQuPingGuLiShi } from '../services/评估'
import { huoQuJunShiJiLuLieBiao, type JunShiJiLuXiang } from '../services/军师缓存'
import { HAO_GAN_DU_PEI_ZHI } from '../config/好感度配置'

const luYou = Router()

function jieXiZiFuChuan(body: Record<string, unknown>, jian: string, tianChongJian?: string): string {
  const zhi = body[jian]
  if (typeof zhi === 'string') return zhi
  if (tianChongJian && typeof body[tianChongJian] === 'string') return String(body[tianChongJian])
  return ''
}

interface QianDuanJunShiZhiDaoJiLu {
  shi_jian: string
  jiao_se_ming_zi: string
  jun_shi_ming_chen: string
  jian_yi: string
  dui_hua_zhai_yao: string
  hao_gan_du_kuai_zhao: {
    zongFen: number
    xinRenDu: number
    qinMiDu: number
    quWeiDu: number
    guanHuaiDu: number
    guanXiJieDuan: string
    guanXiJieDuanMingCheng: string
  } | null
}

function zhuanHuanJunShiJiLu(ji_lu: JunShiJiLuXiang): QianDuanJunShiZhiDaoJiLu {
  const haoGanDu = ji_lu.hou_tai_shu_ju?.hao_gan_du
  const jieDuan = haoGanDu?.guan_xi_jie_duan || ''
  return {
    shi_jian: ji_lu.shi_jian,
    jiao_se_ming_zi: ji_lu.jiao_se_ming_zi,
    jun_shi_ming_chen: ji_lu.jun_shi_ming_chen,
    jian_yi: ji_lu.jian_yi,
    dui_hua_zhai_yao: ji_lu.dui_hua_zhai_yao,
    hao_gan_du_kuai_zhao: haoGanDu
      ? {
          zongFen: haoGanDu.zong_fen,
          xinRenDu: haoGanDu.xin_ren_du,
          qinMiDu: haoGanDu.qin_mi_du,
          quWeiDu: haoGanDu.qu_wei_du,
          guanHuaiDu: haoGanDu.guan_huai_du,
          guanXiJieDuan: jieDuan,
          guanXiJieDuanMingCheng: HAO_GAN_DU_PEI_ZHI.jieDuan[jieDuan]?.jieDuanMing || jieDuan,
        }
      : null,
  }
}

luYou.get(
  '/列表',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    try {
      const lieBiao = await huoQuDangAnLieBiao(yongHu.yongHuId)
      return chengGongXiangYing(xiangYing, { dangAnLieBiao: lieBiao })
    } catch (cuoWu) {
      console.error('获取战绩列表失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.get(
  '/详情/:dangAnId',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const dangAnId = String(qingQiu.params.dangAnId || '')
    if (!dangAnId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const dangAn = await huoQuDangAnXiangQing(yongHu.yongHuId, dangAnId)
      if (!dangAn) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
      }
      return chengGongXiangYing(xiangYing, dangAn)
    } catch (cuoWu) {
      console.error('获取战绩详情失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.get(
  '/复盘/:dangAnId',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const dangAnId = String(qingQiu.params.dangAnId || '')
    if (!dangAnId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const dangAn = await huoQuDangAnXiangQing(yongHu.yongHuId, dangAnId)
      if (!dangAn) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
      }

      const junShiJiLu = await huoQuJunShiJiLuLieBiao(yongHu.yongHuId, dangAn.jiao_se_id)
      const qianDuanJunShiJiLu = junShiJiLu.map(zhuanHuanJunShiJiLu)

      if (!dangAn.fu_pan_nei_rong) {
        void shengChengFuPan(yongHu.yongHuId, dangAn.jiao_se_id, dangAnId)
        return chengGongXiangYing(xiangYing, {
          fu_pan_nei_rong: null,
          fu_pan_shi_jian_xian: [],
          jun_shi_zhi_dao_ji_lu: qianDuanJunShiJiLu,
          jia_zai_zhong: true,
        })
      }

      return chengGongXiangYing(xiangYing, {
        fu_pan_nei_rong: dangAn.fu_pan_nei_rong,
        fu_pan_shi_jian_xian: dangAn.fu_pan_shu_ju,
        jun_shi_zhi_dao_ji_lu: qianDuanJunShiJiLu,
        jia_zai_zhong: false,
      })
    } catch (cuoWu) {
      console.error('获取复盘失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.post(
  '/评估/聊天水平',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const body = qingQiu.body as Record<string, unknown>
    const jiaoSeId = jieXiZiFuChuan(body, 'jiaoSeId', 'jiao_se_id')

    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const jieGuo = await pingGuLiaoTianShuiPing(yongHu.yongHuId, jiaoSeId)
      return chengGongXiangYing(xiangYing, jieGuo)
    } catch (cuoWu) {
      console.error('评估聊天水平失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.get(
  '/评估/聊天水平',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const jiaoSeId = String(qingQiu.query.jiaoSeId || qingQiu.query.jiao_se_id || '')
    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const liShi = await huoQuPingGuLiShi(yongHu.yongHuId, jiaoSeId)
      return chengGongXiangYing(xiangYing, liShi)
    } catch (cuoWu) {
      console.error('获取评估历史失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

export default luYou
