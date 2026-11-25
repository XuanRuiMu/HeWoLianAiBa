
































































































































  function shiFouMingMing(zhuangTai: 认证状态类型): boolean {
    return zhuangTai === '匿名'
  }

  function kaiShiXinDai(): number {
    认证代次 += 1
    恢复控制器?.abort()
    恢复控制器 = null
    return 认证代次
  }

  async function jiaZaiYongHu(
    dai?: number,
    令牌快照?: string,
    baoLiuChengGong = false,
  ): Promise<boolean> {
    const daiCi = dai ?? kaiShiXinDai()
    const lingPaiZhi = 令牌快照 ?? 令牌.value
    if (!lingPaiZhi) {
      if (!isDaiCiYouXiao(daiCi)) return false
      认证状态.value = '匿名'
      shenFenYiJiuXu.value = true
      return false
    }
    if (dai === undefined) {
      认证状态.value = '恢复中'
      shenFenYiJiuXu.value = false
      恢复错误.value = null
      恢复控制器 = new AbortController()
    }
    try {
      const shuJu = await huoQuYongHuXinXi(
        恢复控制器?.signal ? { signal: 恢复控制器.signal } : undefined,
      )
      if (!isDaiCiYouXiao(daiCi)) return false
      const cunChuToken = duQuLingPai()
      if (
        (令牌.value && 令牌.value !== lingPaiZhi) ||
        (cunChuToken && cunChuToken !== lingPaiZhi)
      ) {
        if (cunChuToken) 令牌.value = cunChuToken
        认证状态.value = '恢复失败可重试'
        shenFenYiJiuXu.value = false
        恢复错误.value = chuangJianQianTaiCuoWu({
          code: QianTaiDaiMa.AUTH_TOKEN_INVALID,
          retryable: true,
        })
        return false
      }
      令牌.value = cunChuToken ?? lingPaiZhi
      dangQianYongHu.value = shuJu
      sheZhiShenFenShiTu(shuJu)
      shenFenYiJiuXu.value = true
      恢复错误.value = null
      认证状态.value = '已认证'
      return true
    } catch (cuoWu: unknown) {
      if (!isDaiCiYouXiao(daiCi)) return false
      const zhengChangHua = 归一前台错误(cuoWu)
      if (zhengChangHua.httpStatus === 401) {
