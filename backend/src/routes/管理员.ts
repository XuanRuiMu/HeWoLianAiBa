import { Router } from 'express'
import type { Request, Response } from 'express'
import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { yanZhengGuanLiYuan } from '../middleware/管理员'
import { guanLiCaoZuoXianLiu } from '../middleware/限流'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { jiLuShenJiRiZhi } from '../services/审计日志'
import { yinBiShouJiHao } from '../utils/掩码'
import { huoQuZhenShiIP } from '../utils/真实IP'
import { debug日志 } from '../utils/debug日志'
import { redis } from '../redis'
import { peiZhi } from '../config'
import {
  huoQuYongHuLieBiao,
  huoQuDuiHuaLieBiao,
  huoQuDuiHuaXiangQing,
  huoQuJiaoSeXinXi,
  chuangJianCeShiYongHu,
  dengLuCeShiYongHu,
  shanChuYongHu,
  huoQuXiTongZhuangTai,
  sheZhiGuanLiYuanZhuangTai,
} from '../services/管理员'
import { jiLuDuoShe, jieShuDuoShe, huoQuJiaoSeYongHuId, sheZhiDuoSheZhuangTai } from '../services/夺舍'
import {
  lieChuFengJinShenSu,
  jieChuZhangHaoFengJin,
  shenHeShenSu,
} from '../services/账号封禁'
import { yanZhengUUID } from '../utils/验证'
import { zhongDuanJiaoSeTiaoDuQi } from '../socket/聊天'
import type { RenZhengQingQiu } from '../middleware/认证'
import { huoQuZengLiangQuXian, jiSuanMuBiaoQuXian } from '../services/好感度缓存'
import { huoQuWanZhengHaoGanDu } from '../services/好感度'

const luYou = Router()

// P2-2：审计场景一律使用可信链路推导的真实来源 IP，不解析客户端可控 XFF
function huoQuIp(qingQiu: Request): string {
  return huoQuZhenShiIP(qingQiu)
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
    debug日志.error('管理接口', '获取用户列表失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
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
    debug日志.error('管理接口', '获取对话列表失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
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
    debug日志.error('管理接口', '获取对话详情失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
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
    debug日志.error('管理接口', '获取角色信息失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
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
    debug日志.error('管理接口', '夺舍角色失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
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
    debug日志.error('管理接口', '归还角色失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
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
    return chengGongXiangYing(xiangYing, {
      yong_hu: jieGuo.yong_hu,
      chu_shi_mi_ma: jieGuo.chu_shi_mi_ma,
    })
  } catch (cuoWu) {
    debug日志.error('管理接口', '创建测试用户失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
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
    debug日志.error('管理接口', '登录测试用户失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
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
    debug日志.error('管理接口', '获取系统状态失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

// M3 管理端用量看板：聚合每用户当日 AI 调用量与预算余量（数据源为 Redis ai_yu_suan:* 计数）
luYou.get('/用量看板', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  try {
    const riQi = new Date().toISOString().slice(0, 10)
    const qianZhui = `ai_yu_suan:`
    const moShiJian = `${qianZhui}*:${riQi}`

    // SCAN 收集当日全部计数键（生产多库共享 Redis，避免 KEYS 阻塞）
    const jiShuJian: string[] = []
    let saoMiaoGuangBiao = '0'
    do {
      const [xiaYiGuangBiao, piCi] = (await redis.scan(
        saoMiaoGuangBiao,
        'MATCH',
        moShiJian,
        'COUNT',
        500,
      )) as [string, string[]]
      saoMiaoGuangBiao = xiaYiGuangBiao
      jiShuJian.push(...piCi)
    } while (saoMiaoGuangBiao !== '0')

    const yiYongAnYongHuId = new Map<string, number>()
    for (const jian of jiShuJian) {
      const yongHuId = jian.slice(qianZhui.length, jian.length - riQi.length - 1)
      const zhi = Number(await redis.get(jian))
      if (yongHuId && !Number.isNaN(zhi)) {
        yiYongAnYongHuId.set(yongHuId, zhi)
      }
    }

    const lieBiao: Array<{
      yong_hu_id: string
      shou_ji_hao: string
      yong_hu_ming: string | null
      yi_yong: number
      sheng_yu: number
    }> = []

    if (yiYongAnYongHuId.size > 0) {
      const { 数据库 } = await import('../数据库')
      const idLieBiao = [...yiYongAnYongHuId.keys()]
      const zhanWei = idLieBiao.map((_, i) => `$${i + 1}`).join(',')
      const chaXun = await 数据库.query(
        `SELECT "ID", "手机号", "用户名" FROM "用户" WHERE "ID"::text IN (${zhanWei})`,
        idLieBiao,
      )
      for (const hang of chaXun.rows) {
        const id = String(hang.ID)
        const yiYong = yiYongAnYongHuId.get(id) ?? 0
        lieBiao.push({
          yong_hu_id: id,
          shou_ji_hao: hang.手机号 ? yinBiShouJiHao(String(hang.手机号)) : '',
          yong_hu_ming: hang.用户名 ? String(hang.用户名) : null,
          yi_yong: yiYong,
          sheng_yu: Math.max(0, peiZhi.meiRiAIQingQiuYuSuan - yiYong),
        })
      }
      lieBiao.sort((a, b) => b.yi_yong - a.yi_yong)
    }

    await jiLuShenJiRiZhi({
      yong_hu_id: yongHu.yongHuId,
      ip: huoQuIp(qingQiu),
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'chaKanXiTongZhuangTai'),
      xiang_qing: { lei_xing: '用量看板', yong_hu_shu: lieBiao.length },
      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, {
      ri_qi: riQi,
      mei_ri_yu_suan: peiZhi.meiRiAIQingQiuYuSuan,
      lie_biao: lieBiao,
    })
  } catch (cuoWu) {
    debug日志.error('管理接口', '获取AI用量看板失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

// 好感度隐形保底增益曲线查看
luYou.get('/增益曲线/:yongHuId/:jiaoSeId', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  const yongHuId = String(qingQiu.params.yongHuId || '')
  const jiaoSeId = String(qingQiu.params.jiaoSeId || '')
  if (!yongHuId || !jiaoSeId) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  try {
    const haoGanDu = await huoQuWanZhengHaoGanDu(yongHuId, jiaoSeId)
    if (!haoGanDu) {
      return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
    }

    const quXian = await huoQuZengLiangQuXian(yongHuId, jiaoSeId, haoGanDu.zong_fen, haoGanDu.互动次数 ?? 0)

    await jiLuShenJiRiZhi({
      yong_hu_id: yongHu.yongHuId,
      ip: huoQuIp(qingQiu),
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'chaKanXiTongZhuangTai'),
      xiang_qing: { lei_xing: '增益曲线', yong_hu_id: yongHuId, jiao_se_id: jiaoSeId },
      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, {
      当前总分: haoGanDu.zong_fen,
      互动次数: haoGanDu.互动次数 ?? 0,
      目标曲线值: quXian.muBiaoQuXian,
      当前系数: quXian.dangQianXiShu,
      连续未达标: quXian.lianXuWeiDaBiao,
      最近8轮平均衰减后增量: Math.round(quXian.pingJunShuaiJianHou * 100) / 100,
      增量记录: quXian.lieBiao.map((jiLu) => ({
        轮次: jiLu.lunXu,
        原始增量: jiLu.yuanShiZengLiang,
        衰减后增量: jiLu.shuaiJianHouZengLiang,
        系数: jiLu.xiShu,
        时间: new Date(jiLu.shiJianCuo).toISOString(),
      })),
    })
  } catch (cuoWu) {
    debug日志.error('管理接口', '获取增益曲线失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/授权', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  const body = qingQiu.body as Record<string, unknown>
  const muBiaoYongHuId = huoQuZiFuChuan(body, 'yongHuId', 'yong_hu_id')
  if (!muBiaoYongHuId) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  try {
    const jieGuo = await sheZhiGuanLiYuanZhuangTai(muBiaoYongHuId, true)
    if (!jieGuo.cheng_gong) {
      return shiBaiXiangYing(xiangYing, jieGuo.zhuang_tai_ma || 400, jieGuo.ti_shi || huoQuFanYi('tongYong', 'caoZuoShiBai'))
    }
    await jiLuShenJiRiZhi({
      yong_hu_id: yongHu.yongHuId,
      ip: huoQuIp(qingQiu),
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'shouYuGuanLiYuan'),
      xiang_qing: { mu_biao_yong_hu_id: muBiaoYongHuId },
      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, { yong_hu_id: muBiaoYongHuId, guan_li_yuan: true, yi_bian_geng: jieGuo.yi_bian_geng })
  } catch (cuoWu) {
    debug日志.error('管理接口', '授予管理员失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/回收', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  const body = qingQiu.body as Record<string, unknown>
  const muBiaoYongHuId = huoQuZiFuChuan(body, 'yongHuId', 'yong_hu_id')
  if (!muBiaoYongHuId) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  try {
    const jieGuo = await sheZhiGuanLiYuanZhuangTai(muBiaoYongHuId, false)
    if (!jieGuo.cheng_gong) {
      return shiBaiXiangYing(xiangYing, jieGuo.zhuang_tai_ma || 400, jieGuo.ti_shi || huoQuFanYi('tongYong', 'caoZuoShiBai'))
    }
    await jiLuShenJiRiZhi({
      yong_hu_id: yongHu.yongHuId,
      ip: huoQuIp(qingQiu),
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'huiShouGuanLiYuan'),
      xiang_qing: { mu_biao_yong_hu_id: muBiaoYongHuId },
      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, { yong_hu_id: muBiaoYongHuId, guan_li_yuan: false, yi_bian_geng: jieGuo.yi_bian_geng })
  } catch (cuoWu) {
    debug日志.error('管理接口', '回收管理员失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
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
    debug日志.error('管理接口', '删除用户失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

/** 任务3：封禁与申诉列表（200条封顶，按更新时间倒序） */
luYou.get('/账号封禁', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  try {
    const lieBiao = await lieChuFengJinShenSu()
    return chengGongXiangYing(xiangYing, { lie_biao: lieBiao })
  } catch (cuoWu) {
    debug日志.error('管理接口', '查询封禁列表失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

/** 任务3：管理员解封（保留违规次数，再犯升级） */
luYou.post('/账号封禁/解封', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  const body = qingQiu.body as Record<string, unknown>
  const muBiaoYongHuId = huoQuZiFuChuan(body, 'yongHuId', 'yong_hu_id')
  if (!yanZhengUUID(muBiaoYongHuId)) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  }
  try {
    await jieChuZhangHaoFengJin(yongHu.yongHuId, muBiaoYongHuId, huoQuIp(qingQiu))
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('管理接口', '解除封禁失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

/** 任务3：审核申诉（通过则解封并清零次数，驳回则继续限制） */
luYou.post('/申诉/审核', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  const body = qingQiu.body as Record<string, unknown>
  const muBiaoYongHuId = huoQuZiFuChuan(body, 'yongHuId', 'yong_hu_id')
  const tongGuoRaw = body['tongGuo'] ?? body['tong_guo']
  if (!yanZhengUUID(muBiaoYongHuId) || typeof tongGuoRaw !== 'boolean') {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  }
  try {
    await shenHeShenSu(yongHu.yongHuId, muBiaoYongHuId, tongGuoRaw, huoQuIp(qingQiu))
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('管理接口', '审核申诉失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

export default luYou
