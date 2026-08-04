import { chromium } from '@playwright/test'

async function zhuYao() {
  const liuLanQi = await chromium.launch({ headless: true })
  const yeMian = await liuLanQi.newPage({ viewport: { width: 390, height: 844 } })

  await yeMian.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
  await yeMian.waitForTimeout(1500)

  const tels = yeMian.locator('input[type="tel"]')
  const passes = yeMian.locator('input[type="password"]')
  const telShu = await tels.count()
  const passShu = await passes.count()
  console.log('TEL_COUNT:', telShu, 'PASS_COUNT:', passShu)

  for (let i = 0; i < telShu; i++) {
    await tels.nth(i).fill('13800138001').catch(() => {})
  }
  for (let i = 0; i < passShu; i++) {
    await passes.nth(i).fill('test1234').catch(() => {})
  }
  await yeMian.waitForTimeout(500)

  const zhuangTai = await yeMian.evaluate(() => {
    const anNiu = Array.from(document.querySelectorAll('button'))
      .filter((b) => (b.textContent || '').trim() === '登录')
      .map((b) => ({ disabled: b.disabled }))
    return anNiu
  })
  console.log('BTN_STATE:', JSON.stringify(zhuangTai))

  await yeMian.locator('button:has-text("登录")').last().click({ timeout: 5000 }).catch((e) => console.log('CLICK_FAIL:', String(e).slice(0, 100)))
  await yeMian.waitForTimeout(4000)
  console.log('URL_AFTER_LOGIN:', yeMian.url())

  await liuLanQi.close()
}

void zhuYao()
