import { defineStore } from 'pinia'
import { ref } from 'vue'
import { chuangJianHuiHua, queRenJiaoSe, shengChengJiaoSe } from '@/api/聊天'
import { kaiShiTiaoZhan } from '@/api/挑战'
import { huoQuFanYi } from '@/config/翻译表'
import { 预加载聊天页 } from '@/composables/use聊天预加载'
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

export const 使用角色生成仓库 = defineStore('角色生成', () => {
  const zhuangTai = ref<生成流程状态>('kong_xian')
  const jinDu = ref(0)
  const touRenTiShi = ref(false)
  const dangQianZiLiao = ref<生成流程资料 | null>(null)
  const jiaoSeXinXi = ref<ShengChengJiaoSeJieGuo | null>(null)
  const huiHuaId = ref<string | null>(null)
  const cuoWuXinXi = ref('')
  const zaiJiaZaiYe = ref(false)

  const 完成等待者 = new Set<() => void>()

  function 通知完成() {
    for (const 结束 of [...完成等待者]) 结束()
    完成等待者.clear()
  }

  function 等待完成(): Promise<生成流程状态> {
    if (zhuangTai.value !== 'jin_xing_zhong') return Promise.resolve(zhuangTai.value)
    return new Promise((结束) => {
      完成等待者.add(() => 结束(zhuangTai.value))
    })
  }

  function tiShengJinDu(zhi: number) {
    if (zhi > jinDu.value) jinDu.value = zhi
  }

  async function yunXingLiuCheng(ziLiao: 生成流程资料) {
    jinDu.value = 10
    touRenTiShi.value = false

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
      tiShengJinDu(32)

      const queRenHouJiaoSe = shiTiaoZhan ? jiaoSe : await queRenJiaoSe(jiaoSe)
      if (!shiTiaoZhan) jiaoSeXinXi.value = queRenHouJiaoSe
      touRenTiShi.value = queRenHouJiaoSe.yao_kai_kou === true
      tiShengJinDu(52)
      const jiaoSeId = queRenHouJiaoSe.id || queRenHouJiaoSe.jiao_se_id || ''
      if (!jiaoSeId) throw new Error('缺少角色ID')

      const huiHua = await chuangJianHuiHua(jiaoSeId)
      huiHuaId.value = huiHua.id
      tiShengJinDu(64)
      try {
        const yuJiaZaiChengGong = await 预加载聊天页(huiHua.id, (baiFenShu) => {
          tiShengJinDu(64 + Math.round(baiFenShu * 0.36))
        })
        if (!yuJiaZaiChengGong) console.warn('聊天页预加载未完成，进入聊天页后继续加载')
      } catch {
        console.warn('聊天页预加载异常，进入聊天页后继续加载')
      }
      if (zaiJiaZaiYe.value) tiShengJinDu(100)
      zhuangTai.value = 'yi_wan_cheng'
    } catch (cuoWu) {
      if (zaiJiaZaiYe.value) {
        cuoWuXinXi.value = huoQuFanYi('tianJiaWeiXin', 'shengChengShiBai')
      } else {
        console.warn('生成角色流程在用户离开加载页后失败：', cuoWu)
      }
      touRenTiShi.value = false
      zhuangTai.value = 'shi_bai'
    }
    通知完成()
  }

  function kaiShiLiuCheng(ziLiao: 生成流程资料) {
    if (zhuangTai.value === 'jin_xing_zhong') {
      zaiJiaZaiYe.value = true
      return
    }
    zhuangTai.value = 'jin_xing_zhong'
    dangQianZiLiao.value = ziLiao
    cuoWuXinXi.value = ''
    jinDu.value = 0
    touRenTiShi.value = false
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
    jinDu,
    touRenTiShi,
    dangQianZiLiao,
    jiaoSeXinXi,
    huiHuaId,
    cuoWuXinXi,
    zaiJiaZaiYe,
    kaiShiLiuCheng,
    等待完成,
    zhuCeJiaZaiYe,
    xiaoZhuJiaZaiYe,
  }
})
