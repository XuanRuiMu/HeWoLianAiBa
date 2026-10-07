/**
 * 亲密度阶梯实验：固定性格，改好感度，看恋爱意识是否随关系阶段显现。
 *
 * 验收标准（用户 2026-10-03 定稿第二条）：
 *   「AI 在特定性格、人设画像、**亲密度**的情况下，能说出和真人一模一样的话」
 *   ⇒ 必须验证**亲密度**这一维。之前 15 轮只测了生产初始档（300–500），
 *      从未测过热恋档，看不到关系阶段对语言的影响。
 *
 * 方法：同一人设、同一人跑一遍完整关系阶段（用生产映射的 10 档），
 *   固定同一个用户输入，直读各档输出差异。
 *
 * ⚠️ 只打印原文 + Director 情绪，不判定好坏。
 */
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const gen = (w: string) => resolve(dirname(fileURLToPath(import.meta.url)), '../../../', w)
const require_ = createRequire(import.meta.url)
const HouXing = require_(gen('backend/dist/services/AI引擎.js'))
const JiaoSe = require_(gen('backend/dist/services/角色生成.js'))

const XING = (process.env.SHI_YAN_XING || 'ESFP,ENFJ').split(',')
const JIAN_GE = Number(process.env.SHI_YAN_JIAN_GE || '45000')
const deng = (d: number) => new Promise((r) => setTimeout(r, d))

/** 生产 `角色生成.ts::huoQuGuanXiJieDuan` 的 10 档映射 */
const JIE_DUAN = [
  { fen: 50, ming: 'lengDan' }, { fen: 150, ming: 'shuYuan' }, { fen: 250, ming: 'renShi' },
  { fen: 350, ming: 'shuXi' }, { fen: 450, ming: 'pengYou' }, { fen: 550, ming: 'haoYou' },
  { fen: 650, ming: 'aiMei' }, { fen: 750, ming: 'xinDong' }, { fen: 850, ming: 'reLian' },
  { fen: 950, ming: 'shenAi' },
]

/** 用户输入固定 —— 要看的是**关系阶段**带来的差异，不是话题差异 */
const WEN = '今天降温了你多穿点'

const suoYou: Array<Record<string, unknown>> = []

for (const mbti of XING) {
  const renShe = JiaoSe.shengChengJiaoSe({
    yong_hu_id: 'qin-mi-du-ce-shi', mbti_lei_xing: mbti, xing_bie: 'nv',
  })
  console.log(`\n════════ ${mbti}（${renShe.wei_xin_ming}）════════`)

  for (const duan of JIE_DUAN) {
    const shuRu = {
      yong_hu_id: 'qin-mi-du-ce-shi',
      jiao_se_id: renShe.id,
      jiao_se: renShe,
      hao_gan_du: {
        xin_ren_du: Math.round(duan.fen * 0.35), qin_mi_du: Math.round(duan.fen * 0.25),
        qu_wei_du: Math.round(duan.fen * 0.2), guan_huai_du: Math.round(duan.fen * 0.2),
        zong_fen: duan.fen, guan_xi_jie_duan: duan.ming,
      },
      dui_hua_li_shi: [{ fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '在吗', shi_jian: '20:31' }],
      yong_hu_xin_xiao_xi: WEN,
      shi_fou_di_yi_lun: false,
      shi_jian_chang_jing: '晚上八点半，各自在宿舍，都在刷手机',
      tu_pian_shou_quan: false,
    }
    let chu: Record<string, unknown> | null = null
    for (let ci = 0; ci < 3; ci++) {
      if (ci > 0) await deng(30000 * ci)
      try { chu = await HouXing.yunXingAIYinQing(shuRu); break } catch { /* 重试 */ }
    }
    if (!chu) { console.log(`\n  【${duan.ming} / ${duan.fen}】放弃`); continue }
    const ce = chu.ce_lue as { shi_fou_hui_fu?: boolean; shi_jian_qing_xu?: string } | undefined
    console.log(`\n  【${duan.ming} · ${duan.fen}】${ce?.shi_fou_hui_fu === false ? '已读不回' : '回'}｜情绪:${ce?.shi_jian_qing_xu ?? '-'}`)
    for (const m of (chu.xiao_xi_lie_biao as string[]) || []) console.log(`    > ${m}`)
    if (chu.cuo_wu_xin_xi) console.log(`    ! ${chu.cuo_wu_xin_xi}`)
    suoYou.push({ mbti, jieDuan: duan.ming, fen: duan.fen, xiaoXi: chu.xiao_xi_lie_biao, qingXu: ce?.shi_jian_qing_xu })
    await deng(JIAN_GE)
  }
}

console.log('\n（落盘 .语料工作区/out_G_亲密度阶梯.json）')
const fs = require_('node:fs')
fs.writeFileSync('.语料工作区/out_G_亲密度阶梯.json', `${JSON.stringify({ suoYou }, null, 2)}\n`, 'utf8')