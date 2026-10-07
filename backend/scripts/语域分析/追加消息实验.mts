/**
 * 追加消息真实实验：验证「问存在性、不问内容」这条协议是否真的成立。
 *
 * 验收（用户定稿）：
 *   判定为「有事」时，说出来的必须是**别的事**，绝不能是「在吗」「怎么不回我」这类催消息。
 *
 * 方法：对每个性格跑 N 次判定，打印：
 *   · 判定为「有事」的比例（应当是少数 —— 多数时候真人确实没别的事可说）
 *   · 判定出的「那件事」原文
 *   · Writer 依据它实际说出的话（直读判「像不像真人」）
 *
 * ⚠️ 平台限流，必须串行 + 长间隔。
 */
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const gen = (w: string) => resolve(dirname(fileURLToPath(import.meta.url)), '../../../', w)
const require_ = createRequire(import.meta.url)
const { panDuanZuiJia } = require_(gen('backend/dist/services/追加消息判定.js'))
const HouXing = require_(gen('backend/dist/services/AI引擎.js'))
const JiaoSe = require_(gen('backend/dist/services/角色生成.js'))

const XING = (process.env.SHI_YAN_XING || 'ISFJ,ESTP,INTJ,INFP').split(',')
const CI = Number(process.env.SHI_YAN_CI || '3')
const JIAN_GE = Number(process.env.SHI_YAN_JIAN_GE || '30000')
const deng = (d: number) => new Promise((r) => setTimeout(r, d))

/**
 * 判「这是不是催消息」—— 出现即实验失败。
 *
 * ⚠️ 初版只查了问号型催（`在吗`/`怎么不回`/结尾问号），
 *   结果**漏掉了质问型催**：`行啊，装死是吧，90分钟连个表情都舍不得发`
 *   —— 没有问号，但**在数对方沉默了多久**（`90分钟`），那正是「催」的形态。
 *   验证工具漏检比产品缺陷更危险：它会让失败看起来像成功。故两条都查。
 */
const CUI_WEN = /在吗|在不在|怎么不回|看到没|喂|说话呀|回我|你还在吗|装死|干嘛不理|理我/
/** 报时数型质问：把「对方沉默了多久」算出来并说给 TA 听 */
const BAO_SHI_SHU = /\d+\s*(?:个)?\s*(?:分钟|小时|天|秒)(?:了|都没|都没发|了连)/

let youShi = 0
let meiShi = 0
let cuiLe = 0
const suoYou: Array<Record<string, unknown>> = []

for (const mbti of XING) {
  const renShe = JiaoSe.shengChengJiaoSe({
    yong_hu_id: 'zui-jia-shi-yan', mbti_lei_xing: mbti,
    xing_bie: mbti === 'ISFJ' || mbti === 'INFP' ? 'nv' : 'nan',
  })
  const zong = renShe.hao_gan_du_zong_fen
  console.log(`\n══════ ${mbti}（${renShe.wei_xin_ming}）══════`)

  // 固定一段历史：AI 已经回过话，用户接着发了日常，然后 AI 也回了，之后用户沉默
  const liShi = [
    { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '今天降温了你多穿点', shi_jian: '20:10' },
    { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: renShe.wei_xin_ming, nei_rong: '穿了的，你别光说我', shi_jian: '20:11' },
  ]

  for (let i = 0; i < CI; i++) {
    const panDuan = await panDuanZuiJia({
      jiao_se: renShe,
      hao_gan_du: {
        xin_ren_du: Math.round(zong * 0.35), qin_mi_du: Math.round(zong * 0.25),
        qu_wei_du: Math.round(zong * 0.2), guan_huai_du: Math.round(zong * 0.2),
        zong_fen: zong, guan_xi_jie_duan: 'shuXi',
      },
      dui_hua_li_shi: liShi,
      liangJiaGeHaoMiao: (40 + i * 25) * 60 * 1000,
    })

    if (!panDuan.youShiMeDongXi || !panDuan.shuoDeShi) {
      meiShi++
      console.log(`  [${i + 1}] 没有想说话（多数时候真实如此）`)
      if (i < CI - 1) await deng(JIAN_GE)
      continue
    }
    youShi++
    const dongXi = panDuan.shuoDeShi
    const shiCui = CUI_WEN.test(dongXi) || BAO_SHI_SHU.test(dongXi)
    if (shiCui) cuiLe++
    console.log(`  [${i + 1}] 判定「想说话」：${dongXi}${shiCui ? '   ⚠️ 这是催消息！' : ''}`)

    // 展开成真实回复
    try {
      const r = await HouXing.yunXingAIYinQing({
        yong_hu_id: 'zui-jia-shi-yan',
        jiao_se_id: renShe.id,
        jiao_se: renShe,
        hao_gan_du: {
          xin_ren_du: Math.round(zong * 0.35), qin_mi_du: Math.round(zong * 0.25),
          qu_wei_du: Math.round(zong * 0.2), guan_huai_du: Math.round(zong * 0.2),
          zong_fen: zong, guan_xi_jie_duan: 'shuXi',
        },
        dui_hua_li_shi: liShi,
        yong_hu_xin_xiao_xi: dongXi,
        shi_fou_di_yi_lun: false,
        shi_jian_chang_jing: '晚上八点半，各自在宿舍，都在刷手机',
        tu_pian_shou_quan: false,
      })
      console.log(`      ├─ 展开：${(r.xiao_xi_lie_biao || []).join(' / ')}`)
      suoYou.push({ mbti, i, dongXi, xiaoXi: r.xiao_xi_lie_biao, shiCui })
    } catch {
      console.log('      └─ 展开失败（限流）')
    }
    if (i < CI - 1) await deng(JIAN_GE)
  }
}

console.log(`\n══════════════ 汇总 ══════════════`)
console.log(`判定「有别的事」 ${youShi} 次 / 「没有」 ${meiShi} 次`)
console.log(`其中变成催消息的： ${cuiLe} 次${cuiLe === 0 ? '✅' : '❌ 协议有问题'}`)
console.log(`\n判读：`)
console.log(`  · 「没有」占多数是对的 —— 现实中大部分时候人确实没有非说不可的话。`)
console.log(`  · 出现催消息即失败 —— 那说明「问存在性」被模型理解成了「该不该催」。`)

const fs = require_('node:fs')
fs.writeFileSync('.语料工作区/out_N_追加消息.json', `${JSON.stringify({ suoYou, tongJi: { youShi, meiShi, cuiLe } }, null, 2)}\n`, 'utf8')
console.log(`\n落盘 .语料工作区/out_N_追加消息.json`)