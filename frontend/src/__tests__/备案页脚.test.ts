import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fanYi } from '@/config/translations'

const dangQianMuLu = dirname(fileURLToPath(import.meta.url))
const zuJianLuJing = resolve(dangQianMuLu, '../components/备案页脚.vue')
const zhuYeLuJing = resolve(dangQianMuLu, '../views/主页内容.vue')
const renZhengBuJuLuJing = resolve(dangQianMuLu, '../layouts/认证布局.vue')

describe('FP-01 备案进行中已删除', () => {
  it('备案页脚组件文件不存在', () => {
    expect(existsSync(zuJianLuJing)).toBe(false)
  })

  it('翻译文件无备案进行中键', () => {
    expect('beiAnJinXingZhong' in fanYi.tongYong).toBe(false)
    expect('suanFaBeiAnJinXingZhong' in fanYi.tongYong).toBe(false)
  })

  it('主页与认证布局无备案页脚引用', () => {
    const zhuYe = readFileSync(zhuYeLuJing, 'utf8')
    expect(zhuYe).not.toContain('BeiAnYeJiao')
    expect(zhuYe).not.toContain('备案页脚')
    expect(zhuYe).not.toContain('BeiAnYeJiao />')
    const buJu = readFileSync(renZhengBuJuLuJing, 'utf8')
    expect(buJu).not.toContain('BeiAnYeJiao')
    expect(buJu).not.toContain('备案页脚')
  })
})
