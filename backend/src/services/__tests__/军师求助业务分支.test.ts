import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({ genJu: vi.fn(), debug: { warn: vi.fn(), error: vi.fn() } }))

vi.mock('../../utils/DeepSeek客户端', () => ({ genJuPeiZhiTiaoYong: 假.genJu }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import { jieXiJunShiFenDuan, pinJieJunShiFenDuan, shengChengJunShiZhiDao } from '../军师求助'

const 参数 = {
  yong_hu_id: '用户',
  jiao_se_id: '角色',
  jiao_se_ming: '小满',
  dui_hua_li_shi: [{ fa_song_zhe_lei_xing: 'yonghu' as const, fa_song_zhe_ming: '用户', nei_rong: '你好', shi_jian: '现在' }],
  hao_gan_du: { xin_ren_du: 1, qin_mi_du: 2, qu_wei_du: 3, guan_huai_du: 4, zong_fen: 10, guan_xi_jie_duan: '认识' },
  jun_shi_pei_zhi: { id: 'jun', mingCheng: '军师', xiTongTiShi: '系统提示' },
}

beforeEach(() => {
  vi.clearAllMocks()
  假.genJu.mockResolvedValue({ neiRong: '' })
})

describe('军师求助业务分支', () => {
  it('解析普通、嵌入、截断和无效 JSON 分段', () => {
    const 正常 = jieXiJunShiFenDuan('前缀 {"当前局面":"现在很热","下一步怎么回":"回复：好的","为什么这么聊":"顺着说","鼓励":"加油"} 后缀')
    expect(正常).toEqual({ dangQianJuMian: '现在很热', xiaYiBuZenMeHui: '回复：好的', weiShenMeZheMeLiao: '顺着说', guLi: '加油' })
    const 截断 = jieXiJunShiFenDuan(JSON.stringify({ 当前局面: 'a'.repeat(50), 下一步怎么回: 123, 为什么这么聊: null, 鼓励: '好' }))
    expect(截断?.dangQianJuMian).toHaveLength(40)
    expect(截断?.xiaYiBuZenMeHui).toBe('')
    expect(jieXiJunShiFenDuan('不是 JSON')).toBeNull()
    expect(jieXiJunShiFenDuan('[]')).toBeNull()
    expect(jieXiJunShiFenDuan('{}')).toBeNull()
    expect(pinJieJunShiFenDuan({ dangQianJuMian: '局面', xiaYiBuZenMeHui: '', weiShenMeZheMeLiao: '原因', guLi: '' })).toBe('局面\n原因')
  })

  it('生成接口覆盖空响应、结构化响应、非 JSON 和异常降级', async () => {
    假.genJu.mockResolvedValueOnce({ neiRong: '  ' })
    await expect(shengChengJunShiZhiDao(参数)).resolves.toEqual({ zhi_dao_fen_duan: null, zhi_dao_zheng_duan: expect.any(String) })
    假.genJu.mockResolvedValueOnce({ neiRong: '前缀 {"当前局面":"局面"}' })
    await expect(shengChengJunShiZhiDao(参数)).resolves.toMatchObject({ zhi_dao_fen_duan: { dangQianJuMian: '局面' } })
    假.genJu.mockResolvedValueOnce({ neiRong: '普通整段文本' })
    await expect(shengChengJunShiZhiDao(参数)).resolves.toEqual({ zhi_dao_fen_duan: null, zhi_dao_zheng_duan: '普通整段文本' })
    假.genJu.mockRejectedValueOnce(new Error('服务失败'))
    await expect(shengChengJunShiZhiDao(参数)).resolves.toMatchObject({ zhi_dao_fen_duan: null })
    expect(假.debug.error).toHaveBeenCalled()
  })
})
