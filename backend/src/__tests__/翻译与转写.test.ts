import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fanYiWenBen } from '../services/翻译'
import { mianFeiZhuanXieYuYin, sheZhiYuYinZhuanXieMock } from '../services/语音转写'
import { sheZhiMockTiaoYong, chongZhiDeepSeekKeHuDuan } from '../utils/DeepSeek客户端'

describe('翻译语言可选', () => {
  beforeEach(() => {
    chongZhiDeepSeekKeHuDuan()
    sheZhiYuYinZhuanXieMock(null)
  })

  it('默认译为中文（混合原文）', async () => {
    let tiShiCi = ''
    sheZhiMockTiaoYong(async (canShu) => {
      tiShiCi = String(canShu.xiaoXi[0].neiRong)
      return { neiRong: '你好', yuanShuJu: {} as never }
    })
    const jieGuo = await fanYiWenBen('Hello混杂world')
    expect(jieGuo.cheng_gong).toBe(true)
    expect(jieGuo.fan_yi).toBe('你好')
    expect(tiShiCi).toContain('中文')
    expect(tiShiCi).toContain('混合')
  })

  it('可指定译为英文', async () => {
    let tiShiCi = ''
    sheZhiMockTiaoYong(async (canShu) => {
      tiShiCi = String(canShu.xiaoXi[0].neiRong)
      return { neiRong: 'Hello', yuanShuJu: {} as never }
    })
    const jieGuo = await fanYiWenBen('你好', 'zh', 'en')
    expect(jieGuo.cheng_gong).toBe(true)
    expect(tiShiCi).toContain('英文')
  })

  it('非法语言回退默认中文', async () => {
    let tiShiCi = ''
    sheZhiMockTiaoYong(async (canShu) => {
      tiShiCi = String(canShu.xiaoXi[0].neiRong)
      return { neiRong: '你好', yuanShuJu: {} as never }
    })
    const jieGuo = await fanYiWenBen('Hello', 'xx', 'yy')
    expect(jieGuo.cheng_gong).toBe(true)
    expect(tiShiCi).toContain('中文')
  })

  it('空内容与超长直接失败不调模型', async () => {
    const diaoYong = vi.fn()
    sheZhiMockTiaoYong(diaoYong as never)
    expect((await fanYiWenBen('')).cheng_gong).toBe(false)
    expect((await fanYiWenBen('a'.repeat(501))).cheng_gong).toBe(false)
    expect(diaoYong).not.toHaveBeenCalled()
  })
})

describe('语音免费转写', () => {
  beforeEach(() => {
    sheZhiYuYinZhuanXieMock(null)
  })

  it('mock成功返回转写文本', async () => {
    sheZhiYuYinZhuanXieMock(async () => '混合文字歌声汪汪')
    await expect(mianFeiZhuanXieYuYin({ meiTiId: 'm1' })).resolves.toBe('混合文字歌声汪汪')
  })

  it('空媒体ID直接返回null', async () => {
    await expect(mianFeiZhuanXieYuYin({ meiTiId: '' })).resolves.toBeNull()
  })

  it('未配置密钥降级为null', async () => {
    const yuan = process.env.GUI_JI_LIU_DONG_API_MI_YAO
    process.env.GUI_JI_LIU_DONG_API_MI_YAO = ''
    try {
      await expect(mianFeiZhuanXieYuYin({ meiTiId: 'm1' })).resolves.toBeNull()
    } finally {
      if (yuan === undefined) delete process.env.GUI_JI_LIU_DONG_API_MI_YAO
      else process.env.GUI_JI_LIU_DONG_API_MI_YAO = yuan
    }
  })
})
