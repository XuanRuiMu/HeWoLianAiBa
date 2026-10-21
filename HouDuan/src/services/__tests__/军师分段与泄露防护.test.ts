import { describe, expect, it } from 'vitest'
import { JUN_SHI_ZHI_DAO_DUAN_DING_YI } from '../../config/军师配置'
import { jieXiJunShiFenDuan, pinJieJunShiFenDuan } from '../军师求助'

const 完整输出 = JSON.stringify({
  当前局面: '聊到周末去哪玩了，气氛还行',
  下一步怎么回: '那个地方我也去过\n周末要不要一起去看看\n你最近好像挺忙的',
  为什么这么聊: 'TA最后问你去哪玩了，是在找共同话题',
  我看到的迹象: '这三次都是TA先起的话，回得也比之前快',
  鼓励: '稳着呢',
})

describe('军师分段协议', () => {
  it('五个键都能解析出来', () => {
    const fenDuan = jieXiJunShiFenDuan(完整输出)
    expect(fenDuan).not.toBeNull()
    expect(fenDuan?.dangQianJuMian).toContain('周末')
    expect(fenDuan?.weiShenMeZheMeLiao).toContain('共同话题')
    expect(fenDuan?.kanDaoDeJiXiang).toContain('TA先起的话')
    expect(fenDuan?.guLi).toBe('稳着呢')
  })

  it('下一步怎么回保留三条换行结构', () => {
    const fenDuan = jieXiJunShiFenDuan(完整输出)
    const hang = (fenDuan?.xiaYiBuZenMeHui || '').split('\n').filter((x) => x.trim())
    expect(hang).toHaveLength(3)
  })

  it('分段定义与类型键位同源，多一个少一个都会发现', () => {
    const dingYiJian = JUN_SHI_ZHI_DAO_DUAN_DING_YI.map((duan) => duan.ziDuan).sort()
    expect(dingYiJian).toEqual([
      'dangQianJuMian',
      'guLi',
      'kanDaoDeJiXiang',
      'weiShenMeZheMeLiao',
      'xiaYiBuZenMeHui',
    ])
  })

  it('每个分段定义都带字数上限与要求，不许留空', () => {
    for (const duan of JUN_SHI_ZHI_DAO_DUAN_DING_YI) {
      expect(duan.zuiDaZiShu).toBeGreaterThan(0)
      expect(duan.yaoQiu.trim().length).toBeGreaterThan(0)
      expect(duan.moXingJian.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('数值泄露防护', () => {
  it('把带分数的后台表述整段抹掉', () => {
    const yuan = JSON.stringify({
      当前局面: 'TA对你有兴趣，亲密度涨了2分',
      下一步怎么回: '那地方我也去过',
      为什么这么聊: '信任度现在是120分，说明还早',
      我看到的迹象: '',
      鼓励: '',
    })
    const fenDuan = jieXiJunShiFenDuan(yuan)
    expect(fenDuan?.dangQianJuMian).not.toContain('2分')
    expect(fenDuan?.weiShenMeZheMeLiao).not.toContain('120')
  })

  it('不带数字的正常说法不会被误伤', () => {
    const yuan = JSON.stringify({
      当前局面: '你们俩现在挺亲密的',
      下一步怎么回: '我也想去看看',
      为什么这么聊: 'TA在试探你的态度',
      我看到的迹象: '',
      鼓励: '',
    })
    const fenDuan = jieXiJunShiFenDuan(yuan)
    expect(fenDuan?.dangQianJuMian).toContain('亲密')
    expect(fenDuan?.weiShenMeZheMeLiao).toContain('试探')
  })
})

describe('截断按码点走', () => {
  it('emoji 不会被切成半个字符', () => {
    const changWenBen = '😀'.repeat(200)
    const yuan = JSON.stringify({
      当前局面: '',
      下一步怎么回: changWenBen,
      为什么这么聊: '',
      我看到的迹象: '',
      鼓励: '',
    })
    const fenDuan = jieXiJunShiFenDuan(yuan)
    const zhi = fenDuan?.xiaYiBuZenMeHui || ''
    expect(zhi.endsWith('…')).toBe(true)
    expect(zhi).not.toContain('\uFFFD')
    expect(Array.from(zhi).every((zi) => zi === '😀' || zi === '…')).toBe(true)
  })
})

describe('整段拼接', () => {
  it('空段不会留下多余空行', () => {
    const fenDuan = jieXiJunShiFenDuan(完整输出)
    expect(fenDuan).not.toBeNull()
    if (!fenDuan) return
    const zhengDuan = pinJieJunShiFenDuan({ ...fenDuan, guLi: '' })
    expect(zhengDuan.includes('\n\n')).toBe(false)
  })

  it('完全空输出返回 null 而不是空对象', () => {
    const kong = JSON.stringify({
      当前局面: '',
      下一步怎么回: '',
      为什么这么聊: '',
      我看到的迹象: '',
      鼓励: '',
    })
    expect(jieXiJunShiFenDuan(kong)).toBeNull()
  })

  it('不是 JSON 时返回 null，交给上层降级', () => {
    expect(jieXiJunShiFenDuan('我觉得你就直接问她呗')).toBeNull()
  })
})
