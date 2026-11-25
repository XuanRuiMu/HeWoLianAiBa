


































































































  'shi_po_xian_suo',
]
export const ZhaXingYinCangZiDuan: readonly (keyof ShengChengJiaoSeJieGuo)[] = [
  'shi_fou_zha_xing',
  'zha_fa_miao_shu',
  'hua_shu',
  'bao_lu_fang_shi',
  'shi_po_xian_suo',
]
export const JiaoSeYinSiZiDuan: readonly (keyof ShengChengJiaoSeJieGuo)[] = [
  'ming_zi',
  'zhen_shi_ming',
  'bei_jing_gu_shi',
  'shi_jie_xin_xi',
  'xi_tong_ti_shi',
  'ba_da_mo_kuai',
]
export const 角色隐私字段 = JiaoSeYinSiZiDuan
export const 待确认角色键 = daiQueRenJiaoSeJian
export const 缓存待确认角色 = huanCunDaiQueRenJiaoSe
export const 读待确认角色 = duQuDaiQueRenJiaoSe

const RenSheWenBenXingZiDuan: ReadonlySet<string> = new Set([
  'ming_zi', 'wei_xin_ming', 'zhen_shi_ming', 'shen_fen', 'wai_mao', 'xing_ge',
  'bei_jing_gu_shi', 'yan_yu_feng_ge', 'xing_wei_te_dian', 'xi_huan_de_lei_xing',
  'jia_ting_bei_jing', 'qing_gan_jing_li', 'zha_fa_miao_shu', 'bao_lu_fang_shi',
])

export function qingXiRenSheDuiXiang<T extends Record<string, unknown>>(jiaoSe: T): T {
  const jieGuo: Record<string, unknown> = {}
  const yuan = jiaoSe as Record<string, unknown>
  for (const jian of Object.keys(yuan)) {
    if (!RenSheBaiMingDanZiDuan.has(jian)) continue
    if (KeHuDuanJinZiDuan.includes(jian)) continue
    const zhi = yuan[jian]
    if (RenSheWenBenXingZiDuan.has(jian) && typeof zhi === 'string') {
      jieGuo[jian] = qingXiRenSheWenBen(zhi)
    } else {
      jieGuo[jian] = zhi
    }
  }
  return jieGuo as T
}

export function chongZhuZhaXingZiDuan(
  jiaoSe: ShengChengJiaoSeJieGuo,
): ShengChengJiaoSeJieGuo {
  if (!jiaoSe.shi_fou_zha_xing) {
    delete jiaoSe.zha_fa_miao_shu
    delete jiaoSe.hua_shu
    delete jiaoSe.bao_lu_fang_shi
    delete jiaoSe.shi_po_xian_suo
    return jiaoSe
  }
  const mbti = jiaoSe.mbti_lei_xing
  if (!mbtiLieBiao.includes(mbti)) return jiaoSe
  const zhaXing = zhaXingBianTi[mbti]
  jiaoSe.zha_fa_miao_shu = zhaXing.zhaFaMiaoShu
  jiaoSe.hua_shu = [...zhaXing.huaShu]
  jiaoSe.bao_lu_fang_shi = zhaXing.baoLuFangShi
  jiaoSe.shi_po_xian_suo = [...zhaXing.shiPoXianSuo]
  return jiaoSe
}

const ZhaXingYuHaoGanDuYinCangZiDuan: readonly (keyof ShengChengJiaoSeJieGuo)[] = [
  ...ZhaXingYinCangZiDuan,
  'hao_gan_du_zong_fen',
]

const WanJiaKeJianXingGuiLei: Record<keyof ShengChengJiaoSeJieGuo, boolean> = {
  id: true,
  gong_kai_bian_hao: false,
  ming_zi: false,
  xing_bie: true,
  nian_ling: true,
  shen_fen: true,
  wai_mao: true,
  xing_ge: true,
  bei_jing_gu_shi: false,
  xi_hao: true,
