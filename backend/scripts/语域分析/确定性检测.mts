/**
 * 确定性检测：完全相同的输入连跑 N 次，看输出是否有差异。
 *
 * 动机（第十四轮收尾复读归因）：`别光顾着说我` 在 10 个亲密度档里逐字重复，
 * 而该短语**不在任何 prompt 文案里**，示例表收尾分布也分散（52% 无标点 / 12.5% 问号）。
 * 剩一个可能：**采样近乎确定性**。
 *
 * 机理：Writer 走思考模式（`AI配置.ts` writer.siKaoMoShi='enabled'）。
 *   —— 注：2026-10-07 起 writer 已切为 siKaoMoShi:'disabled' + wenDu 1.0，本脚本仅作历史机理记录。
 *   官方规则：**思考模式下 temperature 不生效**（跑了也不报错），
 *   `top_p` 生效但下限 0.95 ⇒ 实际是「近似贪心解码」。
 *   若成立 ⇒ 所有多轮实验里「稳定重复」的现象都是**解码产物**，不是风格特征。
 *
 * ⚠️ 这个实验同时能判定另一个悬案：PROGRESS §10 记着「思考模式开关的收益未重测」。
 */
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const gen = (w: string) => resolve(dirname(fileURLToPath(import.meta.url)), '../../../', w)
const require_ = createRequire(import.meta.url)
const HouXing = require_(gen('backend/dist/services/AI引擎.js'))
const JiaoSe = require_(gen('backend/dist/services/角色生成.js'))

const CI = Number(process.env.SHI_YAN_CI || '5')
const JIAN_GE = Number(process.env.SHI_YAN_JIAN_GE || '25000')
const deng = (d: number) => new Promise((r) => setTimeout(r, d))

const renShe = JiaoSe.shengChengJiaoSe({
  yong_hu_id: 'que-ding-xing-jian-ce', mbti_lei_xing: 'ESFP', xing_bie: 'nv',
})

function zhuang(fen: number) {
  return {
    xin_ren_du: Math.round(fen * 0.35), qin_mi_du: Math.round(fen * 0.25),
    qu_wei_du: Math.round(fen * 0.2), guan_huai_du: Math.round(fen * 0.2),
    zong_fen: fen, guan_xi_jie_duan: 'pengYou',
  }
}

async function pao(fen: number): Promise<string[]> {
  for (let ci = 0; ci < 4; ci++) {
    if (ci > 0) await deng(30000 * ci)
    try {
      const r = await HouXing.yunXingAIYinQing({
        yong_hu_id: 'que-ding-xing-jian-ce',
        jiao_se_id: renShe.id,
        jiao_se: renShe,
        hao_gan_du: zhuang(fen),
        dui_hua_li_shi: [{ fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '在吗', shi_jian: '20:31' }],
        yong_hu_xin_xiao_xi: '今天降温了你多穿点',
        shi_fou_di_yi_lun: false,
        shi_jian_chang_jing: '晚上八点半，各自在宿舍，都在刷手机',
        tu_pian_shou_quan: false,
      })
      return (r.xiao_xi_lie_biao as string[]) || []
    } catch { /* 重试 */ }
  }
  return []
}

for (const fen of [450, 850]) {
  console.log(`\n════════ 好感 ${fen}（${fen === 450 ? 'pengYou' : 'reLian'}）连跑 ${CI} 次 ════════`)
  const suoYou: string[][] = []
  for (let i = 0; i < CI; i++) {
    const xs = await pao(fen)
    suoYou.push(xs)
    console.log(`\n  [第${i + 1}次] ${xs.length} 条`)
    for (const m of xs) console.log(`    > ${m}`)
    if (i < CI - 1) await deng(JIAN_GE)
  }
  const quChong = suoYou.filter((xs) => JSON.stringify(xs) === JSON.stringify(suoYou[0])).length
  console.log(`\n  ⇒ ${CI} 次里有 ${quChong} 次与第 1 次**逐字相同**`)
}
console.log(`\n判定：全部相同 ⇒ 近似确定性解码，所有「稳定风格」都是解码产物。`)
console.log(`     有差异 ⇒ 复读来自风格/上下文，不是采样问题。`)