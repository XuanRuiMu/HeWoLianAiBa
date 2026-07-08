import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io, Socket } from 'socket.io-client'
import type { 通知 } from '@/types'
import { 令牌键 } from '@/constants/auth'
import { biaoJiQuanBuTongZhiYiDu, biaoJiTongZhiYiDu, huoQuTongZhiLieBiao } from '@/api/通知'

export const 使用通知仓库 = defineStore('通知', () => {
  const tongZhiLieBiao = ref<通知[]>([])
  const weiDuShu = ref(0)
  const jiaZaiZhong = ref(false)
  const socketLianJie = ref<Socket | null>(null)

  async function jiaZaiTongZhi() {
    jiaZaiZhong.value = true
    try {
      const shuJu = await huoQuTongZhiLieBiao()
      tongZhiLieBiao.value = shuJu.lie_biao
      weiDuShu.value = shuJu.wei_du_shu
    } catch {
      tongZhiLieBiao.value = []
      weiDuShu.value = 0
    } finally {
      jiaZaiZhong.value = false
    }
  }

  function lianJieSocket() {
    const 令牌 = localStorage.getItem(令牌键)
    if (!令牌 || socketLianJie.value?.connected) return

    const socket = io({
      path: '/socket.io',
      auth: { token: 令牌 },
      transports: ['websocket', 'polling'],
    })

    socket.on('通知新', (tongZhi: 通知) => {
      if (!tongZhiLieBiao.value.some((xiang) => xiang.id === tongZhi.id)) {
        tongZhiLieBiao.value = [tongZhi, ...tongZhiLieBiao.value]
      }
      if (!tongZhi.yi_du) {
        weiDuShu.value += 1
      }
    })

    socketLianJie.value = socket
  }

  function duanKaiSocket() {
    socketLianJie.value?.disconnect()
    socketLianJie.value = null
  }

  async function biaoJiYiDu(tongZhiId: string) {
    const tongZhi = tongZhiLieBiao.value.find((xiang) => xiang.id === tongZhiId)
    if (!tongZhi || tongZhi.yi_du) return
    await biaoJiTongZhiYiDu(tongZhiId)
    tongZhi.yi_du = true
    tongZhi.yi_du_shi_jian = new Date().toISOString()
    weiDuShu.value = Math.max(0, weiDuShu.value - 1)
  }

  async function biaoJiQuanBuYiDu() {
    if (weiDuShu.value === 0) return
    await biaoJiQuanBuTongZhiYiDu()
    const yiDuShiJian = new Date().toISOString()
    tongZhiLieBiao.value = tongZhiLieBiao.value.map((tongZhi) => ({
      ...tongZhi,
      yi_du: true,
      yi_du_shi_jian: tongZhi.yi_du_shi_jian || yiDuShiJian,
    }))
    weiDuShu.value = 0
  }

  return {
    tongZhiLieBiao,
    weiDuShu,
    jiaZaiZhong,
    jiaZaiTongZhi,
    lianJieSocket,
    duanKaiSocket,
    biaoJiYiDu,
    biaoJiQuanBuYiDu,
  }
})
