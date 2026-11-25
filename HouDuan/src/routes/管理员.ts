














































































































































































































































      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, {
      yong_hu: jieGuo.yong_hu,
      chu_shi_mi_ma: jieGuo.chu_shi_mi_ma,
    })
  } catch (cuoWu) {
    debug日志.error('管理接口', '创建测试用户失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/测试用户登录', guanLiGaoWeiMenKong, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  const qingQiuTi = qingQiu.body as Record<string, unknown>
  const shouJiHao = huoQuZiFuChuan(qingQiuTi, 'shouJiHao', 'shou_ji_hao')

  if (!shouJiHao) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }
  if (!验证手机号(shouJiHao)) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  }

  try {
    const jieGuo = await dengLuCeShiYongHu(shouJiHao)
    if (!jieGuo.cheng_gong) {
      return shiBaiXiangYing(xiangYing, jieGuo.zhuang_tai_ma || 400, jieGuo.ti_shi || huoQuFanYi('renZheng', 'dengLuShiBai'))
    }
    await jiLuShenJiRiZhi({
      yong_hu_id: yongHu.用户ID,
      ip: huoQuIp(qingQiu),
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'dengLuCeShiYongHu'),
      xiang_qing: { mu_biao_shou_ji_hao: yinBiShouJiHao(shouJiHao) },
      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, { ling_pai: jieGuo.ling_pai, yong_hu: jieGuo.yong_hu })
  } catch (cuoWu) {
    debug日志.error('管理接口', '登录测试用户失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.get('/系统状态', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  try {
    const zhuangTai = await huoQuXiTongZhuangTai()
    await jiLuShenJiRiZhi({
      yong_hu_id: yongHu.用户ID,
      ip: huoQuIp(qingQiu),
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'chaKanXiTongZhuangTai'),
      xiang_qing: { yong_hu_shu: zhuangTai.yong_hu_shu },
      lei_xing: '管理',
    })
    return chengGongXiangYing(xiangYing, zhuangTai)
  } catch (cuoWu) {
    debug日志.error('管理接口', '获取系统状态失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.get('/用量看板', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu!
  try {
    const riQi = new Date().toISOString().slice(0, 10)
    const qianZhui = `ai_yu_suan:`
    const moShiJian = `${qianZhui}*:${riQi}`
    const { huoQuJinRiHuiZong } = await import('../services/用量统计')
    const { duQuZhongShiDuiLieChangDu } = await import('../services/重试队列').catch(() => ({ duQuZhongShiDuiLieChangDu: async () => 0 }))

    const jiShuJian: string[] = []
    let saoMiaoGuangBiao = '0'
    do {
      const [xiaYiGuangBiao, piCi] = (await redis.scan(
        saoMiaoGuangBiao,
        'MATCH',
        moShiJian,
        'COUNT',
        500,
      )) as [string, string[]]
      saoMiaoGuangBiao = xiaYiGuangBiao
      jiShuJian.push(...piCi)
    } while (saoMiaoGuangBiao !== '0')

    const yiYongAnYongHuId = new Map<string, number>()
    const meiPiJianShu = 500
    for (let qiShi = 0; qiShi < jiShuJian.length; qiShi += meiPiJianShu) {
      const piCiJian = jiShuJian.slice(qiShi, qiShi + meiPiJianShu)
      const piCiZhi = (await redis.mget(...piCiJian)) as (string | null)[]
      piCiJian.forEach((jian, xiaBiao) => {
        const 用户ID = jian.slice(qianZhui.length, jian.length - riQi.length - 1)
        const yuanShiZhi = piCiZhi[xiaBiao]
        if (yuanShiZhi === null || yuanShiZhi === undefined) return
        const zhi = Number(yuanShiZhi)
        if (用户ID && !Number.isNaN(zhi)) {
          yiYongAnYongHuId.set(用户ID, zhi)
        }
      })
    }

    const lieBiao: Array<{
      yong_hu_id: string
      shou_ji_hao: string
      yong_hu_ming: string | null
      yi_yong: number
      sheng_yu: number
    }> = []

    if (yiYongAnYongHuId.size > 0) {
      const { 数据库 } = await import('../数据库')
      const idLieBiao = [...yiYongAnYongHuId.keys()]
      const zhanWei = idLieBiao.map((_, i) => `$${i + 1}`).join(',')
      const chaXun = await 数据库.query(
        `SELECT "ID", "手机号", "用户名" FROM "用户" WHERE "ID"::text IN (${zhanWei})`,
        idLieBiao,
      )
      for (const hang of chaXun.rows) {
        const id = String(hang.ID)
        const yiYong = yiYongAnYongHuId.get(id) ?? 0
        lieBiao.push({
