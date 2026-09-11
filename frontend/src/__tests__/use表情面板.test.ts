import { ref } from 'vue'
import { describe, it, expect } from 'vitest'
import { use表情面板 } from '@/composables/use表情面板'

function zaoYiLai() {
  return {
    shuRuNeiRong: ref(''),
    xiaoxiQuYuRef: ref<HTMLElement | null>(null),
  }
}

describe('use表情面板', () => {
  it('点击 emoji 追加到输入内容', () => {
    const yiLai = zaoYiLai()
    const { chaRuEmoji } = use表情面板(yiLai)
    expect(yiLai.shuRuNeiRong.value).toBe('')
    chaRuEmoji('A')
    chaRuEmoji('B')
    expect(yiLai.shuRuNeiRong.value).toBe('AB')
  })

  it('面板展开状态与标签页可切换', () => {
    const { emojiMianBanZhanKai, qieHuanEmojiMianBan, emojiTab, qieHuanEmojiTab } =
      use表情面板(zaoYiLai())
    expect(emojiMianBanZhanKai.value).toBe(false)
    qieHuanEmojiMianBan()
    expect(emojiMianBanZhanKai.value).toBe(true)
    qieHuanEmojiMianBan()
    expect(emojiMianBanZhanKai.value).toBe(false)
    expect(emojiTab.value).toBe('emoji')
    qieHuanEmojiTab('biaoqingbao')
    expect(emojiTab.value).toBe('biaoqingbao')
    qieHuanEmojiTab('emoji')
    expect(emojiTab.value).toBe('emoji')
  })

  it('常用表情库完整且无重复', () => {
    const { changYongEmoji } = use表情面板(zaoYiLai())
    expect(changYongEmoji.length).toBe(168)
    expect(new Set(changYongEmoji).size).toBe(changYongEmoji.length)
  })

  it('清理资源在未初始化观察器时安全执行', () => {
    const { chuShiHuaEmojiGunDongBuChang, qingLiEmojiZiYuan, chongZhiEmojiBuChangJiXian } =
      use表情面板(zaoYiLai())
    expect(() => {
      chuShiHuaEmojiGunDongBuChang()
      qingLiEmojiZiYuan()
      chongZhiEmojiBuChangJiXian()
    }).not.toThrow()
  })
})
