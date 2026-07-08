import { 数据库 } from '../数据库'

export interface JiYiXinXi {
  id?: string
  yong_hu_id: string
  jiao_se_id: string
  guan_jian_ci?: string[]
  zhai_yao: string
  zhong_yao_du: number
  guo_qi_shi_jian?: Date | null
  shi_jian_lei_xing?: string
}

export async function xieRuJiYi(jiYi: JiYiXinXi): Promise<{ cheng_gong: boolean; id?: string }> {
  try {
    const jieGuo = await 数据库.query(
      `INSERT INTO "记忆" (
        "用户ID", "角色ID", "关键词", "摘要", "重要度", "过期时间", "事件类型"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING "ID"`,
      [
        jiYi.yong_hu_id,
        jiYi.jiao_se_id,
        jiYi.guan_jian_ci || [],
        jiYi.zhai_yao,
        jiYi.zhong_yao_du,
        jiYi.guo_qi_shi_jian || null,
        jiYi.shi_jian_lei_xing || null,
      ],
    )

    return { cheng_gong: true, id: String(jieGuo.rows[0].ID) }
  } catch (cuoWu) {
    console.error('写入记忆失败', cuoWu)
    return { cheng_gong: false }
  }
}

export async function huoQuJiYiLieBiao(
  yong_hu_id: string,
  jiao_se_id: string,
  xian_zhi: number = 20,
): Promise<JiYiXinXi[]> {
  const jieGuo = await 数据库.query(
    `SELECT * FROM "记忆"
     WHERE "用户ID" = $1 AND "角色ID" = $2
     ORDER BY "重要度" DESC, "创建时间" DESC
     LIMIT $3`,
    [yong_hu_id, jiao_se_id, xian_zhi],
  )

  return jieGuo.rows.map((row) => ({
    id: String(row.ID),
    yong_hu_id: String(row.用户ID),
    jiao_se_id: String(row.角色ID),
    guan_jian_ci: Array.isArray(row.关键词) ? row.关键词 : [],
    zhai_yao: String(row.摘要 || ''),
    zhong_yao_du: Number(row.重要度 || 0),
    guo_qi_shi_jian: row.过期时间 ? new Date(String(row.过期时间)) : null,
    shi_jian_lei_xing: row.事件类型 ? String(row.事件类型) : undefined,
  }))
}
