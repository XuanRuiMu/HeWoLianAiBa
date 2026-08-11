import { Router } from 'express'
import type { Request, Response } from 'express'
import { huoQuFanYi } from '../config/translations'
import { dengLuXianLiu, faSongMaXianLiu } from '../middleware/限流'
import {
  手机号验证中间件,
  用户名验证中间件,
} from '../middleware/输入验证'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import {
  anShouJiHaoChaYongHu,
  anIdChaYongHu,
  zhuCe,
  dengLu,
  gengGaiMiMa,
  gengGaiYongHuMing,
  setMoRenXingBie,
  yanZhengShouJiHaoGeShi,
} from '../services/认证'
import { faSongYanZhengMa } from '../services/短信'
import type { RenZhengQingQiu } from '../middleware/认证'

const luYou = Router()

function huoQuIp(qingQiu: Request): string {
  const xForwardedFor = qingQiu.headers['x-forwarded-for']
  if (typeof xForwardedFor === 'string') {
    return xForwardedFor.split(',')[0].trim()
  }
  return qingQiu.ip || '127.0.0.1'
}

function huoQuShouJiHao(body: Record<string, unknown>): string | undefined {
  return (
    (typeof body.shouJiHao === 'string' ? body.shouJiHao : undefined) ||
    (typeof body.shou_ji_hao === 'string' ? body.shou_ji_hao : undefined)
  )
}

function huoQuYanZhengMa(body: Record<string, unknown>): string | undefined {
  return (
    (typeof body.yanZhengMa === 'string' ? body.yanZhengMa : undefined) ||
    (typeof body.yan_zheng_ma === 'string' ? body.yan_zheng_ma : undefined)
  )
}

function huoQuYongHuMing(body: Record<string, unknown>): string | undefined {
  return (
    (typeof body.yongHuMing === 'string' ? body.yongHuMing : undefined) ||
    (typeof body.yong_hu_ming === 'string' ? body.yong_hu_ming : undefined)
  )
}

function huoQuMiMa(body: Record<string, unknown>): string | undefined {
  return (
    (typeof body.miMa === 'string' ? body.miMa : undefined) ||
    (typeof body.mi_ma === 'string' ? body.mi_ma : undefined)
  )
}

function huoQuTongYiXieYi(body: Record<string, unknown>): boolean | undefined {
  if (typeof body.tongYiXieYi === 'boolean') return body.tongYiXieYi
  if (typeof body.tong_yi_xie_yi === 'boolean') return body.tong_yi_xie_yi
  return undefined
}

luYou.get('/检查手机', async (qingQiu: Request, xiangYing: Response) => {
  const shouJiHao = huoQuShouJiHao(qingQiu.query as Record<string, unknown>)
  if (!shouJiHao || !yanZhengShouJiHaoGeShi(shouJiHao)) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu'))
  }
  const yongHu = await anShouJiHaoChaYongHu(shouJiHao)
  return chengGongXiangYing(xiangYing, { yi_zhu_ce: Boolean(yongHu) })
})

luYou.post('/发送码', faSongMaXianLiu, 手机号验证中间件, async (qingQiu: Request, xiangYing: Response) => {
  const shouJiHao = huoQuShouJiHao(qingQiu.body as Record<string, unknown>)
  if (!shouJiHao || !yanZhengShouJiHaoGeShi(shouJiHao)) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu'))
  }
  const jieGuo = await faSongYanZhengMa(shouJiHao)
  if (!jieGuo.cheng_gong) {
    const zhuangTaiMa = jieGuo.ti_shi?.includes('频繁') ? 429 : 500
    return shiBaiXiangYing(xiangYing, zhuangTaiMa, jieGuo.ti_shi || huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai'))
  }
  return chengGongXiangYing(xiangYing, null)
})

luYou.post('/注册', 手机号验证中间件, 用户名验证中间件, async (qingQiu: Request, xiangYing: Response) => {
  const body = qingQiu.body as Record<string, unknown>
  const shouJiHao = huoQuShouJiHao(body)
  const yanZhengMa = huoQuYanZhengMa(body)
  const yongHuMing = huoQuYongHuMing(body)
  const miMa = huoQuMiMa(body)
  const tongYiXieYi = huoQuTongYiXieYi(body)

  if (!shouJiHao || !yanZhengMa || !yongHuMing || !miMa || tongYiXieYi === undefined) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  const jieGuo = await zhuCe({
    shou_ji_hao: shouJiHao,
    yan_zheng_ma: yanZhengMa,
    yong_hu_ming: yongHuMing,
    mi_ma: miMa,
    tong_yi_xie_yi: tongYiXieYi,
    ip: huoQuIp(qingQiu),
  })

  if (!jieGuo.cheng_gong) {
    const zhuangTaiMa =
      jieGuo.ti_shi === huoQuFanYi('renZheng', 'shouJiHaoYiZhuCe') ? 409 : 400
    return shiBaiXiangYing(xiangYing, zhuangTaiMa, jieGuo.ti_shi || huoQuFanYi('renZheng', 'zhuCeShiBai'))
  }

  return chengGongXiangYing(xiangYing, jieGuo.shu_ju, huoQuFanYi('tongYong', 'caoZuoChengGong'))
})

luYou.post('/登录', dengLuXianLiu, 手机号验证中间件, async (qingQiu: Request, xiangYing: Response) => {
  const body = qingQiu.body as Record<string, unknown>
  const shouJiHao = huoQuShouJiHao(body)
  const miMa = huoQuMiMa(body)

  if (!shouJiHao || !miMa) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  const jieGuo = await dengLu({
    shou_ji_hao: shouJiHao,
    mi_ma: miMa,
    ip: huoQuIp(qingQiu),
  })

  if (!jieGuo.cheng_gong) {
    return shiBaiXiangYing(
      xiangYing,
      jieGuo.zhuang_tai_ma || 400,
      jieGuo.ti_shi || huoQuFanYi('renZheng', 'dengLuShiBai'),
    )
  }

  return chengGongXiangYing(xiangYing, jieGuo.shu_ju, huoQuFanYi('tongYong', 'caoZuoChengGong'))
})

luYou.post('/更改密码', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  }
  const body = qingQiu.body as Record<string, unknown>
  const jiuMiMa =
    (typeof body.jiuMiMa === 'string' ? body.jiuMiMa : undefined) ||
    (typeof body.jiu_mi_ma === 'string' ? body.jiu_mi_ma : undefined)
  const xinMiMa =
    (typeof body.xinMiMa === 'string' ? body.xinMiMa : undefined) ||
    (typeof body.xin_mi_ma === 'string' ? body.xin_mi_ma : undefined)
  const queRenXinMiMa =
    (typeof body.queRenXinMiMa === 'string' ? body.queRenXinMiMa : undefined) ||
    (typeof body.que_ren_xin_mi_ma === 'string' ? body.que_ren_xin_mi_ma : undefined)
  const yanZhengMa = huoQuYanZhengMa(body)

  if (!jiuMiMa || !xinMiMa || !queRenXinMiMa || !yanZhengMa) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  const jieGuo = await gengGaiMiMa({
    yong_hu_id: yongHu.yongHuId,
    shou_ji_hao: yongHu.shouJiHao,
    jiu_mi_ma: jiuMiMa,
    xin_mi_ma: xinMiMa,
    que_ren_xin_mi_ma: queRenXinMiMa,
    yan_zheng_ma: yanZhengMa,
    ip: huoQuIp(qingQiu),
  })

  if (!jieGuo.cheng_gong) {
    return shiBaiXiangYing(xiangYing, 400, jieGuo.ti_shi || huoQuFanYi('renZheng', 'xiuGaiShiBai'))
  }

  return chengGongXiangYing(xiangYing, null, jieGuo.ti_shi)
})

luYou.post('/更改用户名', 用户名验证中间件, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  }
  const body = qingQiu.body as Record<string, unknown>
  const yongHuMing = huoQuYongHuMing(body)
  if (!yongHuMing) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  const jieGuo = await gengGaiYongHuMing({
    yong_hu_id: yongHu.yongHuId,
    yong_hu_ming: yongHuMing,
    ip: huoQuIp(qingQiu),
  })

  if (!jieGuo.cheng_gong) {
    return shiBaiXiangYing(xiangYing, 400, jieGuo.ti_shi || huoQuFanYi('renZheng', 'xiuGaiShiBai'))
  }

  return chengGongXiangYing(xiangYing, { yong_hu_ming: yongHuMing }, jieGuo.ti_shi)
})

luYou.post('/设置默认性别', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  }
  const body = qingQiu.body as Record<string, unknown>
  const moRenXingBie =
    (typeof body.moRenXingBie === 'string' ? body.moRenXingBie : undefined) ||
    (typeof body.mo_ren_xing_bie === 'string' ? body.mo_ren_xing_bie : undefined)
  if (!moRenXingBie) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }
  const jieGuo = await setMoRenXingBie({
    yong_hu_id: yongHu.yongHuId,
    mo_ren_xing_bie: moRenXingBie,
  })
  if (!jieGuo.cheng_gong) {
    return shiBaiXiangYing(xiangYing, 400, jieGuo.ti_shi || huoQuFanYi('renZheng', 'xiuGaiShiBai'))
  }
  return chengGongXiangYing(xiangYing, { yong_hu: jieGuo.yong_hu }, jieGuo.ti_shi)
})

luYou.get('/信息', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  }
  const shuJu = await anIdChaYongHu(yongHu.yongHuId)
  if (!shuJu) {
    return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
  }
  return chengGongXiangYing(xiangYing, shuJu)
})

export default luYou
