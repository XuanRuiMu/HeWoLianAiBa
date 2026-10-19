import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { shengChengJiaoSe } from '../src/services/角色生成'
import { gouJianWriterPrompt } from '../src/services/Prompt构建器'
import type { MBTILeiXing } from '../src/config/角色配置'
import type { DuiHuaLiShiXiang } from '../src/types'

const 根目录 = 'D:/xuanr/Desktop/玄锐暮工作区/和我恋爱吧/语料实验室'
const QUAN_BU_MBTI: MBTILeiXing[] = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']
const JIE_DUAN_FEN: Record<string, number> = { lengDan: 40, shuYuan: 150, renShi: 250, shuXi: 350, pengYou: 450, haoYou: 550, aiMei: 650, xinDong: 750, reLian: 850, shenAi: 950 }
function 前文阶段分(n: number): number { if (n >= 8) return 450; if (n >= 5) return 400; if (n >= 3) return 350; if (n >= 1) return 250; return 150 }
function 反射阶段(分: number): string { let 最 = 'lengDan'; for (const [名, f] of Object.entries(JIE_DUAN_FEN)) if (分 >= f) 最 = 名; return 最 }

interface 探针 { 探针号: string; 探针类: string; 前文: string[]; 触发输入: string; 真人回复: string }

const 探针集名 = (process.env.ZS_PROBES || '探针集_v2').trim()
const 探针 = readFileSync(join(根目录, '判据集', 探针集名 + '.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as 探针)
const 起始 = Number(process.argv[2] || '0')
const 条数 = Number(process.argv[3] || '3')
const 出 = join(根目录, '工作区', process.env.ZS_KUAIZHAO || 'prompt快照')
mkdirSync(出, { recursive: true })

for (const p of 探针.slice(起始, 起始 + 条数)) {
  const i = 探针.indexOf(p)
  const 型 = QUAN_BU_MBTI[i % 16]
  const jiaoSe = shengChengJiaoSe({ yong_hu_id: 'yu-liao', mbti_lei_xing: 型, xing_bie: i % 2 === 0 ? 'nv' : 'nan' } as never)
  const 阶段分 = 前文阶段分(p.前文.length)
  const 历史: DuiHuaLiShiXiang[] = p.前文.map((h, k) => ({
    fa_song_zhe_lei_xing: h.startsWith('甲: ') ? 'yonghu' : 'jiaose',
    fa_song_zhe_ming: h.startsWith('甲: ') ? '对方' : '微信名',
    nei_rong: h.replace(/^[甲乙]: /, ''),
    shi_jian: '21:' + String(Math.min(59, 10 + k * 2)).padStart(2, '0'),
  }) as DuiHuaLiShiXiang)
  const shuRu = {
    yong_hu_id: 'yu-liao', jiao_se_id: 'ab-x-' + p.探针号, jiao_se: jiaoSe,
    hao_gan_du: { xin_ren_du: Math.round(阶段分 * 0.35), qin_mi_du: Math.round(阶段分 * 0.25), qu_wei_du: Math.round(阶段分 * 0.2), guan_huai_du: Math.round(阶段分 * 0.2), zong_fen: 阶段分, guan_xi_jie_duan: 反射阶段(阶段分) },
    dui_hua_li_shi: 历史, yong_hu_xin_xiao_xi: p.触发输入,
    shi_fou_di_yi_lun: 历史.length === 0, tu_pian_shou_quan: false, shi_jian_chang_jing: 'riChang',
  } as never
  const prompt = gouJianWriterPrompt(shuRu, { shi_fou_hui_fu: true, shi_jian_qing_xu: '正常' })
  writeFileSync(join(出, p.探针号 + '.txt'), prompt, 'utf8')
  console.log(p.探针号, 型, 反射阶段(阶段分), 'prompt', prompt.length, '字')
}
process.exit(0)