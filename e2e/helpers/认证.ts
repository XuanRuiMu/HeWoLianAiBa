import { Page, APIRequestContext } from '@playwright/test'
import { peiZhi } from './配置'

const houDuanJiChuUrl = peiZhi.houDuanJiChuUrl
const houDuanApiUrl = `${houDuanJiChuUrl}/api`
const lingPaiJian = peiZhi.lingPaiJian

export interface DengLuJieGuo {
  lingPai: string
  xinYongHu: boolean
}

export async function zhuCeHuoDengLu(
  qingQiu: APIRequestContext,
  shouJiHao: string,
  miMa: string,
  yongHuMing: string,
): Promise<DengLuJieGuo> {
  const jianChaXiangYing = await qingQiu.get(`${houDuanApiUrl}/认证/检查手机`, {
    params: { shouJiHao },
  })
  const jianChaShuJu = await jianChaXiangYing.json()
  const yiZhuCe = jianChaShuJu?.shu_ju?.yi_zhu_ce ?? false

  if (yiZhuCe) {
    const dengLuXiangYing = await qingQiu.post(`${houDuanApiUrl}/认证/登录`, {
      data: { shouJiHao, miMa },
    })
    const dengLuShuJu = await dengLuXiangYing.json()
    if (!dengLuShuJu?.cheng_gong) {
      throw new Error(`登录失败: ${dengLuShuJu?.ti_shi || '未知错误'}`)
    }
    return {
      lingPai: dengLuShuJu.shu_ju.令牌,
      xinYongHu: false,
    }
  }

  await qingQiu.post(`${houDuanApiUrl}/认证/发送码`, {
    data: { shouJiHao },
  })

  const zhuCeXiangYing = await qingQiu.post(`${houDuanApiUrl}/认证/注册`, {
    data: {
      shouJiHao,
      yanZhengMa: peiZhi.kaiFaYanZhengMa,
      yongHuMing,
      miMa,
      tongYiXieYi: true,
    },
  })
  const zhuCeShuJu = await zhuCeXiangYing.json()
  if (!zhuCeShuJu?.cheng_gong) {
    throw new Error(`注册失败: ${zhuCeShuJu?.ti_shi || '未知错误'}`)
  }
  return {
    lingPai: zhuCeShuJu.shu_ju.令牌,
    xinYongHu: true,
  }
}

export async function sheZhiQianDuanDengLuState(page: Page, lingPai: string): Promise<void> {
  await page.goto('/login')
  await page.evaluate(
    ({ token, key }) => {
      localStorage.setItem(key, token)
    },
    { token: lingPai, key: lingPaiJian },
  )
}

export async function dengLuDaoShouYe(page: Page, lingPai: string): Promise<void> {
  await sheZhiQianDuanDengLuState(page, lingPai)
  await page.goto('/')
}
