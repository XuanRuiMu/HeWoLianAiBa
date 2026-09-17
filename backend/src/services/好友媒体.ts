import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { shenHeTuPianAnQuan } from './DeepSeek视觉审核'
import { yanZhengUUID } from '../utils/验证'

/** YH-013 复用AI链路归属+审核函数：好友媒体与AI聊天同一套不可用策略 */
export async function yanZhengHaoYouMeiTiGuiShu(
  meiTiId: string,
  yongHuId: string,
): Promise<{ he_fa: boolean; ti_shi: string }> {
  if (!yanZhengUUID(meiTiId)) {
    return { he_fa: false, ti_shi: huoQuFanYi('liaoTian', 'meiTiBiXuXianChuanShu') }
  }
  const chaXun = await 数据库.query(
    `SELECT "上传者ID", "SHA256", "MIME", "类别" FROM "媒体文件" WHERE "ID" = $1 LIMIT 1`,
    [meiTiId],
  )
  if (chaXun.rows.length === 0) {
    return { he_fa: false, ti_shi: huoQuFanYi('liaoTian', 'meiTiBuCunZai') }
  }
  if (String(chaXun.rows[0].上传者ID) !== yongHuId) {
    return { he_fa: false, ti_shi: huoQuFanYi('haoYou', 'meiTiGuiShuBuFu') }
  }
  return { he_fa: true, ti_shi: '' }
}

/** YH-013 纯媒体消息补审核：复用AI图片审核链路，不可用统一拦截 */
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
  if (!luJing) return { wei_gui: true, lei_xing: '审核服务不可用', li_you: huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu') }
  const jieGuo = await shenHeTuPianAnQuan(luJing)
  return { wei_gui: jieGuo.wei_gui, lei_xing: jieGuo.lei_xing || '', li_you: jieGuo.li_you || '' }
}
