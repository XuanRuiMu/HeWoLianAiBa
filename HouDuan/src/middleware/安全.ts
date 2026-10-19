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

/**
 * 出参防伪控制字符真源（本地常量，避免与 utils/xiangying 形成循环依赖）。
 * 口径与 utils/控制字符.ts 的 剥离控制字符 完全一致：保留 \t 与 \n，剥离 C0 其余控制符、
 * DEL(U+007F) 与非字符 U+FFFE/U+FFFF。本模块是出参最后一道关口，历史脏数据由它兜底。
 */
const CHU_CAN_KONG_ZHI_ZI_FU = /[\u0000-\u0008\u000B-\u001F\u007F\uFFFE\uFFFF]/g

function 剥离出参控制字符(zhi: string): string {
  return zhi.replace(CHU_CAN_KONG_ZHI_ZI_FU, '')
}

/**
 * 纯 API 出参的规范化（YH-021 修订）。
 *
 * 历史实现把「输出转义」做成了对 JSON 字符串值逐层跑 HTML 五元字符转义，并由
 * app.use 与 chengGongXiangYing 两处叠加执行。该做法有三重错误：
 *  1. 会改变数据本身——玩家真的输入「<喜欢你>」时，出参变成 &lt;喜欢你&gt;，同一串再经过
 *     任何一层就是 &amp;lt;…（已用测试钉死），前端按 {{ 文本 }} 文本插值渲染时会把实体
 *     原样显示成 &lt;喜欢你&gt;，属需求级缺陷；
 *  2. 转义会对同一出参执行两次（响应工具一次、中间件一次），实体被二次编码；
 *  3. 本接口族全部是 application/json，玩家文本在客户端一律经 Vue 文本插值上屏，
 *     HTML 实体转义在这里既无渲染收益，又污染了数据、搜索与长度。
 *
 * 因此修正口径为：出参只做「防伪控制字符清洗」——剥离 C0 控制符、DEL 与非字符，
 * 保留 \t 与 \n。占位符与脏值（undefined/null/[object Object]）做同构映射，
 * 不允许它们经 JSON.stringify 变成裸 undefined 或 "undefined"。真正的 HTML 转义
 * 由渲染方负责（客户端文本插值 / 富文本白名单），服务端不再替渲染层做决定。
 * 若将来出现服务端直接拼 HTML 的出口，必须在该出口单独调用显式转义函数，
 * 而不是把转义塞回本条通用出参链路。
 */
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
  let wanZhengLuJing = `${qingQiu.baseUrl || ''}${qingQiu.path || ''}`
  // YH-029 畸形编码转400：decode失败不再抛500
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

    xiaYiBu()
  } catch (cuoWu) {
    debug日志.error('安全中间件', '安全中间件执行失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
}
