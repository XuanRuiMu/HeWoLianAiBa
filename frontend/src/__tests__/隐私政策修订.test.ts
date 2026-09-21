import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('隐私政策 B-6 五处修订验收', () => {
  const policyPath = join(__dirname, '..', 'assets', 'yinSiZhengCe.txt')
  const content = readFileSync(policyPath, 'utf-8')

  it('1. 收集清单补全：身份信息中包含生日、密码、语音', () => {
    expect(content).toContain('出生日期')
    expect(content).toContain('密码')
    expect(content).toContain('语音')
  })

  it('2. 新增数据保存期限章节', () => {
    expect(content).toContain('数据保存期限')
    expect(content).toContain('账号数据')
    expect(content).toContain('聊天记录')
    expect(content).toContain('好感度数据')
    expect(content).toContain('语音文件')
    expect(content).toContain('验证码')
  })

  it('3. Cookie→localStorage：删除Cookie表述，改为localStorage存储JWT，补充localStorage用途', () => {
    expect(content).not.toContain('Cookie')
    expect(content).not.toContain('cookie')
    expect(content).toContain('localStorage')
    expect(content).toContain('JWT')
    expect(content).toContain('主题偏好')
    expect(content).toContain('记住账号')
    expect(content).toContain('排序偏好')
  })

  it('4. 第三方SDK补阿里云短信服务', () => {
    expect(content).toContain('阿里云短信')
    expect(content).toContain('验证码')
  })

  it('5. 排行榜公开披露用户昵称/微信昵称', () => {
    expect(content).toContain('排行榜')
    expect(content).toContain('昵称')
    expect(content).toContain('微信昵称')
  })

  it('更新日期已更新', () => {
    expect(content).toContain('2026')
  })
})
