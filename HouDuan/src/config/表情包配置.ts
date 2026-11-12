export const BIAO_QING_BAO_YUN_XING = {
  houXuanShuLiang: 8,
  yongHuBiaoQingHouXuanShu: 3,
  zuiDaMeiLunZhangShu: 1,
  daKai: (process.env['BIAO_QING_BAO_AI_DA_KAI'] || 'true').trim().toLowerCase() !== 'false',
} as const

export const BIAO_QING_YUN_XING_BIAO_QIAN: readonly string[] = [
  '好笑', '感动', '无语', '赞同', '撒娇', '安慰', '庆祝', '破冰', '告别', '卖萌', '生气', '委屈',
]

export const BIAO_QING_CHUAN_SONG_GUI_ZE: readonly string[] = [
  '接到好笑的事、对方自嘲、玩梗 → 高概率发表情包',
  '对方分享成就喜事 → 庆祝类',
  '对方难过需要安慰 → 先认真文字，可跟一张安慰类',
  '答应请求、表达喜欢 → 亲昵类',
  '对方刚发表情包 → 回敬概率大幅提高',
  '话题尴尬接不下去 → 表情包垫场',
  '对方严肃求助、情绪危机、深夜倾诉 → 禁止发表情包，只许认真文字',
]
