import { describe, expect, it } from 'vitest'
import { panDuanBiaoQingZaiTi } from '../表情包载体'
import { BiaoQingBaoYunXing, BiaoQingMiDu } from '../../config/表情包配置'
import type { AIYinQingShuRu, DirectorCeLue, DuiHuaLiShiXiang } from '../../types'

function wenZi(faSongZhe: 'yonghu' | 'jiaose', neiRong = '在吗'): DuiHuaLiShiXiang {
  return { fa_song_zhe_lei_xing: faSongZhe, fa_song_zhe_ming: 'x', nei_rong: neiRong, shi_jian: '00:00' }
}

function tu(faSongZhe: 'yonghu' | 'jiaose'): DuiHuaLiShiXiang {
  return {
    fa_song_zhe_lei_xing: faSongZhe,
    fa_song_zhe_ming: 'x',
    nei_rong: '[表情包:笑哭]',
    shi_jian: '00:00',
  }
}

function zaoShuRu(gengDuo: Record<string, unknown> = {}): AIYinQingShuRu {
  return {
    yong_hu_id: 'u-1',
    jiao_se_id: 'j-1',
    jiao_se: { nian_ling: 24, ie_lei_xing: 'E', re_shen_lei_xing: '快热' },
    hao_gan_du: { guan_xi_jie_duan: '暧昧', zong_fen: 500 },
    dui_hua_li_shi: [],
    yong_hu_xin_xiao_xi: '今天挺开心的',
    shi_fou_di_yi_lun: false,
    tu_pian_shou_quan: false,
    ...gengDuo,
  } as unknown as AIYinQingShuRu
}

function zaoCeLue(gengDuo: Record<string, unknown> = {}): DirectorCeLue {
  return {
    yong_hu_yi_tu: '闲聊',
    qing_gan_fen_xi: '平静',
    hui_fu_ce_lue: '正常接话',
    shi_fou_hui_fu: true,
    hui_fu_tiao_shu: 1,
    shi_jian_qing_xu: '平静',
    shi_fou_che_hui: false,
    ...gengDuo,
  } as unknown as DirectorCeLue
}

describe('人设年龄决定可用表情风格', () => {
  it('青年人设放开全部四类风格', () => {
    const jueCe = panDuanBiaoQingZaiTi(zaoShuRu({ jiao_se: { nian_ling: 24 } }), zaoCeLue())
    expect(jueCe.nianLingDang).toBe('青年')
    expect([...jueCe.yunXuFengGe]).toEqual(['黄脸', '祝福', '日常', '梗图'])
  })

  it.each([
    [10, '青年'],
    [44, '青年'],
    [45, '中年'],
    [59, '中年'],
    [60, '长辈'],
    [99, '长辈'],
  ])('年龄 %s 落在 %s 档', (nianLing, dang) => {
    const jueCe = panDuanBiaoQingZaiTi(zaoShuRu({ jiao_se: { nian_ling: nianLing } }), zaoCeLue())
    expect(jueCe.nianLingDang).toBe(dang)
  })

  it('长辈档不开放梗图，但保留温和的日常图', () => {
    const jueCe = panDuanBiaoQingZaiTi(zaoShuRu({ jiao_se: { nian_ling: 65 } }), zaoCeLue())
    expect([...jueCe.yunXuFengGe]).toEqual(['黄脸', '祝福', '日常'])
    expect(jueCe.yunXuFengGe).not.toContain('梗图')
  })

  it.each([undefined, 'text', -5, 88.5, 2026, Number.NaN])('非法年龄 %s 兜底到最保守档且不抛错', (nianLing) => {
    const jueCe = panDuanBiaoQingZaiTi(zaoShuRu({ jiao_se: { nian_ling: nianLing } }), zaoCeLue())
    expect(jueCe.nianLingDang).toBe('长辈')
    expect([...jueCe.yunXuFengGe]).toEqual(['黄脸', '祝福', '日常'])
  })
})

describe('关系阶段是硬门槛并决定专属梗图', () => {
  it('冷淡阶段不给候选', () => {
    const shuRu = zaoShuRu({ hao_gan_du: { guan_xi_jie_duan: '冷淡' } })
    const jueCe = panDuanBiaoQingZaiTi(shuRu, zaoCeLue())
    expect(jueCe.yuanYin).toBe('关系未到')
    expect(jueCe.geiHouXuan).toBe(false)
  })

  it('达到配置门槛后放行', () => {
    const shuRu = zaoShuRu({ hao_gan_du: { guan_xi_jie_duan: '认识' } })
    const jueCe = panDuanBiaoQingZaiTi(shuRu, zaoCeLue())
    expect(jueCe.yuanYin).toBe('放行')
    expect(jueCe.geiHouXuan).toBe(true)
  })

  it('深爱阶段序号最大，可解锁全部专属梗图', () => {
    const shuRu = zaoShuRu({ hao_gan_du: { guan_xi_jie_duan: '深爱' } })
    expect(panDuanBiaoQingZaiTi(shuRu, zaoCeLue()).guanXiJieDuanXuHao).toBe(9)
  })

  it('中文阶段名也能解析', () => {
    const shuRu = zaoShuRu({ hao_gan_du: { guan_xi_jie_duan: '暧昧' } })
    expect(panDuanBiaoQingZaiTi(shuRu, zaoCeLue()).guanXiJieDuanXuHao).toBe(6)
  })

  it('英文枚举键与数字档位都归一到同一中文档位，不会误判关系未到', () => {
    expect(panDuanBiaoQingZaiTi(zaoShuRu({ hao_gan_du: { guan_xi_jie_duan: 'shuXi' } }), zaoCeLue()).guanXiJieDuanXuHao).toBe(3)
    expect(panDuanBiaoQingZaiTi(zaoShuRu({ hao_gan_du: { guan_xi_jie_duan: 'reLian' } }), zaoCeLue()).guanXiJieDuanXuHao).toBe(8)
    expect(panDuanBiaoQingZaiTi(zaoShuRu({ hao_gan_du: { guan_xi_jie_duan: 1000 } }), zaoCeLue()).guanXiJieDuanXuHao).toBe(9)
  })

  it.each(['', null, '乱写的'])('阶段 %s 兜底到最保守且不抛错', (jieDuan) => {
    const shuRu = zaoShuRu({ hao_gan_du: { guan_xi_jie_duan: jieDuan } })
    const jueCe = panDuanBiaoQingZaiTi(shuRu, zaoCeLue())
    expect(jueCe.guanXiJieDuanXuHao).toBe(0)
    expect(jueCe.geiHouXuan).toBe(false)
  })
})

describe('危机与硬性排除仍生效，深夜不再一刀切禁图', () => {
  it.each([23, 2, 4])('%s 点不再因深夜直接禁图，但危机仍拦截', () => {
    const jueCe = panDuanBiaoQingZaiTi(zaoShuRu(), zaoCeLue())
    expect(jueCe.yuanYin).toBe('放行')
    expect(jueCe.geiHouXuan).toBe(true)
    const weiJi = panDuanBiaoQingZaiTi(zaoShuRu({ yong_hu_xin_xiao_xi: '我真的有点撑不住了' }), zaoCeLue())
    expect(weiJi.yuanYin).toBe('危机')
    expect(weiJi.geiHouXuan).toBe(false)
  })

  it('下午时段不因时间被拒', () => {
    expect(panDuanBiaoQingZaiTi(zaoShuRu(), zaoCeLue()).yuanYin).toBe('放行')
  })

  it('用户本轮消息含危机词时不给候选', () => {
    const shuRu = zaoShuRu({ yong_hu_xin_xiao_xi: '我真的有点撑不住了' })
    expect(panDuanBiaoQingZaiTi(shuRu, zaoCeLue()).yuanYin).toBe('危机')
  })

  it('导演情感分析含危机词时不给候选', () => {
    const ceLue = zaoCeLue({ qing_gan_fen_xi: '对方想哭，情绪低落' })
    expect(panDuanBiaoQingZaiTi(zaoShuRu(), ceLue).yuanYin).toBe('危机')
  })

  it('口语里的夸张说法不误判成危机', () => {
    const shuRu = zaoShuRu({ yong_hu_xin_xiao_xi: '这个视频我笑崩溃了哈哈哈' })
    expect(panDuanBiaoQingZaiTi(shuRu, zaoCeLue()).yuanYin).toBe('放行')
  })

  it('回复策略里出现求助字样不误判成危机', () => {
    const ceLue = zaoCeLue({ hui_fu_ce_lue: '别当成求助，正常闲聊' })
    expect(panDuanBiaoQingZaiTi(zaoShuRu(), ceLue).yuanYin).toBe('放行')
  })

  it.each(['我快崩溃了', '想跳楼', '我买了安眠药', '整个人绷不住了'])('真实危机说法「%s」能被拦住', (wen) => {
    const shuRu = zaoShuRu({ yong_hu_xin_xiao_xi: wen })
    expect(panDuanBiaoQingZaiTi(shuRu, zaoCeLue()).yuanYin).toBe('危机')
  })

  it('用户意图里出现轻生也能拦住', () => {
    const ceLue = zaoCeLue({ yong_hu_yi_tu: '轻生' })
    expect(panDuanBiaoQingZaiTi(zaoShuRu(), ceLue).yuanYin).toBe('危机')
  })

  it('超长文本被截断后不抛错', () => {
    const shuRu = zaoShuRu({ yong_hu_xin_xiao_xi: '哈'.repeat(5000) })
    expect(() => panDuanBiaoQingZaiTi(shuRu, zaoCeLue())).not.toThrow()
  })

  it('时差仍参与时间换算，不因取消深夜禁图而失效', () => {
    const yuan = process.env['XING_SHI_CHA']
    process.env['XING_SHI_CHA'] = '8'
    try {
      
      expect(panDuanBiaoQingZaiTi(zaoShuRu(), zaoCeLue()).yuanYin).toBe('放行')
    } finally {
      if (yuan === undefined) delete process.env['XING_SHI_CHA']
      else process.env['XING_SHI_CHA'] = yuan
    }
  })
})
describe('节奏与回敬', () => {
  it('对方最后一条是图时回敬放行，即便自己刚发过图', () => {
    const shuRu = zaoShuRu({ dui_hua_li_shi: [tu('jiaose'), wenZi('yonghu'), tu('yonghu')] })
    const jueCe = panDuanBiaoQingZaiTi(shuRu, zaoCeLue())
    expect(jueCe.yuanYin).toBe('回敬')
    expect(jueCe.geiHouXuan).toBe(true)
  })

  it('自己刚发过图时降低发图权重，但不硬拦候选', () => {
    const shuRu = zaoShuRu({ dui_hua_li_shi: [wenZi('yonghu'), tu('jiaose')] })
    const gangFa = panDuanBiaoQingZaiTi(shuRu, zaoCeLue())
    const meiFa = panDuanBiaoQingZaiTi(zaoShuRu({ dui_hua_li_shi: [wenZi('yonghu'), wenZi('jiaose')] }), zaoCeLue())
    expect(gangFa.gangFaGuoTu).toBe(true)
    expect(gangFa.geiHouXuan).toBe(true)
    expect(gangFa.faTuQuanZhong).toBeLessThan(meiFa.faTuQuanZhong)
  })

  it('从没发过图时放行第一次', () => {
    const shuRu = zaoShuRu({ dui_hua_li_shi: [wenZi('yonghu'), wenZi('jiaose')] })
    const jueCe = panDuanBiaoQingZaiTi(shuRu, zaoCeLue())
    expect(jueCe.shangCiFaTuLunShu).toBeNull()
    expect(jueCe.geiHouXuan).toBe(true)
  })

  it('关系越亲期望间隔越短，密度模型确实被接进决策', () => {
    const qian = panDuanBiaoQingZaiTi(
      zaoShuRu({ hao_gan_du: { guan_xi_jie_duan: '认识' } }),
      zaoCeLue(),
    )
    const hou = panDuanBiaoQingZaiTi(
      zaoShuRu({ hao_gan_du: { guan_xi_jie_duan: '深爱' } }),
      zaoCeLue(),
    )
    expect(hou.qiWangJianGeLunShu).toBeLessThan(qian.qiWangJianGeLunShu)
  })

  it('年龄越大期望间隔越长，长辈发图更疏', () => {
    const qing = panDuanBiaoQingZaiTi(
      zaoShuRu({ jiao_se: { nian_ling: 24, ie_lei_xing: 'E', re_shen_lei_xing: '快热' } }),
      zaoCeLue(),
    )
    const zhang = panDuanBiaoQingZaiTi(
      zaoShuRu({ jiao_se: { nian_ling: 65, ie_lei_xing: 'E', re_shen_lei_xing: '快热' } }),
      zaoCeLue(),
    )
    expect(zhang.qiWangJianGeLunShu).toBeGreaterThan(qing.qiWangJianGeLunShu)
  })

  it('期望间隔始终落在历史可追溯范围内，不会永久锁死', () => {
    const jueCe = panDuanBiaoQingZaiTi(
      zaoShuRu({ jiao_se: { nian_ling: 65 }, hao_gan_du: { guan_xi_jie_duan: '冷淡' } }),
      zaoCeLue(),
    )
    expect(jueCe.qiWangJianGeLunShu).toBeLessThan(BiaoQingMiDu.shangCiZhuiSuZuiDuoTiao)
  })

  it('同一角色节奏稳定，不同角色节奏不雷同', () => {
    const jiZhun = panDuanBiaoQingZaiTi(zaoShuRu({ jiao_se_id: 'j-1' }), zaoCeLue())
    const chongFu = panDuanBiaoQingZaiTi(zaoShuRu({ jiao_se_id: 'j-1' }), zaoCeLue())
    expect(chongFu.qiWangJianGeLunShu).toBe(jiZhun.qiWangJianGeLunShu)
    const qiTa = Array.from(
      { length: 12 },
      (_, xu) =>
        panDuanBiaoQingZaiTi(zaoShuRu({ jiao_se_id: `j-${xu + 2}` }), zaoCeLue())
          .qiWangJianGeLunShu,
    )
    expect(new Set(qiTa).size).toBeGreaterThan(1)
  })
})

describe('开关与兜底', () => {
  it('总开关关闭时不给候选', () => {
    const yuan = BiaoQingBaoYunXing.daKai
    ;(BiaoQingBaoYunXing as { daKai: boolean }).daKai = false
    try {
      const jueCe = panDuanBiaoQingZaiTi(zaoShuRu(), zaoCeLue())
      expect(jueCe.yuanYin).toBe('总开关关闭')
      expect(jueCe.geiHouXuan).toBe(false)
    } finally {
      ;(BiaoQingBaoYunXing as { daKai: boolean }).daKai = yuan
    }
  })

  it('输入整体为空或历史含脏元素时不崩且保守', () => {
    const kong = panDuanBiaoQingZaiTi(null as unknown as AIYinQingShuRu, undefined)
    expect(kong.geiHouXuan).toBe(false)
    const zang = zaoShuRu({ dui_hua_li_shi: [null, undefined, wenZi('yonghu')] })
    expect(() => panDuanBiaoQingZaiTi(zang, zaoCeLue())).not.toThrow()
  })

  it('心情底色不参与门控，给不给候选结果一致', () => {
    const you = zaoCeLue({ biao_qing_yi_tu: '好笑' })
    const wu = zaoCeLue({ biao_qing_yi_tu: null })
    expect(panDuanBiaoQingZaiTi(zaoShuRu(), you).yuanYin).toBe(
      panDuanBiaoQingZaiTi(zaoShuRu(), wu).yuanYin,
    )
  })

  it('玩笑里夹着真危机仍按危机拒发', () => {
    expect(panDuanBiaoQingZaiTi(zaoShuRu({ yong_hu_xin_xiao_xi: '笑不活了，我爷爷刚住院' }), zaoCeLue()).yuanYin).toBe('危机')
    expect(panDuanBiaoQingZaiTi(zaoShuRu({ yong_hu_xin_xiao_xi: '前情铺垫'.repeat(80) + '我爷爷刚住院' }), zaoCeLue()).yuanYin).toBe('危机')
  })

  it('发送前后不得因本地玩笑排除词漏掉危机', () => {
    expect(panDuanBiaoQingZaiTi(zaoShuRu({ yong_hu_xin_xiao_xi: '笑崩溃了，我现在真的很难受' }), zaoCeLue()).yuanYin).toBe('危机')
  })
})
describe('发图权重按人设给出不同档位', () => {
  function 取权重(renShe: Record<string, unknown>): number {
    const shuRu = zaoShuRu({
      jiao_se: { nian_ling: 24, ie_lei_xing: 'E', re_shen_lei_xing: '快热', ...renShe },
      dui_hua_li_shi: [wenZi('yonghu'), wenZi('jiaose')],
    })
    return panDuanBiaoQingZaiTi(shuRu, zaoCeLue()).faTuQuanZhong
  }

  it('权重是意愿强度，落在 0 到 2 之间', () => {
    const quanZhong = 取权重({ xing_ge: '沙雕搞怪，爱整活，笑点低' })
    expect(quanZhong).toBeGreaterThan(0)
    expect(quanZhong).toBeLessThanOrEqual(2)
  })

  it('沙雕搞怪的人设权重明显高于正经严肃的人设', () => {
    const shaDiao = 取权重({ xing_ge: '沙雕搞怪，爱整活，笑点低，外向活泼' })
    const yanSu = 取权重({ xing_ge: '严肃严谨，理性克制，认真守规矩' })
    expect(shaDiao).toBeGreaterThan(yanSu)
  })

  it('沙雕搞怪落在自然选择以上，正经严肃落在可发可不发以下', () => {
    const shaDiao = 取权重({ xing_ge: '沙雕搞怪，爱整活，笑点低，外向活泼' })
    const yanSu = 取权重({ xing_ge: '严肃严谨，理性克制，认真守规矩' })
    expect(shaDiao).toBeGreaterThanOrEqual(0.6)
    expect(yanSu).toBeLessThan(0.4)
  })

  it('I 型内向人设的权重低于同气质的 E 型', () => {
    const wai = 取权重({ ie_lei_xing: 'E', xing_ge: '温柔体贴，会哄人' })
    const nei = 取权重({ ie_lei_xing: 'I', xing_ge: '温柔体贴，会哄人' })
    expect(nei).toBeLessThan(wai)
  })

  it('刚发过图后权重按衰减系数下降', () => {
    const shuRu = zaoShuRu({
      jiao_se: { nian_ling: 24, ie_lei_xing: 'E', re_shen_lei_xing: '快热', xing_ge: '沙雕搞怪，爱整活' },
      dui_hua_li_shi: [wenZi('yonghu'), wenZi('jiaose')],
    })
    const meiFa = panDuanBiaoQingZaiTi(shuRu, zaoCeLue()).faTuQuanZhong
    const gangFa = panDuanBiaoQingZaiTi(
      zaoShuRu({
        jiao_se: { nian_ling: 24, ie_lei_xing: 'E', re_shen_lei_xing: '快热', xing_ge: '沙雕搞怪，爱整活' },
        dui_hua_li_shi: [wenZi('yonghu'), tu('jiaose')],
      }),
      zaoCeLue(),
    )
    expect(gangFa.gangFaGuoTu).toBe(true)
    expect(gangFa.faTuQuanZhong).toBeCloseTo(meiFa * BiaoQingMiDu.gangFaGuoTuCheng, 2)
  })
})
