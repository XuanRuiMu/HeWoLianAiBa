import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { 用户, 登录状态 } from '@/types'
import { dengLu, zhuCe, huoQuYongHuXinXi } from '@/api/认证'
import { huoQuCuoWuXiangYing } from '@/api/请求'
import { baoCunShuJu, shanChuShuJu } from '@/utils/storage'
import { 令牌键 } from '@/constants/auth'
import { 使用认证表单仓库 } from './认证表单'
import { 使用聊天仓库 } from './聊天'

export const 使用用户仓库 = defineStore('用户', () => {
  const dangQianYongHu = ref<用户 | null>(null)
  const 令牌 = ref<string | null>(localStorage.getItem(令牌键))
  const shiFouGuanLiYuan = ref(false)
  const mingChengKeJian = ref(true)
  const tuiChuQingQiu = ref(false)
  const zhuangTai = ref<登录状态>({
    deng_lu_zhong: false,
    cuo_wu_xin_xi: null,
  })

  async function zhiXingDengLu(shouJiHao: string, miMa: string): Promise<boolean> {
    zhuangTai.value.deng_lu_zhong = true
    zhuangTai.value.cuo_wu_xin_xi = null
    try {
      const jieGuo = await dengLu(shouJiHao, miMa)
      令牌.value = jieGuo.令牌
      localStorage.setItem(令牌键, jieGuo.令牌)
      dangQianYongHu.value = jieGuo.用户
      shiFouGuanLiYuan.value = jieGuo.是否管理员
      await jiaZaiYongHu()
      return jieGuo.新用户
    } catch (cuoWu: unknown) {
      const xiaoXi = cuoWu instanceof Error ? cuoWu.message : '登录失败'
      if (typeof cuoWu === 'object' && cuoWu !== null && 'response' in cuoWu) {
        const xiangYing = huoQuCuoWuXiangYing(cuoWu)
        if (xiangYing?.data?.ti_shi) {
          zhuangTai.value.cuo_wu_xin_xi = xiangYing.data.ti_shi
        } else {
          zhuangTai.value.cuo_wu_xin_xi = xiaoXi
        }
      } else {
        zhuangTai.value.cuo_wu_xin_xi = xiaoXi
      }
      throw cuoWu
    } finally {
      zhuangTai.value.deng_lu_zhong = false
    }
  }

  async function zhiXingZhuCe(
    shouJiHao: string,
    yanZhengMa: string,
    yongHuMing: string,
    miMa: string,
    tongYiXieYi: boolean,
  ): Promise<boolean> {
    zhuangTai.value.deng_lu_zhong = true
    zhuangTai.value.cuo_wu_xin_xi = null
    try {
      const jieGuo = await zhuCe(shouJiHao, yanZhengMa, yongHuMing, miMa, tongYiXieYi)
      令牌.value = jieGuo.令牌
      localStorage.setItem(令牌键, jieGuo.令牌)
      dangQianYongHu.value = jieGuo.用户
      shiFouGuanLiYuan.value = jieGuo.是否管理员
      await jiaZaiYongHu()
      return true
    } catch (cuoWu: unknown) {
      const xiaoXi = cuoWu instanceof Error ? cuoWu.message : '注册失败'
      if (typeof cuoWu === 'object' && cuoWu !== null && 'response' in cuoWu) {
        const xiangYing = huoQuCuoWuXiangYing(cuoWu)
        if (xiangYing?.data?.ti_shi) {
          zhuangTai.value.cuo_wu_xin_xi = xiangYing.data.ti_shi
        } else {
          zhuangTai.value.cuo_wu_xin_xi = xiaoXi
        }
      } else {
        zhuangTai.value.cuo_wu_xin_xi = xiaoXi
      }
      throw cuoWu
    } finally {
      zhuangTai.value.deng_lu_zhong = false
    }
  }

  async function jiaZaiYongHu() {
    if (!令牌.value) return
    try {
      const shuJu = await huoQuYongHuXinXi()
      dangQianYongHu.value = shuJu
      baoCunShuJu('yonghu', dangQianYongHu.value)
    } catch (cuoWu: unknown) {
      // 仅在令牌确实无效（401）时才清除本地登录数据
      // 网络错误、服务器故障等情况下保留本地登录态，避免后端暂时不可用导致用户被强制登出
      const xiangYing = huoQuCuoWuXiangYing(cuoWu)
      if (xiangYing?.status === 401) {
        tuiChuDengLu()
      }
    }
  }

  function qingQiuTuiChu() {
    tuiChuQingQiu.value = true
  }

  function tuiChuDengLu() {
    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.qingKongZhuangTai()
    dangQianYongHu.value = null
    令牌.value = null
    shiFouGuanLiYuan.value = false
    mingChengKeJian.value = true
    tuiChuQingQiu.value = false
    zhuangTai.value = { deng_lu_zhong: false, cuo_wu_xin_xi: null }
    localStorage.removeItem(令牌键)
    shanChuShuJu('yonghu')
    const 认证表单仓库 = 使用认证表单仓库()
    认证表单仓库.qingKongDengLuZhuCe()
    认证表单仓库.qingKongZiLiao()
  }

  function sheZhiLingPai(令牌值: string, guanLiYuan: boolean) {
    令牌.value = 令牌值
    localStorage.setItem(令牌键, 令牌值)
    shiFouGuanLiYuan.value = guanLiYuan
  }

  return {
    dangQianYongHu,
    令牌,
    shiFouGuanLiYuan,
    mingChengKeJian,
    tuiChuQingQiu,
    zhuangTai,
    zhiXingDengLu,
    zhiXingZhuCe,
    jiaZaiYongHu,
    qingQiuTuiChu,
    tuiChuDengLu,
    sheZhiLingPai,
  }
})
