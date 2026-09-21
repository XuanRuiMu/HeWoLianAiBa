import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'

export type SiKaoShiJian =
  | 'guan-li-yuan-shen-du-si-kao'
  | 'guan-li-yuan-gou-jian-guo-cheng'
  | 'guan-li-yuan-yin-cang-xin-xi'
  | 'guan-li-yuan-hao-gan-du-bian-hua'

export const SI_KAO_SHI_JIAN_BAI_MING_DAN: readonly SiKaoShiJian[] = [
  'guan-li-yuan-shen-du-si-kao',
  'guan-li-yuan-gou-jian-guo-cheng',
  'guan-li-yuan-yin-cang-xin-xi',
  'guan-li-yuan-hao-gan-du-bian-hua',
]

export const SI_KAO_NEI_RONG_ZUI_DA_ZI_FU = 1500

export interface JiLuSiKaoCanShu {
  yong_hu_id: string
  jiao_se_id: string
  shi_jian: SiKaoShiJian
  lai_yuan?: string
  jie_duan?: string
  lei_xing?: string
  nei_rong: string
  lun_ci?: number
}

function qieDuanNeiRong(neiRong: string): { cunChu: string; yuanWenChangDu: number } {
  const yuanWenChangDu = neiRong.length
  if (yuanWenChangDu <= SI_KAO_NEI_RONG_ZUI_DA_ZI_FU) {
    return { cunChu: neiRong, yuanWenChangDu }
  }
  return { cunChu: `${neiRong.slice(0, SI_KAO_NEI_RONG_ZUI_DA_ZI_FU)}……`, yuanWenChangDu }
}

export async function jiLuSiKao(
  canShu: JiLuSiKaoCanShu,
): Promise<{ cheng_gong: boolean; ti_shi?: string }> {
  if (!SI_KAO_SHI_JIAN_BAI_MING_DAN.includes(canShu.shi_jian)) {
    return { cheng_gong: false, ti_shi: '未知思考事件' }
  }
  const neiRong = canShu.nei_rong.trim()
  if (!neiRong) {
    return { cheng_gong: false, ti_shi: '思考内容为空' }
  }
  const { cunChu, yuanWenChangDu } = qieDuanNeiRong(canShu.nei_rong)
  try {
    await 数据库.query(
      `INSERT INTO "思考记录" ("用户ID", "角色ID", "事件", "来源", "阶段", "类型", "内容", "原文长度", "轮次")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        canShu.yong_hu_id,
        canShu.jiao_se_id,
        canShu.shi_jian,
        (canShu.lai_yuan || '').slice(0, 20),
        (canShu.jie_duan || '').slice(0, 50),
        (canShu.lei_xing || '').slice(0, 50),
        cunChu,
        yuanWenChangDu,
        canShu.lun_ci ?? 0,
      ],
    )
    return { cheng_gong: true }
  } catch (cuoWu) {
    debug日志.error('思考记录', '思考落库失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return { cheng_gong: false, ti_shi: '思考落库失败' }
  }
}
