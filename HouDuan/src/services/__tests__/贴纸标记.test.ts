import { describe, expect, it } from 'vitest'

import {
  qieFenTieZhi,
  qingXiTieZhiCanPian,
  shiDanChunTieZhi,
  tiQuTieZhiDuanMing,
} from '../贴纸标记'

describe('按标记切分片段', () => {
  it('句首标记切出图一条加文字一条', () => {
    expect(qieFenTieZhi('[贴纸:熊猫头无语]后面还得接着上班')).toEqual([
      { leiXing: 'tupian', neiRong: '熊猫头无语' },
      { leiXing: 'wenzi', neiRong: '后面还得接着上班' },
    ])
  })

  it('句中标记把一行切成三段', () => {
    expect(qieFenTieZhi('我今天[贴纸:无语猫]不太想说话')).toEqual([
      { leiXing: 'wenzi', neiRong: '我今天' },
      { leiXing: 'tupian', neiRong: '无语猫' },
      { leiXing: 'wenzi', neiRong: '不太想说话' },
    ])
  })

  it('句尾标记切出文字一条加图一条', () => {
    expect(qieFenTieZhi('算了[贴纸:狗头]')).toEqual([
      { leiXing: 'wenzi', neiRong: '算了' },
      { leiXing: 'tupian', neiRong: '狗头' },
    ])
  })

  it('全角冒号与全角方括号都算合法标记', () => {
    expect(qieFenTieZhi('[贴纸：笑哭]')).toEqual([{ leiXing: 'tupian', neiRong: '笑哭' }])
    expect(qieFenTieZhi('【贴纸：笑哭】真的假的')).toEqual([
      { leiXing: 'tupian', neiRong: '笑哭' },
      { leiXing: 'wenzi', neiRong: '真的假的' },
    ])
  })

  it('连续两个标记产出两段图且不产生空文字段', () => {
    expect(qieFenTieZhi('[贴纸:哭哭]   [贴纸:求求了]')).toEqual([
      { leiXing: 'tupian', neiRong: '哭哭' },
      { leiXing: 'tupian', neiRong: '求求了' },
    ])
  })

  it('短名前后空白去掉，中间空白保留', () => {
    expect(qieFenTieZhi('[贴纸:   熊猫头无语   ]')).toEqual([
      { leiXing: 'tupian', neiRong: '熊猫头无语' },
    ])
    expect(qieFenTieZhi('[贴纸: 求 求 了 ]')).toEqual([{ leiXing: 'tupian', neiRong: '求 求 了' }])
  })

  it('非法写法不当标记，原样留在文字段里', () => {
    expect(qieFenTieZhi('真是[贴纸:]了')).toEqual([{ leiXing: 'wenzi', neiRong: '真是[贴纸:]了' }])
    expect(qieFenTieZhi('看这个[贴图:笑哭]')).toEqual([{ leiXing: 'wenzi', neiRong: '看这个[贴图:笑哭]' }])
    expect(qieFenTieZhi('看这个[贴纸:笑哭')).toEqual([{ leiXing: 'wenzi', neiRong: '看这个[贴纸:笑哭' }])
    expect(qieFenTieZhi('[贴纸:[套娃]]')).toEqual([{ leiXing: 'wenzi', neiRong: '[贴纸:[套娃]]' }])
    expect(qieFenTieZhi(`[贴纸:${'名'.repeat(31)}]`)).toEqual([
      { leiXing: 'wenzi', neiRong: `[贴纸:${'名'.repeat(31)}]` },
    ])
  })

  it('短名刚好到上限仍算合法标记', () => {
    const duanMing = '名'.repeat(30)
    expect(qieFenTieZhi(`[贴纸:${duanMing}]`)).toEqual([{ leiXing: 'tupian', neiRong: duanMing }])
  })

  it('空输入与非字符串输入返回空数组', () => {
    expect(qieFenTieZhi('')).toEqual([])
    expect(qieFenTieZhi('   ')).toEqual([])
    expect(qieFenTieZhi(null as unknown as string)).toEqual([])
    expect(qieFenTieZhi(undefined as unknown as string)).toEqual([])
  })
})

describe('短名提取', () => {
  it('去重并保持出现顺序', () => {
    expect(tiQuTieZhiDuanMing('[贴纸:狗头][贴纸:哭哭][贴纸:狗头]')).toEqual(['狗头', '哭哭'])
  })

  it('没有标记时返回空数组', () => {
    expect(tiQuTieZhiDuanMing('今天好累啊[贴图:狗头]')).toEqual([])
    expect(tiQuTieZhiDuanMing('')).toEqual([])
  })
})

describe('残片清洗', () => {
  it('剥掉非法标记但不吃掉后面的文字', () => {
    expect(qingXiTieZhiCanPian('前面[贴图:笑哭]后面的话')).toBe('前面后面的话')
    expect(qingXiTieZhiCanPian('他说[贴纸:]然后走了')).toBe('他说然后走了')
    expect(qingXiTieZhiCanPian('[贴纸:没写完 但后面还有话')).toBe('')
  })

  it('只吃到第一个右括号或行尾，不跨行吞字', () => {
    expect(qingXiTieZhiCanPian('第一行[贴纸:坏\n第二行还在')).toBe('第一行\n第二行还在')
    expect(qingXiTieZhiCanPian('[贴纸:甲]中间[贴纸:乙]尾巴')).toBe('中间尾巴')
  })

  it('清掉剥除后留下的多余空白', () => {
    expect(qingXiTieZhiCanPian('你好 [贴纸:狗头] 呀')).toBe('你好呀')
    expect(qingXiTieZhiCanPian('  前面  [贴图:x]  hello  ')).toBe('前面 hello')
  })

  it('普通方括号内容不受影响', () => {
    expect(qingXiTieZhiCanPian('[备注]明天记得带伞')).toBe('[备注]明天记得带伞')
  })

  it('空输入与非字符串输入返回空串', () => {
    expect(qingXiTieZhiCanPian('')).toBe('')
    expect(qingXiTieZhiCanPian(null as unknown as string)).toBe('')
  })
})

describe('整段是否只有一个标记', () => {
  it('只有一条合法标记时为真', () => {
    expect(shiDanChunTieZhi('[贴纸:狗头]')).toBe(true)
    expect(shiDanChunTieZhi('  [贴纸：狗头]  ')).toBe(true)
  })

  it('混了文字、多标记、非法写法、空串都为假', () => {
    expect(shiDanChunTieZhi('[贴纸:狗头]后面还有字')).toBe(false)
    expect(shiDanChunTieZhi('前面有字[贴纸:狗头]')).toBe(false)
    expect(shiDanChunTieZhi('[贴纸:狗头][贴纸:哭哭]')).toBe(false)
    expect(shiDanChunTieZhi('[贴纸:]')).toBe(false)
    expect(shiDanChunTieZhi('')).toBe(false)
  })
})
