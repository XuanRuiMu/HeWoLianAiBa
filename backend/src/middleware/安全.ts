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
  /OR\s+['"]?1['"]?\s*=\s*['"]?1['"]?/i,
  /EXEC\s*\(/i,
  /EXECUTE\s*\(/i,
  /INFORMATION_SCHEMA/i,
  /SLEEP\s*\(/i,
  /BENCHMARK\s*\(/i,
  /LOAD_FILE\s*\(/i,
  /INTO\s+OUTFILE/i,
  /CHAR\s*\(/i,
  /CONCAT\s*\(/i,
]

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

export function qingLiShuRu(neiRong: string): string {
  return neiRong.replace(/[<>]/g, '')
}

function jianCeGaoWeiSQLZhuRu(zhi: unknown): boolean {
  if (typeof zhi === 'string') {
    return gaoWeiSQLZhuRuMoShi.some((moShi) => moShi.test(zhi))
  }
  if (Array.isArray(zhi)) {
    return zhi.some((xiang) => jianCeGaoWeiSQLZhuRu(xiang))
  }
  if (typeof zhi === 'object' && zhi !== null) {
    return Object.values(zhi).some((xiang) => jianCeGaoWeiSQLZhuRu(xiang))
  }
  return false
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
  const wanZhengLuJing = decodeURIComponent(`${qingQiu.baseUrl || ''}${qingQiu.path || ''}`)
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
      if (jianCeGaoWeiSQLZhuRu(jianCeMuBiao)) {
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

    if (qingQiu.body && typeof qingQiu.body === 'object') {
      qingQiu.body = qingLiBody(qingQiu.body)
    }

    xiaYiBu()
  } catch (cuoWu) {
    console.error('安全中间件执行失败', cuoWu)
    shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
}

function qingLiBody(body: unknown): unknown {
  if (typeof body === 'string') {
    return qingLiShuRu(body)
  }
  if (Array.isArray(body)) {
    return body.map((xiang) => qingLiBody(xiang))
  }
  if (typeof body === 'object' && body !== null) {
    const jieGuo: Record<string, unknown> = {}
    for (const [jian, zhi] of Object.entries(body)) {
      jieGuo[jian] = qingLiBody(zhi)
    }
    return jieGuo
  }
  return body
}
