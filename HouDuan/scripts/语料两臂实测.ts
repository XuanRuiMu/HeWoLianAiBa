/**
 * 语料实验室：三臂对照实测（2026-10-19 重做）。
 *
 * 臂（同一批探针、同一人设、同一阶段，唯一差异是 prompt 组装）：
 *   对照 —— 生产 prompt 原样（风格示例层在生产是关闭的）
 *   示例 —— 生产 prompt + 在「人设之后、历史之前」插入真私聊聊天示例块
 *   瘦身 —— 示例块 + 去掉第一层【你现在的状态】/第三层/第四层/镜像提示，只留人设+历史+示例+本轮消息
 *
 * 外呼统一走 scripts/直连适配器.ts，prompt 与参数取生产同一份代码。
 * 只跑写手：导演只决定回不回与情绪，与本次考察的接话形态无关；去掉它两臂差异才唯一归因到 prompt。
 * 轮转调度：按 探针 × 臂 轮转，任一时点三臂样本数均衡，便于中途按需停止。
 *
 * 用法：
 *   node -r ts-node/register/transpile-only scripts/语料两臂实测.ts <起始> <条数> [臂,臂,臂]
 * 环境：
 *   ZS_ZENG_QIAN  示例块文件路径
 *   ZS_PROBES     探针集名（默认 探针集_v2）
 *   ZS_OUT        记录目录（默认 实测）
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { shengChengJiaoSe } from '../src/services/角色生成'
import { gouJianWriterPrompt } from '../src/services/Prompt构建器'
import { gouJianJiaoSeShangXiaWen } from '../src/config/AI参数策略'
import { shiXueShengShenFen } from '../src/config/角色配置'
import { 生成写手回复 } from './直连适配器'
import {
  chouYuTai, gouJianYuTaiKuai, panChuFaLei, quZaiMangWeiShuo, shengChengZaiMang,
} from '../../语料实验室/工作区/语态控制器'
import type { MBTILeiXing } from '../src/config/角色配置'
import type { DuiHuaLiShiXiang } from '../src/types'

const 根目录 = 'D:/xuanr/Desktop/玄锐暮工作区/和我恋爱吧/语料实验室'
const 探针文件 = join(根目录, '判据集', (process.env.ZS_PROBES || '探针集_v2').trim() + '.jsonl')
const 记录目录 = join(根目录, (process.env.ZS_OUT || '实测').trim())
mkdirSync(记录目录, { recursive: true })
const 示例文件 = (process.env.ZS_ZENG_QIAN || '').trim()
const 示例块 = 示例文件 && existsSync(示例文件) ? readFileSync(示例文件, 'utf8').trim() : ''
const 检索文件 = join(根目录, '工作区', (process.env.ZS_JIAN_SUO || '检索示例').trim() + '.json')
const 检索库: Record<string, Array<{ 甲: string; 乙: string }>> =
  existsSync(检索文件) ? JSON.parse(readFileSync(检索文件, 'utf8')) : {}
const 检索条数 = Number(process.env.ZS_JIAN_SUO_TIAO || '50')

/** 检索臂：按字 bigram 相似度取最相近的真实对话当 many-shot 示例。 */
function 检索块(探针号: string): string {
  const 例 = (检索库[探针号] || []).slice(0, 检索条数)
  if (!例.length) return ''
  return '【真人在类似处境里是这么聊的】\n' + 例.map((x) => '甲: ' + x.甲 + '\n乙: ' + x.乙).join('\n')
}

const QUAN_BU_MBTI: MBTILeiXing[] = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP',
]
const JIE_DUAN_FEN: Record<string, number> = {
  lengDan: 40, shuYuan: 150, renShi: 250, shuXi: 350, pengYou: 450,
  haoYou: 550, aiMei: 650, xinDong: 750, reLian: 850, shenAi: 950,
}
function 前文阶段分(n: number): number {
  if (n >= 8) return 450
  if (n >= 5) return 400
  if (n >= 3) return 350
  if (n >= 1) return 250
  return 150
}
function 反射阶段(分: number): string {
  let 最 = 'lengDan'
  for (const [名, f] of Object.entries(JIE_DUAN_FEN)) if (分 >= f) 最 = 名
  return 最
}

/** 在「人设之后、历史之前」插入示例块——与生产风格示例层的位置一致。 */
function 插示例(prompt: string): string {
  if (!示例块) return prompt
  const 标 = '【刚才聊了什么】'
  const i = prompt.indexOf(标)
  if (i < 0) return 示例块 + '\n\n' + prompt
  return prompt.slice(0, i) + 示例块 + '\n\n' + prompt.slice(i)
}

const 要删的头 = ['【你现在的状态】', '【现在的你和这段关系】', '【关系参考，不是束缚】', '【对方近期说话特点】']
/** 瘦身臂：把「规则墙」整层拿掉，只留人设/历史/示例/本轮消息。 */
function 瘦身(prompt: string): string {
  return prompt
    .split('\n\n')
    .filter((块) => !要删的头.some((h) => 块.startsWith(h)))
    .join('\n\n')
}

interface 探针 {
  探针号: string; 探针类: string; 前文: string[]; 触发输入: string; 真人回复: string
}

async function 跑一条(臂: string, p: 探针, 下标: number) {
  const 型 = QUAN_BU_MBTI[下标 % 16]
  const jiaoSe = shengChengJiaoSe({
    yong_hu_id: 'yu-liao', mbti_lei_xing: 型, xing_bie: 下标 % 2 === 0 ? 'nv' : 'nan',
  } as never)
  const 阶段分 = 前文阶段分(p.前文.length)
  const 阶段 = 反射阶段(阶段分)
  const 历史: DuiHuaLiShiXiang[] = p.前文.map((h, k) => {
    const 是甲 = h.startsWith('甲: ')
    return {
      fa_song_zhe_lei_xing: 是甲 ? 'yonghu' : 'jiaose',
      fa_song_zhe_ming: 是甲 ? '对方' : '微信名',
      nei_rong: h.replace(/^[甲乙]: /, ''),
      shi_jian: '21:' + String(Math.min(59, 10 + k * 2)).padStart(2, '0'),
    } as DuiHuaLiShiXiang
  })
  const shuRu = {
    yong_hu_id: 'yu-liao', jiao_se_id: 'ab-' + 臂 + '-' + p.探针号, jiao_se: jiaoSe,
    hao_gan_du: {
      xin_ren_du: Math.round(阶段分 * 0.35), qin_mi_du: Math.round(阶段分 * 0.25),
      qu_wei_du: Math.round(阶段分 * 0.2), guan_huai_du: Math.round(阶段分 * 0.2),
      zong_fen: 阶段分, guan_xi_jie_duan: 阶段,
    },
    dui_hua_li_shi: 历史, yong_hu_xin_xiao_xi: p.触发输入,
    shi_fou_di_yi_lun: 历史.length === 0, tu_pian_shou_quan: false, shi_jian_chang_jing: 'riChang',
  } as never

  const 策略 = { shi_fou_hui_fu: true, shi_jian_qing_xu: '正常' }
  const 语态 = chouYuTai(p.触发输入)
  const 全部待办 = shengChengZaiMang(shiXueShengShenFen(jiaoSe.shen_fen))
  const 已说过 = (历史 as DuiHuaLiShiXiang[]).filter((t) => t.fa_song_zhe_lei_xing === 'jiaose').map((t) => t.nei_rong)
  const 在忙 = quZaiMangWeiShuo(全部待办, 已说过)
  let 终prompt: string
  if (臂.startsWith('变体')) {
    const 快照根 = (process.env.ZS_KUAIZHAO || 'prompt快照').trim()
    const 快照 = join(根目录, '工作区', 快照根, 臂, p.探针号 + '.txt')
    if (!existsSync(快照)) throw new Error('缺 prompt 快照：' + 快照)
    终prompt = readFileSync(快照, 'utf8')
  } else {
    const 原prompt = gouJianWriterPrompt(shuRu, 策略)
    终prompt = 臂 === '对照' ? 原prompt : 插示例(原prompt)
    if (臂 === '语态') 终prompt = 原prompt + '\n\n' + gouJianYuTaiKuai(语态, 在忙)
    if (臂 === '语态关') 终prompt = 原prompt + '\n\n' + gouJianYuTaiKuai(语态, 在忙).split('【这一轮你就这样回】')[0]
    if (臂 === '瘦身') 终prompt = 瘦身(终prompt)
    if (臂 === '检索') {
      const 块 = 检索块(p.探针号)
      const 标 = '【刚才聊了什么】'
      const i = 终prompt.indexOf(标)
      终prompt = i < 0 ? 终prompt : 终prompt.slice(0, i) + 块 + '\n\n' + 终prompt.slice(i)
    }
  }

  const t0 = Date.now()
  let 报错: string | null = null
  let 输出: string[] = []
  try {
    输出 = await 生成写手回复(shuRu, 策略, 终prompt, { jiaoSe: gouJianJiaoSeShangXiaWen(jiaoSe) } as never)
    if (!输出.length) 报错 = 'EMPTY'
  } catch (e) {
    报错 = String(e).slice(0, 200)
  }
  const 世界 = (jiaoSe.shi_jie_xin_xi || {}) as Record<string, unknown>
  const 文本 = (k: string) => (typeof 世界[k] === 'string' ? String(世界[k]) : '')
  const 人设 = {
    真名: jiaoSe.ming_zi, 微信名: jiaoSe.wei_xin_ming, 性别: jiaoSe.xing_bie,
    年龄: jiaoSe.nian_ling, 身份: jiaoSe.shen_fen || '', 城市: 文本('cheng_shi'),
    专业职业: 文本('zhi_ye'), 年级: 文本('nian_ji'), 学校: 文本('xue_xiao'),
    作息: 文本('zuo_xi_gui_lv'), 爱好: (jiaoSe.xi_hao || []).join('、'),
    家庭人数: 世界.jia_ting_ren_shu,
    家庭: jiaoSe.jia_ting_bei_jing, 感情: jiaoSe.qing_gan_jing_li, 背景: jiaoSe.bei_jing_gu_shi,
    近期在忙: 在忙.join('、'),
  }
  return {
    臂, 探针号: p.探针号, 触发类: p.探针类, 触发归组: panChuFaLei(p.触发输入), 语态, 人设型: 型, 阶段, 前文条数: p.前文.length, 人设,
    触发: p.触发输入, 真人回复: p.真人回复, AI输出: 输出, AI合并: 输出.join(' / '),
    prompt长度: 终prompt.length, 毫秒: Date.now() - t0, 报错,
  }
}

async function 主() {
  const 起始 = Number(process.argv[2] || '0')
  const 条数 = Number(process.argv[3] || '40')
  const 臂列 = (process.argv[4] || '对照,示例,瘦身').split(',').map((s) => s.trim()).filter(Boolean)
  const 探针 = readFileSync(探针文件, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as 探针)
  const 计划 = 探针.slice(起始, 起始 + 条数)

  const 累计: Record<string, string[]> = {}
  const 已测: Record<string, Set<string>> = {}
  for (const 臂 of 臂列) {
    const f = join(记录目录, 臂 + '.jsonl')
    累计[臂] = existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean) : []
    已测[臂] = new Set(累计[臂].map((l) => {
      try { return String((JSON.parse(l) as Record<string, unknown>).探针号 || '') } catch { return '' }
    }))
  }

  const 任务: Array<{ 臂: string; p: 探针; i: number }> = []
  for (const p of 计划) for (const 臂 of 臂列) if (!已测[臂].has(p.探针号)) 任务.push({ 臂, p, i: 探针.indexOf(p) })

  console.log('探针 ' + 起始 + '..' + (起始 + 条数 - 1) + '，臂 [' + 臂列.join(',') + ']，待跑 ' + 任务.length +
    '，示例块 ' + (示例块 ? 示例块.length + ' 字' : '无'))

  let n = 0
  for (const t of 任务) {
    n += 1
    const r = await 跑一条(t.臂, t.p, t.i)
    const f = join(记录目录, t.臂 + '.jsonl')
    累计[t.臂].push(JSON.stringify(r))
    writeFileSync(f, 累计[t.臂].join('\n') + '\n', 'utf8')
    console.log('[' + n + '/' + 任务.length + '] ' + t.臂 + ' ' + r.探针号 + ' ' + r.人设型 + '/' + r.阶段 +
      ' ' + (r.毫秒 / 1000).toFixed(1) + 's | 真人: ' + r.真人回复.replace(/\n/g, '/').slice(0, 24) +
      ' | AI: ' + (r.AI合并.slice(0, 44) || '无') + (r.报错 ? ' [警告]' + r.报错.slice(0, 40) : ''))
  }
  console.log('记录写入 ' + 记录目录)
  process.exit(0)
}

void 主().catch((e) => { console.error('实测失败:', e); process.exit(1) })