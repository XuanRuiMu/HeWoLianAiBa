import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fanYi, huoQuFanYi } from '../../config/translations'
import {
  SHEN_HE_FU_WU_BU_KE_YONG_JIAN,
  SHEN_HE_WEI_GUI_LEI_BIE,
  SHEN_HE_XI_TONG_CUO_WU_JIAN,
} from '../../config/媒体配置'

/**
 * 视觉审核层抛出的 MeiTiCunChuCuoWu.fanYiJian 取值集合是
 * {六大类别…, '审核服务不可用', '系统错误', ''} ∪ 媒体校验键 ∪ 任何外来值，
 * 而五个上传站点历史上各抄一份类别数组去猜这个键属于哪个翻译段 —— 于是
 * '系统错误' 落到 liaoTian 取不到键（ti_shi = undefined），六大类别又只回裸类别名（'{leiBie}' 从未渲染）。
 * 本文件钉死收口后的唯一出口 services/媒体审核出参.ts：每个分支一条，且任何入参都不许外泄
 * undefined、未替换占位符或内部键名。逐站点接线由 routes/__tests__/媒体审核出参逐站点.test.ts 覆盖。
 */

vi.mock('../../utils/debug日志', () => ({
  debug日志: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { debug日志 } from '../../utils/debug日志'
import { panDingMeiTiShenHeChuCan } from '../媒体审核出参'

const 六大类别 = ['涉政有害', '淫秽色情', '暴力恐怖', '邪教', '赌博诈骗', '侵害未成年人']
const 媒体校验键 = [
  'meiTiLeiXingFeiFa',
  'meiTiMIMEBuZhiChi',
  'meiTiGuoDa',
  'meiTiNeiRongYuMIMEBuFu',
  'bingDuSaoMiaoShiBai',
]
const 外来键样本 = ['', '  ', 'fuWuQiNeiBuCuoWu', 'yong_feng', '__proto__', 'toString', '未知的外来值']

const liaoTian = fanYi.liaoTian as Record<string, string>
const shenHeLeiBie = fanYi.shenHeLeiBie as Record<string, string>

function 违规整句(类别: string): string {
  return liaoTian.tuPianWeiGui.replace('{leiBie}', shenHeLeiBie[类别])
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('媒体审核出参：六大类别回渲染后的整句并记违规', () => {
  for (const 类别 of 六大类别) {
    it(`${类别} → 403 + 带类别名的整句 + 记违规`, () => {
      const 出参 = panDingMeiTiShenHeChuCan(类别)
      expect(出参.zhuangTaiMa).toBe(403)
      expect(出参.xuYaoJiWeiGui).toBe(true)
      expect(出参.tiShi).toBe(违规整句(类别))
      expect(出参.tiShi).toContain(类别)
      expect(出参.tiShi).not.toContain('{')
    })
  }

  it('{leiBie} 占位符确实被替换（回填的是 shenHeLeiBie 段的类别文本）', () => {
    expect(liaoTian.tuPianWeiGui).toContain('{leiBie}')
    expect(panDingMeiTiShenHeChuCan('邪教').tiShi).toBe('图片包含违规内容：邪教，已拦截')
  })
})

describe('媒体审核出参：审核服务不可用与系统错误都不记违规', () => {
  it('审核服务不可用 → 403 + 既有 shenHeLeiBie 文案 + 不记违规', () => {
    const 出参 = panDingMeiTiShenHeChuCan('审核服务不可用')
    expect(出参.zhuangTaiMa).toBe(403)
    expect(出参.xuYaoJiWeiGui).toBe(false)
    expect(出参.tiShi).toBe(shenHeLeiBie['审核服务不可用'])
    expect(debug日志.warn).not.toHaveBeenCalled()
  })

  it("系统错误（图片读取失败）→ 不再回 undefined，而是 liaoTian.tuPianShenHeShiBai", () => {
    // 改前实况：huoQuFanYi('liaoTian', '系统错误') 取不到键 ⇒ ti_shi 直接是 undefined
    expect(huoQuFanYi('liaoTian', '系统错误' as never)).toBeUndefined()
    const 出参 = panDingMeiTiShenHeChuCan('系统错误')
    expect(出参.tiShi).toBe(liaoTian.tuPianShenHeShiBai)
    expect(出参.tiShi).toBe('图片安全审核失败，请稍后再试')
    expect(出参.xuYaoJiWeiGui).toBe(false)
    expect(出参.zhuangTaiMa).toBe(400)
    expect(debug日志.warn).not.toHaveBeenCalled()
  })

  it('tuPianWeiGui（违规但无类别）→ 403 + 无占位符整句 + 记违规', () => {
    const 出参 = panDingMeiTiShenHeChuCan('tuPianWeiGui')
    expect(出参.zhuangTaiMa).toBe(403)
    expect(出参.xuYaoJiWeiGui).toBe(true)
    expect(出参.tiShi).toBe(liaoTian.tuPianWeiGuiTongYong)
    expect(出参.tiShi).toBe('图片包含违规内容，已拦截')
  })
})

describe('媒体审核出参：媒体校验键回各自文案，未知键兜底且不外泄键名', () => {
  for (const jian of 媒体校验键) {
    it(`${jian} → 400 + 该键的 liaoTian 文案 + 不记违规`, () => {
      const 出参 = panDingMeiTiShenHeChuCan(jian)
      expect(出参.zhuangTaiMa).toBe(400)
      expect(出参.xuYaoJiWeiGui).toBe(false)
      expect(出参.tiShi).toBe(liaoTian[jian])
      expect(出参.tiShi.length).toBeGreaterThan(0)
    })
  }

  for (const jian of 外来键样本) {
    it(`未知键「${jian || '空串'}」→ 兜底通用审核失败文案 + 记一条 debug 日志`, () => {
      const 出参 = panDingMeiTiShenHeChuCan(jian)
      expect(出参.zhuangTaiMa).toBe(400)
      expect(出参.xuYaoJiWeiGui).toBe(false)
      expect(出参.tiShi).toBe(liaoTian.tuPianShenHeShiBai)
      if (jian.trim() !== '') expect(出参.tiShi).not.toContain(jian.trim())
      expect(debug日志.warn).toHaveBeenCalledTimes(1)
      expect(debug日志.warn).toHaveBeenCalledWith(
        '媒体审核出参',
        '收到未知审核错误键，回退通用审核失败文案',
        { xiang_qing: { fan_yi_jian: jian } },
      )
    })
  }

  it('兜底不外泄内部实现：文案里既无键名也无堆栈痕迹', () => {
    const 出参 = panDingMeiTiShenHeChuCan('MeiTiCunChuCuoWu at stack /api/媒体')
    expect(出参.tiShi).not.toMatch(/MeiTi|CuoWu|api|stack|\{|\}/)
  })
})

describe('媒体审核出参：入参全域不变量（任何取值都不许 undefined / 占位符 / 裸键名）', () => {
  const 全域 = [
    ...Object.keys(fanYi.liaoTian),
    ...六大类别,
    String(SHEN_HE_FU_WU_BU_KE_YONG_JIAN),
    String(SHEN_HE_XI_TONG_CUO_WU_JIAN),
    ...外来键样本,
  ]

  for (const jian of 全域) {
    it(`「${jian}」的出参是完整可发的句子`, () => {
      const 出参 = panDingMeiTiShenHeChuCan(jian)
      expect(出参.tiShi, `undefined 外泄：${jian}`).toBeTypeOf('string')
      expect(出参.tiShi.length, `空文案：${jian}`).toBeGreaterThan(0)
      expect(出参.tiShi).not.toContain('{')
      expect(出参.tiShi).not.toContain('}')
      expect([400, 403]).toContain(出参.zhuangTaiMa)
      expect(出参.xuYaoJiWeiGui).toBeTypeOf('boolean')
    })
  }

  it('记违规当且仅当六大类别或 tuPianWeiGui（审核服务/系统错误/媒体校验/未知一律不记）', () => {
    for (const jian of 全域) {
      const 期望记 = [...六大类别, 'tuPianWeiGui'].includes(jian)
      expect(panDingMeiTiShenHeChuCan(jian).xuYaoJiWeiGui, `记违规漂移：${jian}`).toBe(期望记)
    }
  })
})

describe('审核类别真源唯一：翻译段键集派生，路由侧零副本', () => {
  const 源码根 = resolve(__dirname, '../..')

  function 遍历文件(目录: string, 收集: string[] = []): string[] {
    for (const 项 of readdirSync(目录, { withFileTypes: true })) {
      const 完整 = resolve(目录, 项.name)
      if (项.isDirectory()) {
        if (项.name === '__tests__' || 项.name === 'node_modules') continue
        遍历文件(完整, 收集)
      } else if (项.name.endsWith('.ts') || 项.name.endsWith('.json')) {
        收集.push(完整)
      }
    }
    return 收集
  }

  function 读源(...段: string[]): string {
    return readFileSync(resolve(源码根, ...段), 'utf-8')
  }

  function 含(片段: string): string[] {
    return 遍历文件(源码根)
      .filter((文件) => readFileSync(文件, 'utf-8').includes(片段))
      .map((文件) => relative(源码根, 文件).replace(/\\/g, '/'))
      .sort()
  }

  it('违规类别清单就是 fanYi.shenHeLeiBie 键集去掉服务侧哨兵键', () => {
    expect([...SHEN_HE_WEI_GUI_LEI_BIE].sort()).toEqual(六大类别.sort())
    expect(SHEN_HE_WEI_GUI_LEI_BIE).not.toContain(SHEN_HE_FU_WU_BU_KE_YONG_JIAN)
    expect(Object.keys(fanYi.shenHeLeiBie).sort()).toEqual([...六大类别, '审核服务不可用'].sort())
    expect(SHEN_HE_XI_TONG_CUO_WU_JIAN).toBe('系统错误')
    expect(shenHeLeiBie[String(SHEN_HE_XI_TONG_CUO_WU_JIAN)]).toBeUndefined()
  })

  it("'涉政有害' 字面量在 src/ 下收敛到翻译文件与词库数据文件，路由与审核侧全清", () => {
    expect(含('涉政有害')).toEqual(['config/translations.ts', 'config/审核词库/v1.json'])
  })

  it('routes/ 下不得再有任何本地审核类别数组或审核段取文案', () => {
    const 路由目录 = resolve(源码根, 'routes')
    const 命中: string[] = []
    for (const 文件 of 遍历文件(路由目录)) {
      const 源 = readFileSync(文件, 'utf-8')
      if (/shenHeLeiBieLieBiao|TU_PIAN_SHEN_HE_LEI_BIE|TU_PIAN_WEI_GUI_LEI_BIE/.test(源)) {
        命中.push(`${relative(源码根, 文件)}::本地数组`)
      }
      if (/huoQuFanYi\w*\(\s*'shenHeLeiBie'/.test(源)) {
        命中.push(`${relative(源码根, 文件)}::直取审核段`)
      }
    }
    expect(命中).toEqual([])
    for (const 文件 of ['消息.ts', '用户设置.ts', '表情.ts', '资料.ts', '好友.ts']) {
      expect(读源('routes', 文件)).toContain('panDingMeiTiShenHeChuCan(')
    }
  })

  it('出参映射（审核段取文案 + tuPianWeiGui 渲染）只存在于唯一出口一个文件', () => {
    expect(含("huoQuFanYiMiaoShu('liaoTian', 'tuPianWeiGui'")).toEqual(['services/媒体审核出参.ts'])
    expect(含("'shenHeLeiBie',")).toEqual(['services/媒体审核出参.ts'])
  })
})
