/* eslint-disable no-console -- 实机测试脚本职责就是打印 */
import { describe, expect, test } from 'vitest'
import { shengChengWriterHuiFu } from '../Writer'
import { shengChengJiaoSe } from '../角色生成'
import type { DuiHuaLiShiXiang } from '../../types'

describe.skipIf(process.env.XU_KE_ZHEN_SHI_WAI_HU !== 'true')('实机：10轮长对话像人量化', () => {
  test('ISFJ 10轮输出 vs 真人基线', { timeout: 600_000 }, async () => {
    const renShe = shengChengJiaoSe({ yong_hu_id: 'shi-ji-yh', mbti_lei_xing: 'ISFJ', xing_bie: 'nv' })
    const zong = (renShe as { hao_gan_du_zong_fen: number }).hao_gan_du_zong_fen
    const guanXi = zong <= 400 ? 'shuXi' : zong <= 600 ? 'haoYou' : 'aiMei'
    const hao = { xin_ren_du: Math.round(zong * 0.35), qin_mi_du: Math.round(zong * 0.25), qu_wei_du: Math.round(zong * 0.2), guan_huai_du: Math.round(zong * 0.2), zong_fen: zong, guan_xi_jie_duan: guanXi }
    const yongHuJuBen = ['在吗', '我今天差点迟到 闹钟没响', '你室友呢', '我刚洗完澡头发还湿着', '宿舍那只猫又上我床了', '你上课累不累']
    const liShi: DuiHuaLiShiXiang[] = []
    const allOut: string[] = []
    for (const msg of yongHuJuBen) {
      liShi.push({ fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: msg, shi_jian: '20:31' })
      await new Promise((r) => setTimeout(r, 15000))
      const r = await shengChengWriterHuiFu(
        { yong_hu_id: 'shi-ji-yh', jiao_se_id: 'isfj-yh', jiao_se: renShe as never, hao_gan_du: hao as never, dui_hua_li_shi: [...liShi], yong_hu_xin_xiao_xi: msg, shi_fou_di_yi_lun: false, tu_pian_shou_quan: false },
        undefined, undefined,
      )
      allOut.push(...r.xiao_xi_lie_biao)
      for (const m of r.xiao_xi_lie_biao) liShi.push({ fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '微信名', nei_rong: m, shi_jian: '20:32' })
    }
    const 条字数 = allOut.map((m) => m.replace(/[^一-龥a-zA-Z0-9]/g, '').length)
    const 均字 = 条字数.reduce((a, b) => a + b, 0) / 条字数.length
    const 方差 = 条字数.reduce((a, b) => a + (b - 均字) ** 2, 0) / 条字数.length
    const CoV = Math.sqrt(方差) / 均字
    const emoji条 = allOut.filter((m) => /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(m)).length
    const 问号条 = allOut.filter((m) => /[?？]/.test(m)).length
    const 句号条 = allOut.filter((m) => /。/.test(m)).length
    console.log('【10轮输出】', JSON.stringify(allOut, null, 2))
    console.log(`【指标】总条数=${allOut.length} 平均字/条=${均字.toFixed(1)} 句长CoV=${CoV.toFixed(2)} emoji条=${emoji条}/${allOut.length} 问号条=${问号条} 句号条=${句号条}`)
    console.log('【真人基线 LCCC】平均字/条=11.9, CoV≈SD/均=10.5/11.9≈0.88')
    expect(allOut.length).toBeGreaterThan(0)
  }, 600_000)
})
