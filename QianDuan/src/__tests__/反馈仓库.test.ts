import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { fankuiApiJia } = vi.hoisted(() => ({
  fankuiApiJia: {
    tiJiaoFanKui: vi.fn(),
    huoQuWoDeFanKui: vi.fn(),
  },
}))

vi.mock('@/api/意见反馈', () => fankuiApiJia)

import {
  BiaoQingXuanZeShangXian,
  FuJianXiaoXiShangXian,
  chuangJianSheBeiXinXi,
  chuangJianXiaoXiKuaiZhao,
  使用反馈仓库,
} from '@/stores/反馈'

function wenBenXiaoXi(id: string, neiRong: string) {
  return {
    id,
    ke_hu_duan_id: `k-${id}`,
    nei_rong: neiRong,
    lei_xing: 'wenben',
    fa_song_zhe_lei_xing: 'yonghu',
    shi_jian_chuo: Date.now(),
    yi_che_hui: false,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  fankuiApiJia.tiJiaoFanKui.mockReset()
  fankuiApiJia.huoQuWoDeFanKui.mockReset()
})

describe('反馈仓库附件', () => {
  it('添加消息附件生成快照并按ID去重', () => {
    const 仓库 = 使用反馈仓库()
    const xiaoXi = wenBenXiaoXi('m1', '这条消息要附上')
    expect(仓库.tianJiaFuJian(xiaoXi)).toBe(true)
    expect(仓库.fuJianXiaoXi).toHaveLength(1)
    expect(仓库.fuJianXiaoXi[0].xiao_xi_id).toBe('m1')
    expect(仓库.fuJianXiaoXi[0].zhai_yao).toBe('这条消息要附上')
    expect(仓库.tianJiaFuJian(xiaoXi)).toBe(true)
    expect(仓库.fuJianXiaoXi).toHaveLength(1)
    expect(仓库.shiFuJianXiaoXi('m1')).toBe(true)
  })

  it('撤回消息不能作为附件', () => {
    const 仓库 = 使用反馈仓库()
    const xiaoXi = { ...wenBenXiaoXi('m2', '已撤回'), yi_che_hui: true }
    expect(仓库.tianJiaFuJian(xiaoXi)).toBe(false)
    expect(仓库.fuJianXiaoXi).toHaveLength(0)
  })

  it('好友聊天的本地乐观消息不能作为附件', () => {
    const 仓库 = 使用反馈仓库()
    const leGuanXiaoXi = {
      id: 'le-guan-ceshi-1',
      ke_hu_duan_id: 'le-guan-ceshi-1',
      nei_rong: '正在发送中',
      lei_xing: 'wenben',
      fa_song_zhe_lei_xing: 'yonghu',
      shi_jian_chuo: Date.now(),
      yi_che_hui: false,
    }
    expect(chuangJianXiaoXiKuaiZhao(leGuanXiaoXi)).toBe(null)
    expect(仓库.tianJiaFuJian(leGuanXiaoXi)).toBe(false)
    expect(仓库.fuJianXiaoXi).toHaveLength(0)
  })

  it('消息附件上限为10条', () => {
    const 仓库 = 使用反馈仓库()
    for (let xuHao = 0; xuHao < FuJianXiaoXiShangXian; xuHao++) {
      expect(仓库.tianJiaFuJian(wenBenXiaoXi(`m-${xuHao}`, `消息${xuHao}`))).toBe(true)
    }
    expect(仓库.fuJianXiaoXi).toHaveLength(FuJianXiaoXiShangXian)
    expect(仓库.tianJiaFuJian(wenBenXiaoXi('m-chao', '超限消息'))).toBe(false)
    expect(仓库.fuJianXiaoXi).toHaveLength(FuJianXiaoXiShangXian)
  })

  it('切换附件实现加入与移除', () => {
    const 仓库 = 使用反馈仓库()
    const xiaoXi = wenBenXiaoXi('m3', '切换')
    expect(仓库.qieHuanFuJian(xiaoXi)).toBe('tianJia')
    expect(仓库.shiFuJianXiaoXi('m3')).toBe(true)
    expect(仓库.qieHuanFuJian(xiaoXi)).toBe('yiChu')
    expect(仓库.shiFuJianXiaoXi('m3')).toBe(false)
  })

  it('装满后切换返回已满', () => {
    const 仓库 = 使用反馈仓库()
    for (let xuHao = 0; xuHao < FuJianXiaoXiShangXian; xuHao++) {
      仓库.tianJiaFuJian(wenBenXiaoXi(`m-${xuHao}`, `消息${xuHao}`))
    }
    expect(仓库.qieHuanFuJian(wenBenXiaoXi('m-xin', '新消息'))).toBe('yiMan')
  })

  it('表情选择上限为5个', () => {
    const 仓库 = 使用反馈仓库()
    for (let xuHao = 0; xuHao < BiaoQingXuanZeShangXian; xuHao++) {
      expect(
        仓库.tianJiaBiaoQing({
          id: `b-${xuHao}`,
          mei_ti_id: `meiti-${xuHao}`,
          sha256: 'x',
          mime: 'image/png',
          duan_ming: '表情',
          pai_xu: xuHao,
          chuang_jian_shi_jian: '',
          mei_ti_url: `https://example.com/${xuHao}.png`,
        }),
      ).toBe(true)
    }
    expect(仓库.biaoQingXuanZe).toHaveLength(BiaoQingXuanZeShangXian)
    expect(
      仓库.tianJiaBiaoQing({
        id: 'b-chao',
        mei_ti_id: 'meiti-chao',
        sha256: 'x',
        mime: 'image/png',
        duan_ming: '表情',
        pai_xu: 99,
        chuang_jian_shi_jian: '',
        mei_ti_url: 'https://example.com/chao.png',
      }),
    ).toBe(false)
    expect(仓库.shiBiaoQingXuanZe('meiti-0')).toBe(true)
    仓库.yiChuBiaoQing('meiti-0')
    expect(仓库.shiBiaoQingXuanZe('meiti-0')).toBe(false)
  })
})

describe('反馈仓库提交与列表', () => {
  it('提交成功后清空附件并返回编号', async () => {
    const 仓库 = 使用反馈仓库()
    仓库.tianJiaFuJian(wenBenXiaoXi('m9', '随反馈附上'))
    fankuiApiJia.tiJiaoFanKui.mockResolvedValue({ id: 'abc12345-0000' })
    const bianHao = await 仓库.tiJiao({
      ye_mian_biao_shi: 'liaoTian',
      fen_lei: 'aiLiaoTian',
      zheng_wen: '正文内容超过十个字',
      xiao_xi_yin_yong: [...仓库.fuJianXiaoXi],
    })
    expect(bianHao).toBe('abc12345-0000')
    expect(fankuiApiJia.tiJiaoFanKui).toHaveBeenCalledTimes(1)
    expect(仓库.fuJianXiaoXi).toHaveLength(0)
    expect(仓库.biaoQingXuanZe).toHaveLength(0)
  })

  it('我的反馈分页追加且翻页停止', async () => {
    const 仓库 = 使用反馈仓库()
    fankuiApiJia.huoQuWoDeFanKui
      .mockResolvedValueOnce({
        lie_biao: [{ id: 'f1', fen_lei: 'qiTa', zhuang_tai: 'xinJian', zheng_wen_zhai_yao: 'a', guan_li_bei_zhu: null, chuang_jian_shi_jian: '2026-11-22T00:00:00Z' }],
        hai_you_geng_duo: true,
      })
      .mockResolvedValueOnce({
        lie_biao: [{ id: 'f2', fen_lei: 'yuYin', zhuang_tai: 'yiJieJue', zheng_wen_zhai_yao: 'b', guan_li_bei_zhu: '搞定', chuang_jian_shi_jian: '2026-11-22T01:00:00Z' }],
        hai_you_geng_duo: false,
      })
      .mockResolvedValue({ lie_biao: [], hai_you_geng_duo: false })
    await 仓库.jiaZaiWoDe(true)
    expect(仓库.woDeLieBiao.map((xiang) => xiang.id)).toEqual(['f1'])
    await 仓库.jiaZaiWoDe()
    expect(仓库.woDeLieBiao.map((xiang) => xiang.id)).toEqual(['f1', 'f2'])
    expect(仓库.woDeHaiYouGengDuo).toBe(false)
    await 仓库.jiaZaiWoDe()
    expect(fankuiApiJia.huoQuWoDeFanKui).toHaveBeenCalledTimes(2)
  })
})

describe('反馈快照与设备信息', () => {
  it('语音快照带时长与转写摘要', () => {
    const kuaiZhao = chuangJianXiaoXiKuaiZhao({
      id: 'v1',
      nei_rong: '这是转写文本',
      lei_xing: 'yuYin',
      fa_song_zhe_lei_xing: 'jiaose',
      shi_jian_chuo: 123,
      mei_ti_url: 'https://example.com/v.mp3',
      mei_ti_shi_chang_hao_miao: 12000,
    })
    expect(kuaiZhao?.zhai_yao.startsWith('12″')).toBe(true)
    expect(kuaiZhao?.zhai_yao).toContain('这是转写文本')
    expect(kuaiZhao?.fa_song_zhe_lei_xing).toBe('jiaose')
    expect(kuaiZhao?.mei_ti_url).toBe('https://example.com/v.mp3')
  })

  it('图片快照用占位摘要', () => {
    const kuaiZhao = chuangJianXiaoXiKuaiZhao({
      id: 'p1',
      nei_rong: '',
      lei_xing: 'tuPian',
      fa_song_zhe_lei_xing: 'yonghu',
      shi_jian_chuo: 1,
    })
    expect(kuaiZhao?.zhai_yao).toBe('[图片]')
  })

  it('超长文本快照截断到200字', () => {
    const kuaiZhao = chuangJianXiaoXiKuaiZhao({
      id: 't1',
      nei_rong: '长'.repeat(300),
      lei_xing: 'wenben',
      fa_song_zhe_lei_xing: 'yonghu',
      shi_jian_chuo: 1,
    })
    expect(kuaiZhao?.zhai_yao.length).toBeLessThanOrEqual(202)
    expect(kuaiZhao?.zhai_yao.endsWith('……')).toBe(true)
  })

  it('设备信息收集页面与时间戳', () => {
    const xinXi = chuangJianSheBeiXinXi('/chat/abc')
    expect(xinXi.yeMian).toBe('/chat/abc')
    expect(typeof xinXi.shiJianChuo).toBe('number')
    expect(typeof xinXi.xiangSuBi).toBe('number')
    expect(typeof xinXi.yuYan).toBe('string')
  })
})
