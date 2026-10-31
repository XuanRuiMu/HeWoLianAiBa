import { ref, watch, type Ref } from 'vue'
import { EMOJI_MIANBAN_PEI_ZHI } from '@/config/消息配置'

export type EmojiTabLeiXing = 'emoji' | 'biaoqingbao'

interface Use表情面板依赖 {
  shuRuNeiRong: Ref<string>
  xiaoxiQuYuRef: Ref<HTMLElement | null>
  dingZaiDiBu: Ref<boolean>
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

  const emojiMianBanRef = ref<HTMLElement | null>(null)
  let mianBanGuoDuZhong = false
  let mianBanGuoDuDingShi: ReturnType<typeof setTimeout> | null = null
  let mianBanGuanChaQi: ResizeObserver | null = null
  let yiGuanChaDanYuan: HTMLElement | null = null
  let yiGuanChaXiaoXiQu: HTMLElement | null = null
  let zuiJinXieRuJu: number | null = null

  function huiDaoZhenShiDiBu() {
    const qu = yiLai.xiaoxiQuYuRef.value
    if (!qu) return
    const juDi = qu.scrollHeight - qu.clientHeight
    qu.scrollTop = juDi > 0 ? juDi : 0
    zuiJinXieRuJu = qu.scrollTop
    yiLai.dingZaiDiBu.value = true
  }

  function jieShuMianBanGuoDu() {
    mianBanGuoDuZhong = false
    if (mianBanGuoDuDingShi) {
      clearTimeout(mianBanGuoDuDingShi)
      mianBanGuoDuDingShi = null
    }
  }

  function chuLiXiaoXiQuGunDong() {
    const qu = yiLai.xiaoxiQuYuRef.value
    if (!mianBanGuoDuZhong || !qu || zuiJinXieRuJu === null) return
    if (qu.scrollTop !== zuiJinXieRuJu) jieShuMianBanGuoDu()
  }

  function chuLiMianBanGuoDuJieShu(shiJian: TransitionEvent) {
    const ren = emojiMianBanRef.value
    if (!ren || shiJian.target !== ren || !mianBanGuoDuZhong) return
    huiDaoZhenShiDiBu()
    jieShuMianBanGuoDu()
  }

  function guanBieMianBanGuanCha() {
    if (yiGuanChaDanYuan) {
      yiGuanChaDanYuan.removeEventListener('transitionend', chuLiMianBanGuoDuJieShu as EventListener)
    }
    if (yiGuanChaXiaoXiQu) {
      yiGuanChaXiaoXiQu.removeEventListener('scroll', chuLiXiaoXiQuGunDong as EventListener)
    }
    if (mianBanGuanChaQi) {
      mianBanGuanChaQi.disconnect()
      mianBanGuanChaQi = null
    }
    if (mianBanGuoDuDingShi) {
      clearTimeout(mianBanGuoDuDingShi)
      mianBanGuoDuDingShi = null
    }
    mianBanGuoDuZhong = false
    yiGuanChaDanYuan = null
    yiGuanChaXiaoXiQu = null
  }

  function shuaXinGuanCha() {
    const mianBan = emojiMianBanRef.value
    const xiaoxiQu = yiLai.xiaoxiQuYuRef.value
    if (yiGuanChaDanYuan === mianBan && yiGuanChaXiaoXiQu === xiaoxiQu && (mianBan === null || mianBanGuanChaQi)) return
    guanBieMianBanGuanCha()
    if (!mianBan) return
    yiGuanChaDanYuan = mianBan
    mianBan.addEventListener('transitionend', chuLiMianBanGuoDuJieShu as EventListener)
    mianBanGuanChaQi = new ResizeObserver(() => {
      if (!mianBanGuoDuZhong) return
      huiDaoZhenShiDiBu()
    })
    mianBanGuanChaQi.observe(mianBan)
    if (xiaoxiQu) {
      mianBanGuanChaQi.observe(xiaoxiQu)
      xiaoxiQu.addEventListener('scroll', chuLiXiaoXiQuGunDong as EventListener)
      yiGuanChaXiaoXiQu = xiaoxiQu
    }
  }

  watch([emojiMianBanRef, () => yiLai.xiaoxiQuYuRef.value], () => {
    shuaXinGuanCha()
  })

  watch(emojiMianBanZhanKai, () => {
    if (!emojiMianBanRef.value) return
    if (!yiLai.dingZaiDiBu.value) {
      jieShuMianBanGuoDu()
      return
    }
    mianBanGuoDuZhong = true
    requestAnimationFrame(() => {
      if (mianBanGuoDuZhong) huiDaoZhenShiDiBu()
    })
    mianBanGuoDuDingShi = setTimeout(() => {
      huiDaoZhenShiDiBu()
      jieShuMianBanGuoDu()
    }, EMOJI_MIANBAN_PEI_ZHI.guoDuShouWeiHaoMiao)
  })

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
    const yuanSheng = emojiMianBanRef.value
    if (!yuanSheng) return
    const linShi = yuanSheng.cloneNode(true) as HTMLElement
    linShi.style.cssText =
      'position:fixed;inset:0;opacity:0;pointer-events:none;z-index:-1;display:grid;overflow:hidden;'
    document.body.appendChild(linShi)
    yuZaiEmojiLinShi = linShi
    void linShi.offsetWidth
    void linShi.getBoundingClientRect()
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
    guanBieMianBanGuanCha()
    if (yuZaiEmojiLinShi && yuZaiEmojiLinShi.parentNode) {
      yuZaiEmojiLinShi.parentNode.removeChild(yuZaiEmojiLinShi)
      yuZaiEmojiLinShi = null
    }
  }

  return {
    emojiTab,
    emojiMianBanZhanKai,
    emojiMianBanRef,
    changYongEmoji,
    qieHuanEmojiMianBan,
    chaRuEmoji,
    qieHuanEmojiTab,
    yuZaiEmojiZiXing,
    qingLiEmojiZiYuan,
  }
}
