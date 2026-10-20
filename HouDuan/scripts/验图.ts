import { readFileSync } from 'fs'
import { 直连外呼 } from './直连适配器'

async function 主() {
  const b64 = readFileSync(process.argv[2]).toString('base64')
  const 内容 = [
    { type: 'text', text: '对方发来这张图。用一句话说说图里有什么，要有具体细节。' },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,' + b64 } },
  ]
  const 果 = await 直连外呼('writer', [{ jiaoSe: 'user', neiRong: 内容 as never }], 600000)
  console.log('模型看到：' + 果.正文)
}

void 主().catch((e) => { console.error('失败:', e); process.exit(1) })
