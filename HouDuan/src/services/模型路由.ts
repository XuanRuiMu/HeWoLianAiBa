import { zhuCeMoXingChi, type ChiChengYuanPeiZhi } from '../utils/通用模型调用'
import { debug日志 } from '../utils/debug日志'

let yiZhuCe = false

function duQuHuanJing(ming: string): string {
  return (process.env[ming] || '').trim()
}

function jieXiChi(qingDan: string, jiChu: string, miYao: string): ChiChengYuanPeiZhi[] {
  const jieGuo: ChiChengYuanPeiZhi[] = []
  for (const xiang of qingDan.split(',')) {
    const qingLi = xiang.trim()
    if (qingLi === '') continue
    const fen = qingLi.split('|')
    const ming = (fen[0] || '').trim()
    if (ming === '') continue
    const quanZhong = fen.length > 1 ? Number(fen[1]) : 1
    jieGuo.push({
      moXing: ming,
      jiChu,
      miYao,
      quanZhong: Number.isFinite(quanZhong) && quanZhong > 0 ? quanZhong : 1,
    })
  }
  return jieGuo
}

export function chuShiHuaMoXingLuYou(): void {
  if (yiZhuCe) return
  yiZhuCe = true

  const chiQingDan = duQuHuanJing('MAGPIE_MO_XING_CHI')
  if (chiQingDan !== '') {
    const chiJiChu = duQuHuanJing('MAGPIE_MO_XING_CHI_JI_CHU')
    const chiMiYao = duQuHuanJing('MAGPIE_MO_XING_CHI_MI_YAO')
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
    debug日志.info('模型路由', '已启用对冲模型池', {
      xiang_qing: { cheng_yuan_shu: chengYuan.length, mo_xing: chengYuan.map((x) => `${x.moXing}(w${x.quanZhong})`) },
    })
    return
  }

  debug日志.info('模型路由', '未配置模型池，使用默认模型', {
    xiang_qing: { lai_yuan: 'moRenMoXing' },
  })
}
