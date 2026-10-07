/**
 * 直读实验（完整版）：多性格 × 多轮 × A/B 双臂，记录 Director 决策。
 *
 * 目的（三个问题，一个实验答完）：
 *   Q1 风格示例是否让句子更口语 —— 同输入 A/B 对照，直读原文判定
 *   Q2 风格示例是否导致 Director 更倾向「已读不回」（功能性退化）—— 记录每轮 shi_fou_hui_fu
 *   Q3 16 型是否真的不同 —— 不同性格同输入对照
 *
 * 限流：本平台 tpm/rpm 限流，脚本**自适应间隔**（遇 429 退避，成功后逐步收紧）。
 * 单次调用失败会重试；全部失败才记 shiBai。
 *
 * ⚠️ 判据只有一个（用户定稿）：**这条回复由这个性格的真人发出去，是否可能？**
 *    脚本不判定好坏，只把原文 + Director 决策打出来 + 落盘。
 */
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const gen = (w: string) => resolve(dirname(fileURLToPath(import.meta.url)), '../../../', w)
const require_ = createRequire(import.meta.url)
const HouXing = require_(gen('backend/dist/services/AI引擎.js'))
const JiaoSe = require_(gen('backend/dist/services/角色生成.js'))

const XING = (process.env.SHI_YAN_XING || 'ISTJ,ESFP,INTP,ESTJ').split(',')
const LUN_SHU = Number(process.env.SHI_YAN_LUN || '3')
const LUO_PAN = process.env.SHI_YAN_LUO_PAN || './out.json'
const ZUI_DAO_CI = 4
/** 自适应间隔：初始值，遇 429 指数退避，连续成功 3 次后收紧一档 */
let jianGe = Number(process.env.SHI_YAN_JIAN_GE || '20000')
const JIAN_GE_XIA = 6000
const JIAN_GE_SHANG = 120000
let lianXuChengGong = 0

const JU_BEN = [
  '今天差点迟到 笑死 闹钟没响',
  '我室友在打游戏吵死了',
  '我论文一个字都写不动',
  '宿舍那只猫今天又上我床了',
  '今天降温了你多穿点',
  '你晚饭吃了吗',
  '我今天被领导骂了 心里不舒服',
  '你平时都几点睡啊',
  '我妈又催我找对象了',
  '我跟你说个事 别笑我',
  '你觉得我这人怎么样',
  '最近好累啊 什么都不想干',
  '你猜我今天干了啥',
  '我一直想问你一件事',
  '如果我周末约你 你有空吗',
]

function guanXiJieDuan(z: number): string {
  if (z <= 100) return 'lengDan'
  if (z <= 200) return 'shuYuan'
  if (z <= 300) return 'renShi'
  if (z <= 400) return 'shuXi'
  if (z <= 500) return 'pengYou'
  if (z <= 600) return 'haoYou'
  if (z <= 700) return 'aiMei'
  if (z <= 800) return 'xinDong'
  if (z <= 900) return 'reLian'
  return 'shenAi'
}

const deng = (d: number) => new Promise((r) => setTimeout(r, d))

const suoYouLun: Array<Record<string, unknown>> = []
let huiFu = 0
let buHui = 0
let wangLun = 0
let xianLiuGe = 0

for (const mbti of XING) {
  const renShe = JiaoSe.shengChengJiaoSe({
    yong_hu_id: process.env.SHI_YAN_YONG_HU_ID || 'dui-zhao-shi-yan',
    mbti_lei_xing: mbti,
    xing_bie: mbti === 'ESFP' || mbti === 'INFP' ? 'nv' : 'nan',
  })
  const zong = renShe.hao_gan_du_zong_fen
  console.log(`\n────── ${mbti}（${renShe.wei_xin_ming}｜${renShe.ie_lei_xing}${renShe.re_shen_lei_xing}｜好感 ${zong}）──────`)
  const liShi: Array<Record<string, unknown>> = [
    { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '在吗', shi_jian: '20:31' },
  ]

  for (let lun = 0; lun < LUN_SHU; lun++) {
    const yongHu = JU_BEN[lun % JU_BEN.length]
    const shuRu = {
      yong_hu_id: process.env.SHI_YAN_YONG_HU_ID || 'dui-zhao-shi-yan',
      jiao_se_id: renShe.id,
      jiao_se: renShe,
      hao_gan_du: {
        xin_ren_du: Math.round(zong * 0.35), qin_mi_du: Math.round(zong * 0.25),
        qu_wei_du: Math.round(zong * 0.2), guan_huai_du: Math.round(zong * 0.2),
        zong_fen: zong, guan_xi_jie_duan: guanXiJieDuan(zong),
      },
      dui_hua_li_shi: [...liShi],
      yong_hu_xin_xiao_xi: yongHu,
      shi_fou_di_yi_lun: lun === 0,
      shi_jian_chang_jing: '晚上八点半，各自在宿舍，都在刷手机',
      tu_pian_shou_quan: false,
    }

    let chu: Record<string, unknown> | null = null
    for (let ci = 0; ci < ZUI_DAO_CI; ci++) {
      if (ci > 0) {
        jianGe = Math.min(JIAN_GE_SHANG, jianGe * 2)
        await deng(jianGe)
      }
      try {
        chu = await HouXing.yunXingAIYinQing(shuRu)
        // ⚠️ **限流会伪装成业务错误**，必须区分，否则把环境故障误读成产品缺陷：
        //   `对方正在忙` = Director 返回 429（AI引擎.ts:201 透传）
        //   `消息没发出去` = Writer 调用失败（含 429）
        //   两者都不是「角色已读不回」（那个是 `directorHuiFu === false` 且无 cuo_wu）。
        //   Director 成功 + Writer 被限流 ⇒ 这一轮 Director 的决策是有效的，只是文本没产出，
        //   必须重跑整轮才能拿到文本，否则会把限流率算进「回复率」。
        const cuo = chu.cuo_wu_xin_xi as string | undefined
        const xianLiuZhuang = cuo === '对方正在忙，稍后再聊' || cuo === '消息没发出去，稍等再试'
        if (xianLiuZhuang && ci < ZUI_DAO_CI - 1) {
          xianLiuGe += 1
          console.log(`  [限流重试 ${ci + 1}] ${cuo}`)
          chu = null
          continue
        }
        break
      } catch (e) {
        console.log(`  [重试${ci + 1}] ${(e as Error).message.slice(0, 70)}`)
      }
    }
    if (!chu) { wangLun++; console.log(`  !! 放弃`); continue }

    lianXuChengGong++
    if (lianXuChengGong % 3 === 0) jianGe = Math.max(JIAN_GE_XIA, Math.floor(jianGe / 1.6))

    const ceLue = chu.ce_lue as { shi_fou_hui_fu?: boolean; shi_jian_qing_xu?: string } | undefined
    const danGe = ceLue?.shi_fou_hui_fu === false ? '已读不回' : '回'
    console.log(`\n  【第${lun + 1}轮】${danGe}｜情绪:${ceLue?.shi_jian_qing_xu ?? '-'}｜用户: ${yongHu}`)
    if (chu.cuo_wu_xin_xi) console.log(`  ! ${chu.cuo_wu_xin_xi}`)

    const xs = (chu.xiao_xi_lie_biao as string[]) || []
    if (ceLue?.shi_fou_hui_fu === false) buHui++
    else if (xs.length > 0) huiFu++
    else wangLun++

    for (const m of xs) {
      console.log(`    > ${m}`)
      liShi.push({ fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: renShe.wei_xin_ming, nei_rong: m, shi_jian: '20:32' })
    }
    if (xs.length === 0 && ceLue?.shi_fou_hui_fu !== false) console.log('    （要回但没回）')

    suoYouLun.push({
      mbti, lun, yongHu, xiaoXi: xs,
      directorHuiFu: ceLue?.shi_fou_hui_fu, qingXu: ceLue?.shi_jian_qing_xu,
      cuoWu: chu.cuo_wu_xin_xi,
    })
    await deng(jianGe)
  }
}

writeFileSync(LUO_PAN, `${JSON.stringify({ suoYouLun, tongJi: { huiFu, buHui, wangLun, xianLiuGe } }, null, 2)}\n`, 'utf8')
console.log(`\n══════ 汇总：回了 ${huiFu} 轮 / 已读不回 ${buHui} 轮 / 异常 ${wangLun} 轮 / 限流重试 ${xianLiuGe} 次 ══════`)
console.log(`落盘 ${LUO_PAN}`)