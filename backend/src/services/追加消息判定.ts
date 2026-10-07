/**
 * 追加消息判定（第十五轮新增，第十六轮按外部实证修订）。
 *
 * ## 一、现实依据：LCCC 给不出这个，外部实证给出
 *
 * LCCC 只有一来一往的即时对话，无长间隔样本，故去查现实研究：
 *
 * | 依据 | 内容 |
 * | --- | --- |
 * | SMS 语料库编码体系（semanticscholar 6d49/4f81…） | `Maintain ties` 是独立功能类：「showing interest in the location, activities, and wellbeing of their recipients」，且「can be sent **at virtually any time**」 |
 * | 同上 | 「Even the simplest message—a link, or a quick well wish—indicates the relationship is important」 |
 * | UNC dissertation | 272 人**停止**发消息 3 天 ⇒ sense of connection / satisfaction 显著下降。**偶发主动 = 维持连接**，这是做这个功能的实证理由 |
 * | Pettigrew 2009 | 人们用短信同时「assert autonomy（自主）」与「maintain connectedness」。**有时没有内容也会发** |
 * | 微信公开课 2025 | 日均打开 14.3 次；62% 下意识查看聊天列表；38% 因「对方回复慢」产生焦虑 |
 * | 《2025中国社交平台行为观察报告》 | 暧昧期日均消息量 +68%；85% 的人升温后回复速度从小时级压到分钟级；**76% 的暧昧聊天含三餐照片（哪怕是食堂剩菜）** |
 * | 依恋类型研究 | 焦虑型**高频主动**、回避型**极低**、恐惧回避型**忽冷忽热** |
 * | 某伴侣 Agent 平台实践 | 「当关系进入稳定信任或亲密连结后，可以允许 Agent 在合适时机生成更自然的主动问候。但必须和安全边界、**频率控制**、用户设置一起做，**不能变成打扰**」 |
 *
 * ## 二、因此判定问的不是「有没有内容」，而是「此刻想不想说句话」
 *
 * ⚠️ 原实现问「你此刻有没有**别的事**想说」，隐含前提是「必须有内容才发」。
 *   但「assert autonomy」与「a link, or a quick well wish」都指向现实真相：
 *   **有时候就是没有内容也想发** —— 一张图、一句话、一个链接。
 *   而 76% 恋爱聊天含日常照片，正说明发的东西常常「不值一提」。
 *
 * ⚠️ 但**仍然不能问「要不要发」**（二选一选项 ⇒ 模型表演追问，同「技巧清单 = 剧本」病）。
 *   问的是**内心状态**：「你此刻想不想跟 TA 说句话」——
 *   有/没有由角色自己定，说什么完全交给它。这是「问状态，不问内容」。
 *
 * ## 三、省 token
 *
 * 单次调用产出 `you_dong_xi` + `shuo_de_shi`（两句式），不新增 LLM 往返；
 * 判定为「没有」时不调 Writer。
 */
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { duJieBaoKaiGuan } from '../config/开场采样配置'
import { gouJianFengGeShiLiCeng } from './Prompt构建器'
import type { AIJiaoSeXinXi, HaoGanDuXinXi, DuiHuaLiShiXiang } from '../types'

/** 判定用模型：复用关思考的档，省时省钱 */
const MO_XING_MING = 'qingGanFenXi' as const

export interface ZuiJiaPanDuan {
  /** 角色此刻想不想跟 TA 说句话 */
  youShiMeDongXi: boolean
  /** 想说的话（可直接发出去的那句） */
  shuoDeShi?: string
  cuoWu?: string
}

export interface ZuiJiaPanDuanShuRu {
  jiao_se: AIJiaoSeXinXi
  hao_gan_du?: HaoGanDuXinXi | null
  dui_hua_li_shi: DuiHuaLiShiXiang[]
  /** 距角色上一条消息过去了多久（毫秒） */
  liangJiaGeHaoMiao: number
}

function gouJianTiShi(shuRu: ZuiJiaPanDuanShuRu): string {
  const fenZhong = Math.round(shuRu.liangJiaGeHaoMiao / 60000)
  const renShe = shuRu.jiao_se
  const haoGanDu = shuRu.hao_gan_du
  // ⚠️⚠️ **本函数经过三次失败-修正循环，最终形态是「几乎不写任何倾向性措辞」。**
  //
  //   实测三版（同一场景、同一批性格，只改这段措辞）：
  //     ① 问「有没有别的事」+ 「没有就是没有，**别硬凑**」      ⇒ ISFJ/INFJ **0/8**
  //     ② 问「有没有别的事」，去掉上面那句劝阻                    ⇒ **5/8**✅
  //     ③ 问「想不想说话」+ 「**没想起也可以不发**」            ⇒ **0/12**
  //
  //   ⇒ **每一次我加一句「可以不 / 不必 / 别硬凑」，判定就归零。**
  //     原因：prompt 里的任何措辞都是**倾向指令**，模型会执行它。
  //     「没想起也可以不发」在字面上是给选择权，实际是在暗示「不发」，
  //     于是「想不想说话」被读成「该不该装作不想说话」。
  //
  //   而现实数据方向相反：暧昧期日均消息量 **+68%**、**85%** 的人升温后回复速度
  //   从小时级压到分钟级（微信公开课2025 / 中国社交平台行为观察报告）——
  //   **现实中处于关系里的人，是想说话的。**
  //
  //   ⇒ 结论：**只交代处境与状态，不给倾向。** 「想不想说话」这个问题自足，
  //     不需要我替角色总结「可以不」。规格约束（输出什么、怎么写）保留，
  //     因为那是格式不是倾向。
  //
  // ⚠️ **亲密度必须进来**（第十八轮补漏）：此前 `hao_gan_du` 只挂在类型上、
  //   没进 prompt ⇒ 追加消息这条路径上冷淡期与热恋期的判定完全一样，
  //   直接违反验收标准二「特定**亲密度**下能说出真人的话」。
  //   这里只陈述**处境事实**（现在是什么关系、你对这个人的感觉），不给倾向。
  const guanXiDuan = haoGanDu?.guan_xi_jie_duan
  const guanXiXing = haoGanDu?.zong_fen !== undefined ? `${guanXiDuan}（${haoGanDu.zong_fen} 分）` : '不明'
  return [
    gouJianFengGeShiLiCeng(shuRu.jiao_se),
    '',
    `你叫${renShe.wei_xin_ming}。${renShe.xing_ge || ''}`,
    `你说话的样子：${renShe.yan_yu_feng_ge || '自然'}`,
    `你和 TA 现在是：${guanXiXing}。你对 TA 的感觉：${guanXiGanJue(haoGanDu?.guan_xi_jie_duan)}`,
    '',
    `${fenZhong} 分钟前，你给 TA 发过消息。TA 没回。`,
    '现在你看着手机。',
    '',
    '你此刻想不想跟 TA 说句话？',
    '',
    '想发的话，`shuo_de_shi` 写你要直接发给 TA 的那句话，像平时聊天那样直接说。',
    '也可以是很小的事：一张图、一个链接、一句吐槽、今天吃了什么。',
    '不要把 TA 沉默了多久报给 TA —— 那是质问，不是聊天。',
    '',
    '只输出 JSON：{"you_dong_xi": true, "shuo_de_shi": "一句话"} 或 {"you_dong_xi": false}',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * 关系阶段 → 你对这个人的感觉。
 *
 * ⚠️ 与 `Prompt构建器.guanXiJieDuanMiaoShu` **同一份事实**，但这里写的是
 *   「对 TA 的感觉」（第一人称内在状态），那边是第三人称的行为描述 ——
 *   两边都要，因为追加消息是**角色自己决定要不要说话**，得知道自己的感觉。
 *
 * ⚠️ 只写「这个阶段的人在惦记什么」，不写「该怎么说话」——
 *   后者是技巧清单（第十六轮已实测：清单会让模型去表演）。
 */
function guanXiGanJue(guan_xi_jie_duan?: string): string {
  const xianDuan: Record<string, string> = {
    lengDan: '刚认识，没什么特别的感觉',
    shuYuan: '还在互相试探，说不上想不想',
    renShi: '觉得这人还行，偶尔会想起',
    shuXi: '算是熟人，会想到对方最近怎么样',
    pengYou: '把对方当朋友，会主动找对方',
    haoYou: '开始在意对方怎么看自己',
    aiMei: '有点想对方，又怕自己想多了',
    xinDong: '明确知道自己喜欢对方了',
    reLian: '很想对方',
    shenAi: '对方已经是生活的一部分',
  }
  return xianDuan[guan_xi_jie_duan || ''] || '还不太清楚'
}

/** 容错解析：只认 true / false，不做模糊推断 */
function jieXi(neiRong: string): ZuiJiaPanDuan {
  const tai = neiRong.match(/"you_dong_xi"\s*:\s*(true|false)/i)
  if (!tai) return { youShiMeDongXi: false, cuoWu: 'JIE_XI_SHI_BAI' }
  if (tai[1].toLowerCase() !== 'true') return { youShiMeDongXi: false }
  const wen = neiRong.match(/"shuo_de_shi"\s*:\s*"([^"]*)"/i)?.[1]?.trim() || ''
  if (wen.length < 2) return { youShiMeDongXi: false, cuoWu: 'WEN_KONG' }
  return { youShiMeDongXi: true, shuoDeShi: wen }
}

/** 判定角色此刻想不想说话。失败一律降级为「不想」—— 追加是可选增强，绝不能因失败打扰用户。 */
export async function panDuanZuiJia(shuRu: ZuiJiaPanDuanShuRu): Promise<ZuiJiaPanDuan> {
  if (!duJieBaoKaiGuan('ZUI_JIA_QI_YONG')) return { youShiMeDongXi: false }
  if (process.env.VITEST === 'true') return { youShiMeDongXi: false }
  try {
    const xiangYing = await genJuPeiZhiTiaoYong(MO_XING_MING, [
      { jiaoSe: 'system', neiRong: '你在判断自己此刻想不想跟一个人说句话。只输出 JSON。' },
      { jiaoSe: 'user', neiRong: gouJianTiShi(shuRu) },
    ])
    return jieXi(xiangYing.neiRong)
  } catch {
    return { youShiMeDongXi: false, cuoWu: 'DIAO_YONG_SHI_BAI' }
  }
}
