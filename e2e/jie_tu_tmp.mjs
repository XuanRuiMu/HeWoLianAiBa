import { chromium } from '@playwright/test'

async function zhuYao() {
  const liuLanQi = await chromium.launch({ headless: true })
  const yeMian = await liuLanQi.newPage({ viewport: { width: 390, height: 844 } })

  await yeMian.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await yeMian.screenshot({ path: 'C:\\Users\\27606\\AppData\\Local\\Temp\\opencode\\shouye.png' })

  const shouJiHao = '13800138001'
  const miMa = 'test1234'
  const xuanZeQi = {
    shouJiHao: 'input[type="tel"], input[placeholder*="手机"], input[maxlength="11"]',
    miMa: 'input[type="password"]',
  }

  await yeMian.fill(xuanZeQi.shouJiHao, shouJiHao).catch(() => console.log('NO_PHONE_INPUT'))
  await yeMian.fill(xuanZeQi.miMa, miMa).catch(() => console.log('NO_PASSWORD_INPUT'))
  await yeMian.screenshot({ path: 'C:\\Users\\27606\\AppData\\Local\\Temp\\opencode\\denglu.png' })

  const anNiu = yeMian.locator('button:has-text("登录"), button:has-text("登 录")').first()
  await anNiu.click().catch(() => console.log('NO_LOGIN_BUTTON'))
  await yeMian.waitForTimeout(3000)
  await yeMian.screenshot({ path: 'C:\\Users\\27606\\AppData\\Local\\Temp\\opencode\\dengluHou.png' })

  await liuLanQi.close()
}

void zhuYao()
