import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { LEI_BIE_DAO_XIAO_XI_LEI_XING, SHEN_HE_FU_WU_BU_KE_YONG_JIAN, type MeiTiLeiBie } from '../config/媒体配置'
import { shenHeTuPianAnQuan } from './DeepSeek视觉审核'
import { yanZhengUUID } from '../utils/验证'

/** 「媒体不存在」与「非本人上传」共用同一条文案（同 routes/表情.ts 把归属写进 WHERE 的口径） */
function meiTiBuKeYong(): { he_fa: boolean; ti_shi: string } {
  return { he_fa: false, ti_shi: huoQuFanYi('liaoTian', 'meiTiBuCunZai') }
}

/**
 * 发送好友媒体消息前对「被引用的媒体行」的归属与完整性判定：
 * 上传者必须是发送者本人，且该媒体行的 类别 必须与消息 类型 对得上
 * （`LEI_BIE_DAO_XIAO_XI_LEI_XING` 是两侧唯一的对应表：tuPian↔tupian、wenJian↔wenjian…）。
 * 不校验第二条就会出现 `leiXing:'tuPian'` 挂一个 `wenjian` 类别的行，前端按图片渲染得到破图。
 * 三种拒绝（不存在 / 非本人 / 类型与类别不符）回同一个状态码与同一条文案，
 * 免得调用方拿响应差异去枚举 媒体文件 的 UUID。
 */
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
  if (!luJing) return { wei_gui: true, lei_xing: SHEN_HE_FU_WU_BU_KE_YONG_JIAN, li_you: huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu') }
  const jieGuo = await shenHeTuPianAnQuan(luJing)
  return { wei_gui: jieGuo.wei_gui, lei_xing: jieGuo.lei_xing || '', li_you: jieGuo.li_you || '' }
}
