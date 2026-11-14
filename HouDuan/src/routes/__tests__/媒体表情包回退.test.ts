import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const chaXunMock = vi.hoisted(() => vi.fn())

const chaAnSha256Mock = vi.hoisted(() => vi.fn())

const chaAnDuanMingMock = vi.hoisted(() => vi.fn())

vi.mock('../../数据库', () => ({
  数据库: { query: (...canShu: unknown[]) => chaXunMock(...canShu) },
}))

vi.mock('../../redis', () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
  },
}))

vi.mock('../../services/表情包库', async () => {
  const shiJi = await vi.importActual<typeof import('../../services/表情包库')>('../../services/表情包库')
  return {
    ...shiJi,
    chaAnSha256: (...canShu: unknown[]) => chaAnSha256Mock(...canShu),
    chaAnDuanMing: (...canShu: unknown[]) => chaAnDuanMingMock(...canShu),
  }
})

import luYou from '../媒体'
import { shengChengQianMingURL } from '../../services/媒体存储'

const SHA = 'b'.repeat(64)
const YongHu = '6ef2a94a-67be-4e9b-9c93-f0a2c9df6f21'

const linShiMuLuLieBiao: string[] = []

function chuangJianYingYong() {
  const yingYong = express()
  yingYong.use((qingQiu, _xiangYing, xiaYiBu) => {
    qingQiu.url = decodeURI(qingQiu.url)
    xiaYiBu()
  })
  yingYong.use('/api/媒体', luYou)
  return yingYong
}

function chuangJianBiaoQingWenJian(neiRong: Buffer): string {
  const muLu = fs.mkdtempSync(path.join(os.tmpdir(), 'meiti-biaoqing-'))
  linShiMuLuLieBiao.push(muLu)
  const luJing = path.join(muLu, 'biaoqing.png')
  fs.writeFileSync(luJing, neiRong)
  return luJing
}

function biaoQingTiaoMu(wenJianLuJing: string) {
  return {
    duanMing: '笑哭',
    miaoShu: '',
    qingXuBiaoQian: '好笑',
    shiYongChangJing: '',
    qiYong: true,
    sha256: SHA,
    mime: 'image/png',
    ziJieShu: 8,
    wenJianMing: 'biaoqing.png',
    wenJianLuJing,
  }
}

beforeEach(() => {
  chaXunMock.mockReset()
  chaXunMock.mockImplementation(async () => ({ rows: [], rowCount: 0 }))
  chaAnSha256Mock.mockReset()
  chaAnSha256Mock.mockImplementation(async () => null)
  chaAnDuanMingMock.mockReset()
  chaAnDuanMingMock.mockImplementation(async () => null)
})

afterEach(() => {
  for (const muLu of linShiMuLuLieBiao.splice(0)) {
    fs.rmSync(muLu, { recursive: true, force: true })
  }
  vi.restoreAllMocks()
})

describe('媒体下载回退表情包库', () => {
  it('媒体表无行但表情包库命中时照常返回图片', async () => {
    const neiRong = Buffer.from('png-nei-rong')
    const wenJianLuJing = chuangJianBiaoQingWenJian(neiRong)
    chaAnSha256Mock.mockImplementation(async () => biaoQingTiaoMu(wenJianLuJing))
    const url = shengChengQianMingURL(SHA, YongHu)

    const xiangYing = await request(chuangJianYingYong()).get(encodeURI(url))

    expect(xiangYing.status).toBe(200)
    expect(String(xiangYing.headers['content-type'])).toContain('image/png')
    expect(xiangYing.headers['etag']).toBe(`"${SHA}"`)
    expect(String(xiangYing.headers['content-disposition'] ?? '')).not.toContain('attachment')
    expect(Number(xiangYing.headers['content-length'])).toBe(neiRong.length)
  })

  it('签名被篡改时一律拒绝，不进表情包库', async () => {
    const wenJianLuJing = chuangJianBiaoQingWenJian(Buffer.from('png-nei-rong'))
    chaAnSha256Mock.mockImplementation(async () => biaoQingTiaoMu(wenJianLuJing))
    const url = shengChengQianMingURL(SHA, YongHu).replace(/s=[0-9a-f]+/, `s=${'f'.repeat(64)}`)

    const xiangYing = await request(chuangJianYingYong()).get(encodeURI(url))

    expect(xiangYing.status).toBe(403)
    expect(chaAnSha256Mock).not.toHaveBeenCalled()
  })

  it('缺少签名参数时拒绝', async () => {
    const xiangYing = await request(chuangJianYingYong()).get(`/api/媒体/${SHA}`)
    expect(xiangYing.status).toBe(403)
  })

  it('表情包库也没有该 sha 时维持原鉴权失败', async () => {
    const url = shengChengQianMingURL(SHA, YongHu)
    const xiangYing = await request(chuangJianYingYong()).get(encodeURI(url))
    expect(xiangYing.status).toBe(403)
  })

  it('表情包库命中但文件已丢失时返回 404', async () => {
    chaAnSha256Mock.mockImplementation(async () =>
      biaoQingTiaoMu(path.join(os.tmpdir(), 'bu-cun-zai-de-biao-qing.png')),
    )
    const url = shengChengQianMingURL(SHA, YongHu)
    const xiangYing = await request(chuangJianYingYong()).get(encodeURI(url))
    expect(xiangYing.status).toBe(404)
  })

  it('按 sha 查不到时按短名二次回退成功', async () => {
    const neiRong = Buffer.from('png-duan-ming')
    const wenJianLuJing = chuangJianBiaoQingWenJian(neiRong)
    const erSha = 'c'.repeat(64)
    const meiTiId = '11111111-2222-4333-8444-555555555555'
    chaXunMock.mockImplementation(async (zhi: unknown, canShu: unknown[]) => {
      if (String(zhi).includes('FROM "媒体文件"') && canShu[0] === SHA) {
        return { rows: [{ ID: meiTiId }], rowCount: 1 }
      }
      if (String(zhi).includes('FROM "消息"')) {
        return { rows: [{ 内容: '[贴纸:笑哭]' }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })
    chaAnSha256Mock.mockImplementation(async () => null)
    chaAnDuanMingMock.mockImplementation(async (duanMing: unknown) =>
      duanMing === '笑哭'
        ? { ...biaoQingTiaoMu(wenJianLuJing), sha256: erSha, duanMing: '笑哭' }
        : null,
    )
    const url = shengChengQianMingURL(SHA, YongHu)

    const xiangYing = await request(chuangJianYingYong()).get(encodeURI(url))

    expect(xiangYing.status).toBe(200)
    expect(chaAnDuanMingMock).toHaveBeenCalledWith('笑哭')
    expect(xiangYing.headers['etag']).toBe(`"${erSha}"`)
    expect(Number(xiangYing.headers['content-length'])).toBe(neiRong.length)
  })

  it('二次回退也不命中时返回明确失效响应而非 404', async () => {
    const meiTiId = '11111111-2222-4333-8444-555555555555'
    chaXunMock.mockImplementation(async (zhi: unknown) => {
      const wenBen = String(zhi)
      if (wenBen.includes('FROM "消息"') && wenBen.includes('JOIN "媒体文件"')) {
        return { rows: [{ '?column?': 1 }], rowCount: 1 }
      }
      if (wenBen.includes('FROM "媒体文件"')) {
        return { rows: [{ ID: meiTiId }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })
    chaAnSha256Mock.mockImplementation(async () => null)
    chaAnDuanMingMock.mockImplementation(async () => null)
    const url = shengChengQianMingURL(SHA, YongHu)

    const xiangYing = await request(chuangJianYingYong()).get(encodeURI(url))

    expect(xiangYing.status).toBe(410)
    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(String(xiangYing.body.message)).not.toBe('')
  })
})
