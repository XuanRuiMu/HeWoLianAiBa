import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io, Socket } from 'socket.io-client'
import type { 消息, 角色 } from '@/types'
import { 令牌键 } from '@/constants/auth'
import {
  huoQuXiaoXi,
  faSongXiaoXi as faSongXiaoXiApi,
  cheHuiXiaoXi as cheHuiXiaoXiApi,
  biaoJiYiDu,
  huoQuJiaoSeXiangQing,
} from '@/api/聊天'

export const 使用聊天仓库 = defineStore('聊天', () => {
  const dangQianHuiHuaId = ref<string | null>(null)
  const xiaoXiLieBiao = ref<消息[]>([])
  const zhengZaiShuRu = ref(false)
  const jiaoSeXinXi = ref<角色 | null>(null)
  const socketLianJie = ref<Socket | null>(null)
  const lianJieZhong = ref(false)
  const youXiShiJian = ref<{ lei_xing: string; xiao_xi: string } | null>(null)
  const youXiYiJieShu = ref(false)
  const keJiXuLiaoTian = ref(false)
  const yiDuBuHuiZhuangTai = ref(false)

  function anQuanTuiSong(xiaoXi: 消息) {
    if (!Array.isArray(xiaoXiLieBiao.value)) xiaoXiLieBiao.value = []
    xiaoXiLieBiao.value.push(xiaoXi)
  }

  function lianJieSocket(huiHuaId: string) {
    if (socketLianJie.value?.connected) {
      socketLianJie.value.disconnect()
    }

    const 令牌 = localStorage.getItem(令牌键)
    const socket = io({
      path: '/socket.io',
      auth: { token: 令牌 },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      socket.emit('加入聊天', huiHuaId)
    })

    socket.on('角色回复', (xiaoXi: 消息) => {
      if (xiaoXi.hui_hua_id === dangQianHuiHuaId.value) {
        anQuanTuiSong(xiaoXi)
      }
      zhengZaiShuRu.value = false
    })

    socket.on('对方正在输入', (jiaoSeId: string) => {
      if (jiaoSeId === dangQianHuiHuaId.value) {
        zhengZaiShuRu.value = true
      }
    })

    socket.on(
      '游戏事件',
      (shuJu: { lei_xing: string; xiao_xi: string; ke_ji_xu_liao_tian?: boolean }) => {
        const xiTongXiaoXi: 消息 = {
          id: `xitong-${Date.now()}`,
          hui_hua_id: dangQianHuiHuaId.value || '',
          fa_song_zhe_id: '',
          fa_song_zhe_lei_xing: 'xitong',
          nei_rong: shuJu.xiao_xi,
          lei_xing: 'xitong',
          shi_jian_chuo: Date.now(),
          yi_du: true,
          tong_guan_xin_xi: {
            lei_xing: shuJu.lei_xing,
            xiao_xi: shuJu.xiao_xi,
            ke_ji_xu_liao_tian: shuJu.ke_ji_xu_liao_tian,
          },
        }
        anQuanTuiSong(xiTongXiaoXi)
        youXiShiJian.value = shuJu
        youXiYiJieShu.value = true
        keJiXuLiaoTian.value = shuJu.ke_ji_xu_liao_tian === true
      },
    )

    socket.on('AI催促', (shuJu: { jiao_se_id: string; nei_rong: string }) => {
      if (shuJu.jiao_se_id === dangQianHuiHuaId.value) {
        const cuiGuXiaoXi: 消息 = {
          id: `cuigu-${Date.now()}`,
          hui_hua_id: dangQianHuiHuaId.value || '',
          fa_song_zhe_id: jiaoSeXinXi.value?.id || '',
          fa_song_zhe_lei_xing: 'jiaose',
          nei_rong: shuJu.nei_rong,
          lei_xing: 'wenben',
          shi_jian_chuo: Date.now(),
          yi_du: true,
        }
        anQuanTuiSong(cuiGuXiaoXi)
      }
    })

    socket.on('消息撤回', (shuJu: { hui_hua_id: string; xiao_xi_id: string }) => {
      if (shuJu.hui_hua_id === dangQianHuiHuaId.value) {
        const suoYin = xiaoXiLieBiao.value.findIndex((m) => m.id === shuJu.xiao_xi_id)
        if (suoYin !== -1) {
          const xiaoXi = xiaoXiLieBiao.value[suoYin]
          const shiYongHu = xiaoXi.fa_song_zhe_lei_xing === 'yonghu'
          xiaoXiLieBiao.value[suoYin] = {
            ...xiaoXi,
            yi_che_hui: true,
            nei_rong: shiYongHu ? '你撤回了一条消息' : '对方撤回了一条消息',
          }
        }
      }
    })

    socket.on('已读不回', (shuJu: { jiao_se_id: string; yuan_yin: string }) => {
      if (shuJu.jiao_se_id === dangQianHuiHuaId.value) {
        yiDuBuHuiZhuangTai.value = true
        const xiTongXiaoXi: 消息 = {
          id: `yidubuhui-${Date.now()}`,
          hui_hua_id: dangQianHuiHuaId.value || '',
          fa_song_zhe_id: '',
          fa_song_zhe_lei_xing: 'xitong',
          nei_rong: '对方已读不回',
          lei_xing: 'xitong',
          shi_jian_chuo: Date.now(),
          yi_du: true,
        }
        anQuanTuiSong(xiTongXiaoXi)
      }
    })

    socket.on('disconnect', () => {
      lianJieZhong.value = false
    })

    socketLianJie.value = socket
    lianJieZhong.value = true
  }

  function duanKaiSocket() {
    if (socketLianJie.value) {
      socketLianJie.value.disconnect()
      socketLianJie.value = null
    }
    lianJieZhong.value = false
  }

  async function jiaZaiXiaoXi(huiHuaId: string) {
    dangQianHuiHuaId.value = huiHuaId
    xiaoXiLieBiao.value = []
    zhengZaiShuRu.value = false
    yiDuBuHuiZhuangTai.value = false
    youXiYiJieShu.value = false
    keJiXuLiaoTian.value = false
    try {
      const lieBiao = await huoQuXiaoXi(huiHuaId)
      xiaoXiLieBiao.value = lieBiao
      biaoJiYiDu(huiHuaId).catch(() => {})
    } catch {
      xiaoXiLieBiao.value = []
    }
    try {
      const { jiao_se, dang_an_zhuang_tai } = await huoQuJiaoSeXiangQing(huiHuaId)
      jiaoSeXinXi.value = jiao_se
      if (dang_an_zhuang_tai) {
        youXiYiJieShu.value = dang_an_zhuang_tai.you_xi_yi_jie_shu
        keJiXuLiaoTian.value = dang_an_zhuang_tai.ke_ji_xu_liao_tian
      }
    } catch {
      jiaoSeXinXi.value = null
    }
  }

  async function faSongXiaoXi(neiRong: string): Promise<消息 | null> {
    if (!dangQianHuiHuaId.value || !neiRong.trim()) return null
    const linShiXiaoXi: 消息 = {
      id: `linshi-${Date.now()}`,
      hui_hua_id: dangQianHuiHuaId.value,
      fa_song_zhe_id: '',
      fa_song_zhe_lei_xing: 'yonghu',
      nei_rong: neiRong.trim(),
      lei_xing: 'wenben',
      shi_jian_chuo: Date.now(),
      yi_du: false,
      fa_song_zhong: true,
    }
    anQuanTuiSong(linShiXiaoXi)
    try {
      const xiaoXi = await faSongXiaoXiApi(dangQianHuiHuaId.value, neiRong.trim())
      const suoYin = xiaoXiLieBiao.value.findIndex((m) => m.id === linShiXiaoXi.id)
      if (suoYin !== -1) {
        xiaoXiLieBiao.value[suoYin] = xiaoXi
      }
      return xiaoXi
    } catch {
      const suoYin = xiaoXiLieBiao.value.findIndex((m) => m.id === linShiXiaoXi.id)
      if (suoYin !== -1) {
        xiaoXiLieBiao.value.splice(suoYin, 1)
      }
      return null
    }
  }

  async function cheHuiXiaoXi(xiaoXiId: string) {
    if (!dangQianHuiHuaId.value) return
    try {
      await cheHuiXiaoXiApi(dangQianHuiHuaId.value, xiaoXiId)
      const suoYin = xiaoXiLieBiao.value.findIndex((m) => m.id === xiaoXiId)
      if (suoYin !== -1) {
        xiaoXiLieBiao.value[suoYin] = {
          ...xiaoXiLieBiao.value[suoYin],
          yi_che_hui: true,
          nei_rong: '你撤回了一条消息',
        }
      }
    } catch (e) {
      console.warn('撤回消息失败', e)
    }
  }

  function qingKongZhuangTai() {
    dangQianHuiHuaId.value = null
    xiaoXiLieBiao.value = []
    zhengZaiShuRu.value = false
    jiaoSeXinXi.value = null
    youXiShiJian.value = null
    youXiYiJieShu.value = false
    keJiXuLiaoTian.value = false
    yiDuBuHuiZhuangTai.value = false
    duanKaiSocket()
  }

  return {
    dangQianHuiHuaId,
    xiaoXiLieBiao,
    zhengZaiShuRu,
    jiaoSeXinXi,
    youXiShiJian,
    youXiYiJieShu,
    keJiXuLiaoTian,
    socketLianJie,
    lianJieZhong,
    yiDuBuHuiZhuangTai,
    lianJieSocket,
    duanKaiSocket,
    jiaZaiXiaoXi,
    faSongXiaoXi,
    cheHuiXiaoXi,
    qingKongZhuangTai,
  }
})
