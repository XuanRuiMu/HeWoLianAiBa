import { Router } from 'express'
import type { Response } from 'express'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { shengChengJiaoSe, baoCunJiaoSe, type ShengChengJiaoSeJieGuo } from '../services/角色生成'
import type { MBTILeiXing } from '../config/角色配置'
import { mbtiLieBiao } from '../config/角色配置'
import type { RenZhengQingQiu } from '../middleware/认证'
import { 性别验证中间件 } from '../middleware/输入验证'

const luYou = Router()

function jieXiZiFuChuan(
  body: Record<string, unknown>,
  jian: string,
  tianChongJian?: string,
): string | undefined {
  const zhi = body[jian]
  if (typeof zhi === 'string') return zhi
  if (tianChongJian && typeof body[tianChongJian] === 'string') return String(body[tianChongJian])
  return undefined
}

function jieXiBuErZhi(body: Record<string, unknown>, jian: string, tianChongJian?: string): boolean {
  const zhi = body[jian]
  if (typeof zhi === 'boolean') return zhi
  if (tianChongJian && typeof body[tianChongJian] === 'boolean') return Boolean(body[tianChongJian])
  if (typeof zhi === 'string') return zhi === 'true'
  return false
}

function yanZhengMbti(zhi: string): zhi is MBTILeiXing {
  return mbtiLieBiao.includes(zhi as MBTILeiXing)
}

luYou.post('/MBTI生成', 性别验证中间件, (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  }

  const body = qingQiu.body as Record<string, unknown>
  const xingBie = jieXiZiFuChuan(body, '性别', 'xing_bie')
  const muBiaoXingBie = jieXiZiFuChuan(body, '目标性别', 'mu_biao_xing_bie')
  const mbtiLeiXing = jieXiZiFuChuan(body, 'mbti类型', 'mbti_lei_xing')
  const shiFouZhaXing = jieXiBuErZhi(body, '渣男渣女变体', 'shi_fou_zha_xing')
  const suiJiXingGe = jieXiBuErZhi(body, '随机性格', 'sui_ji_xing_ge')

  if (!xingBie || (xingBie !== 'nan' && xingBie !== 'nv' && xingBie !== '男' && xingBie !== '女')) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  const zhengLiXingBie: 'nan' | 'nv' = xingBie === '男' ? 'nan' : xingBie === '女' ? 'nv' : (xingBie as 'nan' | 'nv')
  const zhengLiMuBiaoXingBie: 'nan' | 'nv' | undefined =
    muBiaoXingBie === '男' ? 'nan' : muBiaoXingBie === '女' ? 'nv' : muBiaoXingBie as 'nan' | 'nv' | undefined

  const jiaoSe = shengChengJiaoSe({
    yong_hu_id: yongHu.yongHuId,
    xing_bie: zhengLiXingBie,
    mu_biao_xing_bie: zhengLiMuBiaoXingBie || null,
    mbti_lei_xing: mbtiLeiXing && yanZhengMbti(mbtiLeiXing) ? mbtiLeiXing : null,
    shi_fou_zha_xing: shiFouZhaXing,
    sui_ji_xing_ge: suiJiXingGe,
  })

  return chengGongXiangYing(xiangYing, jiaoSe)
})

luYou.post('/确认', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  }

  const body = qingQiu.body as Record<string, unknown>
  const xuanZhongJiaoSe = body.xuanZhongJiaoSe as ShengChengJiaoSeJieGuo | undefined

  if (!xuanZhongJiaoSe || typeof xuanZhongJiaoSe !== 'object') {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }

  try {
    const baoCunHou = await baoCunJiaoSe(yongHu.yongHuId, xuanZhongJiaoSe)
    return chengGongXiangYing(xiangYing, baoCunHou)
  } catch (cuoWu) {
    console.error('保存角色失败', cuoWu)
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

export default luYou
