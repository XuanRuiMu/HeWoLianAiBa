import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { huoQuFaSongZhuangTaiWenAn } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/翻译表'

const 根 = resolve(__dirname, '..')
const 读 = (xiangDui: string): string => readFileSync(resolve(根, xiangDui), 'utf8')

const 好友页源 = 读('views/好友聊天.vue')
const 聊天页源 = 读('views/聊天页面.vue')
const 消息行源 = 读('components/聊天/消息行.vue')

describe('FP-04 发送状态文案单一真源', () => {
  it('三态分流：失败→重新发送，媒体→上传中，其余→发送中', () => {
    expect(
      huoQuFaSongZhuangTaiWenAn({ leiXing: 'wenben', faSongZhong: true, faSongShiBai: false }),
    ).toBe(huoQuFanYi('liaoTian', 'faSongZhong'))
    expect(
      huoQuFaSongZhuangTaiWenAn({ leiXing: 'yuYin', faSongZhong: true, faSongShiBai: false }),
    ).toBe(huoQuFanYi('duoMeiTi', 'shangChuanZhong'))
    expect(
      huoQuFaSongZhuangTaiWenAn({ leiXing: 'wenJian', faSongZhong: false, faSongShiBai: true }),
    ).toBe(huoQuFanYi('liaoTian', 'chongXinFaSong'))
    expect(
      huoQuFaSongZhuangTaiWenAn({ leiXing: 'wenben', faSongZhong: true, faSongShiBai: true }),
    ).toBe(huoQuFanYi('liaoTian', 'faSongZhong'))
  })

  it('聊天页与好友页都消费同一文案分流，好友页不再写死重新发送', () => {
    expect(聊天页源).toContain('huoQuFaSongZhuangTaiWenAn')
    expect(聊天页源).toContain(':fa-song-ti-shi="huoQuFaSongZhuangTaiTiShi(xiaoXi)"')
    expect(好友页源).toContain('huoQuFaSongZhuangTaiWenAn')
    expect(好友页源).toContain(':fa-song-ti-shi="huoQuFaSongZhuangTaiTiShi(xiaoXi)"')
    expect(好友页源).not.toMatch(/:fa-song-ti-shi="huoQuFanYi\('liaoTian', 'chongXinFaSong'\)"/)
  })
})

describe('FP-04 好友页发送状态收口', () => {
  it('先刷新成功再清发送状态，刷新失败回到失败态', () => {
    const 起点 = 好友页源.indexOf('async function zhiXingFaSong')
    const 终点 = 好友页源.indexOf('async function faSongYiDuanWenBen')
    const duan = 好友页源.slice(起点, 终点)
    expect(duan).toContain('const shuaXinChengGong = await shuaXin()')
    const shuaXinWeiZhi = duan.indexOf('await shuaXin()')
    const qingChuWeiZhi = duan.indexOf('qingChuFaSongZhuangTai(leGuanId)')
    expect(shuaXinWeiZhi).toBeGreaterThan(-1)
    expect(qingChuWeiZhi).toBeGreaterThan(shuaXinWeiZhi)
    const shiBaiFenZhi = duan.indexOf('if (!shuaXinChengGong)')
    expect(shiBaiFenZhi).toBeGreaterThan(-1)
    expect(
      duan.indexOf('biaoJiFaSongShiBai(leGuanId)', shiBaiFenZhi),
    ).toBeGreaterThan(shiBaiFenZhi)
    const shuaXinDuan = 好友页源.slice(
      好友页源.indexOf('async function shuaXin'),
      好友页源.indexOf('function fanHuiLieBiao'),
    )
    expect(shuaXinDuan).toContain('Promise<boolean>')
    expect(shuaXinDuan).toContain('return chengGong')
  })

  it('乐观气泡展示只由 zhiXingFaSong 一处驱动', () => {
    const tiaoYongShu = 好友页源.match(/zhanShiLeGuanQiPao\(/g)?.length ?? 0
    expect(tiaoYongShu).toBe(2)
  })

  it('发送中外壳透明度提升为 0.8，缓解语音条叠加过淡', () => {
    const ti = 消息行源.match(/\.qipao-waike\.qipao-fasong-zhong\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(ti).toContain('filter: grayscale(1)')
    expect(ti).toContain('opacity: 0.8')
  })
})
