import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { 用户, 登录状态 } from '@/types'
import { dengLu, zhuCe, huoQuYongHuXinXi, zhuXiaoZhangHao } from '@/api/认证'
import { huoQuCuoWuXiangYing } from '@/api/请求'
import { track } from '@/utils/埋点'
import { baoCunShuJu, duQuShuJu, shanChuShuJu } from '@/utils/storage'
import {
  duQuLingPai,
  baoCunLingPai,
  qingChuLingPai,
  baoCunShuaXinLingPai,
  qingChuShuaXinLingPai,
} from '@/utils/令牌存储'
import { 使用认证表单仓库 } from './认证表单'
import { 使用聊天仓库 } from './聊天'

const TU_PIAN_SHOU_QUAN_JIAN = 'hewolianba_tuPianShouQuan'

export const 使用用户仓库 = defineStore('用户', () => {
  const dangQianYongHu = ref<用户 | null>(null)
  const 令牌 = ref<string | null>(duQuLingPai())
  const shiFouGuanLiYuan = ref(false)
  const mingChengKeJian = ref(true)
  const tuiChuQingQiu = ref(false)
  // C4：多媒体外发授权（图片/表情包/语音是否可送入视觉理解链路），默认关闭
  const tuPianShouQuan = ref<boolean>(duQuShuJu<boolean>(TU_PIAN_SHOU_QUAN_JIAN) === true)
  const zhuangTai = ref<登录状态>({
    deng_lu_zhong: false,
    cuo_wu_xin_xi: null,
  })

  function sheZhiTuPianShouQuan(zhi: boolean): void {
    tuPianShouQuan.value = zhi
    baoCunShuJu(TU_PIAN_SHOU_QUAN_JIAN, zhi)
  }

  // C3 账号注销：调后端注销接口并清理本地登录态
  async function zhiXingZhuXiao(): Promise<void> {
    zhuangTai.value.deng_lu_zhong = true
    zhuangTai.value.cuo_wu_xin_xi = null
    try {
      await zhuXiaoZhangHao()
    } catch {
      zhuangTai.value.cuo_wu_xin_xi = '注销失败，请稍后再试'
      throw new Error('zhuXiaoShiBai')
    } finally {
      zhuangTai.value.deng_lu_zhong = false
    }
    shanChuShuJu('yonghu')
    dangQianYongHu.value = null
    sheZhiTuPianShouQuan(false)
    tuiChuDengLu()
  }

  // 身份就绪门（Identity Readiness Gate）
  //
  // 身份来自异步接口，但排序存储键、管理员判定、菜单渲染等逻辑都在同步时机读取它。
  // 缺少「就绪信号」会让这些读取落在身份解析完成之前，产生静默错误（读到 null / false）。
  // 此处提供两条保障：
  //   1) 同步水合——启动即用本地缓存点亮身份，消除首帧空窗；
  //   2) 单飞就绪 Promise——任何需要确定身份的逻辑都可 await，且并发调用只发一次请求。
  const shenFenYiJiuXu = ref(false)
  let jiuXuNuoYan: Promise<void> | null = null

  function shuiHeBenDiShenFen() {
    if (!令牌.value) {
      shenFenYiJiuXu.value = true
      return
    }
    const huanCun = duQuShuJu<用户>('yonghu')
    if (huanCun && huanCun.id) {
      dangQianYongHu.value = huanCun
      shiFouGuanLiYuan.value = huanCun.guan_li_yuan === true
    }
  }

  async function queBaoShenFenJiuXu(): Promise<void> {
    if (shenFenYiJiuXu.value) return
    if (jiuXuNuoYan) return jiuXuNuoYan
    jiuXuNuoYan = (async () => {
      try {
        await jiaZaiYongHu()
      } finally {
        shenFenYiJiuXu.value = true
        jiuXuNuoYan = null
      }
    })()
    return jiuXuNuoYan
  }

  async function zhiXingDengLu(shouJiHao: string, miMa: string, jiZhuMiMa = true): Promise<boolean> {
    zhuangTai.value.deng_lu_zhong = true
    zhuangTai.value.cuo_wu_xin_xi = null
    try {
      const jieGuo = await dengLu(shouJiHao, miMa)
      令牌.value = jieGuo.令牌
      baoCunLingPai(jieGuo.令牌, jiZhuMiMa)
      baoCunShuaXinLingPai(jieGuo.刷新令牌, jieGuo.刷新令牌ID, jiZhuMiMa)
      dangQianYongHu.value = jieGuo.用户
      shiFouGuanLiYuan.value = jieGuo.是否管理员
      shenFenYiJiuXu.value = true
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
    chuShengRiQi: string,
    jiZhuMiMa = true,
  ): Promise<boolean> {
    zhuangTai.value.deng_lu_zhong = true
    zhuangTai.value.cuo_wu_xin_xi = null
    try {
      const jieGuo = await zhuCe(shouJiHao, yanZhengMa, yongHuMing, miMa, tongYiXieYi, chuShengRiQi)
      令牌.value = jieGuo.令牌
      baoCunLingPai(jieGuo.令牌, jiZhuMiMa)
      baoCunShuaXinLingPai(jieGuo.刷新令牌, jieGuo.刷新令牌ID, jiZhuMiMa)
      dangQianYongHu.value = jieGuo.用户
      shiFouGuanLiYuan.value = jieGuo.是否管理员
      shenFenYiJiuXu.value = true
      await jiaZaiYongHu()
      track('zhuCeChengGong')
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
    if (!令牌.value) {
      shenFenYiJiuXu.value = true
      return
    }
    try {
      const shuJu = await huoQuYongHuXinXi()
      dangQianYongHu.value = shuJu
      shiFouGuanLiYuan.value = shuJu.guan_li_yuan === true
      baoCunShuJu('yonghu', dangQianYongHu.value)
    } catch (cuoWu: unknown) {
      // 仅在令牌确实无效（401）时才清除本地登录数据
      // 网络错误、服务器故障等情况下保留本地登录态，避免后端暂时不可用导致用户被强制登出
      const xiangYing = huoQuCuoWuXiangYing(cuoWu)
      if (xiangYing?.status === 401) {
        tuiChuDengLu()
      }
    } finally {
      shenFenYiJiuXu.value = true
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
    shenFenYiJiuXu.value = true
    zhuangTai.value = { deng_lu_zhong: false, cuo_wu_xin_xi: null }
    qingChuLingPai()
    qingChuShuaXinLingPai()
    shanChuShuJu('yonghu')
    const 认证表单仓库 = 使用认证表单仓库()
    认证表单仓库.qingKongDengLuZhuCe()
    认证表单仓库.qingKongZiLiao()
  }

  /** 清空用户状态（不调用后端注销接口，用于 401 令牌过期时的本地清理） */
  function 清空用户状态() {
    dangQianYongHu.value = null
    令牌.value = null
    shiFouGuanLiYuan.value = false
    mingChengKeJian.value = true
    tuiChuQingQiu.value = false
    shenFenYiJiuXu.value = true
    zhuangTai.value = { deng_lu_zhong: false, cuo_wu_xin_xi: null }
    qingChuLingPai()
    qingChuShuaXinLingPai()
    shanChuShuJu('yonghu')
  }

  function sheZhiLingPai(令牌值: string, guanLiYuan: boolean, chiJiu = true) {
    令牌.value = 令牌值
    baoCunLingPai(令牌值, chiJiu)
    shiFouGuanLiYuan.value = guanLiYuan
  }

  /** 资料同步：头像/签名保存成功后刷新本地用户与缓存，保持各端一致 */
  function tongBuZiLiao(canShu: { tou_xiang?: string | null; qian_ming?: string | null }): void {
    if (!dangQianYongHu.value) return
    if (canShu.tou_xiang !== undefined) dangQianYongHu.value.tou_xiang = canShu.tou_xiang
    if (canShu.qian_ming !== undefined) dangQianYongHu.value.qian_ming = canShu.qian_ming
    baoCunShuJu('yonghu', dangQianYongHu.value)
  }

  shuiHeBenDiShenFen()

  return {
    dangQianYongHu,
    令牌,
    shiFouGuanLiYuan,
    mingChengKeJian,
    tuiChuQingQiu,
    zhuangTai,
    tuPianShouQuan,
    shenFenYiJiuXu,
    zhiXingDengLu,
    zhiXingZhuCe,
    jiaZaiYongHu,
    queBaoShenFenJiuXu,
    qingQiuTuiChu,
    tuiChuDengLu,
    sheZhiLingPai,
    sheZhiTuPianShouQuan,
    tongBuZiLiao,
    zhiXingZhuXiao,
    清空用户状态,
  }
})
