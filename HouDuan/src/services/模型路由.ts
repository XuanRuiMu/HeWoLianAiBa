import { zhuCeZiDingYiLuYou, daiLiMoXingZhiHuanForTest, zhuCeMoXingChi } from '../utils/通用模型调用'
import { debug日志 } from '../utils/debug日志'

let yiZhuCe = false

function duQuHuanJing(ming: string): string {
  return (process.env[ming] || '').trim()
}

interface ChiChengYuan {
  moXing: string
  jiChu: string
  miYao: string
  quanZhong: number
}

function jieXiChi(qingDan: string, jiChu: string, miYao: string): ChiChengYuan[] {
  return qingDan
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x !== '')
    .map((xiang) => {
      const fen = xiang.split('|')
      const ming = (fen[0] || '').trim()
      if (ming === '') return null
      const quant = fen.length > 1 ? Number(fen[1]) : 1
      return {
        moXing: ming,
        jiChu,
        miYao,
        quanZhong: Number.isFinite(quant) && quant > 0 ? quant : 1,
      }
    })
    .filter((x): x is ChiChengYuan => x !== null)
}

export function chuShiHuaMoXingLuYou(): void {
  if (yiZhuCe) return
  yiZhuCe = true

  const chiQingDan = duQuHuanJing('AI_MO_XING_CHI')
  if (chiQingDan !== '') {
    const chiJiChu = duQuHuanJing('AI_MO_XING_CHI_JI_CHU')
    const chiMiYao = duQuHuanJing('AI_MO_XING_CHI_MI_YAO')
    if (chiJiChu === '' || chiMiYao === '') {
      debug日志.warn('模型路由', '模型池配置缺少地址或密钥，未启用', {
        xiang_qing: { you_qing_dan: true, you_ji_chu: chiJiChu !== '', you_mi_yao: chiMiYao !== '' },
      })
      return
    }
    const chengYuan = jieXiChi(chiQingDan, chiJiChu, chiMiYao)
    if (chengYuan.length === 0) {
      debug日志.warn('模型路由', '模型池清单解析后为空，未启用')
      return
    }
    zhuCeMoXingChi(chengYuan)
    debug日志.info('模型路由', '已启用多模型轮询池', {
      xiang_qing: {
        cheng_yuan_shu: chengYuan.length,
        mo_xing: chengYuan.map((x) => `${x.moXing}(w${x.quanZhong})`),
      },
    })
    return
  }

  const gongJu = duQuHuanJing('MO_XING_LU_YOU_GONG_JU')
  if (gongJu !== 'nex-kilo') {
    const beiJiChu = duQuHuanJing('DEEPSEEK_FALLBACK_BASE_URL')
    const beiMiYao = duQuHuanJing('DEEPSEEK_FALLBACK_API_KEY')
    const beiMoXing = duQuHuanJing('DEEPSEEK_FALLBACK_MODEL')
    if (beiJiChu !== '' && beiMiYao !== '' && beiMoXing !== '') {
      zhuCeZiDingYiLuYou(/responses$/, { miYao: beiMiYao, jiChu: beiJiChu, moXing: beiMoXing })
    }
    return
  }

  const zhuJiChu = duQuHuanJing('ZHU_MO_XING_JI_CHU_URL')
  const zhuMiYao = duQuHuanJing('ZHU_MO_XING_API_KEY')
  const zhuMoXing = duQuHuanJing('ZHU_MO_XING_NAME')
  const beiJiChu = duQuHuanJing('DEEPSEEK_FALLBACK_BASE_URL')
  const beiMiYao = duQuHuanJing('DEEPSEEK_FALLBACK_API_KEY')
  const beiMoXing = duQuHuanJing('DEEPSEEK_FALLBACK_MODEL')
  if (zhuJiChu === '' || zhuMiYao === '' || zhuMoXing === '' || beiJiChu === '' || beiMiYao === '' || beiMoXing === '') {
    debug日志.warn('模型路由', 'nex-kilo 路由配置不完整，未启用', {
      xiang_qing: {
        zhu_ji_chu: zhuJiChu !== '',
        zhu_mi_yao: zhuMiYao !== '',
        zhu_mo_xing: zhuMoXing !== '',
        bei_ji_chu: beiJiChu !== '',
        bei_mi_yao: beiMiYao !== '',
        bei_mo_xing: beiMoXing !== '',
      },
    })
    return
  }
  daiLiMoXingZhiHuanForTest({
    zhu: { jiChu: zhuJiChu, miYao: zhuMiYao, moXing: zhuMoXing },
    bei: { jiChu: beiJiChu, miYao: beiMiYao, moXing: beiMoXing },
  })
  debug日志.info('模型路由', '已启用 nex 主用（原生 responses）、kilo 备用的失败降级路由', {
    xiang_qing: { zhu: zhuMoXing, bei: beiMoXing },
  })
}
