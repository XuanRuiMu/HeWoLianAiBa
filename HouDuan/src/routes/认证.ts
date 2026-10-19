import { debug日志 } from '../utils/debug日志'
import { Router } from 'express'
import type { Request, Response } from 'express'
import { huoQuFanYi } from '../config/translations'
import { dengLuXianLiu, dengLuIPLianLiu, faSongMaXianLiu, zhuCeXianLiu, duanXinRiPeiEZhuJi, jianChaShouJiXianLiu, chongZhiMiMaXianLiu } from '../middleware/限流'
import {
  手机号验证中间件,
  用户名验证中间件 } from '../middleware/输入验证'
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
  shuaXinLingPai } from '../services/认证'
import { faSongYanZhengMa, zhunHuaYanZhengMaYongTu } from '../services/短信'
import { zhuXiaoYongHu } from '../services/账号注销'
import { huoQuZhenShiIP } from '../utils/真实IP'
import type { RenZhengQingQiu } from '../middleware/认证'
import { CUO_WU_DAI_MA, type CuoWuDaiMa } from '../config/错误码注册表'

const luYou = Router()

function jieXiFaSongDaiMa(cuoWuMa: unknown): CuoWuDaiMa {
  return cuoWuMa === 'XIAN_LIU'
    ? CUO_WU_DAI_MA.AUTH_SMS_RATE_LIMITED
    : CUO_WU_DAI_MA.AUTH_SMS_SEND_FAILED
}

function jieXiZhuCeDaiMa(cuoWuMa: unknown): CuoWuDaiMa {
  if (cuoWuMa === 'CHONG_TU') return CUO_WU_DAI_MA.AUTH_ACCOUNT_ALREADY_EXISTS
  if (cuoWuMa === 'XIAN_LIU') return CUO_WU_DAI_MA.AUTH_REGISTRATION_CLOSED
  if (cuoWuMa === 'NEI_BU_CUO_WU') return CUO_WU_DAI_MA.AUTH_REGISTRATION_FAILED
  return CUO_WU_DAI_MA.REQUEST_PARAMETER_INVALID
}

function huoQuIp(qingQiu: Request): string {
  // A2：审计/封禁场景一律使用可信链路推导的真实来源 IP，不解析客户端可控 XFF
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

/** camelCase 与 snake_case 双读：前后端各写一种，两边都不能只认自己那套。
 *  queRenQianZhu='queRen' 时取 queRenXinMiMa / que_ren_xin_mi_ma。 */
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

/** camelCase → snake_case（MiMa → mi_ma，queRenXinMiMa → que_ren_xin_mi_ma） */
function huoQuSnake(camel: string): string {
  return camel.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
}

function huoQuTongYiXieYi(qingQiuTi: Record<string, unknown>): boolean | undefined {
  if (typeof qingQiuTi.tongYiXieYi === 'boolean') return qingQiuTi.tongYiXieYi
  if (typeof qingQiuTi.tong_yi_xie_yi === 'boolean') return qingQiuTi.tong_yi_xie_yi
  return undefined
}

// C5 未成年人保护：注册必须携带出生日期（YYYY-MM-DD）
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
  // YH-028 注册状态模糊响应：存在与不存在返回同一成功形态，不再明文枚举
  await anShouJiHaoChaYongHu(shouJiHao)
  return chengGongXiangYing(xiangYing, { yi_zhu_ce: true })
})

luYou.post('/发送码', faSongMaXianLiu, duanXinRiPeiEZhuJi, 手机号验证中间件, async (qingQiu: Request, xiangYing: Response) => {
  const shouJiHao = huoQuShouJiHao(qingQiu.body as Record<string, unknown>)
  if (!shouJiHao || !yanZhengShouJiHaoGeShi(shouJiHao)) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu'), CUO_WU_DAI_MA.REQUEST_PARAMETER_INVALID)
  }
  const yongTu = zhunHuaYanZhengMaYongTu((qingQiu.body as Record<string, unknown>).yongTu)
  const jieGuo = await faSongYanZhengMa(shouJiHao, yongTu)
  if (!jieGuo.cheng_gong) {
    // YH-025 结构化错误码映射：service返错误码路由只映射，禁文案子串定状态码
    return shiBaiXiangYing(xiangYing, 503, jieGuo.ti_shi || huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai'), jieXiFaSongDaiMa(jieGuo.cuo_wu_ma))
  }
  return chengGongXiangYing(xiangYing, null)
})

luYou.post('/注册', zhuCeXianLiu, 手机号验证中间件, 用户名验证中间件, async (qingQiu: Request, xiangYing: Response) => {
  const qingQiuTi = qingQiu.body as Record<string, unknown>
  const shouJiHao = huoQuShouJiHao(qingQiuTi)
  const yanZhengMa = huoQuYanZhengMa(qingQiuTi)
  const yongHuMing = huoQuYongHuMing(qingQiuTi)
  const miMa = huoQuMiMa(qingQiuTi)
  const tongYiXieYi = huoQuTongYiXieYi(qingQiuTi)
  const chuShengRiQi = huoQuChuShengRiQi(qingQiuTi)

  if (!shouJiHao || !yanZhengMa || !yongHuMing || !miMa || tongYiXieYi === undefined || !chuShengRiQi) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), CUO_WU_DAI_MA.REQUEST_MISSING_PARAMETER)
  }

  // YH-011 发码配额联动：注册前按手机号复核日配额（换路径换键也绕不过手机号配额）
  const { duanXinRiPeiEYuLan } = await import('../services/短信')
  const peiEYuLan = await duanXinRiPeiEYuLan(shouJiHao, huoQuIp(qingQiu))
  if (!peiEYuLan.yun_xu) {
    return shiBaiXiangYing(xiangYing, 429, peiEYuLan.ti_shi || huoQuFanYi('renZheng', 'duanXinRiPeiEYongJin'), CUO_WU_DAI_MA.AUTH_SMS_RATE_LIMITED)
  }

  // YH-011 行为验证码：同一手机号/IP累计失败达阈值后必须携带通过凭证
  // vitest 下默认关闭联动计数（防跨文件共享Redis误伤），FP02单测显式开FP02_YAN_ZHENG_JI_LU覆盖
  const { xingWeiYanZhengXuYao, xingWeiYanZhengXiaoHao } = await import('../services/行为验证')
  if (process.env.FP02_YAN_ZHENG_JI_LU === 'true' && await xingWeiYanZhengXuYao(shouJiHao, huoQuIp(qingQiu))) {
    const pingZheng = typeof qingQiuTi.xingWeiPingZheng === 'string' ? String(qingQiuTi.xingWeiPingZheng) : typeof qingQiuTi.xing_wei_ping_zheng === 'string' ? String(qingQiuTi.xing_wei_ping_zheng) : ''
    const xiaoHao = await xingWeiYanZhengXiaoHao(pingZheng, shouJiHao)
    if (!xiaoHao) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('renZheng', 'xuXingWeiYanZheng'), CUO_WU_DAI_MA.PERMISSION_DENIED)
    }
  }

  const jieGuo = await zhuCe({
    shou_ji_hao: shouJiHao,
    yan_zheng_ma: yanZhengMa,
    yong_hu_ming: yongHuMing,
    mi_ma: miMa,
    tong_yi_xie_yi: tongYiXieYi,
    chu_sheng_ri_qi: chuShengRiQi,
    ip: huoQuIp(qingQiu) })

  if (!jieGuo.cheng_gong) {
    const { jiLuZhuCeShiBai } = await import('../services/行为验证')
    await jiLuZhuCeShiBai(shouJiHao, huoQuIp(qingQiu)).catch(() => undefined)
    // YH-025 结构化错误码映射：service返错误码路由只映射，禁文案子串定状态码
    return shiBaiXiangYing(xiangYing, 503, jieGuo.ti_shi || huoQuFanYi('renZheng', 'zhuCeShiBai'), jieXiZhuCeDaiMa(jieGuo.cuo_wu_ma))
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
    return shiBaiXiangYing(
      xiangYing,
      401,
      jieGuo.ti_shi || huoQuFanYi('renZheng', 'dengLuShiBai'),
      CUO_WU_DAI_MA.AUTH_INVALID_CREDENTIALS,
    )
  }

  return chengGongXiangYing(xiangYing, jieGuo.shu_ju, huoQuFanYi('tongYong', 'caoZuoChengGong'))
})

// C4：刷新 access token（使用 refresh token）
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

// C4：吊销 refresh token（登出时调用）
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
    // 吊销该用户所有 refresh token
    const { cheXiaoYongHuSuoYouRefreshToken } = await import('../utils/jwt')
    await cheXiaoYongHuSuoYouRefreshToken(yongHu.yongHuId)
  }
  return chengGongXiangYing(xiangYing, null, huoQuFanYi('tongYong', 'caoZuoChengGong'))
})

// 「忘记密码」重置：免登录入口（公开白名单），安全靠「重置用途验证码 + 账号维度限流」，
// 对外一律不区分「号码未注册」与「验证码错」，避免变成账号探测接口。
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

/* FP-ZJ3 默认对象性别写口：复用目标性别列，不新增对象默认列。
   仅作普通模式第二步的系统默认预选项；挑战/角色判定一律以开赛与建角入参为准 */
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

// C3 账号注销：匿名化用户 + 级联清理关联数据 + 清理磁盘媒体 + 吊销当前 JWT
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
