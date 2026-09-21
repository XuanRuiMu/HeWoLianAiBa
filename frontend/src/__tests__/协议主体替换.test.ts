import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const frontendSrc = path.resolve(__dirname, '../')

describe('B-3 协议主体替换', () => {
  const yinSiZhengCePath = path.join(frontendSrc, 'assets/yinSiZhengCe.txt')
  const yongHuXieYiPath = path.join(frontendSrc, 'assets/yongHuXieYi.txt')

  it('隐私政策不应包含旧主体"和我恋爱吧团队"', () => {
    const content = fs.readFileSync(yinSiZhengCePath, 'utf-8')
    expect(content).not.toContain('和我恋爱吧团队')
  })

  it('用户协议不应包含旧主体"和我恋爱吧团队"', () => {
    const content = fs.readFileSync(yongHuXieYiPath, 'utf-8')
    expect(content).not.toContain('和我恋爱吧团队')
  })

  it('隐私政策应包含新主体"燃烧之陨"', () => {
    const content = fs.readFileSync(yinSiZhengCePath, 'utf-8')
    expect(content).toContain('燃烧之陨')
  })

  it('用户协议应包含新主体"燃烧之陨"', () => {
    const content = fs.readFileSync(yongHuXieYiPath, 'utf-8')
    expect(content).toContain('燃烧之陨')
  })

  it('用户协议管辖法院应为天津市西青区人民法院', () => {
    const content = fs.readFileSync(yongHuXieYiPath, 'utf-8')
    expect(content).toContain('天津市西青区人民法院')
  })

  it('用户协议不应包含北京市管辖', () => {
    const content = fs.readFileSync(yongHuXieYiPath, 'utf-8')
    expect(content).not.toContain('北京市')
  })

  it('隐私政策数据控制者应为燃烧之陨', () => {
    const content = fs.readFileSync(yinSiZhengCePath, 'utf-8')
    expect(content).toContain('数据控制者：燃烧之陨')
  })

  it('隐私政策制定解释方应为燃烧之陨', () => {
    const content = fs.readFileSync(yinSiZhengCePath, 'utf-8')
    expect(content).toContain('由燃烧之陨制定并解释')
  })
})
