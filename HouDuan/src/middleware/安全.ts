import { debug日志 } from '../utils/debug日志'
import type { Request, Response, NextFunction } from 'express'
import { huoQuFanYi } from '../config/translations'
import { shiBaiXiangYing } from '../utils/xiangying'
import { 获取IP, 记录违规 } from '../services/IP封禁'

export const gaoWeiSQLZhuRuMoShi = [
  /UNION\s+SELECT/i,
  /DROP\s+TABLE/i,
  /INSERT\s+INTO/i,
  /DELETE\s+FROM/i,
  /UPDATE\s+SET/i,
  /INTO\s+OUTFILE/i,
  /OR\s+['"]?1['"]?\s*=\s*['"]?1['"]?/i,
  /EXEC\s*\(/i,
  /EXECUTE\s*\(/i,
  /INFORMATION_SCHEMA/i,
  /SLEEP\s*\(/i,
  /BENCHMARK\s*\(/i,
  /LOAD_FILE\s*\(/i,
  /CHAR\s*\(/i,
  /CONCAT\s*\(/i,
]

const RONG_YI_WU_SHANG_WEI_JIN_CI_LIE_BIAO = gaoWeiSQLZhuRuMoShi.slice(6)

export const puTongSQLZhuRuMoShi = [
  /SELECT\s+.*\s+FROM/i,
  /SELECT\s+COUNT/i,
  /SELECT\s+DISTINCT/i,
  /UNION\s+SELECT/i,
  /INSERT\s+INTO/i,
  /UPDATE\s+SET/i,
  /DELETE\s+FROM/i,
  /DROP\s+TABLE/i,
  /ALTER\s+TABLE/i,
  /CREATE\s+TABLE/i,
  /OR\s+['"]?1['"]?\s*=\s*['"]?1['"]?/i,
  /'\s*OR\s+'/i,
  /'\s*OR\s*"/i,
  /";\s*--/i,
]

const CHU_CAN_KONG_ZHI_ZI_FU = /[\u0000-\u0008\u000B-\u001F\u007F\uFFFE\uFFFF]/g

function 剥离出参控制字符(zhi: string): string {
  return zhi.replace(CHU_CAN_KONG_ZHI_ZI_FU, '')
}

export function 构造安全出参(zhi: unknown): unknown {
  if (typeof zhi === 'string') return 剥离出参控制字符(zhi)
  if (typeof zhi === 'undefined' || zhi === null) return zhi
  if (typeof zhi === 'number') return Number.isFinite(zhi) ? zhi : null
  if (typeof zhi === 'bigint') return zhi.toString()
  if (typeof zhi === 'function') return null
  if (Array.isArray(zhi)) return zhi.map((xiang) => 构造安全出参(xiang))
  if (typeof zhi === 'object') {
    const jieGuo: Record<string, unknown> = {}
    for (const [jian, jia] of Object.entries(zhi as Record<string, unknown>)) {
      jieGuo[jian] = 构造安全出参(jia)
    }
    return jieGuo
  }
  return zhi
}

function jianCeGaoWeiSQLZhuRu(zhi: unknown, zuiShaoGongXian = 1): boolean {
  const jiShu = (zhi: unknown): { qiangTeZheng: number; ruoTeXheng: number } => {
    if (typeof zhi === 'string') {
      return {
        qiangTeZheng: gaoWeiSQLZhuRuMoShi.slice(0, 6).filter((moShi) => moShi.test(zhi)).length,
        ruoTeXheng: RONG_YI_WU_SHANG_WEI_JIN_CI_LIE_BIAO.filter((moShi) => moShi.test(zhi)).length,
      }
    }
    if (Array.isArray(zhi)) {
      return zhi.reduce(
        (he, xiang) => {
          const zi = jiShu(xiang)
          return {
            qiangTeZheng: he.qiangTeZheng + zi.qiangTeZheng,
            ruoTeXheng: he.ruoTeXheng + zi.ruoTeXheng,
          }
        },
        { qiangTeZheng: 0, ruoTeXheng: 0 },
      )
    }
    if (typeof zhi === 'object' && zhi !== null) {
      return Object.values(zhi).reduce(
        (he, xiang) => {
          const zi = jiShu(xiang)
          return {
            qiangTeZheng: he.qiangTeZheng + zi.qiangTeZheng,
            ruoTeXheng: he.ruoTeXheng + zi.ruoTeXheng,
          }
        },
        { qiangTeZheng: 0, ruoTeXheng: 0 },
      )
    }
    return { qiangTeZheng: 0, ruoTeXheng: 0 }
  }

  const tongJi = jiShu(zhi)
  if (tongJi.qiangTeZheng > 0) return true
  return tongJi.ruoTeXheng >= zuiShaoGongXian
}

function jianCePuTongSQLZhuRu(zhi: unknown): boolean {
  if (typeof zhi === 'string') {
    return puTongSQLZhuRuMoShi.some((moShi) => moShi.test(zhi))
  }
  if (Array.isArray(zhi)) {
    return zhi.some((xiang) => jianCePuTongSQLZhuRu(xiang))
  }
  if (typeof zhi === 'object' && zhi !== null) {
    return Object.values(zhi).some((xiang) => jianCePuTongSQLZhuRu(xiang))
  }
  return false
}

export function qingQiuHanYouSQLZhuRu(qingQiu: Request): boolean {
  const muBiao = {
    body: qingQiu.body,
    query: qingQiu.query,
    params: qingQiu.params,
  }
  return jianCeGaoWeiSQLZhuRu(muBiao) || jianCePuTongSQLZhuRu(muBiao)
}

function panDuanShiLiaoTianLuJing(qingQiu: Request): boolean {
  let wanZhengLuJing = `${qingQiu.baseUrl || ''}${qingQiu.path || ''}`
  try {
    wanZhengLuJing = decodeURIComponent(wanZhengLuJing)
  } catch {
    return false
  }
  return wanZhengLuJing.includes('/聊天/会话') && qingQiu.method !== 'GET'
}

export async function anQuanZhongJianJian(
  qingQiu: Request,
  xiangYing: Response,
  xiaYiBu: NextFunction,
): Promise<void> {
  try {
    const shiLiaoTian = panDuanShiLiaoTianLuJing(qingQiu)

    const jianCeMuBiao = {
      body: qingQiu.body,
      query: qingQiu.query,
      params: qingQiu.params,
    }

    let weiGui = false
    let cuoWuXiaoXi = ''

    if (shiLiaoTian) {
      if (jianCeGaoWeiSQLZhuRu(jianCeMuBiao, 2)) {
        weiGui = true
        cuoWuXiaoXi = huoQuFanYi('anQuan', 'gaoWeiSQLZhuRu')
      }
    } else if (jianCePuTongSQLZhuRu(jianCeMuBiao)) {
      weiGui = true
      cuoWuXiaoXi = huoQuFanYi('anQuan', 'sqlZhuRuWeiXian')
    }

    if (weiGui) {
      const ip = 获取IP(qingQiu)
      const jiLuJieGuo = await 记录违规(ip, 'SQL注入', '严重')
      if (jiLuJieGuo.已封禁) {
        shiBaiXiangYing(xiangYing, 403, huoQuFanYi('anQuan', 'ipYiBeiFengJin'))
        return
      }
      shiBaiXiangYing(xiangYing, 403, cuoWuXiaoXi)
      return
    }

    xiaYiBu()
  } catch (cuoWu) {
    debug日志.error('安全中间件', '安全中间件执行失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
}
