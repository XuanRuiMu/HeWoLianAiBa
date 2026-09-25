import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/api/请求', () => ({ default: http }))

import {
  chuangJianZhanJiFenLei,
  gengMingZhanJiFenLei,
  huoQuDangAnLieBiao,
  huoQuZhanJiFenLeiLieBiao,
  paiXuFenLeiNeiZhanJi,
  shanChuZhanJiFenLei,
  yiDongDangAnDaoFenLei,
} from '@/api/聊天'

describe('战绩分类 API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('读取分类使用 GET /战绩/分类并返回服务端分类载荷', async () => {
    const shuJu = {
      moRenFenLeiId: 'default-id',
      fenLeiLieBiao: [
        { id: 'default-id', name: '默认分类', is_default: true, record_count: 2, version: 3 },
      ],
    }
    http.get.mockResolvedValueOnce({ data: { cheng_gong: true, shu_ju: shuJu } })

    await expect(huoQuZhanJiFenLeiLieBiao()).resolves.toEqual(shuJu)
    expect(http.get).toHaveBeenCalledWith('/战绩/分类')
  })

  it('创建分类提交 camelCase 名称', async () => {
    const fenLei = { id: 'new-id', name: '收藏夹', is_default: false, record_count: 0, version: 0 }
    http.post.mockResolvedValueOnce({ data: { cheng_gong: true, shu_ju: fenLei } })

    await expect(chuangJianZhanJiFenLei('收藏夹')).resolves.toEqual(fenLei)
    expect(http.post).toHaveBeenCalledWith('/战绩/分类', { mingCheng: '收藏夹' })
  })

  it('重命名分类提交名称与 expectedVersion', async () => {
    const fenLei = { id: 'category-id', name: '重要回忆', is_default: false, record_count: 1, version: 4 }
    http.put.mockResolvedValueOnce({ data: { cheng_gong: true, shu_ju: fenLei } })

    await expect(gengMingZhanJiFenLei('category-id', '重要回忆', 3)).resolves.toEqual(fenLei)
    expect(http.put).toHaveBeenCalledWith('/战绩/分类/category-id', {
      mingCheng: '重要回忆',
      expectedVersion: 3,
    })
  })

  it('按 categoryId 读取完整列表', async () => {
    http.get.mockResolvedValueOnce({ data: { cheng_gong: true, shu_ju: { dangAnLieBiao: [] } } })

    await huoQuDangAnLieBiao('category-id')

    expect(http.get).toHaveBeenCalledWith('/战绩/列表', { params: { categoryId: 'category-id' } })
  })

  it('不传 categoryId 时保持旧列表接口单参数调用', async () => {
    http.get.mockResolvedValueOnce({ data: { cheng_gong: true, shu_ju: { dangAnLieBiao: [] } } })

    await huoQuDangAnLieBiao()

    expect(http.get).toHaveBeenCalledWith('/战绩/列表')
  })

  it('移动记录提交来源、目标和来源版本', async () => {
    const jieGuo = {
      record_id: 'record-id',
      source_category_id: 'source-id',
      category_id: 'target-id',
      sort_order: 2,
      source_version: 4,
      target_version: 2,
    }
    http.put.mockResolvedValueOnce({ data: { cheng_gong: true, shu_ju: jieGuo } })

    await expect(yiDongDangAnDaoFenLei('source-id', 'record-id', 'target-id', 3)).resolves.toEqual(jieGuo)
    expect(http.put).toHaveBeenCalledWith('/战绩/分类/source-id/记录/record-id', {
      targetCategoryId: 'target-id',
      expectedVersion: 3,
    })
  })

  it('排序提交当前分类完整 recordIds 与 expectedVersion', async () => {
    const jieGuo = { category_id: 'category-id', record_ids: ['record-b', 'record-a'], version: 5 }
    http.put.mockResolvedValueOnce({ data: { cheng_gong: true, shu_ju: jieGuo } })

    await expect(paiXuFenLeiNeiZhanJi('category-id', ['record-b', 'record-a'], 4)).resolves.toEqual(jieGuo)
    expect(http.put).toHaveBeenCalledWith('/战绩/分类/category-id/排序', {
      recordIds: ['record-b', 'record-a'],
      expectedVersion: 4,
    })
  })

  it('删除分类把 expectedVersion 放在查询参数', async () => {
    const jieGuo = { deleted_id: 'category-id', fallback_category_id: 'default-id', moved_record_count: 3 }
    http.delete.mockResolvedValueOnce({ data: { cheng_gong: true, shu_ju: jieGuo } })

    await expect(shanChuZhanJiFenLei('category-id', 7)).resolves.toEqual(jieGuo)
    expect(http.delete).toHaveBeenCalledWith('/战绩/分类/category-id', {
      params: { expectedVersion: 7 },
    })
  })
})
