import { debug日志 } from '../utils/debug日志'
import { huoQuFanYi } from '../config/translations'
import { huoQuDuoMoTaiPeiZhi, huoQuShiPinShengChengMiYao } from '../config/多模态配置'
import { redis } from '../redis'

const SHI_PIN_MIME_BAI_MING_DAN = ['video/mp4', 'video/quicktime', 'video/webm'] as const

const SHI_PIN_KUO_ZHAN_MING = ['.mp4', '.mov', '.webm', '.m4v'] as const

export function shiShiPinMIME(mime: unknown): boolean {
  return typeof mime === 'string' && (SHI_PIN_MIME_BAI_MING_DAN as readonly string[]).includes(mime.toLowerCase())
}

export function shiShiPinWenJian(mime?: string | null, wenJianMing?: string | null): boolean {
  if (mime && shiShiPinMIME(mime)) return true
  if (typeof wenJianMing === 'string') {
    const xiao = wenJianMing.toLowerCase()
    return SHI_PIN_KUO_ZHAN_MING.some((hou) => xiao.endsWith(hou))
  }
  return false
}

export interface ShiPinKeDuCanShu {
  wenJianMing?: string | null
  mime?: string | null
  shiChangHaoMiao?: number | null
  zhuanXieWenBen?: string | null
  huaMianMiaoShu?: string | null
  yiCheHui?: boolean
}

function qingXi(wenBen: string | null | undefined, shangXian: number): string {
  if (typeof wenBen !== 'string') return ''
  return wenBen.trim().slice(0, shangXian)
}

function geShiHuaMiao(miao?: number | null): string {
  if (miao == null || !Number.isFinite(Number(miao))) return ''
  const haoMiao = Number(miao)
  if (haoMiao <= 0) return ''
  return `，${Math.round(haoMiao / 1000)}秒`
}

export function gouJianShiPinKeDuWenBen(canShu: ShiPinKeDuCanShu): string {
  if (canShu.yiCheHui) return '[用户撤回了一个视频]'
  const ming = qingXi(canShu.wenJianMing, 100) || '视频'
  const shiChang = geShiHuaMiao(canShu.shiChangHaoMiao)
  const huaMian = qingXi(canShu.huaMianMiaoShu, 200)
  const zhuanXie = qingXi(canShu.zhuanXieWenBen, 500)
  const buFen: string[] = []
  if (huaMian) buFen.push(`画面：${huaMian}`)
  if (zhuanXie) buFen.push(`声音转写：${zhuanXie}`)
  if (buFen.length > 0) return `[视频：${ming}${shiChang}][${buFen.join('][')}]`
  return `[视频：${ming}${shiChang}]`
}

export interface ShengShiPinJieGuo {
  cheng_gong: boolean
  shiPinZiJie?: Buffer
  mime?: string
  ti_shi?: string
}

type ShengShiPinMock = ((canShu: { tiShiCi: string; yongHuId: string }) => Promise<ShengShiPinJieGuo>) | null

let shengShiPinMock: ShengShiPinMock = null

export function sheZhiShengShiPinMock(fn: ShengShiPinMock): void {
  shengShiPinMock = fn
}

export function yanZhengShiPinTiShiCi(tiShiCi: unknown): { heFa: boolean; qingXiHou: string; ti_shi?: string } {
  const peiZhi = huoQuDuoMoTaiPeiZhi()
  const qingXiHou = qingXi(typeof tiShiCi === 'string' ? tiShiCi : '', peiZhi.shiPinTiShiCiZuiDaZiFu)
  if (!qingXiHou) return { heFa: false, qingXiHou: '', ti_shi: huoQuFanYi('liaoTian', 'xiaoXiNeiRongWeiKong') }
  return { heFa: true, qingXiHou }
}

export async function jianChaShiPinPeiE(yongHuId: string): Promise<{ yunXu: boolean }> {
  const peiZhi = huoQuDuoMoTaiPeiZhi()
  const jian = `sheng_cheng_ji_fei:${yongHuId}:${new Date().toISOString().slice(0, 10)}:shipin`
  try {
    const yiYong = await redis.incr(jian)
    if (yiYong === 1) await redis.expire(jian, 2 * 24 * 60 * 60)
    return { yunXu: yiYong <= peiZhi.meiRiShengChengShangXian }
  } catch {
    return { yunXu: true }
  }
}

/** YH-062 失败回补：下载/生成失败不扣配额 */
export async function huiTuiShiPinPeiE(yongHuId: string): Promise<void> {
  const jian = `sheng_cheng_ji_fei:${yongHuId}:${new Date().toISOString().slice(0, 10)}:shipin`
  try {
    await redis.decr(jian)
  } catch {
    return
  }
}

export async function shengChengShiPin(canShu: { tiShiCi: string; yongHuId: string }): Promise<ShengShiPinJieGuo> {
  if (shengShiPinMock) return shengShiPinMock(canShu)
  const yanZheng = yanZhengShiPinTiShiCi(canShu.tiShiCi)
  if (!yanZheng.heFa) return { cheng_gong: false, ti_shi: yanZheng.ti_shi || huoQuFanYi('liaoTian', 'xiaoXiNeiRongWeiKong') }
  const peiZhi = huoQuDuoMoTaiPeiZhi()
  const miYao = huoQuShiPinShengChengMiYao()
  if (!peiZhi.shiPinShengChengQiYong || miYao.trim() === '' || peiZhi.shiPinShengChengMoXing.trim() === '') {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'duoMoTaiFuWuBuKeYong') }
  }
  const peiE = await jianChaShiPinPeiE(canShu.yongHuId)
  if (!peiE.yunXu) return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'shiPinPeiEYongJin') }
  const jiChu = peiZhi.shiPinShengChengJiChuUrl.replace(/\/$/, '')
  const danCiChaoShi = Math.max(peiZhi.qingQiuChaoShiHaoMiao, 60000)
  try {
    const tiJiaoKongZhi = new AbortController()
    const tiJiaoDingShi = setTimeout(() => tiJiaoKongZhi.abort(), danCiChaoShi)
    let tiJiao: Response
    try {
      tiJiao = await fetch(`${jiChu}/video/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${miYao}` },
        body: JSON.stringify({ model: peiZhi.shiPinShengChengMoXing, prompt: yanZheng.qingXiHou, image_size: '960x960' }),
        signal: tiJiaoKongZhi.signal,
      })
    } finally {
      clearTimeout(tiJiaoDingShi)
    }
    if (!tiJiao.ok) {
      debug日志.warn('视频生成', '生成视频服务返回非成功状态，已降级', { xiang_qing: { zhuang_tai_ma: tiJiao.status, ti_shi_ci_chang: yanZheng.qingXiHou.length } })
      await huiTuiShiPinPeiE(canShu.yongHuId)
      return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'shiPinShengChengShiBai') }
    }
    const tiJiaoShuJu = (await tiJiao.json()) as Record<string, unknown>
    const renWuId = typeof tiJiaoShuJu['requestId'] === 'string' ? String(tiJiaoShuJu['requestId']) : ''
    if (!renWuId) {
      await huiTuiShiPinPeiE(canShu.yongHuId)
      return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'shiPinShengChengShiBai') }
    }
    const jieZhi = Date.now() + 280000
    for (;;) {
      if (Date.now() > jieZhi) {
        await huiTuiShiPinPeiE(canShu.yongHuId)
        return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'shiPinShengChengShiBai') }
      }
      await new Promise((jieJue) => setTimeout(jieJue, 15000))
      const lunXunKongZhi = new AbortController()
      const lunXunDingShi = setTimeout(() => lunXunKongZhi.abort(), danCiChaoShi)
      let zhuangTaiXiangYing: Response
      try {
        zhuangTaiXiangYing = await fetch(`${jiChu}/video/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${miYao}` },
          body: JSON.stringify({ requestId: renWuId }),
          signal: lunXunKongZhi.signal,
        })
      } catch {
        clearTimeout(lunXunDingShi)
        continue
      }
      clearTimeout(lunXunDingShi)
      if (!zhuangTaiXiangYing.ok) continue
      const zhuangTaiShuJu = (await zhuangTaiXiangYing.json()) as Record<string, unknown>
      const zhuangTai = String(zhuangTaiShuJu['status'] || '')
      if (zhuangTai === 'Failed') {
        await huiTuiShiPinPeiE(canShu.yongHuId)
        return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'shiPinShengChengShiBai') }
      }
      if (zhuangTai !== 'Succeed') continue
      const jieGuo = (zhuangTaiShuJu['results'] as Record<string, unknown>) || {}
      const shiPinLieBiao = (jieGuo['videos'] as Array<Record<string, unknown>>) || []
      const shiPinURL = typeof shiPinLieBiao[0]?.['url'] === 'string' ? String(shiPinLieBiao[0]?.['url']) : ''
      if (!shiPinURL) {
        await huiTuiShiPinPeiE(canShu.yongHuId)
        return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'shiPinShengChengShiBai') }
      }
      // YH-015+YH-062 流式落盘+失败不扣配额
      const { yanZhengYuanChengURL, liuShiXiaZaiYuanChengWenJian } = await import('../utils/远端拉取')
      const urlHeFa = await yanZhengYuanChengURL(shiPinURL)
      if (!urlHeFa.he_fa) {
        await huiTuiShiPinPeiE(canShu.yongHuId)
        return { cheng_gong: false, ti_shi: urlHeFa.ti_shi }
      }
      const linShiLuJing = `${require('os').tmpdir()}/shengshipin-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`
      const xiaZai = await liuShiXiaZaiYuanChengWenJian(shiPinURL, linShiLuJing)
      if (!xiaZai.cheng_gong) {
        await huiTuiShiPinPeiE(canShu.yongHuId)
        return { cheng_gong: false, ti_shi: xiaZai.ti_shi || huoQuFanYi('liaoTian', 'shiPinShengChengShiBai') }
      }
      try {
        const shiPinZiJie = await require('fs').promises.readFile(linShiLuJing)
        if (!shiPinZiJie.length) {
          await huiTuiShiPinPeiE(canShu.yongHuId)
          return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'shiPinShengChengShiBai') }
        }
        return { cheng_gong: true, shiPinZiJie, mime: 'video/mp4' }
      } finally {
        await require('fs').promises.unlink(linShiLuJing).catch(() => undefined)
      }
    }
  } catch (cuoWu) {
    debug日志.warn('视频生成', '生成视频调用失败，已降级', { xiang_qing: { cuo_wu: String(cuoWu), ti_shi_ci_chang: yanZheng.qingXiHou.length } })
    await huiTuiShiPinPeiE(canShu.yongHuId)
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'shiPinShengChengShiBai') }
  }
}
