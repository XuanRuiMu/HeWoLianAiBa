import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { HAO_GAN_DU_PEI_ZHI } from './好感度配置'

function duQu(ming: string, moRen: string = ''): string {
  const wenJianLuJing = process.env[`${ming}_FILE`]
  if (wenJianLuJing) {
    try {
      return fs.readFileSync(wenJianLuJing, 'utf8').trim() || moRen
    } catch {
      // fall through to env
    }
  }
  const zhi = process.env[ming]
  return zhi === undefined ? moRen : zhi
}

function duQuBuEr(ming: string, moRen: boolean): boolean {
  const zhi = (process.env[ming] || '').trim().toLowerCase()
  if (zhi === '') return moRen
  return zhi === '1' || zhi === 'true' || zhi === 'yes' || zhi === 'on'
}

function duQuZhengShu(ming: string, moRen: number, zuiXiao: number, zuiDa: number): number {
  const yuan = parseInt(duQu(ming, ''), 10)
  if (!Number.isFinite(yuan)) return moRen
  return Math.max(zuiXiao, Math.min(zuiDa, yuan))
}

export interface DuoMoTaiPeiZhi {
  yuYinLiJieQiYong: boolean
  guiJiLiuDongJiChuUrl: string
  guiJiLiuDongYuYinMoXing: string
  shiPinLiJieQiYong: boolean
  tuXiangShengChengQiYong: boolean
  tuXiangShengChengJiChuUrl: string
  tuXiangShengChengMoXing: string
  shiPinShengChengQiYong: boolean
  shiPinShengChengJiChuUrl: string
  shiPinShengChengMoXing: string
  meiRiShengChengShangXian: number
  qingQiuChaoShiHaoMiao: number
  shengTuTiShiCiZuiDaZiFu: number
  shiPinTiShiCiZuiDaZiFu: number
  zhuDongShengTuZuiDiZongFen: number
  zhuDongShengTuGaiLv: number
  zhuDongShengTuRiShangXian: number
}

export function huoQuDuoMoTaiPeiZhi(): DuoMoTaiPeiZhi {
  return {
    yuYinLiJieQiYong: duQuBuEr('YU_YIN_LI_JIE_QI_YONG', false),
    guiJiLiuDongJiChuUrl: duQu('GUI_JI_LIU_DONG_JI_CHU_URL', 'https://api.siliconflow.cn/v1'),
    guiJiLiuDongYuYinMoXing: duQu('GUI_JI_LIU_DONG_YU_YIN_MO_XING', ''),
    shiPinLiJieQiYong: duQuBuEr('SHI_PIN_LI_JIE_QI_YONG', false),
    tuXiangShengChengQiYong: duQuBuEr('TU_XIANG_SHENG_CHENG_QI_YONG', false),
    tuXiangShengChengJiChuUrl: duQu('TU_XIANG_SHENG_CHENG_JI_CHU_URL', 'https://api.siliconflow.cn/v1'),
    tuXiangShengChengMoXing: duQu('TU_XIANG_SHENG_CHENG_MO_XING', ''),
    shiPinShengChengQiYong: duQuBuEr('SHI_PIN_SHENG_CHENG_QI_YONG', false),
    shiPinShengChengJiChuUrl: duQu('SHI_PIN_SHENG_CHENG_JI_CHU_URL', 'https://api.siliconflow.cn/v1'),
    shiPinShengChengMoXing: duQu('SHI_PIN_SHENG_CHENG_MO_XING', ''),
    meiRiShengChengShangXian: duQuZhengShu('MEI_RI_SHENG_CHENG_SHANG_XIAN', 10, 0, 1000),
    qingQiuChaoShiHaoMiao: duQuZhengShu('DUO_MO_TAI_QING_QIU_CHAO_SHI_HAO_MIAO', 8000, 1000, 60000),
    shengTuTiShiCiZuiDaZiFu: duQuZhengShu('SHENG_TU_TI_SHI_CI_ZUI_DA_ZI_FU', 200, 10, 500),
    shiPinTiShiCiZuiDaZiFu: duQuZhengShu('SHI_PIN_TI_SHI_CI_ZUI_DA_ZI_FU', 200, 10, 500),
    zhuDongShengTuZuiDiZongFen: duQuZhengShu(
      'ZHU_DONG_SHENG_TU_ZUI_DI_ZONG_FEN',
      HAO_GAN_DU_PEI_ZHI.jieDuan.aiMei.xiaXian,
      0,
      1000,
    ),
    zhuDongShengTuGaiLv: Math.max(0, Math.min(1, Number(duQu('ZHU_DONG_SHENG_TU_GAI_LV', '0.08')) || 0)),
    zhuDongShengTuRiShangXian: duQuZhengShu('ZHU_DONG_SHENG_TU_RI_SHANG_XIAN', 3, 0, 100),
  }
}

export function huoQuGuiJiLiuDongMiYao(): string {
  return duQu('GUI_JI_LIU_DONG_API_MI_YAO', '')
}

export function huoQuTuXiangShengChengMiYao(): string {
  return duQu('TU_XIANG_SHENG_CHENG_API_MI_YAO', '')
}

export function huoQuShiPinShengChengMiYao(): string {
  return duQu('SHI_PIN_SHENG_CHENG_API_MI_YAO', '')
}

export interface DuoMoTaiQianDuanShiTu {
  yuYinLiJieQiYong: boolean
  shiPinLiJieQiYong: boolean
  tuXiangShengChengQiYong: boolean
  shiPinShengChengQiYong: boolean
  meiRiShengChengShangXian: number
}

export function huoQuDuoMoTaiQianDuanShiTu(): DuoMoTaiQianDuanShiTu {
  const peiZhi = huoQuDuoMoTaiPeiZhi()
  return {
    yuYinLiJieQiYong: peiZhi.yuYinLiJieQiYong && huoQuGuiJiLiuDongMiYao().trim() !== '' && peiZhi.guiJiLiuDongYuYinMoXing.trim() !== '',
    shiPinLiJieQiYong: peiZhi.shiPinLiJieQiYong,
    tuXiangShengChengQiYong: peiZhi.tuXiangShengChengQiYong && huoQuTuXiangShengChengMiYao().trim() !== '' && peiZhi.tuXiangShengChengMoXing.trim() !== '',
    shiPinShengChengQiYong: peiZhi.shiPinShengChengQiYong && huoQuShiPinShengChengMiYao().trim() !== '' && peiZhi.shiPinShengChengMoXing.trim() !== '',
    meiRiShengChengShangXian: peiZhi.meiRiShengChengShangXian,
  }
}

export function chongZaiDuoMoTaiHuanJing(): string[] {
  const envLuJing = path.join(__dirname, '../../.env')
  const jieGuo = dotenv.config({ path: envLuJing, override: true })
  if (jieGuo.error) return []
  return Object.keys(jieGuo.parsed || {})
}
