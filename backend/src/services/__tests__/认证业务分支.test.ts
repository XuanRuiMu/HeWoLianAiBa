import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  dbQuery: vi.fn(),
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    incr: vi.fn(),
    pexpire: vi.fn(),
    del: vi.fn(),
  },
  bcryptHash: vi.fn(),
  bcryptCompare: vi.fn(),
  shengChengLingPai: vi.fn(),
  randomUUID: vi.fn(),
  cunChuRefreshToken: vi.fn(),
  xiaoHaoRefreshToken: vi.fn(),
  jianCeRefreshTokenChongFu: vi.fn(),
  cheXiaoYongHuSuoYouRefreshToken: vi.fn(),
  shanChuRefreshToken: vi.fn(),
  xieRuCheXiaoShiJianCuo: vi.fn(),
  yanZhengMa: vi.fn(),
  shanChuYanZhengMa: vi.fn(),
  audit: vi.fn(),
  手机号存在: true,
  用户存在: true,
  用户名已存在: false,
  用户总数: 0,
  插入错误: false,
  协议留痕错误: false,
  密码哈希: 'hashed:secret',
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: 假.bcryptHash,
    compare: 假.bcryptCompare,
  },
}))

vi.mock('../../数据库', () => ({
  数据库: { query: 假.dbQuery },
}))

vi.mock('../../redis', () => ({ redis: 假.redis }))

vi.mock('../../utils/jwt', () => ({
  shengChengLingPai: 假.shengChengLingPai,
  randomUUID: 假.randomUUID,
  cunChuRefreshToken: 假.cunChuRefreshToken,
  xiaoHaoRefreshToken: 假.xiaoHaoRefreshToken,
  jianCeRefreshTokenChongFu: 假.jianCeRefreshTokenChongFu,
  cheXiaoYongHuSuoYouRefreshToken: 假.cheXiaoYongHuSuoYouRefreshToken,
  shanChuRefreshToken: 假.shanChuRefreshToken,
  xieRuCheXiaoShiJianCuo: 假.xieRuCheXiaoShiJianCuo,
}))

vi.mock('../短信', () => ({
  yanZhengMaShiFouZhengQue: 假.yanZhengMa,
  shanChuYanZhengMa: 假.shanChuYanZhengMa,
}))

vi.mock('../审计日志', () => ({ jiLuShenJiRiZhi: 假.audit }))

vi.mock('../媒体存储', () => ({
  zhongXinQianMingMeiTiURL: (v: string) => `/media/${v}`,
}))

vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuAIJiLu: vi.fn(),
}))

import { peiZhi } from '../../config'
import {
  anIdChaYongHu,
  anShouJiHaoChaYongHu,
  dengLu,
  gengGaiMiMa,
  gengGaiYongHuMing,
  jiSuanZhouSuiNianLing,
  setMoRenXingBie,
  shuaXinLingPai,
  yanZhengMiMaFuZaDu,
  yanZhengShouJiHaoGeShi,
  yanZhengYongHuMingGeShi,
  yingSheYongHu,
  zhuCe,
  zhuXiaoLingPai,
} from '../认证'

const 用户ID = '11111111-1111-4111-8111-111111111111'
const 手机号 = '13800138000'
const 角色ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

type 行 = Record<string, unknown>

function 用户行(覆盖: 行 = {}): 行 {
  return {
    ID: 用户ID,
    手机号,
    用户名: 'test_user',
    昵称: '测试用户',
    目标性别: 'female',
    默认性别: null,
    性格选择: 'INTJ',
    人设标签: '理性',
    渣男渣女变体: false,
    头像: 'avatar.png',
    生日: '2000-01-01',
    签名: '签名',
    测试: true,
    活跃角色ID: 角色ID,
    创建时间: '2026-01-01T00:00:00.000Z',
    更新时间: '2026-01-02T00:00:00.000Z',
    管理员: false,
    运营: false,
    审核员: false,
    ...覆盖,
  }
}

function 返回(rows: 行[]): { rows: 行[]; rowCount: number } {
  return { rows, rowCount: rows.length }
}

function 设置数据库(): void {
  假.dbQuery.mockImplementation(async (sql: string, params: unknown[] = []) => {
    const text = String(sql)
    if (text.includes('SELECT * FROM "用户" WHERE "手机号"')) {
      return 返回(假.手机号存在 ? [用户行()] : [])
    }
    if (text.includes('SELECT * FROM "用户" WHERE "ID"')) {
      return 返回(假.用户存在 ? [用户行()] : [])
    }
    if (text.includes('SELECT COUNT(*) AS "总数" FROM "用户"')) {
      return 返回([{ 总数: 假.用户总数 }])
    }
    if (text.includes('SELECT 1 FROM "用户" WHERE "用户名"')) {
      return 返回(假.用户名已存在 ? [{ '?column?': 1 }] : [])
    }
    if (text.includes('INSERT INTO "用户"')) {
      if (假.插入错误) {
        throw { code: '23505' }
      }
      return 返回([用户行({ 手机号: String(params[0]), 用户名: String(params[1]), 密码哈希: String(params[2]) })])
    }
    if (text.includes('SELECT "密码哈希" FROM "用户" WHERE "手机号"')) {
      return 返回([{ 密码哈希: 假.密码哈希 }])
    }
    if (text.includes('UPDATE "用户" SET "密码哈希"')) {
      return 返回([])
    }
    if (text.includes('SELECT "手机号" FROM "用户" WHERE "ID"')) {
      return 返回(假.用户存在 ? [{ 手机号 }] : [])
    }
    if (text.includes('UPDATE "用户" SET "默认性别"')) {
      return 返回(假.用户存在 ? [用户行({ 默认性别: params[0] })] : [])
    }
    if (text.includes('UPDATE "用户" SET "用户名"')) {
      return 返回([用户行({ 用户名: params[0] })])
    }
    if (text.includes('INSERT INTO "协议留痕"')) {
      if (假.协议留痕错误) throw new Error('协议表不可用')
      return 返回([])
    }
    return 返回([])
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  假.手机号存在 = true
  假.用户存在 = true
  假.用户名已存在 = false
  假.用户总数 = 0
  假.插入错误 = false
  假.协议留痕错误 = false
  假.密码哈希 = 'hashed:secret'
  假.redis.get.mockResolvedValue(null)
  假.redis.set.mockResolvedValue('OK')
  假.redis.incr.mockResolvedValue(1)
  假.redis.pexpire.mockResolvedValue(1)
  假.redis.del.mockResolvedValue(1)
  假.bcryptHash.mockImplementation(async (value: string) => `hashed:${value}`)
  假.bcryptCompare.mockImplementation(async (value: string, hash: string) => hash === `hashed:${value}`)
  假.shengChengLingPai.mockReturnValue('access-token')
  假.randomUUID.mockReturnValue('refresh-token-id')
  假.cunChuRefreshToken.mockResolvedValue(undefined)
  假.xiaoHaoRefreshToken.mockResolvedValue({ cheng_gong: true })
  假.jianCeRefreshTokenChongFu.mockResolvedValue(false)
  假.cheXiaoYongHuSuoYouRefreshToken.mockResolvedValue(undefined)
  假.shanChuRefreshToken.mockResolvedValue(undefined)
  假.xieRuCheXiaoShiJianCuo.mockResolvedValue(undefined)
  假.yanZhengMa.mockResolvedValue(true)
  假.shanChuYanZhengMa.mockResolvedValue(undefined)
  假.audit.mockResolvedValue(undefined)
  设置数据库()
  peiZhi.tiYanBan.zuiDaYongHuShu = 1000
  peiZhi.xianLiu.dengLu.zuiDa = 5
})

describe('认证纯函数与用户映射', () => {
  it('手机号、用户名、密码和周岁边界按业务规则判定', () => {
    expect(yanZhengShouJiHaoGeShi(手机号)).toBe(true)
    expect(yanZhengShouJiHaoGeShi('123')).toBe(false)
    expect(yanZhengYongHuMingGeShi('名字_01')).toEqual({ he_fa: true, ti_shi: '' })
    expect(yanZhengYongHuMingGeShi('名字!')).toMatchObject({ he_fa: false })
    expect(yanZhengMiMaFuZaDu('Abc12345!')).toMatchObject({ he_fa: true })
    expect(yanZhengMiMaFuZaDu('short1')).toMatchObject({ he_fa: false })
    expect(yanZhengMiMaFuZaDu('password')).toMatchObject({ he_fa: false })
    expect(yanZhengMiMaFuZaDu('aaaaaaaa')).toMatchObject({ he_fa: false })
    expect(yanZhengMiMaFuZaDu('12345678')).toMatchObject({ he_fa: false })
    expect(yanZhengMiMaFuZaDu('abcdefgh')).toMatchObject({ he_fa: false })
    expect(yanZhengMiMaFuZaDu('abc')).toMatchObject({ he_fa: false })
  })

  it('周岁计算覆盖合法日期、生日未到、非法格式和不存在日期', () => {
    expect(jiSuanZhouSuiNianLing('2000-01-01', new Date('2026-01-01T12:00:00Z'))).toBe(26)
    expect(jiSuanZhouSuiNianLing('2000-01-02', new Date('2026-01-01T12:00:00Z'))).toBe(25)
    expect(jiSuanZhouSuiNianLing('2000/01/01')).toBeNull()
    expect(jiSuanZhouSuiNianLing('2001-02-29')).toBeNull()
  })

  it('用户映射保留公开资料并由三旗标推导角色能力', () => {
    const 普通 = yingSheYongHu(用户行())
    expect(普通).toMatchObject({ id: 用户ID, shou_ji_hao: '138****8000', jiao_se: null, neng_li: [], ce_shi: true })
    const 管理员 = yingSheYongHu(用户行({ 管理员: true }))
    expect(管理员.jiao_se).toBe('chao_guan')
    expect(管理员.neng_li).toContain('cha_kan')
    const 缺省 = yingSheYongHu(用户行({ 用户名: null, 昵称: null, 目标性别: null, 默认性别: null, 性格选择: null, 人设标签: null, 头像: null, 生日: null, 签名: null, 活跃角色ID: null, 创建时间: null, 更新时间: null }))
    expect(缺省).toMatchObject({ yong_hu_ming: null, ni_cheng: null, mu_biao_xing_bie: null, mo_ren_xing_bie: null, tou_xiang: null, sheng_ri: null, qian_ming: null, huo_yue_ren_she_id: null })
  })

  it('按手机号和编号查询用户时分别返回映射与空结果', async () => {
    await expect(anShouJiHaoChaYongHu(手机号)).resolves.toMatchObject({ id: 用户ID })
    await expect(anIdChaYongHu(用户ID)).resolves.toMatchObject({ id: 用户ID })
    假.手机号存在 = false
    假.用户存在 = false
    await expect(anShouJiHaoChaYongHu(手机号)).resolves.toBeNull()
    await expect(anIdChaYongHu(用户ID)).resolves.toBeNull()
  })
})

describe('注册与登录业务分支', () => {
  const 注册参数 = {
    shou_ji_hao: 手机号,
    yan_zheng_ma: '123456',
    yong_hu_ming: 'new_user',
    mi_ma: 'Strong123',
    tong_yi_xie_yi: true,
    chu_sheng_ri_qi: '2000-01-01',
    ip: '127.0.0.1',
  }

  it('注册拒绝非法手机号、用户名、密码、协议、日期和未成年输入', async () => {
    await expect(zhuCe({ ...注册参数, shou_ji_hao: 'bad' })).resolves.toMatchObject({ cuo_wu_ma: 'CAN_SHU_CUO_WU' })
    await expect(zhuCe({ ...注册参数, yong_hu_ming: 'bad!' })).resolves.toMatchObject({ cuo_wu_ma: 'CAN_SHU_CUO_WU' })
    await expect(zhuCe({ ...注册参数, mi_ma: '' })).resolves.toMatchObject({ cuo_wu_ma: 'CAN_SHU_CUO_WU' })
    await expect(zhuCe({ ...注册参数, mi_ma: '12345678' })).resolves.toMatchObject({ cuo_wu_ma: 'CAN_SHU_CUO_WU' })
    await expect(zhuCe({ ...注册参数, tong_yi_xie_yi: false })).resolves.toMatchObject({ cuo_wu_ma: 'CAN_SHU_CUO_WU' })
    await expect(zhuCe({ ...注册参数, chu_sheng_ri_qi: 'bad' })).resolves.toMatchObject({ cuo_wu_ma: 'CAN_SHU_CUO_WU' })
    await expect(zhuCe({ ...注册参数, chu_sheng_ri_qi: '2015-01-01' })).resolves.toMatchObject({ cuo_wu_ma: 'CAN_SHU_CUO_WU' })
  })

  it('注册拒绝名额耗尽、重复手机号、错误验证码和重复用户名', async () => {
    peiZhi.tiYanBan.zuiDaYongHuShu = 1
    假.用户总数 = 1
    await expect(zhuCe(注册参数)).resolves.toMatchObject({ cuo_wu_ma: 'XIAN_LIU' })
    假.用户总数 = 0
    假.手机号存在 = true
    await expect(zhuCe(注册参数)).resolves.toMatchObject({ cuo_wu_ma: 'CHONG_TU' })
    假.手机号存在 = false
    假.yanZhengMa.mockResolvedValue(false)
    await expect(zhuCe(注册参数)).resolves.toMatchObject({ cuo_wu_ma: 'CAN_SHU_CUO_WU' })
    假.yanZhengMa.mockResolvedValue(true)
    假.用户名已存在 = true
    await expect(zhuCe(注册参数)).resolves.toMatchObject({ cuo_wu_ma: 'CHONG_TU' })
  })

  it('注册成功写入用户、令牌和协议留痕，唯一键异常映射为冲突', async () => {
    假.手机号存在 = false
    const 成功 = await zhuCe(注册参数)
    expect(成功).toMatchObject({ cheng_gong: true, shu_ju: { 令牌: 'access-token', 刷新令牌: `${用户ID}:refresh-token-id`, 新用户: true } })
    expect(假.cunChuRefreshToken).toHaveBeenCalledWith(用户ID, 'refresh-token-id')
    假.协议留痕错误 = true
    await expect(zhuCe(注册参数)).resolves.toMatchObject({ cheng_gong: true })
    假.协议留痕错误 = false
    假.插入错误 = true
    await expect(zhuCe(注册参数)).resolves.toMatchObject({ cuo_wu_ma: 'CHONG_TU' })
  })

  it('登录拒绝非法手机号、锁定、不存在和错误密码并执行限流计数', async () => {
    await expect(dengLu({ shou_ji_hao: 'bad', mi_ma: 'x', ip: '127.0.0.1' })).resolves.toMatchObject({ zhuang_tai_ma: 400 })
    假.redis.get.mockResolvedValue('5')
    await expect(dengLu({ shou_ji_hao: 手机号, mi_ma: 'secret', ip: '127.0.0.1' })).resolves.toMatchObject({ zhuang_tai_ma: 429 })
    假.redis.get.mockResolvedValue(null)
    假.手机号存在 = false
    await expect(dengLu({ shou_ji_hao: 手机号, mi_ma: 'secret', ip: '127.0.0.1' })).resolves.toMatchObject({ zhuang_tai_ma: 401 })
    假.手机号存在 = true
    假.bcryptCompare.mockResolvedValue(false)
    await expect(dengLu({ shou_ji_hao: 手机号, mi_ma: 'wrong', ip: '127.0.0.1' })).resolves.toMatchObject({ zhuang_tai_ma: 401 })
    假.redis.incr.mockResolvedValue(5)
    await expect(dengLu({ shou_ji_hao: 手机号, mi_ma: 'wrong', ip: '127.0.0.1' })).resolves.toMatchObject({ zhuang_tai_ma: 429 })
  })

  it('登录成功清理失败计数并升级旧哈希', async () => {
    假.密码哈希 = '$2a$10$old-hash'
    假.bcryptCompare.mockResolvedValue(true)
    const 结果 = await dengLu({ shou_ji_hao: 手机号, mi_ma: 'secret', ip: '127.0.0.1' })
    expect(结果).toMatchObject({ cheng_gong: true, shu_ju: { 新用户: false } })
    expect(假.bcryptHash).toHaveBeenCalledWith('secret', 12)
    expect(假.redis.del).toHaveBeenCalled()
  })
})

describe('资料修改、刷新令牌与注销', () => {
  const 基础 = { yong_hu_id: 用户ID, jiu_mi_ma: 'old', xin_mi_ma: 'New123456', que_ren_xin_mi_ma: 'New123456', yan_zheng_ma: '123456', ip: '127.0.0.1' }

  it('修改密码覆盖不一致、空值、弱密码、用户不存在、验证码和旧密码错误', async () => {
    await expect(gengGaiMiMa({ ...基础, que_ren_xin_mi_ma: 'Other123456' })).resolves.toMatchObject({ cheng_gong: false })
    await expect(gengGaiMiMa({ ...基础, xin_mi_ma: '', que_ren_xin_mi_ma: '' })).resolves.toMatchObject({ cheng_gong: false })
    await expect(gengGaiMiMa({ ...基础, xin_mi_ma: '12345678', que_ren_xin_mi_ma: '12345678' })).resolves.toMatchObject({ cheng_gong: false })
    假.用户存在 = false
    await expect(gengGaiMiMa(基础)).resolves.toMatchObject({ cheng_gong: false })
    假.用户存在 = true
    假.yanZhengMa.mockResolvedValue(false)
    await expect(gengGaiMiMa(基础)).resolves.toMatchObject({ cheng_gong: false })
    假.yanZhengMa.mockResolvedValue(true)
    假.bcryptCompare.mockResolvedValue(false)
    await expect(gengGaiMiMa(基础)).resolves.toMatchObject({ cheng_gong: false })
    假.bcryptCompare.mockResolvedValue(true)
    await expect(gengGaiMiMa(基础)).resolves.toMatchObject({ cheng_gong: true })
  })

  it('修改用户名和默认性别覆盖非法、重复、资源不存在与成功', async () => {
    await expect(gengGaiYongHuMing({ yong_hu_id: 用户ID, yong_hu_ming: 'bad!', ip: '127.0.0.1' })).resolves.toMatchObject({ cheng_gong: false })
    await expect(gengGaiYongHuMing({ yong_hu_id: 用户ID, yong_hu_ming: 'test_user', ip: '127.0.0.1' })).resolves.toMatchObject({ cheng_gong: false })
    假.用户名已存在 = true
    await expect(gengGaiYongHuMing({ yong_hu_id: 用户ID, yong_hu_ming: 'other', ip: '127.0.0.1' })).resolves.toMatchObject({ cheng_gong: false })
    假.用户名已存在 = false
    await expect(gengGaiYongHuMing({ yong_hu_id: 用户ID, yong_hu_ming: 'other', ip: '127.0.0.1' })).resolves.toMatchObject({ cheng_gong: true })
    await expect(setMoRenXingBie({ yong_hu_id: 用户ID, mo_ren_xing_bie: 'bad' })).resolves.toMatchObject({ cheng_gong: false })
    假.用户存在 = false
    await expect(setMoRenXingBie({ yong_hu_id: 用户ID, mo_ren_xing_bie: '女' })).resolves.toMatchObject({ cheng_gong: false })
    假.用户存在 = true
    await expect(setMoRenXingBie({ yong_hu_id: 用户ID, mo_ren_xing_bie: 'female' })).resolves.toMatchObject({ cheng_gong: true, yong_hu: { mo_ren_xing_bie: 'female' } })
  })

  it('刷新令牌覆盖空值、格式、锁、复用、无效 token、用户不存在和成功', async () => {
    await expect(shuaXinLingPai('')).resolves.toMatchObject({ cheng_gong: false })
    await expect(shuaXinLingPai('bad-token')).resolves.toMatchObject({ cheng_gong: false })
    假.redis.set.mockResolvedValue(null)
    await expect(shuaXinLingPai(`${用户ID}:old`)).resolves.toMatchObject({ cheng_gong: false })
    假.redis.set.mockResolvedValue('OK')
    假.jianCeRefreshTokenChongFu.mockResolvedValue(true)
    await expect(shuaXinLingPai(`${用户ID}:old`)).resolves.toMatchObject({ cheng_gong: false })
    假.jianCeRefreshTokenChongFu.mockResolvedValue(false)
    假.xiaoHaoRefreshToken.mockResolvedValue({ chengGong: false, cuoWu: '过期' })
    await expect(shuaXinLingPai(`${用户ID}:old`)).resolves.toMatchObject({ cheng_gong: false })
  假.xiaoHaoRefreshToken.mockResolvedValue({ chengGong: true })
    假.用户存在 = false
    await expect(shuaXinLingPai(`${用户ID}:old`)).resolves.toMatchObject({ cheng_gong: false })
    假.用户存在 = true
    const 结果 = await shuaXinLingPai(`${用户ID}:old`)
    expect(结果).toMatchObject({ cheng_gong: true })
  })

  it('注销单 token 和全部 token 都会写入撤销时间', async () => {
    await zhuXiaoLingPai(用户ID, `${用户ID}:one`)
    expect(假.shanChuRefreshToken).toHaveBeenCalledWith('one', 用户ID)
    await zhuXiaoLingPai(用户ID, 'one')
    expect(假.shanChuRefreshToken).toHaveBeenCalledWith('one', 用户ID)
    await zhuXiaoLingPai(用户ID)
    expect(假.cheXiaoYongHuSuoYouRefreshToken).toHaveBeenCalledWith(用户ID)
    expect(假.xieRuCheXiaoShiJianCuo).toHaveBeenCalledWith(用户ID)
  })
})
