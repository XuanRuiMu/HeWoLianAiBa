import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import type { Readable } from 'stream'
import { peiZhi } from '../config'
import { huoQuFanYi } from '../config/translations'
import { debug日志 } from '../utils/debug日志'

const NEI_WANG_ZHU_JI = [/^localhost$/i, /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^0\.0\.0\.0$/, /^169\.254\./, /^\[?(::1|::ffff:.*|::)\]?$/i]

function shiNeiWangZhuJi(hostname: string): boolean {
  return NEI_WANG_ZHU_JI.some((biaoDaShi) => biaoDaShi.test(hostname))
}

async function dnsJieXiQuanBuShiGongWang(hostname: string): Promise<boolean> {
  const { promises: dns } = await import('dns')
  try {
    const diZhiLieBiao = await dns.lookup(hostname, { all: true })
    if (diZhiLieBiao.length === 0) return false
    return diZhiLieBiao.every((xiang) => !shiNeiWangDiZhi(xiang.address))
  } catch {
    return false
  }
}

function shiNeiWangDiZhi(diZhi: string): boolean {
  const qingLi = diZhi.trim()
  if (/^127\./.test(qingLi) || qingLi === '::1' || qingLi === '::ffff:127.0.0.1') return true
  if (/^10\./.test(qingLi) || /^192\.168\./.test(qingLi)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(qingLi)) return true
  if (/^169\.254\./.test(qingLi) || /^0\.0\.0\.0$/.test(qingLi)) return true
  if (/^::ffff:(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(qingLi)) return true
  if (/^(fc|fd)[0-9a-f]{0,4}:/i.test(qingLi)) return true
  if (/^fe80:/i.test(qingLi)) return true
  return false
}

/** YH-015 服务端拉取SSRF收敛：https+域名白名单+拒内网+大小超时上限+流式落盘 */
export async function yanZhengYuanChengURL(url: string): Promise<{ he_fa: boolean; ti_shi: string; jieXi?: URL }> {
  let jieXi: URL
  try {
    jieXi = new URL(url)
  } catch {
    return { he_fa: false, ti_shi: huoQuFanYi('liaoTian', 'yuanChengLaQuBuHeFa') }
  }
  const peiZhiXiang = peiZhi.yuanChengLaQu
  if (!peiZhiXiang.yunXuXieYi.includes(jieXi.protocol as 'https:')) {
    return { he_fa: false, ti_shi: huoQuFanYi('liaoTian', 'yuanChengLaQuBuHeFa') }
  }
  if (jieXi.username || jieXi.password) {
    return { he_fa: false, ti_shi: huoQuFanYi('liaoTian', 'yuanChengLaQuBuHeFa') }
  }
  const hostname = jieXi.hostname
  if (shiNeiWangZhuJi(hostname)) {
    return { he_fa: false, ti_shi: huoQuFanYi('liaoTian', 'yuanChengLaQuBuHeFa') }
  }
  if (shiNeiWangDiZhi(hostname)) {
    return { he_fa: false, ti_shi: huoQuFanYi('liaoTian', 'yuanChengLaQuBuHeFa') }
  }
  if (peiZhiXiang.yuMingBaiMingDan.length > 0 && !peiZhiXiang.yuMingBaiMingDan.includes(hostname.toLowerCase())) {
    return { he_fa: false, ti_shi: huoQuFanYi('liaoTian', 'yuanChengLaQuBuHeFa') }
  }
  const dnsAnQuan = await dnsJieXiQuanBuShiGongWang(hostname)
  if (!dnsAnQuan) {
    return { he_fa: false, ti_shi: huoQuFanYi('liaoTian', 'yuanChengLaQuBuHeFa') }
  }
  return { he_fa: true, ti_shi: '', jieXi }
}

/** YH-015 流式落盘下载：边下边限大小，超限即删，失败不扣配额由调用方保证（先下载后占配额） */
export async function liuShiXiaZaiYuanChengWenJian(
  url: string,
  muBiaoLuJing: string,
): Promise<{ cheng_gong: boolean; zi_jie: number; mime: string; ti_shi?: string }> {
  const yanZheng = await yanZhengYuanChengURL(url)
  if (!yanZheng.he_fa) return { cheng_gong: false, zi_jie: 0, mime: '', ti_shi: yanZheng.ti_shi }
  const peiZhiXiang = peiZhi.yuanChengLaQu
  const kongZhi = new AbortController()
  const dingShi = setTimeout(() => kongZhi.abort(), peiZhiXiang.chaoShiHaoMiao)
  try {
    const xiangYing = await fetch(url, { signal: kongZhi.signal, redirect: 'error' })
    if (!xiangYing.ok || !xiangYing.body) {
      return { cheng_gong: false, zi_jie: 0, mime: '', ti_shi: huoQuFanYi('liaoTian', 'shengTuShiBai') }
    }
    const neiRongChangDu = Number(xiangYing.headers.get('content-length') || '0')
    if (neiRongChangDu > peiZhiXiang.zuiDaZiJie) {
      try { await (xiangYing.body as ReadableStream).cancel() } catch { return { cheng_gong: false, zi_jie: 0, mime: '', ti_shi: huoQuFanYi('liaoTian', 'meiTiGuoDa') } }
      return { cheng_gong: false, zi_jie: 0, mime: '', ti_shi: huoQuFanYi('liaoTian', 'meiTiGuoDa') }
    }
    await fs.promises.mkdir(path.dirname(muBiaoLuJing), { recursive: true })
    const xieLiu = fs.createWriteStream(muBiaoLuJing)
    let ziJieShu = 0
    let yiChaoXian = false
    const nodeLiu = (await import('stream')).Readable.fromWeb(xiangYing.body as never) as Readable
    const jiShuLiu = new (await import('stream')).Transform({
      transform(kuai: Buffer, _bianMa: BufferEncoding, huiDiao: (cuoWu: Error | null, shuJu?: Buffer) => void) {
        ziJieShu += kuai.length
        if (ziJieShu > peiZhiXiang.zuiDaZiJie) {
          yiChaoXian = true
          huiDiao(null)
          return
        }
        huiDiao(null, kuai)
      },
    })
    try {
      await pipeline(nodeLiu, jiShuLiu, xieLiu)
    } catch (cuoWu) {
      await fs.promises.unlink(muBiaoLuJing).catch(() => undefined)
      throw cuoWu
    }
    if (yiChaoXian) {
      await fs.promises.unlink(muBiaoLuJing).catch(() => undefined)
      return { cheng_gong: false, zi_jie: 0, mime: '', ti_shi: huoQuFanYi('liaoTian', 'meiTiGuoDa') }
    }
    const mime = (xiangYing.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    return { cheng_gong: true, zi_jie: ziJieShu, mime }
  } catch (cuoWu) {
    await fs.promises.unlink(muBiaoLuJing).catch(() => undefined)
    debug日志.warn('远端拉取', '服务端拉取失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return { cheng_gong: false, zi_jie: 0, mime: '', ti_shi: huoQuFanYi('liaoTian', 'shengTuShiBai') }
  } finally {
    clearTimeout(dingShi)
  }
}
