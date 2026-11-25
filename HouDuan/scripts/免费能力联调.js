process.env.XU_KE_ZHEN_SHI_WAI_HU = 'true'
process.env.NODE_ENV = 'development'
process.env.SOU_SUO_DAI_LI = 'http://127.0.0.1:10090'

const { souSuoWangYe, shiBieYuYin, heChengYuYin } = require('../dist/services/DeepSeek官方工具')
const fs = require('fs')

;(async () => {
  console.log('=== 搜索（DDG lite，代理）===')
  const s = await souSuoWangYe({ query: '今天的科技新闻', tiaoShu: 5 })
  console.log('cheng_gong:', s.cheng_gong, '条数:', s.tiaoMu.length)
  s.tiaoMu.slice(0, 3).forEach((x) => console.log('  -', x.title, '|', x.url, '| 日期:', x.date))

  console.log('\n=== ASR（硅基流动 SenseVoiceSmall）===')
  const wav = fs.readFileSync('C:/Users/xuanr/Desktop/玄锐暮工作区/和我恋爱吧/免费能力调研/edge_zh-CN-XiaoxiaoNeural_中.wav')
  const a = await shiBieYuYin({ wavZiJie: wav })
  console.log('cheng_gong:', a.cheng_gong, '文本:', a.wenBen.slice(0, 80))

  console.log('\n=== TTS（CosyVoice2）===')
  const t = await heChengYuYin({ text: '哼，你怎么才回我消息呀。', yinSeId: 'default' })
  console.log('cheng_gong:', t.cheng_gong, 'mime:', t.mime, '字节:', t.yinPin ? t.yinPin.length : 0)
  if (t.yinPin) fs.writeFileSync('C:/Users/xuanr/Desktop/玄锐暮工作区/和我恋爱吧/免费能力调研/本地cosy试听.wav', t.yinPin)
  process.exit(0)
})().catch((e) => { console.error('ERR', String(e).slice(0, 500)); process.exit(1) })
