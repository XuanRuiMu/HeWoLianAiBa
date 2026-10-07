import { describe, expect, test, vi, beforeEach } from 'vitest'

/**
 * Writer 开场注入的端到端回归。
 * 审查实测到的 P0：注入分支曾用 `as string` 把内容块数组 String() 化成 "[object Object]"，
 * 触发条件＝本轮发图/表情包 + 开关打开 —— 是生产常见路径（FP-08 图片注入本就高频），
 * 且 HTTP 200、无异常、无日志。这里钉死它。
 */

const tiao = (leiXing: 'yonghu' | 'jiaose', neiRong: string) => ({
  fa_song_zhe_lei_xing: leiXing,
  fa_song_zhe_ming: '对方',
  nei_rong: neiRong,
  shi_jian: '20:40',
})

function zhuShuRu(tuPian: boolean, diYiLun: boolean) {
  return {
    yong_hu_id: 'yong-hu-test',
    jiao_se_id: 'jiao-se-test',
    jiao_se: { id: 'jiao-se-test', wei_xin_ming: '小雨', nian_ling: 22, xing_ge: '慢热', yan_yu_feng_ge: '软糯' },
    hao_gan_du: { zong_fen: 45 },
    dui_hua_li_shi: [tiao('yonghu', '在吗'), tiao('jiaose', '刚洗完澡')],
    yong_hu_xin_xiao_xi: '在干嘛',
    shi_fou_di_yi_lun: diYiLun,
    shi_jian_chang_jing: '22:30',
    tu_pian_shou_quan: tuPian,
  } as never
}

describe('Writer · 开场注入回归（审查 P0）', () => {
  let songChuDeXiaoXi: Array<{ jiaoSe: string; neiRong: unknown }> = []

  beforeEach(() => {
    vi.resetModules()
    songChuDeXiaoXi = []
    vi.doMock('../../utils/DeepSeek客户端', () => ({
      genJuPeiZhiTiaoYong: async (_: string, xiaoXi: Array<{ jiaoSe: string; neiRong: unknown }>) => {
        songChuDeXiaoXi = xiaoXi
        return { neiRong: '刚洗完澡\n你呢', siKaoNeiRong: '' }
      },
    }))
    vi.doMock('../对话渲染', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../对话渲染')>()),
      zhuRuBenLunTuXiangKuai: async () =>
        [{ type: 'input_image', image_url: 'http://x/y.png' }] as never,
    }))
  })

  /** 让「本轮无图片」的场景生效（只替换取图函数，保留其余真实导出） */
  function moWuTuPian() {
    vi.doMock('../对话渲染', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../对话渲染')>()),
      zhuRuBenLunTuXiangKuai: async () => [],
    }))
  }

  test('开关关闭时：prompt 内容与改动前一致，无任何注入文本', async () => {
    vi.stubEnv('KAI_CHANG_QIAN_ZHI_QI_YONG', '')
    moWuTuPian()
    const { shengChengWriterHuiFu } = await import('../Writer')
    await shengChengWriterHuiFu(zhuShuRu(false, false))
    const user = songChuDeXiaoXi[1].neiRong as string
    expect(user).not.toContain('开头两个字请从这几个里挑一个')
    expect(user).toContain('在干嘛')
    vi.unstubAllEnvs()
  })

  test('开关打开 + 无图片：约束文本以字符串追加，人设与首轮指令均保留', async () => {
    vi.stubEnv('KAI_CHANG_QIAN_ZHI_QI_YONG', 'true')
    moWuTuPian()
    const { shengChengWriterHuiFu } = await import('../Writer')
    await shengChengWriterHuiFu(zhuShuRu(false, true))
    const user = songChuDeXiaoXi[1].neiRong as string
    expect(user).toContain('开头两个字请从这几个里挑一个')
    expect(user).toContain('在干嘛')
    // YH-050 首轮沉浸指令不得因开关打开而丢失
    expect(user).toContain('【从现在起，你就是TA】')
    vi.unstubAllEnvs()
  })

test('⚠️ 开关打开 + 有图片：不得出现 [object Object]，人设必须仍在', async () => {
      vi.stubEnv('KAI_CHANG_QIAN_ZHI_QI_YONG', 'true')
      const { shengChengWriterHuiFu } = await import('../Writer')
      await shengChengWriterHuiFu(zhuShuRu(true, false))
      const user = songChuDeXiaoXi[1].neiRong
      const wen = JSON.stringify(user)
      expect(wen).not.toContain('[object Object]')
      expect(Array.isArray(user)).toBe(true)
      const kuai = user as Array<Record<string, unknown>>
      expect(kuai.some((k) => k['type'] === 'input_image')).toBe(true)
      const wenBenDai = kuai.filter((k) => k['type'] === 'input_text').map((k) => String(k['text'])).join('')
      expect(wenBenDai).toContain('在干嘛')
      expect(wenBenDai).toContain('开头两个字请从这几个里挑一个')
      vi.unstubAllEnvs()
    })

    test('⚠️ 必须回传本轮实际注入的候选（第三轮审查 Sp-1/Sp-5：缺它则 M7 恒为 0）', async () => {
vi.stubEnv('KAI_CHANG_QIAN_ZHI_QI_YONG', 'true')
      moWuTuPian()
      const { shengChengWriterHuiFu } = await import('../Writer')
      const r = await shengChengWriterHuiFu(zhuShuRu(false, false))
      expect(Array.isArray(r.kai_chang_hou_xuan)).toBe(true)
      expect(r.kai_chang_hou_xuan!.length).toBeGreaterThan(0)
      // 候选必须与真正写进 prompt 的一致，否则 M7 测的是另一次抽样
      const user = songChuDeXiaoXi[1].neiRong as string
      for (const k of r.kai_chang_hou_xuan!) expect(user).toContain(k)
      vi.unstubAllEnvs()
    })

    test('开关关闭时不回传候选（M7/M8 应被跳过而非算废数）', async () => {
      vi.stubEnv('KAI_CHANG_QIAN_ZHI_QI_YONG', '')
      moWuTuPian()
      const { shengChengWriterHuiFu } = await import('../Writer')
      const r = await shengChengWriterHuiFu(zhuShuRu(false, false))
      expect(r.kai_chang_hou_xuan).toBeUndefined()
      vi.unstubAllEnvs()
    })
})

/**
 * 第三轮审查 Sp-5 实测：候选回传链 `开场候选约束 → Writer → AI引擎 → AIYinQingShuChu`
 * 此前**没有任何测试**保护，靠人工探针。缺 `yuan_wen` 会让 M7 恒为 0 而无人察觉。
 */
describe('AI引擎 · 开场候选与原文透传', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('KAI_CHANG_QIAN_ZHI_QI_YONG', 'true')
    vi.doMock('../Director', () => ({
      shengChengDirectorCeLue: async () => ({
        // ⚠️ 字段名是 ce_lue（下划线），AI引擎.ts:192 按 `directorJieGuo.ce_lue` 取值。
        //    写成 `ceLue` 会让 ceLue 保持 undefined → 走「Director 失败」降级分支，
        //    Writer 拿不到策略，候选与原文都不产生。
        // ⚠️ 必须给 shi_fou_hui_fu: true —— AI引擎.ts:221 是 `if (ceLue && !ceLue.shi_fou_hui_fu)`
        //    提前返回，缺失会让取反为 true 而跳过整个 Writer。
        ce_lue: { shi_fou_hui_fu: true, hui_fu_ce_lue: '自然发挥', shi_jian_qing_xu: '正常', hui_fu_tiao_shu: 2 },
        // ⚠️ 字段名是 si_kao（下划线），AI引擎.ts:190 读的也是 si_kao。
        //    写 directorSiKao 会让 chu.si_kao.director 恒为 undefined。
        si_kao: '',
      }),
    }))
    vi.doMock('../开场白生成', () => ({ tianJiaXiaoBai: () => '' }))
    vi.doMock('../对话渲染', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../对话渲染')>()),
      zhuRuBenLunTuXiangKuai: async () => [],
    }))
    vi.doMock('../../utils/DeepSeek客户端', () => ({
      genJuPeiZhiTiaoYong: async (_t: string, xiaoXi: Array<{ neiRong: unknown }>) => {
        // 从真实 prompt 里抠出实际注入的候选，再回显其中之一。
        // ⚠️ 不能写死字符串：候选是随机采样的，写死就无法判定 M7。
        // ⚠️ 取**最后一个**含「 / 」的括号组：prompt 里还有其他括号内容。
        const yu = String(xiaoXi[1]?.neiRong ?? '')
        const zuoDuan = yu.match(/（[^）]*\/[^）]*）/g)?.pop() ?? ''
        const houXuan = ((zuoDuan.split('：').pop() ?? '').split('；')[0]).split(' / ').map((x) => x.trim()).filter((x) => x.length > 0)
        return { neiRong: (houXuan[0] || '哈哈') + '，刚躺下没多久\n你呢', siKaoNeiRong: '' }
      },
      jianChengGong: () => { },
    }))
  })

  test('候选与 Writer 原文都必须到达 AIYinQingShuChu', async () => {
    const { yunXingAIYinQing } = await import('../AI引擎')
    const chu = await yunXingAIYinQing(zhuShuRu(false, false) as never)
    // ① 候选回传：与 prompt 内实际注入的候选逐字一致
    expect(Array.isArray(chu.kai_chang_hou_xuan)).toBe(true)
    expect(chu.kai_chang_hou_xuan!.length).toBeGreaterThan(0)
    // ② Writer 原文回传：缺它则 M7 遵守率恒为 0（第三轮审查 Sp-1 实测的 P0）
    expect(chu.yuan_wen).toBeTruthy()
    expect(chu.yuan_wen).toContain(chu.kai_chang_hou_xuan![0])
    // ③ 端到端：M7 能真的判定出「服从」
    const { tongJiLun, huiZongPanDuan } = await import('../开场判据统计')
    const panDuan = tongJiLun([], chu.yuan_wen || '', chu.xiao_xi_lie_biao, chu.kai_chang_hou_xuan || [])
    const h = huiZongPanDuan([{ ...panDuan, kaiGuanKaiQi: true }])
    expect(h.M7_kePanDingLunShu).toBe(1)
    expect(h.M7_fuCongLv).toBe(1)
    vi.unstubAllEnvs()
  })
})
