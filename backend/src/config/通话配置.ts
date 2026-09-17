function huoQuShuZhiHuanJingBianLiang(ming: string, moRen: number): number {
  const zhi = Number(process.env[ming])
  return Number.isFinite(zhi) && zhi > 0 ? zhi : moRen
}

function duQuMiYao(ming: string): string {
  const wenJianLuJing = process.env[`${ming}_FILE`]
  if (wenJianLuJing) {
    try {
      const fs = require('fs') as typeof import('fs')
      return fs.readFileSync(wenJianLuJing, 'utf8').trim()
    } catch {
    }
  }
  return (process.env[ming] || '').trim()
}

function duQuBuEr(ming: string, moRen: boolean): boolean {
  const zhi = (process.env[ming] || '').trim().toLowerCase()
  if (zhi === '') return moRen
  return zhi === '1' || zhi === 'true' || zhi === 'yes' || zhi === 'on'
}

export const TONG_HUA_PEI_ZHI = {
  zhenLingZuiXiaoHaoMiao: huoQuShuZhiHuanJingBianLiang('TONG_HUA_JIE_TING_ZUI_XIAO_HAO_MIAO', 2000),
  zhenLingZuiDaHaoMiao: huoQuShuZhiHuanJingBianLiang('TONG_HUA_JIE_TING_ZUI_DA_HAO_MIAO', 6000),
  yingJianShangXianMiao: huoQuShuZhiHuanJingBianLiang('TONG_HUA_YING_JIAN_SHANG_XIAN_MIAO', 600),
}

// FP-05 YH-037：通话实时链路已砍，仅保留语音视频大模型 provider 插槽配置；填 KEY 即用，TTS 合成经 socket 推 mediaId 照常
export const TONG_HUA_PROVIDER_PEI_ZHI = {
  yuYinProvider: (process.env['TONG_HUA_YU_YIN_PROVIDER'] || '').trim(),
  shiPinProvider: (process.env['TONG_HUA_SHI_PIN_PROVIDER'] || '').trim(),
  qiYong: duQuBuEr('TONG_HUA_PROVIDER_QI_YONG', false),
}

export function huoQuTongHuaYuYinMiYao(): string {
  return duQuMiYao('TONG_HUA_YU_YIN_API_MI_YAO')
}

export function huoQuTongHuaShiPinMiYao(): string {
  return duQuMiYao('TONG_HUA_SHI_PIN_API_MI_YAO')
}

export function shiTongHuaProviderKeYong(): boolean {
  if (!TONG_HUA_PROVIDER_PEI_ZHI.qiYong) return false
  if (!TONG_HUA_PROVIDER_PEI_ZHI.yuYinProvider && !TONG_HUA_PROVIDER_PEI_ZHI.shiPinProvider) return false
  return huoQuTongHuaYuYinMiYao() !== '' || huoQuTongHuaShiPinMiYao() !== ''
}
