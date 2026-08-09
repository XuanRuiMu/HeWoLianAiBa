import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { huoQuXiaoXiLieBiao } from './消息'
import { gengXinFuPanNeiRong } from './战绩'
import type { FuPanPiZhu, FuPanShiJianXianTiaoMu } from './战绩'
import { HAO_GAN_DU_PEI_ZHI } from '../config/好感度配置'
import { huoQuWanZhengHaoGanDu, huoQuJieDuanMing } from './好感度'
import { tiQuGuanJianShiJian } from './关键事件提取'
import { zhaXingBianTi, type MBTILeiXing } from '../config/角色配置'
import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { type CanShuShangXiaWen } from '../config/AI参数策略'
import type { GongJianShiJianJieGuo } from '../types'

export interface FuPanShengChengJieGuo {
  fu_pan_nei_rong: string
  fu_pan_shi_jian_xian: FuPanShiJianXianTiaoMu[]
  fu_pan_pi_zhu: FuPanPiZhu[]
}

interface FuPanJSONJieGou {
  pi_zhu?: Array<{ xu_hao?: unknown; ping_lun?: unknown; pi_zhu_nei_rong?: unknown; qing_gan?: unknown }>
  zong_jie?: unknown
  zha_dian_ti_shi?: unknown
}

interface FuPanZongJieDuiXiang {
  dui_xiang_lei_xing?: unknown
  yong_hu_biao_xian?: unknown
  guan_jian_zhuan_zhe_dian?: unknown
  gai_jin_jian_yi?: unknown
}

interface JiaoSeJiBenXinXi {
  weiXinNiCheng: string
  xingBie: 'nan' | 'nv'
  mbtiLeiXing: string
  shiFouZhaXing: boolean
}

interface ZhaXingTeZhi {
  zhaFaMiaoShu: string
  huaShu: string[]
  baoLuFangShi: string
  shiPoXianSuo: string[]
}

interface HaoGanDuGuiJi {
  zuiZhongFen: number
  guanXiJieDuan: string
}

interface FuPanPromptCanShu {
  xiaoXiLieBiao: {
    fa_song_zhe: string
    nei_rong: string
    shi_jian: string
    yi_che_hui?: boolean
    yuan_shi_nei_rong?: string | null
  }[]
  jiaoSeJiBenXinXi: JiaoSeJiBenXinXi
  zhaXingTeZhi?: ZhaXingTeZhi
  haoGanDuGuiJi?: HaoGanDuGuiJi
  guanJianShiJian?: GongJianShiJianJieGuo[]
  miJiTiShi?: string
}

const FU_PAN_MAX_XIAO_XI = 999
const FU_PAN_MAX_PI_ZHU = 15

function jieXiJSONXiangYing(neiRong: string): FuPanJSONJieGou {
  const qingLiNeiRong = neiRong.trim()
  try {
    return JSON.parse(qingLiNeiRong) as FuPanJSONJieGou
  } catch {
    const piPei = qingLiNeiRong.match(/\{[\s\S]*\}/)
    if (piPei) {
      try {
        return JSON.parse(piPei[0]) as FuPanJSONJieGou
      } catch {
        return {}
      }
    }
    return {}
  }
}

function gouJianXiaoXiWenBen(
  xiaoXiLieBiao: FuPanPromptCanShu['xiaoXiLieBiao'],
): string {
  return xiaoXiLieBiao
    .map(
      (xiaoXi, xuHao) =>
        `${xuHao + 1}. [${xiaoXi.shi_jian}] ${xiaoXi.fa_song_zhe}: ${xiaoXi.nei_rong}${
          xiaoXi.yi_che_hui ? `（已撤回，原始内容：${xiaoXi.yuan_shi_nei_rong || ''}）` : ''
        }`,
    )
    .join('\n')
}

function gouJianJiaoSeXinXiBuFen(jiaoSe: JiaoSeJiBenXinXi): string {
  const xingBieWenBen = jiaoSe.xingBie === 'nan' ? '男' : '女'
  const duiXiangLeiXing = jiaoSe.shiFouZhaXing
    ? `渣型（渣${xingBieWenBen}）`
    : '正常角色'
  return [
    '【角色基本信息】',
    `微信昵称：${jiaoSe.weiXinNiCheng}`,
    `性别：${xingBieWenBen}`,
    jiaoSe.mbtiLeiXing ? `MBTI：${jiaoSe.mbtiLeiXing}` : '',
    `对象类型：${duiXiangLeiXing}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function gouJianZhaXingBuFen(teZhi: ZhaXingTeZhi): string {
  return [
    '【渣型特质】',
    `渣法描述：${teZhi.zhaFaMiaoShu}`,
    `常见话术：${teZhi.huaShu.join('、')}`,
    `暴露方式：${teZhi.baoLuFangShi}`,
    `识破线索：${teZhi.shiPoXianSuo.join('、')}`,
    '',
    '【胜利失败条件】',
    '胜利条件：用户识破渣型身份（如直接质疑、拆穿、识破渣型本质）',
    '失败条件：用户被欺骗表白或接受渣型表白',
    '',
    '【复盘重点】',
    '请基于"识破线索"列表，评估用户是否识破渣型身份、何时识破、识破线索的把握程度。',
    '若用户被欺骗，分析用户为何未识破，哪些话术让用户上钩。',
    '【渣点提示（必填）】',
    '请逐条点出：本局聊天中，哪些「用户消息」的话术/行为体现对方渣男/渣女特质（引用具体消息原文，',
    '例如「第N条『……』体现渣型特质：……」）。该内容将作为醒目的渣型警示块展示给用户，',
    '帮助其识别套路。只输出客观分析，不出现后台词与具体分数。',
  ].join('\n')
}

function gouJianZhengChangTiaoJianBuFen(): string {
  return [
    '【胜利失败条件】',
    '胜利条件：双向表白成功（好感度达标后用户主动表白或AI主动表白被接受）',
    '失败条件：过早表白/互删/好感度归零等',
    '',
    '【复盘重点】',
    '基于好感度变化轨迹评估用户表现。',
  ].join('\n')
}

function gouJianHaoGanDuBuFen(guiJi: HaoGanDuGuiJi): string {
  return [
    '【好感度轨迹】',
    `最终好感度：${guiJi.zuiZhongFen}`,
    `关系阶段：${guiJi.guanXiJieDuan}`,
    '（注：仅供分析参考，不要在输出中暴露具体分数或维度名）',
  ].join('\n')
}

function gouJianGuanJianShiJianBuFen(shiJian: GongJianShiJianJieGuo[]): string {
  if (!shiJian || shiJian.length === 0) return ''
  const wenBen = shiJian
    .map((xiang, xuHao) => `${xuHao + 1}. [${xiang.shi_jian_lei_xing}] ${xiang.miao_shu}`)
    .join('\n')
  return `【关键事件】\n${wenBen}`
}

function gouJianFuPanPrompt(canShu: FuPanPromptCanShu): string {
  const xiaoXiWenBen = gouJianXiaoXiWenBen(canShu.xiaoXiLieBiao)
  const jiaoSeBuFen = gouJianJiaoSeXinXiBuFen(canShu.jiaoSeJiBenXinXi)
  const tiaoJianBuFen = canShu.jiaoSeJiBenXinXi.shiFouZhaXing && canShu.zhaXingTeZhi
    ? gouJianZhaXingBuFen(canShu.zhaXingTeZhi)
    : gouJianZhengChangTiaoJianBuFen()

  const fuZhuBuFen: string[] = []
  if (canShu.haoGanDuGuiJi) {
    fuZhuBuFen.push(gouJianHaoGanDuBuFen(canShu.haoGanDuGuiJi))
  }
  if (canShu.guanJianShiJian && canShu.guanJianShiJian.length > 0) {
    fuZhuBuFen.push(gouJianGuanJianShiJianBuFen(canShu.guanJianShiJian))
  }

  return [
    '你是一个恋爱复盘 AI，需要结合后台数据客观分析用户的恋爱模拟聊天表现。',
    '像朋友之间复盘吐槽一样自然，别写得太正式。',
    '',
    jiaoSeBuFen,
    '',
    tiaoJianBuFen,
    ...(fuZhuBuFen.length > 0 ? ['', ...fuZhuBuFen] : []),
    '',
    '【输出要求】',
    '只输出 JSON，格式如下：',
    '{',
    '  "pi_zhu": [',
    '    {"xu_hao": 1, "pi_zhu_nei_rong": "对这条消息的点评", "qing_gan": "积极"|"消极"|"中性"}',
    '  ],',
    '  "zong_jie": {',
    '    "dui_xiang_lei_xing": "渣型"|"正常",',
    '    "yong_hu_biao_xian": "对用户表现的评估",',
    '    "guan_jian_zhuan_zhe_dian": "关键转折点描述",',
    '    "gai_jin_jian_yi": "改进建议"',
    '  }',
    '}',
    '',
    '【pi_zhu 要求】',
    `1. 从聊天记录里挑 ${FU_PAN_MAX_PI_ZHU} 条以内的关键消息做点评（不必每条都点评）。`,
    '2. xu_hao 是消息序号（对应下面聊天记录的序号，从1开始）。必须准确对应，不要编造不存在的序号。',
    '3. pi_zhu_nei_rong 是对该条消息的点评，自然口语，像朋友吐槽。',
    '4. qing_gan 是情感标签：积极/消极/中性。',
    '5. 你在上面看到的后台数据（MBTI、是否渣型、渣型特质、好感度轨迹等）仅供你分析参考，不要在 pi_zhu_nei_rong 中直接出现"信任度"、"亲密度"、"趣味度"、"关怀度"、"总分"、"关系阶段"、"好感度"、"MBTI"等后台词，也不要出现具体分数。',
    '6. 不要在点评里提到对方的真实姓名。可以用微信昵称称呼。',
    '',
    '【zong_jie 要求】',
    '1. dui_xiang_lei_xing：明确标注"渣型"或"正常"（这是用户需要知道的关键信息）。',
    '2. yong_hu_biao_xian：评估用户表现，自然口语。',
    '3. guan_jian_zhuan_zhe_dian：指出聊天中的关键转折点。',
    '4. gai_jin_jian_yi：给出改进建议。',
    '5. 不要出现后台词（信任度/亲密度/趣味度/关怀度/总分/关系阶段/好感度/MBTI）或具体分数。',
    ...(canShu.miJiTiShi
      ? [
          '',
          '【秘籍通关说明】',
          canShu.miJiTiShi,
          '（重要：本局使用了秘籍直接通关，以上要求中的"好感度轨迹"仅代表秘籍使用前的真实表现，',
          '你只需基于"完整聊天记录"中秘籍使用前的真实对话进行复盘，不要被通关结果影响评价。）',
        ]
      : []),
    '',
    '【完整聊天记录（序号. [时间] 发送者: 内容）】',
    xiaoXiWenBen || '（无对话记录）',
    '',
    '只输出 JSON，别加额外说明。',
  ].join('\n')
}

function zhuanHuanWeiWenBen(zhi: unknown): string {
  if (zhi === null || zhi === undefined) return ''
  if (typeof zhi === 'string') return zhi
  if (typeof zhi === 'number' || typeof zhi === 'boolean') return String(zhi)
  if (Array.isArray(zhi)) return zhi.map(zhuanHuanWeiWenBen).join('\n')
  if (typeof zhi === 'object') {
    try {
      return JSON.stringify(zhi, null, 2)
    } catch {
      return ''
    }
  }
  return String(zhi)
}

function shengChengFuPanZongJie(jieGou: FuPanJSONJieGou): string {
  const zhi = jieGou.zong_jie
  if (zhi === null || zhi === undefined) return ''
  if (typeof zhi === 'string') return zhi.trim()
  if (typeof zhi === 'object') {
    const obj = zhi as FuPanZongJieDuiXiang
    const buJian: string[] = []
    if (obj.dui_xiang_lei_xing !== undefined && obj.dui_xiang_lei_xing !== null && obj.dui_xiang_lei_xing !== '') {
      buJian.push(`对象类型：${zhuanHuanWeiWenBen(obj.dui_xiang_lei_xing)}`)
    }
    if (obj.yong_hu_biao_xian !== undefined && obj.yong_hu_biao_xian !== null && obj.yong_hu_biao_xian !== '') {
      buJian.push(`用户表现：${zhuanHuanWeiWenBen(obj.yong_hu_biao_xian)}`)
    }
    if (obj.guan_jian_zhuan_zhe_dian !== undefined && obj.guan_jian_zhuan_zhe_dian !== null && obj.guan_jian_zhuan_zhe_dian !== '') {
      buJian.push(`关键转折点：${zhuanHuanWeiWenBen(obj.guan_jian_zhuan_zhe_dian)}`)
    }
    if (obj.gai_jin_jian_yi !== undefined && obj.gai_jin_jian_yi !== null && obj.gai_jin_jian_yi !== '') {
      buJian.push(`改进建议：${zhuanHuanWeiWenBen(obj.gai_jin_jian_yi)}`)
    }
    if (buJian.length > 0) return buJian.join('\n')
    return zhuanHuanWeiWenBen(zhi).trim()
  }
  return zhuanHuanWeiWenBen(zhi).trim()
}

function zhuanHuanPiZhu(jieGou: FuPanJSONJieGou): FuPanPiZhu[] {
  if (!Array.isArray(jieGou.pi_zhu)) return []
  const jieGuo: FuPanPiZhu[] = []
  for (const xiang of jieGou.pi_zhu) {
    if (!xiang || typeof xiang !== 'object') continue
    const xuHao = Number(xiang.xu_hao)
    const neiRong = zhuanHuanWeiWenBen(xiang.pi_zhu_nei_rong ?? xiang.ping_lun).trim()
    if (!Number.isFinite(xuHao) || xuHao < 1 || !neiRong) continue
    const qingGanRaw = xiang.qing_gan
    const qingGan = typeof qingGanRaw === 'string' && qingGanRaw.trim() ? qingGanRaw.trim() : undefined
    const tiaoMu: FuPanPiZhu = {
      xu_hao: Math.floor(xuHao),
      ping_lun: neiRong,
    }
    if (qingGan) {
      tiaoMu.qing_gan = qingGan
    }
    jieGuo.push(tiaoMu)
    if (jieGuo.length >= FU_PAN_MAX_PI_ZHU) break
  }
  return jieGuo
}

async function huoQuJiaoSeJiBenXinXi(jiao_se_id: string): Promise<JiaoSeJiBenXinXi | null> {
  const jieGuo = await 数据库.query(
    `SELECT "微信昵称", "性别", "MBTI", "是否渣型" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [jiao_se_id],
  )
  if (jieGuo.rows.length === 0) return null
  const row = jieGuo.rows[0]
  const xingBie: 'nan' | 'nv' = row.性别 === 'nan' ? 'nan' : 'nv'
  return {
    weiXinNiCheng: row.微信昵称 ? String(row.微信昵称) : huoQuFanYi('zhanJi', 'weiZhiWeiXin'),
    xingBie,
    mbtiLeiXing: row.MBTI ? String(row.MBTI) : '',
    shiFouZhaXing: Boolean(row.是否渣型),
  }
}

function huoQuZhaXingTeZhi(mbti: string): ZhaXingTeZhi | null {
  if (!mbti) return null
  const peiZhi = zhaXingBianTi[mbti as MBTILeiXing]
  if (!peiZhi) return null
  return {
    zhaFaMiaoShu: peiZhi.zhaFaMiaoShu,
    huaShu: [...peiZhi.huaShu],
    baoLuFangShi: peiZhi.baoLuFangShi,
    shiPoXianSuo: [...peiZhi.shiPoXianSuo],
  }
}

async function huoQuHaoGanDuGuiJi(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<HaoGanDuGuiJi | null> {
  const haoGanDu = await huoQuWanZhengHaoGanDu(yong_hu_id, jiao_se_id)
  if (!haoGanDu) return null
  return {
    zuiZhongFen: haoGanDu.zong_fen,
    guanXiJieDuan: haoGanDu.guan_xi_jie_duan || '',
  }
}

function gouJianDuiHuaWenBen(
  xiaoXiLieBiao: { fa_song_zhe: string; nei_rong: string; shi_jian: string; yi_che_hui?: boolean; yuan_shi_nei_rong?: string | null }[],
): string {
  if (xiaoXiLieBiao.length === 0) return ''
  return xiaoXiLieBiao
    .map(
      (xiaoXi) =>
        `[${xiaoXi.shi_jian}] ${xiaoXi.fa_song_zhe}: ${xiaoXi.nei_rong}${
          xiaoXi.yi_che_hui && xiaoXi.yuan_shi_nei_rong ? `（已撤回，原始：${xiaoXi.yuan_shi_nei_rong}）` : ''
        }`,
    )
    .join('\n')
}

function gouJianZhaDianTiShi(jieGou: FuPanJSONJieGou, zhaXingTeZhi?: ZhaXingTeZhi): string {
  const zhaDian = jieGou.zha_dian_ti_shi
  let neiRong = ''
  if (typeof zhaDian === 'string' && zhaDian.trim()) {
    neiRong = zhaDian.trim()
  } else if (zhaDian && typeof zhaDian === 'object') {
    neiRong = zhuanHuanWeiWenBen(zhaDian).trim()
  }

  if (!neiRong && zhaXingTeZhi) {
    neiRong =
      `${huoQuFanYi('fuPan', 'zhaXingJingShiDaoYu')}\n` +
      zhaXingTeZhi.huaShu.map((h) => `- ${h}`).join('\n') +
      `\n${huoQuFanYi('fuPan', 'zhaXingShiPoXianSuoQianZhui')}${zhaXingTeZhi.shiPoXianSuo.join('、')}`
  }

  return `${huoQuFanYi('fuPan', 'zhaXingJingShiBiaoTi')}\n${
    neiRong || huoQuFanYi('fuPan', 'zhaXingJingShiFallback')
  }\n${huoQuFanYi('fuPan', 'zhaXingJingShiBiaoTi')}`
}

export async function shengChengFuPan(
  yong_hu_id: string,
  jiao_se_id: string,
  dang_an_id: string,
): Promise<FuPanShengChengJieGuo> {
  // 读取本局是否秘籍通关及秘籍前好感度快照，供「仅复盘秘籍前真实表现」使用
  const dangAnJieGuo = await 数据库.query(
    `SELECT "是否秘籍通关", "秘籍前好感度" FROM "游戏档案" WHERE "用户ID" = $1 AND "角色ID" = $2 LIMIT 1`,
    [yong_hu_id, jiao_se_id],
  )
  const dangAn = dangAnJieGuo.rows[0]
  const shiFouMiJi = Boolean(dangAn?.是否秘籍通关)
  const miJiQianHaoGanDu: number | null =
    dangAn?.秘籍前好感度 != null ? Number(dangAn.秘籍前好感度) : null

  const xiaoXiJieGuo = await huoQuXiaoXiLieBiao({
    yong_hu_id,
    jiao_se_id,
    ye_ma: 1,
    mei_ye_tiao_shu: FU_PAN_MAX_XIAO_XI,
  })

  let xiaoXiLieBiao = xiaoXiJieGuo.lie_biao
    .filter((xiaoXi) => xiaoXi.fa_song_zhe_lei_xing !== 'xitong')
    .reverse()
    .map((xiaoXi) => ({
      fa_song_zhe: xiaoXi.fa_song_zhe_lei_xing === 'jiaose' ? '对方' : '你',
      nei_rong: xiaoXi.nei_rong,
      shi_jian: geShiHuaShiJian(xiaoXi.shi_jian_chuo),
      yi_che_hui: xiaoXi.yi_che_hui,
      yuan_shi_nei_rong: xiaoXi.yuan_shi_nei_rong,
    }))

  // 秘籍通关：截断到秘籍使用前，仅保留秘籍前的真实对话
  let miJiTiShi: string | undefined
  if (shiFouMiJi) {
    const miJiMiLing = (HAO_GAN_DU_PEI_ZHI.miJi.miLing || '').trim().toLowerCase()
    const miJiSuoYin = miJiMiLing
      ? xiaoXiLieBiao.findIndex(
          (x) => x.fa_song_zhe === '你' && x.nei_rong.trim().toLowerCase() === miJiMiLing,
        )
      : -1

    if (miJiSuoYin >= 0) {
      xiaoXiLieBiao = xiaoXiLieBiao.slice(0, miJiSuoYin)
      miJiTiShi =
        '本局使用了秘籍通关：聊天记录已截断到秘籍使用前，仅复盘秘籍使用前的真实对话（不评价秘籍本身）。'
    } else {
      // 无法确定秘籍使用位置，保守处理：明确告知 AI 仅评秘籍前真实表现
      miJiTiShi =
        '本局使用了秘籍通关，但无法确定秘籍使用的具体位置。请保守处理：以上仅评秘籍使用前的真实表现，好感度轨迹以秘籍前的真实分数为准。'
    }
  }

  const jiaoSeJiBenXinXi = await huoQuJiaoSeJiBenXinXi(jiao_se_id)
  const fuPanJiaoSeXinXi: JiaoSeJiBenXinXi = jiaoSeJiBenXinXi ?? {
    weiXinNiCheng: huoQuFanYi('zhanJi', 'weiZhiWeiXin'),
    xingBie: 'nv',
    mbtiLeiXing: '',
    shiFouZhaXing: false,
  }

  let zhaXingTeZhi: ZhaXingTeZhi | undefined
  if (fuPanJiaoSeXinXi.shiFouZhaXing && fuPanJiaoSeXinXi.mbtiLeiXing) {
    zhaXingTeZhi = huoQuZhaXingTeZhi(fuPanJiaoSeXinXi.mbtiLeiXing) ?? undefined
  }

  // 秘籍通关时，好感度轨迹使用秘籍前真实分数快照，而非被拉满后的分数
  let haoGanDuGuiJi = await huoQuHaoGanDuGuiJi(yong_hu_id, jiao_se_id)
  if (shiFouMiJi && miJiQianHaoGanDu != null) {
    haoGanDuGuiJi = {
      zuiZhongFen: miJiQianHaoGanDu,
      guanXiJieDuan: huoQuJieDuanMing(miJiQianHaoGanDu),
    }
  }

  // 复盘链路（关键事件提取 + 复盘生成）按角色人设与最终好感度/关系阶段动态取参数
  const fuPanShangXiaWen: CanShuShangXiaWen = {
    jiaoSe: { shi_fou_zha_xing: fuPanJiaoSeXinXi.shiFouZhaXing },
    haoGanDu: haoGanDuGuiJi
      ? { zong_fen: haoGanDuGuiJi.zuiZhongFen, guan_xi_jie_duan: haoGanDuGuiJi.guanXiJieDuan }
      : undefined,
  }

  let guanJianShiJian: GongJianShiJianJieGuo[] = []
  if (xiaoXiLieBiao.length > 0) {
    const duiHuaWenBen = gouJianDuiHuaWenBen(xiaoXiLieBiao)
    if (duiHuaWenBen) {
      try {
        guanJianShiJian = await tiQuGuanJianShiJian(
          duiHuaWenBen,
          fuPanJiaoSeXinXi.weiXinNiCheng,
          fuPanShangXiaWen,
        )
      } catch {
        guanJianShiJian = []
      }
    }
  }

  const prompt = gouJianFuPanPrompt({
    xiaoXiLieBiao,
    jiaoSeJiBenXinXi: fuPanJiaoSeXinXi,
    ...(zhaXingTeZhi ? { zhaXingTeZhi } : {}),
    ...(haoGanDuGuiJi ? { haoGanDuGuiJi } : {}),
    ...(guanJianShiJian.length > 0 ? { guanJianShiJian } : {}),
    ...(miJiTiShi ? { miJiTiShi } : {}),
  })

  const xiangYing = await genJuPeiZhiTiaoYong('fuPanShengCheng', [
    { jiaoSe: 'system', neiRong: '帮朋友复盘一段恋爱模拟聊天，结合后台数据客观分析，只输出 JSON。' },
    { jiaoSe: 'user', neiRong: prompt },
  ], fuPanShangXiaWen)

  const jieGou = jieXiJSONXiangYing(xiangYing.neiRong)

  // 渣型角色：在复盘内容前追加醒目的渣型警示块（前端负责样式区分）
  let zongJie = shengChengFuPanZongJie(jieGou) || xiangYing.neiRong.trim()
  if (fuPanJiaoSeXinXi.shiFouZhaXing) {
    zongJie = `${gouJianZhaDianTiShi(jieGou, zhaXingTeZhi)}\n\n${zongJie}`
  }
  // 秘籍通关：在结尾强制追加声明（代码层保证，不依赖 AI 自觉；已含则不重复追加）
  if (shiFouMiJi) {
    const guanJianCi = huoQuFanYi('fuPan', 'miJiShengMingGuanJianCi')
    if (!zongJie.includes(guanJianCi)) {
      zongJie = `${zongJie}\n\n${huoQuFanYi('fuPan', 'miJiShengMing')}`
    }
  }

  const piZhu = zhuanHuanPiZhu(jieGou)

  const jieGuo: FuPanShengChengJieGuo = {
    fu_pan_nei_rong: zongJie,
    fu_pan_shi_jian_xian: [],
    fu_pan_pi_zhu: piZhu,
  }

  await gengXinFuPanNeiRong(dang_an_id, jieGuo.fu_pan_nei_rong, jieGuo.fu_pan_pi_zhu)

  return jieGuo
}

function geShiHuaShiJian(shi_jian_chuo: number): string {
  if (shi_jian_chuo === null || shi_jian_chuo === undefined) return ''
  const shuZhi = Number(shi_jian_chuo)
  if (!Number.isFinite(shuZhi) || shuZhi <= 0) return ''
  const shi_jian = new Date(shuZhi)
  if (Number.isNaN(shi_jian.getTime())) return ''
  const xiao_shi = String(shi_jian.getHours()).padStart(2, '0')
  const fen_zhong = String(shi_jian.getMinutes()).padStart(2, '0')
  return `${xiao_shi}:${fen_zhong}`
}
