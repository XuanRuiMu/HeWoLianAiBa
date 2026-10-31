import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { 用户, 登录状态 } from '@/types/类型定义'
import { 归一管理角色, 归一管理能力列表, type GuanLiJiaoSe, type GuanLiNengLi } from '@/utils/角色能力'
import { dengLu, zhuCe, huoQuYongHuXinXi, zhuXiaoZhangHao } from '@/api/认证'
import {
  chuangJianQianTaiCuoWu,
  归一前台错误,
  type QianTaiCuoWu,
} from '@/utils/前台错误'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import { huoQuFanYi } from '@/config/翻译表'
import { 主页入场 } from '@/config/设计令牌'
import { track } from '@/utils/埋点'
import { baoCunShuJu, duQuShuJu, shanChuShuJu } from '@/utils/本地存储'
import {
  duQuLingPai,
  baoCunLingPai,
  qingChuLingPai,
  baoCunShuaXinLingPai,
  qingChuShuaXinLingPai,
  shiChiJiuHuiHua,
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
  const dangQianJiaoSe = ref<GuanLiJiaoSe | null>(null)
  const nengLieBiao = ref<GuanLiNengLi[]>([])
  const keGuanLiZhiDu = computed(() => nengLieBiao.value.includes('cha_kan'))
  const keGaoWei = computed(() => nengLieBiao.value.includes('gao_we'))
  const mingChengKeJian = ref(true)
  const tuiChuQingQiu = ref(false)
  const 主页入场序号 = ref(5)

  let 主页入场定时器们: ReturnType<typeof setTimeout>[] = []

  function 清除主页入场定时器(): void {
    主页入场定时器们.forEach((定时器) => clearTimeout(定时器))
    主页入场定时器们 = []
  }

  function qiDongZhuYeRuChang(): void {
    清除主页入场定时器()
    主页入场序号.value = 0
    for (let 序 = 1; 序 <= 主页入场.元素总数; 序 += 1) {
      const 延迟 = 主页入场.首元素延迟 + (序 - 1) * 主页入场.元素间隔
      主页入场定时器们.push(setTimeout(() => { 主页入场序号.value = 序 }, 延迟))
    }
  }

  function zhongZhiZhuYeRuChang(): void {
    清除主页入场定时器()
    主页入场序号.value = 0
  }

  function sheZhiShenFenShiTu(shenFen: { jiao_se?: unknown; neng_li?: unknown } | null): void {
    dangQianJiaoSe.value = shenFen ? 归一管理角色(shenFen.jiao_se) : null
    nengLieBiao.value = shenFen ? 归一管理能力列表(shenFen.neng_li) : []
  }
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
          code: QIAN_TAI_DAI_MA.AUTH_TOKEN_INVALID,
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
        清空用户状态(lingPaiZhi)
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
    const lingPaiZhi = 令牌.value
    if (!lingPaiZhi) {
      const daiCi = kaiShiXinDai()
      if (isDaiCiYouXiao(daiCi)) {
        认证状态.value = '匿名'
        shenFenYiJiuXu.value = true
      }
      return
    }
    const daiCi = kaiShiXinDai()
    恢复控制器 = new AbortController()
    const anJing = 认证状态.value === '已认证'
    if (!anJing) {
      认证状态.value = '恢复中'
      shenFenYiJiuXu.value = false
      恢复错误.value = null
    }
    const renWu = jiaZaiYongHu(daiCi, lingPaiZhi, anJing)
    const taskDeng = renWu.then(() => undefined)
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
    恢复控制器?.abort()
    恢复控制器 = null
    恢复任务 = null
    if (youDaiChu) zhuangTai.value.deng_lu_zhong = false
  }

  async function zhiXingDengLu(shouJiHao: string, miMa: string, ziDongDengLu = false): Promise<boolean> {
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
      baoCunLingPai(jieGuo.令牌, ziDongDengLu)
      baoCunShuaXinLingPai(jieGuo.刷新令牌, jieGuo.刷新令牌ID, ziDongDengLu)
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
    jingWai = false,
  ): Promise<boolean> {
    void _jiZhuMiMa
    const daiCi = kaiShiXinDai()
    恢复任务 = null
    恢复控制器 = new AbortController()
    zhuangTai.value.deng_lu_zhong = true
    zhuangTai.value.cuo_wu_xin_xi = null
    认证错误.value = null
    try {
      await zhuCe(
        shouJiHao,
        yanZhengMa,
        yongHuMing,
        miMa,
        tongYiXieYi,
        chuShengRiQi,
        { signal: 恢复控制器.signal },
        jingWai,
      )
      if (!isDaiCiYouXiao(daiCi)) return false
      if (令牌.value || duQuLingPai()) 清空用户状态()
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
  ) {
    令牌.value = 令牌值
    baoCunLingPai(令牌值, shiChiJiuHuiHua())
    sheZhiShenFenShiTu(shenFen)
  }

  function tongBuZiLiao(canShu: { tou_xiang?: string | null; qian_ming?: string | null; mo_ren_xing_bie?: 用户['mo_ren_xing_bie']; mu_biao_xing_bie?: 用户['mu_biao_xing_bie'] }): void {
    if (!dangQianYongHu.value) return
    if (canShu.tou_xiang !== undefined) dangQianYongHu.value.tou_xiang = canShu.tou_xiang
    if (canShu.qian_ming !== undefined) dangQianYongHu.value.qian_ming = canShu.qian_ming
    if (canShu.mo_ren_xing_bie !== undefined) dangQianYongHu.value.mo_ren_xing_bie = canShu.mo_ren_xing_bie
    if (canShu.mu_biao_xing_bie !== undefined) dangQianYongHu.value.mu_biao_xing_bie = canShu.mu_biao_xing_bie
  }

  shuiHeBenDiShenFen()

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
    主页入场序号,
    zhuangTai,
    恢复错误,
    认证错误,
    tuPianShouQuan,
    shenFenYiJiuXu,
    zhiXingDengLu,
    zhiXingZhuCe,
    jiaZaiYongHu,
    queBaoShenFenJiuXu,
    zhongZhiZhuYeRuChang,
  qiDongZhuYeRuChang,
  清除主页入场定时器,
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
