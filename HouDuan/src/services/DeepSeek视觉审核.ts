import { createHash } from 'crypto'
import {
  SHEN_HE_FU_WU_BU_KE_YONG_JIAN,
  SHEN_HE_WEI_GUI_LEI_BIE,
  SHEN_HE_XI_TONG_CUO_WU_JIAN,
} from '../config/媒体配置'
import { debug日志 } from '../utils/debug日志'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { 数据库 } from '../数据库'
import type { AnQuanShenHeJieGuo } from '../types'
import fs from 'fs'

function gouJianTuPianShenHePrompt(): string {
  const leiBieShuoMing = SHEN_HE_WEI_GUI_LEI_BIE.map((lb, i) => `${i + 1}. ${lb}`).join('\n')
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
  const shiHeFaLeiBie = SHEN_HE_WEI_GUI_LEI_BIE.includes(leiXing)
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

/**
 * 本文件用到的结论缓存语句。导出是为了让真库测试原样执行同一串 SQL ——
 * 与 routes/表情.ts 的 BIAO_QING_YU_JU 同一口径，不存在「测试跑通、代码里是另一串」。
 */
export const SHEN_HE_JIE_LUN_YU_JU = {
  查结论: `SELECT "违规" AS wei_gui, "类别" AS lei_xing, "理由" AS li_you,
                  "严重程度" AS yan_zhong_cheng_du
             FROM "媒体审核结论" WHERE "SHA256" = $1`,
  写结论: `INSERT INTO "媒体审核结论" ("SHA256", "违规", "类别", "理由", "严重程度")
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT ("SHA256") DO NOTHING`,
} as const

/**
 * 按内容哈希取既有审核结论（029 / L-47）。
 * 查不到、表尚未建（容器未重建期间旧库无此表）、库不可达，一律返回 null 让调用方去真审 ——
 * 缓存是省外呼的手段，不是放行的理由，任何缓存侧故障都只能退化成「多审一次」。
 */
async function chaXunJieLunHuanCun(sha256: string): Promise<AnQuanShenHeJieGuo | null> {
  let jieGuo: { rows: Array<Record<string, unknown>> }
  try {
    jieGuo = await 数据库.query(SHEN_HE_JIE_LUN_YU_JU.查结论, [sha256])
  } catch (cuoWu) {
    debug日志.error('图片审核', '结论缓存查询失败，退回真实审核', {
      xiang_qing: { cuo_wu: String(cuoWu) },
    })
    return null
  }
  if (jieGuo.rows.length === 0) return null
  const hang = jieGuo.rows[0]
  const zhongDu = xiuZhengYanZhongChengDu(hang['yan_zhong_cheng_du'])
  return {
    wei_gui: Boolean(hang['wei_gui']),
    ...(zhongDu ? { yan_zhong_cheng_du: zhongDu } : {}),
    lei_xing: String(hang['lei_xing'] ?? ''),
    li_you: String(hang['li_you'] ?? ''),
  }
}

/** 只落模型真给出的判定；写失败顶多下次再审一次，不影响本次结论 */
async function xieRuJieLunHuanCun(sha256: string, jieLun: AnQuanShenHeJieGuo): Promise<void> {
  try {
    await 数据库.query(SHEN_HE_JIE_LUN_YU_JU.写结论, [
      sha256,
      jieLun.wei_gui,
      jieLun.lei_xing ?? '',
      jieLun.li_you ?? '',
      jieLun.yan_zhong_cheng_du ?? null,
    ])
  } catch (cuoWu) {
    debug日志.error('图片审核', '结论缓存写入失败，下次将重审', {
      xiang_qing: { cuo_wu: String(cuoWu) },
    })
  }
}

export async function shenHeTuPianAnQuan(wenJianLuJing: string): Promise<AnQuanShenHeJieGuo> {
  let tuPianHuanChong: Buffer
  try {
    tuPianHuanChong = await fs.promises.readFile(wenJianLuJing)
  } catch (cuoWu) {
    debug日志.error('图片审核', '读取图片文件失败', { xiang_qing: { lu_jing: wenJianLuJing, cuo_wu: String(cuoWu) } })
    return { wei_gui: true, lei_xing: SHEN_HE_XI_TONG_CUO_WU_JIAN, li_you: '图片读取失败' }
  }

  // 哈希由被审字节本地算出（不信调用方传参，否则一句假哈希就能把任意结论挂到任意内容上）
  const neiRongHaXi = createHash('sha256').update(tuPianHuanChong).digest('hex')
  const mingZhong = await chaXunJieLunHuanCun(neiRongHaXi)
  if (mingZhong) return mingZhong

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

    const jieLun = jieXiShenHeJieGuo(xiangYing.neiRong)
    await xieRuJieLunHuanCun(neiRongHaXi, jieLun)
    return jieLun
  } catch (cuoWu) {
    debug日志.error('图片审核', 'AI视觉审核调用失败，安全兜底拦截', { xiang_qing: { lu_jing: wenJianLuJing, cuo_wu: String(cuoWu) } })
    // 兜底不是审核结论，绝不写缓存：一次服务故障不能把某张图永久钉成违规
    return {
      wei_gui: true,
      lei_xing: SHEN_HE_FU_WU_BU_KE_YONG_JIAN,
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