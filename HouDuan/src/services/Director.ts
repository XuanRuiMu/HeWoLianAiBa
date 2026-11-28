import { debug日志 } from '../utils/debug日志'
import { 按配置调用 } from '../utils/通用模型调用'
import { gouJianDirectorPrompt } from './Prompt构建器'
import { paiRuZhongShiDuiLie } from './重试队列'
import { zhuRuBenLunTuXiangKuai } from './对话渲染'
import { 检索通用知识, type 通用知识检索结果 } from './通用知识检索'
import { 表情运行标签 } from '../config/表情包配置'
import type { 对话块 } from '../utils/通用模型调用'
import type { AIYinQingShuRu, ChongTuShiJianPanDing, DirectorCeLue, GuanXiBianHua, XinQingMingZhi } from '../types'
import { XinQingLieBiao as XinQingMingZhiLieBiao } from './当前心情'
import * as YuYanGongNeng from '../config/语言与时区'
import type { 参数上下文 } from '../config/AI参数策略'

export interface DirectorJieGuo {
  cheng_gong: boolean
  ce_lue: DirectorCeLue & { need_recall?: boolean }
  cuo_wu?: string
  si_kao?: string
  yuan_wen?: string
}

const YunXuYiTu = new Set<string>(表情运行标签)

function biaoQingYiTuZhi(zhi: unknown): string | null {
  if (typeof zhi !== 'string') return null
  const qingLi = zhi.trim()
  if (qingLi === '' || qingLi === 'null') return null
  return YunXuYiTu.has(qingLi) ? qingLi : null
}

function moRenCeLue(): DirectorCeLue {
  return {
    yong_hu_yi_tu: 'unknown',
    qing_gan_fen_xi: 'unknown',
    hui_fu_ce_lue: 'unknown',
    shi_fou_hui_fu: true,
    hui_fu_tiao_shu: 1,
    shi_jian_qing_xu: 'unknown',
    shi_fou_che_hui: false,
    shi_fou_zhu_dong_biao_bai: false,
    biao_qing_yi_tu: null,
  }
}

export function jieXiDirectorXiangYing(neiRong: string): { ceLue: DirectorCeLue; jieXiChengGong: boolean } {
  const qingLiNeiRong = neiRong.trim()
  let shuJu: Record<string, unknown> | null = null

  try {
    shuJu = JSON.parse(qingLiNeiRong)
  } catch {
    const piPei = qingLiNeiRong.match(/\{[\s\S]*\}/)
    if (piPei) {
      try {
        shuJu = JSON.parse(piPei[0])
      } catch {
        return { ceLue: moRenCeLue(), jieXiChengGong: false }
      }
    } else {
      return { ceLue: moRenCeLue(), jieXiChengGong: false }
    }
  }
  if (!shuJu || typeof shuJu !== 'object') {
    return { ceLue: moRenCeLue(), jieXiChengGong: false }
  }

  const huiFuTiaoShu = Number(shuJu['回复条数'] || shuJu['hui_fu_tiao_shu'] || 1)
  const xiuZhengTiaoShu = Number.isNaN(huiFuTiaoShu) ? 1 : Math.max(0, Math.min(5, huiFuTiaoShu))
  const shiTiZhi = shuJu['当前话题实体'] ?? shuJu['dangQianHuaTiShiTi']
  const youShiTi = Array.isArray(shiTiZhi)
  const shiTiLieBiao = youShiTi
    ? (shiTiZhi as unknown[]).map((x) => String(x ?? '').trim()).filter((x) => x.length > 0).slice(0, 8)
    : []

  return {
    ceLue: {
      yong_hu_yi_tu: String(shuJu['用户意图'] || shuJu['yong_hu_yi_tu'] || 'unknown'),
      qing_gan_fen_xi: String(shuJu['情感分析'] || shuJu['qing_gan_fen_xi'] || 'unknown'),
      yao_jie_zhu_de_dian: String(shuJu['这条里要接住的点'] || shuJu['yao_jie_zhu_de_dian'] || '').trim(),
      zha_dong_zuo: String(shuJu['渣动作'] || shuJu['zha_dong_zuo'] || '').trim() || undefined,
      hui_fu_ce_lue: String(shuJu['回复策略'] || shuJu['hui_fu_ce_lue'] || 'unknown'),
      shi_fou_hui_fu: Boolean(shuJu['是否回复'] ?? shuJu['shi_fou_hui_fu'] ?? true),
      hui_fu_tiao_shu: xiuZhengTiaoShu,
      shi_jian_qing_xu: String(shuJu['时间情绪'] || shuJu['shi_jian_qing_xu'] || 'unknown'),
      shi_fou_che_hui: Boolean(shuJu['是否撤回'] ?? shuJu['shi_fou_che_hui'] ?? false),
      shi_fou_zhu_dong_biao_bai: Boolean(shuJu['是否主动表白'] ?? shuJu['shi_fou_zhu_dong_biao_bai'] ?? false),
      biao_qing_yi_tu: biaoQingYiTuZhi(shuJu['biao_qing_yi_tu']),
      qing_gan_nong_du: quNongDu(shuJu['qing_gan_nong_du']),
      guan_xi_bian_hua: quGuanXiBianHua(quZhi(shuJu, '关系变化', 'guan_xi_bian_hua')),
      xin_qing: quXinQing(quZhi(shuJu, '心情', 'xin_qing')),
      xin_qing_qiang_du: quXinQingQiangDu(quZhi(shuJu, '心情强度', 'xin_qing_qiang_du')),
      xin_qing_li_you: quXinQingLiYou(quZhi(shuJu, '心情理由', 'xin_qing_li_you')),
      yao_qiu_huan_yu_yan: quYaoQiuHuanYuYan(quZhi(shuJu, '要求换语言', 'yao_qiu_huan_yu_yan')),
      bu_hui_li_you: quBuHuiLiYou(quZhi(shuJu, '不回的理由', 'bu_hui_li_you')),
      chongTuShiJian: quChongTuShiJian(quZhi(shuJu, '冲突事件', 'chongTuShiJian')),
      ...(youShiTi ? { dangQianHuaTiShiTi: shiTiLieBiao } : {}),
      ...(shuJu['需要回想'] === true ? { need_recall: true } : {}),
    },
    jieXiChengGong: true,
  }
}
function quZhi(sou: Record<string, unknown>, zhongWen: string, liuChengMing: string): unknown {
  if (zhongWen in sou) return sou[zhongWen]
  if (liuChengMing in sou) return sou[liuChengMing]
  return undefined
}

function quNongDu(zhi: unknown): number | undefined {
  if (zhi === null || zhi === undefined) return undefined
  const shu = Number(zhi)
  if (!Number.isFinite(shu)) return undefined
  return Math.max(0, Math.min(100, Math.round(shu)))
}

function quGuanXiBianHua(zhi: unknown): GuanXiBianHua | undefined {
  const wen = String(zhi ?? '').trim()
  if (wen === '更近' || wen === '更远' || wen === '没变') return wen
  return undefined
}

function quXinQing(zhi: unknown): XinQingMingZhi | null | undefined {
  if (zhi === null) return null
  const wen = String(zhi ?? '').trim()
  if (wen === '') return undefined
  if ((XinQingMingZhiLieBiao as readonly string[]).includes(wen)) return wen as XinQingMingZhi
  return undefined
}

function quXinQingQiangDu(zhi: unknown): number | null | undefined {
  if (zhi === null) return null
  const shu = Number(zhi)
  if (!Number.isFinite(shu)) return undefined
  return Math.max(0, Math.min(100, Math.round(shu)))
}

function quXinQingLiYou(zhi: unknown): string | null | undefined {
  if (zhi === null) return null
  const wen = String(zhi ?? '').trim()
  if (wen === '') return undefined
  return wen.slice(0, 200)
}

function quYaoQiuHuanYuYan(zhi: unknown): string | null | undefined {
  if (zhi === null) return null
  const wen = String(zhi ?? '').trim()
  if (wen === '') return undefined
  if (!YuYanGongNeng.yuYanYouXiao(wen)) return undefined
  return wen
}

const BuHuiLiYouBiao = ['对话收尾', '对方冒犯', '对方刷屏', '不想聊', '状态很差', '没什么可回']

function quBuHuiLiYou(zhi: unknown): string {
  const wen = String(zhi ?? '').trim()
  if (wen === '') return '没有'
  return (BuHuiLiYouBiao as readonly string[]).includes(wen) ? wen : '没有'
}

function quChongTuShiJian(zhi: unknown): ChongTuShiJianPanDing | null | undefined {
  if (zhi === null) return null
  if (typeof zhi !== 'object' || Array.isArray(zhi)) return undefined
  const sou = zhi as Record<string, unknown>
  const dongZuoYuan = String(sou['动作'] ?? sou['dongZuo'] ?? '').trim()
  const dongZuo =
    dongZuoYuan === 'yanZhong' || dongZuoYuan === '严重'
      ? 'yanZhong'
      : dongZuoYuan === 'shengQi' || dongZuoYuan === '生气'
        ? 'shengQi'
        : null
  if (!dongZuo) return undefined
  const shiYou = String(sou['事由'] ?? sou['shiYou'] ?? '').trim().slice(0, 200)
  return { dongZuo, shiYou }
}


export async function shengChengDirectorCeLue(
  shuRu: AIYinQingShuRu,
  shangXiaWen?: 参数上下文,
  waiBuXinHao?: AbortSignal,
  _zhiShi: 通用知识检索结果 = 检索通用知识(shuRu.yong_hu_xin_xiao_xi, !shuRu.zui_jia_shuo_de_shi),
): Promise<DirectorJieGuo> {
  try {
    const tuXiangKuai = await zhuRuBenLunTuXiangKuai(shuRu.dui_hua_li_shi)
    const tiShiCi = gouJianDirectorPrompt(shuRu, { dengJi: shuRu.huiYingDengJi })
    const yongHuNeiRong: string | 对话块[] =
      tuXiangKuai.length > 0
        ? [{ type: 'input_text', text: tiShiCi }, ...tuXiangKuai]
        : tiShiCi


    const daoYanZhiLing =
      '你负责判断角色这次是否回复、当下情绪、是否撤回和是否主动表白，只输出 JSON。情感分析字段写对方这条消息的语气和情绪。'
    const 带导演指令 = (内容: string | 对话块[]): string | 对话块[] =>
      typeof 内容 === 'string' ? `${内容}\n\n${daoYanZhiLing}` : [...内容, { type: 'input_text', text: daoYanZhiLing }]
    const xiaoXi = [{ jiaoSe: 'user' as const, neiRong: 带导演指令(yongHuNeiRong) }]

    let xiangYing = await 按配置调用('DaoYan', xiaoXi, shangXiaWen, waiBuXinHao)
    if (xiangYing.neiRong.trim() === '') {
      await new Promise((r) => setTimeout(r, 10000))
      xiangYing = await 按配置调用('DaoYan', xiaoXi, shangXiaWen, waiBuXinHao)
    }

    const { ceLue, jieXiChengGong } = jieXiDirectorXiangYing(xiangYing.neiRong)
    if (!jieXiChengGong) {
      debug日志.error('AI导演', 'Director响应解析失败，已标unknown并入重试队列', {
        xiang_qing: { yuan_wen_chang_du: xiangYing.neiRong.length, 原始响应: xiangYing.neiRong },
      })
      void paiRuZhongShiDuiLie({ leiXing: 'DaoYan', yuanYin: 'jie_xi_shi_bai' })
      return { cheng_gong: false, ce_lue: ceLue, cuo_wu: 'JIE_XI_SHI_BAI', yuan_wen: xiangYing.neiRong }
    }
    debug日志.debug('AI导演', 'Director策略已生成', { xiang_qing: { 策略: ceLue, 是否有思考: Boolean(xiangYing.siKaoNeiRong) } })
    return { cheng_gong: true, ce_lue: ceLue, si_kao: xiangYing.siKaoNeiRong || undefined, yuan_wen: xiangYing.neiRong }
  } catch (cuoWu) {
    const cuoWuXinXi = cuoWu instanceof Error ? cuoWu.message : String(cuoWu)
    const zhuangTaiMa = (cuoWu as { zhuangTaiMa?: unknown }).zhuangTaiMa
    debug日志.error('AI导演', 'Director调用失败', { xiang_qing: { cuo_wu: String(cuoWuXinXi) } })
    if (zhuangTaiMa === 429 || /429/.test(cuoWuXinXi)) {
      return { cheng_gong: false, ce_lue: moRenCeLue(), cuo_wu: 'XIAN_LIU_429' }
    }
    if (zhuangTaiMa === 402 || /402/.test(cuoWuXinXi)) {
      return { cheng_gong: false, ce_lue: moRenCeLue(), cuo_wu: 'YU_E_BU_ZU_402' }
    }
    return {
      cheng_gong: false,
      ce_lue: moRenCeLue(),
      cuo_wu: cuoWuXinXi,
    }
  }
}
