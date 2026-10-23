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

const 步骤文案键 = [
  'zhengZaiDaKaiShouJi',
  'zhengZaiTaoLunShuiSaoShui',
  'zhengZaiKuoQuan',
  'zhengZaiShengChengRenShe',
  'zhengZaiShengChengKaiChangBai',
] as const

const 步骤进度 = [20, 40, 60, 80, 100]

export const 使用角色生成仓库 = defineStore('角色生成', () => {
  const zhuangTai = ref<生成流程状态>('kong_xian')
  const buZhouSuoYin = ref(0)
  const jinDu = ref(0)
  const dangQianWenAnJian = ref<(typeof 步骤文案键)[number] | ''>('')
  const jiaoSeXinXi = ref<ShengChengJiaoSeJieGuo | null>(null)
  const huiHuaId = ref<string | null>(null)
  const cuoWuXinXi = ref('')
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
    gengXinBuZhou(suoYin) 

    dingShiQi = setInterval(() => {
      if (suoYin < 2) {
        suoYin++
        gengXinBuZhou(suoYin)
      }
    }, 800)

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
      qingChuDingShiQi()

      suoYin = 3
      gengXinBuZhou(suoYin) 
      const queRenHouJiaoSe = shiTiaoZhan ? jiaoSe : await queRenJiaoSe(jiaoSe)
      const jiaoSeId = queRenHouJiaoSe.id || queRenHouJiaoSe.jiao_se_id || ''
      if (!jiaoSeId) throw new Error('缺少角色ID')

      suoYin = 4
      gengXinBuZhou(suoYin) 
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
