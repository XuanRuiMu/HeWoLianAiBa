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
import { huoQuFanYi } from '@/config/translations'

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
  const cuoWuXinXi = ref<string | null>(null)
  const yeMa = ref(1)
  const meiYeTiaoShu = ref(50)
  const zongShu = ref(0)
  const jiaZaiGengDuoZhong = ref(false)
  const haiYouGengDuo = ref(false)

  const zuiDaXiaoXiChangDu = 500

  function anQuanTuiSong(xiaoXi: 消息) {
    if (!Array.isArray(xiaoXiLieBiao.value)) xiaoXiLieBiao.value = []
    xiaoXiLieBiao.value.push(xiaoXi)
  }

  function qingChuCuoWu() {
    cuoWuXinXi.value = null
  }

  function sheZhiCuoWu(xiaoXi: string) {
    cuoWuXinXi.value = xiaoXi
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

    socket.on('角色回复', (shuJu: { 角色ID: string; 消息列表: 消息[] }) => {
      if (shuJu.角色ID === dangQianHuiHuaId.value) {
        shuJu.消息列表.forEach((xiaoXi) => anQuanTuiSong(xiaoXi))
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
            nei_rong: shiYongHu
              ? huoQuFanYi('liaoTian', 'ninCheHuiLeYiTiaoXiaoXi')
              : huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi'),
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
          nei_rong: huoQuFanYi('liaoTian', 'duiFangYiDuBuHui'),
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
    cuoWuXinXi.value = null
    yeMa.value = 1
    haiYouGengDuo.value = false
    jiaZaiGengDuoZhong.value = false
    try {
      const jieGuo = await huoQuXiaoXi(huiHuaId, yeMa.value, meiYeTiaoShu.value)
      xiaoXiLieBiao.value = [...jieGuo.lie_biao].reverse()
      zongShu.value = jieGuo.zong_shu
      haiYouGengDuo.value = jieGuo.lie_biao.length < jieGuo.zong_shu
      Promise.resolve(biaoJiYiDu(huiHuaId)).catch(() => {})
    } catch {
      xiaoXiLieBiao.value = []
      zongShu.value = 0
      haiYouGengDuo.value = false
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

  async function jiaZaiGengDuoXiaoXi(): Promise<boolean> {
    if (!dangQianHuiHuaId.value || jiaZaiGengDuoZhong.value || !haiYouGengDuo.value) return false
    jiaZaiGengDuoZhong.value = true
    try {
      const xiaYiYe = yeMa.value + 1
      const jieGuo = await huoQuXiaoXi(dangQianHuiHuaId.value, xiaYiYe, meiYeTiaoShu.value)
      const xinLieBiao = jieGuo.lie_biao.filter(
        (xiaoXi) => !xiaoXiLieBiao.value.some((xianYou) => xianYou.id === xiaoXi.id),
      )
      xiaoXiLieBiao.value = [...xinLieBiao.reverse(), ...xiaoXiLieBiao.value]
      yeMa.value = xiaYiYe
      zongShu.value = jieGuo.zong_shu
      haiYouGengDuo.value = xiaoXiLieBiao.value.length < jieGuo.zong_shu
      return xinLieBiao.length > 0
    } catch {
      return false
    } finally {
      jiaZaiGengDuoZhong.value = false
    }
  }

  async function faSongXiaoXi(neiRong: string): Promise<消息 | null> {
    if (!dangQianHuiHuaId.value || !neiRong.trim()) return null
    const qingLiNeiRong = neiRong.trim()
    if (qingLiNeiRong.length > zuiDaXiaoXiChangDu) {
      sheZhiCuoWu(huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'))
      return null
    }
    qingChuCuoWu()
    const linShiXiaoXi: 消息 = {
      id: `linshi-${Date.now()}`,
      hui_hua_id: dangQianHuiHuaId.value,
      fa_song_zhe_id: '',
      fa_song_zhe_lei_xing: 'yonghu',
      nei_rong: qingLiNeiRong,
      lei_xing: 'wenben',
      shi_jian_chuo: Date.now(),
      yi_du: false,
      fa_song_zhong: true,
    }
    anQuanTuiSong(linShiXiaoXi)
    try {
      const xiaoXi = await faSongXiaoXiApi(dangQianHuiHuaId.value, qingLiNeiRong)
      const suoYin = xiaoXiLieBiao.value.findIndex((m) => m.id === linShiXiaoXi.id)
      if (suoYin !== -1) {
        xiaoXiLieBiao.value[suoYin] = xiaoXi
      }
      if (socketLianJie.value?.connected) {
        socketLianJie.value.emit('发送消息')
      }
      return xiaoXi
    } catch (cuoWu: unknown) {
      const suoYin = xiaoXiLieBiao.value.findIndex((m) => m.id === linShiXiaoXi.id)
      if (suoYin !== -1) {
        xiaoXiLieBiao.value.splice(suoYin, 1)
      }
      const xiaoXi = cuoWu instanceof Error ? cuoWu.message : huoQuFanYi('liaoTian', 'faSongShiBai')
      sheZhiCuoWu(xiaoXi)
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
          nei_rong: huoQuFanYi('liaoTian', 'ninCheHuiLeYiTiaoXiaoXi'),
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
    cuoWuXinXi.value = null
    yeMa.value = 1
    zongShu.value = 0
    haiYouGengDuo.value = false
    jiaZaiGengDuoZhong.value = false
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
    cuoWuXinXi,
    yeMa,
    meiYeTiaoShu,
    zongShu,
    jiaZaiGengDuoZhong,
    haiYouGengDuo,
    zuiDaXiaoXiChangDu,
    lianJieSocket,
    duanKaiSocket,
    jiaZaiXiaoXi,
    jiaZaiGengDuoXiaoXi,
    faSongXiaoXi,
    cheHuiXiaoXi,
    qingKongZhuangTai,
    qingChuCuoWu,
    sheZhiCuoWu,
  }
})
