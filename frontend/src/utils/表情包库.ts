import { huoQuFanYi } from '@/config/translations'

export interface BiaoQingBaoDingYi {
  id: string
  emoji: string
  wenZi: string
}

export const BIAO_QING_BAO_CHICUN = 512
export const BIAO_QING_BAO_EMOJI_ZIHAO = 280
export const BIAO_QING_BAO_WENZI_ZIHAO = 48
export const BIAO_QING_BAO_MIAOBIAN_KUANDU = 8
const BIAO_QING_BAO_WENZI_TIANCHONG_SE = '#ffffff'
const BIAO_QING_BAO_MIAOBIAN_SE = '#000000'
export const EMOJI_ZITI_DUI =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
export const WENZI_ZITI_DUI = 'bold "PingFang SC", "Microsoft YaHei", sans-serif'

export const BIAO_QING_BAO_LIE_BIAO: BiaoQingBaoDingYi[] = [
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
  const canvas = document.createElement('canvas')
  canvas.width = BIAO_QING_BAO_CHICUN
  canvas.height = BIAO_QING_BAO_CHICUN
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null
  if (!ctx) {
    throw new Error(huoQuFanYi('duoMeiTi', 'biaoQingBaoXuanRanShiBai'))
  }

  ctx.clearRect(0, 0, BIAO_QING_BAO_CHICUN, BIAO_QING_BAO_CHICUN)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.font = `${BIAO_QING_BAO_EMOJI_ZIHAO}px ${EMOJI_ZITI_DUI}`
  ctx.fillText(emoji, BIAO_QING_BAO_CHICUN / 2, BIAO_QING_BAO_CHICUN / 2 - 30)

  ctx.font = `${BIAO_QING_BAO_WENZI_ZIHAO}px ${WENZI_ZITI_DUI}`
  ctx.lineWidth = BIAO_QING_BAO_MIAOBIAN_KUANDU
  ctx.strokeStyle = BIAO_QING_BAO_MIAOBIAN_SE
  ctx.fillStyle = BIAO_QING_BAO_WENZI_TIANCHONG_SE
  ctx.lineJoin = 'round'
  ctx.strokeText(wenZi, BIAO_QING_BAO_CHICUN / 2, BIAO_QING_BAO_CHICUN - 72)
  ctx.fillText(wenZi, BIAO_QING_BAO_CHICUN / 2, BIAO_QING_BAO_CHICUN - 72)

  return new Promise<Blob>((jieJue, juJue) => {
    canvas.toBlob((blob) => {
      if (blob) jieJue(blob)
      else juJue(new Error(huoQuFanYi('duoMeiTi', 'biaoQingBaoXuanRanShiBai')))
    }, 'image/png')
  })
}
