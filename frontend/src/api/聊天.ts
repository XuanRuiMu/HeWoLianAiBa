import http from './请求'
import { 请求性别或拒绝 } from '@/utils/性别'
import type {
  Xiaoxi,
  HuiHua,
  JunShiXinXi,
  JunShiZhiDaoJieGuo,
  JunShiZhiDaoFenDuan,
  JunShiZhiDaoZhuangTaiXinXi,
  JunShiJiLu,
  DangAnXiangQing,
  ShengChengJiaoSeJieGuo,
  Jiaose,
  FanKuiTiJiao,
  DuoMeiTiLeiXing,
} from '@/types'

export const DUO_MEI_TI_LEI_XING_SHANG_CHUAN_LEI_BIE: Record<DuoMeiTiLeiXing, ShangChuanLeiBie> = {
  tuPian: 'tupian',
  biaoQingBao: 'biaoqingshu',
  yuYin: 'yuyin',
  wenJian: 'wenjian',
}

export async function chuangJianHuiHua(jiaoSeId: string): Promise<HuiHua> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: HuiHua }>('/聊天/会话', {
    jiaoSeId,
  })
  return 响应.data.shu_ju
}

export async function huoQuHuiHuaLieBiao(): Promise<HuiHua[]> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: HuiHua[] }>('/聊天/会话')
  return 响应.data.shu_ju
}

export interface XiaoXiLieBiaoYouBiao {
  xu_hao: number | null
  shi_jian_chuo: number
  id: string
}

export interface XiaoXiLieBiaoJieGuo {
  lie_biao: Xiaoxi[]
  zong_shu: number
  hai_you_geng_duo?: boolean
}

export async function huoQuXiaoXi(
  huiHuaId: string,
  yeMa: number = 1,
  meiYeTiaoShu: number = 50,
  youBiao?: XiaoXiLieBiaoYouBiao,
): Promise<XiaoXiLieBiaoJieGuo> {
  const canShu: Record<string, number | string | null> = {
    ye_ma: yeMa,
    mei_ye_tiao_shu: meiYeTiaoShu,
  }
  // M6 keyset 游标：上滑加载更早消息时携带上一页末条定位，后端免 OFFSET 深分页
  if (youBiao) {
    canShu.ye_ma = 1
    if (youBiao.xu_hao != null) canShu.you_biao_xu_hao = youBiao.xu_hao
    canShu.you_biao_shi_jian_chuo = youBiao.shi_jian_chuo
    canShu.you_biao_id = youBiao.id
  }
  const 响应 = await http.get<{
    cheng_gong: boolean
    shu_ju: { lie_biao: Xiaoxi[]; zong_shu: number; hai_you_geng_duo?: boolean }
  }>(`/聊天/会话/${huiHuaId}/消息`, { params: canShu })
  const shuJu = 响应.data.shu_ju
  return {
    lie_biao: shuJu?.lie_biao || [],
    zong_shu: shuJu?.zong_shu || 0,
    hai_you_geng_duo: shuJu?.hai_you_geng_duo,
  }
}

export type ShangChuanLeiBie = 'tupian' | 'biaoqingshu' | 'yuyin' | 'wenjian'

export interface MeiTiShangChuanJieGuo {
  mediaId: string
  sha256: string
  mime: string
  daXiao: number
  leiBie: string
  yuanShiWenJianMing: string
  mei_ti_url: string | null
}

const MO_REN_SHANG_CHUAN_WEN_JIAN_MING: Record<ShangChuanLeiBie, string> = {
  tupian: 'tupian.jpg',
  biaoqingshu: 'biaoqingshu.png',
  yuyin: 'yuyin.webm',
  wenjian: 'wenjian',
}

// V6 顺手项：Blob 无文件名时按真实 mimeType 映射扩展名（iOS Safari 产出 audio/mp4）
// FP-21 起导出：好友媒体上传（api/社交.ts）与 AI 链路共用同一份推导，禁止第二份默认文件名表
export function anMimeTuiDaoWenJianMing(leiBie: ShangChuanLeiBie, mime: string): string {
  const moRen = MO_REN_SHANG_CHUAN_WEN_JIAN_MING[leiBie]
  if (leiBie !== 'yuyin') return moRen
  if (mime.includes('mp4')) return `yuyin-${Date.now()}.m4a`
  if (mime.includes('ogg')) return `yuyin-${Date.now()}.ogg`
  if (mime.includes('mpeg') || mime.includes('mp3')) return `yuyin-${Date.now()}.mp3`
  if (mime.includes('wav')) return `yuyin-${Date.now()}.wav`
  if (mime.includes('aac')) return `yuyin-${Date.now()}.aac`
  return `yuyin-${Date.now()}.webm`
}

export async function shangChuanMeiTi(
  huiHuaId: string,
  wenJian: File | Blob,
  leiBie: ShangChuanLeiBie,
): Promise<MeiTiShangChuanJieGuo> {
  const formData = new FormData()
  const wenJianMing =
    wenJian instanceof File && wenJian.name
      ? wenJian.name
      : anMimeTuiDaoWenJianMing(leiBie, wenJian.type || '')
  formData.append('file', wenJian, wenJianMing)
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: MeiTiShangChuanJieGuo }>(
    `/聊天/会话/${huiHuaId}/媒体`,
    formData,
    {
      params: { leiBie },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    },
  )
  return 响应.data.shu_ju
}

/**
 * FP-09b 投递契约：`miDengJian` 是客户端为这条消息生成的稳定 UUID（幂等键）。
 * 序号自 FP-09 起由服务端事务内权威分配，前端不再上报自增序号；重发同一条必须复用同一把键，
 * 服务端 `UNIQUE(用户ID,角色ID,幂等键)` 才能把网络抖动/重试的重放压成一条。
 * 键同时经 `Idempotency-Key` 头交给请求层，使这条 POST 落入「带幂等键才重试」的通道。
 */
export async function faSongXiaoXi(
  huiHuaId: string,
  neiRong: string,
  miDengJian?: string | null,
  leiXing?: string,
  meiTiId?: string | null,
): Promise<{ xiaoXi: Xiaoxi; shiMiJi: boolean; weiJiGanYu?: boolean; yuanZhuReXian?: string; ganYuTiShi?: string; chaoShiTiXingMiao?: number }> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: Xiaoxi & { shi_mi_ji?: boolean; wei_ji_gan_yu?: boolean; yuan_zhu_re_xian?: string; gan_yu_ti_shi?: string; chao_shi_ti_xing_miao?: number } }>(
    `/聊天/会话/${huiHuaId}/消息`,
    {
      neiRong,
      幂等键: miDengJian ?? null,
      leiXing: leiXing || 'wenben',
      meiTiId: meiTiId ?? null,
    },
    miDengJian ? ({ miDengJian } as unknown as Record<string, unknown>) : undefined,
  )
  const shuJu = 响应.data.shu_ju
  return {
    xiaoXi: shuJu,
    shiMiJi: shuJu.shi_mi_ji === true,
    weiJiGanYu: shuJu.wei_ji_gan_yu === true,
    yuanZhuReXian: shuJu.yuan_zhu_re_xian,
    ganYuTiShi: shuJu.gan_yu_ti_shi,
    chaoShiTiXingMiao: shuJu.chao_shi_ti_xing_miao,
  }
}

export async function cheHuiXiaoXi(huiHuaId: string, xiaoXiId: string): Promise<void> {
  await http.put(`/聊天/会话/${huiHuaId}/消息/${xiaoXiId}/撤回`)
}

export async function fanYiWenBen(
  neiRong: string,
  yuanYu: string = 'auto',
  muBiaoYu: string = 'zh',
): Promise<string> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: { fanYiWenBen: string } }>(
    '/聊天/翻译',
    { neiRong, yuanYu, muBiaoYu },
  )
  return 响应.data.shu_ju.fanYiWenBen
}

export async function zhuanXieYuYin(meiTiId: string): Promise<string | null> {
  try {
    const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: { zhuanXieWenBen: string } }>(
      '/聊天/语音/转写',
      { meiTiId },
    )
    return 响应.data.shu_ju.zhuanXieWenBen || null
  } catch {
    return null
  }
}

export async function biaoJiYiDu(huiHuaId: string): Promise<void> {
  await http.put(`/聊天/会话/${huiHuaId}/已读`)
}

export async function huoQuJunShiLieBiao(): Promise<JunShiXinXi[]> {
  const 响应 = await http.get<{
    cheng_gong: boolean
    shu_ju: { junShiLieBiao: JunShiXinXi[] }
  }>('/聊天/军师/列表')
  return 响应.data.shu_ju.junShiLieBiao
}

export async function qingQiuJunShiZhiDao(
  jiaoSeId: string,
  junShiId: string,
): Promise<JunShiZhiDaoJieGuo> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: JunShiZhiDaoJieGuo }>(
    '/聊天/军师',
    {
      jiaoSeId,
      junShiId,
    },
    {
      timeout: 120000,
    },
  )
  return 响应.data.shu_ju
}

export async function huoQuJunShiJiLu(jiaoSeId: string): Promise<JunShiJiLu[]> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: { jiLuLieBiao: JunShiJiLu[] } }>(
    `/聊天/军师/记录/${jiaoSeId}`,
  )
  return 响应.data.shu_ju.jiLuLieBiao
}

export async function huoQuJunShiZhiDaoZhuangTai(jiaoSeId: string): Promise<{
  zhuangTai: JunShiZhiDaoZhuangTaiXinXi | null
  keZaiCiZhiDao: boolean
  youLiaoTianJiLu: boolean
}> {
  const 响应 = await http.get<{
    cheng_gong: boolean
    shu_ju: {
      zhuangTai: JunShiZhiDaoZhuangTaiXinXi | null
      keZaiCiZhiDao: boolean
      youLiaoTianJiLu: boolean
    }
  }>(`/聊天/军师/状态/${jiaoSeId}`)
  return {
    zhuangTai: 响应.data.shu_ju.zhuangTai,
    keZaiCiZhiDao: 响应.data.shu_ju.keZaiCiZhiDao,
    youLiaoTianJiLu: 响应.data.shu_ju.youLiaoTianJiLu,
  }
}

export async function huoQuDangAnLieBiao(): Promise<DangAnXiangQing[]> {
  const 响应 = await http.get<{
    cheng_gong: boolean
    shu_ju: { dangAnLieBiao: DangAnXiangQing[] }
  }>('/战绩/列表')
  return 响应.data.shu_ju?.dangAnLieBiao || []
}

export async function huoQuDangAnXiangQing(dangAnId: string): Promise<DangAnXiangQing> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: DangAnXiangQing }>(
    `/战绩/详情/${dangAnId}`,
  )
  return 响应.data.shu_ju
}

export interface 心目中的TA请求参数 {
  weiXinMing?: string
  zhenShiMing?: string
  nianLing?: string
  tongYongTiShiCi?: string
}

function zuZhuangXinMuZhongDeTa(
  ziLiao?: 心目中的TA请求参数 | null,
): Record<string, string | number> | undefined {
  if (!ziLiao) return undefined
  const jieGuo: Record<string, string | number> = {}
  if (ziLiao.weiXinMing) jieGuo.wei_xin_ming = ziLiao.weiXinMing
  if (ziLiao.zhenShiMing) jieGuo.zhen_shi_ming = ziLiao.zhenShiMing
  if (ziLiao.nianLing !== undefined && ziLiao.nianLing !== null && String(ziLiao.nianLing).trim() !== '') {
    const shu = Number(String(ziLiao.nianLing).trim())
    if (Number.isFinite(shu)) jieGuo.nian_ling = Math.max(0, Math.min(100, Math.round(shu)))
  }
  if (ziLiao.tongYongTiShiCi) jieGuo.tong_yong_ti_shi_ci = ziLiao.tongYongTiShiCi
  return Object.keys(jieGuo).length > 0 ? jieGuo : undefined
}

export async function shengChengJiaoSe(
  目标性别: string,
  性格选择: string,
  允许渣型: boolean,
  是否随机性格?: boolean,
  用户性别?: string | null,
  心目中的TA?: 心目中的TA请求参数 | null,
): Promise<ShengChengJiaoSeJieGuo> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: ShengChengJiaoSeJieGuo }>(
    '/生成角色/MBTI生成',
    {
      // FP-13：出参性别一律过唯一解析入口归一为内部规范形态，识别不出即拒，
      // 不再用「非 male 即 nv」的三元把无法识别的写法静默算成女性
      性别: 请求性别或拒绝(目标性别),
      mbti类型: 性格选择,
      渣男渣女变体: 允许渣型,
      随机性格: 是否随机性格 || false,
      用户性别: 用户性别 ? 请求性别或拒绝(用户性别) : undefined,
      xinMuZhongDeTa: zuZhuangXinMuZhongDeTa(心目中的TA),
    },
    { timeout: 60000 },
  )
  return 响应.data.shu_ju
}

export async function queRenJiaoSe(
  xuanZhongJiaoSe: ShengChengJiaoSeJieGuo,
): Promise<ShengChengJiaoSeJieGuo> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: ShengChengJiaoSeJieGuo }>(
    '/生成角色/确认',
    { xuanZhongJiaoSe },
    { timeout: 60000 },
  )
  return 响应.data.shu_ju
}

export async function huoQuJiaoSeXiangQing(jiaoSeId: string): Promise<{
  jiao_se: Jiaose
  dang_an_zhuang_tai?: {
    jie_guo_lei_xing: string
    shi_fou_feng_cun: boolean
    you_xi_yi_jie_shu: boolean
    ke_ji_xu_liao_tian: boolean
  } | null
}> {
  const 响应 = await http.get<{
    cheng_gong: boolean
    shu_ju: {
      jiao_se: Jiaose
      dang_an_zhuang_tai?: {
        jie_guo_lei_xing: string
        shi_fou_feng_cun: boolean
        you_xi_yi_jie_shu: boolean
        ke_ji_xu_liao_tian: boolean
      } | null
    }
  }>(`/角色/详情/${jiaoSeId}`)
  return 响应.data.shu_ju
}

export interface 军师指导记录项 {
  shi_jian: string
  jiao_se_ming_zi: string
  jun_shi_ming_chen: string
  jian_yi: string
  jian_yi_fen_duan?: JunShiZhiDaoFenDuan | null
  dui_hua_zhai_yao: string
}

export interface 关键事件项 {
  shi_jian: string
  shi_jian_lei_xing: string
  miao_shu: string
}

export interface 复盘批注项 {
  xu_hao: number
  ping_lun: string
  qing_gan?: string
}

export interface 复盘响应 {
  fu_pan_nei_rong: string | null
  fu_pan_shi_jian_xian: 复盘时间线条目[]
  fu_pan_pi_zhu: 复盘批注项[] | null
  jun_shi_zhi_dao_ji_lu: 军师指导记录项[]
  guan_jian_shi_jian: 关键事件项[]
  jia_zai_zhong: boolean
}

export interface 复盘时间线条目 {
  shi_jian: string
  shi_jian_miao_shu: string
  yong_hu_xiao_xi: string
  ai_hui_fu: string
  ai_xin_li_huo_dong: string
}

// V8：签名 URL 过期后重签（后端校验会话与媒体归属）
export interface DuoMoTaiPeiZhi {
  yuYinLiJieQiYong: boolean
  shiPinLiJieQiYong: boolean
  tuXiangShengChengQiYong: boolean
  shiPinShengChengQiYong: boolean
  meiRiShengChengShangXian: number
}

export async function huoQuDuoMoTaiPeiZhi(): Promise<DuoMoTaiPeiZhi> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: DuoMoTaiPeiZhi }>('/聊天/多模态配置')
  return 响应.data.shu_ju
}

export async function qingQiuYuYinLiJie(
  huiHuaId: string,
  canShu: { zhuanXieWenBen?: string; yinPinShiJianMiaoShu?: string; shiChangHaoMiao?: number | null },
): Promise<string> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: { keDuWenBen: string } }>(
    `/聊天/会话/${huiHuaId}/语音理解`,
    canShu,
  )
  return 响应.data.shu_ju.keDuWenBen
}

export async function qingQiuShengTu(huiHuaId: string, tiShiCi: string): Promise<Xiaoxi> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: Xiaoxi }>(
    `/聊天/会话/${huiHuaId}/生图`,
    { tiShiCi },
    { timeout: 120000 },
  )
  return 响应.data.shu_ju
}

export async function qingQiuShengChengShiPin(huiHuaId: string, tiShiCi: string): Promise<Xiaoxi> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: Xiaoxi }>(
    `/聊天/会话/${huiHuaId}/生成视频`,
    { tiShiCi },
    { timeout: 300000 },
  )
  return 响应.data.shu_ju
}

export async function chongQianMeiTiURL(huiHuaId: string, meiTiId: string): Promise<string | null> {
  try {
    const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: { mei_ti_url: string } }>(
      `/聊天/会话/${huiHuaId}/媒体签名/${meiTiId}`,
    )
    return 响应.data.shu_ju.mei_ti_url || null
  } catch {
    return null
  }
}

export async function huoQuFuPan(dangAnId: string): Promise<复盘响应> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: 复盘响应 }>(`/战绩/复盘/${dangAnId}`)
  return 响应.data.shu_ju
}

export async function tiJiaoFanKui(canShu: FanKuiTiJiao): Promise<void> {
  await http.post('/反馈/提交', canShu)
}

export async function shanChuDangAn(dangAnId: string): Promise<{ cheng_gong: boolean }> {
  const 响应 = await http.delete<{ cheng_gong: boolean; shu_ju: { cheng_gong: boolean } }>(
    `/战绩/${dangAnId}`,
  )
  return 响应.data.shu_ju
}

export async function piLiangShanChuDangAn(dangAnIds: string[]): Promise<{
  cheng_gong: boolean
  shan_chu_ids: string[]
}> {
  const 响应 = await http.post<{
    cheng_gong: boolean
    shu_ju: { cheng_gong: boolean; shan_chu_ids: string[] }
  }>('/战绩/批量删除', { dangAnIds })
  return 响应.data.shu_ju
}
