import { describe, it, expect, afterAll, vi } from 'vitest'
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { Readable } from 'stream'

/**
 * FP-20 BlindSpot 取证：「把签名 URL 拉回来再上传一遍」会不会造成双份媒体存储。
 * 结论由真实文件系统写出，而不是从注释推定——物理层按 SHA256 内容寻址（同哈希只有一份字节），
 * 逻辑层每人每类别各一行且指向同一物理文件；第三条另钉住「存储层永不自行绕过审核入口」这一口径
 * （结论按哈希复用改在入口内部，L-47）。
 */
const 临时目录 = fs.mkdtempSync(path.join(os.tmpdir(), 'fp20-cas-'))
const 媒体行: Array<Record<string, unknown>> = []
const 审核 = { ciShu: 0 }

process.env.MEI_TI_CUN_CHU_GEN_MU_LU = 临时目录
process.env.BING_DU_SAO_MIAO_QI_YONG = 'false'

// 存储根目录改指临时目录：绝不允许本用例往项目 uploads/ 里写一个字节
vi.mock('../../config/媒体配置', async () => {
  const shiJi = await vi.importActual<typeof import('../../config/媒体配置')>(
    '../../config/媒体配置',
  )
  return {
    ...shiJi,
    MEI_TI_PEI_ZHI: { ...shiJi.MEI_TI_PEI_ZHI, cunChuGenMuLu: 临时目录 },
  }
})

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => {
      if (文本.includes('INSERT INTO "媒体文件"')) {
        媒体行.push({
          ID: `mei-${媒体行.length + 1}`,
          SHA256: 参数[0],
          类别: 参数[4],
          上传者ID: 参数[5],
        })
        return { rows: [{ ID: `mei-${媒体行.length}` }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    },
  },
}))

vi.mock('../../redis', () => ({
  redis: {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 1,
    incr: async () => 1,
    expire: async () => 1,
  },
}))

vi.mock('../DeepSeek视觉审核', () => ({
  shenHeTuPianAnQuan: async () => {
    审核.ciShu += 1
    return { wei_gui: false, lei_xing: '' }
  },
}))

function zaoPNG(ziJie: string): Buffer {
  const tou = Buffer.alloc(24)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(tou, 0)
  tou.writeUInt32BE(64, 16)
  tou.writeUInt32BE(64, 20)
  return Buffer.concat([tou, Buffer.from(ziJie, 'utf8')])
}

async function shangChuan(wenJian: Buffer, leiBie: string, yongHuId: string) {
  const module = await import('../../services/媒体存储')
  return module.liuShiBaoCunMeiTi(Readable.from(wenJian), 'tu.png', 'image/png', leiBie, yongHuId)
}

function wuLiWenJianShu(): number {
  let jiShu = 0
  for (const xiang of fs.readdirSync(临时目录)) {
    const muLu = path.join(临时目录, xiang)
    if (xiang === 'tmp' || !fs.statSync(muLu).isDirectory()) continue
    jiShu += fs.readdirSync(muLu).length
  }
  return jiShu
}

function wuLiLuJing(sha256: string): string {
  return path.join(临时目录, sha256.slice(0, 2), sha256)
}

afterAll(() => {
  fs.rmSync(临时目录, { recursive: true, force: true })
})

describe('FP-20 内容寻址存储：同一张图二次上传不产生第二份字节', () => {
  it('同一 SHA256 连传三次只落一个物理文件，逻辑行仍各一条', async () => {
    const tu = zaoPNG('fp20-tong-yi-zhang-tu')
    const zhenShiSha = crypto.createHash('sha256').update(tu).digest('hex')
    const ji = [
      await shangChuan(tu, 'tupian', 'yong-hu-jia'),
      await shangChuan(tu, 'biaoqingshu', 'yong-hu-jia'),
      await shangChuan(tu, 'biaoqingshu', 'yong-hu-yi'),
    ]
    expect(ji.map((jieGuo) => jieGuo.sha256)).toEqual([zhenShiSha, zhenShiSha, zhenShiSha])
    expect(new Set(ji.map((jieGuo) => jieGuo.mediaId)).size).toBe(3)
    expect(fs.readFileSync(wuLiLuJing(zhenShiSha))).toEqual(tu)
    expect(媒体行.filter((hang) => hang['SHA256'] === zhenShiSha)).toHaveLength(3)
  })

  it('不同内容各自落位，临时目录不残留（校验失败也不留半成品）', async () => {
    const { MeiTiCunChuCuoWu } = await import('../../services/媒体存储')
    const diErZhang = zaoPNG('fp20-bu-tong-tu')
    const jieGuo = await shangChuan(diErZhang, 'biaoqingshu', 'yong-hu-jia')
    expect(wuLiWenJianShu()).toBe(2)
    await expect(shangChuan(diErZhang, 'huai-lei-bie', 'yong-hu-jia')).rejects.toBeInstanceOf(
      MeiTiCunChuCuoWu,
    )
    expect(fs.readdirSync(path.join(临时目录, 'tmp'))).toHaveLength(0)
    expect(wuLiWenJianShu()).toBe(2)
  })

  it('存储层每次都调用审核入口（绕过即失守；按哈希复用发生在入口内部，见 L-47 用例）', async () => {
    const qiShi = 审核.ciShu
    const tu = zaoPNG('fp20-shen-he-dai-jia')
    await shangChuan(tu, 'tupian', 'yong-hu-jia')
    await shangChuan(tu, 'biaoqingshu', 'yong-hu-jia')
    expect(审核.ciShu - qiShi).toBe(2)
    expect(wuLiWenJianShu()).toBe(3)
  })
})
