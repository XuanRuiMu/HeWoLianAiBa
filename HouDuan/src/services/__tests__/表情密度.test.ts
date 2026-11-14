import { describe, expect, it } from 'vitest'
import { jiSuanBiaoQingShouGan } from '../表情密度'
import type { DuiHuaLiShiXiang } from '../../types'

function wenZi(faSongZhe: 'yonghu' | 'jiaose', neiRong = '在吗'): DuiHuaLiShiXiang {
  return { fa_song_zhe_lei_xing: faSongZhe, fa_song_zhe_ming: 'x', nei_rong: neiRong, shi_jian: '00:00' }
}

function tu(faSongZhe: 'yonghu' | 'jiaose', duanMing = '无语猫'): DuiHuaLiShiXiang {
  return {
    fa_song_zhe_lei_xing: faSongZhe,
    fa_song_zhe_ming: 'x',
    nei_rong: `[贴纸:${duanMing}]`,
    shi_jian: '00:00',
  }
}

describe('表情包密度模型', () => {
  it('对方近期发过图时期望间隔明显更短', () => {
    const wuTu = Array.from({ length: 12 }, () => wenZi('yonghu'))
    const youTu = [...Array.from({ length: 9 }, () => wenZi('yonghu')), tu('yonghu'), wenZi('yonghu'), tu('yonghu')]
    const wu = jiSuanBiaoQingShouGan(wuTu, { ie_lei_xing: 'E' }, 'pengYou')
    const you = jiSuanBiaoQingShouGan(youTu, { ie_lei_xing: 'E' }, 'pengYou')
    expect(you.qiWangJianGeLunShu).toBeLessThan(wu.qiWangJianGeLunShu)
    expect(you.duiFangJinQiTuShu).toBeGreaterThan(0)
  })

  it('关系越亲期望间隔越短', () => {
    const liShi = Array.from({ length: 12 }, () => wenZi('yonghu'))
    const leng = jiSuanBiaoQingShouGan(liShi, { ie_lei_xing: 'E' }, 'lengDan')
    const lian = jiSuanBiaoQingShouGan(liShi, { ie_lei_xing: 'E' }, 'reLian')
    expect(lian.qiWangJianGeLunShu).toBeLessThan(leng.qiWangJianGeLunShu)
  })

  it('内向角色用图比外向角色更密', () => {
    const liShi = Array.from({ length: 12 }, () => wenZi('yonghu'))
    const nei = jiSuanBiaoQingShouGan(liShi, { ie_lei_xing: 'I' }, 'shuXi')
    const wai = jiSuanBiaoQingShouGan(liShi, { ie_lei_xing: 'E' }, 'shuXi')
    expect(nei.qiWangJianGeLunShu).toBeLessThan(wai.qiWangJianGeLunShu)
  })

  it('历史里没有发过图时上次为 null 且倾向可判定', () => {
    const jieGuo = jiSuanBiaoQingShouGan([wenZi('yonghu'), wenZi('jiaose')], null, null)
    expect(jieGuo.shangCiFaTuLunShu).toBeNull()
    expect(['偏少', '正常', '偏多']).toContain(jieGuo.quXiang)
  })

  it('能统计到没有媒体行的表情包消息', () => {
    const liShi = [tu('jiaose'), wenZi('jiaose'), wenZi('yonghu')]
    const jieGuo = jiSuanBiaoQingShouGan(liShi, { ie_lei_xing: 'I' }, 'aiMei')
    expect(jieGuo.ziJiJinQiTuShu).toBe(1)
    expect(jieGuo.shangCiFaTuLunShu).toBe(2)
  })

  it('间隔落在 3 到 500 之间', () => {
    const liShi = Array.from({ length: 20 }, () => tu('yonghu'))
    const jieGuo = jiSuanBiaoQingShouGan(liShi, { ie_lei_xing: 'I', re_shen_lei_xing: '快热' }, 'shenAi')
    expect(jieGuo.qiWangJianGeLunShu).toBeGreaterThanOrEqual(3)
    expect(jieGuo.qiWangJianGeLunShu).toBeLessThanOrEqual(500)
  })

  it('空历史与空人设不抛错', () => {
    const jieGuo = jiSuanBiaoQingShouGan(null, null, null)
    expect(jieGuo.shangCiFaTuLunShu).toBeNull()
    expect(jieGuo.duiFangJinQiTuShu).toBe(0)
    expect(jieGuo.qiWangJianGeLunShu).toBeGreaterThan(0)
  })
})
