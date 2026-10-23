import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { 性别, 性格选择, 人设标签 } from '@/types/类型定义'
import { baoCunShuJu, duQuShuJu, shanChuShuJu } from '@/utils/本地存储'
import { 记住密码键, 自动登录键 } from '@/constants/认证键'
import { guiYiNianLing } from '@/utils/输入验证'

const ZI_LIAO_DANG_QIAN_BU_ZHOU_JIAN = 'ziLiaoDangQianBuZhou'
const ZI_LIAO_SHU_JU_JIAN = 'ziLiaoShuJu'
const ZI_LIAO_SHE_ZHI_YI_WAN_CHENG_JIAN = 'ziLiaoSheZhiYiWanCheng'
const JI_ZHU_ZHANG_HAO_JIAN = 'jiZhuZhangHao'
const BAO_CUN_ZHANG_HAO_JIAN = 'baoCunZhangHao'
const BAO_CUN_MI_MA_JIAN = 'baoCunMiMa'

const ZI_LIAO_SHU_JU_BAN_BEN = 2

interface ZiLiaoShuJuNeiRong {
  niCheng: string
  xingBie: 性别 | null
  muBiaoXingBie: 性别 | null
  xingGeXuanZe: 性格选择 | null
  renSheBiaoQian: 人设标签 | null
  yunXuZhaNanZhaNv: boolean
  xinMuZhongDeTa: 心目中的TA表单
}

interface ZiLiaoShuJuXinFeng {
  banBen: number
  shuJu: ZiLiaoShuJuNeiRong
}

function qianYiZiLiaoShuJu(yuanShuJu: unknown): ZiLiaoShuJuNeiRong | null {
  if (typeof yuanShuJu !== 'object' || yuanShuJu === null) return null
  const xinFeng = yuanShuJu as Partial<ZiLiaoShuJuXinFeng>
  if (xinFeng.banBen !== ZI_LIAO_SHU_JU_BAN_BEN) return null
  if (typeof xinFeng.shuJu !== 'object' || xinFeng.shuJu === null) return null
  return xinFeng.shuJu
}

export interface 心目中的TA表单 {
  weiXinMing: string
  zhenShiMing: string
  nianLing: string
  tongYongTiShiCi: string
}

function xinJianXinMuZhongDeTa(): 心目中的TA表单 {
  return {
    weiXinMing: '',
    zhenShiMing: '',
    nianLing: '',
    tongYongTiShiCi: '',
  }
}

export const 使用认证表单仓库 = defineStore('认证表单', () => {
  type MoShiLeiXing = 'dengLu' | 'zhuCe'

  const moShi = ref<MoShiLeiXing>('dengLu')
  const dengLuShouJiHao = ref('')
  const dengLuMiMa = ref('')
  const zhuCeShouJiHao = ref('')
  const zhuCeYanZhengMa = ref('')
  const zhuCeYongHuMing = ref('')
  const zhuCeMiMa = ref('')
  const zhuCeChuShengRiQi = ref('')
  const tongYiXieYi = ref(false)
  const yanZhengMaFaSongShiJian = ref<number | null>(null)
  const jiZhuZhangHao = ref(false)
  const jiZhuMiMa = ref(false)
  const ziDongDengLu = ref(false)

  const ziLiaoDangQianBuZhou = ref(1)
  const ziLiaoShuJu = reactive<ZiLiaoShuJuNeiRong>({
    niCheng: '',
    xingBie: null,
    muBiaoXingBie: null,
    xingGeXuanZe: null,
    renSheBiaoQian: null,
    yunXuZhaNanZhaNv: false,
    xinMuZhongDeTa: xinJianXinMuZhongDeTa(),
  })

  function huoQuXinMuZhongDeTaYouXiao(): 心目中的TA表单 | null {
    const biaoDan = ziLiaoShuJu.xinMuZhongDeTa
    const nianLingWenBen = guiYiNianLing(biaoDan.nianLing)
    const tiShiCiWenBen = biaoDan.tongYongTiShiCi.trim()
    const youRenHeYiXiang =
      biaoDan.weiXinMing.trim() ||
      biaoDan.zhenShiMing.trim() ||
      nianLingWenBen ||
      tiShiCiWenBen
    if (!youRenHeYiXiang) return null
    return {
      weiXinMing: biaoDan.weiXinMing.trim(),
      zhenShiMing: biaoDan.zhenShiMing.trim(),
      nianLing: nianLingWenBen,
      tongYongTiShiCi: tiShiCiWenBen,
    }
  }

  function jiaZaiZiLiaoZhuangTai() {
    const buZhou = duQuShuJu<number>(ZI_LIAO_DANG_QIAN_BU_ZHOU_JIAN, null)
    if (buZhou !== null) ziLiaoDangQianBuZhou.value = buZhou

    let yuanShi: unknown = null
    try {
      const luoDu = localStorage.getItem(`hewolianba_${ZI_LIAO_SHU_JU_JIAN}`)
      if (luoDu !== null) yuanShi = JSON.parse(luoDu)
    } catch {
      yuanShi = null
    }
    if (yuanShi === null) yuanShi = duQuShuJu<unknown>(ZI_LIAO_SHU_JU_JIAN, null)
    const heFaShuJu = qianYiZiLiaoShuJu(yuanShi)
    if (heFaShuJu !== null) {
      Object.assign(ziLiaoShuJu, heFaShuJu)
    }
  }

  function baoCunZiLiaoZhuangTai() {
    baoCunShuJu(ZI_LIAO_DANG_QIAN_BU_ZHOU_JIAN, ziLiaoDangQianBuZhou.value)
    const xinFeng: ZiLiaoShuJuXinFeng = {
      banBen: ZI_LIAO_SHU_JU_BAN_BEN,
      shuJu: ziLiaoShuJu,
    }
    try {
      localStorage.setItem(`hewolianba_${ZI_LIAO_SHU_JU_JIAN}`, JSON.stringify(xinFeng))
    } catch {
      baoCunShuJu(ZI_LIAO_SHU_JU_JIAN, xinFeng)
    }
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
    zhuCeChuShengRiQi.value = ''
    tongYiXieYi.value = false
    yanZhengMaFaSongShiJian.value = null
    // 不清除 jiZhuZhangHao / jiZhuMiMa / ziDongDengLu 勾选状态，由登录页根据持久化数据回填
  }

  function jiaZaiJiZhuSheZhi() {
    const baoCunZhangHao = duQuShuJu<string>(BAO_CUN_ZHANG_HAO_JIAN, null)
    jiZhuZhangHao.value = baoCunZhangHao !== null
    jiZhuMiMa.value = duQuShuJu<boolean>(记住密码键, false) === true
    if (!jiZhuZhangHao.value) jiZhuMiMa.value = false
    ziDongDengLu.value = duQuShuJu<boolean>(自动登录键, false) === true
    if (!jiZhuMiMa.value) ziDongDengLu.value = false
    if (baoCunZhangHao !== null) {
      dengLuShouJiHao.value = baoCunZhangHao
    }
  }

  function sheZhiJiZhuZhangHaoMiMa(
    zhangHao: string,
    _miMa: string,
    jiZhuZhangHaoZhi: boolean,
    jiZhuMiMaZhi: boolean,
    ziDongDengLuZhi = false,
  ) {
    void _miMa
    baoCunShuJu(JI_ZHU_ZHANG_HAO_JIAN, jiZhuZhangHaoZhi)
    baoCunShuJu(记住密码键, jiZhuMiMaZhi)
    baoCunShuJu(自动登录键, ziDongDengLuZhi)
    if (jiZhuZhangHaoZhi) {
      baoCunShuJu(BAO_CUN_ZHANG_HAO_JIAN, zhangHao)
    } else {
      shanChuShuJu(BAO_CUN_ZHANG_HAO_JIAN)
    }
    shanChuShuJu(BAO_CUN_MI_MA_JIAN)
  }

  function qingKongZiLiao() {
    ziLiaoDangQianBuZhou.value = 1
    ziLiaoShuJu.niCheng = ''
    ziLiaoShuJu.xingBie = null
    ziLiaoShuJu.muBiaoXingBie = null
    ziLiaoShuJu.xingGeXuanZe = null
    ziLiaoShuJu.renSheBiaoQian = null
    ziLiaoShuJu.yunXuZhaNanZhaNv = false
    Object.assign(ziLiaoShuJu.xinMuZhongDeTa, xinJianXinMuZhongDeTa())
    baoCunZiLiaoZhuangTai()
    sheZhiZiLiaoSheZhiYiWanCheng(false)
  }

  jiaZaiZiLiaoZhuangTai()
  jiaZaiJiZhuSheZhi()

  return {
    moShi,
    dengLuShouJiHao,
    dengLuMiMa,
    zhuCeShouJiHao,
    zhuCeYanZhengMa,
    zhuCeYongHuMing,
    zhuCeMiMa,
    zhuCeChuShengRiQi,
    tongYiXieYi,
    yanZhengMaFaSongShiJian,
    jiZhuZhangHao,
    jiZhuMiMa,
    ziDongDengLu,
    ziLiaoDangQianBuZhou,
    ziLiaoShuJu,
    qingKongDengLuZhuCe,
    qingKongZiLiao,
    baoCunZiLiaoZhuangTai,
    sheZhiZiLiaoSheZhiYiWanCheng,
    huoQuZiLiaoSheZhiYiWanCheng,
    huoQuXinMuZhongDeTaYouXiao,
    sheZhiJiZhuZhangHaoMiMa,
    jiaZaiJiZhuSheZhi,
  }
})
