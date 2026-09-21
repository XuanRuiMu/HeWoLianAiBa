import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import {
  解析性别,
  是可识别性别,
  内部转展示,
  内部转用户形态,
  归一角色性别,
  选择形态,
  用户形态,
  请求性别或拒绝,
  解析性别配色档,
  性别合法写法,
  性别内部形态列表,
} from '@/utils/性别'
import { yanZhengXingBie, guiYiXingBie } from '@/utils/输入验证'
import { huoQuFanYi } from '@/config/translations'
import { 使用角色生成仓库 } from '@/stores/角色生成'
import type { 生成流程资料 } from '@/stores/角色生成'

/**
 * FP-13 前端性别口径测试。
 *
 * ① 唯一解析入口自身的矩阵；② 与后端 `backend/src/utils/性别.ts` 的写法表逐字同源
 * （前后端是两个构建产物、无法共享源码，同源只能靠断言把守）；③ 三处历史缺陷的红灯对照：
 * 「非 male 即 nv」的静默错判、白名单少两种写法、缺字段默认成男性。
 */

vi.mock('@/api/挑战', () => ({
  kaiShiTiaoZhan: vi.fn(),
}))
vi.mock('@/api/聊天', () => ({
  shengChengJiaoSe: vi.fn(),
  queRenJiaoSe: vi.fn(),
  chuangJianHuiHua: vi.fn(),
}))

// 出参断言用：桩化 http，让真实 api/聊天 走一遍归一
const 捕获 = vi.hoisted(() => ({
  请求体: [] as Array<Record<string, unknown>>,
}))
vi.mock('@/api/请求', () => ({
  default: {
    post: async (_url: string, 体: Record<string, unknown>) => {
      捕获.请求体.push(体)
      return { data: { cheng_gong: true, shu_ju: { id: 'j1' } } }
    },
    get: async () => ({ data: { cheng_gong: true, shu_ju: {} } }),
  },
}))

import { kaiShiTiaoZhan } from '@/api/挑战'
import { shengChengJiaoSe, chuangJianHuiHua } from '@/api/聊天'

const 六种写法: Array<[string, 'nan' | 'nv']> = [
  ['男', 'nan'],
  ['nan', 'nan'],
  ['male', 'nan'],
  ['女', 'nv'],
  ['nv', 'nv'],
  ['female', 'nv'],
]

async function 排空() {
  await vi.advanceTimersByTimeAsync(0)
  await flushPromises()
  await vi.advanceTimersByTimeAsync(0)
}

function 挑战资料(覆盖: Partial<生成流程资料> = {}): 生成流程资料 {
  return {
    moshi: 'tiaozhan',
    xingBie: 'male',
    muBiaoXingBie: 'female',
    woDeXingBie: '男',
    ...覆盖,
  }
}

describe('唯一解析入口：写法矩阵', () => {
  it.each(六种写法)('%s → 内部规范形态', (写法, 期望) => {
    expect(解析性别(写法)).toBe(期望)
  })

  it.each(六种写法)('%s 的大小写与首尾空格变体同解', (写法, 期望) => {
    expect(解析性别(` ${写法.toUpperCase()} `)).toBe(期望)
  })

  it('识别不出一律 null，绝不静默判成某个性别', () => {
    for (const 脏值 of ['unknown', '', '   ', '男女', 'M', '2', null, undefined, 0, {}, []]) {
      expect(解析性别(脏值)).toBeNull()
      expect(是可识别性别(脏值)).toBe(false)
      expect(选择形态(脏值)).toBeNull()
      expect(用户形态(脏值)).toBeNull()
    }
  })

  it('内部规范形态 → 展示形态，未知只在识别不出时出现', () => {
    expect(内部转展示('nan')).toBe('男')
    expect(内部转展示('nv')).toBe('女')
    expect(内部转展示(null)).toBe('未知')
    expect(内部转展示(undefined)).toBe('未知')
    expect(归一角色性别('nv')).toBe('女')
    expect(归一角色性别('女')).toBe('女')
    expect(归一角色性别('female')).toBe('女')
    expect(归一角色性别('脏写法')).toBe('未知')
  })

  it('选择形态/用户形态 两个出站形态与内部形态一一对应', () => {
    expect(选择形态('nv')).toBe('女')
    expect(选择形态('男')).toBe('男')
    expect(用户形态('nan')).toBe('male')
    expect(用户形态('nv')).toBe('female')
    expect(内部转用户形态('nv')).toBe('female')
  })

  it('请求性别或拒绝：六种写法归一为内部形态，识别不出抛翻译文案', () => {
    expect(请求性别或拒绝('male')).toBe('nan')
    expect(请求性别或拒绝('女')).toBe('nv')
    expect(() => 请求性别或拒绝('unknown')).toThrow(huoQuFanYi('anQuan', 'shenFenBuHeFa'))
    expect(() => 请求性别或拒绝(null)).toThrow(huoQuFanYi('anQuan', 'shenFenBuHeFa'))
  })

  it('配色档：六种写法归到 nan/nv，识别不出（含 null）一律中性，绝不默认成男或女', () => {
    expect(解析性别配色档('male')).toBe('nan')
    expect(解析性别配色档('男')).toBe('nan')
    expect(解析性别配色档('NAN ')).toBe('nan')
    expect(解析性别配色档('female')).toBe('nv')
    expect(解析性别配色档('女')).toBe('nv')
    expect(解析性别配色档('nv')).toBe('nv')
    for (const 脏值 of ['unknown', '', '   ', null, undefined, 0, {}, []]) {
      expect(解析性别配色档(脏值)).toBe('zhongxing')
    }
  })
})

describe('前后端写法表同源（读后端源文件把守）', () => {
  const 后端源 = readFileSync(
    resolve(__dirname, '../../../backend/src/utils/性别.ts'),
    'utf-8',
  )

  function 抽后端写法表(函数名: string): string[] {
    const 命中 = new RegExp(`const ${函数名}: readonly string\\[\\] = \\[([^\\]]*)\\]`).exec(
      后端源,
    )
    if (!命中) throw new Error(`后端源里找不到 ${函数名} 的写法表`)
    return [...命中[1].matchAll(/'([^']+)'/g)].map((项) => 项[1])
  }

  it('后端男/女写法集合与前端逐项一致（顺序不敏感）', () => {
    const 后端 = [...抽后端写法表('男写法集合'), ...抽后端写法表('女写法集合')].sort()
    expect([...性别合法写法].sort()).toEqual(后端)
  })

  it('后端内部规范形态二值与前端一致', () => {
    expect(后端源).toMatch(/export type 性别内部形态 = 'nan' \| 'nv'/)
    expect(new Set(性别内部形态列表)).toEqual(new Set(['nan', 'nv']))
  })
})

describe('输入验证白名单与后端同一（六种写法）', () => {
  it.each(六种写法)('yanZhengXingBie(%s) 合法', (写法) => {
    expect(yanZhengXingBie(写法).heFa).toBe(true)
  })

  it('guiYiXingBie 复用唯一入口：male/female 不再被判成非法', () => {
    expect(guiYiXingBie('male')).toBe('nan')
    expect(guiYiXingBie('female')).toBe('nv')
    expect(guiYiXingBie(' NAN ')).toBe('nan')
  })

  it('非法写法仍拒并给出翻译文案', () => {
    const jieGuo = yanZhengXingBie('other')
    expect(jieGuo.heFa).toBe(false)
    expect(jieGuo.xiaoXi).toBe(huoQuFanYi('anQuan', 'shenFenBuHeFa'))
  })
})

describe('挑战开赛性别卡口（FP-13 缺陷对照）', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    setActivePinia(createPinia())
    vi.mocked(chuangJianHuiHua).mockResolvedValue({
      id: 'h1',
      jiao_se_id: 'j1',
      yong_hu_id: 'u1',
      kai_shi_shi_jian: Date.now(),
      zui_hou_xiao_xi_shi_jian: Date.now(),
      wei_du_xiao_xi_shu: 0,
    } as never)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('六种写法透传都归一到 男/女 再发请求：旧镜像写的 male/female 不再被静默改成女性', async () => {
    vi.mocked(kaiShiTiaoZhan).mockResolvedValue({ id: 'j1' } as never)
    const 仓库 = 使用角色生成仓库()
    仓库.kaiShiLiuCheng(挑战资料({ woDeXingBie: 'nv', muBiaoXingBie: 'nan' }))
    await 排空()
    expect(kaiShiTiaoZhan).toHaveBeenCalledWith('女', '男')
    expect(仓库.zhuangTai).toBe('yi_wan_cheng')
  })

  it('缺自身性别：拒发并进入失败态（旧实现默认成男性，静默错判）', async () => {
    const 仓库 = 使用角色生成仓库()
    仓库.kaiShiLiuCheng(挑战资料({ woDeXingBie: undefined }))
    await 排空()
    expect(kaiShiTiaoZhan).not.toHaveBeenCalled()
    expect(仓库.zhuangTai).toBe('shi_bai')
    expect(仓库.cuoWuXinXi).toBe(huoQuFanYi('tianJiaWeiXin', 'shengChengShiBai'))
  })

  it('对象性别是无法识别的写法：拒发（旧实现非 male 一律算成 女）', async () => {
    const 仓库 = 使用角色生成仓库()
    仓库.kaiShiLiuCheng(挑战资料({ muBiaoXingBie: 'unknown' as never }))
    await 排空()
    expect(kaiShiTiaoZhan).not.toHaveBeenCalled()
    expect(仓库.zhuangTai).toBe('shi_bai')
  })

  it('普通模式出参同样归一：目标性别 female → nv 发给后端', async () => {
    vi.mocked(shengChengJiaoSe).mockResolvedValue({ id: 'j1' } as never)
    const 仓库 = 使用角色生成仓库()
    仓库.kaiShiLiuCheng({ xingBie: 'male', muBiaoXingBie: 'female' })
    await 排空()
    expect(shengChengJiaoSe).toHaveBeenCalledWith('female', 'INFP', false, false, 'male', null)
  })
})

describe('出参请求体归一（真实 api/聊天 + 桩化 http）', () => {
  beforeEach(() => {
    捕获.请求体.length = 0
  })

  it.each([
    ['male', 'nan'],
    ['female', 'nv'],
    ['男', 'nan'],
    ['女', 'nv'],
    ['nan', 'nan'],
    ['nv', 'nv'],
  ] as const)('目标性别 %s → 请求体 性别=%s', async (输入, 期望) => {
    const 真接口 = await vi.importActual<typeof import('@/api/聊天')>('@/api/聊天')
    await 真接口.shengChengJiaoSe(输入, 'INFP', false, false, 'male')
    expect(捕获.请求体[0].性别).toBe(期望)
    expect(捕获.请求体[0].用户性别).toBe('nan')
  })

  it('无法识别的目标性别直接拒发，不发出请求（旧实现静默算成 nv）', async () => {
    const 真接口 = await vi.importActual<typeof import('@/api/聊天')>('@/api/聊天')
    await expect(真接口.shengChengJiaoSe('unknown', 'INFP', false)).rejects.toThrow(
      huoQuFanYi('anQuan', 'shenFenBuHeFa'),
    )
    expect(捕获.请求体).toHaveLength(0)
  })

  it('用户性别缺省时不出该字段，非法时同样拒发', async () => {
    const 真接口 = await vi.importActual<typeof import('@/api/聊天')>('@/api/聊天')
    await 真接口.shengChengJiaoSe('female', 'INFP', false, false, null)
    expect(捕获.请求体[0].用户性别).toBeUndefined()
    await expect(
      真接口.shengChengJiaoSe('female', 'INFP', false, false, 'unknown'),
    ).rejects.toThrow(huoQuFanYi('anQuan', 'shenFenBuHeFa'))
  })
})
