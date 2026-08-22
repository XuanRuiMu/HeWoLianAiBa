import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { XIAO_XI_PEI_ZHI } from '../config/消息配置'
import { YUN_XU_XIAO_XI_LEI_XING } from '../config/媒体配置'
import { huoQuIo } from '../socket/io'
import { yanZhengUUID } from '../utils/验证'
import { jiLuXiaoXiCaoZuo, jiLuSocketShiJian } from '../utils/debug日志'
import { shengChengQianMingURL } from './媒体存储'

export interface XiaoXiXinXi {
  id: string
  hui_hua_id: string
  fa_song_zhe_id: string
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose' | 'xitong'
  nei_rong: string
  lei_xing: string
  shi_jian_chuo: number
  yi_du: boolean
  yi_che_hui?: boolean
  che_hui_shi_jian?: string | null
  yuan_shi_nei_rong?: string | null
  ke_hu_duan_xu_hao?: number | null
  mei_ti_id?: string | null
  mei_ti_url?: string | null
  mei_ti_lei_bie?: string | null
  mei_ti_shi_chang_hao_miao?: number | null
  mei_ti_yuan_shi_wen_jian_ming?: string | null
}

export interface FaSongXiaoXiCanShu {
  yong_hu_id: string
  jiao_se_id: string
  nei_rong: string
  ke_hu_duan_xu_hao?: number | null
  lei_xing?: string
  mei_ti_id?: string | null
}

export interface HuoQuXiaoXiCanShu {
  yong_hu_id: string
  jiao_se_id: string
  ye_ma?: number
  mei_ye_tiao_shu?: number
}

export interface CheHuiXiaoXiCanShu {
  yong_hu_id: string
  jiao_se_id: string
  xiao_xi_id: string
}

export interface CheHuiJiaoSeXiaoXiCanShu {
  yong_hu_id: string
  jiao_se_id: string
}

function tuiSongCheHuiShiJian(
  yong_hu_id: string,
  jiao_se_id: string,
  xiao_xi_id: string,
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose',
): void {
  const io = huoQuIo()
  if (io) {
    io.to(yong_hu_id).emit('消息撤回', {
      hui_hua_id: jiao_se_id,
      xiao_xi_id,
      fa_song_zhe_lei_xing,
    })
    jiLuSocketShiJian('消息撤回', yong_hu_id, {
      jiao_se_id,
      xiao_xi_id,
      fa_song_zhe_lei_xing,
    })
  }
}

function yingSheXiaoXi(row: Record<string, unknown>): XiaoXiXinXi {
  const faSongZheLeiXing =
    row.发送者 === 'yonghu' ? 'yonghu' : row.发送者 === 'jiaose' ? 'jiaose' : 'xitong'
  const faSongZheId =
    faSongZheLeiXing === 'yonghu'
      ? String(row.用户ID)
      : faSongZheLeiXing === 'jiaose'
        ? String(row.角色ID)
        : ''

  return {
    id: String(row.ID),
    hui_hua_id: String(row.角色ID),
    fa_song_zhe_id: faSongZheId,
    fa_song_zhe_lei_xing: faSongZheLeiXing,
    nei_rong: row.已撤回 ? huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi') : String(row.内容),
    lei_xing: String(row.类型 || 'wenben'),
    shi_jian_chuo: new Date(String(row.创建时间)).getTime(),
    yi_du: Boolean(row.已读),
    yi_che_hui: Boolean(row.已撤回),
    che_hui_shi_jian: row.撤回时间 ? String(row.撤回时间) : null,
    yuan_shi_nei_rong: row.已撤回 && row.原始内容 ? String(row.原始内容) : null,
    ke_hu_duan_xu_hao: row.客户端序号 != null ? Number(row.客户端序号) : null,
    mei_ti_id: row.媒体ID ? String(row.媒体ID) : null,
    mei_ti_url: row.媒体SHA256
      ? shengChengQianMingURL(String(row.媒体SHA256).toLowerCase())
      : null,
    mei_ti_lei_bie: row.媒体类别 ? String(row.媒体类别) : null,
    mei_ti_shi_chang_hao_miao: row.媒体时长毫秒 != null ? Number(row.媒体时长毫秒) : null,
    mei_ti_yuan_shi_wen_jian_ming: row.媒体原始文件名 ? String(row.媒体原始文件名) : null,
  }
}

export interface JiaoSeSuoYouZheXinXi {
  yong_hu_id: string | null
  shi_fou_feng_cun: boolean
  ke_ji_xu_liao_tian: boolean
  jie_ju_zhuang_tai: string
  shi_fou_zha_xing: boolean
}

export async function huoQuJiaoSeSuoYouZhe(
  jiao_se_id: string,
): Promise<JiaoSeSuoYouZheXinXi | null> {
  if (!yanZhengUUID(jiao_se_id)) {
    return null
  }

  const jieGuo = await 数据库.query(
    `SELECT "用户ID", "封存", "可继续聊天", "结局状态", "是否渣型" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [jiao_se_id],
  )
  if (jieGuo.rows.length === 0) return null
  return {
    yong_hu_id: jieGuo.rows[0].用户ID ? String(jieGuo.rows[0].用户ID) : null,
    shi_fou_feng_cun: Boolean(jieGuo.rows[0].封存),
    ke_ji_xu_liao_tian: Boolean(jieGuo.rows[0].可继续聊天),
    jie_ju_zhuang_tai: String(jieGuo.rows[0].结局状态 || ''),
    shi_fou_zha_xing: Boolean(jieGuo.rows[0].是否渣型),
  }
}

export async function anIdChaXiaoXi(xiao_xi_id: string): Promise<XiaoXiXinXi | null> {
  const jieGuo = await 数据库.query(
    `SELECT m.*, mf."SHA256" AS "媒体SHA256"
     FROM "消息" m LEFT JOIN "媒体文件" mf ON m."媒体ID" = mf."ID"
     WHERE m."ID" = $1 LIMIT 1`,
    [xiao_xi_id],
  )
  if (jieGuo.rows.length === 0) return null
  return yingSheXiaoXi(jieGuo.rows[0])
}

export async function huoQuXiaoXiLieBiao(
  canShu: HuoQuXiaoXiCanShu,
): Promise<{ lie_biao: XiaoXiXinXi[]; zong_shu: number }> {
  const yeMa = Math.max(1, canShu.ye_ma || 1)
  const meiYeTiaoShu = Math.min(999, Math.max(1, canShu.mei_ye_tiao_shu || 50))
  const pianYi = (yeMa - 1) * meiYeTiaoShu

  const zongShuJieGuo = await 数据库.query(
    `SELECT COUNT(*) as zong_shu FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
    [canShu.yong_hu_id, canShu.jiao_se_id],
  )
  const zongShu = parseInt(String(zongShuJieGuo.rows[0].zong_shu), 10)

  const jieGuo = await 数据库.query(
    `SELECT m.*, mf."SHA256" AS "媒体SHA256", mf."类别" AS "媒体类别",
            mf."时长毫秒" AS "媒体时长毫秒", mf."原始文件名" AS "媒体原始文件名"
     FROM "消息" m LEFT JOIN "媒体文件" mf ON m."媒体ID" = mf."ID"
     WHERE m."用户ID" = $1 AND m."角色ID" = $2
     ORDER BY COALESCE(m."客户端序号", 0) DESC, m."创建时间" DESC
     LIMIT $3 OFFSET $4`,
    [canShu.yong_hu_id, canShu.jiao_se_id, meiYeTiaoShu, pianYi],
  )

  return {
    lie_biao: jieGuo.rows.map(yingSheXiaoXi),
    zong_shu: zongShu,
  }
}

export async function chuangJianYongHuXiaoXi(
  canShu: FaSongXiaoXiCanShu,
): Promise<{ cheng_gong: boolean; xiao_xi?: XiaoXiXinXi; ti_shi?: string; zhuang_tai_ma?: number }> {
  const leiXing = canShu.lei_xing ?? 'wenben'
  if (!YUN_XU_XIAO_XI_LEI_XING.includes(leiXing)) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'xiaoXiLeiXingFeiFa'), zhuang_tai_ma: 400 }
  }
  const shiMeiTi = leiXing !== 'wenben'

  if (shiMeiTi && !canShu.mei_ti_id) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'meiTiBiXuXianChuanShu'), zhuang_tai_ma: 400 }
  }

  // 媒体消息文本内容存空字符串，长度/非空校验仅针对文本消息
  const qingLiNeiRong = shiMeiTi ? '' : canShu.nei_rong.trim()
  if (!shiMeiTi && !qingLiNeiRong) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'xiaoXiNeiRongWeiKong'), zhuang_tai_ma: 400 }
  }
  if (!shiMeiTi && qingLiNeiRong.length > 500) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'), zhuang_tai_ma: 400 }
  }

  const jiaoSe = await huoQuJiaoSeSuoYouZhe(canShu.jiao_se_id)
  if (!jiaoSe) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'jiaoSeBuCunZai'), zhuang_tai_ma: 404 }
  }
  if (jiaoSe.yong_hu_id !== canShu.yong_hu_id) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'wuQuanXian'), zhuang_tai_ma: 403 }
  }

  if (jiaoSe.shi_fou_feng_cun && !jiaoSe.ke_ji_xu_liao_tian) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'youXiYiJieShu'), zhuang_tai_ma: 400 }
  }

  if (shiMeiTi) {
    const meiTiChaXun = await 数据库.query(
      `SELECT "上传者ID" FROM "媒体文件" WHERE "ID" = $1 LIMIT 1`,
      [canShu.mei_ti_id],
    )
    if (meiTiChaXun.rows.length === 0) {
      return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'meiTiBuCunZai'), zhuang_tai_ma: 400 }
    }
    if (String(meiTiChaXun.rows[0].上传者ID) !== canShu.yong_hu_id) {
      return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'meiTiWuQuanXian'), zhuang_tai_ma: 400 }
    }
  }

  const jieGuo = await 数据库.query(
    `WITH xin AS (
       INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读", "客户端序号", "媒体ID")
       VALUES ($1, $2, $3, 'yonghu', $4, true, $5, $6)
       RETURNING *
     )
     SELECT xin.*, mf."SHA256" AS "媒体SHA256"
     FROM xin LEFT JOIN "媒体文件" mf ON xin."媒体ID" = mf."ID"`,
    [canShu.yong_hu_id, canShu.jiao_se_id, qingLiNeiRong, leiXing, canShu.ke_hu_duan_xu_hao ?? null, canShu.mei_ti_id ?? null],
  )

  const xiaoXi = yingSheXiaoXi(jieGuo.rows[0])
  jiLuXiaoXiCaoZuo('用户消息发送', canShu.yong_hu_id, canShu.jiao_se_id, 'yonghu', { xiao_xi_id: xiaoXi.id })
  return { cheng_gong: true, xiao_xi: xiaoXi }
}

function jiLuCheHuiCaoZuo(
  caoZuo: string,
  yong_hu_id: string,
  jiao_se_id: string,
  xiao_xi_id: string,
): void {
  jiLuXiaoXiCaoZuo(caoZuo, yong_hu_id, jiao_se_id, 'yonghu', { xiao_xi_id })
}

export async function cheHuiYongHuXiaoXi(
  canShu: CheHuiXiaoXiCanShu,
): Promise<{ cheng_gong: boolean; xiao_xi?: XiaoXiXinXi; ti_shi?: string; zhuang_tai_ma?: number }> {
  const jiaoSe = await huoQuJiaoSeSuoYouZhe(canShu.jiao_se_id)
  if (!jiaoSe) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'jiaoSeBuCunZai'), zhuang_tai_ma: 404 }
  }
  if (jiaoSe.yong_hu_id !== canShu.yong_hu_id) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'wuQuanXian'), zhuang_tai_ma: 403 }
  }

  const xiaoXiJieGuo = await 数据库.query(
    `SELECT * FROM "消息" WHERE "ID" = $1 AND "用户ID" = $2 AND "角色ID" = $3 AND "发送者" = 'yonghu' LIMIT 1`,
    [canShu.xiao_xi_id, canShu.yong_hu_id, canShu.jiao_se_id],
  )
  if (xiaoXiJieGuo.rows.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai'), zhuang_tai_ma: 404 }
  }

  const xiaoXi = xiaoXiJieGuo.rows[0]
  const chuangJianShiJian = new Date(String(xiaoXi.创建时间)).getTime()
  if (Date.now() - chuangJianShiJian > XIAO_XI_PEI_ZHI.cheHuiShiXian) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'cheHuiShiBai'), zhuang_tai_ma: 400 }
  }
  if (xiaoXi.已撤回) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'cheHuiShiBai'), zhuang_tai_ma: 400 }
  }

  const gengXinJieGuo = await 数据库.query(
    `WITH upd AS (
       UPDATE "消息" SET "已撤回" = true, "撤回时间" = NOW(), "原始内容" = "内容"
       WHERE "ID" = $1
       RETURNING *
     )
     SELECT upd.*, mf."SHA256" AS "媒体SHA256"
     FROM upd LEFT JOIN "媒体文件" mf ON upd."媒体ID" = mf."ID"`,
    [canShu.xiao_xi_id],
  )

  tuiSongCheHuiShiJian(canShu.yong_hu_id, canShu.jiao_se_id, canShu.xiao_xi_id, 'yonghu')
  jiLuCheHuiCaoZuo('用户消息撤回', canShu.yong_hu_id, canShu.jiao_se_id, canShu.xiao_xi_id)

  return { cheng_gong: true, xiao_xi: yingSheXiaoXi(gengXinJieGuo.rows[0]) }
}

export async function cheHuiJiaoSeXiaoXi(
  canShu: CheHuiJiaoSeXiaoXiCanShu,
): Promise<{ cheng_gong: boolean; xiao_xi?: XiaoXiXinXi; ti_shi?: string; zhuang_tai_ma?: number }> {
  const xiaoXiJieGuo = await 数据库.query(
    `SELECT * FROM "消息"
     WHERE "用户ID" = $1 AND "角色ID" = $2 AND "发送者" = 'jiaose' AND "已撤回" = false
     ORDER BY COALESCE("客户端序号", 0) DESC, "创建时间" DESC
     LIMIT 1`,
    [canShu.yong_hu_id, canShu.jiao_se_id],
  )
  if (xiaoXiJieGuo.rows.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai') }
  }

  const xiaoXi = xiaoXiJieGuo.rows[0]
  const chuangJianShiJian = new Date(String(xiaoXi.创建时间)).getTime()
  if (Date.now() - chuangJianShiJian > XIAO_XI_PEI_ZHI.cheHuiShiXian) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'cheHuiShiBai') }
  }

  const gengXinJieGuo = await 数据库.query(
    `WITH upd AS (
       UPDATE "消息" SET "已撤回" = true, "撤回时间" = NOW(), "原始内容" = "内容"
       WHERE "ID" = $1
       RETURNING *
     )
     SELECT upd.*, mf."SHA256" AS "媒体SHA256"
     FROM upd LEFT JOIN "媒体文件" mf ON upd."媒体ID" = mf."ID"`,
    [xiaoXi.ID],
  )

  const cheHuiXiaoXi = yingSheXiaoXi(gengXinJieGuo.rows[0])
  tuiSongCheHuiShiJian(canShu.yong_hu_id, canShu.jiao_se_id, cheHuiXiaoXi.id, 'jiaose')
  jiLuXiaoXiCaoZuo('角色消息撤回', canShu.yong_hu_id, canShu.jiao_se_id, 'jiaose', { xiao_xi_id: cheHuiXiaoXi.id })

  return { cheng_gong: true, xiao_xi: cheHuiXiaoXi }
}

export async function biaoJiSuoYouWeiDu(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<void> {
  await 数据库.query(
    `UPDATE "消息" SET "已读" = true WHERE "用户ID" = $1 AND "角色ID" = $2 AND "已读" = false`,
    [yong_hu_id, jiao_se_id],
  )
}
