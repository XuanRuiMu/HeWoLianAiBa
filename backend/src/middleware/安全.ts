import { debug日志 } from '../utils/debug日志'
import type { Request, Response, NextFunction } from 'express'
import { huoQuFanYi } from '../config/translations'
import { shiBaiXiangYing } from '../utils/xiangying'
import { 获取IP, 记录违规 } from '../services/IP封禁'

export const gaoWeiSQLZhuRuMoShi = [
  // 强破坏性结构：正常聊天中几乎不可能出现，单一命中即拦
  /UNION\s+SELECT/i,
  /DROP\s+TABLE/i,
  /INSERT\s+INTO/i,
  /DELETE\s+FROM/i,
  /UPDATE\s+SET/i,
  /INTO\s+OUTFILE/i,
  // 易误伤的函数/表达式特征：需与其他高危特征共现才判违规
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

// M8：弱特征组（易被正常文学表达误伤），仅在与其它高危特征共现时参与判定
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

export function qingLiShuRu(neiRong: string): string {
  return neiRong.replace(/[<>]/g, '')
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
  // 任一强破坏性特征命中即违规；仅弱特征时需 ≥2 共现
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
      // M8：聊天正文豁免普通 SQL 片段误伤，仅在 ≥2 个高危特征共现时判定违规
      //（正常文学表达如「select 一门课」「or 1=1 也行吧」不再触发封禁阶梯）
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

    if (qingQiu.body && typeof qingQiu.body === 'object') {
      qingQiu.body = qingLiBody(qingQiu.body)
    }

    xiaYiBu()
  } catch (cuoWu) {
    debug日志.error('安全中间件', '安全中间件执行失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
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
