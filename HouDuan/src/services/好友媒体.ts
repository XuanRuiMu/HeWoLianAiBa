import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { LEI_BIE_DAO_XIAO_XI_LEI_XING, SHEN_HE_FU_WU_BU_KE_YONG_JIAN, type MeiTiLeiBie } from '../config/媒体配置'
import { shenHeTuPianAnQuan } from './DeepSeek视觉审核'
import { yanZhengUUID } from '../utils/验证'

function meiTiBuKeYong(): { he_fa: boolean; ti_shi: string } {
  return { he_fa: false, ti_shi: huoQuFanYi('liaoTian', 'meiTiBuCunZai') }
}

export async function yanZhengHaoYouMeiTiGuiShu(
  meiTiId: string,
  yongHuId: string,
  leiXing: string,
): Promise<{ he_fa: boolean; ti_shi: string }> {
  if (!yanZhengUUID(meiTiId)) {
    return { he_fa: false, ti_shi: huoQuFanYi('liaoTian', 'meiTiBiXuXianChuanShu') }
  }
  const chaXun = await 数据库.query(
    `SELECT "上传者ID", "SHA256", "MIME", "类别" FROM "媒体文件" WHERE "ID" = $1 LIMIT 1`,
    [meiTiId],
  )
  if (chaXun.rows.length === 0) return meiTiBuKeYong()
  const hang = chaXun.rows[0]
  if (String(hang.上传者ID) !== yongHuId) return meiTiBuKeYong()
  const leiBie = String(hang.类别 ?? '')
  if (LEI_BIE_DAO_XIAO_XI_LEI_XING[leiBie as MeiTiLeiBie] !== leiXing) return meiTiBuKeYong()
  return { he_fa: true, ti_shi: '' }
}

export async function shenHeHaoYouMeiTi(
  meiTiId: string,
): Promise<{ wei_gui: boolean; lei_xing: string; li_you: string }> {
  const chaXun = await 数据库.query(
    `SELECT "SHA256", "MIME", "类别" FROM "媒体文件" WHERE "ID" = $1 LIMIT 1`,
    [meiTiId],
  )
  if (chaXun.rows.length === 0) {
    return { wei_gui: true, lei_xing: '媒体不存在', li_you: '媒体不存在' }
  }
  const leiBie = String(chaXun.rows[0].类别 || '')
  const mime = String(chaXun.rows[0].MIME || '')
  const shiTuPian = leiBie === 'tupian' || leiBie === 'biaoqingshu' || mime.startsWith('image/')
  if (!shiTuPian) return { wei_gui: false, lei_xing: '', li_you: '' }
  const { huoQuBenDiLuJing } = await import('./媒体存储')
  const luJing = huoQuBenDiLuJing(String(chaXun.rows[0].SHA256 || ''))
  if (!luJing) return { wei_gui: true, lei_xing: SHEN_HE_FU_WU_BU_KE_YONG_JIAN, li_you: huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu') }
  const jieGuo = await shenHeTuPianAnQuan(luJing)
  return { wei_gui: jieGuo.wei_gui, lei_xing: jieGuo.lei_xing || '', li_you: jieGuo.li_you || '' }
}
