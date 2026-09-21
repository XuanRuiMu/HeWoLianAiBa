import { debug日志 } from '../utils/debug日志'
import { Router } from 'express'
import type { Request, Response } from 'express'
import { huoQuFanYi } from '../config/translations'
import { dengLuXianLiu, dengLuIPLianLiu, faSongMaXianLiu, zhuCeXianLiu, duanXinRiPeiEZhuJi, jianChaShouJiXianLiu } from '../middleware/限流'
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
  shuaXinLingPai,
  zhuXiaoLingPai,
} from '../services/认证'
import { faSongYanZhengMa } from '../services/短信'
import { zhuXiaoYongHu } from '../services/账号注销'
import { huoQuZhenShiIP } from '../utils/真实IP'
import type { RenZhengQingQiu } from '../middleware/认证'

const luYou = Router()

function huoQuIp(qingQiu: Request): string {
  // A2：审计/封禁场景一律使用可信链路推导的真实来源 IP，不解析客户端可控 XFF
  return huoQuZhenShiIP(qingQiu)
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

// C5 未成年人保护：注册必须携带出生日期（YYYY-MM-DD）
function huoQuChuShengRiQi(body: Record<string, unknown>): string | undefined {
  const zhi =
    (typeof body.chuShengRiQi === 'string' ? body.chuShengRiQi : undefined) ||
    (typeof body.chu_sheng_ri_qi === 'string' ? body.chu_sheng_ri_qi : undefined)
  return zhi && zhi.trim() !== '' ? zhi : undefined
}

luYou.get('/检查手机', jianChaShouJiXianLiu, async (qingQiu: Request, xiangYing: Response) => {
  const shouJiHao = huoQuShouJiHao(qingQiu.query as Record<string, unknown>)
  if (!shouJiHao || !yanZhengShouJiHaoGeShi(shouJiHao)) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu'), 'CAN_SHU_CUO_WU')
  }
  // YH-028 注册状态模糊响应：存在与不存在返回同一成功形态，不再明文枚举
  await anShouJiHaoChaYongHu(shouJiHao)
  return chengGongXiangYing(xiangYing, { yi_zhu_ce: true })
})

luYou.post('/发送码', faSongMaXianLiu, duanXinRiPeiEZhuJi, 手机号验证中间件, async (qingQiu: Request, xiangYing: Response) => {
  const shouJiHao = huoQuShouJiHao(qingQiu.body as Record<string, unknown>)
  if (!shouJiHao || !yanZhengShouJiHaoGeShi(shouJiHao)) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu'))
  }
  const jieGuo = await faSongYanZhengMa(shouJiHao)
  if (!jieGuo.cheng_gong) {
    // YH-025 结构化错误码映射：service返错误码路由只映射，禁文案子串定状态码
    const zhuangTaiMa = jieGuo.cuo_wu_ma === 'XIAN_LIU' ? 429 : 500
    return shiBaiXiangYing(xiangYing, zhuangTaiMa, jieGuo.ti_shi || huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai'), jieGuo.cuo_wu_ma)
  }
  return chengGongXiangYing(xiangYing, null)
})

luYou.post('/注册', zhuCeXianLiu, 手机号验证中间件, 用户名验证中间件, async (qingQiu: Request, xiangYing: Response) => {
  const body = qingQiu.body as Record<string, unknown>
  const shouJiHao = huoQuShouJiHao(body)
  const yanZhengMa = huoQuYanZhengMa(body)
  const yongHuMing = huoQuYongHuMing(body)
  const miMa = huoQuMiMa(body)
  const tongYiXieYi = huoQuTongYiXieYi(body)
  const chuShengRiQi = huoQuChuShengRiQi(body)

  if (!shouJiHao || !yanZhengMa || !yongHuMing || !miMa || tongYiXieYi === undefined || !chuShengRiQi) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  // YH-011 发码配额联动：注册前按手机号复核日配额（换路径换键也绕不过手机号配额）
  const { duanXinRiPeiEYuLan } = await import('../services/短信')
  const peiEYuLan = await duanXinRiPeiEYuLan(shouJiHao, huoQuIp(qingQiu))
  if (!peiEYuLan.yun_xu) {
    return shiBaiXiangYing(xiangYing, 429, peiEYuLan.ti_shi || huoQuFanYi('renZheng', 'duanXinRiPeiEYongJin'))
  }

  // YH-011 行为验证码：同一手机号/IP累计失败达阈值后必须携带通过凭证
  // vitest 下默认关闭联动计数（防跨文件共享Redis误伤），FP02单测显式开FP02_YAN_ZHENG_JI_LU覆盖
  const { xingWeiYanZhengXuYao, xingWeiYanZhengXiaoHao } = await import('../services/行为验证')
  if (process.env.FP02_YAN_ZHENG_JI_LU === 'true' && await xingWeiYanZhengXuYao(shouJiHao, huoQuIp(qingQiu))) {
    const pingZheng = typeof body.xingWeiPingZheng === 'string' ? String(body.xingWeiPingZheng) : typeof body.xing_wei_ping_zheng === 'string' ? String(body.xing_wei_ping_zheng) : ''
    const xiaoHao = await xingWeiYanZhengXiaoHao(pingZheng, shouJiHao)
    if (!xiaoHao) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('renZheng', 'xuXingWeiYanZheng'))
    }
  }

  const jieGuo = await zhuCe({
    shou_ji_hao: shouJiHao,
    yan_zheng_ma: yanZhengMa,
    yong_hu_ming: yongHuMing,
    mi_ma: miMa,
    tong_yi_xie_yi: tongYiXieYi,
    chu_sheng_ri_qi: chuShengRiQi,
    ip: huoQuIp(qingQiu),
  })

  if (!jieGuo.cheng_gong) {
    const { jiLuZhuCeShiBai } = await import('../services/行为验证')
    await jiLuZhuCeShiBai(shouJiHao, huoQuIp(qingQiu)).catch(() => undefined)
    // YH-025 结构化错误码映射：service返错误码路由只映射，禁文案子串定状态码
    const cuoWuMaYingShe: Record<string, number> = { CHONG_TU: 409, XIAN_LIU: 429, NEI_BU_CUO_WU: 500 }
    const zhuangTaiMa = cuoWuMaYingShe[jieGuo.cuo_wu_ma || ''] ?? 400
    return shiBaiXiangYing(xiangYing, zhuangTaiMa, jieGuo.ti_shi || huoQuFanYi('renZheng', 'zhuCeShiBai'), jieGuo.cuo_wu_ma)
  }

  return chengGongXiangYing(xiangYing, jieGuo.shu_ju, huoQuFanYi('tongYong', 'caoZuoChengGong'))
})

luYou.post('/登录', dengLuXianLiu, dengLuIPLianLiu, 手机号验证中间件, async (qingQiu: Request, xiangYing: Response) => {
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

// C4：刷新 access token（使用 refresh token）
luYou.post('/刷新', async (qingQiu: Request, xiangYing: Response) => {
  const body = qingQiu.body as Record<string, unknown>
  const refreshToken =
    (typeof body.refresh_token === 'string' ? body.refresh_token : undefined) ||
    (typeof body.refreshToken === 'string' ? body.refreshToken : undefined) ||
    (typeof body.refreshTokenId === 'string' ? body.refreshTokenId : undefined) ||
    (typeof body.refresh_token_id === 'string' ? body.refresh_token_id : undefined)

  if (!refreshToken) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  const jieGuo = await shuaXinLingPai(refreshToken)
  if (!jieGuo.cheng_gong) {
    return shiBaiXiangYing(xiangYing, 401, jieGuo.ti_shi || huoQuFanYi('tongYong', 'weiShouQuan'))
  }

  return chengGongXiangYing(xiangYing, jieGuo.shu_ju, huoQuFanYi('tongYong', 'caoZuoChengGong'))
})

// C4：吊销 refresh token（登出时调用）
luYou.post('/吊销刷新令牌', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  }
  const body = qingQiu.body as Record<string, unknown>
  const refreshTokenId =
    (typeof body.refreshTokenId === 'string' ? body.refreshTokenId : undefined) ||
    (typeof body.refresh_token_id === 'string' ? body.refresh_token_id : undefined)

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
    shou_ji_hao: '',
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

// C3 账号注销：匿名化用户 + 级联清理关联数据 + 清理磁盘媒体 + 吊销当前 JWT
luYou.delete('/注销', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  }

  const authorization = qingQiu.headers.authorization || ''
  const lingPai = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''

  try {
    const jieGuo = await zhuXiaoYongHu(yongHu.yongHuId, lingPai, huoQuIp(qingQiu))
    if (!jieGuo.cheng_gong) {
      return shiBaiXiangYing(xiangYing, 400, jieGuo.ti_shi || huoQuFanYi('renZheng', 'xiuGaiShiBai'))
    }
    return chengGongXiangYing(xiangYing, {}, jieGuo.ti_shi)
  } catch (cuoWu) {
    debug日志.error('认证接口', '账号注销失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

export default luYou
