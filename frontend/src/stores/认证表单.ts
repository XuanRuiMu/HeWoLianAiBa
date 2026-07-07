import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { 性别, 性格选择, 人设标签 } from '@/types'

export const 使用认证表单仓库 = defineStore('认证表单', () => {
  type MoShiLeiXing = 'dengLu' | 'zhuCe'

  const moShi = ref<MoShiLeiXing>('dengLu')
  const dengLuShouJiHao = ref('')
  const dengLuMiMa = ref('')
  const zhuCeShouJiHao = ref('')
  const zhuCeYanZhengMa = ref('')
  const zhuCeYongHuMing = ref('')
  const zhuCeMiMa = ref('')
  const tongYiXieYi = ref(false)
  const yanZhengMaFaSongShiJian = ref<number | null>(null)

  const ziLiaoDangQianBuZhou = ref(1)
  const ziLiaoShuJu = reactive({
    niCheng: '',
    xingBie: null as 性别 | null,
    muBiaoXingBie: null as 性别 | null,
    xingGeXuanZe: null as 性格选择 | null,
    renSheBiaoQian: null as 人设标签 | null,
    yunXuZhaNanZhaNv: false,
  })

  function qingKongDengLuZhuCe() {
    moShi.value = 'dengLu'
    dengLuShouJiHao.value = ''
    dengLuMiMa.value = ''
    zhuCeShouJiHao.value = ''
    zhuCeYanZhengMa.value = ''
    zhuCeYongHuMing.value = ''
    zhuCeMiMa.value = ''
    tongYiXieYi.value = false
    yanZhengMaFaSongShiJian.value = null
  }

  function qingKongZiLiao() {
    ziLiaoDangQianBuZhou.value = 1
    ziLiaoShuJu.niCheng = ''
    ziLiaoShuJu.xingBie = null
    ziLiaoShuJu.muBiaoXingBie = null
    ziLiaoShuJu.xingGeXuanZe = null
    ziLiaoShuJu.renSheBiaoQian = null
    ziLiaoShuJu.yunXuZhaNanZhaNv = false
  }

  return {
    moShi,
    dengLuShouJiHao,
    dengLuMiMa,
    zhuCeShouJiHao,
    zhuCeYanZhengMa,
    zhuCeYongHuMing,
    zhuCeMiMa,
    tongYiXieYi,
    yanZhengMaFaSongShiJian,
    ziLiaoDangQianBuZhou,
    ziLiaoShuJu,
    qingKongDengLuZhuCe,
    qingKongZiLiao,
  }
})
