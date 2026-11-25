import { debug日志 } from '../utils/debug日志'
import { 保存角色媒体消息, type 消息信息 } from './消息'
import { 按短名查, 短名转UUID, 候选系统表情, type 表情包条目 } from './表情包库'
import { 语义候选 } from './语义表情检索'
import { 表情书类别, 类别到消息类型 } from '../config/媒体配置'
import {
  BiaoQingBaoYunXing,
  表情待打标,
  BiaoQingFaSongShiJiWenAn,
  BiaoQingFaSongYuanYin,
  BiaoQingHouXuanWenAn,
  BiaoQingMiDu,
  BiaoQingShiLi,
  BiaoQingZhanWei,
  表情关系阶段顺序,
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
  fengGe?: string
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
  return BiaoQingShiLi.split(BiaoQingZhanWei).join(duanMing)
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
    fengGe: tiaoMu.fengGe,
    fengGe: tiaoMu.fengGe,
  }
}

function quKuQuTuJieDuan(jueCe: BiaoQingZaiTiJueCe, wanGeng: boolean): number {
  const sheDing = wanGeng ? BiaoQingMiDu.wanGeng.kuQuTuZuiDiJieDuan : null
  if (sheDing === null) return jueCe.guanXiJieDuanXuHao
  const xuHao = 表情关系阶段顺序.indexOf(sheDing)
  if (xuHao < 0) return jueCe.guanXiJieDuanXuHao
  return Math.max(jueCe.guanXiJieDuanXuHao, xuHao)
}

async function 语义路径候选(
  yiTu: string | null,
  shuLiang: number,
  jueCe: BiaoQingZaiTiJueCe,
  excludeDuanMing: string[],
): Promise<表情包条目[]> {
  const 用户文本 = typeof jueCe.yong_hu_xin_xiao_xi === 'string' ? jueCe.yong_hu_xin_xiao_xi.trim() : ''
  const 查询 = `${yiTu ?? ''} ${用户文本}`.trim()
  if (查询 === '') return []
  try {
    return await 语义候选({
      query: 查询,
      yunXuFengGe: jueCe.yunXuFengGe,
      guanXiJieDuanXuHao: quKuQuTuJieDuan(jueCe, jueCe.wanGeng === true),
      renSheQiZhi: jueCe.renSheQiZhi ?? ['通用'],
      excludeDuanMing,
      shuLiang,
    })
  } catch (cuoWu) {
    debug日志.warn(RiZhiLeiXing, '语义检索异常，改用文件表情库', {
      xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return []
  }
}

async function 文件库路径候选(
  yiTu: string | null,
  shuLiang: number,
  jueCe: BiaoQingZaiTiJueCe | undefined,
  excludeDuanMing: string[] | undefined,
): Promise<表情包条目[]> {
  const 过滤 = jueCe
    ? {
        yunXuFengGe: jueCe.yunXuFengGe,
        guanXiJieDuanXuHao: quKuQuTuJieDuan(jueCe, jueCe.wanGeng === true),
        renSheQiZhi: jueCe.renSheQiZhi ?? ['通用'],
        wenBen: jueCe.yong_hu_xin_xiao_xi ?? '',
      }
    : undefined
  try {
    return await 候选系统表情(yiTu, shuLiang, 过滤, excludeDuanMing)
  } catch (cuoWu) {
    debug日志.warn(RiZhiLeiXing, '文件表情库检索异常，本轮不给表情包', {
      xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return []
  }
}

export async function 候选包装(
  yiTu: string | null | undefined,
  shuLiang: number,
  jueCe?: BiaoQingZaiTiJueCe,
  excludeDuanMing?: string[],
): Promise<XiTongBiaoQingXiang[]> {
  const 意化 = typeof yiTu === 'string' && yiTu.trim() !== '' ? yiTu.trim() : null
  const 排除 = Array.isArray(excludeDuanMing) && excludeDuanMing.length > 0 ? excludeDuanMing : undefined
  try {
    if (jueCe && !jueCe.geiHouXuan) {
      debug日志.debug(RiZhiLeiXing, '门控未放行，本轮不取候选', {
        xiang_qing: { yuan_yin: jueCe.yuanYin },
      })
      return []
    }
    let lieBiao: 表情包条目[] = []
    let 来源: '语义' | '文件库' = '语义'
    if (jueCe) {
      lieBiao = await 语义路径候选(意化, shuLiang, jueCe, 排除 ?? [])
    }
    if (lieBiao.length === 0) {
      lieBiao = await 文件库路径候选(意化, shuLiang, jueCe, 排除)
      来源 = '文件库'
    }
    if (lieBiao.length === 0) {
      debug日志.warn(RiZhiLeiXing, '语义与文件库都没有可用候选，本轮不给表情包', {
        xiang_qing: { yuan_yin: BiaoQingFaSongYuanYin.kuWeiKong, qing_xu: 意化 ?? '' },
      })
      return []
    }
    debug日志.debug(RiZhiLeiXing, '表情包候选已就绪', {
      xiang_qing: { qing_xu: 意化 ?? '', hou_xuan_shu: lieBiao.length, lai_yuan: 来源 },
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

export async function 查找表情按短名(duanMing: string): Promise<XiTongBiaoQingXiang | null> {
  if (typeof duanMing !== 'string') return null
  const jianHua = duanMing.trim()
  if (jianHua === '') return null
  try {
    const tiaoMu = await 按短名查(jianHua)
    if (!tiaoMu) {
      debug日志.debug(RiZhiLeiXing, '表情包短名未命中库', {
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
  jueCe?: BiaoQingZaiTiJueCe,
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
  if (jueCe && !jueCe.geiHouXuan) return null
  const biaoQing = await 查找表情按短名(jianHua)
  if (!biaoQing) {
    if (!jueCe) return null
    const 回退 = await 语义候选({
      query: jianHua,
      yunXuFengGe: jueCe.yunXuFengGe,
      guanXiJieDuanXuHao: quKuQuTuJieDuan(jueCe, jueCe.wanGeng === true),
      renSheQiZhi: jueCe.renSheQiZhi ?? ['通用'],
      excludeDuanMing: [],
      shuLiang: 1,
    })
    const 候选 = 回退[0]
    if (!候选) return null
    return 发送表情包消息(用户ID, jiaoSeId, 候选.duanMing, jueCe)
  }
  if (jueCe && !jueCe.yunXuFengGe.includes(biaoQing.fengGe ?? '日常')) {
    debug日志.debug(RiZhiLeiXing, '表情包风格不符合当前人格，本条不发送', {
      yong_hu_id: 用户ID,
      jiao_se_id: jiaoSeId,
      xiang_qing: { duan_ming: biaoQing.duanMing, feng_ge: biaoQing.fengGe, yun_xu: jueCe.yunXuFengGe },
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

export function 组装表情候选块(
  tiaoMuLieBiao: XiTongBiaoQingXiang[],
  changJingTiShi?: string,
): string {
  if (tiaoMuLieBiao.length === 0) return ''
  const shiLi = 表情包文本(tiaoMuLieBiao[0].duanMing)
  const shuoMing = BiaoQingHouXuanWenAn.daiTiShuoMing.map((hang) =>
    tianChongMoBan(hang, {
      tie_zhi_shi_li: shiLi,
      zui_da_zhang_shu: String(BiaoQingBaoYunXing.zuiDaMeiLunZhangShu),
    }),
  )
  const hangLieBiao = tiaoMuLieBiao.map((xiang) =>
    tianChongMoBan(BiaoQingHouXuanWenAn.hangMoBan, {
      tie_zhi_shi_li: 表情包文本(xiang.duanMing),
      miao_shu: xiang.miaoShu || BiaoQingHouXuanWenAn.moShuKong,
      qing_xu: xiang.qingXuBiaoQian || 表情待打标,
      chang_jing: xiang.shiYongChangJing || BiaoQingHouXuanWenAn.changJingKong,
    }),
  )
  const tiShi = typeof changJingTiShi === 'string' ? changJingTiShi.trim() : ''
  return [
    BiaoQingHouXuanWenAn.biaoTi,
    ...(tiShi === '' ? [] : [tiShi]),
    ...shuoMing,
    BiaoQingFaSongShiJiWenAn,
    ...hangLieBiao,
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
  return 组装表情候选块(lieBiao, jueCe.changJingTiShi)
}
