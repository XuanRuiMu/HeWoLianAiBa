import { debug日志 } from '../utils/debug日志'
import { huoQuFanYi } from '../config/translations'
import { JUN_SHI_ZHI_DAO_DUAN_DING_YI } from '../config/军师配置'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianJunShiQiuZhuPrompt, geShiHuaJunShiLiShi } from './Prompt构建器'
import type {
  JunShiQiuZhuCanShu,
  JunShiQiuZhuJieGuo,
  JunShiZhiDaoFenDuan,
} from '../types'
import type { CanShuShangXiaWen } from '../config/AI参数策略'

export async function shengChengJunShiZhiDao(
  canShu: JunShiQiuZhuCanShu,
  shangXiaWen?: CanShuShangXiaWen,
): Promise<JunShiQiuZhuJieGuo> {
  try {
    const duiHuaWenBen = geShiHuaJunShiLiShi(canShu.dui_hua_li_shi, canShu.jiao_se_ming)
    // 未显式传入上下文时，用调用方已持有的好感度构造关系上下文（向后兼容：无则退回基座）
    const shangXiaWenShiJi = shangXiaWen ?? {
      haoGanDu: {
        zong_fen: canShu.hao_gan_du?.zong_fen,
        guan_xi_jie_duan: canShu.hao_gan_du?.guan_xi_jie_duan,
      },
    }
    const xiangYing = await genJuPeiZhiTiaoYong('junShiQiuZhu', [
      { jiaoSe: 'system', neiRong: canShu.jun_shi_pei_zhi.xiTongTiShi },
      {
        jiaoSe: 'user',
        neiRong: gouJianJunShiQiuZhuPrompt(
          duiHuaWenBen,
          canShu.jiao_se_ming,
          canShu.hao_gan_du,
        ),
      },
    ], shangXiaWenShiJi)

    const yuanWen = xiangYing.neiRong.trim()
    if (!yuanWen) {
      return { zhi_dao_fen_duan: null, zhi_dao_zheng_duan: huoQuJiangJiWenBen() }
    }
    const fenDuan = jieXiJunShiFenDuan(yuanWen)
    if (!fenDuan) {
      debug日志.warn('军师指导', '军师输出未按 JSON 分区，降级为整段文本', {
        xiang_qing: { zi_shu: yuanWen.length },
      })
      return { zhi_dao_fen_duan: null, zhi_dao_zheng_duan: yuanWen }
    }
    return { zhi_dao_fen_duan: fenDuan, zhi_dao_zheng_duan: pinJieJunShiFenDuan(fenDuan) }
  } catch (cuoWu) {
    debug日志.error('军师指导', '军师指导生成失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return { zhi_dao_fen_duan: null, zhi_dao_zheng_duan: huoQuJiangJiWenBen() }
  }
}

function qingLiJSONKuai(neiRong: string): Record<string, unknown> | null {
  const qingLi = neiRong.trim()
  const changShi: string[] = [qingLi]
  const piPei = qingLi.match(/\{[\s\S]*\}/)
  if (piPei) changShi.push(piPei[0])
  for (const changShiText of changShi) {
    try {
      const jieXi = JSON.parse(changShiText) as unknown
      if (jieXi && typeof jieXi === 'object' && !Array.isArray(jieXi)) {
        return jieXi as Record<string, unknown>
      }
    } catch {
      continue
    }
  }
  return null
}

function qieDuanWenBen(wenBen: string, zuiDaZiShu: number): string {
  const qu = wenBen.trim()
  if (qu.length <= zuiDaZiShu) return qu
  return `${qu.slice(0, Math.max(0, zuiDaZiShu - 1))}…`
}

export function jieXiJunShiFenDuan(neiRong: string): JunShiZhiDaoFenDuan | null {
  const duiXiang = qingLiJSONKuai(neiRong)
  if (!duiXiang) return null
  const fenDuan: JunShiZhiDaoFenDuan = {
    dangQianJuMian: '',
    xiaYiBuZenMeHui: '',
    weiShenMeZheMeLiao: '',
    guLi: '',
  }
  for (const duan of JUN_SHI_ZHI_DAO_DUAN_DING_YI) {
    const yuanShi = duiXiang[duan.moXingJian]
    const wenBen = typeof yuanShi === 'string' ? yuanShi : ''
    fenDuan[duan.ziDuan] = qieDuanWenBen(wenBen, duan.zuiDaZiShu)
  }
  if (
    !fenDuan.dangQianJuMian &&
    !fenDuan.xiaYiBuZenMeHui &&
    !fenDuan.weiShenMeZheMeLiao &&
    !fenDuan.guLi
  ) {
    return null
  }
  return fenDuan
}

export function pinJieJunShiFenDuan(fenDuan: JunShiZhiDaoFenDuan): string {
  return JUN_SHI_ZHI_DAO_DUAN_DING_YI.map((duan) => fenDuan[duan.ziDuan])
    .filter((zhi) => zhi.length > 0)
    .join('\n')
}

function huoQuJiangJiWenBen(): string {
  return huoQuFanYi('junShi', 'zanShiMeiXiangHao')
}
