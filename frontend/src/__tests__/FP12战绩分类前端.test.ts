import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const src = resolve(__dirname, '../')
const api = readFileSync(join(src, 'api/聊天.ts'), 'utf8')
const store = readFileSync(join(src, 'stores/战绩.ts'), 'utf8')
const view = readFileSync(join(src, 'views/过往战绩.vue'), 'utf8')
const component = readFileSync(join(src, 'components/战绩分类管理.vue'), 'utf8')

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|vue)$/.test(name) && !path.includes(`${join('__tests__', '')}`) ? [path] : []
  })
}

const files = sourceFiles(src).map((path) => ({
  path: relative(src, path).replaceAll('\\', '/'),
  source: readFileSync(path, 'utf8'),
}))

describe('FP-12 前端源码守卫', () => {
  it('分类协议只在 API 文件定义，store 是唯一业务调用入口', () => {
    for (const route of [
      '/战绩/分类',
      '`/战绩/分类/${categoryId}/排序`',
      '`/战绩/分类/${sourceCategoryId}/记录/${recordId}`',
    ]) {
      const owners = files.filter((item) => item.source.includes(route)).map((item) => item.path)
      expect(owners, `${route} 出现重复入口`).toEqual(['api/聊天.ts'])
    }
    const functionNames = [
      'huoQuZhanJiFenLeiLieBiao',
      'chuangJianZhanJiFenLei',
      'gengMingZhanJiFenLei',
      'shanChuZhanJiFenLei',
      'yiDongDangAnDaoFenLei',
      'paiXuFenLeiNeiZhanJi',
    ]
    for (const name of functionNames) {
      const importers = files
        .filter((item) => item.path !== 'api/聊天.ts' && new RegExp(`\\b${name}\\b`).test(item.source))
        .map((item) => item.path)
      expect(importers, `${name} 被重复接入`).toEqual(['stores/战绩.ts'])
    }
  })

  it('视图不直连分类 API，只消费战绩 store 与分类组件', () => {
    expect(view).toContain("from '@/stores/战绩'")
    expect(view).toContain("from '@/components/战绩分类管理.vue'")
    expect(view).not.toMatch(/from '@\/api\/聊天'[\s\S]{0,200}(huoQuZhanJiFenLeiLieBiao|chuangJianZhanJiFenLei|gengMingZhanJiFenLei|shanChuZhanJiFenLei|yiDongDangAnDaoFenLei|paiXuFenLeiNeiZhanJi)/)
    expect(view.match(/<VueDraggable/g)).toHaveLength(1)
  })

  it('客户端不保存权威顺序，不保留胜负分类入口', () => {
    expect(store).not.toMatch(/localStorage|sessionStorage|indexedDB/)
    expect(view).not.toMatch(/localStorage|sessionStorage|indexedDB/)
    const template = view.slice(0, view.indexOf('<style scoped>'))
    expect(template).not.toMatch(/fenLeiJinXingZhong|fenLeiShengLi|fenLeiShiBai|zanWuShengLi|zanWuShiBai/)
    expect(template).not.toContain('zhanJiPaiXu')
  })

  it('分类组件不硬编码自然语言，名称只来自服务端 category.name', () => {
    const template = component.slice(0, component.indexOf('<script setup lang="ts">'))
    expect(template).not.toMatch(/[\u3400-\u9fff]/)
    expect(template).toContain('{{ fenLei.name }}')
    expect(component).toContain('v-if="!fenLei.is_default"')
    expect(component).toContain("huoQuFanYi('zhanJi', 'shanChu')")
  })

  it('请求体严格使用 camelCase，删除版本严格使用查询参数', () => {
    expect(api).toContain("{ mingCheng, expectedVersion }")
    expect(api).toContain('{ targetCategoryId, expectedVersion }')
    expect(api).toContain('{ recordIds, expectedVersion }')
    expect(api).toContain('{ params: { expectedVersion } }')
    const shanChuDiaoYong = /http\.delete<[\s\S]*?>\(`\/战绩\/分类\/\$\{fenLeiId\}`, \{ params: \{ expectedVersion \} \}\)/.test(api)
    expect(shanChuDiaoYong).toBe(true)
  })
})
