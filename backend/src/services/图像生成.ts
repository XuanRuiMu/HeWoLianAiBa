import { debug日志 } from '../utils/debug日志'
import { huoQuFanYi } from '../config/translations'
import { huoQuDuoMoTaiPeiZhi, huoQuTuXiangShengChengMiYao } from '../config/多模态配置'
import { redis } from '../redis'

export interface ShengTuJieGuo {
  cheng_gong: boolean
  tuPianZiJie?: Buffer
  mime?: string
  ti_shi?: string
}

type ShengTuMock = ((canShu: { tiShiCi: string; yongHuId: string }) => Promise<ShengTuJieGuo>) | null

let shengTuMock: ShengTuMock = null

export function sheZhiShengTuMock(fn: ShengTuMock): void {
  shengTuMock = fn
}

const peiENeiCun = new Map<string, { count: number; resetTime: number }>()

function huoQuRiQi(): string {
  return new Date().toISOString().slice(0, 10)
}

function qingXiTiShiCi(tiShiCi: unknown, shangXian: number): string {
  if (typeof tiShiCi !== 'string') return ''
  return tiShiCi.trim().slice(0, shangXian)
}

export function yanZhengShengTuTiShiCi(tiShiCi: unknown): { heFa: boolean; qingXiHou: string; ti_shi?: string } {
  const peiZhi = huoQuDuoMoTaiPeiZhi()
  const qingXiHou = qingXiTiShiCi(tiShiCi, peiZhi.shengTuTiShiCiZuiDaZiFu)
  if (!qingXiHou) return { heFa: false, qingXiHou: '', ti_shi: huoQuFanYi('liaoTian', 'xiaoXiNeiRongWeiKong') }
  return { heFa: true, qingXiHou }
}

export async function jianChaShengTuPeiE(yongHuId: string): Promise<{ yunXu: boolean }> {
  const peiZhi = huoQuDuoMoTaiPeiZhi()
  const jian = `sheng_cheng_ji_fei:${yongHuId}:${huoQuRiQi()}:tuxiang`
  try {
    const yiYong = await redis.incr(jian)
    if (yiYong === 1) await redis.expire(jian, 2 * 24 * 60 * 60)
    return { yunXu: yiYong <= peiZhi.meiRiShengChengShangXian }
  } catch {
    const xianZai = Date.now()
    for (const [k, v] of peiENeiCun) {
      if (xianZai > v.resetTime) peiENeiCun.delete(k)
    }
    const jiLu = peiENeiCun.get(jian)
    if (!jiLu) {
      peiENeiCun.set(jian, { count: 1, resetTime: xianZai + 24 * 60 * 60 * 1000 })
      return { yunXu: 1 <= peiZhi.meiRiShengChengShangXian }
    }
    jiLu.count += 1
    return { yunXu: jiLu.count <= peiZhi.meiRiShengChengShangXian }
  }
}

/** YH-062 失败回补：下载/生成失败不扣配额 */
export async function huiTuiShengTuPeiE(yongHuId: string): Promise<void> {
  const jian = `sheng_cheng_ji_fei:${yongHuId}:${huoQuRiQi()}:tuxiang`
  try {
    await redis.decr(jian)
  } catch {
    const jiLu = peiENeiCun.get(jian)
    if (jiLu && jiLu.count > 0) jiLu.count -= 1
  }
}

export async function shengChengTuXiang(canShu: { tiShiCi: string; yongHuId: string }): Promise<ShengTuJieGuo> {
  if (shengTuMock) return shengTuMock(canShu)
  const yanZheng = yanZhengShengTuTiShiCi(canShu.tiShiCi)
  if (!yanZheng.heFa) return { cheng_gong: false, ti_shi: yanZheng.ti_shi || huoQuFanYi('liaoTian', 'xiaoXiNeiRongWeiKong') }
  const peiZhi = huoQuDuoMoTaiPeiZhi()
  const miYao = huoQuTuXiangShengChengMiYao()
  if (!peiZhi.tuXiangShengChengQiYong || miYao.trim() === '' || peiZhi.tuXiangShengChengMoXing.trim() === '') {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'duoMoTaiFuWuBuKeYong') }
  }
  const peiE = await jianChaShengTuPeiE(canShu.yongHuId)
  if (!peiE.yunXu) return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'shengTuPeiEYongJin') }
  const jiChu = peiZhi.tuXiangShengChengJiChuUrl.replace(/\/$/, '')
  const kongZhi = new AbortController()
  const dingShi = setTimeout(() => kongZhi.abort(), peiZhi.qingQiuChaoShiHaoMiao)
  try {
    const xiangYing = await fetch(`${jiChu}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${miYao}` },
      body: JSON.stringify({ model: peiZhi.tuXiangShengChengMoXing, prompt: yanZheng.qingXiHou }),
      signal: kongZhi.signal,
    })
    if (!xiangYing.ok) {
      debug日志.warn('图像生成', '生图服务返回非成功状态，已降级', { xiang_qing: { zhuang_tai_ma: xiangYing.status, ti_shi_ci_chang: yanZheng.qingXiHou.length } })
      return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'shengTuShiBai') }
    }
    const shuJu = (await xiangYing.json()) as Record<string, unknown>
    const b64 =
      (shuJu['b64_json'] as string) ||
      (((shuJu['data'] as Array<Record<string, unknown>>)?.[0]?.['b64_json']) as string) ||
      ''
    if (b64) return { cheng_gong: true, tuPianZiJie: Buffer.from(b64, 'base64'), mime: 'image/png' }
    const tuURL =
      (((shuJu['images'] as Array<Record<string, unknown>>)?.[0]?.['url']) as string) ||
      (((shuJu['data'] as Array<Record<string, unknown>>)?.[0]?.['url']) as string) ||
      ''
  if (!tuURL) {
    await huiTuiShengTuPeiE(canShu.yongHuId)
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'shengTuShiBai') }
  }
  clearTimeout(dingShi)
  // YH-015+YH-062 流式落盘+失败不扣配额：SSRF收敛下载，失败回补配额
  const { yanZhengYuanChengURL, liuShiXiaZaiYuanChengWenJian } = await import('../utils/远端拉取')
  const urlHeFa = await yanZhengYuanChengURL(tuURL)
  if (!urlHeFa.he_fa) {
    await huiTuiShengTuPeiE(canShu.yongHuId)
    return { cheng_gong: false, ti_shi: urlHeFa.ti_shi }
  }
  const linShiLuJing = `${require('os').tmpdir()}/shengtu-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`
  const xiaZai = await liuShiXiaZaiYuanChengWenJian(tuURL, linShiLuJing)
  if (!xiaZai.cheng_gong) {
    await huiTuiShengTuPeiE(canShu.yongHuId)
    return { cheng_gong: false, ti_shi: xiaZai.ti_shi || huoQuFanYi('liaoTian', 'shengTuShiBai') }
  }
  try {
    const tuPianZiJie = await require('fs').promises.readFile(linShiLuJing)
    if (!tuPianZiJie.length) {
      await huiTuiShengTuPeiE(canShu.yongHuId)
      return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'shengTuShiBai') }
    }
    return { cheng_gong: true, tuPianZiJie, mime: xiaZai.mime.startsWith('image/') ? xiaZai.mime : 'image/png' }
  } finally {
    await require('fs').promises.unlink(linShiLuJing).catch(() => undefined)
  }
  } catch (cuoWu) {
    debug日志.warn('图像生成', '生图调用失败，已降级', { xiang_qing: { cuo_wu: String(cuoWu), ti_shi_ci_chang: yanZheng.qingXiHou.length } })
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'shengTuShiBai') }
  } finally {
    clearTimeout(dingShi)
  }
}
