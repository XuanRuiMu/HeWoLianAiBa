import { chromium } from '@playwright/test'

async function zhuYao() {
  const liuLanQi = await chromium.launch({ headless: true })
  const yeMian = await liuLanQi.newPage({ viewport: { width: 390, height: 844 } })

  await yeMian.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
  await yeMian.waitForTimeout(1500)

  const jieGou = await yeMian.evaluate(() => {
    const shuRu = Array.from(document.querySelectorAll('input')).map((i) => ({
      type: i.type,
      placeholder: i.placeholder,
      maxlength: i.maxLength,
      name: i.name,
    }))
    const anNiu = Array.from(document.querySelectorAll('button')).map((b) => ({
      text: (b.textContent || '').trim().slice(0, 20),
    }))
    return { shuRu, anNiu, url: location.href }
  })
  console.log('JIE_GOU:', JSON.stringify(jieGou, null, 2))

  await liuLanQi.close()
}

void zhuYao()
