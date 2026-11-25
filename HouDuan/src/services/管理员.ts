





















































































































































































































































































































export interface SheZhiGuanLiYuanJieGuo {
  cheng_gong: boolean
  yi_bian_geng: boolean
  jiao_se: 管理角色 | null
  ti_shi?: string
  zhuang_tai_ma?: number
}

export async function sheZhiGuanLiYuanZhuangTai(
  mu_biao_yong_hu_id: string,
  mu_biao_zhuang_tai: boolean,
): Promise<SheZhiGuanLiYuanJieGuo> {
  const chaXun = await 数据库.query(
    `SELECT "管理员", "运营", "审核员" FROM "用户" WHERE "ID" = $1 LIMIT 1`,
    [mu_biao_yong_hu_id],
  )
  if (chaXun.rows.length === 0) {
    return {
      cheng_gong: false,
      yi_bian_geng: false,
      jiao_se: null,
      ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai'),
      zhuang_tai_ma: 404,
    }
  }

  const dangQianHang = chaXun.rows[0] as Record<string, unknown>
  const xieHouJiaoSe = 取管理角色({ ...dangQianHang, 管理员: mu_biao_zhuang_tai })
  if ((dangQianHang.管理员 === true) === mu_biao_zhuang_tai) {
    qingChuJiaoSeHuanCun(mu_biao_yong_hu_id)
    return { cheng_gong: true, yi_bian_geng: false, jiao_se: xieHouJiaoSe }
  }

  await 数据库.query(
    `UPDATE "用户" SET "管理员" = $1, "更新时间" = NOW() WHERE "ID" = $2`,
    [mu_biao_zhuang_tai, mu_biao_yong_hu_id],
  )
  qingChuJiaoSeHuanCun(mu_biao_yong_hu_id)
  return { cheng_gong: true, yi_bian_geng: true, jiao_se: xieHouJiaoSe }
}

export async function zhiXingGuanLiYuanZhongZi(): Promise<number> {
  const 白名单 = peiZhi.shenYongYuan.yunXuLieBiao
  if (白名单.length === 0) {
    debug日志.info('管理员种子引导', '[管理员种子引导] ADMIN_PHONES 为空，跳过')
    return 0
  }

  let tiShengShu = 0
  for (const shouJiHao of 白名单) {
    const jieGuo = await 数据库.query(
      `UPDATE "用户" SET "管理员" = TRUE, "更新时间" = NOW()
       WHERE "手机号" = $1 AND "管理员" = FALSE
       RETURNING "ID"`,
      [shouJiHao],
    )
    if (jieGuo.rows.length > 0) {
      qingChuJiaoSeHuanCun(String(jieGuo.rows[0].ID))
      tiShengShu += jieGuo.rows.length
    }
  }
  debug日志.info(
    '管理员种子引导',
    `[管理员种子引导] 白名单共 ${白名单.length} 个手机号，本次提升 ${tiShengShu} 个账号为管理员`,
  )
  return tiShengShu
}

if (peiZhi.shenYongYuan.zhongZiYinDaoKaiGuan && !process.env.VITEST) {
