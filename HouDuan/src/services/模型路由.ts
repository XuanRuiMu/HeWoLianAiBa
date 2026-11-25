import { zhuCeZiDingYiLuYou, daiLiMoXingZhiHuanForTest } from '../utils/通用模型调用'
import { debug日志 } from '../utils/debug日志'

let yiZhuCe = false

function duQuHuanJing(ming: string): string {
  return (process.env[ming] || '').trim()
}

export function chuShiHuaMoXingLuYou(): void {
  if (yiZhuCe) return
  yiZhuCe = true
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
