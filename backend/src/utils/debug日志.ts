import fs from 'fs'
import path from 'path'
import type { RequestHandler } from 'express'
import pino from 'pino'
import { peiZhi } from '../config'

export type RiZhiJiBie = 'debug' | 'info' | 'warn' | 'error'

export interface RiZhiTiaoMu {
  shi_jian: string
  ji_bie: RiZhiJiBie
  lei_xing: string
  xiao_xi: string
  yong_hu_id?: string
  jiao_se_id?: string
  qing_qiu_id?: string
  xiang_qing?: Record<string, unknown>
}

export interface RiZhiXuanXiang {
  yong_hu_id?: string
  jiao_se_id?: string
  qing_qiu_id?: string
  xiang_qing?: Record<string, unknown>
}

type RiZhiDuiXiang = {
  debug: (leiXing: string, xiaoXi: string, xuanXiang?: RiZhiXuanXiang) => void
  info: (leiXing: string, xiaoXi: string, xuanXiang?: RiZhiXuanXiang) => void
  warn: (leiXing: string, xiaoXi: string, xuanXiang?: RiZhiXuanXiang) => void
  error: (leiXing: string, xiaoXi: string, xuanXiang?: RiZhiXuanXiang) => void
}

type QingQiuRiZhiDuiXiang = {
  debug: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>) => void
  info: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>) => void
  warn: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>) => void
  error: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>) => void
}

const riZhiMuLu = path.resolve(process.cwd(), 'logs')
const riZhiWenJian = path.join(riZhiMuLu, 'debug.log')

function huoQuYouXiaoRiZhiJiBie(jiBie: string | undefined): pino.LevelWithSilent {
  const youXiaoJiBieLieBiao: pino.LevelWithSilent[] = ['debug', 'info', 'warn', 'error']
  if (jiBie && youXiaoJiBieLieBiao.includes(jiBie as pino.LevelWithSilent)) {
    return jiBie as pino.LevelWithSilent
  }
  return 'debug'
}

let dangQianJiBie: pino.LevelWithSilent = huoQuYouXiaoRiZhiJiBie(process.env.LOG_LEVEL)
let logger: pino.Logger
let wenJianLiu: fs.WriteStream | null = null
let liuYiGuanBi = false

function queBaoRiZhiMuLu(): boolean {
  if (!fs.existsSync(riZhiMuLu)) {
    try {
      fs.mkdirSync(riZhiMuLu, { recursive: true })
    } catch (cuoWu) {
      console.error('日志目录创建失败，日志将降级到控制台', cuoWu)
      return false
    }
  }
  return true
}

function chuangJianWenJianLiu(): fs.WriteStream | null {
  if (!queBaoRiZhiMuLu()) return null
  try {
    const liu = fs.createWriteStream(riZhiWenJian, { flags: 'a' })
    liu.on('error', (cuoWu) => {
      console.error('日志文件流错误', cuoWu)
    })
    return liu
  } catch (cuoWu) {
    console.error('日志文件流创建失败', cuoWu)
    return null
  }
}

function chuangJianLogger(): void {
  if (wenJianLiu) {
    try {
      wenJianLiu.end()
    } catch {
      // 忽略关闭错误
    }
    wenJianLiu = null
  }

  wenJianLiu = chuangJianWenJianLiu()

  const muBiaoLiu = wenJianLiu
    ? pino.multistream([
        { stream: process.stdout, level: 'trace' as pino.LevelWithSilent },
        { stream: wenJianLiu, level: 'trace' as pino.LevelWithSilent },
      ])
    : process.stdout

  logger = pino(
    {
      level: dangQianJiBie,
      messageKey: 'xiao_xi',
      timestamp: () => `,"shi_jian":"${new Date().toISOString()}"`,
      formatters: {
        level: (label: string) => ({ ji_bie: label }),
      },
    },
    muBiaoLiu,
  )

  liuYiGuanBi = false
}

chuangJianLogger()

function queBaoLoggerKeYong(): void {
  if (liuYiGuanBi || !logger) {
    chuangJianLogger()
  }
}

function guoLvMinGanZiDuan(shuJu: unknown): unknown {
  if (shuJu === null || shuJu === undefined) {
    return shuJu
  }

  if (typeof shuJu === 'string') {
    let jieGuo = shuJu
    const minGanGuanJianZi = peiZhi.minGanZiDuan.guanJianZi
    for (const guanJianZi of minGanGuanJianZi) {
      const zhengZe = new RegExp(`"${guanJianZi}"\\s*:\\s*"[^"]*"`, 'gi')
      jieGuo = jieGuo.replace(zhengZe, `"${guanJianZi}":"***"`)
    }
    if (/^[A-Za-z0-9+/=_-]+(\.[A-Za-z0-9+/=_-]+){2,}$/.test(jieGuo) && jieGuo.length > 40) {
      return '***'
    }
    return jieGuo
  }

  if (Array.isArray(shuJu)) {
    return shuJu.map(guoLvMinGanZiDuan)
  }

  if (typeof shuJu === 'object') {
    const duiXiang = shuJu as Record<string, unknown>
    const jieGuo: Record<string, unknown> = {}
    const minGanZiDuanMing = new Set(peiZhi.minGanZiDuan.ziDuanMing)
    for (const [jian, zhi] of Object.entries(duiXiang)) {
      if (minGanZiDuanMing.has(jian)) {
        jieGuo[jian] = '***'
      } else {
        jieGuo[jian] = guoLvMinGanZiDuan(zhi)
      }
    }
    return jieGuo
  }

  return shuJu
}

function gouJianShangXiaWen(xuanXiang: RiZhiXuanXiang | undefined): Record<string, unknown> {
  const shangXiaWen: Record<string, unknown> = {}
  if (xuanXiang?.yong_hu_id) shangXiaWen.yong_hu_id = xuanXiang.yong_hu_id
  if (xuanXiang?.jiao_se_id) shangXiaWen.jiao_se_id = xuanXiang.jiao_se_id
  if (xuanXiang?.qing_qiu_id) shangXiaWen.qing_qiu_id = xuanXiang.qing_qiu_id
  if (xuanXiang?.xiang_qing) {
    shangXiaWen.xiang_qing = guoLvMinGanZiDuan(xuanXiang.xiang_qing)
  }
  return shangXiaWen
}

export function sheZhiZuiDiRiZhiJiBie(jiBie: RiZhiJiBie): void {
  dangQianJiBie = jiBie
  queBaoLoggerKeYong()
  logger.level = jiBie
}

export function xieRuRiZhi(
  jiBie: RiZhiJiBie,
  leiXing: string,
  xiaoXi: string,
  xuanXiang?: RiZhiXuanXiang,
): void {
  queBaoLoggerKeYong()
  const shangXiaWen = gouJianShangXiaWen(xuanXiang)
  const guoLvXiaoXi = String(guoLvMinGanZiDuan(xiaoXi))
  const heBingDuiXiang = { lei_xing: leiXing, ...shangXiaWen }
  ;(logger[jiBie] as pino.LogFn)(heBingDuiXiang, guoLvXiaoXi)
}

export const debug日志: RiZhiDuiXiang = {
  debug: (leiXing: string, xiaoXi: string, xuanXiang?: RiZhiXuanXiang) =>
    xieRuRiZhi('debug', leiXing, xiaoXi, xuanXiang),
  info: (leiXing: string, xiaoXi: string, xuanXiang?: RiZhiXuanXiang) =>
    xieRuRiZhi('info', leiXing, xiaoXi, xuanXiang),
  warn: (leiXing: string, xiaoXi: string, xuanXiang?: RiZhiXuanXiang) =>
    xieRuRiZhi('warn', leiXing, xiaoXi, xuanXiang),
  error: (leiXing: string, xiaoXi: string, xuanXiang?: RiZhiXuanXiang) =>
    xieRuRiZhi('error', leiXing, xiaoXi, xuanXiang),
}

export function withRequestId(
  qingQiuId: string,
  yongHuId?: string,
  jiaoSeId?: string,
): QingQiuRiZhiDuiXiang {
  const daiRuXuanXiang = (xiangQing?: Record<string, unknown>): RiZhiXuanXiang => ({
    qing_qiu_id: qingQiuId,
    yong_hu_id: yongHuId,
    jiao_se_id: jiaoSeId,
    xiang_qing: xiangQing,
  })
  return {
    debug: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>) =>
      xieRuRiZhi('debug', leiXing, xiaoXi, daiRuXuanXiang(xiangQing)),
    info: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>) =>
      xieRuRiZhi('info', leiXing, xiaoXi, daiRuXuanXiang(xiangQing)),
    warn: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>) =>
      xieRuRiZhi('warn', leiXing, xiaoXi, daiRuXuanXiang(xiangQing)),
    error: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>) =>
      xieRuRiZhi('error', leiXing, xiaoXi, daiRuXuanXiang(xiangQing)),
  }
}

export function jiLuHTTPQingQiu(
  fangFa: string,
  luJing: string,
  zhuangTaiMa: number,
  haoShi: number,
  yongHuId?: string,
): void {
  const huanJing = peiZhi.huanJing
  const jiBie: RiZhiJiBie = zhuangTaiMa >= 500 ? 'error' : zhuangTaiMa >= 400 ? 'warn' : 'info'
  debug日志[jiBie]('HTTP请求', `${fangFa} ${luJing} ${zhuangTaiMa} ${haoShi}ms`, {
    yong_hu_id: yongHuId,
    xiang_qing: {
      fang_fa: fangFa,
      lu_jing: luJing,
      zhuang_tai_ma: zhuangTaiMa,
      hao_shi: haoShi,
      huan_jing: huanJing,
    },
  })
}

export function chuangJianHTTPRiZhiZhongJianJian(): RequestHandler {
  return (qingQiu, xiangYing, xiaYiBu) => {
    const kaiShiShiJian = (qingQiu as unknown as Record<string, number>).kai_shi_shi_jian || Date.now()

    xiangYing.on('finish', () => {
      const haoShi = Date.now() - kaiShiShiJian
      const yongHuId = (qingQiu as unknown as { yong_hu?: { yongHuId: string } }).yong_hu?.yongHuId
      jiLuHTTPQingQiu(qingQiu.method, qingQiu.path, xiangYing.statusCode, haoShi, yongHuId)
    })

    xiaYiBu()
  }
}

export function jiLuSocketShiJian(
  shiJian: string,
  yongHuId: string,
  xiangQing?: Record<string, unknown>,
): void {
  debug日志.info('Socket事件', shiJian, {
    yong_hu_id: yongHuId,
    xiang_qing: xiangQing,
  })
}

export function jiLuAIJiLu(
  moXingLeiXing: string,
  moXing: string,
  haoShi: number,
  chengGong: boolean,
  cuoWu?: string,
): void {
  const jiBie: RiZhiJiBie = chengGong ? 'info' : 'error'
  debug日志[jiBie]('AI调用', `${moXingLeiXing} ${moXing} ${chengGong ? '成功' : '失败'} ${haoShi}ms`, {
    xiang_qing: {
      mo_xing_lei_xing: moXingLeiXing,
      mo_xing: moXing,
      hao_shi: haoShi,
      cheng_gong: chengGong,
      cuo_wu: cuoWu,
    },
  })
}

export function jiLuHaoGanDuBianHua(
  yongHuId: string,
  jiaoSeId: string,
  bianHua: Record<string, unknown>,
  xinZongFen?: number,
): void {
  debug日志.info('好感度变更', `用户 ${yongHuId} 角色 ${jiaoSeId}`, {
    yong_hu_id: yongHuId,
    jiao_se_id: jiaoSeId,
    xiang_qing: {
      bian_hua: bianHua,
      xin_zong_fen: xinZongFen,
    },
  })
}

export function jiLuJunShiQiuZhu(
  yongHuId: string,
  jiaoSeId: string,
  chengGong: boolean,
  cuoWuMa?: string,
): void {
  const jiBie: RiZhiJiBie = chengGong ? 'info' : 'warn'
  debug日志[jiBie]('军师指导', `用户 ${yongHuId} 角色 ${jiaoSeId} ${chengGong ? '成功' : '失败'}`, {
    yong_hu_id: yongHuId,
    jiao_se_id: jiaoSeId,
    xiang_qing: {
      cheng_gong: chengGong,
      cuo_wu_ma: cuoWuMa,
    },
  })
}

export function jiLuYouXiJieJu(
  yongHuId: string,
  jiaoSeId: string,
  jieGuoLeiXing: string,
): void {
  debug日志.info('游戏结局', `用户 ${yongHuId} 角色 ${jiaoSeId} 触发 ${jieGuoLeiXing}`, {
    yong_hu_id: yongHuId,
    jiao_se_id: jiaoSeId,
    xiang_qing: {
      jie_guo_lei_xing: jieGuoLeiXing,
    },
  })
}

export function jiLuXiaoXiCaoZuo(
  caoZuo: string,
  yongHuId: string,
  jiaoSeId: string,
  faSongZheLeiXing: string,
  xiangQing?: Record<string, unknown>,
): void {
  debug日志.info('消息操作', caoZuo, {
    yong_hu_id: yongHuId,
    jiao_se_id: jiaoSeId,
    xiang_qing: {
      cao_zuo: caoZuo,
      fa_song_zhe_lei_xing: faSongZheLeiXing,
      ...xiangQing,
    },
  })
}

export function guanBiRiZhiLiu(): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (logger && typeof logger.flush === 'function') {
        logger.flush()
      }
    } catch {
      // 忽略 flush 错误
    }
    if (wenJianLiu) {
      const liu = wenJianLiu
      wenJianLiu = null
      liu.end(() => {
        liuYiGuanBi = true
        resolve()
      })
    } else {
      liuYiGuanBi = true
      resolve()
    }
  })
}
