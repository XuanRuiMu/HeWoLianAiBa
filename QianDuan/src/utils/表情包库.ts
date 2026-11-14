import { huoQuFanYi } from '@/config/翻译表'

export interface BiaoQingBaoDingYi {
  id: string
  emoji: string
  wenZi: string
}

export const BiaoQingBaoChicun = 512
export const BiaoQingBaoEmojiZihao = 280
export const BiaoQingBaoWenziZihao = 48
export const BiaoQingBaoMiaobianKuandu = 8
const BiaoQingBaoWenziTianchongSe = '#ffffff'
const BiaoQingBaoMiaobianSe = '#000000'
export const EmojiZitiDui =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
export const WenziZitiDui = 'bold "PingFang SC", "Microsoft YaHei", sans-serif'

export const BiaoQingBaoLieBiao: BiaoQingBaoDingYi[] = [
  { id: 'xiaoku', emoji: '😂', wenZi: '笑哭' },
  { id: 'pengha', emoji: '🤣', wenZi: '绷不住了' },
  { id: 'goutou', emoji: '🐶', wenZi: '狗头保命' },
  { id: 'xiaochou', emoji: '🤡', wenZi: '小丑竟是我自己' },
  { id: 'dianzan', emoji: '👍', wenZi: '点赞' },
  { id: 'meigui', emoji: '🌹', wenZi: '玫瑰' },
  { id: 'xinsui', emoji: '💔', wenZi: '心碎' },
  { id: 'aixinyan', emoji: '🥰', wenZi: '被爱包围' },
  { id: 'daku', emoji: '😭', wenZi: '大哭' },
  { id: 'wulian', emoji: '🙈', wenZi: '没眼看' },
  { id: 'qingzhu', emoji: '🎉', wenZi: '庆祝' },
  { id: 'aixin', emoji: '❤️', wenZi: '爱心' },
  { id: 'mohua', emoji: '😎', wenZi: '墨镜耍酷' },
  { id: 'qiudao', emoji: '🙏', wenZi: '求求了' },
]

export async function xuanRanBiaoQingBao(emoji: string, wenZi: string): Promise<Blob> {
  const huaBu = document.createElement('canvas')
  huaBu.width = BiaoQingBaoChicun
  huaBu.height = BiaoQingBaoChicun
  const huaBuShangXiaWen = huaBu.getContext('2d') as CanvasRenderingContext2D | null
  if (!huaBuShangXiaWen) {
    throw new Error(huoQuFanYi('duoMeiTi', 'biaoQingBaoXuanRanShiBai'))
  }

  huaBuShangXiaWen.clearRect(0, 0, BiaoQingBaoChicun, BiaoQingBaoChicun)
  huaBuShangXiaWen.textAlign = 'center'
  huaBuShangXiaWen.textBaseline = 'middle'

  huaBuShangXiaWen.font = `${BiaoQingBaoEmojiZihao}px ${EmojiZitiDui}`
  huaBuShangXiaWen.fillText(emoji, BiaoQingBaoChicun / 2, BiaoQingBaoChicun / 2 - 30)

  huaBuShangXiaWen.font = `${BiaoQingBaoWenziZihao}px ${WenziZitiDui}`
  huaBuShangXiaWen.lineWidth = BiaoQingBaoMiaobianKuandu
  huaBuShangXiaWen.strokeStyle = BiaoQingBaoMiaobianSe
  huaBuShangXiaWen.fillStyle = BiaoQingBaoWenziTianchongSe
  huaBuShangXiaWen.lineJoin = 'round'
  huaBuShangXiaWen.strokeText(wenZi, BiaoQingBaoChicun / 2, BiaoQingBaoChicun - 72)
  huaBuShangXiaWen.fillText(wenZi, BiaoQingBaoChicun / 2, BiaoQingBaoChicun - 72)

  return new Promise<Blob>((jieJue, juJue) => {
    huaBu.toBlob((blob) => {
      if (blob) jieJue(blob)
      else juJue(new Error(huoQuFanYi('duoMeiTi', 'biaoQingBaoXuanRanShiBai')))
    }, 'image/png')
  })
}
