import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chuangJianHuiHua, queRenJiaoSe, shengChengJiaoSe } from '@/api/聊天'
import { kaiShiTiaoZhan } from '@/api/挑战'
import { huoQuFanYi } from '@/config/翻译表'
import { 选择形态, type 性别用户形态, type 性别选择形态 } from '@/utils/性别'
import type { ShengChengJiaoSeJieGuo } from '@/types/类型定义'

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
  moshi?: 'putong' | 'tiaozhan'
  woDeXingBie?: 性别选择形态 | null
}

export type 生成流程状态 = 'kong_xian' | 'jin_xing_zhong' | 'yi_wan_cheng' | 'shi_bai'

const DENG_DAI_ZHOU_QI_HAO_MIAO = 5000

const 步骤进度 = [20, 40, 60, 80, 100]

export const 使用角色生成仓库 = defineStore('角色生成', () => {
  const zhuangTai = ref<生成流程状态>('kong_xian')
  const buZhouSuoYin = ref(0)
  const jinDu = ref(0)
  const dengDaiYuXuHao = ref(0)
  const touRenTiShi = ref(false)
  const jiaoSeXinXi = ref<ShengChengJiaoSeJieGuo | null>(null)
  const huiHuaId = ref<string | null>(null)
  const cuoWuXinXi = ref('')
  const zaiJiaZaiYe = ref(false)

  let dingShiQi: ReturnType<typeof setInterval> | null = null

  const dengDaiYuLieBiao = computed(() =>
    (huoQuFanYi('tianJiaWeiXin', 'dengDaiYuLieBiao') as unknown as string[]) || [],
  )
  const dangQianWenAn = computed(() => {
    const lieBiao = dengDaiYuLieBiao.value
    if (!lieBiao.length) return ''
    return lieBiao[dengDaiYuXuHao.value % lieBiao.length]
  })

  function qingChuDingShiQi() {
    if (dingShiQi) {
      clearInterval(dingShiQi)
      dingShiQi = null
    }
  }

  function qiDongDengDaiLunHuan() {
    qingChuDingShiQi()
    dengDaiYuXuHao.value = Math.floor(Math.random() * Math.max(1, dengDaiYuLieBiao.value.length))
    dingShiQi = setInterval(() => {
      dengDaiYuXuHao.value += 1
    }, DENG_DAI_ZHOU_QI_HAO_MIAO)
  }

  async function yunXingLiuCheng(ziLiao: 生成流程资料) {
    jinDu.value = 步骤进度[0]
    qiDongDengDaiLunHuan()

    try {
      const shiTiaoZhan = ziLiao.moshi === 'tiaozhan'
      let jiaoSe: ShengChengJiaoSeJieGuo
      if (shiTiaoZhan) {
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

      const queRenHouJiaoSe = shiTiaoZhan ? jiaoSe : await queRenJiaoSe(jiaoSe)
      const jiaoSeId = queRenHouJiaoSe.id || queRenHouJiaoSe.jiao_se_id || ''
      if (!jiaoSeId) throw new Error('缺少角色ID')

      const huiHua = await chuangJianHuiHua(jiaoSeId)
      huiHuaId.value = huiHua.id
      zhuangTai.value = 'yi_wan_cheng'
    } catch (cuoWu) {
      qingChuDingShiQi()
      if (zaiJiaZaiYe.value) {
        cuoWuXinXi.value = huoQuFanYi('tianJiaWeiXin', 'shengChengShiBai')
      } else {
         
        console.warn('生成角色流程在用户离开加载页后失败：', cuoWu)
      }
      zhuangTai.value = 'shi_bai'
    }
  }

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
    dengDaiYuXuHao,
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
