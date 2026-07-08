import { Router } from 'express'
import type { Request, Response } from 'express'
import { huoQuFanYi } from '../config/translations'
import { yanZhengGuanLiYuan } from '../middleware/管理员'
import { guanLiCaoZuoXianLiu } from '../middleware/限流'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { jiLuShenJiRiZhi } from '../services/审计日志'
import {
  huoQuYongHuLieBiao,
  huoQuDuiHuaLieBiao,
  huoQuDuiHuaXiangQing,
  huoQuJiaoSeXinXi,
  chuangJianCeShiYongHu,
  dengLuCeShiYongHu,
  shanChuYongHu,
  huoQuXiTongZhuangTai,
} from '../services/管理员'
import { jiLuDuoShe, jieShuDuoShe, huoQuJiaoSeYongHuId, sheZhiDuoSheZhuangTai } from '../services/夺舍'
import { zhongDuanJiaoSeTiaoDuQi } from '../socket/聊天'
import type { RenZhengQingQiu } from '../middleware/认证'

const luYou = Router()

function huoQuIp(qingQiu: Request): string {
  const xForwardedFor = qingQiu.headers['x-forwarded-for']
  if (typeof xForwardedFor === 'string') {
    return xForwardedFor.split(',')[0].trim()
  }
  return qingQiu.ip || '127.0.0.1'
}

function huoQuZiFuChuan(
  body: Record<string, unknown>,
  jian: string,
  tianChongJian?: string,
): string {
  const zhi = body[jian]
  if (typeof zhi === 'string') return zhi
  if (tianChongJian && typeof body[tianChongJian] === 'string') return String(body[tianChongJian])
  return ''
}

luYou.use(guanLiCaoZuoXianLiu)
luYou.use(yanZhengGuanLiYuan)

luYou.get('/用户', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  try {
    const lieBiao = await huoQuYongHuLieBiao()
    await jiLuShenJiRiZhi({
      yong_hu_id: yongHu.yongHuId,
      ip: huoQuIp(qingQiu),
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'chaKanYongHuLieBiao'),
      xiang_qing: { yong_hu_shu: lieBiao.length },
      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, { lie_biao: lieBiao })
  } catch (cuoWu) {
    console.error('获取用户列表失败', cuoWu)
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.get('/对话', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  try {
    const lieBiao = await huoQuDuiHuaLieBiao()
    await jiLuShenJiRiZhi({
      yong_hu_id: yongHu.yongHuId,
      ip: huoQuIp(qingQiu),
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'chaKanDuiHuaLieBiao'),
      xiang_qing: { dui_hua_shu: lieBiao.length },
      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, { lie_biao: lieBiao })
  } catch (cuoWu) {
    console.error('获取对话列表失败', cuoWu)
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.get('/对话/:jiaoSeId', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  const jiaoSeId = String(qingQiu.params.jiaoSeId || '')
  if (!jiaoSeId) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  try {
    const xiangQing = await huoQuDuiHuaXiangQing(jiaoSeId)
    if (!xiangQing) {
      return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
    }
    await jiLuShenJiRiZhi({
      yong_hu_id: yongHu.yongHuId,
      ip: huoQuIp(qingQiu),
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'chaKanDuiHuaXiangQing'),
      xiang_qing: { jiao_se_id: jiaoSeId },
      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, xiangQing)
  } catch (cuoWu) {
    console.error('获取对话详情失败', cuoWu)
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.get('/角色/:jiaoSeId', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  const jiaoSeId = String(qingQiu.params.jiaoSeId || '')
  if (!jiaoSeId) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  try {
    const jiaoSeXinXi = await huoQuJiaoSeXinXi(jiaoSeId)
    if (!jiaoSeXinXi) {
      return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
    }
    await jiLuShenJiRiZhi({
      yong_hu_id: yongHu.yongHuId,
      ip: huoQuIp(qingQiu),
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'chaKanJiaoSeXinXi'),
      xiang_qing: { jiao_se_id: jiaoSeId },
      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, jiaoSeXinXi)
  } catch (cuoWu) {
    console.error('获取角色信息失败', cuoWu)
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/夺舍/:jiaoSeId', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  const jiaoSeId = String(qingQiu.params.jiaoSeId || '')
  if (!jiaoSeId) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  try {
    await sheZhiDuoSheZhuangTai(jiaoSeId, yongHu.yongHuId)
    await jiLuDuoShe(yongHu.yongHuId, jiaoSeId)
    const muBiaoYongHuId = await huoQuJiaoSeYongHuId(jiaoSeId)
    if (muBiaoYongHuId) {
      zhongDuanJiaoSeTiaoDuQi(muBiaoYongHuId, jiaoSeId)
    }
    await jiLuShenJiRiZhi({
      yong_hu_id: yongHu.yongHuId,
      ip: huoQuIp(qingQiu),
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'duoSheJiaoSe'),
      xiang_qing: { jiao_se_id: jiaoSeId },
      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, { jiao_se_id: jiaoSeId, duo_she_zhuang_tai: true })
  } catch (cuoWu) {
    console.error('夺舍角色失败', cuoWu)
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/归还/:jiaoSeId', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  const jiaoSeId = String(qingQiu.params.jiaoSeId || '')
  if (!jiaoSeId) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  try {
    const chengGong = await jieShuDuoShe(yongHu.yongHuId, jiaoSeId)
    if (!chengGong) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('tongYong', 'weiShouQuan'))
    }
    await jiLuShenJiRiZhi({
      yong_hu_id: yongHu.yongHuId,
      ip: huoQuIp(qingQiu),
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'guiHuanJiaoSe'),
      xiang_qing: { jiao_se_id: jiaoSeId },
      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, { jiao_se_id: jiaoSeId, duo_she_zhuang_tai: false })
  } catch (cuoWu) {
    console.error('归还角色失败', cuoWu)
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/测试用户', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  const body = qingQiu.body as Record<string, unknown>
  const shouJiHao = huoQuZiFuChuan(body, 'shouJiHao', 'shou_ji_hao')
  const yongHuMing = huoQuZiFuChuan(body, 'yongHuMing', 'yong_hu_ming')

  if (!shouJiHao || !yongHuMing) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  try {
    const jieGuo = await chuangJianCeShiYongHu(shouJiHao, yongHuMing)
    if (!jieGuo.cheng_gong) {
      return shiBaiXiangYing(xiangYing, jieGuo.zhuang_tai_ma || 400, jieGuo.ti_shi || huoQuFanYi('tongYong', 'caoZuoShiBai'))
    }
    await jiLuShenJiRiZhi({
      yong_hu_id: yongHu.yongHuId,
      ip: huoQuIp(qingQiu),
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'chuangJianCeShiYongHu'),
      xiang_qing: { mu_biao_shou_ji_hao: shouJiHao },
      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, { yong_hu: jieGuo.yong_hu })
  } catch (cuoWu) {
    console.error('创建测试用户失败', cuoWu)
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/测试用户登录', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  const body = qingQiu.body as Record<string, unknown>
  const shouJiHao = huoQuZiFuChuan(body, 'shouJiHao', 'shou_ji_hao')

  if (!shouJiHao) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  try {
    const jieGuo = await dengLuCeShiYongHu(shouJiHao)
    if (!jieGuo.cheng_gong) {
      return shiBaiXiangYing(xiangYing, jieGuo.zhuang_tai_ma || 400, jieGuo.ti_shi || huoQuFanYi('renZheng', 'dengLuShiBai'))
    }
    await jiLuShenJiRiZhi({
      yong_hu_id: yongHu.yongHuId,
      ip: huoQuIp(qingQiu),
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'dengLuCeShiYongHu'),
      xiang_qing: { mu_biao_shou_ji_hao: shouJiHao },
      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, { ling_pai: jieGuo.ling_pai, yong_hu: jieGuo.yong_hu })
  } catch (cuoWu) {
    console.error('登录测试用户失败', cuoWu)
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.get('/系统状态', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  try {
    const zhuangTai = await huoQuXiTongZhuangTai()
    await jiLuShenJiRiZhi({
      yong_hu_id: yongHu.yongHuId,
      ip: huoQuIp(qingQiu),
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'chaKanXiTongZhuangTai'),
      xiang_qing: { yong_hu_shu: zhuangTai.yong_hu_shu },
      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, zhuangTai)
  } catch (cuoWu) {
    console.error('获取系统状态失败', cuoWu)
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.delete('/用户/:yongHuId', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  const muBiaoYongHuId = String(qingQiu.params.yongHuId || '')
  if (!muBiaoYongHuId) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  try {
    const jieGuo = await shanChuYongHu(yongHu.yongHuId, muBiaoYongHuId)
    if (!jieGuo.cheng_gong) {
      return shiBaiXiangYing(xiangYing, jieGuo.zhuang_tai_ma || 400, jieGuo.ti_shi || huoQuFanYi('tongYong', 'caoZuoShiBai'))
    }
    await jiLuShenJiRiZhi({
      yong_hu_id: yongHu.yongHuId,
      ip: huoQuIp(qingQiu),
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'shanChuYongHu'),
      xiang_qing: { mu_biao_yong_hu_id: muBiaoYongHuId },
      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, null)
  } catch (cuoWu) {
    console.error('删除用户失败', cuoWu)
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

export default luYou
