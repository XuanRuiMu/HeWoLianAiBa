




















































































































































































































































































































































































































































































































































































































































































































































































































             FROM "消息"
            WHERE "用户ID" = $1 AND "角色ID" = ANY($2::uuid[]) AND "发送者" IN ('yonghu', 'jiaose')
         ) fen_zu
        WHERE hang_hao <= $3
        ORDER BY "角色ID", "创建时间" DESC, "ID" DESC`,
      [yong_hu_id, jiaoSeIds, ZhanJiPeiZhi.zuiHouXiaoXiMeiJiaoSeTiaoShu],
    )
    for (const hang of xiaoXi.rows as Record<string, unknown>[]) {
      const jiaoSeId = String(hang.角色ID)
      const lieBiao = zuiHouAnJiaoSe.get(jiaoSeId)
      if (lieBiao && lieBiao.length >= ZhanJiPeiZhi.zuiHouXiaoXiMeiJiaoSeTiaoShu) continue
      const zhaiYao = zhaiYaoZuiHouXiaoXi(hang)
      if (!zhaiYao) continue
      const tiao: 战绩最后消息 = {
        shi_jian: String(hang.创建时间),
        fa_song_zhe: guiYiZuiHouFaSongZhe(hang.发送者),
        zhai_yao: zhaiYao,
      }
      if (lieBiao) lieBiao.unshift(tiao)
      else zuiHouAnJiaoSe.set(jiaoSeId, [tiao])
    }
  }

  return jieGuo.rows.map((shuJuHang) => {
    const jieGuoLeiXingYuan = 解析结局类型(shuJuHang.结果类型, Boolean(shuJuHang.是否封存))
    const chuangJianShiJian = String(shuJuHang.创建时间 || new Date().toISOString())
    const youXiJieShu = jieGuoLeiXingYuan !== 'jinxing_zhong'
    return {
      id: String(shuJuHang.ID),
      yong_hu_id: String(shuJuHang.用户ID),
      jiao_se_id: String(shuJuHang.角色ID),
      jiao_se_ming_zi: String(shuJuHang.微信昵称 || huoQuFanYi('zhanJi', 'weiZhiWeiXin')),
      shi_fou_zha_xing: youXiJieShu ? Boolean(shuJuHang.是否渣型) : undefined,
      tou_xiang_biao_ji:
        youXiJieShu && Boolean(shuJuHang.是否渣型)
          ? 'zha'
          : jieGuoLeiXingYuan === 'sheng_li_ai_qing'
            ? 'ai'
            : 'pu',
      jie_guo_lei_xing: 解析结局文案(
        jieGuoLeiXingYuan,
        归一角色性别(shuJuHang.性别),
        shuJuHang.结局文案 ?? null,
      ),
      jie_guo_lei_xing_yuan: jieGuoLeiXingYuan,
      shi_fou_feng_cun: Boolean(shuJuHang.是否封存),
      hao_gan_du_zong_fen: Number(shuJuHang.好感度总分 || 0),
      guan_xi_jie_duan: String(shuJuHang.关系阶段 || ''),
      liao_tian_tian_shu: Number(shuJuHang.聊天天数 || 0),
      xiao_xi_zong_shu: Number(shuJuHang.消息总数 || 0),
      chuang_jian_shi_jian: chuangJianShiJian,
      zui_hou_xiao_xi_shi_jian: shuJuHang.最后消息时间 ? String(shuJuHang.最后消息时间) : null,
      you_xi_jie_shu_shi_jian: youXiJieShu ? chuangJianShiJian : null,
      mbti_lei_xing:
        Boolean(shuJuHang.随机性格) && !youXiJieShu
          ? undefined
          : shuJuHang.MBTI
            ? String(shuJuHang.MBTI)
            : undefined,
      sui_ji_xing_ge: Boolean(shuJuHang.随机性格),
      mo_shi: shuJuHang.模式 === 'tiaozhan' ? 'tiaozhan' : 'putong',
      category_id: String(shuJuHang.分类ID || ''),
      sort_order: Number(shuJuHang.排序 || 0),
      zui_hou_liang_tiao: zuiHouAnJiaoSe.get(String(shuJuHang.角色ID)) ?? [],
    }
  })
}

export async function huoQu档案详情(
  yong_hu_id: string,
  dang_an_id: string,
): Promise<档案详情 | null> {
  const jieGuo = await 数据库.query(
    `SELECT d."ID", d."用户ID", d."角色ID", d."角色名字", r."微信昵称", d."是否渣型",
            d."结果类型", d."是否封存", d."好感度总分", d."关系阶段",
            d."聊天天数", d."消息总数", d."创建时间",
            r."MBTI", r."性别", r."结局文案",
            r."随机性格",
            d."复盘内容", d."复盘数据",
            d."最后消息时间", d."分类ID", d."排序"
      FROM "游戏档案" d
      LEFT JOIN "角色" r ON r."ID" = d."角色ID"
      WHERE d."ID" = $1 AND d."用户ID" = $2
      LIMIT 1`,
    [dang_an_id, yong_hu_id],
  )

  if (jieGuo.rows.length === 0) return null

  const shuJuHang = jieGuo.rows[0]
  const jieGuoLeiXingYuan = 解析结局类型(shuJuHang.结果类型, Boolean(shuJuHang.是否封存))
  const chuangJianShiJian = String(shuJuHang.创建时间 || new Date().toISOString())
  const youXiJieShu = jieGuoLeiXingYuan !== 'jinxing_zhong'

  let fuPanShuJu: 复盘时间线条目[] | null = null
  let fuPanPiZhu: 复盘批注[] | null = null
  let fuPanDuan: FuPanDuan[] = []
  let fuPanFenZu: FuPanDuanFenZu[] = []
  let fuPanZongDuanShu = 0
  let fuPanHaiYouGengDuo = false
  let fuPanZhuangTai: string | null = null
  let legacyPiZhu: FuPanPiZhuDingWei[] | null = null
  let legacyPiZhuKeDingWei: boolean | undefined
  if (shuJuHang.复盘数据) {
    try {
      const jieXi = typeof shuJuHang.复盘数据 === 'string' ? JSON.parse(shuJuHang.复盘数据) : shuJuHang.复盘数据
      if (Array.isArray(jieXi)) fuPanShuJu = jieXi
      else if (jieXi && typeof jieXi === 'object') {
        if (Array.isArray(jieXi.duan)) fuPanDuan = jieXi.duan
        if (Array.isArray(jieXi.fen_zu)) fuPanFenZu = jieXi.fen_zu
        if (Number.isInteger(jieXi.zong_duan_shu)) fuPanZongDuanShu = Math.max(0, jieXi.zong_duan_shu)
        fuPanHaiYouGengDuo = jieXi.hai_you_geng_duo === true
        if (typeof jieXi.zhuang_tai === 'string') fuPanZhuangTai = jieXi.zhuang_tai
        if (Array.isArray(jieXi.legacy_pi_zhu)) legacyPiZhu = jieXi.legacy_pi_zhu
        if (typeof jieXi.legacy_pi_zhu_ke_ding_wei === 'boolean') legacyPiZhuKeDingWei = jieXi.legacy_pi_zhu_ke_ding_wei
        if (Array.isArray(jieXi.pi_zhu)) {
          fuPanPiZhu = jieXi.pi_zhu.filter((item: FuPanPiZhuDingWei) => item && Number.isInteger(item.xu_hao) && item.xu_hao > 0 && typeof item.ping_lun === 'string' && item.ping_lun.trim())
        }
      }
    } catch {
