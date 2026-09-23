import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  use语音播放,
  yuYinShiChangMiao,
  yuYinKuanDuPx,
  yuYinKuanYangShi,
  geShiHuaYuYinShiChang,
} from '@/composables/use语音播放'
import { DUO_MEI_TI_PEI_ZHI, LU_YIN_PEI_ZHI } from '@/config/消息配置'
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

/**
 * FP-11 契约演进（改判理由见下，均因用户裁定「12 条波形作废 + 宽度须与参考取证口径一致」）：
 *  ① 时长/宽度两函数从 use语音播放() 返回值改为模块级纯函数出口：气泡组件与状态机都要用同一
 *     算式，留在返回值里就得把整个播放状态机注入组件（两页各注一次 ⇒ 又是第二套实现）。
 *  ② 宽度算式从「60→200 线性插值」改为取证的 `秒×10+20`（§1-A），60/200 两枚键保留为夹取上下限，
 *     上限按取证的 max-width:300px 上调 ⇒ 30 秒以上的宽度不再变化（旧口径 30 秒给 130px，是错的）。
 *  ③ 原「导出的波形条数与录音面板一致 = 12」用例作废：12 是从旧内联 CSS 反读出来的伪需求，
 *     任何成熟来源都没有它（取证 §8-2）。本文件保留一条墓碑判定，防它复活。
 */
describe('use语音播放 时长与宽度样式', () => {
  it('语音时长按秒取整并夹在配置的上下秒之间', () => {
    expect(geShiHuaYuYinShiChang(zaoYuYin(400))).toBe('1″')
    expect(geShiHuaYuYinShiChang(zaoYuYin(1500))).toBe('2″')
    expect(geShiHuaYuYinShiChang(zaoYuYin(2600))).toBe('3″')
    expect(geShiHuaYuYinShiChang(zaoYuYin(null as unknown as number))).toBe('1″')
    expect(yuYinShiChangMiao(zaoYuYin(99 * 60 * 1000 * 1000))).toBe(
      DUO_MEI_TI_PEI_ZHI.yuYinZuiDaMiao,
    )
  })

  it('气泡宽度按「秒×每秒钟像素 + 基础像素」映射并夹在上下限之间', () => {
    const { yuYinMeiMiaoKuanPx, yuYinJiChuKuanPx, yuYinZuiDuanKuanPx, yuYinZuiChangKuanPx } =
      DUO_MEI_TI_PEI_ZHI
    expect(yuYinKuanDuPx(zaoYuYin(5 * 1000))).toBe(5 * yuYinMeiMiaoKuanPx + yuYinJiChuKuanPx)
    expect(yuYinKuanDuPx(zaoYuYin(1000))).toBe(yuYinZuiDuanKuanPx)
    expect(yuYinKuanDuPx(zaoYuYin(60 * 60 * 1000 * 1000))).toBe(yuYinZuiChangKuanPx)
    expect(yuYinKuanYangShi(zaoYuYin(9 * 1000))).toEqual({
      width: `${9 * yuYinMeiMiaoKuanPx + yuYinJiChuKuanPx}px`,
    })
  })

  it('宽度随时长单调不降且上限不越界', () => {
    let shang = 0
    for (let miao = 1; miao <= DUO_MEI_TI_PEI_ZHI.yuYinZuiDaMiao; miao++) {
      const kuan = yuYinKuanDuPx(zaoYuYin(miao * 1000))
      expect(kuan).toBeGreaterThanOrEqual(shang)
      expect(kuan).toBeLessThanOrEqual(DUO_MEI_TI_PEI_ZHI.yuYinZuiChangKuanPx)
      shang = kuan
    }
  })
})

describe('use语音播放 播放状态', () => {
  it('初始不在播放中，停止播放为安全空操作', () => {
    const { shiYuYinBoFangZhong, tingZhiYinPinBoFang } = use语音播放(zaoYiLai())
    expect(shiYuYinBoFangZhong(zaoYuYin(1500))).toBe(false)
    expect(() => tingZhiYinPinBoFang()).not.toThrow()
    expect(shiYuYinBoFangZhong(zaoYuYin(1500))).toBe(false)
  })

  it('播放状态机不再导出任何「波形条数」常量（12 已作废，不许复活）', () => {
    const composable = use语音播放(zaoYiLai()) as unknown as Record<string, unknown>
    expect(
      Object.keys(composable).filter((jian) => /tiaoshu|boxing|geShu/i.test(jian)),
    ).toEqual([])
    expect(
      readFileSync(resolve(process.cwd(), 'src/composables/use语音播放.ts'), 'utf8'),
    ).not.toMatch(/BO_XING_TIAO_SHU\s*=\s*12/)
    // 录音浮层的电平计另有自己的条数源，与语音条再无共享常量
    expect(LU_YIN_PEI_ZHI.dianPingTiaoShu).toBeGreaterThan(0)
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

describe('语音气泡形态（FP-11：形态判定改指唯一组件源）', () => {
  it('未播放态用代码绘制 3 格喇叭，播放态用可拖动时间轴，且页面内无第二份实现', () => {
    const yuanMa = readFileSync(
      resolve(process.cwd(), 'src/components/聊天/语音气泡.vue'),
      'utf-8',
    )
    expect(yuanMa).toContain('laba-tubiao')
    expect(yuanMa).toContain('laba-zhezhao')
    expect(yuanMa).not.toContain('yuYinWeiXinTu')
    expect(yuanMa).not.toContain('weixin-yuyin-tiao.png')
    expect(yuanMa).toContain('yuyin-jindu-tiao')
    expect(yuanMa).toContain('tiaoZhuan')
    expect(yuanMa).toContain('type="range"')
  })
})
