import { 数据库 } from '../数据库'
import type {
  AIJiaoSeXinXi,
  DuiHuaLiShiXiang,
} from '../types'
import type { XiaoXiXinXi } from './消息'

export interface BaoCunJiaoSeXiaoXiCanShu {
  yong_hu_id: string
  jiao_se_id: string
  nei_rong: string
}

function jieXiJSONZiDuan(zhi: unknown): unknown {
  if (typeof zhi === 'string') {
    try {
      return JSON.parse(zhi)
    } catch {
      return zhi
    }
  }
  return zhi
}

function anQuanZiFuChuan(zhi: unknown): string {
  if (zhi === null || zhi === undefined) return ''
  return String(zhi)
}

function anQuanZiFuChuanShuZu(zhi: unknown): string[] {
  if (Array.isArray(zhi)) return zhi.map((x) => String(x))
  return []
}

function zhuanHuanXingBie(zhi: unknown): 'nan' | 'nv' {
  return zhi === '女' ? 'nv' : 'nan'
}

export async function huoQuJiaoSeIELeiXing(
  jiao_se_id: string,
): Promise<'I' | 'E' | null> {
  const jieGuo = await 数据库.query(
    `SELECT "IE类型" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [jiao_se_id],
  )
  if (jieGuo.rows.length === 0) return null
  const ie = String(jieGuo.rows[0].IE类型 || 'I')
  return ie === 'E' ? 'E' : 'I'
}

export async function huoQuAIJiaoSeXinXi(
  jiao_se_id: string,
): Promise<AIJiaoSeXinXi | null> {
  const jieGuo = await 数据库.query(
    `SELECT * FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [jiao_se_id],
  )
  if (jieGuo.rows.length === 0) return null

  const row = jieGuo.rows[0]
  const kaiChangBai = anQuanZiFuChuanShuZu(jieXiJSONZiDuan(row.开场白))
  const shiJieXinXi = jieXiJSONZiDuan(row.世界信息)
  const xingBie = zhuanHuanXingBie(row.性别)
  const mbtiLeiXing = anQuanZiFuChuan(row.MBTI || row.预设类型 || 'INTJ')
  const ieLeiXing = String(row.IE类型 || mbtiLeiXing.charAt(0) || 'I') as 'I' | 'E'
  const reShenLeiXing = String(row.热身类型 || '慢热') as '慢热' | '快热'
  const nianLing = Number(row.年龄 || 20)
  const mingZi = anQuanZiFuChuan(row.名字 || row.真实姓名)
  const weiXinMing = anQuanZiFuChuan(row.微信昵称 || row.名字)

  const beiJingGuShi = anQuanZiFuChuan(row.背景故事)
  const xiHuanDeLeiXing = anQuanZiFuChuan(row.喜欢的类型)
  const jiaTingBeiJing = anQuanZiFuChuan(row.家庭背景)
  const qingGanJingLi = anQuanZiFuChuan(row.情感经历)

  return {
    id: jiao_se_id,
    ming_zi: mingZi,
    wei_xin_ming: weiXinMing,
    xing_bie: xingBie,
    mbti_lei_xing: mbtiLeiXing,
    ie_lei_xing: ieLeiXing,
    re_shen_lei_xing: reShenLeiXing,
    nian_ling: Number.isNaN(nianLing) ? 20 : nianLing,
    shen_fen: '',
    wai_mao: anQuanZiFuChuan(row.外貌),
    xing_ge: anQuanZiFuChuan(row.性格),
    bei_jing_gu_shi: beiJingGuShi,
    xi_hao: anQuanZiFuChuanShuZu(row.爱好),
    yan_yu_feng_ge: anQuanZiFuChuan(row.言语风格),
    xing_wei_te_dian: '',
    tou_xiang: anQuanZiFuChuan(row.头像),
    xi_huan_de_lei_xing: xiHuanDeLeiXing,
    jia_ting_bei_jing: jiaTingBeiJing,
    qing_gan_jing_li: qingGanJingLi,
    shi_fou_zha_xing: Boolean(row.是否渣型),
    zha_fa_miao_shu: row.是否渣型 ? anQuanZiFuChuan(row.渣法描述) : undefined,
    hua_shu: row.是否渣型 ? anQuanZiFuChuanShuZu(row.话术) : undefined,
    bao_lu_fang_shi: row.是否渣型 ? anQuanZiFuChuan(row.暴露方式) : undefined,
    shi_po_xian_suo: row.是否渣型 ? anQuanZiFuChuanShuZu(row.识破线索) : undefined,
    kai_chang_bai: kaiChangBai.length > 0 ? kaiChangBai : ['你好'],
    shi_jie_xin_xi: typeof shiJieXinXi === 'object' && shiJieXinXi !== null
      ? (shiJieXinXi as Record<string, unknown>)
      : {},
    ba_da_mo_kuai: {
      ji_ben_xin_xi: `${mingZi}，${xingBie === 'nv' ? '女' : '男'}，${nianLing}岁`,
      wai_mao: anQuanZiFuChuan(row.外貌),
      xing_ge: anQuanZiFuChuan(row.性格),
      bei_jing: beiJingGuShi,
      yan_yu: anQuanZiFuChuan(row.言语风格),
      xing_wei: '',
      guan_xi: `喜欢的类型：${xiHuanDeLeiXing}`,
      xi_tong_ti_shi: '',
    },
  }
}

export async function huoQuZuiJinDuiHuaLiShi(
  yong_hu_id: string,
  jiao_se_id: string,
  shu_liang: number = 20,
): Promise<DuiHuaLiShiXiang[]> {
  const jieGuo = await 数据库.query(
    `SELECT * FROM "消息"
     WHERE "用户ID" = $1 AND "角色ID" = $2
     ORDER BY "创建时间" DESC
     LIMIT $3`,
    [yong_hu_id, jiao_se_id, shu_liang],
  )

  return jieGuo.rows.reverse().map((row): DuiHuaLiShiXiang => {
    const faSongZheLeiXing =
      row.发送者 === 'yonghu'
        ? 'yonghu'
        : row.发送者 === 'jiaose'
          ? 'jiaose'
          : 'xitong'
    const shiJian = new Date(String(row.创建时间))
    const shi = String(shiJian.getHours()).padStart(2, '0')
    const fen = String(shiJian.getMinutes()).padStart(2, '0')

    return {
      fa_song_zhe_lei_xing: faSongZheLeiXing,
      fa_song_zhe_ming:
        faSongZheLeiXing === 'jiaose'
          ? anQuanZiFuChuan(row.角色名 || row.微信昵称 || '对方')
          : '对方',
      nei_rong: String(row.内容 || ''),
      shi_jian: `${shi}:${fen}`,
      yi_che_hui: Boolean(row.已撤回),
      yuan_shi_nei_rong: row.原始内容 ? String(row.原始内容) : null,
    }
  })
}

export async function baoCunJiaoSeXiaoXi(
  canShu: BaoCunJiaoSeXiaoXiCanShu,
): Promise<XiaoXiXinXi> {
  const jieGuo = await 数据库.query(
    `INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读")
     VALUES ($1, $2, $3, 'jiaose', 'wenben', true)
     RETURNING *`,
    [canShu.yong_hu_id, canShu.jiao_se_id, canShu.nei_rong],
  )

  const row = jieGuo.rows[0]
  const faSongZheLeiXing = 'jiaose'

  return {
    id: String(row.ID),
    hui_hua_id: canShu.jiao_se_id,
    fa_song_zhe_id: canShu.jiao_se_id,
    fa_song_zhe_lei_xing: faSongZheLeiXing,
    nei_rong: String(row.内容),
    lei_xing: String(row.类型 || 'wenben'),
    shi_jian_chuo: new Date(String(row.创建时间)).getTime(),
    yi_du: Boolean(row.已读),
    yi_che_hui: Boolean(row.已撤回),
    che_hui_shi_jian: row.撤回时间 ? String(row.撤回时间) : null,
    yuan_shi_nei_rong: null,
  }
}
