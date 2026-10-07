/* eslint-disable no-console -- 实机测试脚本职责就是打印 */
import { describe, expect, test } from 'vitest'
import { shengChengWriterHuiFu } from '../Writer'
import { shengChengJiaoSe } from '../角色生成'
import { mbtiLieBiao } from '../../config/角色配置'
import type { DuiHuaLiShiXiang } from '../../types'

const liShi: DuiHuaLiShiXiang[] = [
  { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '在吗', shi_jian: '20:31' },
  { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '微信名', nei_rong: '嗯？怎么了', shi_jian: '20:31' },
]

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

describe.skipIf(process.env.XU_KE_ZHEN_SHI_WAI_HU !== 'true')('实机：全16型最终验收', () => {
  mbtiLieBiao.forEach((mbti, i) => {
    test(`${mbti}`, { timeout: 120_000 }, async () => {
      await new Promise((r) => setTimeout(r, 8000))
      const renShe = shengChengJiaoSe({ yong_hu_id: 'shi-ji-yh', mbti_lei_xing: mbti, xing_bie: i % 2 === 0 ? 'nv' : 'nan' })
      const zong = (renShe as { hao_gan_du_zong_fen: number }).hao_gan_du_zong_fen
      const r = await shengChengWriterHuiFu(
        {
          yong_hu_id: 'shi-ji-yh', jiao_se_id: `${mbti}-yh`,
          jiao_se: renShe as never,
          hao_gan_du: { xin_ren_du: Math.round(zong * 0.35), qin_mi_du: Math.round(zong * 0.25), qu_wei_du: Math.round(zong * 0.2), guan_huai_du: Math.round(zong * 0.2), zong_fen: zong, guan_xi_jie_duan: guanXiJieDuan(zong) } as never,
          dui_hua_li_shi: liShi, yong_hu_xin_xiao_xi: '今天差点迟到 笑死 闹钟没响', shi_fou_di_yi_lun: false, tu_pian_shou_quan: false,
        },
        undefined, undefined,
      )
      console.log(`【${mbti}×${guanXiJieDuan(zong)}】`, JSON.stringify(r.xiao_xi_lie_biao))
      expect(r.xiao_xi_lie_biao.length).toBeGreaterThan(0)
    }, 120_000)
  })
})
