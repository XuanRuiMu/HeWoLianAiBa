import fs from 'fs'
import path from 'path'
import type { RequestHandler } from 'express'
import { peiZhi } from '../config'

export type RiZhiJiBie = 'debug' | 'info' | 'warn' | 'error'

export interface RiZhiTiaoMu {
  shi_jian: string
  ji_bie: RiZhiJiBie
  lei_xing: string
  xiao_xi: string
  yong_hu_id?: string
  jiao_se_id?: string
  xiang_qing?: Record<string, unknown>
}

const riZhiMuLu = path.resolve(process.cwd(), 'logs')
const riZhiJiBieQuanZhong: Record<RiZhiJiBie, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

let dangQianRiQi = ''
let wen_jian_liu: fs.WriteStream | null = null

function huoQuYouXiaoRiZhiJiBie(jiBie: string | undefined): RiZhiJiBie {
  const youXiaoJiBieLieBiao: RiZhiJiBie[] = ['debug', 'info', 'warn', 'error']
  if (jiBie && youXiaoJiBieLieBiao.includes(jiBie as RiZhiJiBie)) {
    return jiBie as RiZhiJiBie
  }
  return 'debug'
}

let sheZhiDeZuiDiJiBie: RiZhiJiBie = huoQuYouXiaoRiZhiJiBie(process.env.LOG_LEVEL)

function huoQuJinRiRiQi(): string {
  const xianZai = new Date()
  const nian = xianZai.getFullYear()
  const yue = String(xianZai.getMonth() + 1).padStart(2, '0')
  const ri = String(xianZai.getDate()).padStart(2, '0')
  return `${nian}-${yue}-${ri}`
}

function queBaoRiZhiMuLu(): void {
  if (!fs.existsSync(riZhiMuLu)) {
    fs.mkdirSync(riZhiMuLu, { recursive: true })
  }
}

function huoQuHuoChuangJianWenJianLiu(): fs.WriteStream {
  const jinRi = huoQuJinRiRiQi()
  if (jinRi !== dangQianRiQi || !wen_jian_liu) {
    if (wen_jian_liu) {
      wen_jian_liu.end()
    }
    queBaoRiZhiMuLu()
    dangQianRiQi = jinRi
    const wenJianMing = path.join(riZhiMuLu, 'debug.log')
    wen_jian_liu = fs.createWriteStream(wenJianMing, { flags: 'a' })
  }
  return wen_jian_liu
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

export function sheZhiZuiDiRiZhiJiBie(jiBie: RiZhiJiBie): void {
  sheZhiDeZuiDiJiBie = jiBie
}

export function xieRuRiZhi(
  jiBie: RiZhiJiBie,
  leiXing: string,
  xiaoXi: string,
  xuanXiang?: {
    yong_hu_id?: string
    jiao_se_id?: string
    xiang_qing?: Record<string, unknown>
  },
): void {
  if (riZhiJiBieQuanZhong[jiBie] < riZhiJiBieQuanZhong[sheZhiDeZuiDiJiBie]) {
    return
  }

  const tiaoMu: RiZhiTiaoMu = {
    shi_jian: new Date().toISOString(),
    ji_bie: jiBie,
    lei_xing: leiXing,
    xiao_xi: String(guoLvMinGanZiDuan(xiaoXi)),
    yong_hu_id: xuanXiang?.yong_hu_id,
    jiao_se_id: xuanXiang?.jiao_se_id,
    xiang_qing: xuanXiang?.xiang_qing ? (guoLvMinGanZiDuan(xuanXiang.xiang_qing) as Record<string, unknown>) : undefined,
  }

  const liu = huoQuHuoChuangJianWenJianLiu()
  liu.write(`${JSON.stringify(tiaoMu)}\n`)
}

export const debug日志 = {
  debug: (leiXing: string, xiaoXi: string, xuanXiang?: Parameters<typeof xieRuRiZhi>[3]) =>
    xieRuRiZhi('debug', leiXing, xiaoXi, xuanXiang),
  info: (leiXing: string, xiaoXi: string, xuanXiang?: Parameters<typeof xieRuRiZhi>[3]) =>
    xieRuRiZhi('info', leiXing, xiaoXi, xuanXiang),
  warn: (leiXing: string, xiaoXi: string, xuanXiang?: Parameters<typeof xieRuRiZhi>[3]) =>
    xieRuRiZhi('warn', leiXing, xiaoXi, xuanXiang),
  error: (leiXing: string, xiaoXi: string, xuanXiang?: Parameters<typeof xieRuRiZhi>[3]) =>
    xieRuRiZhi('error', leiXing, xiaoXi, xuanXiang),
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
    if (wen_jian_liu) {
      wen_jian_liu.end(() => {
        wen_jian_liu = null
        resolve()
      })
    } else {
      resolve()
    }
  })
}
