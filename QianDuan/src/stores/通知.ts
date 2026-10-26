import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io, Socket } from 'socket.io-client'
import type { 通知 } from '@/types/类型定义'
import { duQuLingPai } from '@/utils/令牌存储'
import { biaoJiQuanBuTongZhiYiDu, biaoJiTongZhiYiDu, huoQuTongZhiLieBiao } from '@/api/通知'
import { 归一前台错误 } from '@/utils/前台错误'
import { chuFaCuoWuShangBao } from '@/utils/错误上报'

export const 使用通知仓库 = defineStore('通知', () => {
  const tongZhiLieBiao = ref<通知[]>([])
  const weiDuShu = ref(0)
  const socketLianJie = ref<Socket | null>(null)

  async function jiaZaiTongZhi() {
    try {
      const shuJu = await huoQuTongZhiLieBiao()
      tongZhiLieBiao.value = shuJu.lie_biao
      weiDuShu.value = shuJu.wei_du_shu
    } catch (cuoWu: unknown) {
      throw 归一前台错误(cuoWu)
    }
  }

  function shuaXinTongZhiBiao() {
    jiaZaiTongZhi().catch((cuoWu: unknown) => {
      chuFaCuoWuShangBao({
        leiBie: 'chengNuo',
        cuoWu,
        shiJianChuo: Date.now(),
        fuJia: { lai_yuan: 'tong_zhi_biao_shua_xin' },
      })
    })
  }

  function lianJieSocket() {
    const 令牌 = duQuLingPai()
    if (!令牌 || socketLianJie.value) return

    const xieYiLianJie = io({
      path: '/socket.io',
      auth: { token: 令牌 },
      transports: ['websocket', 'polling'],
    })

    xieYiLianJie.on('通知新', (tongZhi: 通知) => {
      if (!tongZhiLieBiao.value.some((xiang) => xiang.id === tongZhi.id)) {
        tongZhiLieBiao.value = [tongZhi, ...tongZhiLieBiao.value]
      }
      if (!tongZhi.yi_du) {
        weiDuShu.value += 1
      }
    })

    socketLianJie.value = xieYiLianJie
  }

  function duanKaiSocket() {
    socketLianJie.value?.disconnect()
    socketLianJie.value = null
  }

  async function biaoJiYiDu(tongZhiId: string) {
    const tongZhi = tongZhiLieBiao.value.find((xiang) => xiang.id === tongZhiId)
    if (!tongZhi || tongZhi.yi_du) return
    const jiuShiJian = tongZhi.yi_du_shi_jian
    tongZhi.yi_du = true
    tongZhi.yi_du_shi_jian = new Date().toISOString()
    weiDuShu.value = Math.max(0, weiDuShu.value - 1)
    try {
      await biaoJiTongZhiYiDu(tongZhiId)
    } catch (cuoWu: unknown) {
      tongZhi.yi_du = false
      tongZhi.yi_du_shi_jian = jiuShiJian
      weiDuShu.value += 1
      throw cuoWu
    }
  }

  async function biaoJiQuanBuYiDu() {
    if (weiDuShu.value === 0) return
    const jiuLieBiao = tongZhiLieBiao.value
    const jiuWeiDuShu = weiDuShu.value
    const yiDuShiJian = new Date().toISOString()
    tongZhiLieBiao.value = jiuLieBiao.map((tongZhi) => ({
      ...tongZhi,
      yi_du: true,
      yi_du_shi_jian: tongZhi.yi_du_shi_jian || yiDuShiJian,
    }))
    weiDuShu.value = 0
    try {
      await biaoJiQuanBuTongZhiYiDu()
    } catch (cuoWu: unknown) {
      tongZhiLieBiao.value = jiuLieBiao
      weiDuShu.value = jiuWeiDuShu
      throw cuoWu
    }
  }

  return {
    tongZhiLieBiao,
    weiDuShu,
    jiaZaiTongZhi,
    shuaXinTongZhiBiao,
    lianJieSocket,
    duanKaiSocket,
    biaoJiYiDu,
    biaoJiQuanBuYiDu,
  }
})
