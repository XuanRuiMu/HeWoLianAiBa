import { debug日志 } from '../utils/debug日志'
import { Router } from 'express'
import type { Response } from 'express'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { liaoTianXianLiu } from '../middleware/限流'
import { guanLiZhiDuMenKong } from '../middleware/管理员'
import type { RenZhengQingQiu } from '../middleware/认证'
import {
  huoQuGongKaiHaoGanDuXinXi,
  huoQuWanZhengHaoGanDu,
  sheZhiMiJiHaoGanDu,
} from '../services/好感度'

const luYou = Router()

function jieXiZiFuChuan(qingQiuTi: Record<string, unknown>, jian: string, tianChongJian?: string): string {
  const zhi = qingQiuTi[jian]
  if (typeof zhi === 'string') return zhi
  if (tianChongJian && typeof qingQiuTi[tianChongJian] === 'string') return String(qingQiuTi[tianChongJian])
  return ''
}

luYou.get(
  '/:jiaoSeId',
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
      const jieGuo = await huoQuGongKaiHaoGanDuXinXi(yongHu.yongHuId, jiaoSeId)
      if (!jieGuo) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
      }
      return chengGongXiangYing(xiangYing, jieGuo)
    } catch (cuoWu) {
      debug日志.error('好感度接口', '获取好感度失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.get(
  '/:jiaoSeId/详情',
  guanLiZhiDuMenKong,
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
      const jieGuo = await huoQuWanZhengHaoGanDu(yongHu.yongHuId, jiaoSeId)
      if (!jieGuo) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
      }
      return chengGongXiangYing(xiangYing, jieGuo)
    } catch (cuoWu) {
      debug日志.error('好感度接口', '获取好感度详情失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

/**
 * 业务安全：好感度增量的唯一产生路径是服务端 AI 评判（services/好感度评判.ts
 * → services/AI回复调度器.ts）。原 `POST /:jiaoSeId/更新` 把四维增量交给客户端直传，
 * 仅做 ±3 钳制即加权落库，等于给全体登录用户开了一条绕过评判刷满好感的通道，
 * 已整条移除。gengXinHaoGanDu 改为仅供服务端内部调用。
 */

luYou.post(
  '/:jiaoSeId/秘籍',
  liaoTianXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const jiaoSeId = String(qingQiu.params.jiaoSeId || '')
    const qingQiuTi = qingQiu.body as Record<string, unknown>
    const miLing = jieXiZiFuChuan(qingQiuTi, '秘籍', 'mi_ji')

    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const jieGuo = await sheZhiMiJiHaoGanDu(yongHu.yongHuId, jiaoSeId, miLing)
      if (!jieGuo.cheng_gong) {
        return shiBaiXiangYing(xiangYing, jieGuo.zhuang_tai_ma || 400, jieGuo.ti_shi || huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
      }
      return chengGongXiangYing(xiangYing, jieGuo.hao_gan_du)
    } catch (cuoWu) {
      debug日志.error('好感度接口', '秘籍设置好感度失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

export default luYou
