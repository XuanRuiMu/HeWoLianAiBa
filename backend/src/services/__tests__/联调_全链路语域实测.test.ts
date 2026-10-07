/* eslint-disable no-console -- 本脚本的职责就是打印实测报告到 stdout */
import { describe, expect, test } from 'vitest'
import { yunXingAIYinQing } from '../AI引擎'
import { peiZhi } from '../../config'
import { AI_PEI_ZHI, MO_XING_HUI_DU_CE_LUE } from '../../config/AI配置'
import { tongJi, duiBiBiao } from '../../测试/语域口径'
import { ZHEN_REN_JI_XIAN } from '../../测试/真人基线常量'
import { tongJiLun, huiZongPanDuan } from '../开场判据统计'
import { KAI_CHANG_PEI_ZHI, duJieBaoKaiGuan, KAI_CHANG_KAI_GUAN_MING } from '../../config/开场采样配置'
import { shengChengJiaoSe } from '../角色生成'
import { mbtiLieBiao } from '../../config/角色配置'
import type { AIJiaoSeXinXi, AIYinQingShuRu, DuiHuaLiShiXiang, HaoGanDuXinXi } from '../../types'
import * as fs from 'node:fs'

/**
 * 联调专用（非 CI 用例）：用**全链路**（含 Director）跑 N 轮跨轮对话，
 * 量 AI 的语域指标并与真人基线（LCCC）逐项对照。
 *
 * 为什么必须全链路：上一轮 PROGRESS 已证伪「只用隔离测试（仅 Writer）下结论」——
 * 隔离会系统性放大条数/人设/速度三项差异。Director 的「回复条数」会截断拉平结果。
 *
 * 为什么必须跨轮：语域偏移（复读、开头复读）只在多轮里显现。
 *
 * 仅当 YU_LIAN_WAI_HU=true 时运行。口径与真人基线共用 .语料工作区/语域口径.ts。
 */

/**
 * 场景由 `shengChengJiaoSe`（生产派生）生成，每个 MBTI 一型，共 16 型。
 *
 * ⚠️ 为什么不用手写 16 套（第九轮设计审查 M2）：
 * · 手写必错在 `haoGanDu`。`角色生成.ts:435` 的区间按 `${yongHuId}_${mbti}` hash 出来，
 *   全 16 型都落在 300–500，经 `huoQuGuanXiJieDuan` 只可能映射到
 *   **shuXi(301-400) / pengYou(401-500) 两档**。旧夹具里的 `miAi`(315)、`douDing`(303)
 *   根本不在 `Prompt构建器.ts:42-53` 的 10 档映射表内 → 被渲染成「还不太清楚」，
 *   即**测的是生产不可能出现的状态**。
 * · `wai_mao` 经 `anAnQuanZhongXuanZeWaiMao` 用 **`Math.random()`** 加权选（70% 本型 / 30% 全库），
 *   生产本就每次生成不同。手写夹具会把它**冻结** → 该通道的偏差变成隐藏变量。
 *
 * ⚠️ `XIAO_CHU_REN_ZHE` 开关已删除（审查 M3）：派生出���本来就是生产原文，
 * 「替换成生产原文」这个操作不再有意义，留着只会让人以为还能开关。
 *
 * ⚠️ 变量控制：16 型共用**同一份** `jiaoDian` / `kaiShiLiShi` / 用户脚本，
 * 使型间唯一差异是人设（审查 S4：原先 `+ 场景.indexOf(s)` 的轮换偏移会让
 * 不同场景在不同轮拿到不同题材，构成场景间混淆）。
 */
const MBTI_ZU = mbtiLieBiao

/**
 * 关系阶段映射 —— 逐字复刻 `角色生成.ts:444-455` 的 `huoQuGuanXiJieDuan`。
 *
 * ⚠️ 为什么不直接 import：该函数**未导出**，而为一处测试去改生产文件的导出面
 * 违反「精确修改」。复刻的等价性由 `全16型消融前置校验.test.ts` 锁定
 * （断言派生的 16 型好感度全部落在 300–500，故阶段必为 shuXi / pengYou）。
 */
function guanXiJieDuan(zong: number): string {
  if (zong <= 100) return 'lengDan'
  if (zong <= 200) return 'shuYuan'
  if (zong <= 300) return 'renShi'
  if (zong <= 400) return 'shuXi'
  if (zong <= 500) return 'pengYou'
  if (zong <= 600) return 'haoYou'
  if (zong <= 700) return 'aiMei'
  if (zong <= 800) return 'xinDong'
  if (zong <= 900) return 'reLian'
  return 'shenAi'
}

const 场景 = MBTI_ZU.map((mbti, suoYin) => {
  const renShe = shengChengJiaoSe({
    yong_hu_id: process.env.YU_LIAN_YONG_HU_ID || 'yong-hu-yu-lian',
    mbti_lei_xing: mbti,
    xing_bie: suoYin % 2 === 0 ? 'nv' : 'nan',
  })
  const zong = renShe.hao_gan_du_zong_fen
  return {
    ming: `${mbti}`,
    mbti,
    jiaoDian: '晚上八点半，各自在宿舍，都在刷手机',
    renShe: renShe as unknown as AIJiaoSeXinXi,
    haoGanDu: {
      // 四维按 `角色生成.ts:690-694` 的生产比例派生，不手挑
      xin_ren_du: Math.round(zong * 0.35),
      qin_mi_du: Math.round(zong * 0.25),
      qu_wei_du: Math.round(zong * 0.2),
      guan_huai_du: Math.round(zong * 0.2),
      zong_fen: zong,
      guan_xi_jie_duan: guanXiJieDuan(zong),
    } as unknown as HaoGanDuXinXi,
    kaiShiLiShi: [
      { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '在吗', shi_jian: '20:31' },
      { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '微信名', nei_rong: '嗯？怎么了', shi_jian: '20:31' },
    ] as DuiHuaLiShiXiang[],
    yongHuXinXiaoXi: '今天差点迟到 笑死 闹钟没响',
  }
})

// 用户脚本：模拟真实用户行为，20 轮不重复
const YONG_HU_JU_BEN = [
  '今天差点迟到 笑死 闹钟没响', '我室友在打游戏吵死了', '你晚饭吃了吗', '我刚洗完澡 头发还湿着',
  '宿舍那只猫今天又上我床了', '你上课累不累啊', '我论文一个字都写不动', '你喜欢喝什么奶茶',
  '我跟你说个事 别笑我', '今天降温了你多穿点', '我妈又打电话来催了', '我打麻将输了两百',
  '你明天有空吗', '我最近都在看一个剧 挺上头', '晚上一起吃饭啊', '你说话呀 怎么不回了',
  '我给你看个东西', '你说我们这样算什么', '我今天有点累', '那好吧 晚安',
]

/** 比率格式化：null 必须显式显示为 N/A，绝不能显示成 0（0 会被误读成「模型完全不服从」） */
const fmtLv = (v: number | null) => (v === null ? 'N/A' : `${(v * 100).toFixed(2)}%`)

describe.skipIf(process.env.YU_LIAN_WAI_HU !== 'true')('联调：全链路语域实测', () => {
  test('多场景多轮跑全链路，量 AI 语域并与真人基线对照', { timeout: 3_600_000 }, async () => {
      // ⚠️ 双门断言（第九轮审查 M1，P0）：
      //   本文件只由 `YU_LIAN_WAI_HU` 门控，但 `src/test-setup.ts:10` 只看
      //   `XU_KE_ZHEN_SHI_WAI_HU` —— 只设前者时，baseUrl 会被改成
      //   `http://127.0.0.1:9`，每轮调用失败 → youXiao 为空 → 所有指标 = 0
      //   → M8 恒 0、kaiGuanWeiLunShu 恒等于 lunShu → **测试全绿、退出码 0、
      //   还会写出 out_*.json**。这是「假完成」的教科书形态。
      //   故两道门都必须显式断言，缺一即失败而不是产出假数据。
      expect(process.env.XU_KE_ZHEN_SHI_WAI_HU, '只设了 YU_LIAN_WAI_HU：test-setup 会把 baseUrl 改成 127.0.0.1:9，跑出全 0 假数据').toBe('true')
      expect(process.env.YU_LIAN_WAI_HU, '本测试由 YU_LIAN_WAI_HU 门控').toBe('true')
    const lunShu = Number(process.env.YU_LIAN_LUN_SHU || '20')
    const luJing = process.env.YU_LIAN_LU_JING || './out_yuyan.json'
    const biaoQian = process.env.YU_LIAN_BIAO_QIAN || '当前基线'

    type ZhiBiao = ReturnType<typeof tongJi>
    type LunJiLu = {
      changJing: string
      lun: number
      xiaoXi: string[]
      zhiBiao: ZhiBiao
      jiangJiMoShi: boolean
      cuoWu?: string
      ceLue?: { hui_fu_ce_lue?: string; shi_jian_qing_xu?: string; shi_fou_hui_fu?: boolean }
      mbti: string
      haoGanDuZongFen: number
      guanXiJieDuan: string
      reShenLeiXing?: string
      waiMao?: string
    }
    type LunPanDuan = ReturnType<typeof tongJiLun> & { houXuan: string[]; kaiGuanKaiQi: boolean }
    const suoYouLun: Array<LunJiLu & LunPanDuan> = []
    const kaiShiShiJian = Date.now()

    for (const s of 场景) {
      const liShi: DuiHuaLiShiXiang[] = [...s.kaiShiLiShi]
      for (let lun = 0; lun < lunShu; lun++) {
        // ⚠️ 去掉了 `+ 场景.indexOf(s)`（第九轮审查 S4/M4）：
        //   原偏移让不同场景在不同轮拿到不同题材（场景 #2「刚吵完架」拿到「宿舍猫」），
        //   构成**场景间**混淆；且 `indexOf` 失配返回 -1 会让全部场景静默偏移到 -1。
        //   16 型共用同一顺序 → 型间唯一差异是人设。
        const yongHuXinXiaoXi = YONG_HU_JU_BEN[lun % YONG_HU_JU_BEN.length]
        const shuRu: AIYinQingShuRu = {
          yong_hu_id: process.env.YU_LIAN_YONG_HU_ID || 'yong-hu-yu-lian',
          jiao_se_id: s.renShe.id,
          jiao_se: s.renShe,
          hao_gan_du: s.haoGanDu as AIYinQingShuRu['hao_gan_du'],
          dui_hua_li_shi: [...liShi],
          yong_hu_xin_xiao_xi: yongHuXinXiaoXi,
          shi_fou_di_yi_lun: false,
          shi_jian_chang_jing: s.jiaoDian,
          tu_pian_shou_quan: false,
        }
        const chu = await yunXingAIYinQing(shuRu)
        const xiaoXi = chu.xiao_xi_lie_biao

// M7 遵守率 / M8 逐字复制 / M2 撞车率：机制 D 的专属验收。
// ⚠️ 必须用 Writer 回传的候选（chu.kai_chang_hou_xuan），**不得另行采样**：
//    另行采样测的是另一次独立抽样，与模型是否真的服从无关（第二轮审查 P5）。
// ⚠️ 开关关闭时 Writer 不注入任何候选 → 直接标 kaiGuanKaiQi=false 让汇总层排除。
//    **绝不能塞哨兵候选**：那会把「跳过」变成「判为不服从」，造成系统性向下偏倚
//    （第四轮审查 Sp-1 实测：7 轮服从 + 3 轮关闭 → 遵守率被拉成 0.7 而非 1.0）。
const houXuan = chu.kai_chang_hou_xuan || []
const kaiGuanKaiQi = houXuan.length > 0
const panDuan = tongJiLun(liShi, chu.yuan_wen || '', xiaoXi, kaiGuanKaiQi ? houXuan : [])

suoYouLun.push({
          changJing: s.ming, lun, xiaoXi: [...xiaoXi],
          // 协变量随轮落盘（审查 M5）：型间差异必须能与好感度阶段/慢热快热/外貌分离
          mbti: s.mbti,
          haoGanDuZongFen: s.haoGanDu.zong_fen,
          guanXiJieDuan: s.haoGanDu.guan_xi_jie_duan,
          reShenLeiXing: s.renShe.re_shen_lei_xing,
          waiMao: s.renShe.wai_mao,
          zhiBiao: tongJi(xiaoXi),
          jiangJiMoShi: chu.jiang_ji_mo_shi,
          // Director 策略必须落盘：`ce_lue.hui_fu_ce_lue` 会被拼进 Writer prompt，
          // 而 Director 上游许可「留白」，被测符号可经此通道回流。
          // 不记录则任何跨臂「单变量」声明都不可回溯、不可排除、不可校正。
          ceLue: chu.ce_lue
            ? {
                hui_fu_ce_lue: chu.ce_lue.hui_fu_ce_lue,
                shi_jian_qing_xu: chu.ce_lue.shi_jian_qing_xu,
                shi_fou_hui_fu: chu.ce_lue.shi_fou_hui_fu,
              }
            : undefined,
          ...panDuan,
          kaiGuanKaiQi,
          houXuan: [...houXuan],
          cuoWu: chu.cuo_wu_xin_xi,
        })
        liShi.push({ fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: yongHuXinXiaoXi, shi_jian: '20:40' })
        for (const tiao of xiaoXi) {
          liShi.push({ fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: s.renShe.wei_xin_ming, nei_rong: tiao, shi_jian: '20:41' })
        }
        if (liShi.length > 200) liShi.splice(0, liShi.length - 200)
      }

      // ⚠️ 场景级增量落盘：实测 6s/轮，400 轮 ≈ 40 分钟，而 timeout 是 60 分钟。
      //   原实现只在全部跑完后写一次 JSON —— 一旦超时**整批预算全丢且无任何产物**。
      //   故每完成一个场景就落一次盘（覆盖写），保证任何时刻中断都有可复算的已落盘数据。
      //   ⚠️ 中断产物必须靠 `zongLunShu` 识别不完整，不能当完成结果用。
      fs.writeFileSync(
        luJing,
        JSON.stringify({ biaoQian, buWanZheng: true, yiWanChengJingJingShu: 场景.indexOf(s) + 1, zongLunShu: suoYouLun.length, suoYouLun }, null, 2),
        'utf8',
      )
    }

    const youXiao = suoYouLun.filter((r) => r.xiaoXi.length > 0)
    const hePingJun = (qu: (r: LunJiLu) => number) => youXiao.reduce((a, r) => a + qu(r), 0) / Math.max(1, youXiao.length)
    /** 中位数。⚠️ 必须与均值区分——混用会把「中位字数」报成均值，直接毁掉对标结论 */
    const heZhongWei = (a: number[]) => (a.length === 0 ? 0 : [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)])

    const huiZong = {
      moXing: peiZhi.deepSeek.moXing,
      // ⚠️ 采样参数必须落盘（第十二轮审查 Q11）：`AI配置.ts` 的 `top_p` / `zuiDaTokens` /
      //    `siKaoMoShi` / 灰度当时未记录，导致 A/B 的「唯一变量是开关」**不可从产物核验**。
      //    思考深度尤其关键：`siKaoMoShi` 为 enabled 时 `wenDu` 不生效（按官方规则），
      //    而 writer 灰度开启后**每次调用**按 90%/10% 随机切 max/medium ——
      //    10% 的思考深度抖动是很强的方差源。
      canShu: {
        writer: AI_PEI_ZHI.moXing.writer,
        director: AI_PEI_ZHI.moXing.director,
        moXingHuiDuCeLue: MO_XING_HUI_DU_CE_LUE.writer ?? null,
      },
      jiChuUrl: peiZhi.deepSeek.jiChuUrl,
meiLunShu: lunShu,
      changJingShu: 场景.length,
      // ⚠️ 下方 ...huiZongPanDuan 会展开自己的 lunShu（= 总轮数）。meiLunShu 是「每场景轮数」，两者含义不同，故不共用键名。
      zongLunShu: suoYouLun.length,
      kongHuiLunShu: suoYouLun.length - youXiao.length,
      jiangJiMoShiLunShu: suoYouLun.filter((r) => r.jiangJiMoShi).length,
      pingJunTiaoShu: Number(hePingJun((r) => r.zhiBiao.tiaoShu).toFixed(2)),
      // ⚠️ 必须是**中位条数**（此前误取中位「字数」，另一处又重复定义同名字段）
      zhongWeiTiaoShu: Number(heZhongWei(youXiao.map((r) => r.zhiBiao.tiaoShu)).toFixed(2)),
      pingJunZiShu: Number(hePingJun((r) => r.zhiBiao.pingJunZiShu).toFixed(2)),
      // ⚠️ 必须是**中位字数**
      zhongWeiZiShu: Number(heZhongWei(youXiao.map((r) => r.zhiBiao.zhongWeiZiShu)).toFixed(2)),
      shiFenWei: Number(hePingJun((r) => r.zhiBiao.shiFenWei).toFixed(4)),
      p90ZiShu: Number(hePingJun((r) => r.zhiBiao.p90).toFixed(2)),
      zuiChangZiShu: Math.max(0, ...suoYouLun.map((r) => r.zhiBiao.zuiChangZiShu)),
      danFenJuBiLi: Number(hePingJun((r) => r.zhiBiao.danFenJuBiLi).toFixed(4)),
      danFenJuWuBiaoBiLi: Number(hePingJun((r) => r.zhiBiao.danFenJuWuBiaoBiLi).toFixed(4)),
      weiMoBiaoBiLi: Number(hePingJun((r) => r.zhiBiao.weiMoBiaoBiLi).toFixed(4)),
      jvHaoBiLi: Number(hePingJun((r) => r.zhiBiao.jvHaoBiLi).toFixed(4)),
      yuQiCiMiDu: Number(hePingJun((r) => r.zhiBiao.yuQiCiMiDu).toFixed(3)),
emojiMiDu: Number(hePingJun((r) => r.zhiBiao.emojiMiDu).toFixed(4)),
    // 省略号三形态：合并「含省略号」会把「说一半停住」与「当连接词用」混算，
    // 而阶段 B 实测证明前者降 5.86pp、后者 −0.03pp —— 必须分开看才有诊断价值。
    sheHaoDuJie: Number(hePingJun((r) => r.zhiBiao.sheHaoDuJie).toFixed(4)),
    sheHaoMoWei: Number(hePingJun((r) => r.zhiBiao.sheHaoMoWei).toFixed(4)),
    sheHaoJuZhong: Number(hePingJun((r) => r.zhiBiao.sheHaoJuZhong).toFixed(4)),
    juChangCV: Number(hePingJun((r) => r.zhiBiao.juChangCV).toFixed(3)),
      yongShiMiaoZhong: Math.round((Date.now() - kaiShiShiJian) / 1000),

      // ── 机制 D 专属判据（PROGRESS §9 M2 / M7 / M8）──
      ...huiZongPanDuan(suoYouLun),
      // ⚠️ 必须走生产配置模块的解析函数：曾裸解析 process.env，导致 KAI_CHANG_QIAN_ZHI_QI_YONG='TRUE'
      //   时「候选已注入」但落盘 JSON 写 'off'（第六轮审查复核 P0-3 只修了一半）。
      kaiGuanZhuangTai: duJieBaoKaiGuan(KAI_CHANG_KAI_GUAN_MING) ? 'on' : 'off',
    }

    const juPingJun = tongJi(youXiao.flatMap((r) => r.xiaoXi))
    const duiBiLie = [
      { ming: 'pingJunZiShu', danWei: '字', qiJia: huiZong.pingJunZiShu, ren: ZHEN_REN_JI_XIAN.pingJunZiShu },
      { ming: 'zhongWeiZiShu', danWei: '字', qiJia: huiZong.zhongWeiZiShu, ren: ZHEN_REN_JI_XIAN.zhongWeiZiShu },
      { ming: 'shiFenWei', danWei: '占比', qiJia: huiZong.shiFenWei, ren: ZHEN_REN_JI_XIAN.shiFenWei },
      { ming: 'danFenJuBiLi', danWei: '占比', qiJia: huiZong.danFenJuBiLi, ren: ZHEN_REN_JI_XIAN.danFenJuBiLi },
      { ming: 'danFenJuWuBiaoBiLi', danWei: '占比', qiJia: huiZong.danFenJuWuBiaoBiLi, ren: ZHEN_REN_JI_XIAN.danFenJuWuBiaoBiLi },
      { ming: 'weiMoBiaoBiLi', danWei: '占比', qiJia: huiZong.weiMoBiaoBiLi, ren: ZHEN_REN_JI_XIAN.weiMoBiaoBiLi },
      { ming: 'jvHaoBiLi', danWei: '占比', qiJia: huiZong.jvHaoBiLi, ren: ZHEN_REN_JI_XIAN.jvHaoBiLi },
      { ming: 'yuQiCiMiDu', danWei: '个/条', qiJia: huiZong.yuQiCiMiDu, ren: ZHEN_REN_JI_XIAN.yuQiCiMiDu },
      { ming: 'emojiMiDu', danWei: '个/条', qiJia: huiZong.emojiMiDu, ren: ZHEN_REN_JI_XIAN.emojiMiDu },
      { ming: 'sheHaoMoWei', danWei: '占比', qiJia: huiZong.sheHaoMoWei, ren: ZHEN_REN_JI_XIAN.sheHaoMoWei },
      { ming: 'sheHaoJuZhong', danWei: '占比', qiJia: huiZong.sheHaoJuZhong, ren: ZHEN_REN_JI_XIAN.sheHaoJuZhong },
      { ming: 'tiaoShu', danWei: '条/轮', qiJia: huiZong.pingJunTiaoShu, ren: ZHEN_REN_JI_XIAN.pingJunTiaoShu },
    ].map((x) => {
      const beiLv = x.ren === 0 ? null : Number((x.qiJia / x.ren).toFixed(2))
      const cha = Math.abs(x.qiJia - x.ren)
      return { ...x, beiLv, yiCiXiang: cha <= Math.max(Math.abs(x.ren) * 0.15, 0.02) ? 'xiangJin' : (x.qiJia > x.ren ? 'gao' : 'di') }
    })

    /**
 * 按 MBTI 分组 + 按「可开句字面负荷」分 G1–G4 组，并落盘 sd / CI（第九轮审查 M7/M8）。
 *
 * ⚠️ 为什么必须分组而不只报池化：混池化会把「12.5% 的角色天生更差」平均掉。
 * ⚠️ 但**单型排名不可交付**：审查测算每型 30 轮的 95%CI 半宽约 ±4.30pp，
 *    比真人基线 1.0067% 的整个量级还宽 4 倍。本函数只做**诊断**，
 *    决策依据是池化 CI 与 G1/G4 组间差（>3.40pp 才显著）。
 *
 * 分组判据（静态扫描得出）。
 * ⚠️ G2/G3/G4 的成员由 `全16型消融前置校验.test.ts` 的断言锁定（第十轮审查 M6 补齐，此前只锁了 G1）。
 * ⚠️⚠️ **前提已被推翻（第十轮审查 M1）**：`Prompt构建器.ts:126`「省略」、`:85`「停顿一下」、
 *    `:258`/`:277`「留白」、`Writer.ts:35` system「留白和真实停顿」是**基座层**，
 *    对全部 16 型无条件生效。故「G4 无任何可开句字面」**在 prompt 层为假**，
 *    G1–G4 的差异最多只是**冗余强化程度**，无法隔离「有无该指令」这一变量。
 *    本分组仅用于诊断，禁止据此声称因果。
 * ⚠️ G2 两型（ISFP idx5 / ESFP idx9）按 `suoYin % 2` **皆为 nan** → G2 是 100% 男性，
 *    与 G4（近平衡）**完全共线**，G2 的效应无法与性别分离。
 * ⚠️ G3 的显著性由单一 INFP（18%）支撑，簇级置换检验 p=0.0759 不显著。
 */
const G1_MBTI = ['ISTJ', 'ISFJ']
const G2_MBTI = ['ISFP', 'ESFP']
const G3_MBTI = ['INFP', 'INTP', 'ENFP']

function groupOf(mbti: string): 'G1' | 'G2' | 'G3' | 'G4' {
  if (G1_MBTI.includes(mbti)) return 'G1'
  if (G2_MBTI.includes(mbti)) return 'G2'
  if (G3_MBTI.includes(mbti)) return 'G3'
  return 'G4'
}

/**
 * 轮级指标的均值 / sd / 95%CI 半宽 —— 统计单位是**轮**，不是消息。
 *
 * ⚠️ **重要局限（第十轮审查 S3）**：399 轮不是 399 个独立样本，而是 16 个人设簇 × 25 轮，
 *   且轮内累积 `liShi`（截到 200 条）。实测 ICC≈0.165 → DEFF≈4.95 → **本 CI 被低估约 2.2倍**。
 *   人设层 CI 会宽到 ±30pp 以上，故本函数报的是**名义**（轮级）CI，
 *   **不可用于「池化值与真人有显著差异」这类判断** —— 簇级判断见 `zhiHuanPianYiJianYan()`。
 */
function lunJiTongJi(rows: typeof suoYouLun, qu: (r: (typeof suoYouLun)[number]) => number = (r) => r.zhiBiao.sheHaoJuZhong): { n: number; pingJun: number; sd: number; ciBanKuan: number } {
  const you = rows.filter((r) => r.zhiBiao.tiaoShu > 0)
  const v = you.map(qu)
  if (v.length === 0) return { n: 0, pingJun: 0, sd: 0, ciBanKuan: 0 }
  const m = v.reduce((a, b) => a + b, 0) / v.length
  const sd = v.length > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) : 0
  const T = [0, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042]
  const df = v.length - 1
  const t = df >= 1 && df <= 30 ? T[df] : 1.96
  return { n: v.length, pingJun: +m.toFixed(4), sd: +sd.toFixed(4), ciBanKuan: +((t * sd) / Math.sqrt(v.length)).toFixed(4) }
}

/**
 * **簇级**置换检验：以「人设簇」（MBTI）为重采样单位（第十轮审查建议项 1）。
 *
 * 为什么必须簇级而非轮级：轮与轮共享累积历史且同人设高度相关，
 * 轮级 t 检验把相关样本当独立样本，会低估方差、造出假显著。
 * 置换检验不做这个假设 —— 只问「若分组与簇无关，随机重排后能否得到这么大的差」。
 *
 * ⚠️ 分辨率下限 = 1 / C(a+b, a)（如 2 vs 9 → 1/55 ≈ 0.018）。
 *    低于它时 p 不可能更小，**必须把该结果标为「已达分辨率下限」而非「更显著」**。
 */
function zhiHuanPianYiJianYan(qu: (r: (typeof suoYouLun)[number]) => number, ciCiShu = 20000, suanFaShu = 42) {
  const map = new Map<string, number[]>()
  for (const r of suoYouLun) {
    if (r.zhiBiao.tiaoShu <= 0) continue
    const arr = map.get(r.mbti) || []
    arr.push(qu(r))
    map.set(r.mbti, arr)
  }
  const qun = [...map.entries()]
  const zu = (zs: Array<[string, number[]]>) => {
    const all = zs.flatMap(([, v]) => v)
    return all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0
  }
  const zhiChang = qun.filter(([m]) => G1_MBTI.includes(m) || G2_MBTI.includes(m) || G3_MBTI.includes(m))
  const G4_MBTI = qun.filter(([m]) => !zhiChang.some(([z]) => z === m)).map(([m]) => m)
  const shiJing = zu(zhiChang) - zu(qun.filter(([m]) => G4_MBTI.includes(m)))
  let daYu = 0
  const suijiFaShu = () => { let s = suanFaShu; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 } }
  const rdm = suijiFaShu()
  const G4_Que = qun.filter(([m]) => G4_MBTI.includes(m))
  for (let i = 0; i < ciCiShu; i++) {
    const hun = [...qun]
    for (let j = hun.length - 1; j > 0; j--) { const k = Math.floor(rdm() * (j + 1)); [hun[j], hun[k]] = [hun[k], hun[j]] }
    const a = G1_MBTI.length + G2_MBTI.length + G3_MBTI.length
    const chai = zu(hun.slice(0, a)) - zu(hun.slice(a))
    if (Math.abs(chai) >= Math.abs(shiJing) - 1e-12) daYu++
  }
  const a = zhiChang.length
  const b = G4_Que.length
  const fenMu = Math.round(Math.exp(lgammaFactorial(a + b) - lgammaFactorial(a) - lgammaFactorial(b)))
  return {
    zhiChangFu: zhiChang.map(([m]) => m),
    g4Fu: G4_Que.map(([m]) => m),
    cha: +shiJing.toFixed(4),
    p: +(daYu / ciCiShu).toFixed(4),
    // 分辨率下限：组合数 a+b 选 a 的倒数。p 低于它不可能，只能标「已达下限」
    fenJieXiaXian: +(1 / fenMu).toFixed(4),
  }
}
function lgammaFactorial(n: number): number {
  let s = 0
  for (let i = 2; i <= n; i++) s += Math.log(i)
  return s
}

const fenZuTongJi = (key: (r: (typeof suoYouLun)[number]) => string, qu?: (r: (typeof suoYouLun)[number]) => number) => {
  const map = new Map<string, typeof suoYouLun>()
  for (const r of suoYouLun) {
    const k = key(r)
    const arr = map.get(k) || []
    arr.push(r)
    map.set(k, arr)
  }
  const out: Record<string, ReturnType<typeof lunJiTongJi>> = {}
  for (const [k, rows] of map) out[k] = qu ? lunJiTongJi(rows, qu) : lunJiTongJi(rows)
  return out
}

const gongXianQu = (r: (typeof suoYouLun)[number]) => r.zhiBiao.yuQiCiSheHaoGongXian

const fenZu = {
    zhenRen: ZHEN_REN_JI_XIAN.sheHaoJuZhong,
    zhenRenGongXian: 0,
    // 池化 —— 决策用
    chiHua: lunJiTongJi(suoYouLun),
    // ⚠️ 「语气词+省略号」共现：不受三形态切分口径影响。第十轮正是因中部式口径
    //    漏掉 ISTJ 的「嗯…」而误证伪了语气词假说，故此项为主判据之一。
    chiHuaGongXian: lunJiTongJi(suoYouLun, gongXianQu),
    // per-MBTI —— 仅诊断，单型 CI 太宽不可排名
    anMbti: fenZuTongJi((r) => r.mbti),
    anMbtiGongXian: fenZuTongJi((r) => r.mbti, gongXianQu),
    // G1–G4 —— 仅诊断。⚠️ 基座层已对全部 16 型下达省略/停顿指令，
    //    且 G2 全男性与性别共线、G3 由单一 INFP 支撑 —— 禁止据此声称因果。
    anZu: fenZuTongJi((r) => groupOf(r.mbti)),
    anZuGongXian: fenZuTongJi((r) => groupOf(r.mbti), gongXianQu),
    // 簇级置换检验（第十轮审查建议项 1）—— 判断分组差异的**唯一合法**依据
    zhiHuanJianYan: {
      zhongBuShi: zhiHuanPianYiJianYan((r) => r.zhiBiao.sheHaoJuZhong),
      gongXian: zhiHuanPianYiJianYan(gongXianQu),
    },
    // 协变量分布：证明型间差异能否与好感度阶段/慢热快热分离
    xieBianLiang: {
      guanXiJieDuan: Object.fromEntries(Object.entries(fenZuTongJi((r) => r.guanXiJieDuan)).map(([k, v]) => [k, v.n])),
      reShenLeiXing: Object.fromEntries(Object.entries(fenZuTongJi((r) => r.reShenLeiXing || '未知')).map(([k, v]) => [k, v.n])),
    },
  }

    fs.writeFileSync(luJing, JSON.stringify({ biaoQian, huiZong, fenZu, quanWenHePingJun: juPingJun, suoYouLun }, null, 2), 'utf8')

    console.log(`\n=== ${biaoQian} | 模型 ${huiZong.moXing} | ${场景.length} 场景 × ${lunShu} 轮 ===`)
    console.log(`空回 ${huiZong.kongHuiLunShu} / 降级 ${huiZong.jiangJiMoShiLunShu} / 耗时 ${huiZong.yongShiMiaoZhong}s`)
    console.log(duiBiBiao(duiBiLie as Parameters<typeof duiBiBiao>[0]))

    // 分组结果（M7/M8）：池化给决策，簇级置换给判断，分组仅供诊断
    console.log(`\n--- 省略号中部式（真人 ${(fenZu.zhenRen * 100).toFixed(2)}%）---`)
    console.log(`池化        ${(fenZu.chiHua.pingJun * 100).toFixed(2)}%  n=${fenZu.chiHua.n}  sd=${(fenZu.chiHua.sd * 100).toFixed(2)}pp  名义95%CI±${(fenZu.chiHua.ciBanKuan * 100).toFixed(2)}pp`)
    console.log('⚠️ 上述 CI 是**轮级名义值**，未处理聚类（ICC≈0.165→低估约2.2倍）。判断分组差异请看下面的簇级置换检验。')
    console.log(`\n--- 「语气词+省略号」共现（真人基线未建立）---`)
    console.log(`池化        ${(fenZu.chiHuaGongXian.pingJun * 100).toFixed(2)}%  n=${fenZu.chiHuaGongXian.n}`)
    const g = fenZu.anZu
    const gx = fenZu.anZuGongXian
    console.log('\n--- 分组（仅诊断：基座层已对全部 16 型下达省略指令，且 G2 全男性与性别共线）---')
    console.log(`G1 点名语气词   中部${((g.G1?.pingJun ?? 0) * 100).toFixed(2)}%  共现${((gx.G1?.pingJun ?? 0) * 100).toFixed(2)}%  n=${g.G1?.n ?? 0}`)
    console.log(`G2 点名表情     中部${((g.G2?.pingJun ?? 0) * 100).toFixed(2)}%  共现${((gx.G2?.pingJun ?? 0) * 100).toFixed(2)}%  n=${g.G2?.n ?? 0}`)
    console.log(`G3 点名开句词   中部${((g.G3?.pingJun ?? 0) * 100).toFixed(2)}%  共现${((gx.G3?.pingJun ?? 0) * 100).toFixed(2)}%  n=${g.G3?.n ?? 0}`)
    console.log(`G4 无可开句字面 中部${((g.G4?.pingJun ?? 0) * 100).toFixed(2)}%  共现${((gx.G4?.pingJun ?? 0) * 100).toFixed(2)}%  n=${g.G4?.n ?? 0}`)
    console.log('\n--- 簇级置换检验（G1+G2+G3 合并 vs G4，唯一合法判据）---')
    for (const [ming, jy] of Object.entries(fenZu.zhiHuanJianYan)) {
      const daXiaXian = jy.p <= jy.fenJieXiaXian + 1e-9
      console.log(`  ${ming.padEnd(8)} Δ=${(jy.cha * 100).toFixed(2)}pp  p=${jy.p.toFixed(4)}  分辨率下限=${jy.fenJieXiaXian.toFixed(4)}${daXiaXian ? '  ⚠️已达下限，不可再强' : ''}`)
    }
    console.log('\nper-MBTI（仅诊断，单型 CI ±4pp 级别，不可排名）:')
    for (const [k, v] of Object.entries(fenZu.anMbti).sort()) {
      const x = fenZu.anMbtiGongXian[k]
      console.log(`  ${k.padEnd(6)} 中部${(v.pingJun * 100).toFixed(2)}%  共现${x ? (x.pingJun * 100).toFixed(2) : 'n/a'}%  n=${v.n}`)
    }

    // 省略号三形态：只报数、不判定。
    // ⚠️ 独条形态在真人样本里只有 6 条（0.0105%），期望值远低于 1，
    //    按泊松分布当前样本量下不可测，故不入对比表（见 PROGRESS §2 发现 5）。
    console.log(`\n--- 省略号三形态（独条形态期望值 <1，不入对比表）---`)
    console.log(`独条     ${fmtLv(huiZong.sheHaoDuJie)}`)
    console.log(`在首/尾  ${fmtLv(huiZong.sheHaoMoWei)} ← 阶段 B 实测此项降 5.86pp（字面删除有效）`)
    console.log(`在中部   ${fmtLv(huiZong.sheHaoJuZhong)} ← 阶段 B 实测此项 −0.03pp（字面删除无效，来源未定位）`)

    // ── 机制 D 判据：必须打印 + 自动判定，不能只落 JSON（第四轮审查 Sp-4）──
    // ⚠️ 必须用生产配置模块的解析函数，不能自己读 process.env：
    //    曾各自解析，导致 `TRUE` / ` true ` 下「候选已注入」但报告写「开关=off」（第五轮审查 P0-3）。
    const KAI_GUAN = KAI_CHANG_PEI_ZHI.kaiGuan
    console.log(`\n--- 机制 D 判据（开关=${KAI_GUAN ? 'on' : 'off'}）---`)
    console.log(`M2 开场撞车率   ${fmtLv(huiZong.M2_zhuangCheLv)}（分母=有效轮 ${huiZong.M2_keCeRenLunShu}，共 ${huiZong.lunShu} 轮）`)
    if (huiZong.kaiGuanWeiLunShu > 0) {
      console.log(`⚠️ 有 ${huiZong.kaiGuanWeiLunShu} 轮**未注入候选**（可能是开关关闭，也可能是 Director 拒答 / 预算耗尽 / 违禁词拦截 / Writer 报错，见各轮 cuoWu）`)
      console.log('   → M7/M8 已排除这些轮，本次结果**不能用于评估机制 D**')
    }
    console.log(`M7 候选遵守率   ${fmtLv(huiZong.M7_fuCongLv)}（分母=可判定且已注入候选 ${huiZong.M7_kePanDingLunShu} 轮）`)
    console.log(`M8 逐字复制     ${huiZong.M8_zhengZhiFuZhi} 条（判据 = 0）`)
    console.log(`   开场种类数   ${huiZong.kaiChangGeShu}`)

    // ⚠️ 三态判定：通过 / 不通过 / **不可判定**。
    //    `不可判定` 绝不渲染为 ✅ —— 第五轮审查 P0-2 实测：开关关闭时
    //    `M7_fuCongLv === null` 被 `||` 短路成 true，三项曾「全绿」且 M8 硬门控结构性放行。
    const panDuanLie: Array<{ ming: string; zhuangTai: 'tongGuo' | 'buTongGuo' | 'buKePanDing'; shuoMing: string }> = []
    panDuanLie.push({
      ming: 'M8 逐字复制', zhuangTai: huiZong.M8_zhengZhiFuZhi === 0 ? 'tongGuo' : 'buTongGuo',
      shuoMing: `实际 ${huiZong.M8_zhengZhiFuZhi} 条，判据 = 0`,
    })
    panDuanLie.push({
      ming: 'M7 候选遵守率',
      zhuangTai: huiZong.M7_fuCongLv === null ? 'buKePanDing' : huiZong.M7_fuCongLv >= 0.95 ? 'tongGuo' : 'buTongGuo',
      shuoMing: huiZong.M7_fuCongLv === null
        ? `无可判定轮（未注入候选 ${huiZong.kaiGuanWeiLunShu} 轮）——**不可判定，不是不通过**`
        : `实际 ${fmtLv(huiZong.M7_fuCongLv)}，判据 ≥95%`,
    })
    panDuanLie.push({
      ming: 'M2 开场撞车率', zhuangTai: 'buKePanDing',
      shuoMing: `实际 ${fmtLv(huiZong.M2_zhuangCheLv)}｜⚠️ 绝对阈值 ≤25% 在 ${huiZong.lunShu} 轮规模上无可辩护基线（外推已越界，见 M2基线标定.md），本项**只记录不判定**`,
    })
    console.log('\n--- 判定 ---')
    const BiaoJi = { tongGuo: '✅ 通过', buTongGuo: '❌ 不通过', buKePanDing: '⚠️ 不可判定' } as const
    for (const x of panDuanLie) console.log(`${BiaoJi[x.zhuangTai]}｜${x.ming}：${x.shuoMing}`)
    const youBuKePanDing = panDuanLie.filter((x) => x.zhuangTai === 'buKePanDing' && x.ming !== 'M2 开场撞车率')
    console.log(`\n机制 D 验收结论：${youBuKePanDing.length > 0 ? '⚠️ **不可判定**（M7 无可判定轮——请确认开关已设为 true）' : '可判定'}`)

    console.log('\n--- 前 12 条 AI 原话（人工看语域）---')
    for (const r of suoYouLun.slice(0, 12)) {
      console.log(`[${r.changJing} #${r.lun}] (${r.zhiBiao.tiaoShu}条/均${r.zhiBiao.pingJunZiShu}字) ${r.xiaoXi.map((x) => `「${x}」`).join(' ')}`)
    }

    expect(suoYouLun.length).toBe(场景.length * lunShu)
    // ⚠️ 有效轮占比硬门（第九轮审查 M1）：
      //   suoYouLun 计的是**尝试数**，全部调用失败时它照样等于预期轮数。
      //   必须断言有效轮占比，否则「零成功」会被当成「零退化」通过。
      //   0.9 的阈值容忍偶发空回，但拦不住系统性失败（占比会趋近 0）。
      expect(youXiao.length / suoYouLun.length, `有效轮占比过低（${youXiao.length}/${suoYouLun.length}），疑似全部外呼失败——本次结果不可用`).toBeGreaterThan(0.9)
    // ⚠️ 硬门控前置条件：必须**证得**开关开启，否则 M7/M8 无意义。
    //   曾因只看 `M8 === 0` 而在开关关闭时空数组 reduce 恒 0 → 结构性放行（第五轮审查 P0-2）。
    if (KAI_CHANG_PEI_ZHI.kaiGuan) {
      expect(huiZong.M7_kePanDingLunShu, '开关已开但 M7 无可判定轮——判据链路可能又断了').toBeGreaterThan(0)
      expect(huiZong.M8_zhengZhiFuZhi, 'M8：注入的开场候选被逐字复制成独立消息').toBe(0)
    } else {
      expect(huiZong.kaiGuanWeiLunShu, '开关为关却存在已注入候选的轮——KAI_GUAN 口径与生产不一致').toBe(huiZong.lunShu)
    }
  })
})
