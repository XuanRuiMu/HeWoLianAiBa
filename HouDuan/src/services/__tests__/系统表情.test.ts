import { beforeEach, describe, expect, it, vi } from 'vitest'

const 候选系统表情Mock = vi.hoisted(() => vi.fn())

const 按短名查Mock = vi.hoisted(() => vi.fn())

const 短名转UUIDMock = vi.hoisted(() => vi.fn())

const baoCunMeiTiXiaoXiMock = vi.hoisted(() => vi.fn())

vi.mock('../表情包库', () => ({
  候选系统表情: (...canShu: unknown[]) => 候选系统表情Mock(...canShu),
  按短名查: (...canShu: unknown[]) => 按短名查Mock(...canShu),
  短名转UUID: (...canShu: unknown[]) => 短名转UUIDMock(...canShu),
}))

vi.mock('../消息', () => ({
  保存角色媒体消息: (...canShu: unknown[]) => baoCunMeiTiXiaoXiMock(...canShu),
}))

vi.mock('../../数据库', () => ({
  数据库: {
    query: vi.fn(async () => ({ rows: [] })),
    connect: vi.fn(async () => ({ query: vi.fn(), release: vi.fn() })),
  },
}))

import {
  查找表情按短名,
  发送表情包消息,
  候选包装,
  生成表情候选文本,
  组装表情候选块,
  type XiTongBiaoQingXiang,
} from '../系统表情'
import { jieXiDirectorXiangYing } from '../Director'
import { BiaoQingBaoYunXing } from '../../config/表情包配置'
import type { BiaoQingZaiTiJueCe } from '../表情载体'

function fangXingJueCe(gengDuo: Partial<BiaoQingZaiTiJueCe> = {}): BiaoQingZaiTiJueCe {
  return {
    geiHouXuan: true,
    yuanYin: '放行',
    yunXuFengGe: ['黄脸', '祝福'],
    guanXiJieDuanXuHao: 6,
    nianLingDang: '长辈',
    qiWangJianGeLunShu: 20,
    shangCiFaTuLunShu: null,
    quXiang: '正常',
    ...gengDuo,
  }
}

function kuTiaoMu(zhi: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    duanMing: '熊猫头无语',
    miaoShu: '熊猫头旁边写着无语',
    qingXuBiaoQian: '无语',
    shiYongChangJing: '接住无话可说的场面',
    qiYong: true,
    sha256: 'a'.repeat(64),
    mime: 'image/png',
    ziJieShu: 4096,
    wenJianMing: 'xiong-mao-tou.png',
    wenJianLuJing: '/tmp/xiong-mao-tou.png',
    ...zhi,
  }
}

function xiang(zhi: Partial<XiTongBiaoQingXiang> = {}): XiTongBiaoQingXiang {
  return {
    id: 'uuid-1',
    duanMing: '熊猫头无语',
    miaoShu: '熊猫头旁边写着无语',
    qingXuBiaoQian: '无语',
    shiYongChangJing: '接住无话可说的场面',
    sha256: 'a'.repeat(64),
    mime: 'image/png',
    ...zhi,
  }
}

beforeEach(() => {
  候选系统表情Mock.mockReset()
  按短名查Mock.mockReset()
  短名转UUIDMock.mockReset()
  baoCunMeiTiXiaoXiMock.mockReset()
  短名转UUIDMock.mockImplementation((duanMing: string) => `uuid-${duanMing}`)
})

describe('候选来自表情包库', () => {
  it('按意图取候选并补上稳定 id', async () => {
    候选系统表情Mock.mockResolvedValue([kuTiaoMu()])
    const lieBiao = await 候选包装('无语', 8)
    expect(候选系统表情Mock).toHaveBeenCalledWith('无语', 8, undefined, undefined)
    expect(lieBiao).toHaveLength(1)
    expect(lieBiao[0]).toMatchObject({
      id: 'uuid-熊猫头无语',
      duanMing: '熊猫头无语',
      miaoShu: '熊猫头旁边写着无语',
      qingXuBiaoQian: '无语',
      shiYongChangJing: '接住无话可说的场面',
      sha256: 'a'.repeat(64),
      mime: 'image/png',
    })
  })

  it('意图为空或空白时按无标签取候选', async () => {
    候选系统表情Mock.mockResolvedValue([kuTiaoMu()])
    await 候选包装(null, 8)
    expect(候选系统表情Mock).toHaveBeenLastCalledWith(null, 8, undefined, undefined)
    await 候选包装('   ', 8)
    expect(候选系统表情Mock).toHaveBeenLastCalledWith(null, 8, undefined, undefined)
  })

  it('库为空时返回空数组且不抛错', async () => {
    候选系统表情Mock.mockResolvedValue([])
    await expect(候选包装('无语', 8)).resolves.toEqual([])
  })

  it('库读取抛错时返回空数组且不抛错', async () => {
    候选系统表情Mock.mockRejectedValue(new Error('目录不存在'))
    await expect(候选包装('无语', 8)).resolves.toEqual([])
  })
})

describe('按短名查条目', () => {
  it('命中时返回条目并对短名去空白', async () => {
    按短名查Mock.mockResolvedValue(kuTiaoMu())
    const jieGuo = await 查找表情按短名('  熊猫头无语  ')
    expect(按短名查Mock).toHaveBeenCalledWith('熊猫头无语')
    expect(jieGuo).toMatchObject({ duanMing: '熊猫头无语', mime: 'image/png' })
  })

  it('未命中返回空', async () => {
    按短名查Mock.mockResolvedValue(null)
    await expect(查找表情按短名('不存在的短名')).resolves.toBeNull()
  })

  it('停用条目不参与发送', async () => {
    按短名查Mock.mockResolvedValue(kuTiaoMu({ qiYong: false }))
    await expect(查找表情按短名('熊猫头无语')).resolves.toBeNull()
  })

  it('空短名与查询抛错都返回空', async () => {
    按短名查Mock.mockResolvedValue(kuTiaoMu())
    await expect(查找表情按短名('   ')).resolves.toBeNull()
    expect(按短名查Mock).not.toHaveBeenCalled()
    按短名查Mock.mockRejectedValue(new Error('扫描炸了'))
    await expect(查找表情按短名('熊猫头无语')).resolves.toBeNull()
  })
})

describe('表情包消息发送', () => {
  it('走无媒体行加短名的落库参数', async () => {
    按短名查Mock.mockResolvedValue(kuTiaoMu())
    baoCunMeiTiXiaoXiMock.mockResolvedValue({ id: 'x-1', lei_xing: 'biaoQingBao' })
    const jieGuo = await 发送表情包消息('u-1', 'j-1', '熊猫头无语')
    expect(jieGuo?.id).toBe('x-1')
    expect(baoCunMeiTiXiaoXiMock).toHaveBeenCalledTimes(1)
    const canShu = baoCunMeiTiXiaoXiMock.mock.calls[0][0] as Record<string, unknown>
    expect(canShu.mei_ti_id).toBeNull()
    expect(canShu.duan_ming).toBe('熊猫头无语')
    expect(canShu.lei_xing).toBe('biaoQingBao')
    expect(canShu.yong_hu_id).toBe('u-1')
    expect(canShu.jiao_se_id).toBe('j-1')
    expect(canShu.nei_rong).toBe('[贴纸:熊猫头无语]')
  })

  it('未命中表情库时不落库', async () => {
    按短名查Mock.mockResolvedValue(null)
    await expect(发送表情包消息('u-1', 'j-1', '不存在的')).resolves.toBeNull()
    expect(baoCunMeiTiXiaoXiMock).not.toHaveBeenCalled()
  })

  it('落库失败时返回空且不抛错', async () => {
    按短名查Mock.mockResolvedValue(kuTiaoMu())
    baoCunMeiTiXiaoXiMock.mockRejectedValue(new Error('unique 冲突'))
    await expect(发送表情包消息('u-1', 'j-1', '熊猫头无语')).resolves.toBeNull()
  })

  it('空短名直接丢弃', async () => {
    await expect(发送表情包消息('u-1', 'j-1', '   ')).resolves.toBeNull()
    expect(按短名查Mock).not.toHaveBeenCalled()
    expect(baoCunMeiTiXiaoXiMock).not.toHaveBeenCalled()
  })
})

describe('候选块组装', () => {
  it('说明文字放开图的形态且不写死一图一文', () => {
    const kuai = 组装表情候选块([xiang()])
    expect(kuai).toContain('【表情包候选】')
    expect(kuai).toContain('[贴纸:熊猫头无语]')
    expect(kuai).toContain('位置本身就是语气')
    expect(kuai).toContain('只发一张图')
    expect(kuai).toContain('别再用文字说一遍')
    expect(kuai).toContain(`一轮最多 ${BiaoQingBaoYunXing.zuiDaMeiLunZhangShu} 张`)
    expect(kuai).not.toContain('不是把话说完再补一张图')
    expect(kuai).not.toContain('用一张图代替你要打的那个词')
    expect(kuai).toContain('情绪:无语')
    expect(kuai).toContain('场景:接住无话可说的场面')
  })

  it('描述与场景为空时有兜底文案', () => {
    const kuai = 组装表情候选块([xiang({ miaoShu: '', shiYongChangJing: '' })])
    expect(kuai).toContain('描述:无')
    expect(kuai).toContain('场景:通用')
  })

  it('候选为空时返回空串', () => {
    expect(组装表情候选块([])).toBe('')
  })
})

describe('候选文本总开关', () => {
  it('意图为空但门控放行时仍给候选', async () => {
    候选系统表情Mock.mockResolvedValue([kuTiaoMu()])
    await expect(生成表情候选文本(null, fangXingJueCe())).resolves.toContain(
      '[贴纸:熊猫头无语]',
    )
    expect(候选系统表情Mock).toHaveBeenCalled()
  })

  it('门控拒绝时返回空串且不查库', async () => {
    await expect(
      生成表情候选文本('无语', fangXingJueCe({ geiHouXuan: false })),
    ).resolves.toBe('')
    expect(候选系统表情Mock).not.toHaveBeenCalled()
  })

  it('门控放行时把人设风格与关系阶段透传给图库', async () => {
    候选系统表情Mock.mockResolvedValue([kuTiaoMu()])
    await 生成表情候选文本('无语', fangXingJueCe())
    expect(候选系统表情Mock).toHaveBeenCalledWith('无语', BiaoQingBaoYunXing.houXuanShuLiang, {
      yunXuFengGe: ['黄脸', '祝福'],
      guanXiJieDuanXuHao: 6,
    }, undefined)
  })

  it('库关闭时返回空串', async () => {
    const yuan = BiaoQingBaoYunXing.daKai
    ;(BiaoQingBaoYunXing as { daKai: boolean }).daKai = false
    try {
      候选系统表情Mock.mockResolvedValue([kuTiaoMu()])
      await expect(生成表情候选文本('无语', fangXingJueCe())).resolves.toBe('')
      expect(候选系统表情Mock).not.toHaveBeenCalled()
    } finally {
      ;(BiaoQingBaoYunXing as { daKai: boolean }).daKai = yuan
    }
  })

  it('打开且库有候选时拼出候选块', async () => {
    候选系统表情Mock.mockResolvedValue([kuTiaoMu()])
    const wenBen = await 生成表情候选文本('无语', fangXingJueCe())
    expect(wenBen).toContain('[贴纸:熊猫头无语]')
    expect(候选系统表情Mock).toHaveBeenCalled()
  })

  it('不传门控决策时一律不给候选，避免绕过人设判断', async () => {
    候选系统表情Mock.mockResolvedValue([kuTiaoMu()])
    await expect(生成表情候选文本('无语')).resolves.toBe('')
    expect(候选系统表情Mock).not.toHaveBeenCalled()
  })
})

describe('Director 表情包意图解析', () => {
  it('白名单内的意图保留', () => {
    const { ceLue } = jieXiDirectorXiangYing('{"用户意图":"x","情感分析":"y","回复策略":"z","是否回复":true,"回复条数":1,"时间情绪":"t","是否撤回":false,"是否主动表白":false,"biao_qing_yi_tu":"好笑"}')
    expect(ceLue.biao_qing_yi_tu).toBe('好笑')
  })

  it('白名单外的意图归为 null', () => {
    const { ceLue } = jieXiDirectorXiangYing('{"biao_qing_yi_tu":"乱写的"}')
    expect(ceLue.biao_qing_yi_tu).toBeNull()
    const kong = jieXiDirectorXiangYing('{"biao_qing_yi_tu":null}')
    expect(kong.ceLue.biao_qing_yi_tu).toBeNull()
    const queSheng = jieXiDirectorXiangYing('{}')
    expect(queSheng.ceLue.biao_qing_yi_tu).toBeNull()
  })
})
