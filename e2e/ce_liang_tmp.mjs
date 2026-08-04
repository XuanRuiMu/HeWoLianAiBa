import { chromium } from '@playwright/test'
import zlib from 'node:zlib'

function jieMaPNG(huDuan) {
  let i = 8
  let kuan, gao, tongDao = 4, caiSe = 6
  const idat = []
  while (i < huDuan.length) {
    const chang = huDuan.readUInt32BE(i)
    const leiXing = huDuan.toString('ascii', i + 4, i + 8)
    const shuJu = huDuan.subarray(i + 8, i + 8 + chang)
    if (leiXing === 'IHDR') {
      kuan = shuJu.readUInt32BE(0)
      gao = shuJu.readUInt32BE(4)
      caiSe = shuJu[9]
      if (caiSe === 0) tongDao = 1
      else if (caiSe === 2) tongDao = 3
      else if (caiSe === 3) tongDao = 1
      else if (caiSe === 4) tongDao = 2
      else tongDao = 4
    } else if (leiXing === 'IDAT') {
      idat.push(shuJu)
    }
    i += 12 + chang
  }
  const shuJu = zlib.inflateSync(Buffer.concat(idat))
  const meiHang = kuan * tongDao
  const xing = []
  let w = 0
  for (let y = 0; y < gao; y++) {
    const lvBo = shuJu[w]
    const zong = Buffer.from(shuJu.subarray(w + 1, w + 1 + meiHang))
    const shang = y > 0 ? xing[y - 1] : null
    for (let x = 0; x < meiHang; x++) {
      const zuo = x >= tongDao ? zong[x - tongDao] : 0
      const shangZhi = shang ? shang[x] : 0
      const zuoShang = shang && x >= tongDao ? shang[x - tongDao] : 0
      switch (lvBo) {
        case 0: break
        case 1: zong[x] = (zong[x] + zuo) & 0xFF; break
        case 2: zong[x] = (zong[x] + shangZhi) & 0xFF; break
        case 3: zong[x] = (zong[x] + Math.floor((zuo + shangZhi) / 2)) & 0xFF; break
        case 4: {
          const p = zuo + shangZhi - zuoShang
          const pa = Math.abs(p - zuo), pb = Math.abs(p - shangZhi), pc = Math.abs(p - zuoShang)
          const yuCe = pa <= pb && pa <= pc ? zuo : pb <= pc ? shangZhi : zuoShang
          zong[x] = (zong[x] + yuCe) & 0xFF
          break
        }
      }
    }
    xing.push(zong)
    w += 1 + meiHang
  }
  const jieGuo = { kuan, gao, tongDao, caiSe, xing, zongChang: shuJu.length, qiWang: gao * (1 + kuan * tongDao) }
  return jieGuo
}

async function zhuYao() {
  const liuLanQi = await chromium.launch({ headless: true })
  const yeMian = await liuLanQi.newPage({ viewport: { width: 390, height: 844 } })

  await yeMian.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
  await yeMian.waitForTimeout(1500)
  const tels = yeMian.locator('input[type="tel"]')
  const passes = yeMian.locator('input[type="password"]')
  const telShu = await tels.count()
  const passShu = await passes.count()
  for (let i = 0; i < telShu; i++) await tels.nth(i).fill('13800138001').catch(() => {})
  for (let i = 0; i < passShu; i++) await passes.nth(i).fill('test1234').catch(() => {})
  await yeMian.waitForTimeout(500)
  await yeMian.locator('button:has-text("登录")').last().click({ timeout: 5000 }).catch(() => {})
  await yeMian.waitForTimeout(4000)

  await yeMian.goto('http://localhost:5173/chat/efcd3496-d292-42e5-a7ad-eeea8f476c0a', { waitUntil: 'networkidle' }).catch(() => {})
  await yeMian.waitForTimeout(3000)

  const kuang = await yeMian.locator('.shuru-kuang').boundingBox()
  console.log('Kuang:', JSON.stringify(kuang))

  const jieXi = async (weiZhi) => {
    const buf = await yeMian.screenshot({ clip: { x: kuang.x, y: kuang.y, width: kuang.width, height: kuang.height } })
    const png = jieMaPNG(buf)
    console.log('PNG_INFO:', png.kuan, 'x', png.gao, 'tongDao:', png.tongDao, 'caiSe:', png.caiSe, 'zongChang:', png.zongChang, 'qiWang:', png.qiWang, 'weiZhi:', weiZhi)
    const { kuan, gao, tongDao, xing } = png
    const yanBen = []
    for (const [fx, fy] of [[0.05, 0.05], [0.95, 0.05], [0.05, 0.95], [0.95, 0.95], [0.5, 0.1]]) {
      const x = Math.floor(kuan * fx), y = Math.floor(gao * fy)
      const i = y * kuan * tongDao + x * tongDao
      yanBen.push({ fx, fy, rgb: [xing[y][i], xing[y][i + 1], xing[y][i + 2]] })
    }
    const fengFu = {}
    const she = 1
    for (let y = 0; y < gao; y++) {
      for (let x = 0; x < kuan; x += 2) {
        const i = y * kuan * tongDao + x * tongDao
        const ke = `${Math.round(xing[y][i] / she) * she},${Math.round(xing[y][i + 1] / she) * she},${Math.round(xing[y][i + 2] / she) * she}`
        fengFu[ke] = (fengFu[ke] || 0) + 1
      }
    }
    const paiXu = Object.entries(fengFu).sort((a, b) => b[1] - a[1]).slice(0, 6)
    return { weiZhi, kuan, gao, yanBen, zuiChangJian: paiXu }
  }

  console.log(JSON.stringify(await jieXi('placeholder'), null, 2))
  await yeMian.evaluate(() => {
    const ta = document.querySelector('.shuru-kuang')
    ta.focus()
    ta.value = '输入消息...'
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await yeMian.waitForTimeout(200)
  console.log(JSON.stringify(await jieXi('shu-ru'), null, 2))

  await liuLanQi.close()
}

void zhuYao()
