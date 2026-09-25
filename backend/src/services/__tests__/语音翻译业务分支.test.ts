import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  多模态: { peiZhi: vi.fn(), miYao: vi.fn() },
  debug: { warn: vi.fn(), error: vi.fn() },
  deep: vi.fn(),
}))

vi.mock('../../config/多模态配置', () => ({ huoQuDuoMoTaiPeiZhi: 假.多模态.peiZhi, huoQuGuiJiLiuDongMiYao: 假.多模态.miYao }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))
vi.mock('../../utils/DeepSeek客户端', () => ({ tiaoYongDeepSeek: 假.deep }))

import { gouJianYuYinKeDuWenBen, huoQuYinPinShiJianMiaoShu, rongHeYuYinXiaoXiNeiRong, sheZhiYuYinLiJieMock, tiQuYinPinShiJian } from '../语音理解'
import { fanYiWenBen } from '../翻译'

beforeEach(() => {
  vi.clearAllMocks()
  sheZhiYuYinLiJieMock(null)
  假.多模态.peiZhi.mockReturnValue({ yuYinLiJieQiYong: false, guiJiLiuDongYuYinMoXing: '', qingQiuChaoShiHaoMiao: 1000 })
  假.多模态.miYao.mockReturnValue('')
  假.deep.mockResolvedValue({ neiRong: '译文' })
})

describe('语音理解与翻译业务分支', () => {
  it('语音文本、时长、事件标签和融合覆盖全部分支', () => {
    expect(gouJianYuYinKeDuWenBen({ zhuanXieWenBen: '转写', yinPinShiJianMiaoShu: '音乐', shiChangHaoMiao: 2000 })).toBe('[语音转写：转写][音频事件：音乐](2秒)')
    expect(gouJianYuYinKeDuWenBen({ zhuanXieWenBen: '转写', shiChangHaoMiao: 0 })).toBe('[语音转写：转写]')
    expect(gouJianYuYinKeDuWenBen({ yinPinShiJianMiaoShu: '掌声', shiChangHaoMiao: 1000 })).toBe('[语音：掌声](1秒)')
    expect(gouJianYuYinKeDuWenBen({ shiChangHaoMiao: 1000 })).toBe('[语音](1秒)')
    expect(rongHeYuYinXiaoXiNeiRong(null, '描述', { shiChangHaoMiao: 1000 })).toBe('描述')
    expect(rongHeYuYinXiaoXiNeiRong('转写', '描述')).toBe('[语音转写：转写]')
    expect(tiQuYinPinShiJian('<music> 狗叫 猫叫 掌声 前奏 主歌')).toBe('音乐、狗叫、猫叫、环境声、前奏、歌曲段落')
    expect(tiQuYinPinShiJian('')).toBeNull()
  })

  it('音频事件mock、参数校验和配置降级', async () => {
    const mock = vi.fn(async () => '事件')
    sheZhiYuYinLiJieMock(mock)
    await expect(huoQuYinPinShiJianMiaoShu({ sha256: 'x', mime: 'audio/webm' })).resolves.toBe('事件')
    mock.mockRejectedValueOnce(new Error('失败'))
    await expect(huoQuYinPinShiJianMiaoShu({ sha256: 'x', mime: 'audio/webm' })).resolves.toBeNull()
    sheZhiYuYinLiJieMock(null)
    await expect(huoQuYinPinShiJianMiaoShu({ sha256: 'x', mime: 'audio/webm' })).resolves.toBeNull()
    await expect(huoQuYinPinShiJianMiaoShu({ sha256: 'bad', mime: 'audio/webm' })).resolves.toBeNull()
    假.多模态.peiZhi.mockReturnValue({ yuYinLiJieQiYong: true, guiJiLiuDongYuYinMoXing: '模型', qingQiuChaoShiHaoMiao: 1000 })
    假.多模态.miYao.mockReturnValue('key')
    await expect(huoQuYinPinShiJianMiaoShu({ sha256: 'a'.repeat(64), mime: 'audio/webm' })).resolves.toBeNull()
  })

  it('翻译覆盖空内容、超长、语言归一、成功、空响应和异常', async () => {
    await expect(fanYiWenBen('')).resolves.toMatchObject({ cheng_gong: false })
    await expect(fanYiWenBen('x'.repeat(501))).resolves.toMatchObject({ cheng_gong: false })
    await expect(fanYiWenBen('你好', '英文', '中文')).resolves.toEqual({ cheng_gong: true, fan_yi: '译文' })
    假.deep.mockResolvedValueOnce({ neiRong: ' ' })
    await expect(fanYiWenBen('你好', 'auto', '不存在')).resolves.toMatchObject({ cheng_gong: false })
    假.deep.mockRejectedValueOnce(new Error('网络'))
    await expect(fanYiWenBen('你好', 1, 2)).resolves.toMatchObject({ cheng_gong: false })
  })
})
