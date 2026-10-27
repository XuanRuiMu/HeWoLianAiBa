import type { AIYinQingShuRu } from '../types'
import { shiXueShengShenFen } from '../config/角色配置'
import { chouYuTai, duiFangZaiWenNi, gouJianYuTaiKuai, quZaiMangWeiShuo, shengChengZaiMang, shengChengZaiMangZiRenShe, zaoSuiJi, type YuTai } from './语态控制器'

const BIAO_BAI_CI = [
  '喜欢你', '爱你', '在一起', '做我女朋友', '做我男朋友', '我们交往',
  '跟我在一起', '我想你当我', '你愿不愿意跟', '我们要不要处',
]

const DENG_ZHUN_HUA_TE_ZHENG =
  /介意|介不介意|会不会介意|你介|嫌弃|嫌我|讨厌我|受得了|接受不了|愿不愿意|同不同意|同意吗|在意吗|在不在意|能接受|接受吗|喜欢我吗|你接受/

export function 本轮在等一句准话(对方消息: string): boolean {
  return DENG_ZHUN_HUA_TE_ZHENG.test(对方消息 || '')
}

export function gouJianYuTaiCeng(
  shuRu: AIYinQingShuRu,
  随机: () => number = Math.random,
  指定语态?: YuTai,
): string {
  const 对方 = (shuRu.yong_hu_xin_xiao_xi || '').trim()
  if (!对方 || shuRu.zui_jia_shuo_de_shi) return ''
  if (shuRu.bi_da_shi_shi || 本轮在等一句准话(对方)) 指定语态 = '接内容'
  // 对方在直接问你一件事时，先回答，别先确认「是不是在叫我」。
  const 在问你 = duiFangZaiWenNi(对方)
  if (在问你) 指定语态 = '接内容'

  const 是学生 = shiXueShengShenFen(shuRu.jiao_se.shen_fen || '')
  const 人设待办 = shengChengZaiMangZiRenShe(
    {
      xi_hao: shuRu.jiao_se.xi_hao,
      shi_jie_xin_xi: shuRu.jiao_se.shi_jie_xin_xi as Record<string, unknown> | undefined,
      shen_fen: shuRu.jiao_se.shen_fen,
      zhi_ye: (shuRu.jiao_se.shi_jie_xin_xi as Record<string, unknown> | undefined)?.zhi_ye as string | undefined,
    },
    zaoSuiJi('zai-mang:' + shuRu.jiao_se_id),
  )
  const 通用待办 = 人设待办.length > 0
    ? []
    : shengChengZaiMang(是学生, zaoSuiJi('zai-mang:' + shuRu.jiao_se_id))
  const 全部待办 = [...人设待办, ...通用待办]
  const 已说 = (shuRu.dui_hua_li_shi || [])
    .filter((记) => 记.fa_song_zhe_lei_xing === 'jiaose')
    .slice(-60)
    .map((记) => (记.nei_rong || '').slice(0, 120))
  const 在忙 = 全部待办.length > 0 ? quZaiMangWeiShuo(全部待办, 已说) : []

  const 块 = [
    gouJianYuTaiKuai(指定语态 ?? chouYuTai(对方, 随机), 在忙),
    '【别复读】\n你上一轮已经说过的话不要再原样说一遍，尤其是「你定地方发我」这类。对方已经知道的信息不用重复。',
  ]

  if (BIAO_BAI_CI.some((词) => 对方.includes(词))) {
    块.push(
      '【这一刻你躲不掉】\n如果对方这句话是在说喜欢你、想跟你在一起、或者确认你们是什么关系，你必须先就这件事给一个明确的回应，一句两句都行。不要跳过它去说几点见、去说吃饭、去说你那边的忙。答应就答应，装没看见是不行的。',
    )
  }

  return 块.join('\n\n')
}
