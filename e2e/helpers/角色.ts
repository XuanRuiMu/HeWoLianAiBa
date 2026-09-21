import { APIRequestContext, Page, expect } from '@playwright/test'
import { peiZhi } from './配置'

const houDuanJiChuUrl = peiZhi.houDuanJiChuUrl
const houDuanApiUrl = `${houDuanJiChuUrl}/api`

export type XingGeLeiXing =
  | 'ISTJ'
  | 'ISFJ'
  | 'INFJ'
  | 'INTJ'
  | 'ISTP'
  | 'ISFP'
  | 'INFP'
  | 'INTP'
  | 'ESTP'
  | 'ESFP'
  | 'ENFP'
  | 'ENFJ'
  | 'ENTJ'
  | 'ESTJ'
  | 'ESFJ'
  | 'ENTP'

export interface JiaoSeCanShu {
  muBiaoXingBie: 'male' | 'female'
  xingGeXuanZe: XingGeLeiXing
  yunXuZhaXing: boolean
  yongHuXingBie?: 'male' | 'female' | null
}

export interface JiaoSeJieGuo {
  jiaoSeId: string
  mingZi: string
  weiXinMing: string
  xingGe: XingGeLeiXing
  shiFouZhaXing: boolean
}

export async function chuangJianJiaoSe(
  qingQiu: APIRequestContext,
  canShu: JiaoSeCanShu,
  lingPai?: string,
): Promise<JiaoSeJieGuo> {
  const headers: Record<string, string> = {}
  if (lingPai) {
    headers.Authorization = `Bearer ${lingPai}`
  }
  const shengChengXiangYing = await qingQiu.post(`${houDuanApiUrl}/生成角色/MBTI生成`, {
    headers,
    data: {
      性别: canShu.muBiaoXingBie === 'male' ? 'nan' : 'nv',
      mbti类型: canShu.xingGeXuanZe,
      渣男渣女变体: canShu.yunXuZhaXing,
      随机性格: false,
      用户性别:
        canShu.yongHuXingBie === 'male'
          ? 'nan'
          : canShu.yongHuXingBie === 'female'
            ? 'nv'
            : undefined,
    },
  })
  const shengChengShuJu = await shengChengXiangYing.json()
  if (!shengChengShuJu?.cheng_gong) {
    throw new Error(`生成角色失败: ${shengChengShuJu?.ti_shi || '未知错误'}`)
  }

  const queRenXiangYing = await qingQiu.post(`${houDuanApiUrl}/生成角色/确认`, {
    headers,
    data: { xuanZhongJiaoSe: shengChengShuJu.shu_ju },
  })
  const queRenShuJu = await queRenXiangYing.json()
  if (!queRenShuJu?.cheng_gong) {
    throw new Error(`确认角色失败: ${queRenShuJu?.ti_shi || '未知错误'}`)
  }

  const jiaoSe = queRenShuJu.shu_ju
  return {
    jiaoSeId: jiaoSe.jiao_se_id || jiaoSe.id,
    mingZi: jiaoSe.ming_zi,
    weiXinMing: jiaoSe.wei_xin_ming || jiaoSe.ming_zi,
    xingGe: jiaoSe.mbti_lei_xing || jiaoSe.yu_she_lei_xing,
    shiFouZhaXing: jiaoSe.shi_fou_zha_xing === true,
  }
}

export async function chuangJianHuiHua(
  qingQiu: APIRequestContext,
  jiaoSeId: string,
  lingPai?: string,
): Promise<string> {
  const headers: Record<string, string> = {}
  if (lingPai) {
    headers.Authorization = `Bearer ${lingPai}`
  }
  const xiangYing = await qingQiu.post(`${houDuanApiUrl}/聊天/会话`, {
    headers,
    data: { jiaoSeId },
  })
  const shuJu = await xiangYing.json()
  if (!shuJu?.cheng_gong) {
    throw new Error(`创建会话失败: ${shuJu?.ti_shi || '未知错误'}`)
  }
  return shuJu.shu_ju.id
}

export interface JiaoSeUICanShu {
  yongHuXingBie: 'male' | 'female'
  muBiaoXingBie: 'male' | 'female'
  xingGeXuanZe: XingGeLeiXing
  yunXuZhaXing: boolean
}

export async function chuangJianJiaoSeTongGuoUI(page: Page, canShu: JiaoSeUICanShu): Promise<string> {
  await page.goto('/profile-setup?moshi=putong')
  await expect(page).toHaveURL(/\/profile-setup/)

  await page.locator('.ziJi-xingBie-kaPian').filter({ hasText: canShu.yongHuXingBie === 'male' ? '男' : '女' }).click()
  await page.locator('.anniu-zhuYao').click()

  await page.locator('.duiXiang-xingBie-kaPian').filter({ hasText: canShu.muBiaoXingBie === 'male' ? '男' : '女' }).click()
  await page.locator('.anniu-zhuYao').click()

  await page.locator('.mbti-kaPian').filter({ hasText: canShu.xingGeXuanZe }).click()

  const zhaXingGouXuan = page.locator('.zhaXing-gouxuan')
  const muQianGouXuan = await zhaXingGouXuan.isChecked()
  if (muQianGouXuan !== canShu.yunXuZhaXing) {
    await zhaXingGouXuan.click()
  }

  await page.locator('.kaiShiLiaoTian').click()

  await page.waitForURL(/\/tian-jia-wei-xin/, { timeout: 15000 })
  await page.waitForURL(/\/chat\/.+/, { timeout: 30000 })

  const dangQianUrl = page.url()
  const piPei = dangQianUrl.match(/\/chat\/([^/?#]+)/)
  if (!piPei) {
    throw new Error(`无法从 URL 提取会话 ID: ${dangQianUrl}`)
  }
  return piPei[1]
}
