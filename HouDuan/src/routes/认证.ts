import { debug日志 } from '../utils/debug日志'
import { Router } from 'express'
import type { Request, Response } from 'express'
import { huoQuFanYi } from '../config/translations'
import { dengLuXianLiu, dengLuIPLianLiu, faSongMaXianLiu, zhuCeXianLiu, duanXinRiPeiEZhuJi, jianChaShouJiXianLiu, chongZhiMiMaXianLiu, renJiTiaoZhanXianLiu } from '../middleware/限流'
import {
  手机号验证中间件,
  用户名验证中间件 } from '../middleware/输入验证'
import { renJiYanZhengZhongJianJian } from '../middleware/人机验证'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import {
  anShouJiHaoChaYongHu,
  anIdChaYongHu,
  zhuCe,
  dengLu,
  chongZhiMiMa,
  gengGaiMiMa,
  gengGaiYongHuMing,
  setMoRenXingBie,
  setMoRenDuiXiangXingBie,
  yanZhengShouJiHaoGeShi,
  shuaXinLingPai,
  注册失败错误码 } from '../services/认证'
import { faSongYanZhengMa, zhunHuaYanZhengMaYongTu } from '../services/短信'
import { qianFaRenJiTiaoZhan } from '../services/人机验证'
import { 映射登录失败 } from '../services/登录失败'
import { zhuXiaoYongHu } from '../services/账号注销'
import { huoQuZhenShiIP } from '../utils/真实IP'
import { guiYiWeiGuoJiHao } from '../utils/手机号'
import type { RenZhengQingQiu } from '../middleware/认证'
import { CUO_WU_DAI_MA, huoQuCuoWuXianRong, type CuoWuDaiMa } from '../config/错误码注册表'

const luYou = Router()

function jieXiFaSongDaiMa(cuoWuMa: unknown): CuoWuDaiMa {
  return cuoWuMa === 'XIAN_LIU'
    ? CUO_WU_DAI_MA.AUTH_SMS_RATE_LIMITED
    : CUO_WU_DAI_MA.AUTH_SMS_SEND_FAILED
}

function huoQuIp(qingQiu: Request): string {
  return huoQuZhenShiIP(qingQiu)
}

function huoQuShouJiHao(qingQiuTi: Record<string, unknown>): string | undefined {
  return (
    (typeof qingQiuTi.shouJiHao === 'string' ? qingQiuTi.shouJiHao : undefined) ||
    (typeof qingQiuTi.shou_ji_hao === 'string' ? qingQiuTi.shou_ji_hao : undefined)
  )
}

function huoQuYanZhengMa(qingQiuTi: Record<string, unknown>): string | undefined {
  return (
    (typeof qingQiuTi.yanZhengMa === 'string' ? qingQiuTi.yanZhengMa : undefined) ||
    (typeof qingQiuTi.yan_zheng_ma === 'string' ? qingQiuTi.yan_zheng_ma : undefined)
  )
}

function huoQuYongHuMing(qingQiuTi: Record<string, unknown>): string | undefined {
  return (
    (typeof qingQiuTi.yongHuMing === 'string' ? qingQiuTi.yongHuMing : undefined) ||
    (typeof qingQiuTi.yong_hu_ming === 'string' ? qingQiuTi.yong_hu_ming : undefined)
  )
}

function huoQuMiMa(
  qingQiuTi: Record<string, unknown>,
  queRenQianZhu?: string,
): string | undefined {
  const buFen = queRenQianZhu ? `${queRenQianZhu}XinMiMa` : 'MiMa'
  const xianShou =
    (typeof qingQiuTi[buFen] === 'string' ? (qingQiuTi[buFen] as string) : undefined) ??
    (typeof qingQiuTi[huoQuSnake(buFen)] === 'string' ? (qingQiuTi[huoQuSnake(buFen)] as string) : undefined)
  if (xianShou !== undefined) return xianShou
  return (
    (typeof qingQiuTi.miMa === 'string' ? qingQiuTi.miMa : undefined) ||
    (typeof qingQiuTi.mi_ma === 'string' ? qingQiuTi.mi_ma : undefined)
  )
}

function huoQuSnake(camel: string): string {
  return camel.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
}

function huoQuTongYiXieYi(qingQiuTi: Record<string, unknown>): boolean | undefined {
  if (typeof qingQiuTi.tongYiXieYi === 'boolean') return qingQiuTi.tongYiXieYi
  if (typeof qingQiuTi.tong_yi_xie_yi === 'boolean') return qingQiuTi.tong_yi_xie_yi
  return undefined
}

function huoQuChuShengRiQi(qingQiuTi: Record<string, unknown>): string | undefined {
  const zhi =
    (typeof qingQiuTi.chuShengRiQi === 'string' ? qingQiuTi.chuShengRiQi : undefined) ||
    (typeof qingQiuTi.chu_sheng_ri_qi === 'string' ? qingQiuTi.chu_sheng_ri_qi : undefined)
  return zhi && zhi.trim() !== '' ? zhi : undefined
}

luYou.get('/检查手机', jianChaShouJiXianLiu, async (qingQiu: Request, xiangYing: Response) => {
  const shouJiHao = huoQuShouJiHao(qingQiu.query as Record<string, unknown>)
  if (!shouJiHao || !yanZhengShouJiHaoGeShi(shouJiHao)) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu'), CUO_WU_DAI_MA.REQUEST_PARAMETER_INVALID)
  }
  await anShouJiHaoChaYongHu(guiYiWeiGuoJiHao(shouJiHao))
  return chengGongXiangYing(xiangYing, { yi_zhu_ce: true })
})

luYou.get('/人机挑战', renJiTiaoZhanXianLiu, async (qingQiu: Request, xiangYing: Response) => {
  xiangYing.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  xiangYing.setHeader('Pragma', 'no-cache')
  const yongTu = zhunHuaYanZhengMaYongTu((qingQiu.query as Record<string, unknown>).yongTu)
  const tiaoZhan = await qianFaRenJiTiaoZhan(huoQuIp(qingQiu), yongTu)
  if (!tiaoZhan) {
    return shiBaiXiangYing(xiangYing, 503, huoQuFanYi('renZheng', 'renJiYanZhengJiaZaiShiBai'), CUO_WU_DAI_MA.DEPENDENCY_REDIS_UNAVAILABLE)
  }
  return chengGongXiangYing(xiangYing, tiaoZhan)
})

luYou.post('/发送码', 手机号验证中间件, renJiYanZhengZhongJianJian, faSongMaXianLiu, duanXinRiPeiEZhuJi, async (qingQiu: Request, xiangYing: Response) => {
  const shouJiHao = huoQuShouJiHao(qingQiu.body as Record<string, unknown>)
  if (!shouJiHao || !yanZhengShouJiHaoGeShi(shouJiHao)) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu'), CUO_WU_DAI_MA.REQUEST_PARAMETER_INVALID)
  }
  const yongTu = zhunHuaYanZhengMaYongTu((qingQiu.body as Record<string, unknown>).yongTu)
  const jieGuo = await faSongYanZhengMa(guiYiWeiGuoJiHao(shouJiHao), yongTu)
  if (!jieGuo.cheng_gong) {
    return shiBaiXiangYing(xiangYing, 503, jieGuo.ti_shi || huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai'), jieXiFaSongDaiMa(jieGuo.cuo_wu_ma))
  }
  return chengGongXiangYing(xiangYing, null)
})

function huoQuJingWaiBiaoZhi(qingQiuTi: Record<string, unknown>): boolean {
  return qingQiuTi.jingWai === true || qingQiuTi.jing_wai === true
}

luYou.post('/注册', zhuCeXianLiu, 手机号验证中间件, 用户名验证中间件, async (qingQiu: Request, xiangYing: Response) => {
  const qingQiuTi = qingQiu.body as Record<string, unknown>
  const shouJiHao = huoQuShouJiHao(qingQiuTi)
  const yanZhengMa = huoQuYanZhengMa(qingQiuTi)
  const yongHuMing = huoQuYongHuMing(qingQiuTi)
  const miMa = huoQuMiMa(qingQiuTi)
  const tongYiXieYi = huoQuTongYiXieYi(qingQiuTi)
  const chuShengRiQi = huoQuChuShengRiQi(qingQiuTi)
  const jingWai = huoQuJingWaiBiaoZhi(qingQiuTi)

  if (!shouJiHao || !yongHuMing || !miMa || tongYiXieYi === undefined || !chuShengRiQi) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), CUO_WU_DAI_MA.REQUEST_MISSING_PARAMETER)
  }
  if (!jingWai && !yanZhengMa) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), CUO_WU_DAI_MA.REQUEST_MISSING_PARAMETER)
  }

  const guoJiHao = guiYiWeiGuoJiHao(shouJiHao)

  if (!jingWai) {
    const { duanXinRiPeiEYuLan } = await import('../services/短信')
    const peiEYuLan = await duanXinRiPeiEYuLan(guoJiHao, huoQuIp(qingQiu))
    if (!peiEYuLan.yun_xu) {
      return shiBaiXiangYing(xiangYing, 429, peiEYuLan.ti_shi || huoQuFanYi('renZheng', 'duanXinRiPeiEYongJin'), CUO_WU_DAI_MA.AUTH_SMS_RATE_LIMITED)
    }

    const { xingWeiYanZhengXuYao, xingWeiYanZhengXiaoHao } = await import('../services/行为验证')
    if (process.env.FP02_YAN_ZHENG_JI_LU === 'true' && await xingWeiYanZhengXuYao(guoJiHao, huoQuIp(qingQiu))) {
      const pingZheng = typeof qingQiuTi.xingWeiPingZheng === 'string' ? String(qingQiuTi.xingWeiPingZheng) : typeof qingQiuTi.xing_wei_ping_zheng === 'string' ? String(qingQiuTi.xing_wei_ping_zheng) : ''
      const xiaoHao = await xingWeiYanZhengXiaoHao(pingZheng, guoJiHao)
      if (!xiaoHao) {
        return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('renZheng', 'xuXingWeiYanZheng'), CUO_WU_DAI_MA.PERMISSION_DENIED)
      }
    }
  }

  const jieGuo = await zhuCe({
    shou_ji_hao: guoJiHao,
    yan_zheng_ma: yanZhengMa ?? '',
    yong_hu_ming: yongHuMing,
    mi_ma: miMa,
    tong_yi_xie_yi: tongYiXieYi,
    chu_sheng_ri_qi: chuShengRiQi,
    ip: huoQuIp(qingQiu),
    jing_wai: jingWai,
  })

  if (!jieGuo.cheng_gong) {
    const { jiLuZhuCeShiBai } = await import('../services/行为验证')
    await jiLuZhuCeShiBai(guoJiHao, huoQuIp(qingQiu)).catch(() => undefined)
    const daiMa = 注册失败错误码(jieGuo.cuo_wu_ma, jieGuo.juTiYuanYin)
    return shiBaiXiangYing(xiangYing, huoQuCuoWuXianRong(daiMa).httpStatus, '', daiMa)
  }

  return chengGongXiangYing(xiangYing, jieGuo.shu_ju, huoQuFanYi('tongYong', 'caoZuoChengGong'))
})

luYou.post('/登录', dengLuXianLiu, dengLuIPLianLiu, 手机号验证中间件, async (qingQiu: Request, xiangYing: Response) => {
  const qingQiuTi = qingQiu.body as Record<string, unknown>
  const shouJiHao = huoQuShouJiHao(qingQiuTi)
  const miMa = huoQuMiMa(qingQiuTi)

  if (!shouJiHao || !miMa) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), CUO_WU_DAI_MA.REQUEST_MISSING_PARAMETER)
  }

  const jieGuo = await dengLu({
    shou_ji_hao: shouJiHao,
    mi_ma: miMa,
    ip: huoQuIp(qingQiu) })

  if (!jieGuo.cheng_gong) {
    const yingShe = 映射登录失败(jieGuo.cuo_wu_ma)
    return shiBaiXiangYing(
      xiangYing,
      yingShe.状态码,
      '',
      yingShe.错误码,
    )
  }

  return chengGongXiangYing(xiangYing, jieGuo.shu_ju, huoQuFanYi('tongYong', 'caoZuoChengGong'))
})

luYou.post('/刷新', async (qingQiu: Request, xiangYing: Response) => {
  const qingQiuTi = qingQiu.body as Record<string, unknown>
  const refreshToken =
    (typeof qingQiuTi.refresh_token === 'string' ? qingQiuTi.refresh_token : undefined) ||
    (typeof qingQiuTi.refreshToken === 'string' ? qingQiuTi.refreshToken : undefined) ||
    (typeof qingQiuTi.refreshTokenId === 'string' ? qingQiuTi.refreshTokenId : undefined) ||
    (typeof qingQiuTi.refresh_token_id === 'string' ? qingQiuTi.refresh_token_id : undefined)

  if (!refreshToken) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), CUO_WU_DAI_MA.REQUEST_MISSING_PARAMETER)
  }

  const jieGuo = await shuaXinLingPai(refreshToken)
  if (!jieGuo.cheng_gong) {
    return shiBaiXiangYing(xiangYing, 401, jieGuo.ti_shi || huoQuFanYi('tongYong', 'weiShouQuan'), CUO_WU_DAI_MA.AUTH_REFRESH_TOKEN_INVALID)
  }

  return chengGongXiangYing(xiangYing, jieGuo.shu_ju, huoQuFanYi('tongYong', 'caoZuoChengGong'))
})

luYou.post('/吊销刷新令牌', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CUO_WU_DAI_MA.AUTHENTICATION_REQUIRED)
  }
  const qingQiuTi = qingQiu.body as Record<string, unknown>
  const refreshTokenId =
    (typeof qingQiuTi.refreshTokenId === 'string' ? qingQiuTi.refreshTokenId : undefined) ||
    (typeof qingQiuTi.refresh_token_id === 'string' ? qingQiuTi.refresh_token_id : undefined)

  if (refreshTokenId) {
    const { shanChuRefreshToken } = await import('../utils/jwt')
    await shanChuRefreshToken(refreshTokenId, yongHu.yongHuId)
  } else {
    const { cheXiaoYongHuSuoYouRefreshToken } = await import('../utils/jwt')
    await cheXiaoYongHuSuoYouRefreshToken(yongHu.yongHuId)
  }
  return chengGongXiangYing(xiangYing, null, huoQuFanYi('tongYong', 'caoZuoChengGong'))
})

luYou.post('/重置密码', chongZhiMiMaXianLiu, duanXinRiPeiEZhuJi, 手机号验证中间件, async (qingQiu: Request, xiangYing: Response) => {
  const qingQiuTi = qingQiu.body as Record<string, unknown>
  const shouJiHao = huoQuShouJiHao(qingQiuTi)
  const yanZhengMa = huoQuYanZhengMa(qingQiuTi)
  const xinMiMa = huoQuMiMa(qingQiuTi)
  const queRenXinMiMa = huoQuMiMa(qingQiuTi, 'queRen')

  if (!shouJiHao || !yanZhengMa || !xinMiMa || !queRenXinMiMa) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), CUO_WU_DAI_MA.REQUEST_MISSING_PARAMETER)
  }

  const jieGuo = await chongZhiMiMa({
    shou_ji_hao: shouJiHao,
    yan_zheng_ma: yanZhengMa,
    xin_mi_ma: xinMiMa,
    que_ren_xin_mi_ma: queRenXinMiMa,
    ip: huoQuZhenShiIP(qingQiu),
  })

  if (!jieGuo.cheng_gong) {
    return shiBaiXiangYing(xiangYing, 400, jieGuo.ti_shi || huoQuFanYi('renZheng', 'chongZhiMiMaTongYiTiShi'), CUO_WU_DAI_MA.AUTH_PASSWORD_RESET_FAILED)
  }

  return chengGongXiangYing(xiangYing, null, jieGuo.ti_shi)
})

luYou.post('/更改密码', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CUO_WU_DAI_MA.AUTHENTICATION_REQUIRED)
  }
  const qingQiuTi = qingQiu.body as Record<string, unknown>
  const jiuMiMa =
    (typeof qingQiuTi.jiuMiMa === 'string' ? qingQiuTi.jiuMiMa : undefined) ||
    (typeof qingQiuTi.jiu_mi_ma === 'string' ? qingQiuTi.jiu_mi_ma : undefined)
  const xinMiMa =
    (typeof qingQiuTi.xinMiMa === 'string' ? qingQiuTi.xinMiMa : undefined) ||
    (typeof qingQiuTi.xin_mi_ma === 'string' ? qingQiuTi.xin_mi_ma : undefined)
  const queRenXinMiMa =
    (typeof qingQiuTi.queRenXinMiMa === 'string' ? qingQiuTi.queRenXinMiMa : undefined) ||
    (typeof qingQiuTi.que_ren_xin_mi_ma === 'string' ? qingQiuTi.que_ren_xin_mi_ma : undefined)
  const yanZhengMa = huoQuYanZhengMa(qingQiuTi)

  if (!jiuMiMa || !xinMiMa || !queRenXinMiMa || !yanZhengMa) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), CUO_WU_DAI_MA.REQUEST_MISSING_PARAMETER)
  }

  const jieGuo = await gengGaiMiMa({
    yong_hu_id: yongHu.yongHuId,
    shou_ji_hao: '',
    jiu_mi_ma: jiuMiMa,
    xin_mi_ma: xinMiMa,
    que_ren_xin_mi_ma: queRenXinMiMa,
    yan_zheng_ma: yanZhengMa,
    ip: huoQuIp(qingQiu) })

  if (!jieGuo.cheng_gong) {
    return shiBaiXiangYing(xiangYing, 400, jieGuo.ti_shi || huoQuFanYi('renZheng', 'xiuGaiShiBai'), CUO_WU_DAI_MA.AUTH_PASSWORD_CHANGE_FAILED)
  }

  return chengGongXiangYing(xiangYing, null, jieGuo.ti_shi)
})

luYou.post('/更改用户名', 用户名验证中间件, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CUO_WU_DAI_MA.AUTHENTICATION_REQUIRED)
  }
  const qingQiuTi = qingQiu.body as Record<string, unknown>
  const yongHuMing = huoQuYongHuMing(qingQiuTi)
  if (!yongHuMing) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), CUO_WU_DAI_MA.REQUEST_MISSING_PARAMETER)
  }

  const jieGuo = await gengGaiYongHuMing({
    yong_hu_id: yongHu.yongHuId,
    yong_hu_ming: yongHuMing,
    ip: huoQuIp(qingQiu) })

  if (!jieGuo.cheng_gong) {
    return shiBaiXiangYing(xiangYing, 400, jieGuo.ti_shi || huoQuFanYi('renZheng', 'xiuGaiShiBai'), CUO_WU_DAI_MA.AUTH_USERNAME_CHANGE_FAILED)
  }

  return chengGongXiangYing(xiangYing, { yong_hu_ming: yongHuMing }, jieGuo.ti_shi)
})

luYou.post('/设置默认性别', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CUO_WU_DAI_MA.AUTHENTICATION_REQUIRED)
  }
  const qingQiuTi = qingQiu.body as Record<string, unknown>
  const moRenXingBie =
    (typeof qingQiuTi.moRenXingBie === 'string' ? qingQiuTi.moRenXingBie : undefined) ||
    (typeof qingQiuTi.mo_ren_xing_bie === 'string' ? qingQiuTi.mo_ren_xing_bie : undefined)
  if (!moRenXingBie) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), CUO_WU_DAI_MA.REQUEST_MISSING_PARAMETER)
  }
  const jieGuo = await setMoRenXingBie({
    yong_hu_id: yongHu.yongHuId,
    mo_ren_xing_bie: moRenXingBie })
  if (!jieGuo.cheng_gong) {
    return shiBaiXiangYing(xiangYing, 400, jieGuo.ti_shi || huoQuFanYi('renZheng', 'xiuGaiShiBai'), CUO_WU_DAI_MA.AUTH_DEFAULT_GENDER_INVALID)
  }
  return chengGongXiangYing(xiangYing, { yong_hu: jieGuo.yong_hu }, jieGuo.ti_shi)
})

luYou.post('/设置默认对象性别', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CUO_WU_DAI_MA.AUTHENTICATION_REQUIRED)
  }
  const qingQiuTi = qingQiu.body as Record<string, unknown>
  const moRenDuiXiang =
    (typeof qingQiuTi.moRenDuiXiangXingBie === 'string' ? qingQiuTi.moRenDuiXiangXingBie : undefined) ||
    (typeof qingQiuTi.mo_ren_dui_xiang_xing_bie === 'string' ? qingQiuTi.mo_ren_dui_xiang_xing_bie : undefined)
  if (!moRenDuiXiang) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), CUO_WU_DAI_MA.REQUEST_MISSING_PARAMETER)
  }
  const jieGuo = await setMoRenDuiXiangXingBie({
    yong_hu_id: yongHu.yongHuId,
    mo_ren_dui_xiang_xing_bie: moRenDuiXiang })
  if (!jieGuo.cheng_gong) {
    return shiBaiXiangYing(xiangYing, 400, jieGuo.ti_shi || huoQuFanYi('renZheng', 'xiuGaiShiBai'), CUO_WU_DAI_MA.AUTH_DEFAULT_GENDER_INVALID)
  }
  return chengGongXiangYing(xiangYing, { yong_hu: jieGuo.yong_hu }, jieGuo.ti_shi)
})

luYou.get('/信息', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CUO_WU_DAI_MA.AUTHENTICATION_REQUIRED)
  }
  const shuJu = await anIdChaYongHu(yongHu.yongHuId)
  if (!shuJu) {
    return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'), CUO_WU_DAI_MA.RESOURCE_NOT_FOUND)
  }
  return chengGongXiangYing(xiangYing, shuJu)
})

luYou.delete('/注销', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CUO_WU_DAI_MA.AUTHENTICATION_REQUIRED)
  }

  const authorization = qingQiu.headers.authorization || ''
  const lingPai = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''

  try {
    const jieGuo = await zhuXiaoYongHu(yongHu.yongHuId, lingPai, huoQuIp(qingQiu))
    if (!jieGuo.cheng_gong) {
      return shiBaiXiangYing(xiangYing, 400, jieGuo.ti_shi || huoQuFanYi('renZheng', 'xiuGaiShiBai'), CUO_WU_DAI_MA.AUTH_ACCOUNT_DELETION_FAILED)
    }
    return chengGongXiangYing(xiangYing, {}, jieGuo.ti_shi)
  } catch (cuoWu) {
    debug日志.error('认证接口', '账号注销失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 503, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'), CUO_WU_DAI_MA.AUTH_ACCOUNT_DELETION_FAILED)
  }
})

export default luYou
