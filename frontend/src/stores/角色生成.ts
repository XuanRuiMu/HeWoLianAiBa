import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chuangJianHuiHua, queRenJiaoSe, shengChengJiaoSe } from '@/api/聊天'
import { kaiShiTiaoZhan } from '@/api/挑战'
import { huoQuFanYi } from '@/config/translations'
import { 选择形态, type 性别用户形态, type 性别选择形态 } from '@/utils/性别'
import type { ShengChengJiaoSeJieGuo } from '@/types'

export interface 心目中的TA资料 {
  weiXinMing?: string
  zhenShiMing?: string
  nianLing?: string
  tongYongTiShiCi?: string
}

export interface 生成流程资料 {
  xingBie?: 性别用户形态 | null
  muBiaoXingBie?: 性别用户形态 | null
  xingGeXuanZe?: string | null
  yunXuZhaNanZhaNv?: boolean
  随机性格标记?: boolean
  xinMuZhongDeTa?: 心目中的TA资料 | null
  /** 对局模式：普通模式（默认）或挑战模式 */
  moshi?: 'putong' | 'tiaozhan'
  /** 挑战模式：玩家自身性别；缺失即视为资料不完整，不再默认成男性 */
  woDeXingBie?: 性别选择形态 | null
}

export type 生成流程状态 = 'kong_xian' | 'jin_xing_zhong' | 'yi_wan_cheng' | 'shi_bai'

// 进度阶段文案键（全部对应 translations.ts，禁止硬编码）
const 步骤文案键 = [
  'zhengZaiDaKaiShouJi',
  'zhengZaiTaoLunShuiSaoShui',
  'zhengZaiKuoQuan',
  'zhengZaiShengChengRenShe',
  'zhengZaiShengChengKaiChangBai',
] as const

// 各阶段进度百分比，与 步骤文案键 一一对应
const 步骤进度 = [20, 40, 60, 80, 100]

export const 使用角色生成仓库 = defineStore('角色生成', () => {
  const zhuangTai = ref<生成流程状态>('kong_xian')
  const buZhouSuoYin = ref(0)
  const jinDu = ref(0)
  const dangQianWenAnJian = ref<(typeof 步骤文案键)[number] | ''>('')
  const jiaoSeXinXi = ref<ShengChengJiaoSeJieGuo | null>(null)
  const huiHuaId = ref<string | null>(null)
  const cuoWuXinXi = ref('')
  // 用户是否仍停留在“添加微信”加载页。离开页时置 false，
  // 用于决定完成时是否跳转聊天页，以及失败时是显示错误 UI 还是静默记录。
  const zaiJiaZaiYe = ref(false)

  let dingShiQi: ReturnType<typeof setInterval> | null = null

  const dangQianWenAn = computed(() =>
    dangQianWenAnJian.value ? huoQuFanYi('tianJiaWeiXin', dangQianWenAnJian.value) : '',
  )

  function qingChuDingShiQi() {
    if (dingShiQi) {
      clearInterval(dingShiQi)
      dingShiQi = null
    }
  }

  function gengXinBuZhou(suoYin: number) {
    dangQianWenAnJian.value = 步骤文案键[suoYin]
    jinDu.value = 步骤进度[suoYin]
  }

  async function yunXingLiuCheng(ziLiao: 生成流程资料) {
    let suoYin = 0
    gengXinBuZhou(suoYin) // 初始阶段

    // 前置趣味文案随真实等待推进（打开手机 → 讨论谁扫谁 → 扩圈），
    // 封顶 60%，真实“生成人设”请求发出后由真实响应接管，避免纯假进度
    dingShiQi = setInterval(() => {
      if (suoYin < 2) {
        suoYin++
        gengXinBuZhou(suoYin)
      }
    }, 800)

    try {
      // 挑战模式：服务端一次性随机生成并保存角色（MBTI/渣型等全部隐藏），
      // 无需本地选性格、也无需再走确认接口；普通模式保持原三步流程。
      const shiTiaoZhan = ziLiao.moshi === 'tiaozhan'
      let jiaoSe: ShengChengJiaoSeJieGuo
      if (shiTiaoZhan) {
        // FP-13：挑战开赛的两个性别一律过唯一解析入口归一为选择形态，
        // 识别不出（含 sessionStorage 被改坏、旧版本透传资料缺字段）即拒，
        // 不再「缺自身性别默认男、对象性别非 male 即女」地静默定性别
        const wanJiaXuanZe = 选择形态(ziLiao.woDeXingBie)
        const duiXiangXuanZe = 选择形态(ziLiao.muBiaoXingBie)
        if (!wanJiaXuanZe || !duiXiangXuanZe) {
          throw new Error(huoQuFanYi('anQuan', 'shenFenBuHeFa'))
        }
        jiaoSe = await kaiShiTiaoZhan(wanJiaXuanZe, duiXiangXuanZe)
      } else {
        jiaoSe = await shengChengJiaoSe(
          ziLiao.muBiaoXingBie || 'female',
          ziLiao.xingGeXuanZe || 'INFP',
          ziLiao.yunXuZhaNanZhaNv ?? false,
          ziLiao.随机性格标记 ?? false,
          ziLiao.xingBie || undefined,
          ziLiao.xinMuZhongDeTa ?? null,
        )
      }
      jiaoSeXinXi.value = jiaoSe
      qingChuDingShiQi()

      suoYin = 3
      gengXinBuZhou(suoYin) // 生成人设
      const queRenHouJiaoSe = shiTiaoZhan ? jiaoSe : await queRenJiaoSe(jiaoSe)
      const jiaoSeId = queRenHouJiaoSe.id || queRenHouJiaoSe.jiao_se_id || ''
      if (!jiaoSeId) throw new Error('缺少角色ID')

      // 真实末阶段：收到完成信号立即进入完成态（禁止继续演动画）
      suoYin = 4
      gengXinBuZhou(suoYin) // 生成开场白
      const huiHua = await chuangJianHuiHua(jiaoSeId)
      huiHuaId.value = huiHua.id
      // 仅标记完成态，不在此处导航。是否跳转聊天页由「添加微信」组件
      // 依据 zaiJiaZaiYe（用户是否仍在加载页）在 watch 中裁决，保证
      // 「离开页→后台静默完成、不跳转」的架构语义。
      zhuangTai.value = 'yi_wan_cheng'
    } catch (cuoWu) {
      qingChuDingShiQi()
      if (zaiJiaZaiYe.value) {
        // 仍在加载页：展示既有错误 UI
        cuoWuXinXi.value = huoQuFanYi('tianJiaWeiXin', 'shengChengShiBai')
      } else {
        // 已离开：静默记录，不弹全局打扰
         
        console.warn('生成角色流程在用户离开加载页后失败：', cuoWu)
      }
      zhuangTai.value = 'shi_bai'
    }
  }

  // 发起生成流程。防重入：已有进行中流程则不重复发起，仅确保加载页已注册。
  function kaiShiLiuCheng(ziLiao: 生成流程资料) {
    if (zhuangTai.value === 'jin_xing_zhong') {
      zaiJiaZaiYe.value = true
      return
    }
    zhuangTai.value = 'jin_xing_zhong'
    cuoWuXinXi.value = ''
    huiHuaId.value = null
    jiaoSeXinXi.value = null
    zaiJiaZaiYe.value = true
    void yunXingLiuCheng(ziLiao)
  }

  // 注册/注销“加载页活跃”状态（由 添加微信 组件在挂载/卸载时调用）
  function zhuCeJiaZaiYe() {
    zaiJiaZaiYe.value = true
  }

  function xiaoZhuJiaZaiYe() {
    zaiJiaZaiYe.value = false
  }

  return {
    zhuangTai,
    buZhouSuoYin,
    jinDu,
    dangQianWenAnJian,
    dangQianWenAn,
    jiaoSeXinXi,
    huiHuaId,
    cuoWuXinXi,
    zaiJiaZaiYe,
    kaiShiLiuCheng,
    zhuCeJiaZaiYe,
    xiaoZhuJiaZaiYe,
    qingChuDingShiQi,
  }
})
