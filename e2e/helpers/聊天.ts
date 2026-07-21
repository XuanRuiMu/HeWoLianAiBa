import { Page, expect } from '@playwright/test'

export async function faSongXiaoXi(page: Page, neiRong: string): Promise<void> {
  const shuRuKuang = page.locator('.shuru-kuang')
  await shuRuKuang.fill(neiRong)
  await page.locator('.fasong-anniu').click()
}

export async function dengDaiJiaoSeHuiFu(page: Page, chaoShi?: number): Promise<void> {
  const moRenChaoShi = parseInt(process.env.E2E_AI_RESPONSE_TIMEOUT || '120000', 10)
  const zuiZhongChaoShi = chaoShi ?? moRenChaoShi
  const xiaoXiLieBiao = page.locator('.xiaoxi-liebiao')
  const yuanShuLiang = await xiaoXiLieBiao.locator('.xiaoxi-xiangmu').count()
  const kaiShiShiJian = Date.now()
  while (Date.now() - kaiShiShiJian < zuiZhongChaoShi) {
    const xinShuLiang = await xiaoXiLieBiao.locator('.xiaoxi-xiangmu').count()
    if (xinShuLiang > yuanShuLiang) {
      return
    }
    await page.waitForTimeout(500)
  }
  throw new Error(`等待角色回复超时，消息数量未增加（原 ${yuanShuLiang}）`)
}

export async function daKaiJunShiZhiDao(page: Page): Promise<void> {
  await page.locator('.junshi-anniu').click()
  await page.locator('.junshi-mianban').waitFor({ state: 'visible' })
}

export async function guanBiJunShiZhiDao(page: Page): Promise<void> {
  await page.locator('.junshi-zhezhao').click({ position: { x: 10, y: 10 } })
  await page.locator('.junshi-mianban').waitFor({ state: 'hidden' })
}

export async function xuanZeDiYiGeJunShi(page: Page): Promise<void> {
  const qingQiuAnNiu = page.locator('.qingqiu-anniu')
  if (await qingQiuAnNiu.count() > 0) {
    return
  }
  const xuanZeAnNiu = page.locator('.xuanze-anniu')
  await expect(xuanZeAnNiu, '军师选择入口应可见').toBeVisible({ timeout: 5000 })
  await xuanZeAnNiu.click()
  const diYiGeJunShi = page.locator('.junshi-xuanze-xiang').first()
  await expect(diYiGeJunShi, '应存在可选军师').toBeVisible({ timeout: 5000 })
  await diYiGeJunShi.click()
  await expect(qingQiuAnNiu, '选择军师后请求指导按钮应出现').toBeVisible({ timeout: 5000 })
}

export async function qingQiuJunShiZhiDao(page: Page): Promise<string> {
  await xuanZeDiYiGeJunShi(page)
  const qingQiuAnNiu = page.locator('.qingqiu-anniu')
  await qingQiuAnNiu.click()
  await expect(qingQiuAnNiu).not.toHaveAttribute('disabled', '', { timeout: 120000 })
  const jieGuoQu = page.locator('.zhidao-jieguo .jieguo-neirong')
  await expect(jieGuoQu).toBeVisible({ timeout: 10000 })
  return (await jieGuoQu.textContent()) || ''
}

export async function qieHuanDaoJunShiJiLu(page: Page): Promise<void> {
  await page.locator('[data-testid="lishi-zhanji-tab"]').click()
  await expect(page.locator('.jilu-buju')).toBeVisible()
}

export async function zhiXingGaoBai(page: Page): Promise<void> {
  const gaoBaiAnNiu = page.locator('.gaobai-anniu')
  await expect(gaoBaiAnNiu).toBeVisible()
  await gaoBaiAnNiu.click()
}

export async function dengDaiShengLiTanChu(page: Page, chaoShi: number = 15000): Promise<void> {
  const zheZhao = page.locator('.youxi-zhezhao')
  await expect(zheZhao).toBeVisible({ timeout: chaoShi })
}
