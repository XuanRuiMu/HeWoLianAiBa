import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  sendMail: vi.fn(),
  createTransport: vi.fn(),
  riZhi: vi.fn(),
}))

vi.mock('nodemailer', () => ({ default: { createTransport: 假.createTransport } }))
vi.mock('../debug日志', () => ({ xieRuRiZhi: 假.riZhi }))

import { peiZhi } from '../../config'
import { chongZhiGaoJingLengQue, faSongFenJiGaoJing, faSongGaoJing, jiLuAIChengGong, jiLuAIShiBai, sheZhiGaoJingCeShiGouZi } from '../邮件告警'

const 原配置 = { ...peiZhi.gaoJing }
const 原阈值 = peiZhi.aiLianXuShiBaiGaoJingYuZhi

beforeEach(() => {
  vi.clearAllMocks()
  chongZhiGaoJingLengQue()
  sheZhiGaoJingCeShiGouZi(null)
  Object.assign(peiZhi.gaoJing, { smtpZhuJi: '', smtpDuanKou: 465, smtpYongHuMing: '', smtpMiMa: '', faJianRen: '', shouJianRenLieBiao: [] })
  peiZhi.aiLianXuShiBaiGaoJingYuZhi = 2
  假.createTransport.mockReturnValue({ sendMail: 假.sendMail })
  假.sendMail.mockResolvedValue({})
})

afterEach(() => {
  sheZhiGaoJingCeShiGouZi(null)
  Object.assign(peiZhi.gaoJing, 原配置)
  peiZhi.aiLianXuShiBaiGaoJingYuZhi = 原阈值
  chongZhiGaoJingLengQue()
})

describe('邮件告警业务分支', () => {
  it('无收件人、无 SMTP、测试钩子成功失败和冷却均受控', async () => {
    await expect(faSongGaoJing('无收件人', '标题', '内容')).resolves.toBe(false)
    expect(假.riZhi).toHaveBeenCalled()
    Object.assign(peiZhi.gaoJing, { shouJianRenLieBiao: ['ops@example.com'] })
    const 成功 = vi.fn(async () => true)
    sheZhiGaoJingCeShiGouZi(成功)
    await expect(faSongGaoJing('测试成功', '标题', '内容')).resolves.toBe(true)
    await expect(faSongGaoJing('测试成功', '标题', '内容')).resolves.toBe(false)
    expect(成功).toHaveBeenCalledTimes(1)
    sheZhiGaoJingCeShiGouZi(async () => false)
    await expect(faSongGaoJing('测试失败', '标题', '内容')).resolves.toBe(false)
    sheZhiGaoJingCeShiGouZi(async () => { throw new Error('发送异常') })
    await expect(faSongGaoJing('测试异常', '标题', '内容')).resolves.toBe(false)
  })

  it('真实 SMTP 通道覆盖创建、发送成功和发送异常', async () => {
    Object.assign(peiZhi.gaoJing, { smtpZhuJi: 'smtp.example.com', smtpDuanKou: 465, smtpYongHuMing: 'user', smtpMiMa: 'pass', shouJianRenLieBiao: ['ops@example.com'] })
    sheZhiGaoJingCeShiGouZi(null)
    await expect(faSongGaoJing('smtp成功', '标题', '内容')).resolves.toBe(true)
    expect(假.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.example.com', secure: true }))
    假.sendMail.mockRejectedValueOnce(new Error('smtp失败'))
    await expect(faSongGaoJing('smtp失败', '标题', '内容')).resolves.toBe(false)
  })

  it('AI 连续失败计数、阈值告警和成功重置', async () => {
    Object.assign(peiZhi.gaoJing, { shouJianRenLieBiao: ['ops@example.com'] })
    jiLuAIChengGong()
    const 钩子 = vi.fn(async () => true)
    sheZhiGaoJingCeShiGouZi(钩子)
    await jiLuAIShiBai('第一次')
    await jiLuAIShiBai('第二次')
    expect(钩子).toHaveBeenCalled()
    jiLuAIChengGong()
    await jiLuAIShiBai('重置后第一次')
    expect(钩子).toHaveBeenCalledTimes(1)
  })

  it('分级告警覆盖冷却、升级和 P1 无升级', async () => {
    Object.assign(peiZhi.gaoJing, { shouJianRenLieBiao: ['ops@example.com'] })
    const 钩子 = vi.fn(async () => false)
    sheZhiGaoJingCeShiGouZi(钩子)
    await expect(faSongFenJiGaoJing('P4', '同一键', '标题', '内容')).resolves.toBe(false)
    await expect(faSongFenJiGaoJing('P4', '同一键', '标题', '内容')).resolves.toBe(false)
    await expect(faSongFenJiGaoJing('P1', '最高键', '标题', '内容')).resolves.toBe(false)
    expect(钩子).toHaveBeenCalled()
  })
})
