import { ref, type Ref } from 'vue'

export type EmojiTabLeiXing = 'emoji' | 'biaoqingbao'

interface Use表情面板依赖 {
  shuRuNeiRong: Ref<string>
  xiaoxiQuYuRef: Ref<HTMLElement | null>
}

export function use表情面板(yiLai: Use表情面板依赖) {
  const emojiTab = ref<EmojiTabLeiXing>('emoji')
  const emojiMianBanZhanKai = ref(false)

  const changYongEmoji = [
    '😀',
    '😃',
    '😄',
    '😁',
    '😆',
    '😅',
    '🤣',
    '😂',
    '🙂',
    '😊',
    '😇',
    '🥰',
    '😍',
    '🤩',
    '😘',
    '😗',
    '😚',
    '😙',
    '🥲',
    '😋',
    '😛',
    '😜',
    '🤪',
    '😝',
    '🤗',
    '🤭',
    '🤫',
    '🤔',
    '🫡',
    '🤐',
    '🤨',
    '😐',
    '😑',
    '😶',
    '🫥',
    '😏',
    '😒',
    '🙄',
    '😬',
    '😮‍💨',
    '🤥',
    '😌',
    '😔',
    '😪',
    '🤤',
    '😴',
    '😷',
    '🤒',
    '🤕',
    '🤢',
    '🤮',
    '🥵',
    '🥶',
    '🥴',
    '😵',
    '🤯',
    '🤠',
    '🥳',
    '🥸',
    '😎',
    '🤓',
    '🧐',
    '😕',
    '🫤',
    '😟',
    '🙁',
    '☹️',
    '😮',
    '😯',
    '😲',
    '😳',
    '🥺',
    '🥹',
    '😦',
    '😧',
    '😨',
    '😰',
    '😥',
    '😢',
    '😭',
    '😱',
    '😖',
    '😣',
    '😞',
    '😓',
    '😩',
    '😫',
    '🥱',
    '😤',
    '😡',
    '😠',
    '🤬',
    '😈',
    '👿',
    '💀',
    '☠️',
    '💩',
    '🤡',
    '👹',
    '👺',
    '👻',
    '👽',
    '👾',
    '🤖',
    '❤️',
    '🧡',
    '💛',
    '💚',
    '💙',
    '💜',
    '🖤',
    '🤍',
    '💔',
    '❤️‍🔥',
    '💕',
    '💞',
    '💓',
    '💗',
    '💖',
    '💘',
    '💝',
    '💟',
    '♥️',
    '🫶',
    '👍',
    '👎',
    '👊',
    '✊',
    '🤞',
    '✌️',
    '🤟',
    '🤘',
    '👌',
    '🤌',
    '🤏',
    '👈',
    '👉',
    '👆',
    '👇',
    '☝️',
    '✋',
    '🤚',
    '🖐️',
    '🖖',
    '👋',
    '🤙',
    '💪',
    '🦾',
    '🙏',
    '✍️',
    '💅',
    '🤳',
    '🔥',
    '⭐',
    '🌟',
    '💫',
    '✨',
    '⚡',
    '💥',
    '🎉',
    '🎊',
    '🎈',
    '🎁',
    '🏆',
    '🥇',
    '🎯',
    '🎮',
    '🎲',
  ]

  // 表情面板展开/收起会改变「聊天区 + 输入区」的 grid 行高（行 2 = auto）。
  // 若不补偿，面板会直接吃掉聊天区底部约 200px、把底部消息裁掉（表现为「覆盖」）。
  // 用 ResizeObserver 监听面板实际高度变化，按「高度增量」同步把聊天区向上滚动相同距离，
  // 使面板无论处于何种滚动位置都「顶起」聊天内容而非覆盖；收起时反向恢复原位。
  let shangYiEmojiGaoDu = 0
  let emojiMianBanGuanChaQi: ResizeObserver | null = null

  function chuShiHuaEmojiGunDongBuChang() {
    const mianBan = document.querySelector('.emoji-mianban') as HTMLElement | null
    if (!mianBan) return
    shangYiEmojiGaoDu = mianBan.offsetHeight
    emojiMianBanGuanChaQi = new ResizeObserver(() => {
      const qu = yiLai.xiaoxiQuYuRef.value
      const ban = document.querySelector('.emoji-mianban') as HTMLElement | null
      if (!qu || !ban) return
      const xinGao = ban.offsetHeight
      const cha = xinGao - shangYiEmojiGaoDu
      if (cha !== 0) qu.scrollTop += cha
      shangYiEmojiGaoDu = xinGao
    })
    emojiMianBanGuanChaQi.observe(mianBan)
  }

  function chongZhiEmojiBuChangJiXian() {
    shangYiEmojiGaoDu = 0
  }

  function qieHuanEmojiMianBan() {
    emojiMianBanZhanKai.value = !emojiMianBanZhanKai.value
  }

  function chaRuEmoji(emoji: string) {
    yiLai.shuRuNeiRong.value += emoji
  }

  function qieHuanEmojiTab(tab: EmojiTabLeiXing) {
    emojiTab.value = tab
  }

  let yuZaiEmojiLinShi: HTMLElement | null = null

  function yuZaiEmojiZiXing() {
    if (typeof document === 'undefined') return
    const yuanSheng = document.querySelector('.emoji-mianban')
    if (!yuanSheng) return
    const linShi = yuanSheng.cloneNode(true) as HTMLElement
    // 关键修正：用 opacity:0（而非 visibility:hidden）强制浏览器真正「绘制」该克隆层，
    // 从而把约 170 个 emoji 系统字形一次性 rasterize 并缓存；置于视口内、最底层、禁命中，
    // 既触发合成绘制又不可见、不挡交互。原 visibility:hidden 方案浏览器会跳过字形绘制，
    // 导致首次真实展开（v-show display:none→block）时仍需当场 rasterize → 明显的「第一次点开卡顿」。
    linShi.style.cssText =
      'position:fixed;inset:0;opacity:0;pointer-events:none;z-index:-1;display:grid;overflow:hidden;'
    document.body.appendChild(linShi)
    yuZaiEmojiLinShi = linShi
    // 强制同步布局
    void linShi.offsetWidth
    void linShi.getBoundingClientRect()
    // 再强制两帧真实绘制（opacity:0 合成层需提交到合成线程才算 rasterize 完成），随后移除
    const qingLi = () => {
      if (yuZaiEmojiLinShi && yuZaiEmojiLinShi.parentNode) {
        yuZaiEmojiLinShi.parentNode.removeChild(yuZaiEmojiLinShi)
      }
      yuZaiEmojiLinShi = null
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(qingLi))
    } else {
      qingLi()
    }
  }

  function qingLiEmojiZiYuan() {
    if (emojiMianBanGuanChaQi) {
      emojiMianBanGuanChaQi.disconnect()
      emojiMianBanGuanChaQi = null
    }
    if (yuZaiEmojiLinShi && yuZaiEmojiLinShi.parentNode) {
      yuZaiEmojiLinShi.parentNode.removeChild(yuZaiEmojiLinShi)
      yuZaiEmojiLinShi = null
    }
  }

  return {
    emojiTab,
    emojiMianBanZhanKai,
    changYongEmoji,
    chuShiHuaEmojiGunDongBuChang,
    chongZhiEmojiBuChangJiXian,
    qieHuanEmojiMianBan,
    chaRuEmoji,
    qieHuanEmojiTab,
    yuZaiEmojiZiXing,
    qingLiEmojiZiYuan,
  }
}
