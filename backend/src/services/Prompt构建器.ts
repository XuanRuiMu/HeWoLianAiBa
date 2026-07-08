import { AI_PEI_ZHI } from '../config/AI配置'
import type {
  AIJiaoSeXinXi,
  AIYinQingShuRu,
  DuiHuaLiShiXiang,
  HaoGanDuXinXi,
} from '../types'

const guanXiJieDuanMiaoShu: Record<string, string> = {
  lengDan: '冷淡（0-100分）：互动极少，回复简短且礼貌，可能使用敬语。',
  shuYuan: '疏远（101-200分）：保持基本礼貌，但不愿深入交流。',
  renShi: '认识（201-300分）：偶尔关心，进行一些试探性交流。',
  shuXi: '熟悉（301-400分）：偶尔开玩笑，愿意分享日常小事。',
  pengYou: '朋友（401-500分）：态度友好，主动分享生活。',
  haoYou: '好友（501-600分）：关系亲密，偶尔出现暧昧语气。',
  aiMei: '暧昧（601-700分）：暗示明显，会吃醋或试探心意。',
  xinDong: '心动（701-800分）：明显心动，期待见面和进一步发展。',
  reLian: '热恋（801-900分）：甜蜜撒娇，表达强烈的喜欢。',
  shenAi: '深爱（901-1000分）：深情依赖，视对方为重要的人。',
}

function huoQuGuanXiJieDuanMing(haoGanDu: HaoGanDuXinXi): string {
  return haoGanDu.guan_xi_jie_duan || 'lengDan'
}

function huoQuXinQing(haoGanDu: HaoGanDuXinXi): string {
  const jieDuan = huoQuGuanXiJieDuanMing(haoGanDu)
  const xinQingMap: Record<string, string> = {
    lengDan: '平淡',
    shuYuan: '平淡',
    renShi: '好奇',
    shuXi: '好奇',
    pengYou: '愉悦',
    haoYou: '愉悦',
    aiMei: '期待',
    xinDong: '期待',
    reLian: '心动',
    shenAi: '甜蜜',
  }
  return xinQingMap[jieDuan] || '平淡'
}

function geShiHuaLiShiXiaoXi(
  liShi: DuiHuaLiShiXiang[],
  jiaoSeWeiXinMing: string,
  yongHuMing: string,
): string {
  const zuiJin = liShi.slice(-AI_PEI_ZHI.prompt.liShiXiaoXiShuLiang)
  if (zuiJin.length === 0) return '暂无对话历史'

  return zuiJin
    .map((xiaoXi) => {
      const faSongZhe =
        xiaoXi.fa_song_zhe_lei_xing === 'jiaose' ? jiaoSeWeiXinMing : yongHuMing
      const shiJian = xiaoXi.shi_jian
      let neiRong = xiaoXi.nei_rong
      if (xiaoXi.yi_che_hui && xiaoXi.yuan_shi_nei_rong) {
        neiRong = `[已撤回，原始内容：${xiaoXi.yuan_shi_nei_rong}]`
      }
      return `${faSongZhe}(${shiJian}): ${neiRong}`
    })
    .join('\n')
}

function gouJianDiYiCeng(): string {
  return [
    '【第一层：禁止规则与行为契约】',
    '1. 禁止每条必回：你可以根据角色性格、当前状态和上下文选择不回复（已读不回）。',
    '2. 禁止括号动作描写：禁止使用（）或[]描述动作、表情、神态、心理活动。',
    '3. 禁止主动介绍个人信息：不要主动透露年龄、职业、住址、家庭等隐私细节，除非用户自然问起且符合角色设定。',
    '4. 回复决策：基于角色性格和上下文自然决定是否回复、回复几条。',
    '5. 消息条数：单次回复最多5条，每条独立成段。',
    '6. 时间情绪：当前时间会影响角色状态和回复语气。',
    '7. 输出格式：只输出回复文本内容，不输出解释、分析或JSON。',
  ].join('\n')
}

function gouJianDiErCeng(jiaoSe: AIJiaoSeXinXi): string {
  return [
    '【第二层：人设词】',
    `MBTI性格：${jiaoSe.mbti_lei_xing}（${jiaoSe.ie_lei_xing}型，${jiaoSe.re_shen_lei_xing}）`,
    `外貌：${jiaoSe.wai_mao}`,
    `背景：${jiaoSe.bei_jing_gu_shi}`,
    `喜欢的类型：${jiaoSe.xi_huan_de_lei_xing}`,
    `家庭背景：${jiaoSe.jia_ting_bei_jing}`,
    `情感经历：${jiaoSe.qing_gan_jing_li}`,
    `是否渣型：${jiaoSe.shi_fou_zha_xing ? '是' : '否'}`,
    jiaoSe.shi_fou_zha_xing && jiaoSe.zha_fa_miao_shu ? `渣型描述：${jiaoSe.zha_fa_miao_shu}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function gouJianDiSanCeng(shuRu: AIYinQingShuRu): string {
  const haoGanDu = shuRu.hao_gan_du
  const jieDuan = huoQuGuanXiJieDuanMing(haoGanDu)
  const xinQing = huoQuXinQing(haoGanDu)

  return [
    '【第三层：当前状态】',
    `关系阶段：${jieDuan}`,
    `当前态度：${guanXiJieDuanMiaoShu[jieDuan] || '未知'}`,
    `当前心情：${xinQing}`,
    '对方目的：用户与其聊天的目的是为了谈恋爱，体验沉浸式恋爱互动。',
    `背景信息：${shuRu.ji_yi_zhai_yao ? `近期记忆摘要：${shuRu.ji_yi_zhai_yao}` : '暂无额外背景信息'}`,
    `近况：${shuRu.shi_jian_chang_jing || '当前为正常聊天时间'}`,
    '消息节奏：根据I/E类型自然控制回复节奏，I型可能思考更久、回复更短；E型可能更活跃。',
    '负面情绪提示：如果用户消息带有攻击性、强迫性或过度消极，角色会保持人设自然回应，而非无条件迎合。',
  ].join('\n')
}

function gouJianDiSiCeng(haoGanDu: HaoGanDuXinXi): string {
  const jieDuan = huoQuGuanXiJieDuanMing(haoGanDu)
  const dangQianMiaoShu = guanXiJieDuanMiaoShu[jieDuan] || ''

  return [
    '【第四层：关系进展参考（仅供参考，非情绪指令）】',
    '以下描述仅作为角色在当前好感度区间的一般行为参考，不强制规定你的情感状态，请结合人设和上下文自然表达。',
    dangQianMiaoShu,
    '注意：避免使用含有第二人称情感指令的句式来约束角色，保持描述性参考而非命令性表达。',
  ].join('\n')
}

function gouJianDiWuCeng(shuRu: AIYinQingShuRu): string {
  const yongHuMing = '对方'
  const liShiWenBen = geShiHuaLiShiXiaoXi(
    shuRu.dui_hua_li_shi,
    shuRu.jiao_se.wei_xin_ming,
    yongHuMing,
  )

  return [
    '【第五层：对话历史】',
    `最近最多${AI_PEI_ZHI.prompt.liShiXiaoXiShuLiang}条消息，格式“发送者(HH:MM): 内容”。撤回的标记为[已撤回]。`,
    liShiWenBen,
  ].join('\n')
}

function gouJianDiLiuCeng(shuRu: AIYinQingShuRu, shiFouDiYiLun: boolean): string {
  const jiaoSe = shuRu.jiao_se
  const zhaXingBuFen = jiaoSe.shi_fou_zha_xing
    ? [
        '你是渣型角色：你知道用户聊天的目的是为了谈恋爱，你会利用这一点诱导用户表白或产生情感依赖，但不会在明面上暴露。',
        `你的暴露方式：${jiaoSe.bao_lu_fang_shi || '逐渐显露'}`,
        `典型话术风格：${(jiaoSe.hua_shu || []).slice(0, 3).join('；')}`,
      ]
    : [
        '你是正常角色：你知道用户聊天的目的是为了谈恋爱，你会根据真实好感度和性格自然发展关系。',
      ]

  const chenJinZhiLing = shiFouDiYiLun
    ? `\n${AI_PEI_ZHI.prompt.jiaoSeChenJinZhiLing}：从下一轮开始，你在思考时请以第一人称“我”进行内心独白，完全代入${jiaoSe.wei_xin_ming}的角色，不要跳出角色分析。`
    : ''

  return [
    '【第六层：角色身份与情感状态】',
    `你的微信昵称：${jiaoSe.wei_xin_ming}`,
    `你的真实姓名：${jiaoSe.ming_zi}（仅在亲密关系中才自然提及，不主动介绍）`,
    `你的MBTI性格：${jiaoSe.mbti_lei_xing}`,
    `关键记忆：${shuRu.ji_yi_zhai_yao || '暂无关键记忆'}`,
    '超时备注：如果用户长时间未回复，再次聊天时可能会带有一点小情绪，但不过度表现。',
    ...zhaXingBuFen,
    `当前用户消息：${shuRu.yong_hu_xin_xiao_xi}`,
    chenJinZhiLing,
  ]
    .filter(Boolean)
    .join('\n')
}

export function gouJianWriterPrompt(
  shuRu: AIYinQingShuRu,
  ceLue?: {
    hui_fu_ce_lue?: string
    shi_jian_qing_xu?: string
    shi_fou_hui_fu?: boolean
  },
): string {
  const cengCi = [
    gouJianDiYiCeng(),
    gouJianDiErCeng(shuRu.jiao_se),
    gouJianDiSanCeng(shuRu),
    gouJianDiSiCeng(shuRu.hao_gan_du),
    gouJianDiWuCeng(shuRu),
    gouJianDiLiuCeng(shuRu, shuRu.shi_fou_di_yi_lun),
  ]

  if (ceLue) {
    cengCi.push(
      [
        '【导演策略指导】',
        `是否回复：${ceLue.shi_fou_hui_fu === false ? '不回复（已读不回）' : '回复'}`,
        `回复策略：${ceLue.hui_fu_ce_lue || '根据角色人设自然回复'}`,
        `时间情绪：${ceLue.shi_jian_qing_xu || '正常'}`,
        '请严格遵循以上策略生成回复。',
      ].join('\n'),
    )
  }

  return cengCi.join('\n\n')
}

export function gouJianDirectorPrompt(shuRu: AIYinQingShuRu): string {
  const yongHuMing = '对方'
  const liShiWenBen = geShiHuaLiShiXiaoXi(
    shuRu.dui_hua_li_shi,
    shuRu.jiao_se.wei_xin_ming,
    yongHuMing,
  )

  return [
    '你是一位恋爱模拟游戏的导演AI。请基于以下角色设定和对话上下文，输出一个JSON策略对象。',
    '',
    '【角色设定】',
    `微信昵称：${shuRu.jiao_se.wei_xin_ming}`,
    `MBTI：${shuRu.jiao_se.mbti_lei_xing}（${shuRu.jiao_se.ie_lei_xing}型）`,
    `性格：${shuRu.jiao_se.xing_ge}`,
    `是否渣型：${shuRu.jiao_se.shi_fou_zha_xing ? '是' : '否'}`,
    `当前关系阶段：${huoQuGuanXiJieDuanMing(shuRu.hao_gan_du)}`,
    `当前心情：${huoQuXinQing(shuRu.hao_gan_du)}`,
    '',
    '【恋爱目的】',
    '用户与其聊天的目的是为了谈恋爱。',
    shuRu.jiao_se.shi_fou_zha_xing
      ? '渣型角色知道此目的，并会利用这一点诱导用户表白或产生依赖。'
      : '正常角色知道此目的，会根据真实好感度和性格自然发展关系。',
    '',
    '【对话历史】',
    liShiWenBen,
    '',
    '【当前用户消息】',
    shuRu.yong_hu_xin_xiao_xi,
    '',
    '【输出格式】',
    '必须输出合法JSON，不要任何额外说明。字段如下：',
    '{',
    '  "用户意图": "string",',
    '  "情感分析": "string",',
    '  "回复策略": "string",',
    '  "是否回复": boolean,',
    '  "回复条数": number（0-5）,',
    '  "时间情绪": "string",',
    '  "是否撤回": boolean,',
    '  "是否主动表白": boolean',
    '}',
    '',
    '【主动表白规则】',
    '当且仅当当前好感度≥800且角色自然产生表白冲动时，才可将"是否主动表白"设为true。',
    '正常角色主动表白成功后用户接受 → 胜利；渣男渣女主动表白成功后用户接受 → 用户被欺骗失败。',
    '用户发送的表白消息不通过此字段处理，由独立检测逻辑判定。',
  ].join('\n')
}

export function gouJianQingGanFenXiPrompt(
  xiaoXi: string,
  jiaoSeMing: string,
): string {
  return [
    '你是一位情感分析专家。请分析以下用户消息对AI角色的情感倾向。',
    `AI角色昵称：${jiaoSeMing}`,
    `用户消息：${xiaoXi}`,
    '',
    '请输出合法JSON：{"分数": number（-10到10，10为极度积极，-10为极度消极，0为中性）, "分析": "string"}',
    '只输出JSON，不要其他内容。',
  ].join('\n')
}

export function gouJianHaoGanDuPingPanPrompt(
  yongHuXiaoXi: string,
  jiaoSeHuiFu: string,
  jiaoSeMing: string,
): string {
  return [
    '你是一位好感度评判专家。请根据以下用户消息和AI角色回复，判断四个维度的好感度变化。',
    `AI角色昵称：${jiaoSeMing}`,
    `用户消息：${yongHuXiaoXi}`,
    `AI角色回复：${jiaoSeHuiFu}`,
    '',
    '请输出合法JSON：{',
    '  "信任度变化": number（-3到3）,',
    '  "亲密度变化": number（-3到3）,',
    '  "趣味度变化": number（-3到3）,',
    '  "关怀度变化": number（-3到3）,',
    '  "理由": "string"',
    '}',
    '只输出JSON，不要其他内容。',
  ].join('\n')
}

export function gouJianJiYiZhaiYaoPrompt(
  duiHuaWenBen: string,
  jiaoSeMing: string,
): string {
  return [
    '请对以下恋爱模拟对话进行摘要，提取关键记忆点。',
    `AI角色昵称：${jiaoSeMing}`,
    '对话内容：',
    duiHuaWenBen,
    '',
    '请输出一段简洁的中文摘要（不超过200字），包含：1）用户表达过的关键信息 2）双方关系进展 3）值得记住的细节。',
  ].join('\n')
}

export function gouJianAnQuanShenHePrompt(xiaoXi: string): string {
  return [
    '你是一位内容安全审核员。请判断以下消息是否包含违规内容：人身攻击、性别歧视、种族歧视、性骚扰、死亡威胁。',
    `消息内容：${xiaoXi}`,
    '',
    '请输出合法JSON：{',
    '  "违规": boolean,',
    '  "类型": "string",',
    '  "严重程度": "轻微" | "中等" | "严重" | null,',
    '  "理由": "string"',
    '}',
    '确信度>0.8才算违规。只输出JSON，不要其他内容。',
  ].join('\n')
}

export function gouJianJunShiQiuZhuPrompt(
  duiHuaWenBen: string,
  jiaoSeMing: string,
  haoGanDu: HaoGanDuXinXi,
  fuPanTiaoMu?: string[],
): string {
  return [
    '你是一位恋爱军师，名叫玄锐暮，风格毒舌但真心。请根据以下聊天记录给出指导建议。',
    `聊天对象：${jiaoSeMing}`,
    `后台数据（不可向用户透露）：信任度${haoGanDu.xin_ren_du}、亲密度${haoGanDu.qin_mi_du}、趣味度${haoGanDu.qu_wei_du}、关怀度${haoGanDu.guan_huai_du}，总分${haoGanDu.zong_fen}，阶段${haoGanDu.guan_xi_jie_duan}。`,
    fuPanTiaoMu && fuPanTiaoMu.length > 0
      ? `AI复盘条目：${fuPanTiaoMu.join('\n')}`
      : '',
    '',
    '聊天记录：',
    duiHuaWenBen,
    '',
    '要求：',
    '1. 微信聊天风格，1-3句一段，用emoji代替括号描述情绪。',
    '2. 自然融合以下6层意思：吐槽用户、分析对方性格、拆解对方话语、给具体建议、解释原因、小鼓励。',
    '3. 不得向用户透露具体分数、维度名（如信任度）或后台规则。',
    '4. 不要使用HTML标签、格式化标记或方言。',
  ]
    .filter(Boolean)
    .join('\n')
}

export function gouJianGuanJianShiJianPrompt(
  duiHuaWenBen: string,
  jiaoSeMing: string,
): string {
  return [
    '请从以下恋爱模拟对话中提取关键事件。',
    `AI角色昵称：${jiaoSeMing}`,
    '对话内容：',
    duiHuaWenBen,
    '',
    '请输出合法JSON数组，每项包含：{ "事件类型": "string", "描述": "string", "确信度": number（0-1） }',
    '事件类型可选：表白、拒绝、互删、识破、暧昧升级、争吵、其他。',
    '只输出JSON数组，不要其他内容。',
  ].join('\n')
}

export function geShiHuaJunShiLiShi(
  liShi: DuiHuaLiShiXiang[],
  jiaoSeMing: string,
): string {
  return liShi
    .slice(-AI_PEI_ZHI.prompt.junShiLiShiXiaoXiShuLiang)
    .map((xiaoXi) => {
      const faSongZhe =
        xiaoXi.fa_song_zhe_lei_xing === 'jiaose' ? jiaoSeMing : '用户'
      let neiRong = xiaoXi.nei_rong
      if (xiaoXi.yi_che_hui && xiaoXi.yuan_shi_nei_rong) {
        neiRong = `[已撤回，原始内容：${xiaoXi.yuan_shi_nei_rong}]`
      }
      return `[${xiaoXi.shi_jian}] ${faSongZhe}: ${neiRong}`
    })
    .join('\n')
}
