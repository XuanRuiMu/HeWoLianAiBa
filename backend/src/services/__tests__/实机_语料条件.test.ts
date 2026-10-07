/* eslint-disable no-console -- 实机测试脚本职责就是打印 */
import { describe, expect, test } from 'vitest'
import { shengChengWriterHuiFu } from '../Writer'
import { shengChengJiaoSe } from '../角色生成'
import type { DuiHuaLiShiXiang } from '../../types'

const liShi: DuiHuaLiShiXiang[] = [
  { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '在吗', shi_jian: '20:31' },
  { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '微信名', nei_rong: '嗯？', shi_jian: '20:31' },
]

function gao(mbti: string, xingBie: 'nan' | 'nv', fanwei: string, xin: number, qin: number, qu: number, guan: number, zong: number) {
  return {
    yong_hu_id: 'yu-liao-yong-hu', jiao_se_id: `${mbti}-${fanwei}`,
    jiao_se: shengChengJiaoSe({ yong_hu_id: 'yu-liao-yong-hu', mbti_lei_xing: mbti as never, xing_bie: xingBie }) as never,
    hao_gan_du: { xin_ren_du: xin, qin_mi_du: qin, qu_wei_du: qu, guan_huai_du: guan, zong_fen: zong, guan_xi_jie_duan: fanwei } as never,
    dui_hua_li_shi: liShi, yong_hu_xin_xiao_xi: '', shi_fou_di_yi_lun: false, tu_pian_shou_quan: false,
  }
}

describe.skipIf(process.env.XU_KE_ZHEN_SHI_WAI_HU !== 'true')('实机：语料条件×AI输出', () => {
  test('S1 ISTJ×lengDan 事务报备', { timeout: 120_000 }, async () => {
    const r = await shengChengWriterHuiFu({ ...gao('ISTJ', 'nv', 'lengDan', 10, 5, 5, 5, 60), yong_hu_xin_xiao_xi: '嗯' }, undefined, undefined)
    console.log('【S1 ISTJ×冷淡】', JSON.stringify(r.xiao_xi_lie_biao))
    expect(r.xiao_xi_lie_biao.length).toBeGreaterThan(0)
  }, 120_000)

  test('S2 ESFJ×reLian 暖心关心', { timeout: 120_000 }, async () => {
    const r = await shengChengWriterHuiFu({ ...gao('ESFJ', 'nv', 'reLian', 80, 85, 70, 80, 880), yong_hu_xin_xiao_xi: '今天累死了' }, undefined, undefined)
    console.log('【S2 ESFJ×热恋】', JSON.stringify(r.xiao_xi_lie_biao))
    expect(r.xiao_xi_lie_biao.length).toBeGreaterThan(0)
  }, 120_000)

  test('S3 ENTP×pengYou 朋友拌嘴', { timeout: 120_000 }, async () => {
    const r = await shengChengWriterHuiFu({ ...gao('ENTP', 'nan', 'pengYou', 50, 45, 60, 40, 460), yong_hu_xin_xiao_xi: '我今天考试考砸了' }, undefined, undefined)
    console.log('【S3 ENTP×朋友】', JSON.stringify(r.xiao_xi_lie_biao))
    expect(r.xiao_xi_lie_biao.length).toBeGreaterThan(0)
  }, 120_000)

  test('S4 ISFJ×aiMei 暧昧破冰', { timeout: 120_000 }, async () => {
    const r = await shengChengWriterHuiFu({ ...gao('ISFJ', 'nv', 'aiMei', 55, 50, 55, 60, 600), yong_hu_xin_xiao_xi: '哈哈今天被老师夸了' }, undefined, undefined)
    console.log('【S4 ISFJ×暧昧】', JSON.stringify(r.xiao_xi_lie_biao))
    expect(r.xiao_xi_lie_biao.length).toBeGreaterThan(0)
  }, 120_000)
})
