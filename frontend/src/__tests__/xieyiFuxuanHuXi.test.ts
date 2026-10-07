import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 源 = readFileSync(resolve(__dirname, '../views/登录内容.vue'), 'utf8')
const 样式 = /<style[^>]*>([\s\S]*)<\/style>/.exec(源)?.[1] ?? ''

describe('协议勾选框蓝粉呼吸（FP-协议框呼吸）', () => {
  it('勾选框 accent-color 与关键帧共用蓝粉同源令牌', () => {
    expect(样式).toMatch(/\.xieyi-fuxuan input\[type='checkbox'\][^{]*\{[^}]*accent-color:\s*var\(--xingbie-nan-xuan-biankuang\)/)
    const 关键帧 = /@keyframes xieyi-fuxuan-huxi\s*\{([\s\S]*?)\n\}/.exec(样式)?.[1] ?? ''
    expect(关键帧).toMatch(/var\(--xingbie-nan-xuan-biankuang\)/)
    expect(关键帧).toMatch(/var\(--xingbie-nv-xuan-biankuang\)/)
    expect(关键帧).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('呼吸动画已挂到勾选框', () => {
    expect(样式).toMatch(/animation:\s*xieyi-fuxuan-huxi/)
  })
})
