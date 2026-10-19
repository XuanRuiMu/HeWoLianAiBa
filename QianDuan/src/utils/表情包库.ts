import { huoQuFanYi } from '@/config/翻译表'

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
  const huaBu = document.createElement('canvas')
  huaBu.width = BIAO_QING_BAO_CHICUN
  huaBu.height = BIAO_QING_BAO_CHICUN
  const huaBuShangXiaWen = huaBu.getContext('2d') as CanvasRenderingContext2D | null
  if (!huaBuShangXiaWen) {
    throw new Error(huoQuFanYi('duoMeiTi', 'biaoQingBaoXuanRanShiBai'))
  }

  huaBuShangXiaWen.clearRect(0, 0, BIAO_QING_BAO_CHICUN, BIAO_QING_BAO_CHICUN)
  huaBuShangXiaWen.textAlign = 'center'
  huaBuShangXiaWen.textBaseline = 'middle'

  huaBuShangXiaWen.font = `${BIAO_QING_BAO_EMOJI_ZIHAO}px ${EMOJI_ZITI_DUI}`
  huaBuShangXiaWen.fillText(emoji, BIAO_QING_BAO_CHICUN / 2, BIAO_QING_BAO_CHICUN / 2 - 30)

  huaBuShangXiaWen.font = `${BIAO_QING_BAO_WENZI_ZIHAO}px ${WENZI_ZITI_DUI}`
  huaBuShangXiaWen.lineWidth = BIAO_QING_BAO_MIAOBIAN_KUANDU
  huaBuShangXiaWen.strokeStyle = BIAO_QING_BAO_MIAOBIAN_SE
  huaBuShangXiaWen.fillStyle = BIAO_QING_BAO_WENZI_TIANCHONG_SE
  huaBuShangXiaWen.lineJoin = 'round'
  huaBuShangXiaWen.strokeText(wenZi, BIAO_QING_BAO_CHICUN / 2, BIAO_QING_BAO_CHICUN - 72)
  huaBuShangXiaWen.fillText(wenZi, BIAO_QING_BAO_CHICUN / 2, BIAO_QING_BAO_CHICUN - 72)

  return new Promise<Blob>((jieJue, juJue) => {
    huaBu.toBlob((blob) => {
      if (blob) jieJue(blob)
      else juJue(new Error(huoQuFanYi('duoMeiTi', 'biaoQingBaoXuanRanShiBai')))
    }, 'image/png')
  })
}
