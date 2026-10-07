/**
 * Writer 空回复归因实验：固定输入、固定性格，重复跑 N 次，只变风格示例开关。
 *
 * 目的：判定 B 组的 3 次失败（WriterFuShiKongBai / WriterDiaoYingShiBai /
 *   aiXianLiuQingShaoHou）到底是**风格示例引起的**，还是**平台限流的随机抖动**。
 *
 * 方法：同一配置重复多次，比较两组失败率。若两组失败率相当⇒ 与示例无关（是限流）。
 *   单次不可判定 —— 这正是上一轮我犯的错（把限流误读成「已读不回退化」）。
 *
 * ⚠️ 只输出计数与失败类型分布，不判定好坏。
 */
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const gen = (w: string) => resolve(dirname(fileURLToPath(import.meta.url)), '../../../', w)
const require_ = createRequire(import.meta.url)
const HouXing = require_(gen('backend/dist/services/AI引擎.js'))
const JiaoSe = require_(gen('backend/dist/services/角色生成.js'))

const CI_SHU = Number(process.env.SHI_YAN_CI || '6')
const XING = process.env.SHI_YAN_XING || 'INTP'
const JIAN_GE = Number(process.env.SHI_YAN_JIAN_GE || '20000')
const deng = (d: number) => new Promise((r) => setTimeout(r, d))

function guanXiJieDuan(z: number): string {
  if (z <= 400) return 'shuXi'
  if (z <= 500) return 'pengYou'
  return 'haoYou'
}

/** 失败类型的分类 —— 关键是分清「限流」与「模型交白卷」 */
function fenLei(chu: Record<string, unknown>): string {
  const c = (chu.cuo_wu_xin_xi as string) || ''
  if (c.includes('正在忙')) return '限流(Director 429)'
  if (c.includes('没发出去')) return '限流(Writer 失败)'
  if (c.includes('没接上话')) return '⚠️Writer交白卷'
  if ((chu.xiao_xi_lie_biao as string[])?.length === 0) return '空但无标记'
  return 'OK'
}

interface Ji {
  kaiGuan: boolean
  chengGong: number
  mingBiao: number
  lei: Record<string, number>
  fanWen: string[]
}

const liu: Ji[] = [
  { kaiGuan: false, chengGong: 0, mingBiao: 0, lei: {}, fanWen: [] },
  { kaiGuan: true, chengGong: 0, mingBiao: 0, lei: {}, fanWen: [] },
]

for (const zhuang of liu) {
  process.env.FENG_GE_SHI_LI_QI_YONG = String(zhuang.kaiGuan)
  console.log(`\n===== 风格示例 ${zhuang.kaiGuan ? '开' : '关'}（跑 ${CI_SHU} 次）=====`)

  const renShe = JiaoSe.shengChengJiaoSe({
    yong_hu_id: 'gui-yi-shi-yan', mbti_lei_xing: XING, xing_bie: 'nv',
  })
  const zong = renShe.hao_gan_du_zong_fen

  for (let i = 0; i < CI_SHU; i++) {
    const shuRu = {
      yong_hu_id: 'gui-yi-shi-yan',
      jiao_se_id: renShe.id,
      jiao_se: renShe,
      hao_gan_du: {
        xin_ren_du: Math.round(zong * 0.35), qin_mi_du: Math.round(zong * 0.25),
        qu_wei_du: Math.round(zong * 0.2), guan_huai_du: Math.round(zong * 0.2),
        zong_fen: zong, guan_xi_jie_duan: guanXiJieDuan(zong),
      },
      dui_hua_li_shi: [{ fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '在吗', shi_jian: '20:31' }],
      yong_hu_xin_xiao_xi: '宿舍那只猫今天又上我床了',
      shi_fou_di_yi_lun: i === 0,
      shi_jian_chang_jing: '晚上八点半，各自在宿舍，都在刷手机',
      tu_pian_shou_quan: false,
    }
    let chu: Record<string, unknown> | null = null
    for (let ci = 0; ci < 3; ci++) {
      if (ci > 0) await deng(30000 * ci)
      try { chu = await HouXing.yunXingAIYinQing(shuRu); break } catch { /* 继续重试 */ }
    }
    if (!chu) { zhuang.lei['全部失败'] = (zhuang.lei['全部失败'] || 0) + 1; continue }
    const lei = fenLei(chu)
    zhuang.lei[lei] = (zhuang.lei[lei] || 0) + 1
    if (lei === 'OK') { zhuang.chengGong++; zhuang.fanWen.push((chu.xiao_xi_lie_biao as string[])[0] || '') }
    else zhuang.mingBiao++
    console.log(`  [${i + 1}] ${lei}`)
    await deng(JIAN_GE)
  }
}

console.log(`\n═══════════════ 汇总 ═══════════════`)
for (const z of liu) {
  console.log(`示例${z.kaiGuan ? '开' : '关'}：成功 ${z.chengGong} / 明标失败 ${z.mingBiao} / 共 ${CI_SHU}`)
  console.log(`  ${JSON.stringify(z.lei)}`)
}
console.log(`\n判定：两组失败率接近 ⇒ 与风格示例无关，是平台限流随机抖动。`)
console.log(`\nB 组样本（有输出时）：`)
for (const f of liu[1].fanWen) console.log(`  > ${f}`)