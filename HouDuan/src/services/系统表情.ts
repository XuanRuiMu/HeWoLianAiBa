import { debug日志 } from '../utils/debug日志'
import { baoCunJiaoSeMeiTiXiaoXi, type XiaoXiXinXi } from './消息'
import { chaAnDuanMing, duanMingDaoUUID, quHouXuan, type BiaoQingKuTiaoMu } from './表情包库'
import { BiaoQingShuLeiBie, LeiBieDaoXiaoXiLeiXing } from '../config/媒体配置'
import {
  BiaoQingBaoYunXing,
  BiaoQingDaiDaBiao,
  BiaoQingFaSongShiJiWenAn,
  BiaoQingFaSongYuanYin,
  BiaoQingHouXuanWenAn,
  BiaoQingTieZhiShiLi,
  BiaoQingTieZhiZhanWei,
} from '../config/表情包配置'
import type { BiaoQingZaiTiJueCe } from './表情载体'

export interface XiTongBiaoQingXiang {
  id: string
  duanMing: string
  miaoShu: string
  qingXuBiaoQian: string
  shiYongChangJing: string
  sha256: string
  mime: string
}

const RiZhiLeiXing = '系统表情'

const BiaoQingXiaoXiLeiXing = LeiBieDaoXiaoXiLeiXing[BiaoQingShuLeiBie]

function tianChongMoBan(moBan: string, zhi: Readonly<Record<string, string>>): string {
  let jieGuo = moBan
  for (const [jian, zhiXiang] of Object.entries(zhi)) {
    jieGuo = jieGuo.split(`{${jian}}`).join(zhiXiang)
  }
  return jieGuo
}

function tieZhiWenBen(duanMing: string): string {
  return BiaoQingTieZhiShiLi.split(BiaoQingTieZhiZhanWei).join(duanMing)
}

function zhuangXiang(tiaoMu: BiaoQingKuTiaoMu): XiTongBiaoQingXiang {
  return {
    id: duanMingDaoUUID(tiaoMu.duanMing),
    duanMing: tiaoMu.duanMing,
    miaoShu: tiaoMu.miaoShu,
    qingXuBiaoQian: tiaoMu.qingXuBiaoQian,
    shiYongChangJing: tiaoMu.shiYongChangJing,
    sha256: tiaoMu.sha256,
    mime: tiaoMu.mime,
  }
}

export async function houXuanXiTongBiaoQing(
  yiTu: string | null | undefined,
  shuLiang: number,
  jueCe?: BiaoQingZaiTiJueCe,
): Promise<XiTongBiaoQingXiang[]> {
  const youXiaoYiTu = typeof yiTu === 'string' && yiTu.trim() !== '' ? yiTu.trim() : null
  try {
    const guoLv = jueCe
      ? { yunXuFengGe: jueCe.yunXuFengGe, guanXiJieDuanXuHao: jueCe.guanXiJieDuanXuHao }
      : undefined
    const lieBiao = guoLv
      ? await quHouXuan(youXiaoYiTu, shuLiang, guoLv)
      : await quHouXuan(youXiaoYiTu, shuLiang)
    if (lieBiao.length === 0) {
      debug日志.warn(RiZhiLeiXing, '表情包库没有可用候选，本轮不给表情包', {
        xiang_qing: {
          yuan_yin: BiaoQingFaSongYuanYin.kuWeiKong,
          qing_xu: youXiaoYiTu ?? '',
          qing_qiu_shu_liang: shuLiang,
        },
      })
      return []
    }
    debug日志.debug(RiZhiLeiXing, '表情包候选已就绪', {
      xiang_qing: { qing_xu: youXiaoYiTu ?? '', hou_xuan_shu: lieBiao.length },
    })
    return lieBiao.map(zhuangXiang)
  } catch (cuoWu) {
    debug日志.warn(RiZhiLeiXing, '表情包库读取失败，本轮不给表情包', {
      xiang_qing: {
        yuan_yin: BiaoQingFaSongYuanYin.kuWeiKong,
        cuo_wu: String(cuoWu).slice(0, 200),
      },
    })
    return []
  }
}

export async function chaZhaoBiaoQingAnDuanMing(duanMing: string): Promise<XiTongBiaoQingXiang | null> {
  if (typeof duanMing !== 'string') return null
  const jianHua = duanMing.trim()
  if (jianHua === '') return null
  try {
    const tiaoMu = await chaAnDuanMing(jianHua)
    if (!tiaoMu) {
      debug日志.debug(RiZhiLeiXing, '贴纸短名未命中表情包库', {
        xiang_qing: { duan_ming: jianHua, yuan_yin: BiaoQingFaSongYuanYin.weiMingZhong },
      })
      return null
    }
    if (!tiaoMu.qiYong) {
      debug日志.warn(RiZhiLeiXing, '贴纸条目已停用，按未命中处理', {
        xiang_qing: { duan_ming: jianHua, yuan_yin: BiaoQingFaSongYuanYin.yiJinYong },
      })
      return null
    }
    return zhuangXiang(tiaoMu)
  } catch (cuoWu) {
    debug日志.warn(RiZhiLeiXing, '表情包库查询失败，按未命中处理', {
      xiang_qing: {
        duan_ming: jianHua,
        yuan_yin: BiaoQingFaSongYuanYin.weiMingZhong,
        cuo_wu: String(cuoWu).slice(0, 200),
      },
    })
    return null
  }
}

export async function faSongBiaoQingBaoXiaoXi(
  yongHuId: string,
  jiaoSeId: string,
  duanMing: string,
): Promise<XiaoXiXinXi | null> {
  const jianHua = typeof duanMing === 'string' ? duanMing.trim() : ''
  if (jianHua === '') {
    debug日志.warn(RiZhiLeiXing, '贴纸指令没有短名，本条丢弃', {
      yong_hu_id: yongHuId,
      jiao_se_id: jiaoSeId,
      xiang_qing: { yuan_yin: BiaoQingFaSongYuanYin.weiMingZhong },
    })
    return null
  }
  const biaoQing = await chaZhaoBiaoQingAnDuanMing(jianHua)
  if (!biaoQing) return null
  try {
    return await baoCunJiaoSeMeiTiXiaoXi({
      yong_hu_id: yongHuId,
      jiao_se_id: jiaoSeId,
      nei_rong: tieZhiWenBen(biaoQing.duanMing),
      lei_xing: BiaoQingXiaoXiLeiXing,
      mei_ti_id: null,
      duan_ming: biaoQing.duanMing,
    })
  } catch (cuoWu) {
    debug日志.warn(RiZhiLeiXing, '表情包消息落库失败，本条丢弃', {
      yong_hu_id: yongHuId,
      jiao_se_id: jiaoSeId,
      xiang_qing: {
        duan_ming: biaoQing.duanMing,
        yuan_yin: BiaoQingFaSongYuanYin.luoKuShiBai,
        cuo_wu: String(cuoWu).slice(0, 200),
      },
    })
    return null
  }
}

export function zuZhuangBiaoQingHouXuanKuai(tiaoMuLieBiao: XiTongBiaoQingXiang[]): string {
  if (tiaoMuLieBiao.length === 0) return ''
  const shiLi = tieZhiWenBen(tiaoMuLieBiao[0].duanMing)
  const shuoMing = BiaoQingHouXuanWenAn.daiTiShuoMing.map((hang) =>
    tianChongMoBan(hang, {
      tie_zhi_shi_li: shiLi,
      zui_da_zhang_shu: String(BiaoQingBaoYunXing.zuiDaMeiLunZhangShu),
    }),
  )
  const hangLieBiao = tiaoMuLieBiao.map((xiang) =>
    tianChongMoBan(BiaoQingHouXuanWenAn.hangMoBan, {
      tie_zhi_shi_li: tieZhiWenBen(xiang.duanMing),
      miao_shu: xiang.miaoShu || BiaoQingHouXuanWenAn.moShuKong,
      qing_xu: xiang.qingXuBiaoQian || BiaoQingDaiDaBiao,
      chang_jing: xiang.shiYongChangJing || BiaoQingHouXuanWenAn.changJingKong,
    }),
  )
  return [
    BiaoQingHouXuanWenAn.biaoTi,
    ...shuoMing,
    BiaoQingFaSongShiJiWenAn,
    ...hangLieBiao,
  ].join('\n')
}

export async function shengChengBiaoQingHouXuanWenBen(
  yiTu: string | null | undefined,
  jueCe?: BiaoQingZaiTiJueCe,
): Promise<string> {
  if (!BiaoQingBaoYunXing.daKai) return ''
  if (!jueCe || !jueCe.geiHouXuan) return ''
  const lieBiao = await houXuanXiTongBiaoQing(yiTu, BiaoQingBaoYunXing.houXuanShuLiang, jueCe)
  return zuZhuangBiaoQingHouXuanKuai(lieBiao)
}
