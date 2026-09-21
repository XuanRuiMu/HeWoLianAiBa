import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 令牌键 } from '@/constants/auth'

const moNiYongHu = {
  id: 'u1',
  shou_ji_hao: '13800138000',
  yong_hu_ming: '测试用户',
  ni_cheng: null,
  xing_bie: null,
  mu_biao_xing_bie: null,
  xing_ge_xuan_ze: null,
  ren_she_biao_qian: null,
  yun_xu_zha_nan_zha_nv: false,
  tou_xiang: null,
  sheng_ri: null,
  qian_ming: null,
  jiao_se: null,
  neng_li: [],
  huo_yue_ren_she_id: null,
  hai_wang_fen_shu: 0,
  chuang_jian_shi_jian: new Date().toISOString(),
  geng_xin_shi_jian: new Date().toISOString(),
}

const moNiDengLuXiangYing = {
  令牌: 'test-jwt-token',
  用户: moNiYongHu,
  新用户: false,
}

vi.mock('@/api/认证', () => ({
  dengLu: vi.fn(),
  zhuCe: vi.fn(),
  huoQuYongHuXinXi: vi.fn(),
}))

vi.mock('@/api/请求', () => ({
  huoQuCuoWuXiangYing: vi.fn((cuoWu) => (cuoWu as { response?: unknown }).response),
}))

import { dengLu, zhuCe, huoQuYongHuXinXi } from '@/api/认证'

describe('用户 store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
    vi.resetAllMocks()
  })

  it('登录成功：写入 sessionStorage 令牌并设置用户状态', async () => {
    vi.mocked(dengLu).mockResolvedValue(moNiDengLuXiangYing)
    vi.mocked(huoQuYongHuXinXi).mockResolvedValue(moNiYongHu)

    const yongHuCangKu = 使用用户仓库()
    await yongHuCangKu.zhiXingDengLu('13800138000', 'password123')

    expect(localStorage.getItem(令牌键)).toBeNull()
    expect(sessionStorage.getItem(令牌键)).toBe('test-jwt-token')
    expect(yongHuCangKu.令牌).toBe('test-jwt-token')
    expect(yongHuCangKu.dangQianYongHu?.shou_ji_hao).toBe('13800138000')
  })

  it('登录成功且不记住密码：令牌仅写入 sessionStorage', async () => {
    vi.mocked(dengLu).mockResolvedValue(moNiDengLuXiangYing)
    vi.mocked(huoQuYongHuXinXi).mockResolvedValue(moNiYongHu)

    const yongHuCangKu = 使用用户仓库()
    await yongHuCangKu.zhiXingDengLu('13800138000', 'password123', false)

    expect(localStorage.getItem(令牌键)).toBeNull()
    expect(sessionStorage.getItem(令牌键)).toBe('test-jwt-token')
    expect(yongHuCangKu.令牌).toBe('test-jwt-token')
  })

  it('注册成功：写入 sessionStorage 令牌并设置用户状态', async () => {
    vi.mocked(zhuCe).mockResolvedValue({ ...moNiDengLuXiangYing, 新用户: true })
    vi.mocked(huoQuYongHuXinXi).mockResolvedValue(moNiYongHu)

    const yongHuCangKu = 使用用户仓库()
    await yongHuCangKu.zhiXingZhuCe('13800138000', '123456', '测试用户', 'password123', true)

    expect(localStorage.getItem(令牌键)).toBeNull()
    expect(sessionStorage.getItem(令牌键)).toBe('test-jwt-token')
    expect(yongHuCangKu.dangQianYongHu?.yong_hu_ming).toBe('测试用户')
  })

  it('登录失败：显示翻译文件错误消息', async () => {
    const cuoWu = {
      response: {
        data: { ti_shi: '密码错误' },
      },
    }
    vi.mocked(dengLu).mockRejectedValue(cuoWu)

    const yongHuCangKu = 使用用户仓库()
    await expect(yongHuCangKu.zhiXingDengLu('13800138000', 'wrong')).rejects.toBeDefined()
    expect(yongHuCangKu.zhuangTai.cuo_wu_xin_xi).toBe('密码错误')
  })

  it('jiaZaiYongHu 遇到 401 错误：清除本地登录态', async () => {
    const cuoWu = {
      response: {
        status: 401,
        data: { ti_shi: '令牌无效' },
      },
    }
    vi.mocked(huoQuYongHuXinXi).mockRejectedValue(cuoWu)

    const yongHuCangKu = 使用用户仓库()
    yongHuCangKu.sheZhiLingPai('test-jwt-token', false)
    expect(yongHuCangKu.令牌).toBe('test-jwt-token')

    await yongHuCangKu.jiaZaiYongHu()

    expect(yongHuCangKu.令牌).toBeNull()
    expect(sessionStorage.getItem(令牌键)).toBeNull()
    expect(yongHuCangKu.dangQianYongHu).toBeNull()
  })

  it('jiaZaiYongHu 遇到网络错误：保留本地登录态', async () => {
    const cuoWu = new Error('Network Error')
    vi.mocked(huoQuYongHuXinXi).mockRejectedValue(cuoWu)

    const yongHuCangKu = 使用用户仓库()
    yongHuCangKu.sheZhiLingPai('test-jwt-token', false)
    expect(yongHuCangKu.令牌).toBe('test-jwt-token')

    await yongHuCangKu.jiaZaiYongHu()

    expect(yongHuCangKu.令牌).toBe('test-jwt-token')
    expect(sessionStorage.getItem(令牌键)).toBe('test-jwt-token')
  })

  it('jiaZaiYongHu 遇到 500 错误：保留本地登录态', async () => {
    const cuoWu = {
      response: {
        status: 500,
        data: { ti_shi: '服务器错误' },
      },
    }
    vi.mocked(huoQuYongHuXinXi).mockRejectedValue(cuoWu)

    const yongHuCangKu = 使用用户仓库()
    yongHuCangKu.sheZhiLingPai('test-jwt-token', false)
    expect(yongHuCangKu.令牌).toBe('test-jwt-token')

    await yongHuCangKu.jiaZaiYongHu()

    expect(yongHuCangKu.令牌).toBe('test-jwt-token')
    expect(sessionStorage.getItem(令牌键)).toBe('test-jwt-token')
  })

  it('jiaZaiYongHu 成功：身份视图门随服务端下发的 jiao_se/neng_li 同步（整页刷新场景）', async () => {
    vi.mocked(huoQuYongHuXinXi).mockResolvedValue({
      ...moNiYongHu,
      jiao_se: 'chao_guan',
      neng_li: ['cha_kan', 'feng_jin', 'feng_jin_shen_he', 'tong_ji_xie', 'gao_we'],
    })

    const yongHuCangKu = 使用用户仓库()
    yongHuCangKu.sheZhiLingPai('test-jwt-token')
    expect(yongHuCangKu.keGuanLiZhiDu).toBe(false)
    expect(yongHuCangKu.keGaoWei).toBe(false)
    expect(yongHuCangKu.dangQianJiaoSe).toBeNull()

    await yongHuCangKu.jiaZaiYongHu()

    expect(yongHuCangKu.dangQianJiaoSe).toBe('chao_guan')
    expect(yongHuCangKu.nengLieBiao).toEqual(['cha_kan', 'feng_jin', 'feng_jin_shen_he', 'tong_ji_xie', 'gao_we'])
    expect(yongHuCangKu.keGuanLiZhiDu).toBe(true)
    expect(yongHuCangKu.keGaoWei).toBe(true)
  })

  it('jiaZaiYongHu 成功：本地缓存写着超管、服务端说没身份 → 视图门当场收回（降级不残留）', async () => {
    vi.mocked(huoQuYongHuXinXi).mockResolvedValue({ ...moNiYongHu, jiao_se: null, neng_li: [] })

    const yongHuCangKu = 使用用户仓库()
    yongHuCangKu.sheZhiLingPai('test-jwt-token', { jiao_se: 'chao_guan', neng_li: ['cha_kan', 'gao_we'] })
    expect(yongHuCangKu.keGuanLiZhiDu).toBe(true)
    expect(yongHuCangKu.keGaoWei).toBe(true)

    await yongHuCangKu.jiaZaiYongHu()

    expect(yongHuCangKu.dangQianJiaoSe).toBeNull()
    expect(yongHuCangKu.nengLieBiao).toEqual([])
    expect(yongHuCangKu.keGuanLiZhiDu).toBe(false)
    expect(yongHuCangKu.keGaoWei).toBe(false)
  })

  it('身份视图门 fail-closed：neng_li 缺失/非数组/含白名单外的伪造值一律丢弃', async () => {
    const yongHuCangKu = 使用用户仓库()

    yongHuCangKu.sheZhiLingPai('t1', { jiao_se: 'chao_guan' })
    expect(yongHuCangKu.nengLieBiao).toEqual([])
    expect(yongHuCangKu.keGuanLiZhiDu).toBe(false)

    yongHuCangKu.sheZhiLingPai('t2', { jiao_se: 'superadmin', neng_li: ['cha_kan', 'gao_we', 'suan_shen_fen'] })
    expect(yongHuCangKu.dangQianJiaoSe).toBeNull()
    expect(yongHuCangKu.nengLieBiao).toEqual(['cha_kan', 'gao_we'])

    yongHuCangKu.sheZhiLingPai('t3', { jiao_se: 'yun_ying', neng_li: 'cha_kan' })
    expect(yongHuCangKu.nengLieBiao).toEqual([])
    expect(yongHuCangKu.dangQianJiaoSe).toBe('yun_ying')
  })

  it('运营身份只点亮只读视图门，不点亮高危视图门', async () => {
    vi.mocked(huoQuYongHuXinXi).mockResolvedValue({
      ...moNiYongHu,
      jiao_se: 'yun_ying',
      neng_li: ['cha_kan', 'feng_jin', 'tong_ji_xie'],
    })
    const yongHuCangKu = 使用用户仓库()
    yongHuCangKu.sheZhiLingPai('test-jwt-token')
    await yongHuCangKu.jiaZaiYongHu()

    expect(yongHuCangKu.keGuanLiZhiDu).toBe(true)
    expect(yongHuCangKu.keGaoWei).toBe(false)
    expect(yongHuCangKu.dangQianJiaoSe).toBe('yun_ying')
  })

  it('退出登录：清除令牌、认证表单字段、用户状态、聊天 socket', async () => {
    vi.mocked(dengLu).mockResolvedValue(moNiDengLuXiangYing)
    vi.mocked(huoQuYongHuXinXi).mockResolvedValue(moNiYongHu)

    const yongHuCangKu = 使用用户仓库()
    const renZhengBiaoDanCangKu = 使用认证表单仓库()
    const liaoTianCangKu = 使用聊天仓库()

    renZhengBiaoDanCangKu.dengLuShouJiHao = '13800138000'
    renZhengBiaoDanCangKu.dengLuMiMa = 'password123'
    renZhengBiaoDanCangKu.zhuCeShouJiHao = '13800138000'
    renZhengBiaoDanCangKu.zhuCeYanZhengMa = '123456'
    renZhengBiaoDanCangKu.zhuCeYongHuMing = '测试'
    renZhengBiaoDanCangKu.zhuCeMiMa = 'password123'
    renZhengBiaoDanCangKu.tongYiXieYi = true

    await yongHuCangKu.zhiXingDengLu('13800138000', 'password123')
    expect(sessionStorage.getItem(令牌键)).toBeTruthy()

    yongHuCangKu.tuiChuDengLu()

    expect(sessionStorage.getItem(令牌键)).toBeNull()
    expect(yongHuCangKu.令牌).toBeNull()
    expect(yongHuCangKu.dangQianYongHu).toBeNull()
    expect(renZhengBiaoDanCangKu.dengLuShouJiHao).toBe('')
    expect(renZhengBiaoDanCangKu.dengLuMiMa).toBe('')
    expect(renZhengBiaoDanCangKu.zhuCeShouJiHao).toBe('')
    expect(renZhengBiaoDanCangKu.zhuCeYanZhengMa).toBe('')
    expect(renZhengBiaoDanCangKu.zhuCeYongHuMing).toBe('')
    expect(renZhengBiaoDanCangKu.zhuCeMiMa).toBe('')
    expect(renZhengBiaoDanCangKu.tongYiXieYi).toBe(false)
    expect(liaoTianCangKu.socketLianJie).toBeNull()
    expect(liaoTianCangKu.lianJieZhong).toBe(false)
  })
})
