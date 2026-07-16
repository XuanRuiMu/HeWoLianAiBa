import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { 性别, 性格选择, 人设标签 } from '@/types'
import { baoCunShuJu, duQuShuJu } from '@/utils/storage'

const ZI_LIAO_DANG_QIAN_BU_ZHOU_JIAN = 'ziLiaoDangQianBuZhou'
const ZI_LIAO_SHU_JU_JIAN = 'ziLiaoShuJu'
const ZI_LIAO_SHE_ZHI_YI_WAN_CHENG_JIAN = 'ziLiaoSheZhiYiWanCheng'

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

  function jiaZaiZiLiaoZhuangTai() {
    const buZhou = duQuShuJu<number>(ZI_LIAO_DANG_QIAN_BU_ZHOU_JIAN, null)
    if (buZhou !== null) ziLiaoDangQianBuZhou.value = buZhou

    const shuJu = duQuShuJu<typeof ziLiaoShuJu>(ZI_LIAO_SHU_JU_JIAN, null)
    if (shuJu !== null) {
      Object.assign(ziLiaoShuJu, shuJu)
    }
  }

  function baoCunZiLiaoZhuangTai() {
    baoCunShuJu(ZI_LIAO_DANG_QIAN_BU_ZHOU_JIAN, ziLiaoDangQianBuZhou.value)
    baoCunShuJu(ZI_LIAO_SHU_JU_JIAN, ziLiaoShuJu)
  }

  function huoQuZiLiaoSheZhiYiWanCheng(): boolean {
    return duQuShuJu<boolean>(ZI_LIAO_SHE_ZHI_YI_WAN_CHENG_JIAN, false) === true
  }

  function sheZhiZiLiaoSheZhiYiWanCheng(wanCheng: boolean) {
    baoCunShuJu(ZI_LIAO_SHE_ZHI_YI_WAN_CHENG_JIAN, wanCheng)
  }

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
    baoCunZiLiaoZhuangTai()
    sheZhiZiLiaoSheZhiYiWanCheng(false)
  }

  jiaZaiZiLiaoZhuangTai()

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
    baoCunZiLiaoZhuangTai,
    sheZhiZiLiaoSheZhiYiWanCheng,
    huoQuZiLiaoSheZhiYiWanCheng,
  }
})
