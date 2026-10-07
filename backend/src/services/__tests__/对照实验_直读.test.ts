/* eslint-disable no-console -- 本脚本的职责就是打印实测原文到stdout */
import { describe, expect, test } from 'vitest'
import { yunXingAIYinQing } from '../AI引擎'
import { shengChengJiaoSe } from '../角色生成'
import type { AIJiaoSeXinXi, AIYinQingShuRu, DuiHuaLiShiXiang, HaoGanDuXinXi } from '../../types'
import * as fs from 'node:fs'

/**
 * 极小对照实验：只发两次消息，控制变量，用于直读判定。
 *
 * 目的不是统计，是**看原文**。判据只有一个（用户定稿）：
 *   「这条回复由这个性格的真人发出去，是否可能？」
 *
 * 为什么不跑多轮：多轮会把「单次生成的运气」和「机制造成的偏差」混在一起，
 * 看不出改动到底改没改到点上。两次对照足够暴露方向。
 *
 * 双门（与联调同一纪律）：XU_KE_ZHEN_SHI_WI_HU 不设时 baseUrl 会被改成 127.0.0.1:9，
 * 跑出空结果却全绿 —— 必须显式断言。
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

/** 只挑几种性格差异最大的，避免 16 型烧额度又看不出东西 */
const XING = (process.env.SHI_YAN_XING || 'ISTJ,ESFP,ENFP,INTP').split(',')
const LUN_SHU = Number(process.env.SHI_YAN_LUN || '2')
const LUO_PAN = process.env.SHI_YAN_LUO_PAN || './out_对照实验.json'

/** 用户脚本：刻意取「有具体事、可以接着说」的普通话题，不给情绪引导 */
const JU_BEN = [
  '今天差点迟到 笑死 闹钟没响',
  '我室友在打游戏吵死了',
  '我论文一个字都写不动',
  '宿舍那只猫今天又上我床了',
]

describe.skipIf(process.env.SHI_YAN_WAI_HU !== 'true')('对照实验：直读原文', () => {
  test('同一输入跑指定性格，直读原文', { timeout: 900_000 }, async () => {
    expect(process.env.XU_KE_ZHEN_SHI_WAI_HU, '没开真实外呼：test-setup 会把 baseUrl 改成 127.0.0.1:9').toBe('true')
    expect(process.env.SHI_YAN_WAI_HU, '本测试由 SHI_YAN_WAI_HU 门控').toBe('true')

    const suoYouLun: Array<{ mbti: string; lun: number; xiaoXi: string[]; ceLue?: unknown; cuoWu?: string }> = []

    for (const mbti of XING) {
      const renShe = shengChengJiaoSe({
        yong_hu_id: process.env.SHI_YAN_YONG_HU_ID || 'dui-zhao-shi-yan',
        mbti_lei_xing: mbti as never,
        xing_bie: mbti === 'ESFP' || mbti === 'ENFP' ? 'nv' : 'nan',
      })
      const zong = renShe.hao_gan_du_zong_fen
      const liShi: DuiHuaLiShiXiang[] = [
        { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '在吗', shi_jian: '20:31' },
      ] as DuiHuaLiShiXiang[]

      for (let lun = 0; lun < LUN_SHU; lun++) {
        const shuRu: AIYinQingShuRu = {
          yong_hu_id: process.env.SHI_YAN_YONG_HU_ID || 'dui-zhao-shi-yan',
          jiao_se_id: renShe.id,
          jiao_se: renShe as unknown as AIJiaoSeXinXi,
          hao_gan_du: {
            xin_ren_du: Math.round(zong * 0.35),
            qin_mi_du: Math.round(zong * 0.25),
            qu_wei_du: Math.round(zong * 0.2),
            guan_huai_du: Math.round(zong * 0.2),
            zong_fen: zong,
            guan_xi_jie_duan: guanXiJieDuan(zong),
          } as unknown as HaoGanDuXinXi,
          dui_hua_li_shi: [...liShi],
          yong_hu_xin_xiao_xi: JU_BEN[lun % JU_BEN.length],
          shi_fou_di_yi_lun: lun === 0,
          shi_jian_chang_jing: '晚上八点半，各自在宿舍，都在刷手机',
          tu_pian_shou_quan: false,
        }
        const chu = await yunXingAIYinQing(shuRu)
        for (const m of chu.xiao_xi_lie_biao) {
          liShi.push({ fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: renShe.wei_xin_ming, nei_rong: m, shi_jian: '20:32' } as DuiHuaLiShiXiang)
        }
        suoYouLun.push({
          mbti,
          lun,
          xiaoXi: [...chu.xiao_xi_lie_biao],
          ceLue: chu.ce_lue,
          cuoWu: chu.cuo_wu_xin_xi,
        })
        console.log(`\n**${mbti} 第${lun + 1} 轮**（用户：${JU_BEN[lun % JU_BEN.length]}）`)
        if (chu.cuo_wu_xin_xi) console.log(`  ! ${chu.cuo_wu_xin_xi}`)
        for (const m of chu.xiao_xi_lie_biao) console.log(`> ${m}`)
        if (chu.xiao_xi_lie_biao.length === 0) console.log('（本轮无输出）')
      }
    }

    fs.writeFileSync(LUO_PAN, JSON.stringify({ suoYouLun }, null, 2))
    console.log(`\n已落盘：${LUO_PAN}`)
  })
})