import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 源码根 = resolve(__dirname, '..')
const 项目根 = resolve(源码根, '..')

const 读 = (相对: string) => readFileSync(resolve(项目根, 相对), 'utf8')

const 文本扩展名 = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.vue',
  '.html',
  '.css',
  '.json',
  '.md',
  '.txt',
  '.svg',
  '.xml',
  '.yml',
  '.yaml',
])

function 收集文本文件(目录: string, 已收录: string[] = []): string[] {
  for (const 名 of readdirSync(目录)) {
    if (名 === 'node_modules' || 名 === 'dist' || 名 === '.git' || 名 === 'package-lock.json') continue
    const 路径 = resolve(目录, 名)
    if (statSync(路径).isDirectory()) {
      收集文本文件(路径, 已收录)
    } else if (文本扩展名.has(名.slice(名.lastIndexOf('.')))) {
      已收录.push(路径)
    }
  }
  return 已收录
}

describe('FP-09 指针锁定系统根除', () => {
  it('相机内核不再含有任何指针锁定激活路径', () => {
    const 相机 = 读('public/grass-bg/scripts/block-08.js')
    expect(相机).not.toMatch(
      /requestPointerLock|exitPointerLock|pointerLockElement|pointerlockchange|pointerlockerror/i,
    )
    expect(相机).not.toContain('__camLock')
    expect(相机).not.toContain('__camUnlock')
    expect(相机).not.toContain('anyLock')
    expect(相机).not.toContain('syncLock')
    expect(相机).not.toContain('S.locked')
  })

  it('全仓源码区（src、public、brotli-src、index.html 等，排除构建产物）无指针锁定调用', () => {
    const 文件 = 收集文本文件(项目根).map((路径) => 路径.replace(/\\/g, '/'))
    expect(文件.length).toBeGreaterThan(100)
    const 激活路径 = /requestPointerLock|exitPointerLock|pointerLockElement|pointerlockchange|pointerlockerror/
    const 自身 = __filename.replace(/\\/g, '/')
    const 违规 = 文件.filter((路径) => 路径 !== 自身 && 激活路径.test(readFileSync(路径, 'utf8')))
    expect(违规).toEqual([])
  })

  it('相机内核其余功能锚点完整，背景页仍加载 block-08', () => {
    const 相机 = 读('public/grass-bg/scripts/block-08.js')
    const 锚点 = [
      '__camKey',
      '__camMouse',
      '__camFrozen',
      '__camSetFrozen',
      '__setCam',
      '__setTarget',
      '__setCfg',
      '__getCam',
      '__camState',
      '__camWrapped',
      '__wuFrame',
      '__placeEnter',
      '__placeExit',
      '__placeAdd',
      '__placeBox',
      'enforceCamera',
      'updateGhost',
    ]
    for (const 锚 of 锚点) {
      expect(相机).toContain(锚)
    }
    expect(读('public/grass-bg/grass-bg.html')).toContain('scripts/block-08.js')
  })
})
