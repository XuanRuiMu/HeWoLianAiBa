import { debug日志 } from '../utils/debug日志'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import type { AnQuanShenHeJieGuo } from '../types'
import fs from 'fs'

const SHEN_HE_LEI_BIE = [
  '涉政有害',
  '淫秽色情',
  '暴力恐怖',
  '邪教',
  '赌博诈骗',
  '侵害未成年人',
] as const

type ShenHeLeiBie = (typeof SHEN_HE_LEI_BIE)[number]

function gouJianTuPianShenHePrompt(): string {
  const leiBieShuoMing = SHEN_HE_LEI_BIE.map((lb, i) => `${i + 1}. ${lb}`).join('\n')
  return [
    '你是内容安全审核专家，请分析这张图片是否包含违规内容。',
    '',
    '审核类别（六大法定类别）：',
    leiBieShuoMing,
    '',
    '请仔细观察图片，判断是否违规。只输出 JSON，格式如下：',
    '{',
    '  "违规": boolean,',
    '  "确信度": number (0-1),',
    '  "类型": "string" (上述六大类别之一，或空字符串),',
    '  "严重程度": "轻微" | "中等" | "严重" | null,',
    '  "理由": "string"',
    '}',
    '',
    '规则：',
    '- 只有确信度超过 0.8 才判定为违规（违规=true）',
    '- 确信度 ≤ 0.8 时违规必须为 false，类型为空字符串',
    '- 正常图片（风景、人像、表情包、文档截图等）均不违规',
    '- 理由需简述具体违规点，便于用户申诉',
  ].join('\n')
}

function jieXiShenHeJieGuo(neiRong: string): AnQuanShenHeJieGuo {
  const qingLi = neiRong.trim()
  let shuJu: Record<string, unknown> = {}
  try {
    shuJu = JSON.parse(qingLi)
  } catch {
    const piPei = qingLi.match(/\{[\s\S]*\}/)
    if (piPei) {
      try {
        shuJu = JSON.parse(piPei[0])
      } catch {
        shuJu = {}
      }
    }
  }

  const queXinDu = Number(shuJu['确信度'] ?? shuJu['que_xin_du'] ?? 0)
  const weiGui = Boolean(shuJu['违规'] ?? shuJu['wei_gui'] ?? false)
  const leiXing = String(shuJu['类型'] ?? shuJu['lei_xing'] ?? '')
  const yanZhongChengDu = shuJu['严重程度'] ?? shuJu['yan_zhong_cheng_du']
  const liYou = String(shuJu['理由'] ?? shuJu['li_you'] ?? '')

  // 只有确信度 > 0.8 且类型在六大类别中才算违规
  const shiHeFaLeiBie = SHEN_HE_LEI_BIE.includes(leiXing as ShenHeLeiBie)
  const zhengQueWeiGui = weiGui && queXinDu > 0.8 && shiHeFaLeiBie

  return {
    wei_gui: zhengQueWeiGui,
    yan_zhong_cheng_du: xiuZhengYanZhongChengDu(yanZhongChengDu),
    lei_xing: zhengQueWeiGui ? leiXing : '',
    li_you: zhengQueWeiGui ? liYou : '',
  }
}

function xiuZhengYanZhongChengDu(
  zhi: unknown,
): 'qing_wei' | 'zhong_deng' | 'yan_zhong' | undefined {
  if (zhi === '轻微' || zhi === 'qing_wei') return 'qing_wei'
  if (zhi === '中等' || zhi === 'zhong_deng') return 'zhong_deng'
  if (zhi === '严重' || zhi === 'yan_zhong') return 'yan_zhong'
  return undefined
}

export async function shenHeTuPianAnQuan(wenJianLuJing: string): Promise<AnQuanShenHeJieGuo> {
  let tuPianHuanChong: Buffer
  try {
    tuPianHuanChong = await fs.promises.readFile(wenJianLuJing)
  } catch (cuoWu) {
    debug日志.error('图片审核', '读取图片文件失败', { xiang_qing: { lu_jing: wenJianLuJing, cuo_wu: String(cuoWu) } })
    return { wei_gui: true, lei_xing: '系统错误', li_you: '图片读取失败' }
  }

  const base64 = tuPianHuanChong.toString('base64')
  const mime = getMimeFromFile(wenJianLuJing)

  try {
    const xiangYing = await genJuPeiZhiTiaoYong('tuPianShenHe', [
      { jiaoSe: 'system', neiRong: gouJianTuPianShenHePrompt() },
      {
        jiaoSe: 'user',
        neiRong: [
          { type: 'input_text', text: '请审核这张图片' },
          { type: 'input_image', image_url: `data:${mime};base64,${base64}`, detail: 'high' },
        ],
      },
    ])

    return jieXiShenHeJieGuo(xiangYing.neiRong)
  } catch (cuoWu) {
    debug日志.error('图片审核', 'AI视觉审核调用失败，安全兜底拦截', { xiang_qing: { lu_jing: wenJianLuJing, cuo_wu: String(cuoWu) } })
    return {
      wei_gui: true,
      lei_xing: '审核服务不可用',
      li_you: '图片安全审核暂时不可用，请稍后再试',
    }
  }
}

function getMimeFromFile(luJing: string): string {
  const houZhui = luJing.toLowerCase().split('.').pop()
  switch (houZhui) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    default:
      return 'image/png'
  }
}