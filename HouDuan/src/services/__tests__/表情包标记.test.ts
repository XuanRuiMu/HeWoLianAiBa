import { describe, expect, it } from 'vitest'

import {
  qieFenBiaoQingBao,
  qingXiBiaoQingBaoCanPian,
  shiDanChunBiaoQingBao,
  tiQuBiaoQingBaoDuanMing,
} from '../表情包标记'

describe('按标记切分片段', () => {
  it('句首标记切出图一条加文字一条', () => {
    expect(qieFenBiaoQingBao('[表情包:熊猫头无语]后面还得接着上班')).toEqual([
      { leiXing: 'biaoqingbao', neiRong: '熊猫头无语' },
      { leiXing: 'wenzi', neiRong: '后面还得接着上班' },
    ])
  })

  it('句中标记把一行切成三段', () => {
    expect(qieFenBiaoQingBao('我今天[表情包:无语猫]不太想说话')).toEqual([
      { leiXing: 'wenzi', neiRong: '我今天' },
      { leiXing: 'biaoqingbao', neiRong: '无语猫' },
      { leiXing: 'wenzi', neiRong: '不太想说话' },
    ])
  })

  it('句尾标记切出文字一条加图一条', () => {
    expect(qieFenBiaoQingBao('算了[表情包:狗头]')).toEqual([
      { leiXing: 'wenzi', neiRong: '算了' },
      { leiXing: 'biaoqingbao', neiRong: '狗头' },
    ])
  })

  it('全角冒号与全角方括号都算合法标记', () => {
    expect(qieFenBiaoQingBao('[表情包:笑哭]')).toEqual([{ leiXing: 'biaoqingbao', neiRong: '笑哭' }])
    expect(qieFenBiaoQingBao('【表情包:笑哭】真的假的')).toEqual([
      { leiXing: 'biaoqingbao', neiRong: '笑哭' },
      { leiXing: 'wenzi', neiRong: '真的假的' },
    ])
  })

  it('连续两个标记产出两段图且不产生空文字段', () => {
    expect(qieFenBiaoQingBao('[表情包:哭哭]   [表情包:求求了]')).toEqual([
      { leiXing: 'biaoqingbao', neiRong: '哭哭' },
      { leiXing: 'biaoqingbao', neiRong: '求求了' },
    ])
  })

  it('短名前后空白去掉，中间空白保留', () => {
    expect(qieFenBiaoQingBao('[表情包:   熊猫头无语   ]')).toEqual([
      { leiXing: 'biaoqingbao', neiRong: '熊猫头无语' },
    ])
    expect(qieFenBiaoQingBao('[表情包: 求 求 了 ]')).toEqual([{ leiXing: 'biaoqingbao', neiRong: '求 求 了' }])
  })

  it('非法写法不当标记，原样留在文字段里', () => {
    expect(qieFenBiaoQingBao('真是[表情包:]了')).toEqual([{ leiXing: 'wenzi', neiRong: '真是[表情包:]了' }])
    expect(qieFenBiaoQingBao('看这个[贴图:笑哭]')).toEqual([{ leiXing: 'wenzi', neiRong: '看这个[贴图:笑哭]' }])
    expect(qieFenBiaoQingBao('看这个[表情包:笑哭')).toEqual([{ leiXing: 'wenzi', neiRong: '看这个[表情包:笑哭' }])
    expect(qieFenBiaoQingBao('[表情包:[套娃]]')).toEqual([{ leiXing: 'wenzi', neiRong: '[表情包:[套娃]]' }])
    expect(qieFenBiaoQingBao(`[表情包:${'名'.repeat(31)}]`)).toEqual([
      { leiXing: 'wenzi', neiRong: `[表情包:${'名'.repeat(31)}]` },
    ])
  })

  it('短名刚好到上限仍算合法标记', () => {
    const duanMing = '名'.repeat(30)
    expect(qieFenBiaoQingBao(`[表情包:${duanMing}]`)).toEqual([{ leiXing: 'biaoqingbao', neiRong: duanMing }])
  })

  it('空输入与非字符串输入返回空数组', () => {
    expect(qieFenBiaoQingBao('')).toEqual([])
    expect(qieFenBiaoQingBao('   ')).toEqual([])
    expect(qieFenBiaoQingBao(null as unknown as string)).toEqual([])
    expect(qieFenBiaoQingBao(undefined as unknown as string)).toEqual([])
  })
})

describe('短名提取', () => {
  it('去重并保持出现顺序', () => {
    expect(tiQuBiaoQingBaoDuanMing('[表情包:狗头][表情包:哭哭][表情包:狗头]')).toEqual(['狗头', '哭哭'])
  })

  it('没有标记时返回空数组', () => {
    expect(tiQuBiaoQingBaoDuanMing('今天好累啊[贴图:狗头]')).toEqual([])
    expect(tiQuBiaoQingBaoDuanMing('')).toEqual([])
  })
})

describe('残片清洗', () => {
  it('剥掉非法标记但不吃掉后面的文字', () => {
    expect(qingXiBiaoQingBaoCanPian('前面[贴图:笑哭]后面的话')).toBe('前面后面的话')
    expect(qingXiBiaoQingBaoCanPian('他说[表情包:]然后走了')).toBe('他说然后走了')
    expect(qingXiBiaoQingBaoCanPian('[表情包:没写完 但后面还有话')).toBe('')
  })

  it('只吃到第一个右括号或行尾，不跨行吞字', () => {
    expect(qingXiBiaoQingBaoCanPian('第一行[表情包:坏\n第二行还在')).toBe('第一行\n第二行还在')
    expect(qingXiBiaoQingBaoCanPian('[表情包:甲]中间[表情包:乙]尾巴')).toBe('中间尾巴')
  })

  it('清掉剥除后留下的多余空白', () => {
    expect(qingXiBiaoQingBaoCanPian('你好 [表情包:狗头] 呀')).toBe('你好呀')
    expect(qingXiBiaoQingBaoCanPian('  前面  [贴图:x]  hello  ')).toBe('前面 hello')
  })

  it('普通方括号内容不受影响', () => {
    expect(qingXiBiaoQingBaoCanPian('[备注]明天记得带伞')).toBe('[备注]明天记得带伞')
  })

  it('空输入与非字符串输入返回空串', () => {
    expect(qingXiBiaoQingBaoCanPian('')).toBe('')
    expect(qingXiBiaoQingBaoCanPian(null as unknown as string)).toBe('')
  })
})

describe('整段是否只有一个标记', () => {
  it('只有一条合法标记时为真', () => {
    expect(shiDanChunBiaoQingBao('[表情包:狗头]')).toBe(true)
    expect(shiDanChunBiaoQingBao('  [表情包:狗头]  ')).toBe(true)
  })

  it('混了文字、多标记、非法写法、空串都为假', () => {
    expect(shiDanChunBiaoQingBao('[表情包:狗头]后面还有字')).toBe(false)
    expect(shiDanChunBiaoQingBao('前面有字[表情包:狗头]')).toBe(false)
    expect(shiDanChunBiaoQingBao('[表情包:狗头][表情包:哭哭]')).toBe(false)
    expect(shiDanChunBiaoQingBao('[表情包:]')).toBe(false)
    expect(shiDanChunBiaoQingBao('')).toBe(false)
  })
})
