import { describe, it, expect, vi, beforeEach } from 'vitest'
import { zhanShiLiShiWenBen, zhanShiXiaoXiZhengWen } from '../对话渲染'
import { huoQuFanYi } from '../../config/translations'
import { huoQuJunShiJiLu } from '../军师'
import { huoQuJunShiJiLuLieBiao } from '../军师缓存'
import type { DuiHuaLiShiXiang } from '../../types'

vi.mock('../军师缓存', async (导入原始) => ({
  ...(await 导入原始()),
  huoQuJunShiJiLuLieBiao: vi.fn(),
}))

/**
 * FP-26：已撤回消息的原文既不进模型语料、也不经普通用户可读的 API 下发。
 *
 * 三条账分别钉住（每条改动各留断言）：
 * ① 模型语料唯一入口（services/对话渲染）：撤回行只出既有撤回占位；
 * ② 军师记录面（普通用户可读的 `GET /api/聊天/军师记录/:jiaoSeId`）：读侧按白名单重建，
 *    兜住 FP-26 之前已落进 Redis 快照的历史记录（写侧不再产该键）；
 * ③ 撤回写口不清空 `内容` 列 ⇒ 「删掉原文后缀」绝不能变成「把 内容 原样喂出去」。
 *
 * 反证口径（三条各跑一次，见证据文件）：把占位改回 `[已撤回，原始内容：X]` ⇒ 本文件 ① 组红；
 * 把 `yuan_shi_nei_rong` 加回军师记录出参 ⇒ 本文件 ② 组红；把 `.chehui-yuanshi` 加回前端
 * ⇒ `frontend/src/__tests__/军师记录详情.test.ts` 与 FP22 双面守卫红。
 */

const 撤回占位文案 = huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
const 原文 = '这是已经被撤回的那句原文'
const 占位载体 = (正文: string): DuiHuaLiShiXiang => ({
  fa_song_zhe_lei_xing: 'yonghu',
  fa_song_zhe_ming: '对方',
  nei_rong: 正文,
  shi_jian: '10:00',
})

describe('FP-26 ① 模型语料：撤回行一律只出撤回占位', () => {
  it('撤回的纯文本行 → 占位文案（旧形态 [已撤回，原始内容：X] 作废）', () => {
    expect(zhanShiXiaoXiZhengWen({ ...占位载体(撤回占位文案), yi_che_hui: true })).toBe(撤回占位文案)
  })

  it('撤回行的 `内容` 就是原文时也不外泄（撤回写口不清空 内容 列）', () => {
    expect(zhanShiXiaoXiZhengWen({ ...占位载体(原文), yi_che_hui: true })).toBe(撤回占位文案)
  })

  it('撤回的图文混排行 → 占位文案，不被原投影（含正文与载体顺序）带出去', () => {
    expect(
      zhanShiXiaoXiZhengWen({
        ...占位载体(`说一句 [图片] 再说一句${原文}`),
        yi_che_hui: true,
        tuWenHunPai: true,
      }),
    ).toBe(撤回占位文案)
  })

  it('未撤回行不受影响：正文逐字原样（本单没有顺手改写正常消息）', () => {
    expect(zhanShiXiaoXiZhengWen(占位载体(原文))).toBe(原文)
  })

  it('带载体的撤回行保留「撤回 + 载体」可辨识性（不退化成无信息占位）', () => {
    expect(
      zhanShiXiaoXiZhengWen({ ...占位载体(原文), yi_che_hui: true, meiTiLeiBie: 'tupian' }),
    ).toBe('[用户撤回了一张图片]')
  })

  it('整段历史文本里撤回那条只以占位出现一次，原文出现零次', () => {
    const 历史: DuiHuaLiShiXiang[] = [
      { ...占位载体('正常的一句'), fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '小美' },
      { ...占位载体(原文), yi_che_hui: true },
    ]
    const 文本 = zhanShiLiShiWenBen(历史, { 角色名: '小美', 用户名: '对方' })

    expect(文本.split(原文).length - 1).toBe(0)
    expect(文本.split(撤回占位文案).length - 1).toBe(1)
    expect(文本).toContain('对方(')
  })
})

describe('FP-26 ② 军师记录（普通用户可读面）：出参白名单里没有撤回原文', () => {
  const 历史快照 = (聊天记录: unknown) => ({
    jian_yi: '建议',
    jian_yi_fen_duan: null,
    shi_jian: '2026-09-22T00:00:00.000Z',
    jiao_se_id: 'jiao-se-1',
    jiao_se_ming_zi: '小美',
    jun_shi_id: 'jun-shi-1',
    jun_shi_ming_chen: '军师',
    jun_shi_tou_xiang: 'tou.png',
    dui_hua_zhai_yao: '摘要',
    liao_tian_ji_lu: 聊天记录,
    hou_tai_shu_ju: {
      hao_gan_du: {
        zong_fen: 40,
        xin_ren_du: 1,
        qin_mi_du: 1,
        qu_wei_du: 1,
        guan_huai_du: 1,
        guan_xi_jie_duan: 'renShi',
      },
      fu_pan_tiao_mu: [],
    },
  })

  beforeEach(() => {
    vi.mocked(huoQuJunShiJiLuLieBiao).mockReset()
  })

  it('FP-26 之前落进 Redis 的快照（仍带原文与未知键）→ 下发体按白名单重建，原文零出现', async () => {
    vi.mocked(huoQuJunShiJiLuLieBiao).mockResolvedValue([
      历史快照([
        {
          jiao_se: '小美',
          nei_rong: 撤回占位文案,
          shi_jian: '10:00',
          yi_che_hui: true,
          yuan_shi_nei_rong: 原文,
          che_hui_shi_jian: '10:05',
          wei_zhi_jian: '历史快照里的未知键',
        },
      ]),
    ] as never)

    const 结果 = await huoQuJunShiJiLu('yong-hu-1', 'jiao-se-1')
    const 条目 = 结果.jiLuLieBiao[0]

    expect(JSON.stringify(结果)).not.toContain(原文)
    expect(条目.liao_tian_ji_lu).toEqual([
      {
        jiao_se: '小美',
        nei_rong: 撤回占位文案,
        shi_jian: '10:00',
        yi_che_hui: true,
        che_hui_shi_jian: '10:05',
      },
    ])
    expect(Object.keys(条目.liao_tian_ji_lu[0]).sort()).toEqual(
      ['che_hui_shi_jian', 'jiao_se', 'nei_rong', 'shi_jian', 'yi_che_hui'].sort(),
    )
    // 撤回态本身仍可辨识：撤回标记与撤回时间都保留
    expect(条目.liao_tian_ji_lu[0].yi_che_hui).toBe(true)
    expect(条目.liao_tian_ji_lu[0].che_hui_shi_jian).toBe('10:05')
  })

  it('快照缺 liao_tian_ji_lu / 为空数组 ⇒ 不抛未捕获异常，下发空数组', async () => {
    vi.mocked(huoQuJunShiJiLuLieBiao).mockResolvedValue([
      { ...历史快照(undefined), hou_tai_shu_ju: undefined },
      历史快照([]),
    ] as never)

    await expect(huoQuJunShiJiLu('yong-hu-1', 'jiao-se-1')).resolves.toMatchObject({
      jiLuLieBiao: [{ liao_tian_ji_lu: [] }, { liao_tian_ji_lu: [] }],
    })
  })
})
