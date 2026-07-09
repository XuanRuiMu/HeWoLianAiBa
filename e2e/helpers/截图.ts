import { Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const xiangMuGen = path.resolve(__dirname, '..', '..')
const jieTuMuLu = path.join(xiangMuGen, '测试截图')

export function queBaoJieTuMuLuCunZai(): void {
  if (!fs.existsSync(jieTuMuLu)) {
    fs.mkdirSync(jieTuMuLu, { recursive: true })
  }
}

export function huoQuJieTuLuJing(wenJianMing: string, ziMuLu?: string): string {
  const muBiaoMuLu = ziMuLu ? path.join(jieTuMuLu, ziMuLu) : jieTuMuLu
  if (!fs.existsSync(muBiaoMuLu)) {
    fs.mkdirSync(muBiaoMuLu, { recursive: true })
  }
  const anQuanMing = wenJianMing.replace(/[<>:"/\\|?*]/g, '_')
  return path.join(muBiaoMuLu, `${anQuanMing}.png`)
}

export async function jieTu(page: Page, wenJianMing: string, ziMuLu?: string): Promise<string> {
  const luJing = huoQuJieTuLuJing(wenJianMing, ziMuLu)
  await page.screenshot({ path: luJing, fullPage: true })
  return luJing
}

export function shanChuSuoYouJieTu(ziMuLu?: string): void {
  const muBiaoMuLu = ziMuLu ? path.join(jieTuMuLu, ziMuLu) : jieTuMuLu
  if (!fs.existsSync(muBiaoMuLu)) {
    return
  }
  const wenJianLieBiao = fs.readdirSync(muBiaoMuLu)
  for (const wenJian of wenJianLieBiao) {
    if (wenJian.endsWith('.png')) {
      fs.unlinkSync(path.join(muBiaoMuLu, wenJian))
    }
  }
}
