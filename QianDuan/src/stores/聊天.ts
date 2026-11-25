


























































































































































































































































































































































































































































































































































































































































































































































































































































































    jieDuanTiShi?: (jieDuan: 'xiaoXi' | 'jiaoSe') => void,
  ) {
    if (yuZaiHuiHuaId.value === huiHuaId && Date.now() - yuZaiShiJian < YuZaiYouXiaoHaoMiao) {
      yuZaiHuiHuaId.value = null
      return
    }
    const benCi = ++jiaZaiDaiCi
    if (dangQianHuiHuaId.value && dangQianHuiHuaId.value !== huiHuaId) 持久化监控()
    qingChuJiaoSeZengLiangJiLu(huiHuaId)
    dangQianHuiHuaId.value = huiHuaId
    const leiJiDai = Promise.resolve(huoQuHaoGanDuLeiJiBianHua(huiHuaId)).catch(() => null)
    读取监控历史(huiHuaId)
    xiaoXiLieBiao.value = []
    faSongShiBaiJiHe.value = new Set()
    faSongRenWuBiao.clear()
    清空媒体重发()
    qiangZhiYinChangXianShi()
    zuiHouXuHao = 0
    qingKongLunCiZhuangTai()
    yiDuBuHuiZhuangTai.value = false
    youXiYiJieShu.value = false
    keJiXuLiaoTian.value = false
    cuoWuXinXi.value = null
    yeMa.value = 1
    haiYouGengDuo.value = false
    jiaZaiGengDuoZhong.value = false
    shouPingJiaZaiZhong.value = true
    jiaZaiShiBai.value = false
    shouPingQianTaiCuoWu.value = null
    jiaoSeQianTaiCuoWu.value = null
    try {
      try {
        const jieGuo = await huoQuXiaoXi(huiHuaId, yeMa.value, meiYeTiaoShu.value)
        if (benCi !== jiaZaiDaiCi) return
        const fuWuLieBiao = [...jieGuo.lie_biao].reverse()
        shuaXinFuWuQiShiJianXiaoZhun(jieGuo.fuWuQiShiJianChuo)
        for (const xiaoXi of fuWuLieBiao) jiLuKeChongBian(xiaoXi)
        if (!chongBianXiaoZhunYouXiao()) chongBianKeYongJiHe.value.clear()
        const yiYouId = new Set(fuWuLieBiao.map((m) => m.id))
        const yiYouMiDengJian = new Set(
          fuWuLieBiao
            .map((m) => m.mi_deng_jian)
            .filter((jian): jian is string => typeof jian === 'string' && jian !== ''),
        )
        const buDing = xiaoXiLieBiao.value.filter(
          (m) =>
            !yiYouId.has(m.id) && !(m.mi_deng_jian && yiYouMiDengJian.has(m.mi_deng_jian)),
        )
        xiaoXiLieBiao.value = guiYiXiaoXiLieBiao(
          buDing.length > 0 ? [...fuWuLieBiao, ...buDing] : fuWuLieBiao,
        )
        zongShu.value = jieGuo.zong_shu
        haiYouGengDuo.value = jieGuo.hai_you_geng_duo ?? jieGuo.lie_biao.length < jieGuo.zong_shu
        补全旧内心消息()
        try {
          await biaoJiYiDu(huiHuaId)
        } catch {
          /* 已读回执失败不打断首屏渲染 */
        }
      } catch (cuoWu: unknown) {
        if (benCi !== jiaZaiDaiCi) return
        console.error('聊天首屏消息加载失败', cuoWu)
        xiaoXiLieBiao.value = []
        zongShu.value = 0
        haiYouGengDuo.value = false
        jiaZaiShiBai.value = true
        shouPingQianTaiCuoWu.value = 归一前台错误(cuoWu)
      }
      jieDuanTiShi?.('xiaoXi')
      const leiJi = await leiJiDai
      if (benCi !== jiaZaiDaiCi) return
      if (leiJi) {
        haoGanDuBianHuaJiLu.value = {
          ...haoGanDuBianHuaJiLu.value,
          [huiHuaId]: {
            xin_ren_du_bian_hua: leiJi.xin_ren_du_bian_hua,
            qin_mi_du_bian_hua: leiJi.qin_mi_du_bian_hua,
            qu_wei_du_bian_hua: leiJi.qu_wei_du_bian_hua,
            guan_huai_du_bian_hua: leiJi.guan_huai_du_bian_hua,
            zong_fen_bian_hua: leiJi.zong_fen_bian_hua,
          },
        }
      }
      try {
        const { jiao_se, dang_an_zhuang_tai } = await huoQuJiaoSeXiangQing(huiHuaId)
        if (benCi !== jiaZaiDaiCi) return
        jiaoSeXinXi.value = jiao_se
        jiaoSeQianTaiCuoWu.value = null
        if (dang_an_zhuang_tai) {
          youXiYiJieShu.value = dang_an_zhuang_tai.you_xi_yi_jie_shu
          keJiXuLiaoTian.value = dang_an_zhuang_tai.ke_ji_xu_liao_tian
        }
      } catch (cuoWu: unknown) {
        if (benCi !== jiaZaiDaiCi) return
        console.error('聊天角色详情加载失败', cuoWu)
        jiaoSeXinXi.value = null
        jiaoSeQianTaiCuoWu.value = 归一前台错误(cuoWu)
      }
      jieDuanTiShi?.('jiaoSe')
    } finally {
