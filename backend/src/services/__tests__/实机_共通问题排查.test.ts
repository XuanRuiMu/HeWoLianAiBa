/* eslint-disable no-console -- 实机测试脚本职责就是打印 */
import { describe, expect, test } from 'vitest'
import { shengChengWriterHuiFu } from '../Writer'
import { shengChengJiaoSe } from '../角色生成'
import type { DuiHuaLiShiXiang } from '../../types'

const liShi: DuiHuaLiShiXiang[] = [
  { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '在吗', shi_jian: '20:31' },
  { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '微信名', nei_rong: '嗯？怎么了', shi_jian: '20:31' },
]

function gao(mbti: string, fanwei: string, xin: number, qin: number, qu: number, guan: number, zong: number, xingBie: 'nan' | 'nv' = 'nv') {
  return {
    yong_hu_id: 'yu-liao-yong-hu', jiao_se_id: `${mbti}-${fanwei}`,
    jiao_se: shengChengJiaoSe({ yong_hu_id: 'yu-liao-yong-hu', mbti_lei_xing: mbti as never, xing_bie: xingBie }) as never,
    hao_gan_du: { xin_ren_du: xin, qin_mi_du: qin, qu_wei_du: qu, guan_huai_du: guan, zong_fen: zong, guan_xi_jie_duan: fanwei } as never,
    dui_hua_li_shi: liShi, yong_hu_xin_xiao_xi: '今天好累啊，论文写不动', shi_fou_di_yi_lun: false, tu_pian_shou_quan: false,
  }
}

describe.skipIf(process.env.XU_KE_ZHEN_SHI_WAI_HU !== 'true')('实机：多组合共通问题排查', () => {
  const cases: Array<[string, string, number, number, number, number, number]> = [
    ['INTJ', 'reLian', 70, 75, 60, 70, 800],
    ['INFP', 'lengDan', 20, 10, 10, 20, 100],
    ['ESTP', 'lengDan', 15, 10, 15, 10, 90],
    ['ENFP', 'reLian', 75, 80, 75, 70, 850],
    ['ENTJ', 'pengYou', 50, 45, 55, 45, 470],
    ['ISFP', 'aiMei', 50, 45, 50, 55, 560],
  ]
  cases.forEach(([mbti, fanwei, xin, qin, qu, guan, zong]) => {
    test(`${mbti}×${fanwei}`, { timeout: 120_000 }, async () => {
      const r = await shengChengWriterHuiFu({ ...gao(mbti, fanwei, xin, qin, qu, guan, zong) }, undefined, undefined)
      console.log(`【${mbti}×${fanwei}】`, JSON.stringify(r.xiao_xi_lie_biao))
      expect(r.xiao_xi_lie_biao.length).toBeGreaterThan(0)
    }, 120_000)
  })
})
