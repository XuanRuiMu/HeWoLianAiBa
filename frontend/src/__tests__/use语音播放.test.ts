import { describe, it, expect } from 'vitest'
import { use语音播放 } from '@/composables/use语音播放'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'
import type { 消息 } from '@/types'

function zaoYuYin(haoMiao: number): 消息 {
  return {
    id: 'y1',
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: '语音消息',
    lei_xing: 'yuYin',
    shi_jian_chuo: Date.now(),
    yi_du: true,
    mei_ti_shi_chang_hao_miao: haoMiao,
  }
}

function zaoYiLai() {
  return {
    huoQuDiZhi: (xiaoXi: 消息) => xiaoXi.mei_ti_url || undefined,
  }
}

describe('use语音播放 时长与宽度样式', () => {
  it('语音时长按秒取整且至少 1 秒', () => {
    const { geShiHuaYuYinShiChang } = use语音播放(zaoYiLai())
    expect(geShiHuaYuYinShiChang(zaoYuYin(400))).toBe('1″')
    expect(geShiHuaYuYinShiChang(zaoYuYin(1500))).toBe('2″')
    expect(geShiHuaYuYinShiChang(zaoYuYin(2600))).toBe('3″')
    expect(geShiHuaYuYinShiChang(zaoYuYin(null as unknown as number))).toBe('1″')
  })

  it('气泡宽度随时长线性映射并夹在最小最大宽度之间', () => {
    const { yuYinKuanYangShi } = use语音播放(zaoYiLai())
    const zuiDuan = DUO_MEI_TI_PEI_ZHI.yuYinZuiDuanKuanPx
    const zuiChang = DUO_MEI_TI_PEI_ZHI.yuYinZuiChangKuanPx
    const duan = yuYinKuanYangShi(zaoYuYin(1000))
    const chang = yuYinKuanYangShi(zaoYuYin(60 * 60 * 1000))
    expect(duan).toEqual({ width: `${zuiDuan}px` })
    expect(chang).toEqual({ width: `${zuiChang}px` })
    const zhongJian = Number(yuYinKuanYangShi(zaoYuYin(30 * 1000)).width.replace('px', ''))
    expect(zhongJian).toBeGreaterThan(zuiDuan)
    expect(zhongJian).toBeLessThan(zuiChang)
  })
})

describe('use语音播放 播放状态', () => {
  it('初始不在播放中，停止播放为安全空操作', () => {
    const { shiYuYinBoFangZhong, tingZhiYinPinBoFang } = use语音播放(zaoYiLai())
    expect(shiYuYinBoFangZhong(zaoYuYin(1500))).toBe(false)
    expect(() => tingZhiYinPinBoFang()).not.toThrow()
    expect(shiYuYinBoFangZhong(zaoYuYin(1500))).toBe(false)
  })

  it('导出的波形条数与录音面板一致', () => {
    const { YU_YIN_BO_XING_TIAO_SHU } = use语音播放(zaoYiLai())
    expect(YU_YIN_BO_XING_TIAO_SHU).toBe(12)
  })

  it('非播放态进度为0且拖动为安全空操作', () => {
    const { huoQuBoFangJinDu, huoQuBoFangZongMiao, tiaoZhuanYuYinJinDu } =
      use语音播放(zaoYiLai())
    const xiaoXi = zaoYuYin(7000)
    expect(huoQuBoFangJinDu(xiaoXi)).toBe(0)
    expect(huoQuBoFangZongMiao(xiaoXi)).toBe(7)
    expect(() => tiaoZhuanYuYinJinDu(xiaoXi, 3)).not.toThrow()
    expect(huoQuBoFangJinDu(xiaoXi)).toBe(0)
  })
})

describe('语音气泡微信样式', () => {
  it('未播放态用代码绘制微信语音图标，播放态用可拖动时间轴', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const yuanMa = fs.readFileSync(
      path.resolve(process.cwd(), 'src/views/聊天页面.vue'),
      'utf-8',
    )
    expect(yuanMa).toContain('yuyin-shengyin-tubiao')
    expect(yuanMa).not.toContain('yuYinWeiXinTu')
    expect(yuanMa).not.toContain('weixin-yuyin-tiao.png')
    expect(yuanMa).toContain('yuyin-jindu-tiao')
    expect(yuanMa).toContain('tiaoZhuanYuYinJinDu')
    expect(yuanMa).toContain('type="range"')
  })
})
