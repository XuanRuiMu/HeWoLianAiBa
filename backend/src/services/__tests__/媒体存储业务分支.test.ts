import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac, randomUUID } from 'crypto'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { Readable } from 'stream'

const 假 = vi.hoisted(() => ({
  db: { query: vi.fn() },
  redis: { set: vi.fn(), get: vi.fn() },
  audit: { shenHeTuPianAnQuan: vi.fn() },
}))

vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('../DeepSeek视觉审核', () => ({ shenHeTuPianAnQuan: 假.audit.shenHeTuPianAnQuan }))

import { peiZhi } from '../../config'
import { MEI_TI_PEI_ZHI } from '../../config/媒体配置'
import { cheXiaoYongHuMeiTiQianMing, chongZhiMeiTiQianMingMiYao, huoQuBenDiLuJing, huoQuMeiTiQianMingMiYao, liuShiBaoCunMeiTi, shengChengMeiTiYinYong, shengChengQianMingURL, tiQuMeiTiSha, yanZhengMeiTiKeDu, yanZhengQianMing, zhiXingBingDuSaoMiao, zhongXinQianMingMeiTiURL } from '../媒体存储'

const 媒体根 = { ...MEI_TI_PEI_ZHI }
let 临时目录 = ''

beforeEach(() => {
  vi.clearAllMocks()
  临时目录 = ''
  chongZhiMeiTiQianMingMiYao()
  peiZhi.meiTiQianMingMiYao = 'a'.repeat(32)
  假.db.query.mockResolvedValue({ rows: [{ ID: '媒体ID' }] })
  假.redis.set.mockResolvedValue('OK')
  假.redis.get.mockResolvedValue(null)
  假.audit.shenHeTuPianAnQuan.mockResolvedValue({ wei_gui: false, lei_xing: '' })
})

afterEach(async () => {
  Object.assign(MEI_TI_PEI_ZHI, 媒体根)
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  if (临时目录) await rm(临时目录, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe('媒体存储业务分支', () => {
  it('签名密钥、引用提取、重签和本地路径覆盖格式边界', () => {
    expect(huoQuMeiTiQianMingMiYao()).toHaveLength(32)
    chongZhiMeiTiQianMingMiYao()
    expect(huoQuBenDiLuJing('bad')).toBeNull()
    const sha = 'a'.repeat(64)
    expect(huoQuBenDiLuJing(sha)).toContain(sha)
    expect(shengChengMeiTiYinYong(sha.toUpperCase())).toBe(`/api/媒体/${sha}`)
    expect(tiQuMeiTiSha(`/api/媒体/${sha}?x=1`)).toBe(sha)
    expect(tiQuMeiTiSha('普通文本')).toBeNull()
    expect(tiQuMeiTiSha(null)).toBeNull()
    expect(zhongXinQianMingMeiTiURL(null, '用户')).toBeNull()
    expect(zhongXinQianMingMeiTiURL('普通文本', '用户')).toBe('普通文本')
    expect(shengChengQianMingURL(sha)).toContain(`/api/媒体/${sha}`)
    expect(shengChengQianMingURL(sha, '用户', 100)).toContain('u=用户')
    expect(shengChengQianMingURL(sha, 200)).toContain('/api/媒体/')
  })

  it('签名校验覆盖无用户、用户绑定、过期、格式、吊销、权限和 Redis 异常', async () => {
    const sha = 'b'.repeat(64)
    const key = huoQuMeiTiQianMingMiYao()
    const e = String(Math.floor(Date.now() / 1000) + 1000)
    const s = createHmac('sha256', key).update(`${sha}:${e}`).digest('hex')
    await expect(yanZhengQianMing('bad', e, '', s)).resolves.toBe(false)
    await expect(yanZhengQianMing(sha, '', '', s)).resolves.toBe(false)
    await expect(yanZhengQianMing(sha, 'bad', '', s)).resolves.toBe(false)
    await expect(yanZhengQianMing(sha, '1', '', s)).resolves.toBe(false)
    await expect(yanZhengQianMing(sha, e, '', s)).resolves.toBe(true)
    const u = randomUUID()
    const t = String(Date.now())
    const bound = createHmac('sha256', key).update(`${sha}:${e}:${u}:${t}`).digest('hex')
    假.db.query.mockResolvedValue({ rows: [{}] })
    await expect(yanZhengQianMing(sha, e, u, bound, t)).resolves.toBe(true)
    await expect(yanZhengQianMing(sha, e, 'bad', bound, t)).resolves.toBe(false)
    await expect(yanZhengQianMing(sha, e, u, 'bad', t)).resolves.toBe(false)
    假.redis.get.mockResolvedValueOnce(String(Number(t) + 1))
    await expect(yanZhengQianMing(sha, e, u, bound, t)).resolves.toBe(false)
    假.db.query.mockResolvedValue({ rows: [] })
    await expect(yanZhengQianMing(sha, e, u, bound, t)).resolves.toBe(false)
    假.redis.get.mockRejectedValueOnce(new Error('redis'))
    await expect(yanZhengQianMing(sha, e, u, bound, t)).resolves.toBe(false)
    await expect(yanZhengMeiTiKeDu(sha, u)).resolves.toBe(false)
  })

  it('流式保存覆盖输入校验、音频成功、查毒开关和图片审核', async () => {
    await expect(liuShiBaoCunMeiTi(Readable.from('x'), 'a', 'audio/mpeg', 'bad', '用户')).rejects.toThrow()
    await expect(liuShiBaoCunMeiTi(Readable.from('x'), 'a', 'bad', 'yuyin', '用户')).rejects.toThrow()
    临时目录 = await mkdtemp(join(tmpdir(), 'fp02-media-'))
    Object.assign(MEI_TI_PEI_ZHI, { cunChuGenMuLu: 临时目录 })
    vi.stubEnv('BING_DU_SAO_MIAO_QI_YONG', 'false')
    const 结果 = await liuShiBaoCunMeiTi(Readable.from(Buffer.from('audio')), 'a.mp3', 'audio/mpeg', 'yuyin', '用户')
    expect(结果).toMatchObject({ mediaId: '媒体ID', leiBie: 'yuyin' })
    await zhiXingBingDuSaoMiao(join(临时目录, 'none'))
    假.audit.shenHeTuPianAnQuan.mockResolvedValueOnce({ wei_gui: true, lei_xing: '暴力威胁' })
    await expect(liuShiBaoCunMeiTi(Readable.from(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])), 'a.png', 'image/png', 'tupian', '用户')).rejects.toThrow()
  })
})
