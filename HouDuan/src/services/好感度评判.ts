import { debug日志 } from '../utils/debug日志'
import { AI配置 } from '../config/AI配置'
import { 按配置调用 } from '../utils/DeepSeek客户端'
import { gouJianHaoGanDuPingPanPrompt, gouJianXiuFuPanDingPrompt, type XiuFuPanDingShangXiaWen } from './Prompt构建器'
import { paiRuZhongShiDuiLie } from './重试队列'
import type { HaoGanDuPingPanJieGuo } from '../types'
import type { 参数上下文 } from '../config/AI参数策略'
import { shiFouManRe, ManReHaoGanDuJiaCheng } from '../config/AI参数策略'
import { jiSuanXiShu, yingYongHuiHuaBaoDi } from './好感度缓存'
import { huoQuChongTuXinXi } from './冲突弧'

function quAnQuanHuDongCiShu(zhi: unknown): number {
  const shu = Number(zhi)
  return Number.isFinite(shu) && shu >= 0 ? Math.floor(shu) : 0
}
import { huoQuWanZhengHaoGanDu } from './好感度'

export interface PingPanJieGuoYuXiShu {
  jieGuo: HaoGanDuPingPanJieGuo
  xiShu: number
  muBiaoQuXian: number
  lianXuWeiDaBiao: number
  pingJunShuaiJianHou: number
  xiuFuPanDing?: XiuFuPanDingMing
}

export type XiuFuPanDingMing = 'chengLi' | 'fuYan' | 'wuGuan'

function jieXiXiuFuPanDing(shuJu: Record<string, unknown>, youChongTu: boolean): XiuFuPanDingMing | undefined {
  if (!youChongTu) return undefined
  const zhi = String(shuJu['冲突修复'] ?? shuJu['xiuFu'] ?? '').trim()
  if (zhi === '修复成立' || zhi === 'chengLi') return 'chengLi'
  if (zhi === '敷衍' || zhi === 'fuYan') return 'fuYan'
  if (zhi === '无关' || zhi === 'wuGuan') return 'wuGuan'
  return undefined
}

async function quXiuFuPanDingShangXiaWen(
  用户ID?: string,
  jiaoSeId?: string,
): Promise<XiuFuPanDingShangXiaWen | undefined> {
  if (!用户ID || !jiaoSeId) return undefined
  try {
    const chongTuXinXi = await huoQuChongTuXinXi(用户ID, jiaoSeId)
    if (!chongTuXinXi || chongTuXinXi.zhuangTai === 'wu') return undefined
    return {
      zhuangTai: chongTuXinXi.zhuangTai,
      shiYou: chongTuXinXi.shiYou,
      shengJiJiShu: chongTuXinXi.shengJiJiShu,
    }
  } catch (cuoWu) {
    debug日志.warn('好感度评判', '冲突信息读取失败，本轮不做修复判定', {
      xiang_qing: { yong_hu_id: 用户ID, jiao_se_id: jiaoSeId, cuo_wu: String(cuoWu) },
    })
    return undefined
  }
}

function xiuZhengFanWei(zhi: number): number {
  if (Number.isNaN(zhi)) return 0
  return Math.max(
    AI配置.haoGanDu.zuiXiaoBianHua,
    Math.min(AI配置.haoGanDu.zuiDaBianHua, zhi),
  )
}

async function yingYongXiShu(
  jieGuo: HaoGanDuPingPanJieGuo,
  xiShu: number,
): Promise<HaoGanDuPingPanJieGuo> {
  if (xiShu <= 1) return jieGuo
  return {
    xin_ren_du_bian_hua: xiuZhengFanWei(Math.round(jieGuo.xin_ren_du_bian_hua * xiShu)),
    qin_mi_du_bian_hua: xiuZhengFanWei(Math.round(jieGuo.qin_mi_du_bian_hua * xiShu)),
    qu_wei_du_bian_hua: xiuZhengFanWei(Math.round(jieGuo.qu_wei_du_bian_hua * xiShu)),
    guan_huai_du_bian_hua: xiuZhengFanWei(Math.round(jieGuo.guan_huai_du_bian_hua * xiShu)),
    li_you: jieGuo.li_you,
  }
}

async function jiaoHuLLM(
  模型: 'HaoGanDuPingPan',
  xiaoXiLieBiao: Array<{ jiaoSe: 'user' | 'system' | 'assistant'; neiRong: string }>,
  shangXiaWen?: 参数上下文,
): Promise<{ neiRong: string }> {
  return 按配置调用(模型, xiaoXiLieBiao, shangXiaWen)
}

async function pingPanHaoGanDuBianHuaNei(
  yongHuXiaoXi: string,
  jiaoSeHuiFu: string,
  jiaoSeMing: string,
  shangXiaWen?: 参数上下文,
  huiHuaJian?: string,
  用户ID?: string,
  jiaoSeId?: string,
): Promise<PingPanJieGuoYuXiShu> {
  try {
    let xiShu = 1
    let muBiaoQuXian = 0
    let lianXuWeiDaBiao = 0
    let pingJunShuaiJianHou = 0

    if (用户ID && jiaoSeId) {
      const haoGanDu = await huoQuWanZhengHaoGanDu(用户ID, jiaoSeId)
      if (haoGanDu) {
        const xiShuJieGuo = await jiSuanXiShu(用户ID, jiaoSeId, haoGanDu.zong_fen, quAnQuanHuDongCiShu(haoGanDu.互动次数))
        xiShu = xiShuJieGuo.xiShu
        muBiaoQuXian = xiShuJieGuo.muBiaoQuXian
        lianXuWeiDaBiao = xiShuJieGuo.lianXuWeiDaBiao
        pingJunShuaiJianHou = xiShuJieGuo.pingJunShuaiJianHou
      }
    }
    const xiuFuPanDingShangXiaWen = await quXiuFuPanDingShangXiaWen(用户ID, jiaoSeId)

    const xiangYing = await jiaoHuLLM('HaoGanDuPingPan', [
      { jiaoSe: 'system', neiRong: '任务：评估给定一轮对话后，角色对用户的好感度各维度变化量。只输出 JSON，不附加任何说明文字。' },
      {
        jiaoSe: 'user',
        neiRong: gouJianHaoGanDuPingPanPrompt(yongHuXiaoXi, jiaoSeHuiFu, jiaoSeMing, shangXiaWen, xiuFuPanDingShangXiaWen),
      },
    ], shangXiaWen)

    const shuJu = jieXiJSON(xiangYing.neiRong)
    if (!shiFouYouXiaoPingPan(shuJu)) {
      debug日志.error('好感度评判', '好感度评判解析失败，已标unknown不落分并入重试队列', {
        xiang_qing: { yuan_wen_chang_du: xiangYing.neiRong.length },
      })
      void paiRuZhongShiDuiLie({ leiXing: 'HaoGanDuPingPan', yuanYin: 'jie_xi_shi_bai' })
      return {
        jieGuo: {
          xin_ren_du_bian_hua: 0,
          qin_mi_du_bian_hua: 0,
          qu_wei_du_bian_hua: 0,
          guan_huai_du_bian_hua: 0,
          li_you: 'unknown',
        },
        xiShu: 1,
        muBiaoQuXian,
        lianXuWeiDaBiao,
        pingJunShuaiJianHou,
      }
    }

    const manReJiaCheng = shiFouManRe(shangXiaWen) ? ManReHaoGanDuJiaCheng : 1

    const yuanShiJieGuo: HaoGanDuPingPanJieGuo = {
      xin_ren_du_bian_hua: xiuZhengFanWei(
        Math.round(Number(shuJu['信任度变化'] ?? shuJu['xin_ren_du_bian_hua'] ?? 0) * manReJiaCheng),
      ),
      qin_mi_du_bian_hua: xiuZhengFanWei(
        Math.round(Number(shuJu['亲密度变化'] ?? shuJu['qin_mi_du_bian_hua'] ?? 0) * manReJiaCheng),
      ),
      qu_wei_du_bian_hua: xiuZhengFanWei(
        Math.round(Number(shuJu['趣味度变化'] ?? shuJu['qu_wei_du_bian_hua'] ?? 0) * manReJiaCheng),
      ),
      guan_huai_du_bian_hua: xiuZhengFanWei(
        Math.round(Number(shuJu['关怀度变化'] ?? shuJu['guan_huai_du_bian_hua'] ?? 0) * manReJiaCheng),
      ),
      li_you: String(shuJu['理由'] ?? shuJu['li_you'] ?? ''),
    }

    const jieGuoJingXiShu = await yingYongXiShu(yuanShiJieGuo, xiShu)
    const jieGuo = huiHuaJian && !(用户ID && jiaoSeId)
      ? await yingYongHuiHuaBaoDi(huiHuaJian, jieGuoJingXiShu)
      : jieGuoJingXiShu

    return { jieGuo, xiShu, muBiaoQuXian, lianXuWeiDaBiao, pingJunShuaiJianHou, xiuFuPanDing: jieXiXiuFuPanDing(shuJu, xiuFuPanDingShangXiaWen !== undefined) }
  } catch (cuoWu) {
    debug日志.error('好感度评判', '好感度评判失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    void paiRuZhongShiDuiLie({ leiXing: 'HaoGanDuPingPan', yuanYin: 'diao_yong_yi_chang' })
    return {
      jieGuo: {
        xin_ren_du_bian_hua: 0,
        qin_mi_du_bian_hua: 0,
        qu_wei_du_bian_hua: 0,
        guan_huai_du_bian_hua: 0,
        li_you: 'unknown',
      },
      xiShu: 1,
      muBiaoQuXian: 0,
      lianXuWeiDaBiao: 0,
      pingJunShuaiJianHou: 0,
    }
  }
}

export async function pingPanHaoGanDuBianHua(
  yongHuXiaoXi: string,
  jiaoSeHuiFu: string,
  jiaoSeMing: string,
  shangXiaWen?: 参数上下文,
  huiHuaJian?: string,
  用户ID?: string,
  jiaoSeId?: string,
): Promise<HaoGanDuPingPanJieGuo> {
  const { jieGuo } = await pingPanHaoGanDuBianHuaNei(yongHuXiaoXi, jiaoSeHuiFu, jiaoSeMing, shangXiaWen, huiHuaJian, 用户ID, jiaoSeId)
  return jieGuo
}

async function pingPanHaoGanDuPiLiangNei(
  yongHuXiaoXi: string,
  jiaoSeHuiFuLieBiao: string[],
  jiaoSeMing: string,
  shangXiaWen?: 参数上下文,
  huiHuaJian?: string,
  用户ID?: string,
  jiaoSeId?: string,
): Promise<PingPanJieGuoYuXiShu> {
  if (jiaoSeHuiFuLieBiao.length === 0) {
    return {
      jieGuo: {
        xin_ren_du_bian_hua: 0,
        qin_mi_du_bian_hua: 0,
        qu_wei_du_bian_hua: 0,
        guan_huai_du_bian_hua: 0,
        li_you: '',
      },
      xiShu: 1,
      muBiaoQuXian: 0,
      lianXuWeiDaBiao: 0,
      pingJunShuaiJianHou: 0,
    }
  }
  if (jiaoSeHuiFuLieBiao.length === 1) {
    return pingPanHaoGanDuBianHuaNei(yongHuXiaoXi, jiaoSeHuiFuLieBiao[0], jiaoSeMing, shangXiaWen, huiHuaJian, 用户ID, jiaoSeId)
  }

  try {
    let xiShu = 1
    let muBiaoQuXian = 0
    let lianXuWeiDaBiao = 0
    let pingJunShuaiJianHou = 0

    if (用户ID && jiaoSeId) {
      const haoGanDu = await huoQuWanZhengHaoGanDu(用户ID, jiaoSeId)
      if (haoGanDu) {
        const xiShuJieGuo = await jiSuanXiShu(用户ID, jiaoSeId, haoGanDu.zong_fen, quAnQuanHuDongCiShu(haoGanDu.互动次数))
        xiShu = xiShuJieGuo.xiShu
        muBiaoQuXian = xiShuJieGuo.muBiaoQuXian
        lianXuWeiDaBiao = xiShuJieGuo.lianXuWeiDaBiao
        pingJunShuaiJianHou = xiShuJieGuo.pingJunShuaiJianHou
      }
    }
    const xiuFuPanDingShangXiaWen = await quXiuFuPanDingShangXiaWen(用户ID, jiaoSeId)

    const huiFuDuanLuo = jiaoSeHuiFuLieBiao
      .map((huiFu, xuHao) => `${xuHao + 1}. ${huiFu}`)
      .join('\n')
    const xiangYing = await jiaoHuLLM('HaoGanDuPingPan', [
      { jiaoSe: 'system', neiRong: '任务：评估给定一轮对话后，角色对用户的好感度各维度变化量。只输出 JSON，不附加任何说明文字。' },
      {
        jiaoSe: 'user',
        neiRong: [
          gouJianHaoGanDuPingPanPrompt(yongHuXiaoXi, jiaoSeHuiFuLieBiao[0], jiaoSeMing, shangXiaWen, xiuFuPanDingShangXiaWen),
          '',
          '补充说明：这一轮对方连着发了几条消息，完整内容如下（请把它们当作一整轮回复整体评估）：',
          huiFuDuanLuo,
          '',
          '请基于这一整轮回复输出四个维度的总变化值，只输出 JSON。',
        ].join('\n'),
      },
    ], shangXiaWen)

    const shuJu = jieXiJSON(xiangYing.neiRong)
    if (!shiFouYouXiaoPingPan(shuJu)) {
      debug日志.error('好感度评判', '好感度批量评判解析失败，已标unknown不落分并入重试队列', {
        xiang_qing: { yuan_wen_chang_du: xiangYing.neiRong.length },
      })
      void paiRuZhongShiDuiLie({ leiXing: 'HaoGanDuPingPan', yuanYin: 'pi_liang_jie_xi_shi_bai' })
      return {
        jieGuo: {
          xin_ren_du_bian_hua: 0,
          qin_mi_du_bian_hua: 0,
          qu_wei_du_bian_hua: 0,
          guan_huai_du_bian_hua: 0,
          li_you: 'unknown',
        },
        xiShu,
        muBiaoQuXian,
        lianXuWeiDaBiao,
        pingJunShuaiJianHou,
      }
    }
    const manReJiaCheng = shiFouManRe(shangXiaWen) ? ManReHaoGanDuJiaCheng : 1

    const yuanShiJieGuo: HaoGanDuPingPanJieGuo = {
      xin_ren_du_bian_hua: xiuZhengFanWei(
        Math.round(Number(shuJu['信任度变化'] ?? shuJu['xin_ren_du_bian_hua'] ?? 0) * manReJiaCheng),
      ),
      qin_mi_du_bian_hua: xiuZhengFanWei(
        Math.round(Number(shuJu['亲密度变化'] ?? shuJu['qin_mi_du_bian_hua'] ?? 0) * manReJiaCheng),
      ),
      qu_wei_du_bian_hua: xiuZhengFanWei(
        Math.round(Number(shuJu['趣味度变化'] ?? shuJu['qu_wei_du_bian_hua'] ?? 0) * manReJiaCheng),
      ),
      guan_huai_du_bian_hua: xiuZhengFanWei(
        Math.round(Number(shuJu['关怀度变化'] ?? shuJu['guan_huai_du_bian_hua'] ?? 0) * manReJiaCheng),
      ),
      li_you: String(shuJu['理由'] ?? shuJu['li_you'] ?? ''),
    }

    const jieGuoJingXiShu = await yingYongXiShu(yuanShiJieGuo, xiShu)
    const jieGuo = huiHuaJian && !(用户ID && jiaoSeId)
      ? await yingYongHuiHuaBaoDi(huiHuaJian, jieGuoJingXiShu)
      : jieGuoJingXiShu

    return { jieGuo, xiShu, muBiaoQuXian, lianXuWeiDaBiao, pingJunShuaiJianHou, xiuFuPanDing: jieXiXiuFuPanDing(shuJu, xiuFuPanDingShangXiaWen !== undefined) }
  } catch (cuoWu) {
    debug日志.error('好感度评判', '好感度批量评判失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    void paiRuZhongShiDuiLie({ leiXing: 'HaoGanDuPingPan', yuanYin: 'pi_liang_diao_yong_yi_chang' })
    return {
      jieGuo: {
        xin_ren_du_bian_hua: 0,
        qin_mi_du_bian_hua: 0,
        qu_wei_du_bian_hua: 0,
        guan_huai_du_bian_hua: 0,
        li_you: 'unknown',
      },
      xiShu: 1,
      muBiaoQuXian: 0,
      lianXuWeiDaBiao: 0,
      pingJunShuaiJianHou: 0,
    }
  }
}

export async function pingPanHaoGanDuPiLiang(
  yongHuXiaoXi: string,
  jiaoSeHuiFuLieBiao: string[],
  jiaoSeMing: string,
  shangXiaWen?: 参数上下文,
  huiHuaJian?: string,
  用户ID?: string,
  jiaoSeId?: string,
): Promise<HaoGanDuPingPanJieGuo> {
  const { jieGuo } = await pingPanHaoGanDuPiLiangNei(yongHuXiaoXi, jiaoSeHuiFuLieBiao, jiaoSeMing, shangXiaWen, huiHuaJian, 用户ID, jiaoSeId)
  return jieGuo
}

export async function pingPanXiuFu(
  yongHuXiaoXi: string,
  shangXiaWen?: 参数上下文,
  用户ID?: string,
  jiaoSeId?: string,
): Promise<XiuFuPanDingMing | undefined> {
  if (!用户ID || !jiaoSeId) return undefined
  try {
    const chongTuXinXi = await huoQuChongTuXinXi(用户ID, jiaoSeId)
    if (!chongTuXinXi || chongTuXinXi.zhuangTai === 'wu') return undefined
    const xiangYing = await jiaoHuLLM('HaoGanDuPingPan', [
      { jiaoSe: 'system', neiRong: '任务：判定用户这条消息是否在修复双方之间的既有冲突。只输出 JSON，不附加任何说明文字。' },
      {
        jiaoSe: 'user',
        neiRong: gouJianXiuFuPanDingPrompt(yongHuXiaoXi, chongTuXinXi.zhuangTai, chongTuXinXi.shiYou, chongTuXinXi.shengJiJiShu, shangXiaWen),
      },
    ], shangXiaWen)
    const shuJu = jieXiJSON(xiangYing.neiRong)
    const panDing = jieXiXiuFuPanDing(shuJu, true)
    if (!panDing) return undefined
    return panDing
  } catch (cuoWu) {
    debug日志.error('好感度评判', '冲突修复判定失败，本次判为未完成，交由调用方累计失败次数', {
      xiang_qing: { yong_hu_id: 用户ID, jiao_se_id: jiaoSeId, cuo_wu: String(cuoWu) },
    })
    return undefined
  }
}

export { pingPanHaoGanDuBianHuaNei, pingPanHaoGanDuPiLiangNei }

const PingPanBiTianJian = ['信任度变化', '亲密度变化', '趣味度变化', '关怀度变化'] as const

function shiFouYouXiaoPingPan(shuJu: Record<string, unknown>): boolean {
  if (!shuJu || Object.keys(shuJu).length === 0) return false
  return PingPanBiTianJian.some((jian) => shuJu[jian] !== undefined || shuJu[zhuanXiaHuaXian(jian)] !== undefined)
}

function zhuanXiaHuaXian(jian: string): string {
  if (jian === '信任度变化') return 'xin_ren_du_bian_hua'
  if (jian === '亲密度变化') return 'qin_mi_du_bian_hua'
  if (jian === '趣味度变化') return 'qu_wei_du_bian_hua'
  return 'guan_huai_du_bian_hua'
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
