export type YuTai = 'jieNeiRong' | 'shuoZiJi' | 'jiDuan' | 'lingQi' | 'chengQing' | 'anPai'

export type ChuFaLei = 'chunYingDa' | 'shiFeiWen' | 'fenXiang'

const CHUN_YING_DA_BAI_MING_DAN = [
  '嗯', '嗯嗯', '恩', '恩恩', '嗯哪', '好', '好的', '好滴', '好呀', '好嘞', '好吧',
  '行', '行啊', '行吧', '可以', '收到', '知道了', '明白', '懂了',
  '对', '对啊', '对的', '是', '是的', '是啊', '哦', '噢', '喔',
  '谢谢', '谢啦', '谢了', '辛苦了', '麻烦了', '感谢',
  '有道理', '确实', '没错', '是这么回事', '我都行', '都行', '随便', '看你的',
  '下次约', '改天约', '再说吧', '那就这样', '先这样', '回头聊', '晚安', '早安',
]

const XIAO_SHU_CI = /[\s，。、！？!?,.~～…\-—：:；;"'“”‘’()（）【】\[\]😂🤣😅🙏👍]/gu

export function xiXiChuFa(chuFa: string): string {
  return (chuFa || '').replace(/❤️/gu, '').replace(XIAO_SHU_CI, '').replace(/[hH]{3,}/g, '').replace(/哈{2,}/g, '').trim()
}

const SHI_FEI_WEN = /[?？]|吗|是不是|有没有|要不要|能不能|可不可以|对不对|好不好|行不行|呢$/

export function panChuFaLei(chuFa: string): ChuFaLei {
  const jing = xiXiChuFa(chuFa)
  if (SHI_FEI_WEN.test(chuFa || '')) return 'shiFeiWen'
  if (CHUN_YING_DA_BAI_MING_DAN.includes(jing)) return 'chunYingDa'
  if (jing.length > 0 && jing.length <= 3 && !/[?？]/.test(chuFa || '')) return 'chunYingDa'
  return 'fenXiang'
}

const QUAN_ZHONG: Record<ChuFaLei, Array<[YuTai, number]>> = {
  chunYingDa: [['lingQi', 48], ['anPai', 30], ['jieNeiRong', 10], ['jiDuan', 8], ['shuoZiJi', 3], ['chengQing', 1]],
  shiFeiWen: [['jiDuan', 70], ['jieNeiRong', 12], ['lingQi', 7], ['anPai', 6], ['shuoZiJi', 4], ['chengQing', 1]],
  fenXiang: [['jieNeiRong', 42], ['jiDuan', 17], ['shuoZiJi', 14], ['lingQi', 11], ['anPai', 11], ['chengQing', 5]],
}

export function chouYuTai(chuFa: string, suiJi: () => number = Math.random): YuTai {
  const biao = QUAN_ZHONG[panChuFaLei(chuFa)]
  const zong = biao.reduce((he, [, quan]) => he + quan, 0)
  let yu = suiJi() * zong
  for (const [tai, quan] of biao) {
    yu -= quan
    if (yu < 0) return tai
  }
  return biao[0][0]
}

const ZHI_LING: Record<YuTai, string> = {
  jieNeiRong: '这一轮就顺着对方这句话里那个具体的东西说一句。不用总结，不用给建议，也别再问回去。',
  shuoZiJi: '这一轮说说你自己这边的情况或者感受，一句就够。不用回应对方说的内容。',
  jiDuan: '这一轮只回一两个词，像「嗯」「没了」「是滴」「行吧」这种。不用补话，不用解释，不要带问号。',
  lingQi: '这一轮别接对方这句话的内容。说一件你自己这边的事，跟对方刚说的没关系也正常。就一句，说完就停。',
  chengQing: '这一轮你没太听懂对方说的那个词或者那个意思，就问一句是怎么回事。一句。',
  anPai: '这一轮给一个具体的下一步：时间、地点，或者你要去干什么。就一句。',
}

export function quYuTaiZhiLing(tai: YuTai): string {
  return ZHI_LING[tai]
}
