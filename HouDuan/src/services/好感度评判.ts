import { debug日志 } from '../utils/debug日志'
import { 按配置调用 } from '../utils/通用模型调用'
import { gouJianHaoGanDuPingPanPrompt, gouJianXiuFuPanDingPrompt, type XiuFuPanDingShangXiaWen } from './Prompt构建器'
import { paiRuZhongShiDuiLie } from './重试队列'
import type { HaoGanDuPingPanJieGuo, 行为键 } from '../types'
import type { 参数上下文 } from '../config/AI参数策略'
import { 查基础分, 行为顺序 } from '../config/阶段感知评分'
import { huoQuChongTuXinXi } from './冲突弧'
import { huoQuWanZhengHaoGanDu } from './好感度'
import { GuiFanGuanXiJieDuanMing, HaoGanDuPeiZhi } from '../config/好感度配置'
import { jiSuanXiShu, yingYongHuiHuaBaoDi } from './好感度缓存'

export interface PingPanJieGuoYuXiShu {
  jieGuo: HaoGanDuPingPanJieGuo
  xiShu: number
  muBiaoQuXian: number
  lianXuWeiDaBiao: number
  pingJunShuaiJianHou: number
  xiuFuPanDing?: XiuFuPanDingMing
}

export type XiuFuPanDingMing = 'chengLi' | 'fuYan' | 'wuGuan'

const 空结果: HaoGanDuPingPanJieGuo = {
  xin_ren_du_bian_hua: 0,
  qin_mi_du_bian_hua: 0,
  qu_wei_du_bian_hua: 0,
  guan_huai_du_bian_hua: 0,
  li_you: '',
}

const 空系数 = { xiShu: 1, muBiaoQuXian: 0, lianXuWeiDaBiao: 0, pingJunShuaiJianHou: 0 }

function jieXiXiuFuPanDing(shuJu: Record<string, unknown>, youChongTu: boolean): XiuFuPanDingMing | undefined {
  if (!youChongTu) return undefined
  const zhi = String(shuJu['冲突修复'] ?? shuJu['xiuFu'] ?? '').trim()
  if (zhi === '修复成立' || zhi === 'chengLi') return 'chengLi'
  if (zhi === '敷衍' || zhi === 'fuYan') return 'fuYan'
  if (zhi === '无关' || zhi === 'wuGuan') return 'wuGuan'
  return 'wuGuan'
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

function 取行为键(zhi: unknown): 行为键 | undefined {
  const wen = String(zhi ?? '').trim()
  if (wen === '') return undefined
  return 行为顺序.find((键) => 键 === wen)
}

interface 四维倾向 {
  xin_ren_du: number
  qin_mi_du: number
  qu_wei_du: number
  guan_huai_du: number
}

function 取倾向值(shuJu: Record<string, unknown>, zhongWen: string, xiaHua: string): number {
  const 值 = Number(shuJu[zhongWen] ?? shuJu[xiaHua] ?? 0)
  return Number.isFinite(值) ? Math.round(值) : 0
}

function 按行为分配四维(
  行为: 行为键,
  阶段: string,
  倾向: 四维倾向,
  xiShu: number,
): { xin_ren_du_bian_hua: number; qin_mi_du_bian_hua: number; qu_wei_du_bian_hua: number; guan_huai_du_bian_hua: number } {
  const 系数 = Number.isFinite(xiShu)
    ? Math.max(HaoGanDuPeiZhi.ceLiangXiShuXiaXian, Math.min(HaoGanDuPeiZhi.ceLiangXiShuShangXian, xiShu))
    : HaoGanDuPeiZhi.ceLiangXiShuXiaXian
  const 基础 = Math.round(查基础分(行为, 阶段) * 系数)
  const 倾向和 = Math.abs(倾向.xin_ren_du) + Math.abs(倾向.qin_mi_du) + Math.abs(倾向.qu_wei_du) + Math.abs(倾向.guan_huai_du)
  const 权重 = 倾向和 <= 0
    ? {
        xin_ren_du: HaoGanDuPeiZhi.quanZhong.xinRenDu,
        qin_mi_du: HaoGanDuPeiZhi.quanZhong.qinMiDu,
        qu_wei_du: HaoGanDuPeiZhi.quanZhong.quWeiDu,
        guan_huai_du: HaoGanDuPeiZhi.quanZhong.guanHuaiDu,
      }
    : {
        xin_ren_du: Math.abs(倾向.xin_ren_du),
        qin_mi_du: Math.abs(倾向.qin_mi_du),
        qu_wei_du: Math.abs(倾向.qu_wei_du),
        guan_huai_du: Math.abs(倾向.guan_huai_du),
      }
  const 和 = 权重.xin_ren_du + 权重.qin_mi_du + 权重.qu_wei_du + 权重.guan_huai_du
  const 缩放 = (值: number): number => (和 <= 0 ? 0 : Math.round(基础 * 值 / 和))
  const 四维 = {
    xin_ren_du_bian_hua: 缩放(权重.xin_ren_du),
    qin_mi_du_bian_hua: 缩放(权重.qin_mi_du),
    qu_wei_du_bian_hua: 缩放(权重.qu_wei_du),
    guan_huai_du_bian_hua: 缩放(权重.guan_huai_du),
  }
  const 合计 = 四维.xin_ren_du_bian_hua + 四维.qin_mi_du_bian_hua + 四维.qu_wei_du_bian_hua + 四维.guan_huai_du_bian_hua
  const 差 = 基础 - 合计
  if (差 !== 0) 四维.xin_ren_du_bian_hua += 差
  return 四维
}

function 解析评判(
  shuJu: Record<string, unknown>,
  阶段: string,
  xiShu: number,
): HaoGanDuPingPanJieGuo | null {
  const 倾向: 四维倾向 = {
    xin_ren_du: 取倾向值(shuJu, '信任度变化', 'xin_ren_du_bian_hua'),
    qin_mi_du: 取倾向值(shuJu, '亲密度变化', 'qin_mi_du_bian_hua'),
    qu_wei_du: 取倾向值(shuJu, '趣味度变化', 'qu_wei_du_bian_hua'),
    guan_huai_du: 取倾向值(shuJu, '关怀度变化', 'guan_huai_du_bian_hua'),
  }
  const 有倾向 = Object.values(倾向).some((值) => 值 !== 0)
  const 行为 = 取行为键(shuJu['行为'])
  if (!行为 && !有倾向) return null
  const liYou = String(shuJu['理由'] ?? shuJu['li_you'] ?? '')
  if (!行为) {
    debug日志.warn('好感度评判', '评判输出缺少「行为」字段，本轮退回旧口径不按阶段归一', {
      xiang_qing: { jie_duan: 阶段, qing_xiang: 倾向 },
    })
    return {
      xin_ren_du_bian_hua: 倾向.xin_ren_du,
      qin_mi_du_bian_hua: 倾向.qin_mi_du,
      qu_wei_du_bian_hua: 倾向.qu_wei_du,
      guan_huai_du_bian_hua: 倾向.guan_huai_du,
      li_you: liYou,
    }
  }
  return {
    ...按行为分配四维(行为, 阶段, 倾向, xiShu),
    行为,
    li_you: liYou,
  }
}

function 取阶段(haoGanDuZongFen: unknown, shangXiaWen?: 参数上下文): string {
  if (shangXiaWen?.haoGanDu阶段) return GuiFanGuanXiJieDuanMing(shangXiaWen.haoGanDu阶段)
  if (typeof shangXiaWen?.haoGanDu?.guan_xi_jie_duan === 'string' && shangXiaWen.haoGanDu.guan_xi_jie_duan !== '') {
    return GuiFanGuanXiJieDuanMing(shangXiaWen.haoGanDu.guan_xi_jie_duan)
  }
  if (typeof shangXiaWen?.haoGanDu?.zong_fen === 'number') return GuiFanGuanXiJieDuanMing(shangXiaWen.haoGanDu.zong_fen)
  return GuiFanGuanXiJieDuanMing(Number(haoGanDuZongFen) || 0)
}

async function 取关系状态(
  用户ID: string | undefined,
  jiaoSeId: string | undefined,
): Promise<{ 阶段: string; 系数: typeof 空系数 }> {
  if (!用户ID || !jiaoSeId) return { 阶段: '冷淡', 系数: 空系数 }
  const haoGanDu = await huoQuWanZhengHaoGanDu(用户ID, jiaoSeId)
  if (!haoGanDu) return { 阶段: '冷淡', 系数: 空系数 }
  const 阶段 = GuiFanGuanXiJieDuanMing(haoGanDu.zong_fen)
  let xiShu = 1
  try {
    const xiShuJieGuo = await jiSuanXiShu(用户ID, jiaoSeId, haoGanDu.zong_fen, Math.floor(haoGanDu.互动次数 ?? 0))
    xiShu = Math.max(HaoGanDuPeiZhi.ceLiangXiShuXiaXian, Math.min(HaoGanDuPeiZhi.ceLiangXiShuShangXian, xiShuJieGuo.xiShu))
    return { 阶段, 系数: { ...xiShuJieGuo, xiShu } }
  } catch {
    return { 阶段, 系数: 空系数 }
  }
}

async function 取近期对话(
  用户ID: string | undefined,
  jiaoSeId: string | undefined,
  jiaoSeMing: string,
  当前用户消息: string,
): Promise<string> {
  if (!用户ID || !jiaoSeId) return ''
  try {
    const { huoQuZuiJinDuiHuaLiShi } = await import('./AI输入准备')
    const liShi = await huoQuZuiJinDuiHuaLiShi(用户ID, jiaoSeId)
    const 当前用户文本 = String(当前用户消息 ?? '').replace(/\s+/g, ' ').trim()
    let 当前轮起点 = -1
    for (let i = liShi.length - 1; i >= 0; i -= 1) {
      const 项 = liShi[i]
      if (项.fa_song_zhe_lei_xing !== 'yonghu') continue
      if (String(项.nei_rong || '').replace(/\s+/g, ' ').trim() === 当前用户文本) {
        当前轮起点 = i
        break
      }
    }
    const 有效背景 = 当前轮起点 >= 0 ? liShi.slice(0, 当前轮起点) : liShi
    return 有效背景.slice(-HaoGanDuPeiZhi.junHengDuanWen.liShiTiaoShu).map((xiang) => {
      const faSongZhe = xiang.fa_song_zhe_lei_xing === 'jiaose' ? jiaoSeMing : '用户'
      return `${faSongZhe}: ${String(xiang.nei_rong || '').replace(/\s+/g, ' ').slice(0, HaoGanDuPeiZhi.junHengDuanWen.neiRongZuiDaChang)}`
    }).join('\n')
  } catch {
    return ''
  }
}

export async function pingPanHaoGanDuBianHuaNei(
  yongHuXiaoXi: string,
  jiaoSeHuiFu: string,
  jiaoSeMing: string,
  shangXiaWen?: 参数上下文,
  huiHuaJian?: string,
  用户ID?: string,
  jiaoSeId?: string,
): Promise<PingPanJieGuoYuXiShu> {
  try {
    const { 阶段, 系数 } = await 取关系状态(用户ID, jiaoSeId)
    const 实际阶段 = 取阶段(undefined, shangXiaWen) === '冷淡' && !shangXiaWen?.haoGanDu阶段 ? 阶段 : 取阶段(undefined, shangXiaWen)
    const xiuFuPanDingShangXiaWen = await quXiuFuPanDingShangXiaWen(用户ID, jiaoSeId)
    const jinQiYuHuiFu = await 取近期对话(用户ID, jiaoSeId, jiaoSeMing, yongHuXiaoXi)

    const xiangYing = await 按配置调用('HaoGanDuPingPan', [
      { jiaoSe: 'system', neiRong: '根据一轮对话判断好感变化，只输出 JSON。' },
      {
        jiaoSe: 'user',
        neiRong: gouJianHaoGanDuPingPanPrompt(
          yongHuXiaoXi,
          jiaoSeHuiFu,
          jiaoSeMing,
          shangXiaWen,
          xiuFuPanDingShangXiaWen,
          jinQiYuHuiFu,
          实际阶段,
        ),
      },
    ], shangXiaWen)

    const shuJu = jieXiJSON(xiangYing.neiRong)
    const jieGuo = 解析评判(shuJu, 实际阶段, 系数.xiShu)
    if (!jieGuo) {
      debug日志.error('好感度评判', '好感度评判解析失败，已标unknown不落分并入重试队列', {
        xiang_qing: { yuan_wen_chang_du: xiangYing.neiRong.length, jie_duan: 实际阶段 },
      })
      void paiRuZhongShiDuiLie({ leiXing: 'HaoGanDuPingPan', yuanYin: 'jie_xi_shi_bai' })
      return { jieGuo: { ...空结果, li_you: 'unknown' }, ...系数 }
    }

    const 最终 = huiHuaJian && !(用户ID && jiaoSeId)
      ? await yingYongHuiHuaBaoDi(huiHuaJian, jieGuo)
      : jieGuo

    return {
      jieGuo: 最终,
      ...系数,
      xiuFuPanDing: jieXiXiuFuPanDing(shuJu, xiuFuPanDingShangXiaWen !== undefined),
    }
  } catch (cuoWu) {
    debug日志.error('好感度评判', '好感度评判失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    void paiRuZhongShiDuiLie({ leiXing: 'HaoGanDuPingPan', yuanYin: 'diao_yong_yi_chang' })
    return { jieGuo: { ...空结果, li_you: 'unknown' }, ...空系数 }
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

export async function pingPanHaoGanDuPiLiangNei(
  yongHuXiaoXi: string,
  jiaoSeHuiFuLieBiao: string[],
  jiaoSeMing: string,
  shangXiaWen?: 参数上下文,
  huiHuaJian?: string,
  用户ID?: string,
  jiaoSeId?: string,
): Promise<PingPanJieGuoYuXiShu> {
  if (jiaoSeHuiFuLieBiao.length === 0) {
    return { jieGuo: { ...空结果 }, ...空系数 }
  }
  if (jiaoSeHuiFuLieBiao.length === 1) {
    return pingPanHaoGanDuBianHuaNei(yongHuXiaoXi, jiaoSeHuiFuLieBiao[0], jiaoSeMing, shangXiaWen, huiHuaJian, 用户ID, jiaoSeId)
  }

  try {
    const { 阶段, 系数 } = await 取关系状态(用户ID, jiaoSeId)
    const 实际阶段 = 取阶段(undefined, shangXiaWen) === '冷淡' && !shangXiaWen?.haoGanDu阶段 ? 阶段 : 取阶段(undefined, shangXiaWen)
    const xiuFuPanDingShangXiaWen = await quXiuFuPanDingShangXiaWen(用户ID, jiaoSeId)
    const jinQiYuHuiFu = await 取近期对话(用户ID, jiaoSeId, jiaoSeMing, yongHuXiaoXi)

    const huiFuDuanLuo = jiaoSeHuiFuLieBiao.map((huiFu, xuHao) => `${xuHao + 1}. ${huiFu}`).join('\n')
    const xiangYing = await 按配置调用('HaoGanDuPingPan', [
      { jiaoSe: 'system', neiRong: '根据一轮对话判断好感变化，只输出 JSON。' },
      {
        jiaoSe: 'user',
        neiRong: [
          gouJianHaoGanDuPingPanPrompt(
            yongHuXiaoXi,
            jiaoSeHuiFuLieBiao[0],
            jiaoSeMing,
            shangXiaWen,
            xiuFuPanDingShangXiaWen,
            jinQiYuHuiFu,
            实际阶段,
          ),
          '',
          '补充说明：这一轮对方连着发了几条消息，完整内容如下（请把它们当作一整轮回复整体评估）：',
          huiFuDuanLuo,
          '',
          '请基于这一整轮回复判定行为并输出 JSON。',
        ].join('\n'),
      },
    ], shangXiaWen)

    const shuJu = jieXiJSON(xiangYing.neiRong)
    const jieGuo = 解析评判(shuJu, 实际阶段, 系数.xiShu)
    if (!jieGuo) {
      debug日志.error('好感度评判', '好感度批量评判解析失败，已标unknown不落分并入重试队列', {
        xiang_qing: { yuan_wen_chang_du: xiangYing.neiRong.length, jie_duan: 实际阶段 },
      })
      void paiRuZhongShiDuiLie({ leiXing: 'HaoGanDuPingPan', yuanYin: 'pi_liang_jie_xi_shi_bai' })
      return { jieGuo: { ...空结果, li_you: 'unknown' }, ...系数 }
    }

    const 最终 = huiHuaJian && !(用户ID && jiaoSeId)
      ? await yingYongHuiHuaBaoDi(huiHuaJian, jieGuo)
      : jieGuo

    return {
      jieGuo: 最终,
      ...系数,
      xiuFuPanDing: jieXiXiuFuPanDing(shuJu, xiuFuPanDingShangXiaWen !== undefined),
    }
  } catch (cuoWu) {
    debug日志.error('好感度评判', '好感度批量评判失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    void paiRuZhongShiDuiLie({ leiXing: 'HaoGanDuPingPan', yuanYin: 'pi_liang_diao_yong_yi_chang' })
    return { jieGuo: { ...空结果, li_you: 'unknown' }, ...空系数 }
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
    const xiangYing = await 按配置调用('HaoGanDuPingPan', [
      { jiaoSe: 'system', neiRong: '判断这条消息有没有在修复你们之间的冲突，只输出 JSON。' },
      {
        jiaoSe: 'user',
        neiRong: gouJianXiuFuPanDingPrompt(yongHuXiaoXi, chongTuXinXi.zhuangTai, chongTuXinXi.shiYou, chongTuXinXi.shengJiJiShu, shangXiaWen),
      },
    ], shangXiaWen)
    const shuJu = jieXiJSON(xiangYing.neiRong)
    return jieXiXiuFuPanDing(shuJu, true) ?? 'wuGuan'
  } catch (cuoWu) {
    debug日志.error('好感度评判', '冲突修复判定失败，本次判为未完成，交由调用方累计失败次数', {
      xiang_qing: { yong_hu_id: 用户ID, jiao_se_id: jiaoSeId, cuo_wu: String(cuoWu) },
    })
    return 'wuGuan'
  }
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
