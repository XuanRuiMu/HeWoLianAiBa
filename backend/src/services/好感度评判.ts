import { debug日志 } from '../utils/debug日志'
import { AI_PEI_ZHI } from '../config/AI配置'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianHaoGanDuPingPanPrompt } from './Prompt构建器'
import type { HaoGanDuPingPanJieGuo } from '../types'
import type { CanShuShangXiaWen } from '../config/AI参数策略'
import { shiFouManRe, MAN_RE_HAO_GAN_DU_JIA_CHENG } from '../config/AI参数策略'
import { jiSuanXiShu, yingYongHuiHuaBaoDi } from './好感度缓存'
import { huoQuWanZhengHaoGanDu } from './好感度'

export interface PingPanJieGuoYuXiShu {
  jieGuo: HaoGanDuPingPanJieGuo
  xiShu: number
  muBiaoQuXian: number
  lianXuWeiDaBiao: number
  pingJunShuaiJianHou: number
}

function xiuZhengFanWei(zhi: number): number {
  if (Number.isNaN(zhi)) return 0
  return Math.max(
    AI_PEI_ZHI.haoGanDu.zuiXiaoBianHua,
    Math.min(AI_PEI_ZHI.haoGanDu.zuiDaBianHua, zhi),
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
  moXing: 'haoGanDuPingPan',
  xiaoXiLieBiao: Array<{ jiaoSe: 'user' | 'system' | 'assistant'; neiRong: string }>,
  shangXiaWen?: CanShuShangXiaWen,
): Promise<{ neiRong: string }> {
  return genJuPeiZhiTiaoYong(moXing, xiaoXiLieBiao, shangXiaWen)
}

async function pingPanHaoGanDuBianHuaNei(
  yongHuXiaoXi: string,
  jiaoSeHuiFu: string,
  jiaoSeMing: string,
  shangXiaWen?: CanShuShangXiaWen,
  huiHuaJian?: string,
  yongHuId?: string,
  jiaoSeId?: string,
): Promise<PingPanJieGuoYuXiShu> {
  try {
    let xiShu = 1
    let muBiaoQuXian = 0
    let lianXuWeiDaBiao = 0
    let pingJunShuaiJianHou = 0

    if (yongHuId && jiaoSeId) {
      const haoGanDu = await huoQuWanZhengHaoGanDu(yongHuId, jiaoSeId)
      if (haoGanDu) {
        const xiShuJieGuo = await jiSuanXiShu(yongHuId, jiaoSeId, haoGanDu.zong_fen, haoGanDu.互动次数 ?? 0)
        xiShu = xiShuJieGuo.xiShu
        muBiaoQuXian = xiShuJieGuo.muBiaoQuXian
        lianXuWeiDaBiao = xiShuJieGuo.lianXuWeiDaBiao
        pingJunShuaiJianHou = xiShuJieGuo.pingJunShuaiJianHou
      }
    }

    const xiangYing = await jiaoHuLLM('haoGanDuPingPan', [
      { jiaoSe: 'system', neiRong: '根据一轮对话判断好感变化，只输出 JSON。' },
      {
        jiaoSe: 'user',
        neiRong: gouJianHaoGanDuPingPanPrompt(yongHuXiaoXi, jiaoSeHuiFu, jiaoSeMing, shangXiaWen),
      },
    ], shangXiaWen)

    const shuJu = jieXiJSON(xiangYing.neiRong)

    const manReJiaCheng = shiFouManRe(shangXiaWen) ? MAN_RE_HAO_GAN_DU_JIA_CHENG : 1

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
    const jieGuo = huiHuaJian && !(yongHuId && jiaoSeId)
      ? await yingYongHuiHuaBaoDi(huiHuaJian, jieGuoJingXiShu)
      : jieGuoJingXiShu

    return { jieGuo, xiShu, muBiaoQuXian, lianXuWeiDaBiao, pingJunShuaiJianHou }
  } catch (cuoWu) {
    debug日志.error('好感度评判', '好感度评判失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
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
}

export async function pingPanHaoGanDuBianHua(
  yongHuXiaoXi: string,
  jiaoSeHuiFu: string,
  jiaoSeMing: string,
  shangXiaWen?: CanShuShangXiaWen,
  huiHuaJian?: string,
  yongHuId?: string,
  jiaoSeId?: string,
): Promise<HaoGanDuPingPanJieGuo> {
  const { jieGuo } = await pingPanHaoGanDuBianHuaNei(yongHuXiaoXi, jiaoSeHuiFu, jiaoSeMing, shangXiaWen, huiHuaJian, yongHuId, jiaoSeId)
  return jieGuo
}

/**
 * M2 调用收敛：一轮内 AI 的多条回复合并为一次好感度评判调用。
 * 以「用户消息 vs 本轮全部角色回复」整体评估四维变化，语义等价于逐条评判后求和的近似，
 * 但每轮只消耗一次 LLM 调用。
 */
async function pingPanHaoGanDuPiLiangNei(
  yongHuXiaoXi: string,
  jiaoSeHuiFuLieBiao: string[],
  jiaoSeMing: string,
  shangXiaWen?: CanShuShangXiaWen,
  huiHuaJian?: string,
  yongHuId?: string,
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
    return pingPanHaoGanDuBianHuaNei(yongHuXiaoXi, jiaoSeHuiFuLieBiao[0], jiaoSeMing, shangXiaWen, huiHuaJian, yongHuId, jiaoSeId)
  }

  try {
    let xiShu = 1
    let muBiaoQuXian = 0
    let lianXuWeiDaBiao = 0
    let pingJunShuaiJianHou = 0

    if (yongHuId && jiaoSeId) {
      const haoGanDu = await huoQuWanZhengHaoGanDu(yongHuId, jiaoSeId)
      if (haoGanDu) {
        const xiShuJieGuo = await jiSuanXiShu(yongHuId, jiaoSeId, haoGanDu.zong_fen, haoGanDu.互动次数 ?? 0)
        xiShu = xiShuJieGuo.xiShu
        muBiaoQuXian = xiShuJieGuo.muBiaoQuXian
        lianXuWeiDaBiao = xiShuJieGuo.lianXuWeiDaBiao
        pingJunShuaiJianHou = xiShuJieGuo.pingJunShuaiJianHou
      }
    }

    const huiFuDuanLuo = jiaoSeHuiFuLieBiao
      .map((huiFu, xuHao) => `${xuHao + 1}. ${huiFu}`)
      .join('\n')
    const xiangYing = await jiaoHuLLM('haoGanDuPingPan', [
      { jiaoSe: 'system', neiRong: '根据一轮对话判断好感变化，只输出 JSON。' },
      {
        jiaoSe: 'user',
        neiRong: [
          gouJianHaoGanDuPingPanPrompt(yongHuXiaoXi, jiaoSeHuiFuLieBiao[0], jiaoSeMing, shangXiaWen),
          '',
          '补充说明：这一轮对方连着发了几条消息，完整内容如下（请把它们当作一整轮回复整体评估）：',
          huiFuDuanLuo,
          '',
          '请基于这一整轮回复输出四个维度的总变化值，只输出 JSON。',
        ].join('\n'),
      },
    ], shangXiaWen)

    const shuJu = jieXiJSON(xiangYing.neiRong)
    const manReJiaCheng = shiFouManRe(shangXiaWen) ? MAN_RE_HAO_GAN_DU_JIA_CHENG : 1

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
    const jieGuo = huiHuaJian && !(yongHuId && jiaoSeId)
      ? await yingYongHuiHuaBaoDi(huiHuaJian, jieGuoJingXiShu)
      : jieGuoJingXiShu

    return { jieGuo, xiShu, muBiaoQuXian, lianXuWeiDaBiao, pingJunShuaiJianHou }
  } catch (cuoWu) {
    debug日志.error('好感度评判', '好感度批量评判失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
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
}

export async function pingPanHaoGanDuPiLiang(
  yongHuXiaoXi: string,
  jiaoSeHuiFuLieBiao: string[],
  jiaoSeMing: string,
  shangXiaWen?: CanShuShangXiaWen,
  huiHuaJian?: string,
  yongHuId?: string,
  jiaoSeId?: string,
): Promise<HaoGanDuPingPanJieGuo> {
  const { jieGuo } = await pingPanHaoGanDuPiLiangNei(yongHuXiaoXi, jiaoSeHuiFuLieBiao, jiaoSeMing, shangXiaWen, huiHuaJian, yongHuId, jiaoSeId)
  return jieGuo
}

export { pingPanHaoGanDuBianHuaNei, pingPanHaoGanDuPiLiangNei }

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