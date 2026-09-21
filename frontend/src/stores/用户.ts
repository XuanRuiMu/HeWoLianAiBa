import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { 用户, 登录状态 } from '@/types'
import { 归一管理角色, 归一管理能力列表, type GuanLiJiaoSe, type GuanLiNengLi } from '@/utils/角色能力'
import { dengLu, zhuCe, huoQuYongHuXinXi, zhuXiaoZhangHao } from '@/api/认证'
import { huoQuCuoWuXiangYing } from '@/api/请求'
import { huoQuFanYi } from '@/config/translations'
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
  // FP-18 身份视图门：角色与能力位一律来自服务端下发（授权判定在服务端，此处只是视图门）。
  // 能力未知（未下发/旧缓存/非白名单值）一律按「无能力」处理，视图门 fail-closed。
  const dangQianJiaoSe = ref<GuanLiJiaoSe | null>(null)
  const nengLieBiao = ref<GuanLiNengLi[]>([])
  /** 只读运营数据视图门（管理员监控面板、好感度明细）：任一管理身份可得 */
  const keGuanLiZhiDu = computed(() => nengLieBiao.value.includes('cha_kan'))
  /** 高危视图门（服务端运行时日志流）：仅 gao_we 身份可得 */
  const keGaoWei = computed(() => nengLieBiao.value.includes('gao_we'))
  const mingChengKeJian = ref(true)
  const tuiChuQingQiu = ref(false)

  function sheZhiShenFenShiTu(shenFen: { jiao_se?: unknown; neng_li?: unknown } | null): void {
    dangQianJiaoSe.value = shenFen ? 归一管理角色(shenFen.jiao_se) : null
    nengLieBiao.value = shenFen ? 归一管理能力列表(shenFen.neng_li) : []
  }
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
      zhuangTai.value.cuo_wu_xin_xi = huoQuFanYi('renZheng', 'zhuXiaoShiBai')
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
      sheZhiShenFenShiTu(huanCun)
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

  async function zhiXingDengLu(shouJiHao: string, miMa: string, _jiZhuMiMa = true): Promise<boolean> {
    void _jiZhuMiMa
    zhuangTai.value.deng_lu_zhong = true
    zhuangTai.value.cuo_wu_xin_xi = null
    try {
      const jieGuo = await dengLu(shouJiHao, miMa)
      令牌.value = jieGuo.令牌
      baoCunLingPai(jieGuo.令牌, false)
      baoCunShuaXinLingPai(jieGuo.刷新令牌, jieGuo.刷新令牌ID, false)
      dangQianYongHu.value = jieGuo.用户
      sheZhiShenFenShiTu(jieGuo.用户)
      shenFenYiJiuXu.value = true
      await jiaZaiYongHu()
      return jieGuo.新用户
    } catch (cuoWu: unknown) {
      const xiaoXi = cuoWu instanceof Error ? cuoWu.message : huoQuFanYi('renZheng', 'dengLuShiBai')
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
    _jiZhuMiMa = true,
  ): Promise<boolean> {
    void _jiZhuMiMa
    zhuangTai.value.deng_lu_zhong = true
    zhuangTai.value.cuo_wu_xin_xi = null
    try {
      const jieGuo = await zhuCe(shouJiHao, yanZhengMa, yongHuMing, miMa, tongYiXieYi, chuShengRiQi)
      令牌.value = jieGuo.令牌
      baoCunLingPai(jieGuo.令牌, false)
      baoCunShuaXinLingPai(jieGuo.刷新令牌, jieGuo.刷新令牌ID, false)
      dangQianYongHu.value = jieGuo.用户
      sheZhiShenFenShiTu(jieGuo.用户)
      shenFenYiJiuXu.value = true
      await jiaZaiYongHu()
      track('zhuCeChengGong')
      return true
    } catch (cuoWu: unknown) {
      const xiaoXi = cuoWu instanceof Error ? cuoWu.message : huoQuFanYi('renZheng', 'zhuCeShiBai')
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
      sheZhiShenFenShiTu(shuJu)
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
    sheZhiShenFenShiTu(null)
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
    // YH-088 多标签同步：登出广播，他标签页同登出禁还活着
    try {
      localStorage.setItem('lian-ai-ba-deng-chu', String(Date.now()))
    } catch {
      // 存储不可用忽略
    }
  }

  /** 清空用户状态（不调用后端注销接口，用于 401 令牌过期时的本地清理） */
  function 清空用户状态() {
    dangQianYongHu.value = null
    令牌.value = null
    sheZhiShenFenShiTu(null)
    mingChengKeJian.value = true
    tuiChuQingQiu.value = false
    shenFenYiJiuXu.value = true
    zhuangTai.value = { deng_lu_zhong: false, cuo_wu_xin_xi: null }
    qingChuLingPai()
    qingChuShuaXinLingPai()
    shanChuShuJu('yonghu')
  }

  function sheZhiLingPai(
    令牌值: string,
    shenFen: { jiao_se?: unknown; neng_li?: unknown } | null = null,
    _chiJiu = true,
  ) {
    void _chiJiu
    令牌.value = 令牌值
    baoCunLingPai(令牌值, false)
    sheZhiShenFenShiTu(shenFen)
  }

  /** 资料同步：头像/签名保存成功后刷新本地用户与缓存，保持各端一致 */
  function tongBuZiLiao(canShu: { tou_xiang?: string | null; qian_ming?: string | null }): void {
    if (!dangQianYongHu.value) return
    if (canShu.tou_xiang !== undefined) dangQianYongHu.value.tou_xiang = canShu.tou_xiang
    if (canShu.qian_ming !== undefined) dangQianYongHu.value.qian_ming = canShu.qian_ming
    baoCunShuJu('yonghu', dangQianYongHu.value)
  }

  shuiHeBenDiShenFen()

  // YH-088 多标签同步：监听登出/主题/资料广播，他页退出本页同退
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (shiJian) => {
      if (shiJian.key === 'lian-ai-ba-deng-chu') {
        清空用户状态()
      }
    })
  }

  return {
    dangQianYongHu,
    令牌,
    dangQianJiaoSe,
    nengLieBiao,
    keGuanLiZhiDu,
    keGaoWei,
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
