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

  // 表情面板展开/收起改变的是消息区 clientHeight（面板在 footer 的文档流里，是「顶起」而非覆盖）。
  // 旧实现按「面板高度增量」累加 scrollTop 并记账基线高度，有两处结构性错误：
  //   ① 展开时 scrollTop += cha 已被浏览器钳在 scrollHeight-clientHeight 上，超出量被吞掉，
  //      但基线仍记满 200，收起时全额扣回去 → 停在底部上方「丢失量」处（用户问题 #13）；
  //   ② 过渡期间逐帧回调读到的是中间态，末次写入的不是终值，且没有任何收尾校正。
  // 现在不再记账高度：面板几何变化的每一帧都直接写「此刻的真实底部」，
  // 写入值恒等于 scrollHeight - clientHeight，展开/收起两个方向共用同一句终点，
  // 因此既不可能被钳出丢失量，也不可能停在中间态；过渡结束再由 transitionend 收尾写一次。
  // 只观测模板 ref 拿到的那一个元素实例（旧实现用 document.querySelector('.emoji-mianban')
  // 抓全局类名，而 .gengduo-mianban 共用同一 emoji-zhankai 过渡，观测对象不唯一）。
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
    // 写完之后「距底」就是 0，钉底标志按事实同步为 true：补偿写入永不把自己判成「已离开底部」
    yiLai.dingZaiDiBu.value = true
  }

  function jieShuMianBanGuoDu() {
    mianBanGuoDuZhong = false
    if (mianBanGuoDuDingShi) {
      clearTimeout(mianBanGuoDuDingShi)
      mianBanGuoDuDingShi = null
    }
  }

  // 用户在补偿窗口内自己滚走了（scrollTop 不再等于我们刚写的那一值）就立刻停手，尊重新意图。
  // 判据只取 scrollTop 本身，绝不取「距底」——过渡中途的 clientHeight 正是不可信的读量，
  // 拿它判距底会把我们自己的写入误判成「用户离开了底部」（真机实测的 128px 残留即由此而来）。
  function chuLiXiaoXiQuGunDong() {
    const qu = yiLai.xiaoxiQuYuRef.value
    if (!mianBanGuoDuZhong || !qu || zuiJinXieRuJu === null) return
    if (qu.scrollTop !== zuiJinXieRuJu) jieShuMianBanGuoDu()
  }

  function chuLiMianBanGuoDuJieShu(shiJian: TransitionEvent) {
    const ren = emojiMianBanRef.value
    // 面板内子元素（.emoji-xiangmu 的 hover 过渡）的 transitionend 会冒泡上来，必须按实例过滤
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
    // 必须同时盯消息区本身：面板在 footer 文档流里「顶起」消息区，真正变小的是消息区。
    // 只观测面板会在「面板高度已定、消息区 clientHeight 还没重算」的那一帧写错终点，
    // 之后过渡窗口一关就没有第二次校正机会（实测：展开后恒距底 128px 不再回位）。
    mianBanGuanChaQi = new ResizeObserver(() => {
      // 只按「本次窗口是否还在补偿」判，不再回读 dingZaiDiBu：面板顶起消息区时，我们自己的
      // 钉底写入会派生一个 scroll 事件，而页面侧的钉底判定读到的是过渡中途的旧几何
      // （距底还差几十像素），于是把 dingZaiDiBu 误判成 false，补偿在窗口内被自己关掉。
      // 钉底意图在窗口开启那一刻已采集（见下方 watch），窗口内改由 chuLiXiaoXiQuGunDong 判用户意图。
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
    // 等布局真正落定再写：同步写读到的是上一帧的 clientHeight，等于把旧终点又写一遍
    requestAnimationFrame(() => {
      if (mianBanGuoDuZhong) huiDaoZhenShiDiBu()
    })
    // 过渡被中断（如 v-show 收尾置 display:none 时 transitionend 不到达）时的兜底收尾
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
