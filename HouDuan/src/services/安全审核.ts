import { debug日志 } from '../utils/debug日志'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianAnQuanShenHePrompt } from './Prompt构建器'
import { peiZhi } from '../config'
import { huoQuFanYi } from '../config/translations'
import { SHEN_HE_FU_WU_BU_KE_YONG_JIAN } from '../config/媒体配置'
import { jiaZaiZuiXinCiKu, saoMiaoNeiRong } from './审核词库'
import type { AnQuanShenHeJieGuo } from '../types'

let ciKuHuanCun: Awaited<ReturnType<typeof jiaZaiZuiXinCiKu>> | null = null

async function huoQuCiKu() {
  if (!ciKuHuanCun) {
    ciKuHuanCun = await jiaZaiZuiXinCiKu()
  }
  return ciKuHuanCun
}

function saoMiaoJiuCiKu(xiaoXi: string): { weiGui: boolean; mingZhongCi?: string } {
  const xiaoXieXiaoXi = xiaoXi.toLowerCase()
  const mingZhongCi = peiZhi.shuRuWeiJinCiLieBiao.find(
    (ci) => ci.length > 0 && xiaoXieXiaoXi.includes(ci.toLowerCase()),
  )
  if (mingZhongCi) {
    return { weiGui: true, mingZhongCi }
  }
  return { weiGui: false }
}

export interface WeiJiGanYuJieGuo {
  wei_ji: boolean
  ming_zhong_ci?: string
  yuan_zhu_re_xian: string
  ti_shi: string
}

export function jianCeWeiJiXinHao(xiaoXi: string): WeiJiGanYuJieGuo | null {
  const wenBen = typeof xiaoXi === 'string' ? xiaoXi : ''
  if (!wenBen.trim()) return null
  const mingZhong = peiZhi.weiJiGanYu.guanJianCi.find(
    (ci) => ci.length > 0 && wenBen.includes(ci),
  )
  if (!mingZhong) return null
  return {
    wei_ji: true,
    ming_zhong_ci: mingZhong,
    yuan_zhu_re_xian: peiZhi.weiJiGanYu.yuanZhuReXian,
    ti_shi: huoQuFanYi('anQuan', 'weiJiGanYuTiShi'),
  }
}

export async function shenHeNeiRongAnQuan(xiaoXi: string): Promise<AnQuanShenHeJieGuo> {
  const ciKu = await huoQuCiKu()

  const benDiSaoMiao = saoMiaoNeiRong(xiaoXi, ciKu)
  if (benDiSaoMiao.weiGui) {
    return {
      wei_gui: true,
      lei_xing: benDiSaoMiao.leiBie || '本地词库拦截',
      li_you: `消息命中${benDiSaoMiao.leiBie || '本地词库'}违禁词：${benDiSaoMiao.mingZhongCi}`,
    }
  }

  try {
    const xiangYing = await genJuPeiZhiTiaoYong('anQuanShenHe', [
      { jiaoSe: 'system', neiRong: '判断消息是否违规，只输出 JSON。' },
      { jiaoSe: 'user', neiRong: gouJianAnQuanShenHePrompt(xiaoXi) },
    ])

    const shuJu = jieXiJSON(xiangYing.neiRong)
    const queXinDu = Number(shuJu['确信度'] ?? shuJu['que_xin_du'] ?? 0)
    const weiGui = Boolean(shuJu['违规'] ?? shuJu['wei_gui'] ?? false)
    const yanZhongChengDu = shuJu['严重程度'] ?? shuJu['yan_zhong_cheng_du']

    return {
      wei_gui: weiGui && queXinDu > 0.8,
      yan_zhong_cheng_du: xiuZhengYanZhongChengDu(yanZhongChengDu),
      lei_xing: String(shuJu['类型'] ?? shuJu['lei_xing'] ?? ''),
      li_you: String(shuJu['理由'] ?? shuJu['li_you'] ?? ''),
    }
  } catch (cuoWu) {
    debug日志.error('安全审核', 'AI审核失败，使用旧版本地词库兜底', { xiang_qing: { cuo_wu: String(cuoWu) } })
    try {
      const jiuCiKuSaoMiao = saoMiaoJiuCiKu(xiaoXi)
      if (jiuCiKuSaoMiao.weiGui) {
        // eslint-disable-next-line no-console -- 安全与合规.test 断言此输出含「已降级」(行为契约)
        console.error('[安全审核] AI审核服务不可用，已降级为本地词库扫描')
        return {
          wei_gui: true,
          lei_xing: '本地词库拦截',
          li_you: `消息命中本地违禁词（旧版兜底）：${jiuCiKuSaoMiao.mingZhongCi}`,
        }
      }
      return {
        wei_gui: true,
        lei_xing: SHEN_HE_FU_WU_BU_KE_YONG_JIAN,
        li_you: huoQuFanYi('anQuan', 'shenHeFuWuBuKeYong'),
      }
    } catch (cuoWu2) {
      debug日志.error('安全审核', '[安全审核] 降级扫描自身失败，按违规拦截', { xiang_qing: { cuo_wu: String(cuoWu2) } })
      return {
        wei_gui: true,
        lei_xing: SHEN_HE_FU_WU_BU_KE_YONG_JIAN,
        li_you: huoQuFanYi('anQuan', 'shenHeFuWuBuKeYong'),
      }
    }
  }
}

function xiuZhengYanZhongChengDu(
  zhi: unknown,
): 'qing_wei' | 'zhong_deng' | 'yan_zhong' | undefined {
  if (zhi === '轻微' || zhi === 'qing_wei') return 'qing_wei'
  if (zhi === '中等' || zhi === 'zhong_deng') return 'zhong_deng'
  if (zhi === '严重' || zhi === 'yan_zhong') return 'yan_zhong'
  return undefined
}

function jieXiJSON(neiRong: string): Record<string, unknown> {
  const qingLi = neiRong.trim()
  try {
    return JSON.parse(qingLi)
  } catch {
    const piPei = qingLi.match(/\{[\s\S]*\}/)
    if (piPei) {
      try {
        return JSON.parse(piPei[0])
      } catch {
        return {}
      }
    }
    return {}
  }
}

export function chongZhiCiKuHuanCun(): void {
  ciKuHuanCun = null
}