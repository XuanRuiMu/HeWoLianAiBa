import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')

const 隐私 = 读('assets/yinSiZhengCe.txt')
const 协议 = 读('assets/yongHuXieYi.txt')

describe('协议元数据冻结', () => {
  it('两份协议的最后更新日期与版本号保持原值不被改动', () => {
    expect(隐私).toContain('最新更新日期2026.05.10，版本号v1.0')
    expect(协议).toContain('最新更新日期2026.05.10，版本号v1.0')
  })

  it('章节骨架不变：隐私政策首章与首节、用户协议首章与首节维持原标题', () => {
    expect(隐私).toContain('一、数据控制者信息')
    expect(隐私).toContain('2.1 身份信息')
    expect(协议).toContain('一、引言')
    expect(协议).toContain('2.1 服务内容')
  })
})

describe('隐私政策与项目现状一致', () => {
  it('删除与实现不符的陈述：游戏结束即清好感度、语音通话、微信昵称、使用数据90天', () => {
    expect(隐私).not.toContain('游戏结束（胜利/失败/放弃）后即时')
    expect(隐私).not.toContain('语音通话')
    expect(隐私).not.toContain('微信昵称')
    expect(隐私).not.toContain('采集之日起90天')
  })

  it('如实披露好友功能：申请、消息与按手机号或用户名搜索', () => {
    expect(隐私).toContain('好友申请')
    expect(隐私).toContain('好友消息')
    expect(隐私).toContain('手机号或用户名')
  })

  it('身份信息补充好友场景实际收集的头像与签名', () => {
    expect(隐私).toContain('头像')
    expect(隐私).toContain('签名')
  })

  it('保存期限表与后端清理任务一致：聊天30天、语音7天、通知90天、审计日志185天', () => {
    expect(隐私).toContain('30天')
    expect(隐私).toContain('7天')
    expect(隐私).toContain('90天')
    expect(隐私).toContain('185天')
  })

  it('好感度与游戏数据如实声明保存至账号注销，而非游戏结束清理', () => {
    expect(隐私).toContain('保存至账号注销')
  })

  it('图片、表情包与视频媒体披露为服务器保存至账号注销', () => {
    expect(隐私).toContain('图片')
    expect(隐私).toContain('表情包')
    expect(隐私).toContain('保存至账号注销')
  })

  it('外观自定义上传（自定义聊天背景、气泡、对象头像）披露为服务器保存', () => {
    expect(隐私).toContain('自定义聊天背景')
    expect(隐私).toContain('气泡')
    expect(隐私).toContain('服务器')
  })

  it('排行榜公开字段与挑战积分实现一致，不含不存在的微信昵称', () => {
    expect(隐私).toContain('挑战模式积分榜')
    expect(隐私).toContain('段位')
  })

  it('注册后临时回填凭据的本地存储行为如实披露', () => {
    expect(隐私).toContain('回填')
    expect(隐私).toContain('临时')
  })
})

describe('用户协议与项目现状一致', () => {
  it('服务描述覆盖实际存在的核心功能：好友、挑战、外观自定义', () => {
    expect(协议).toContain('好友')
    expect(协议).toContain('挑战')
    expect(协议).toContain('自定义')
  })

  it('账号登录方式如实描述为密码登录，验证码仅用于注册与密码找回', () => {
    expect(协议).not.toContain('验证码登录')
    expect(协议).toContain('密码登录')
  })

  it('用户生成内容覆盖上传的媒体素材', () => {
    expect(协议).toContain('上传')
  })
})

describe('隐私政策语音用途与现实一致', () => {
  it('语音同时披露用于AI对话语音消息与好友语音消息', () => {
    expect(隐私).toContain('AI对话语音消息与好友语音消息功能')
  })
})
