import { describe, expect, it } from 'vitest'
import { jieXiNiChengKu } from '../昵称解析'
import fs from 'fs'
import os from 'os'
import path from 'path'

describe('昵称库解析（资源定位与解析正确性）', () => {
  it('从项目真实文件解析出男女两个池且非空', () => {
    const ku = jieXiNiChengKu()
    expect(ku.nan.length).toBeGreaterThan(50)
    expect(ku.nv.length).toBeGreaterThan(50)
    expect(ku.nan).not.toContain('')
    expect(ku.nv).not.toContain('')
  })

  it('文件缺失时返回空池而不是抛错', () => {
    const yuanLu = process.env['NI_CHENG_KU_LU_JING']
    process.env['NI_CHENG_KU_LU_JING'] = path.join(os.tmpdir(), 'bu-cun-zai-de-ni-cheng.md')
    try {
      const ku = jieXiNiChengKu()
      expect(ku.nan).toEqual([])
      expect(ku.nv).toEqual([])
    } finally {
      if (yuanLu === undefined) delete process.env['NI_CHENG_KU_LU_JING']
      else process.env['NI_CHENG_KU_LU_JING'] = yuanLu
    }
  })

  it('显式指定 NI_CHENG_KU_LU_JING 时优先使用', () => {
    const linShi = path.join(os.tmpdir(), `nicheng-test-${Date.now()}.md`)
    fs.writeFileSync(linShi, '# 男\n测试男A\n\n# 女\n测试女B\n', 'utf-8')
    const yuanLu = process.env['NI_CHENG_KU_LU_JING']
    process.env['NI_CHENG_KU_LU_JING'] = linShi
    try {
      const ku = jieXiNiChengKu()
      expect(ku.nan).toContain('测试男A')
      expect(ku.nv).toContain('测试女B')
      expect(ku.nan).not.toContain('测试女B')
    } finally {
      fs.unlinkSync(linShi)
      if (yuanLu === undefined) delete process.env['NI_CHENG_KU_LU_JING']
      else process.env['NI_CHENG_KU_LU_JING'] = yuanLu
    }
  })
})
