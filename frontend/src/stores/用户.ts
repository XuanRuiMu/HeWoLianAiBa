import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { 用户, 登录状态 } from '@/types'
import { 归一管理角色, 归一管理能力列表, type GuanLiJiaoSe, type GuanLiNengLi } from '@/utils/角色能力'
import { dengLu, zhuCe, huoQuYongHuXinXi, zhuXiaoZhangHao } from '@/api/认证'
import {
  chuangJianQianTaiCuoWu,
  归一前台错误,
  type QianTaiCuoWu,
} from '@/utils/前台错误'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
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

export type 认证状态类型 = '冷启动' | '恢复中' | '已认证' | '匿名' | '恢复失败可重试'

export const 使用用户仓库 = defineStore('用户', () => {
  const dangQianYongHu = ref<用户 | null>(null)
  const 令牌 = ref<string | null>(duQuLingPai())
  const 认证状态 = ref<认证状态类型>('冷启动')
  let 认证代次 = 0
  let 恢复控制器: AbortController | null = null
  let 恢复任务: Promise<void> | null = null
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
  const 恢复错误 = ref<QianTaiCuoWu | null>(null)
  const 认证错误 = ref<QianTaiCuoWu | null>(null)

  function sheZhiTuPianShouQuan(zhi: boolean): void {
    tuPianShouQuan.value = zhi
    baoCunShuJu(TU_PIAN_SHOU_QUAN_JIAN, zhi)
  }

  // C3 账号注销：调后端注销接口并清理本地登录态
  async function zhiXingZhuXiao(): Promise<void> {
    const daiCi = kaiShiXinDai()
    恢复任务 = null
    zhuangTai.value.deng_lu_zhong = true
    zhuangTai.value.cuo_wu_xin_xi = null
    try {
      恢复控制器 = new AbortController()
      await zhuXiaoZhangHao({ signal: 恢复控制器.signal })
      if (!isDaiCiYouXiao(daiCi)) return
      sheZhiTuPianShouQuan(false)
      tuiChuDengLu()
    } catch (错误: unknown) {
      if (!isDaiCiYouXiao(daiCi)) return
      const zhengChangHua = 归一前台错误(错误)
      认证错误.value = zhengChangHua
      zhuangTai.value.cuo_wu_xin_xi = zhengChangHua.yingXiang
      throw zhengChangHua
    } finally {
      if (isDaiCiYouXiao(daiCi)) {
        zhuangTai.value.deng_lu_zhong = false
        恢复控制器 = null
      }
    }
  }

  const shenFenYiJiuXu = ref(false)

  function qingChuHuanCunYongHu(): void {
    try {
      shanChuShuJu('yonghu')
    } catch {
      return
    }
  }

  function shuiHeBenDiShenFen() {
    dangQianYongHu.value = null
    sheZhiShenFenShiTu(null)
    shenFenYiJiuXu.value = !令牌.value
    qingChuHuanCunYongHu()
  }

  function isDaiCiYouXiao(dai: number): boolean {
    return dai === 认证代次
  }

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
    const token = 令牌快照 ?? 令牌.value
    if (!token) {
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
        (令牌.value && 令牌.value !== token) ||
        (cunChuToken && cunChuToken !== token)
      ) {
        if (cunChuToken) 令牌.value = cunChuToken
        认证状态.value = '恢复失败可重试'
        shenFenYiJiuXu.value = false
        恢复错误.value = chuangJianQianTaiCuoWu({
          code: QIAN_TAI_DAI_MA.AUTH_TOKEN_INVALID,
          retryable: true,
        })
        return false
      }
      令牌.value = cunChuToken ?? token
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
        清空用户状态(token)
        return false
      }
      if (baoLiuChengGong) return true
      认证状态.value = '恢复失败可重试'
      shenFenYiJiuXu.value = false
      恢复错误.value = zhengChangHua.xianShi ? zhengChangHua : null
      return false
    }
  }

  async function queBaoShenFenJiuXu(force = false): Promise<void> {
    令牌.value = duQuLingPai()
    if (恢复任务 && !force) return 恢复任务
    if (force) {
      kaiShiXinDai()
      恢复任务 = null
    }
    const token = 令牌.value
    if (!token) {
      const daiCi = kaiShiXinDai()
      if (isDaiCiYouXiao(daiCi)) {
        认证状态.value = '匿名'
        shenFenYiJiuXu.value = true
      }
      return
    }
    const daiCi = kaiShiXinDai()
    恢复控制器 = new AbortController()
    认证状态.value = '恢复中'
    shenFenYiJiuXu.value = false
    恢复错误.value = null
    const task = jiaZaiYongHu(daiCi, token)
    const taskDeng = task.then(() => undefined)
    恢复任务 = taskDeng
    void taskDeng.finally(() => {
      if (恢复任务 === taskDeng) {
        恢复任务 = null
        恢复控制器 = null
      }
    })
    return taskDeng
  }

  function 取消待处理认证(): void {
    const youDaiChu = zhuangTai.value.deng_lu_zhong || 恢复任务 !== null
    kaiShiXinDai()
    恢复任务 = null
    if (youDaiChu) zhuangTai.value.deng_lu_zhong = false
  }

  async function zhiXingDengLu(shouJiHao: string, miMa: string, _jiZhuMiMa = true): Promise<boolean> {
    void _jiZhuMiMa
    const daiCi = kaiShiXinDai()
    恢复任务 = null
    恢复控制器 = new AbortController()
    zhuangTai.value.deng_lu_zhong = true
    zhuangTai.value.cuo_wu_xin_xi = null
    认证错误.value = null
    try {
      const jieGuo = await dengLu(shouJiHao, miMa, { signal: 恢复控制器.signal })
      if (!isDaiCiYouXiao(daiCi)) return false
      令牌.value = jieGuo.令牌
      baoCunLingPai(jieGuo.令牌, false)
      baoCunShuaXinLingPai(jieGuo.刷新令牌, jieGuo.刷新令牌ID, false)
      dangQianYongHu.value = jieGuo.用户
      sheZhiShenFenShiTu(jieGuo.用户)
      shenFenYiJiuXu.value = false
      认证状态.value = '恢复中'
      const authenticated = await jiaZaiYongHu(daiCi, jieGuo.令牌, true)
      if (authenticated) {
        认证状态.value = '已认证'
        shenFenYiJiuXu.value = true
        return isDaiCiYouXiao(daiCi) ? jieGuo.新用户 : false
      }
      if (shiFouMingMing(认证状态.value)) throw new Error(huoQuFanYi('renZheng', 'dengLuShiBai'))
      if (!isDaiCiYouXiao(daiCi)) return false
      throw new Error(huoQuFanYi('renZheng', 'dengLuShiBai'))
    } catch (cuoWu: unknown) {
      if (!isDaiCiYouXiao(daiCi) && !shiFouMingMing(认证状态.value)) return false
      const zhengChangHua = 归一前台错误(cuoWu)
      认证错误.value = zhengChangHua
      zhuangTai.value.cuo_wu_xin_xi = zhengChangHua.yingXiang
      throw zhengChangHua
    } finally {
      if (isDaiCiYouXiao(daiCi)) {
        zhuangTai.value.deng_lu_zhong = false
        恢复控制器 = null
      }
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
    const daiCi = kaiShiXinDai()
    恢复任务 = null
    恢复控制器 = new AbortController()
    zhuangTai.value.deng_lu_zhong = true
    zhuangTai.value.cuo_wu_xin_xi = null
    认证错误.value = null
    try {
      const jieGuo = await zhuCe(
        shouJiHao,
        yanZhengMa,
        yongHuMing,
        miMa,
        tongYiXieYi,
        chuShengRiQi,
        { signal: 恢复控制器.signal },
      )
      if (!isDaiCiYouXiao(daiCi)) return false
      令牌.value = jieGuo.令牌
      baoCunLingPai(jieGuo.令牌, false)
      baoCunShuaXinLingPai(jieGuo.刷新令牌, jieGuo.刷新令牌ID, false)
      dangQianYongHu.value = jieGuo.用户
      sheZhiShenFenShiTu(jieGuo.用户)
      shenFenYiJiuXu.value = false
      认证状态.value = '恢复中'
      const authenticated = await jiaZaiYongHu(daiCi, jieGuo.令牌, true)
      if (!authenticated) {
        if (shiFouMingMing(认证状态.value)) throw new Error(huoQuFanYi('renZheng', 'zhuCeShiBai'))
        if (!isDaiCiYouXiao(daiCi)) return false
        throw new Error(huoQuFanYi('renZheng', 'zhuCeShiBai'))
      }
      认证状态.value = '已认证'
      shenFenYiJiuXu.value = true
      if (!isDaiCiYouXiao(daiCi)) return false
      track('zhuCeChengGong')
      return true
    } catch (cuoWu: unknown) {
      if (!isDaiCiYouXiao(daiCi) && !shiFouMingMing(认证状态.value)) return false
      const zhengChangHua = 归一前台错误(cuoWu)
      认证错误.value = zhengChangHua
      zhuangTai.value.cuo_wu_xin_xi = zhengChangHua.yingXiang
      throw zhengChangHua
    } finally {
      if (isDaiCiYouXiao(daiCi)) {
        zhuangTai.value.deng_lu_zhong = false
        恢复控制器 = null
      }
    }
  }

  function qingQiuTuiChu() {
    tuiChuQingQiu.value = true
  }

  function tuiChuDengLu() {
    kaiShiXinDai()
    恢复任务 = null
    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.qingKongZhuangTai()
    dangQianYongHu.value = null
    令牌.value = null
    sheZhiShenFenShiTu(null)
    mingChengKeJian.value = true
    tuiChuQingQiu.value = false
    shenFenYiJiuXu.value = true
    认证状态.value = '匿名'
    恢复错误.value = null
    认证错误.value = null
    zhuangTai.value = { deng_lu_zhong: false, cuo_wu_xin_xi: null }
    qingChuLingPai()
    qingChuShuaXinLingPai()
    qingChuHuanCunYongHu()
    const 认证表单仓库 = 使用认证表单仓库()
    认证表单仓库.qingKongDengLuZhuCe()
    认证表单仓库.qingKongZiLiao()
    try {
      localStorage.setItem('lian-ai-ba-deng-chu', String(Date.now()))
    } catch {
      return
    }
  }

  function 清空用户状态(令牌快照?: string | null): boolean {
    const cunChuToken = duQuLingPai()
    if (
      令牌快照 !== undefined &&
      ((令牌.value !== null && 令牌.value !== 令牌快照) ||
        (cunChuToken !== null && cunChuToken !== 令牌快照))
    ) {
      return false
    }
    kaiShiXinDai()
    恢复任务 = null
    dangQianYongHu.value = null
    令牌.value = null
    sheZhiShenFenShiTu(null)
    mingChengKeJian.value = true
    tuiChuQingQiu.value = false
    shenFenYiJiuXu.value = true
    认证状态.value = '匿名'
    恢复错误.value = null
    认证错误.value = null
    zhuangTai.value = { deng_lu_zhong: false, cuo_wu_xin_xi: null }
    qingChuLingPai()
    qingChuShuaXinLingPai()
    qingChuHuanCunYongHu()
    return true
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
    认证状态,
    dangQianJiaoSe,
    nengLieBiao,
    keGuanLiZhiDu,
    keGaoWei,
    mingChengKeJian,
    tuiChuQingQiu,
    zhuangTai,
    恢复错误,
    认证错误,
    tuPianShouQuan,
    shenFenYiJiuXu,
    zhiXingDengLu,
    zhiXingZhuCe,
    jiaZaiYongHu,
    queBaoShenFenJiuXu,
    取消待处理认证,
    qingQiuTuiChu,
    tuiChuDengLu,
    sheZhiLingPai,
    sheZhiTuPianShouQuan,
    tongBuZiLiao,
    zhiXingZhuXiao,
    清空用户状态,
  }
})
