/* eslint-disable no-console -- 实机测试脚本职责就是打印 */
import { describe, expect, test } from 'vitest'
import { shengChengWriterHuiFu } from '../Writer'
import { shengChengJiaoSe } from '../角色生成'
import type { DuiHuaLiShiXiang } from '../../types'

/**
 * 实机测试：用 deepseek-flash 验证「关系阶段话术骨架」对输出的影响。
 * 变量控制：同一角色(mbti)、同一用户消息、同一历史，只有 hao_gan_du.guan_xi_jie_duan 不同。
 * 现状（未加话术骨架）基线：冷淡期 vs 热恋期，Writer 输出是否已分化。
 */
describe.skipIf(process.env.XU_KE_ZHEN_SHI_WAI_HU !== 'true')('实机：阶段话术骨架', () => {
  test('同一角色冷淡期 vs 热恋期 输出对比', { timeout: 300_000 }, async () => {
    const renShe = shengChengJiaoSe({
      yong_hu_id: 'shi-ji-yong-hu',
      mbti_lei_xing: 'ISFJ',
      xing_bie: 'nv',
    })
    const liShi: DuiHuaLiShiXiang[] = [
      { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '在吗', shi_jian: '20:31' },
      { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '微信名', nei_rong: '嗯？怎么了', shi_jian: '20:31' },
    ]
    const base = {
      yong_hu_id: 'shi-ji-yong-hu',
      jiao_se_id: 'shi-ji-jiao-se',
      jiao_se: renShe as never,
      dui_hua_li_shi: liShi,
      yong_hu_xin_xiao_xi: '今天好累啊',
      shi_fou_di_yi_lun: false,
      tu_pian_shou_quan: false,
    }

    const lengDan = await shengChengWriterHuiFu(
      { ...base, hao_gan_du: { xin_ren_du: 10, qin_mi_du: 5, qu_wei_du: 5, guan_huai_du: 5, zong_fen: 60, guan_xi_jie_duan: 'lengDan' } as never },
      undefined,
      undefined,
    )
    const reLian = await shengChengWriterHuiFu(
      { ...base, hao_gan_du: { xin_ren_du: 80, qin_mi_du: 85, qu_wei_du: 70, guan_huai_du: 75, zong_fen: 880, guan_xi_jie_duan: 'reLian' } as never },
      undefined,
      undefined,
    )

    console.log('【冷淡期】', JSON.stringify(lengDan.xiao_xi_lie_biao, null, 2))
    console.log('【热恋期】', JSON.stringify(reLian.xiao_xi_lie_biao, null, 2))
    expect(lengDan.xiao_xi_lie_biao.length).toBeGreaterThan(0)
    expect(reLian.xiao_xi_lie_biao.length).toBeGreaterThan(0)
  }, 120_000)
})
