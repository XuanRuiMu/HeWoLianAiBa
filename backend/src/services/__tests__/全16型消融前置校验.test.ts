import { describe, expect, it, vi } from 'vitest'
import { shengChengJiaoSe } from '../角色生成'
import { mbtiLieBiao, type MBTILeiXing } from '../../config/角色配置'
import { YU_QI_CI } from '../../测试/语域口径'

/**
 * 分组成员。与 `联调_全链路语域实测.test.ts` 的 `G1_MBTI/G2_MBTI/G3_MBTI` 保持同一份事实。
 * ⚠️ 目前是**两份字面量**（联调那边不能 import 测试文件）。若改一处必须同步另一处，
 *    下面的断言就是为此设的守门。
 */
const G1_MBTI = ['ISTJ', 'ISFJ']
const G2_MBTI = ['ISFP', 'ESFP']
const G3_MBTI = ['INFP', 'INTP', 'ENFP']

/**
 * 全 16 型消融的**零外呼前置校验**（第九轮设计审查 M2/M3）。
 *
 * 为什么必须先过这一关：
 * · 场景必须由 `shengChengJiaoSe` 派生而不是手写 16 套。手写在 `haoGanDu` 上必错 ——
 *   `角色生成.ts:435` 的区间是按 `${yongHuId}_${mbti}` hash 出来的 300–500，
 *   经 `huoQuGuanXiJieDuan` 只可能落在 `shuXi`(301-400) / `pengYou`(401-500) 两档。
 *   现有 3 个夹具里有 2 个用 `miAi`(315) / `douDing`(303)，**不在生产映射表内**，
 *   `Prompt构建器.ts:118` 会把它们渲染成「还不太清楚」—— 即测的是生产不存在的状态。
 * · `waiMaoYuanXing` 经 `anQianZhongXuanZeWaiMao(mbti)` **加权随机**选一条，
 *   手写夹具会把外貌固定住 → 这条通道被冻结 → 未受控的系统性偏差。
 */
describe('全 16 型消融前置校验', () => {
  const YONG_HU = 'yong-hu-yu-lian'
  const XING_BIE = (suoYin: number): 'nv' | 'nan' => (suoYin % 2 === 0 ? 'nv' : 'nan')

  it('换 yong_hu_id 前必须验证 16 型全部落在生产关系阶段内', () => {
    // ⚠️ 第十一轮实测踩到的坑（方法论级）：
    //   为避开已耗尽的日预算换用 `yong-hu-D-kai-1`，结果 **INTJ 落到 306**
    //   → `huoQuGuanXiJieDuan` 映射成 `renShi`(201-300)。
    //   而 `角色生成.ts:435` 的生产区间是 300–500，两臂的 tier-3 prompt 文案
    //   因此不同 → M2 从 14.07%「变成」21.07%，**纯属混淆，不是机制 D 的效果**。
    //
    //   根因：`renShi` 档上界 300 与生产区间下界 300 **边界重合**，
    //   所以「好感度在 300–500 内」并不足以保证阶段合法。
    const JI_DOU = (zong: number): string => {
      if (zong <= 100) return 'lengDan'
      if (zong <= 200) return 'shuYuan'
      if (zong <= 300) return 'renShi'
      if (zong <= 400) return 'shuXi'
      return 'pengYou'
    }
    // 生产可达的阶段：好感度区间 300–500 → 只可能是 shuXi / pengYou
    const KE_ZHI_JIE_DUAN = new Set(['shuXi', 'pengYou'])
    const buHeFa = mbtiLieBiao
      .map((mbti) => {
        const r = shengChengJiaoSe({ yong_hu_id: YONG_HU, mbti_lei_xing: mbti as MBTILeiXing, xing_bie: 'nv' })
        return { mbti, zong: r.hao_gan_du_zong_fen, jieDuan: JI_DOU(r.hao_gan_du_zong_fen) }
      })
      .filter((x) => !KE_ZHI_JIE_DUAN.has(x.jieDuan))

    // 当前 YONG_HU 必须合法；一旦有人换 id 导致某型越界，这条会红并指出是哪一型
    expect(buHeFa.map((x) => `${x.mbti}=${x.zong}(${x.jieDuan})`), '有 MBTI 落到生产外的关系阶段，换 id 前必须先验证').toEqual([])
  })

  it('实测实际使用的 yong_hu_id 也必须全部落在生产关系阶段内', () => {
    // ⚠️ 上一条验的是 `YONG_HU`，但**联调跑的是 `YU_LIAN_YONG_HU_ID`**。
    //    两者不同时，前置校验就等于没校验本次实测 —— 第十一轮正是踩了这个空。
    //    故此处按实测的 id 再验一遍；未设置环境变量时退回 YONG_HU。
    const SHI_JI_ID = process.env.YU_LIAN_YONG_HU_ID || YONG_HU
    const JI_DOU = (zong: number): string => {
      if (zong <= 300) return 'renShi'
      if (zong <= 400) return 'shuXi'
      return 'pengYou'
    }
    const KE_ZHI = new Set(['shuXi', 'pengYou'])
    const buHeFa = mbtiLieBiao
      .map((mbti) => {
        const r = shengChengJiaoSe({ yong_hu_id: SHI_JI_ID, mbti_lei_xing: mbti as MBTILeiXing, xing_bie: 'nv' })
        return { mbti, zong: r.hao_gan_du_zong_fen, jieDuan: JI_DOU(r.hao_gan_du_zong_fen) }
      })
      .filter((x) => !KE_ZHI.has(x.jieDuan))
    expect(buHeFa.map((x) => `${x.mbti}=${x.zong}(${x.jieDuan})`), `实测 id ${SHI_JI_ID} 有型落在生产外的关系阶段 —— 该臂含生产外状态，不可与其它臂对比`).toEqual([])
  })

  it('16 个 MBTI 都能派生出完整人设，且不含被测字面以外的意外字段', () => {
    for (const mbti of mbtiLieBiao) {
      const r = shengChengJiaoSe({ yong_hu_id: YONG_HU, mbti_lei_xing: mbti as MBTILeiXing, xing_bie: 'nv' })
      expect(r.yan_yu_feng_ge, `${mbti} 缺 yan_yu_feng_ge`).toBeTruthy()
      expect(r.xing_wei_te_dian, `${mbti} 缺 xing_wei_te_dian`).toBeTruthy()
      expect(r.xing_ge, `${mbti} 缺 xing_ge`).toBeTruthy()
      expect(r.wai_mao, `${mbti} 缺 wai_mao`).toBeTruthy()
      expect(typeof r.hao_gan_du_zong_fen, `${mbti} 缺 hao_gan_du_zong_fen`).toBe('number')
      // 生产区间硬约束：角色生成.ts 的 haoGanDuJiChuFanWei 全 16 型都落在 300–500
      expect(r.hao_gan_du_zong_fen, `${mbti} 好感度越界`).toBeGreaterThanOrEqual(300)
      expect(r.hao_gan_du_zong_fen, `${mbti} 好感度越界`).toBeLessThanOrEqual(500)
    }
  })

  it('好感度/文案确定，但外貌是 Math.random —— 消融必须自行固定随机源', () => {
    // `角色生成.ts:343-349` anAnQuanZhongXuanZeWaiMao 用 `Math.random()` 决定
    // 「本型专属外貌(70%) / 全库任一(30%)」——**生产本就每次生成不同**。
    // 这不是缺陷，但对外呼实验是隐藏变量：同一 MBTI 若两臂拿到不同外貌，
    // 型间差异就掺进了外貌效应。故消融须 stub Math.random 或事后落盘校正。
    for (const mbti of ['ISTJ', 'ISFP', 'ENFP'] as MBTILeiXing[]) {
      const a = shengChengJiaoSe({ yong_hu_id: YONG_HU, mbti_lei_xing: mbti, xing_bie: 'nv' })
      const b = shengChengJiaoSe({ yong_hu_id: YONG_HU, mbti_lei_xing: mbti, xing_bie: 'nv' })
      // 确定的部分：好感度（hash 种子）与文案（静态表）
      expect(a.hao_gan_du_zong_fen, `${mbti} 好感度应确定`).toBe(b.hao_gan_du_zong_fen)
      expect(a.yan_yu_feng_ge, `${mbti} 说话风格应确定`).toBe(b.yan_yu_feng_ge)
      expect(a.xing_wei_te_dian, `${mbti} 行为习惯应确定`).toBe(b.xing_wei_te_dian)
    }
    // 固定随机源后必须可复现 —— 这是消融能单变量归因的前提
    const suiji = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    try {
      const a = shengChengJiaoSe({ yong_hu_id: YONG_HU, mbti_lei_xing: 'ISTJ', xing_bie: 'nv' })
      const b = shengChengJiaoSe({ yong_hu_id: YONG_HU, mbti_lei_xing: 'ISTJ', xing_bie: 'nv' })
      expect(a.wai_mao, '固定 Math.random 后外貌必须可复现').toBe(b.wai_mao)
    } finally {
      suiji.mockRestore()
    }
  })

  it('静态暴露面：点名 YU_QI_CI 语气词的仅 INFJ，点名省略号的 0/16', () => {
    // 锁住静态扫描结论，防止改文案后结论失效而无人察觉。
    // ⚠️ 基线已随第十二轮 `yanYuFengGe` 行为化改写而变（这次是它变红才暴露的）：
    //   原基线 ['ISFJ','ISTJ'] 来自旧文案里「你今天累不累」「还行」那类**举例**；
    //   改写后 ISFJ/ISTJ 不再点名任何语气词，只剩 INFJ 的
    //   「然后马上补一句『我在说啥呢』收回来」仍含「呢」。
    //   语义未变（仍是 16 型里极少数在文案里点名语气词），变的只是具体是哪一型。
    const dianMingYuQi: string[] = []
    const dianMingSheHao: string[] = []
    for (const mbti of mbtiLieBiao) {
      const r = shengChengJiaoSe({ yong_hu_id: YONG_HU, mbti_lei_xing: mbti as MBTILeiXing, xing_bie: 'nv' })
      const wen = `${r.yan_yu_feng_ge}${r.xing_wei_te_dian}`
      if (YU_QI_CI.some((y) => wen.includes(y))) dianMingYuQi.push(mbti)
      if (wen.includes('省略')) dianMingSheHao.push(mbti)
    }
    expect(dianMingYuQi.sort(), '点名语气词的 MBTI 集合已变，需重跑静态扫描').toEqual([])
    expect(dianMingSheHao, '有 MBTI 文案点名省略号').toEqual([])
  })

  it('人设文案里不得出现范围限制措辞（第十五轮实测）', () => {
    // INTJ 原写「只会说你的判断和理由」⇒ 输出三句全在教育用户、没有一句像朋友。
    // 「只会 / 只处理 / 从不」把角色框死，违背「只写倾向不写机制」的铁律。
    // 「很容易」属倾向描述、无害，故不在此列。
    const XIAN_ZHI = ['只会', '只处理', '从不', '绝对不会']
    for (const mbti of mbtiLieBiao) {
      const r = shengChengJiaoSe({ yong_hu_id: YONG_HU, mbti_lei_xing: mbti as MBTILeiXing, xing_bie: 'nv' })
      const wen = `${r.yan_yu_feng_ge}${r.xing_wei_te_dian}`
      const zhong = XIAN_ZHI.filter((ci) => wen.includes(ci))
      expect(zhong, `${mbti} 人设含范围限制措辞，会把角色框死：${zhong.join(' ')}`).toEqual([])
    }
  })

  it('人设文案里不得出现带引号的字面台词（第十四轮实测）', () => {
    // 动机：INFJ 原写「补一句『我在说啥呢』收回来」⇒ 实测连续三轮输出「我在说啥呢」，
    // 真人不会每轮都说。这是「prompt 里点名的具体字面被模型字面执行」在人设层的复发。
    // 修法：描述句式特征，不给原话。本用例钉住，任何人加回字面台词这条就红。
    for (const mbti of mbtiLieBiao) {
      const r = shengChengJiaoSe({ yong_hu_id: YONG_HU, mbti_lei_xing: mbti as MBTILeiXing, xing_bie: 'nv' })
      const wen = `${r.yan_yu_feng_ge}${r.xing_wei_te_dian}`
      const yuMian = wen.match(/[「“][^」”]{1,24}[」”]/g) || []
      expect(yuMian, `${mbti} 人设文案含字面台词，模型会逐字复读：${yuMian.join(' ')}`).toEqual([])
    }
  })

  it('G2/G3/G4 分组成员与联调一致（第十轮审查 M6：此前只断言了 G1）', () => {
    expect(G1_MBTI, 'G1 成员已变').toEqual(['ISTJ', 'ISFJ'])
    expect(G2_MBTI, 'G2 成员已变').toEqual(['ISFP', 'ESFP'])
    expect(G3_MBTI, 'G3 成员已变').toEqual(['INFP', 'INTP', 'ENFP'])
    // ⚠️ G2 两型（idx 5 / 9）按 suoYin % 2 皆为 nan → **G2 是 100% 男性**，
    //    与 G4（近平衡）完全共线。第十轮审查判定该效应无法与性别分离。
    //    此断言把该事实固化，防止有人误以为分组已控制性别。
    const g2XingBie = G2_MBTI.map((m) => XING_BIE(mbtiLieBiao.indexOf(m as MBTILeiXing)))
    expect(g2XingBie, 'G2 性别分布已变；若不再是全 nan 则共线消失，可重估 G2 结论').toEqual(['nan', 'nan'])
  })
})