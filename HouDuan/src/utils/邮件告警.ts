import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { peiZhi } from '../config'
import { xieRuRiZhi } from './debug日志'

// A12 告警通道：SMTP 邮件通知。
// 凭据全部走环境变量；未配置 SMTP 时降级为仅写告警日志，绝不阻断业务主链路。
// 同一告警键带进程内冷却窗口，防止故障风暴刷爆收件箱。

export interface GaoJingYouJian {
  biao_ti: string
  nei_rong: string
}

let chuanShuQi: Transporter | null = null
let ceShiFaSongGouZi: ((youJian: GaoJingYouJian) => Promise<boolean>) | null = null

const lengQueBiao = new Map<string, number>()

/** 测试专用：注入邮件发送钩子（替代真实 SMTP） */
export function sheZhiGaoJingCeShiGouZi(gouZi: ((youJian: GaoJingYouJian) => Promise<boolean>) | null): void {
  ceShiFaSongGouZi = gouZi
}

/** 测试专用：清空冷却表 */
export function chongZhiGaoJingLengQue(): void {
  lengQueBiao.clear()
}

function huoQuChuanShuQi(): Transporter | null {
  if (chuanShuQi) return chuanShuQi
  const { smtpZhuJi, smtpDuanKou, smtpYongHuMing, smtpMiMa } = peiZhi.gaoJing
  if (!smtpZhuJi) return null
  chuanShuQi = nodemailer.createTransport({
    host: smtpZhuJi,
    port: smtpDuanKou,
    secure: smtpDuanKou === 465,
    auth: smtpYongHuMing ? { user: smtpYongHuMing, pass: smtpMiMa } : undefined,
  })
  return chuanShuQi
}

/**
 * 发送运维告警。返回 true 表示邮件已实际发出；
 * 冷却中返回 false 且不重复发送；SMTP 未配置或发送失败降级为告警日志并返回 false。
 */
export async function faSongGaoJing(
  lengQueJian: string,
  biaoTi: string,
  neiRong: string,
  lengQueHaoMiao = 10 * 60 * 1000,
): Promise<boolean> {
  const shangCi = lengQueBiao.get(lengQueJian)
  if (shangCi && Date.now() - shangCi < lengQueHaoMiao) {
    return false
  }
  lengQueBiao.set(lengQueJian, Date.now())

  const shouJianRen = peiZhi.gaoJing.shouJianRenLieBiao
  if (!shouJianRen.length) {
    xieRuRiZhi('warn', '运维告警', `${biaoTi}（GAO_JING_SHOU_JIAN_REN未配置，仅记录日志）`, {
      xiang_qing: { nei_rong: neiRong },
    })
    return false
  }

  if (ceShiFaSongGouZi) {
    try {
      const chengGong = await ceShiFaSongGouZi({ biao_ti: biaoTi, nei_rong: neiRong })
      if (chengGong) {
        xieRuRiZhi('warn', '运维告警', biaoTi, { xiang_qing: { tong_dao: 'email', nei_rong: neiRong } })
      }
      return chengGong
    } catch (cuoWu) {
      xieRuRiZhi('error', '运维告警发送失败', String(cuoWu), { xiang_qing: { biao_ti: biaoTi } })
      return false
    }
  }

  const qi = huoQuChuanShuQi()
  if (!qi) {
    xieRuRiZhi('warn', '运维告警', `${biaoTi}（SMTP_ZHU_JI未配置，仅记录日志）`, {
      xiang_qing: { nei_rong: neiRong },
    })
    return false
  }

  try {
    await qi.sendMail({
      from: peiZhi.gaoJing.faJianRen || peiZhi.gaoJing.smtpYongHuMing,
      to: shouJianRen.join(','),
      subject: `【和我恋爱吧】${biaoTi}`,
      text: neiRong,
    })
    xieRuRiZhi('warn', '运维告警', biaoTi, { xiang_qing: { tong_dao: 'email', nei_rong: neiRong } })
    return true
  } catch (cuoWu) {
    xieRuRiZhi('error', '运维告警发送失败', String(cuoWu), { xiang_qing: { biao_ti: biaoTi } })
    return false
  }
}

// ---- AI 连续失败告警（关键事件告警动作）----

let lianXuShiBaiCiShu = 0

function huoQuYuDongNeiRong(ciShu: number, zuiJinCuoWu?: string): string {
  return [
    `AI服务已连续失败${ciShu}次（阈值${peiZhi.aiLianXuShiBaiGaoJingYuZhi}），请尽快检查DeepSeek服务与网络状况。`,
    zuiJinCuoWu ? `最近一次错误：${zuiJinCuoWu.slice(0, 500)}` : '',
    `时间：${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join('\n')
}

/** AI 调用成功时调用：重置连续失败计数 */
export function jiLuAIChengGong(): void {
  lianXuShiBaiCiShu = 0
}

/** AI 调用失败时调用：达到阈值触发一次告警（受冷却窗口约束） */
export async function jiLuAIShiBai(cuoWuXinXi?: string): Promise<void> {
  lianXuShiBaiCiShu += 1
  if (lianXuShiBaiCiShu < peiZhi.aiLianXuShiBaiGaoJingYuZhi) return
  await faSongGaoJing(
    'ai_lian_xu_shi_bai',
    `AI连续失败${lianXuShiBaiCiShu}次`,
    huoQuYuDongNeiRong(lianXuShiBaiCiShu, cuoWuXinXi),
  )
}

// YH-154 告警P1-P4分级+SLO+升级抑制：单阈值根因为出事全靠人盯
// 收敛为分级告警键+升级抑制，SLO烧毁时自动升级
export type GaoJingJiBie = 'P1' | 'P2' | 'P3' | 'P4'

const GAO_JING_SHENG_JI_BIAO: Record<GaoJingJiBie, { lengQueHaoMiao: number; shengJiHou: GaoJingJiBie | null }> = {
  P4: { lengQueHaoMiao: 60 * 60 * 1000, shengJiHou: 'P3' },
  P3: { lengQueHaoMiao: 30 * 60 * 1000, shengJiHou: 'P2' },
  P2: { lengQueHaoMiao: 15 * 60 * 1000, shengJiHou: 'P1' },
  P1: { lengQueHaoMiao: 5 * 60 * 1000, shengJiHou: null },
}

const fenJiLengQueBiao = new Map<string, number>()

function huoQuFenJiJian(jiBie: GaoJingJiBie, jian: string): string {
  return `${jiBie}:${jian}`
}

export async function faSongFenJiGaoJing(
  jiBie: GaoJingJiBie,
  jian: string,
  biaoTi: string,
  neiRong: string,
): Promise<boolean> {
  const peiZhiXiang = GAO_JING_SHENG_JI_BIAO[jiBie]
  const fenJiJian = huoQuFenJiJian(jiBie, jian)
  const shangCi = fenJiLengQueBiao.get(fenJiJian)
  // 升级抑制：同键低级别冷却期内不再重复发，SLO持续烧毁才升级
  if (shangCi && Date.now() - shangCi < peiZhiXiang.lengQueHaoMiao) {
    return false
  }
  fenJiLengQueBiao.set(fenJiJian, Date.now())
  const jieGuo = await faSongGaoJing(fenJiJian, `[${jiBie}]${biaoTi}`, neiRong, peiZhiXiang.lengQueHaoMiao)
  // SLO烧毁升级：P4/P3/P2发送失败或冷却抑制后，自动升级一档重发
  if (!jieGuo && peiZhiXiang.shengJiHou) {
    const shengJi = peiZhiXiang.shengJiHou
    return faSongGaoJing(huoQuFenJiJian(shengJi, jian), `[${shengJi}]${biaoTi}（升级）`, neiRong)
  }
  return jieGuo
}
