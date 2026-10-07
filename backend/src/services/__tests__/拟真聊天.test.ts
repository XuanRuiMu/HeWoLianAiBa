/* eslint-disable no-console -- 本脚本的职责就是打印真实回复给人看 */
import { describe, test } from 'vitest'
import { shengChengJiaoSe } from '../角色生成'
import { yunXingAIYinQing } from '../AI引擎'
import type { AIJiaoSeXinXi, AIYinQingShuRu, DuiHuaLiShiXiang } from '../../types'

/**
 * 拟真聊天实测 —— 像真人一样随便聊，每种情况只发两次。
 *
 * 走生产全链路（Director + Writer），不隔离、不预设剧本。
 * 环境变量 YU_LIAN_SHUO_CHE 决定说什么；不设就用默认那句。
 */
const YONG_HU = 'yong-hu-zhen-shi-tou'

describe.skipIf(process.env.XU_KE_ZHEN_SHI_WAI_HU !== 'true')('拟真聊天', () => {
  test('发一句话，看它怎么回', { timeout: 300000 }, async () => {
    const renShe = shengChengJiaoSe({
      yong_hu_id: YONG_HU,
      mbti_lei_xing: 'INFP',
      xing_bie: 'nv',
    }) as unknown as AIJiaoSeXinXi

    const shuo = process.env.YU_LIAN_SHUO_CHE || '你好'
    const liShi: DuiHuaLiShiXiang[] = [
      { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '在吗', shi_jian: '20:30' },
      { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: renShe.wei_xin_ming, nei_rong: '在呀', shi_jian: '20:31' },
    ]

    const shuRu: AIYinQingShuRu = {
      yong_hu_id: YONG_HU,
      jiao_se_id: renShe.id,
      jiao_se: renShe,
      hao_gan_du: {
        xin_ren_du: Math.round(renShe.hao_gan_du_zong_fen * 0.35),
        qin_mi_du: Math.round(renShe.hao_gan_du_zong_fen * 0.25),
        qu_wei_du: Math.round(renShe.hao_gan_du_zong_fen * 0.2),
        guan_huai_du: Math.round(renShe.hao_gan_du_zong_fen * 0.2),
        zong_fen: renShe.hao_gan_du_zong_fen,
        guan_xi_jie_duan: 'shuXi',
      } as never,
      dui_hua_li_shi: liShi,
      yong_hu_xin_xiao_xi: shuo,
      shi_fou_di_yi_lun: false,
      shi_jian_chang_jing: '20:31',
      tu_pian_shou_quan: false,
    }

    const chu = await yunXingAIYinQing(shuRu)
    console.log(`\n【角色】${renShe.wei_xin_ming}（${renShe.mbti_lei_xing}）好感度 ${renShe.hao_gan_du_zong_fen}`)
    console.log(`【你说】${shuo}`)
    if (chu.cuo_wu_xin_xi) console.log(`【出错】${chu.cuo_wu_xin_xi}`)
    if (chu.si_kao?.director) console.log(`【导演想】${chu.si_kao.director}`)
    console.log(`【它回】${chu.xiao_xi_lie_biao.length} 条`)
    for (const t of chu.xiao_xi_lie_biao) console.log(`　${t}`)
    if (chu.kai_chang_hou_xuan?.length) console.log(`（机制D候选：${chu.kai_chang_hou_xuan.join(' / ')}）`)
  })
})