import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * FP-07（缺陷4）结局趣味文案的前后端同源守卫。
 *
 * 手法照抄 `角色能力同源.test.ts`：前端不放第二份真源，直读对端源文件核对。钉四件事：
 *  ① 通关/失败分组的判定权已从前端白名单收归服务端下发 —— 旧白名单漏 `sheng_li_shen_jing_bing`，
 *     神经病胜利会弹成失败窗；
 *  ② 趣味句只住在后端翻译类目里，前端一行都不许抄（项目 P0：翻译文件优先 / 禁硬编码）；
 *  ③ 他/她一律由后端 `{TA}` 变体机制代入，前端不得出现代词化结局句；
 *  ④ 死掉的 `components/聊天/结算弹窗.vue`（全仓零消费者，真弹窗内联在聊天页面）不得被重新接上。
 *
 * 行尾注意（F25）：Windows 检出为 CRLF，故所有正则按「单行」写、`\s*$` 吃掉 `\r`，不用含 `\n` 的模式。
 */

const 当前目录 = dirname(fileURLToPath(import.meta.url))
const 前端源码目录 = resolve(当前目录, '..')
const 聊天页面路径 = resolve(前端源码目录, 'views/聊天页面.vue')
const 后端翻译路径 = resolve(当前目录, '../../../backend/src/config/translations.ts')

const 通关池键 = [
  'sheng_li_ai_qing',
  'sheng_li_hu_shan_sheng_li',
  'sheng_li_shen_jing_bing',
  'sheng_li_shi_po',
].sort()

function 读(路径: string): string {
  expect(existsSync(路径), `源文件缺失，同源断言无法执行: ${路径}`).toBe(true)
  return readFileSync(路径, 'utf8')
}

function 遍历前端源(目录: string, 收集: string[] = []): string[] {
  for (const 项 of readdirSync(目录, { withFileTypes: true })) {
    const 完整 = join(目录, 项.name)
    if (项.isDirectory()) {
      if (项.name === '__tests__' || 项.name === 'node_modules') continue
      遍历前端源(完整, 收集)
    } else if (/\.vue$|\.ts$/.test(项.name) && !项.name.endsWith('.d.ts')) {
      收集.push(完整)
    }
  }
  return 收集
}

/** 从后端翻译源里抠出某个池类目的键集合：段起于 `名: {`，止于首个同缩进的收尾 `},` */
function 取池键(后端翻译: string, 段名: string): string[] {
  const 段起 = 后端翻译.indexOf(`${段名}: {`)
  expect(段起, `后端翻译缺少类目 ${段名}`).toBeGreaterThan(-1)
  const 余下 = 后端翻译.slice(段起)
  const 段尾 = 余下.indexOf('\n  },')
  expect(段尾, `${段名} 段收尾异常`).toBeGreaterThan(-1)
  const 本段 = 余下.slice(0, 段尾)
  const 键 = new Set<string>()
  for (const 匹配 of 本段.matchAll(/^\s{4}(sheng_li_\w+|shi_bai_\w+):/gm)) 键.add(匹配[1])
  expect(键.size, `${段名} 段里没解析到任何结局键`).toBeGreaterThan(0)
  return [...键].sort()
}

/** 池内句子：本项目把趣味句一律写成「单引号 + 省略号收尾」的独立一行，故可整段扫出 */
function 取全部池句(后端翻译: string): string[] {
  return [...后端翻译.matchAll(/^[ \t]+'([^']*\.\.\.)',[ \t]*$/gm)].map((匹配) => 匹配[1])
}

describe('结局通关/失败分组单源于服务端下发', () => {
  const 源 = 读(聊天页面路径)

  it('弹窗消费后端下发的分组布尔与趣味句快照', () => {
    expect(源).toContain('shi_fou_tong_guan')
    expect(源).toContain('jie_guo_wen_an')
    expect(源).toContain(
      'youXiShiJianLeiXing.value = jieSuanShiJian.shi_fou_tong_guan === true',
    )
  })

  it('前端硬编码的结局枚举白名单已彻底删除', () => {
    expect(源).not.toMatch(/shengLiLeiXing/)
    for (const 死值 of ['aiZhuDongBiaoBai', 'zhaXingTaoTuo', 'huShanShengLi']) {
      expect(源.includes(死值), `聊天页面.vue 仍残留旧白名单死值 ${死值}`).toBe(false)
    }
    for (const 枚举 of 通关池键) {
      expect(
        源.includes(`'${枚举}'`),
        `聊天页面.vue 又自写了 ${枚举} 的分组判定`,
      ).toBe(false)
    }
  })
})

describe('趣味句只住在后端翻译类目', () => {
  const 后端翻译 = 读(后端翻译路径)

  it('通关组键集合含此前被前端漏掉的 sheng_li_shen_jing_bing，且不含任何失败键', () => {
    const 通关 = 取池键(后端翻译, 'jieGuoTongGuanChi')
    expect(通关).toEqual(通关池键)
    expect(通关.filter((键) => 键.startsWith('shi_bai'))).toEqual([])
  })

  it('失败组覆盖其余 10 个枚举键，两组并起来不漏一个结局', () => {
    const 失败 = 取池键(后端翻译, 'jieGuoShiBaiChi')
    expect(失败).toHaveLength(10)
    expect(失败.filter((键) => 键.startsWith('sheng_li'))).toEqual([])
    const 全键 = [...通关池键, ...失败]
    expect(new Set(全键).size).toBe(14)
    expect(全键.length).toBe(14)
  })

  it('每条池句省略号收尾', () => {
    const 句子列表 = 取全部池句(后端翻译)
    expect(句子列表.length).toBeGreaterThanOrEqual(42)
    for (const 句子 of 句子列表) expect(句子.endsWith('...')).toBe(true)
  })

  it('前端全库不抄任何一句趣味文案', () => {
    const 句子列表 = 取全部池句(后端翻译)
    for (const 文件 of 遍历前端源(前端源码目录)) {
      const 内容 = readFileSync(文件, 'utf8')
      for (const 句子 of 句子列表) {
        expect(内容.includes(句子), `前端抄了后端趣味句: ${文件} -> ${句子}`).toBe(false)
      }
    }
  })

  it('聊天页不出现代词化的结局句，代词一律由后端 {TA} 变体代入', () => {
    const 源 = 读(聊天页面路径)
    expect(源).not.toMatch(/被渣男|被渣女|他\/她/)
    expect(源).not.toContain('{TA}')
  })
})

describe('结算弹窗死组件已清理', () => {
  it('组件与它的自测文件都已删除，且无人再引用', () => {
    expect(existsSync(resolve(前端源码目录, 'components/聊天/结算弹窗.vue'))).toBe(false)
    expect(existsSync(resolve(前端源码目录, '__tests__/结算弹窗.test.ts'))).toBe(false)
    for (const 文件 of 遍历前端源(前端源码目录)) {
      const 内容 = readFileSync(文件, 'utf8')
      expect(
        内容.includes('components/聊天/结算弹窗.vue'),
        `仍有人引用死组件: ${文件}`,
      ).toBe(false)
    }
  })
})

/**
 * 分享文案与战报海报这两个读取口不在 socket 推送链上，它们吃的是 `/api/战绩/*` 返回的
 * `jie_guo_lei_xing` —— 那个字段已经是后端 `解析结局文案` 的快照结果。
 * 这里钉的是前端**不得再自己现算**：既不许随机抽句（同一局每次分享换一句），
 * 也不许丢掉快照回去渲染短标签；快照为空的防御分支必须是确定性的短标签。
 */
describe('分享文案与战报海报只吃后端下发的结局文本', () => {
  const 战绩源码 = 读(resolve(前端源码目录, 'views/过往战绩.vue'))
  const 海报源码 = 读(resolve(前端源码目录, 'utils/战报海报.ts'))

  it('海报入参按「快照优先、空值回退确定性标签」组装', () => {
    expect(战绩源码).toContain(
      'const jieGuoWenBen = dangAn.jie_guo_lei_xing?.trim() || zhuangTaiWenBen(dangAn.jie_guo_lei_xing_yuan)',
    )
    expect(战绩源码).toContain('jieGuoWenBen,')
  })

  it('前端两处读取口都不出现随机源，也不引用后端池子', () => {
    for (const [名, 源] of [
      ['过往战绩.vue', 战绩源码],
      ['战报海报.ts', 海报源码],
    ] as const) {
      expect(源.includes('Math.random'), `${名} 又在前端现算结局句`).toBe(false)
      expect(源.includes('jieGuoTongGuanChi'), `${名} 直连了后端趣味池`).toBe(false)
      expect(源.includes('jieGuoShiBaiChi'), `${名} 直连了后端趣味池`).toBe(false)
    }
  })

  it('海报正文与分享文案逐字用入参，不做二次渲染', () => {
    expect(海报源码).toContain('duanHang(ctx, yiLai.jieGuoWenBen, NEI_KUAN - 96')
    expect(海报源码).toContain(".replace('{结局}', quChuKongBai(yiLai.jieGuoWenBen))")
  })
})
