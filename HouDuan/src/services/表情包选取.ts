import { debug日志 } from '../utils/debug日志'
import { 保存角色媒体消息, type 消息信息 } from './消息'
import { 按短名查, 短名转UUID, 候选系统表情, type 表情包条目 } from './表情包库'
import { 语义候选 } from './语义表情检索'
import { 表情书类别, 类别到消息类型 } from '../config/媒体配置'
import {
  BiaoQingBaoYunXing,
  BiaoQingFaSongShiJiWenAn,
  BiaoQingFaSongYuanYin,
  BiaoQingHouXuanWenAn,
  表情包示例,
  表情包占位,
} from '../config/表情包配置'
import type { BiaoQingZaiTiJueCe } from './表情包载体'

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

const 表情消息类型 = 类别到消息类型[表情书类别]

function tianChongMoBan(moBan: string, zhi: Readonly<Record<string, string>>): string {
  let jieGuo = moBan
  for (const [jian, zhiXiang] of Object.entries(zhi)) {
    jieGuo = jieGuo.split(`{${jian}}`).join(zhiXiang)
  }
  return jieGuo
}

function 表情包文本(duanMing: string): string {
  return 表情包示例.split(表情包占位).join(duanMing)
}

function zhuangXiang(tiaoMu: 表情包条目): XiTongBiaoQingXiang {
  return {
    id: 短名转UUID(tiaoMu.duanMing),
    duanMing: tiaoMu.duanMing,
    miaoShu: tiaoMu.miaoShu,
    qingXuBiaoQian: tiaoMu.qingXuBiaoQian,
    shiYongChangJing: tiaoMu.shiYongChangJing,
    sha256: tiaoMu.sha256,
    mime: tiaoMu.mime,
  }
}

export async function 候选包装(
  yiTu: string | null | undefined,
  shuLiang: number,
  jueCe?: BiaoQingZaiTiJueCe,
  excludeDuanMing?: string[],
): Promise<XiTongBiaoQingXiang[]> {
  const 意化 = typeof yiTu === 'string' && yiTu.trim() !== '' ? yiTu.trim() : null
  try {
    const guoLv = jueCe
      ? { yunXuFengGe: jueCe.yunXuFengGe, guanXiJieDuanXuHao: jueCe.guanXiJieDuanXuHao, renSheQiZhi: jueCe.renSheQiZhi ?? ['通用'], wenBen: jueCe.yong_hu_xin_xiao_xi ?? '' }
      : undefined
  const excludeArg = excludeDuanMing && excludeDuanMing.length > 0 ? excludeDuanMing : undefined
    let lieBiao: 表情包条目[] = []
    if (jueCe && jueCe.geiHouXuan && typeof jueCe.yong_hu_xin_xiao_xi === 'string' && jueCe.yong_hu_xin_xiao_xi.trim() !== '') {
      lieBiao = await 语义候选({
        query: `${意化 ?? ''} ${jueCe.yong_hu_xin_xiao_xi}`.trim(),
        yunXuFengGe: jueCe.yunXuFengGe,
        guanXiJieDuanXuHao: jueCe.guanXiJieDuanXuHao,
        renSheQiZhi: jueCe.renSheQiZhi ?? ['通用'],
        excludeDuanMing: excludeDuanMing ?? [],
        shuLiang,
      })
    }
    if (lieBiao.length === 0) {
      debug日志.warn(RiZhiLeiXing, '向量检索无候选，本轮不给表情包', {
        xiang_qing: { yuan_yin: BiaoQingFaSongYuanYin.kuWeiKong, qing_xu: 意化 ?? '' },
      })
      return []
    }
    debug日志.debug(RiZhiLeiXing, '表情包候选已就绪', {
      xiang_qing: { qing_xu: 意化 ?? '', hou_xuan_shu: lieBiao.length },
    })
    return lieBiao.slice(0, shuLiang).map(zhuangXiang)
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

export async function 查找表情按短名(duanMing: string): Promise<XiTongBiaoQingXiang | null> {
  if (typeof duanMing !== 'string') return null
  const jianHua = duanMing.trim()
  if (jianHua === '') return null
  try {
    const tiaoMu = await 按短名查(jianHua)
    if (!tiaoMu) {
      debug日志.debug(RiZhiLeiXing, '表情包短名未命中表情包库', {
        xiang_qing: { duan_ming: jianHua, yuan_yin: BiaoQingFaSongYuanYin.weiMingZhong },
      })
      return null
    }
    if (!tiaoMu.qiYong) {
      debug日志.warn(RiZhiLeiXing, '表情包条目已停用，按未命中处理', {
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

export async function 发送表情包消息(
  用户ID: string,
  jiaoSeId: string,
  duanMing: string,
): Promise<消息信息 | null> {
  const jianHua = typeof duanMing === 'string' ? duanMing.trim() : ''
  if (jianHua === '') {
    debug日志.warn(RiZhiLeiXing, '表情包指令没有短名，本条丢弃', {
      yong_hu_id: 用户ID,
      jiao_se_id: jiaoSeId,
      xiang_qing: { yuan_yin: BiaoQingFaSongYuanYin.weiMingZhong },
    })
    return null
  }
  const biaoQing = await 查找表情按短名(jianHua)
  if (!biaoQing) {
    debug日志.warn(RiZhiLeiXing, '表情包短名查不到，本条不发送（不做兜底替换）', {
      yong_hu_id: 用户ID,
      jiao_se_id: jiaoSeId,
      xiang_qing: { duan_ming: jianHua, yuan_yin: BiaoQingFaSongYuanYin.weiMingZhong },
    })
    return null
  }
  try {
    return await 保存角色媒体消息({
      yong_hu_id: 用户ID,
      jiao_se_id: jiaoSeId,
      nei_rong: 表情包文本(biaoQing.duanMing),
      lei_xing: 表情消息类型,
      mei_ti_id: null,
      duan_ming: biaoQing.duanMing,
    })
  } catch (cuoWu) {
    debug日志.warn(RiZhiLeiXing, '表情包消息落库失败，本条丢弃', {
      yong_hu_id: 用户ID,
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

function quanZhongDaoWenAn(quanZhong: number, gangFaGuoTu: boolean): string {
  if (gangFaGuoTu) return '上一轮刚发过图，这一轮除非特别贴合，否则先说话。'
  if (quanZhong < 0.3) return '这一轮不太想发图，除非图正是你现在的心情。'
  return '这一轮有贴合的图就顺手发一张，没有就只说话。'
}

export function 组装表情候选块(tiaoMuLieBiao: XiTongBiaoQingXiang[], faTuQuanZhong?: number, gangFaGuoTu = false): string {
  if (tiaoMuLieBiao.length === 0) return ''
  const quanZhongWenAn = typeof faTuQuanZhong === 'number' ? quanZhongDaoWenAn(faTuQuanZhong, gangFaGuoTu) : ''
  const shiLi = 表情包文本(tiaoMuLieBiao[0].duanMing)
  const shuoMing = BiaoQingHouXuanWenAn.daiTiShuoMing.map((hang) =>
    tianChongMoBan(hang, {
      biao_qing_bao_shi_li: shiLi,
    }),
  )
  const hangLieBiao = tiaoMuLieBiao.map((xiang) =>
    tianChongMoBan(BiaoQingHouXuanWenAn.hangMoBan, {
      biao_qing_bao_shi_li: 表情包文本(xiang.duanMing),
      chang_jing: xiang.shiYongChangJing || BiaoQingHouXuanWenAn.changJingKong,
    }),
  )
  return [
    BiaoQingHouXuanWenAn.biaoTi,
    ...shuoMing,
    BiaoQingFaSongShiJiWenAn,
    ...(quanZhongWenAn ? [BiaoQingHouXuanWenAn.quanZhongBiaoTi + quanZhongWenAn] : []),
    ...hangLieBiao.slice(0, BiaoQingBaoYunXing.houXuanShuLiang),
  ].join('\n')
}

export async function 生成表情候选文本(
  yiTu: string | null | undefined,
  jueCe?: BiaoQingZaiTiJueCe,
  excludeDuanMing?: string[],
): Promise<string> {
  if (!BiaoQingBaoYunXing.daKai || !jueCe?.geiHouXuan) return ''
  if (!jueCe || !jueCe.geiHouXuan) return ''
  const lieBiao = await 候选包装(yiTu, BiaoQingBaoYunXing.houXuanShuLiang, jueCe, excludeDuanMing)
  return 组装表情候选块(lieBiao, jueCe.faTuQuanZhong, jueCe.gangFaGuoTu)
}