import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 数据库 } from '../数据库'
import {
  kaiShiTiaoZhan,
  jieSuanTiaoZhanDuiJu,
  huoQuPaiHangBang,
  huoQuWoDeGaiKuang,
} from '../services/挑战积分'
import { huoQuDuanWeiMing, huoQuZuBie } from '../config/挑战配置'

vi.mock('../数据库')
vi.mock('../services/角色生成', () => ({
  shengChengJiaoSe: vi.fn(() => ({
    id: '',
    ming_zi: '测试名',
    xing_bie: 'nv',
    nian_ling: 20,
    shen_fen: '大学生',
    wai_mao: '',
    xing_ge: '',
    bei_jing_gu_shi: '',
    xi_hao: [],
    yan_yu_feng_ge: '',
    xing_wei_te_dian: '',
    tou_xiang: '🎨',
    biao_qian: [],
    xi_huan_de_lei_xing: '',
    jia_ting_bei_jing: '',
    qing_gan_jing_li: '',
    shi_fou_zha_xing: false,
    yu_she_lei_xing: 'INFP',
    mbti_lei_xing: 'INFP',
    ie_lei_xing: 'I',
    re_shen_lei_xing: '快热',
    wei_xin_ming: '测试昵称',
    zhen_shi_ming: '测试名',
    shi_jie_xin_xi: {},
    xi_tong_ti_shi: '',
    ba_da_mo_kuai: {},
    hao_gan_du_zong_fen: 400,
  })),
  baoCunJiaoSe: vi.fn(async (_yongHuId: string, jiaoSe: { id: string }) => {
    // 与真实实现一致：原地回写生成的角色ID
    jiaoSe.id = 'xin-jiao-se-id'
    return jiaoSe
  }),
}))

const moShuJuKu = vi.mocked(数据库.query)

function sheZhiChaXunJieGuo(anShunXu: Array<{ rows?: unknown[]; rowCount?: number | null }>) {
  let suoYin = 0
  moShuJuKu.mockImplementation(async () => {
    const jieGuo = anShunXu[Math.min(suoYin, anShunXu.length - 1)]
    suoYin++
    return (jieGuo ?? { rows: [], rowCount: 0 }) as never
  })
}

beforeEach(() => {
  moShuJuKu.mockReset()
})

describe('挑战模式积分服务', () => {
  it('组别推导：男玩女/女玩男/男玩男/女玩女', () => {
    expect(huoQuZuBie('男', '女')).toBe('nan_nv')
    expect(huoQuZuBie('女', '男')).toBe('nv_nan')
    expect(huoQuZuBie('男', '男')).toBe('nan_nan')
    expect(huoQuZuBie('女', '女')).toBe('nv_nv')
  })

  it('段位命名采用英雄联盟段位', () => {
    expect(huoQuDuanWeiMing(0)).toBe('黑铁')
    expect(huoQuDuanWeiMing(1000)).toBe('青铜')
    expect(huoQuDuanWeiMing(1100)).toBe('白银')
    expect(huoQuDuanWeiMing(1200)).toBe('黄金')
    expect(huoQuDuanWeiMing(1350)).toBe('铂金')
    expect(huoQuDuanWeiMing(1500)).toBe('翡翠')
    expect(huoQuDuanWeiMing(1650)).toBe('钻石')
    expect(huoQuDuanWeiMing(1800)).toBe('大师')
    expect(huoQuDuanWeiMing(2000)).toBe('宗师')
    expect(huoQuDuanWeiMing(2200)).toBe('王者')
  })

  it('已有进行中对局时开局返回409错误', async () => {
    sheZhiChaXunJieGuo([{ rows: [{ ID: 'dui-ju-id' }], rowCount: 1 }])
    await expect(kaiShiTiaoZhan('user-1', '男', '女')).rejects.toMatchObject({
      zhuang_tai_ma: 409,
    })
  })

  it('无进行中对局时开局：保存角色并登记对局', async () => {
    sheZhiChaXunJieGuo([
      { rows: [], rowCount: 0 }, // 进行中检查
      { rows: [{ ID: 'xin-jiao-se-id' }], rowCount: 1 }, // baoCun INSERT RETURNING
      { rows: [], rowCount: 1 }, // 好感度 INSERT
      { rows: [], rowCount: 1 }, // 游戏档案 INSERT
      { rows: [], rowCount: 1 }, // 用户 UPDATE
      { rows: [], rowCount: 1 }, // 挑战对局 INSERT
    ])
    const jiaoSe = await kaiShiTiaoZhan('user-1', '男', '女')
    expect(jiaoSe.id).toBe('xin-jiao-se-id')
    const diaoYongLieBiao = moShuJuKu.mock.calls
    const duiJuChaRu = diaoYongLieBiao.find((can) =>
      String(can[0]).includes('INSERT INTO "挑战对局"'),
    )
    expect(duiJuChaRu).toBeTruthy()
    expect(duiJuChaRu![1]).toEqual(['user-1', 'xin-jiao-se-id', '男', '女'])
  })

  it('胜利结算：基础加分25写入积分变动', async () => {
    sheZhiChaXunJieGuo([
      { rows: [{ ID: 'd1', 玩家性别: '男', 对象性别: '女' }], rowCount: 1 },
      { rows: [{ 连胜: 0 }], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 1 },
    ])
    await jieSuanTiaoZhanDuiJu('user-1', 'role-1', 'sheng_li_ai_qing')
    const jiFenGengXin = moShuJuKu.mock.calls.find((can) =>
      String(can[0]).includes('UPDATE "挑战积分"'),
    )
    expect(jiFenGengXin).toBeTruthy()
    expect(jiFenGengXin![1][2]).toBe(25)
    const duiJuGengXin = moShuJuKu.mock.calls.find(
      (can) => String(can[0]).includes('"积分变动" = $2') && String(can[0]).includes('已结束'),
    )
    expect(duiJuGengXin).toBeTruthy()
    expect(duiJuGengXin![1][1]).toBe(25)
  })

  it('放弃结算：扣15分', async () => {
    sheZhiChaXunJieGuo([
      { rows: [{ ID: 'd1', 玩家性别: '男', 对象性别: '女' }], rowCount: 1 },
      { rows: [{ 胜场: 5, 负场: 2, 弃权场: 0 }], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 1 },
    ])
    await jieSuanTiaoZhanDuiJu('user-1', 'role-1', 'shi_bai_fang_qi_tiao_zhan')
    const jiFenGengXin = moShuJuKu.mock.calls.find((can) =>
      String(can[0]).includes('UPDATE "挑战积分"'),
    )
    expect(jiFenGengXin).toBeTruthy()
    expect(jiFenGengXin![1][2]).toBe(-15)
  })

  it('失败结算（超出定级保护）：扣20分', async () => {
    sheZhiChaXunJieGuo([
      { rows: [{ ID: 'd1', 玩家性别: '女', 对象性别: '男' }], rowCount: 1 },
      { rows: [{ 胜场: 2, 负场: 5, 弃权场: 0 }], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 1 },
    ])
    await jieSuanTiaoZhanDuiJu('user-1', 'role-1', 'shi_bai_guo_zao_biao_bai')
    const jiFenGengXin = moShuJuKu.mock.calls.find((can) =>
      String(can[0]).includes('UPDATE "挑战积分"'),
    )
    expect(jiFenGengXin).toBeTruthy()
    expect(jiFenGengXin![1][2]).toBe(-20)
  })

  it('定级保护：前3场失败不扣分', async () => {
    sheZhiChaXunJieGuo([
      { rows: [{ ID: 'd1', 玩家性别: '女', 对象性别: '男' }], rowCount: 1 },
      { rows: [{ 胜场: 1, 负场: 1, 弃权场: 0 }], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 1 },
    ])
    await jieSuanTiaoZhanDuiJu('user-1', 'role-1', 'shi_bai_hao_gan_du_gui_ling')
    const jiFenGengXin = moShuJuKu.mock.calls.find((can) =>
      String(can[0]).includes('UPDATE "挑战积分"'),
    )
    expect(jiFenGengXin).toBeTruthy()
    expect(jiFenGengXin![1][2]).toBe(0)
  })

  it('无进行中对局时结算为无副作用', async () => {
    sheZhiChaXunJieGuo([{ rows: [], rowCount: 0 }])
    await jieSuanTiaoZhanDuiJu('user-1', 'role-1', 'sheng_li_ai_qing')
    const jiFenGengXin = moShuJuKu.mock.calls.find((can) =>
      String(can[0]).includes('UPDATE "挑战积分"'),
    )
    expect(jiFenGengXin).toBeFalsy()
  })

  it('排行榜组别非法时抛出400', async () => {
    await expect(huoQuPaiHangBang('hack')).rejects.toMatchObject({ zhuang_tai_ma: 400 })
  })

  it('排行榜按组别返回公开数据并计算段位与排名', async () => {
    sheZhiChaXunJieGuo([
      {
        rows: [
          {
            积分: 1750,
            胜场: 30,
            负场: 10,
            弃权场: 2,
            最高连胜: 8,
            历史最高分: 1810,
            用户名: 'aaa',
            昵称: '玩家一',
          },
        ],
        rowCount: 1,
      },
    ])
    const paiHang = await huoQuPaiHangBang('nan_nv')
    expect(paiHang).toHaveLength(1)
    expect(paiHang[0].pai_ming).toBe(1)
    expect(paiHang[0].yong_hu_ming).toBe('玩家一')
    expect(paiHang[0].duan_wei).toBe('大师')
    expect(paiHang[0].ji_fen).toBe(1750)
  })

  it('我的概况：四组别齐全，未参加组分值为null', async () => {
    sheZhiChaXunJieGuo([
      {
        rows: [
          {
            组别: 'nan_nv',
            积分: 1020,
            胜场: 1,
            负场: 0,
            弃权场: 0,
            连胜: 1,
            历史最高分: 1020,
            更新时间: new Date(),
          },
        ],
        rowCount: 1,
      },
      { rows: [{ ming_ci: 7 }], rowCount: 1 },
    ])
    const gaiKuang = await huoQuWoDeGaiKuang('user-1')
    expect(gaiKuang).toHaveLength(4)
    const nanNv = gaiKuang.find((g) => g.zu_bie === 'nan_nv')!
    expect(nanNv.ji_fen).toBe(1020)
    expect(nanNv.duan_wei).toBe('青铜')
    expect(nanNv.pai_ming).toBe(7)
    const nvNv = gaiKuang.find((g) => g.zu_bie === 'nv_nv')!
    expect(nvNv.ji_fen).toBeNull()
    expect(nvNv.pai_ming).toBeNull()
  })
})
