import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { 性别, 性格选择, 人设标签 } from '@/types/类型定义'
import { baoCunShuJu, duQuShuJu, shanChuShuJu } from '@/utils/本地存储'
import { 记住密码键, 自动登录键 } from '@/constants/认证键'
import { guiYiNianLing } from '@/utils/输入验证'
import { DaLuQuHao, fenJieGuoJiHao, guiYiQuHao, panDingBenDiHao } from '@/utils/手机号'

const ZiLiaoDangQianBuZhouJian = 'ziLiaoDangQianBuZhou'
const ZiLiaoShuJuJian = 'ziLiaoShuJu'
const ZiLiaoSheZhiYiWanChengJian = 'ziLiaoSheZhiYiWanCheng'
const BaoCunZhangHaoJian = 'baoCunZhangHao'
const BaoCunZhangHaoBanBen = 1

const ZiLiaoShuJuBanBen = 2

interface JiZhuZhangHaoJiLu {
  banBen: number
  quHao: string
  benDiHao: string
}

function duQuJiZhuZhangHao(): { quHao: string; benDiHao: string } | null {
  const yuanShi = duQuShuJu<unknown>(BaoCunZhangHaoJian, null)
  if (yuanShi === null) return null
  if (typeof yuanShi === 'string') {
    const chaiFen = fenJieGuoJiHao(yuanShi)
    if (chaiFen !== null) {
      baoCunShuJu(BaoCunZhangHaoJian, {
        banBen: BaoCunZhangHaoBanBen,
        ...chaiFen,
      } satisfies JiZhuZhangHaoJiLu)
      return chaiFen
    }
    shanChuShuJu(BaoCunZhangHaoJian)
    return null
  }
  if (typeof yuanShi === 'object') {
    const jiLu = yuanShi as Partial<JiZhuZhangHaoJiLu>
    if (jiLu.banBen === BaoCunZhangHaoBanBen) {
      const quHao = guiYiQuHao(jiLu.quHao)
      const benDiHao = String(jiLu.benDiHao ?? '').replace(/\D/g, '')
      if (benDiHao !== '' && panDingBenDiHao(quHao, benDiHao).heFa) return { quHao, benDiHao }
    }
  }
  shanChuShuJu(BaoCunZhangHaoJian)
  return null
}

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
  if (xinFeng.banBen !== ZiLiaoShuJuBanBen) return null
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
  const dengLuQuHao = ref(DaLuQuHao)
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
    const buZhou = duQuShuJu<number>(ZiLiaoDangQianBuZhouJian, null)
    if (buZhou !== null) ziLiaoDangQianBuZhou.value = buZhou

    let yuanShi: unknown = null
    try {
      const luoDu = localStorage.getItem(`hewolianba_${ZiLiaoShuJuJian}`)
      if (luoDu !== null) yuanShi = JSON.parse(luoDu)
    } catch {
      yuanShi = null
    }
    if (yuanShi === null) yuanShi = duQuShuJu<unknown>(ZiLiaoShuJuJian, null)
    const heFaShuJu = qianYiZiLiaoShuJu(yuanShi)
    if (heFaShuJu !== null) {
      Object.assign(ziLiaoShuJu, heFaShuJu)
    }
  }

  function baoCunZiLiaoZhuangTai() {
    baoCunShuJu(ZiLiaoDangQianBuZhouJian, ziLiaoDangQianBuZhou.value)
    const xinFeng: ZiLiaoShuJuXinFeng = {
      banBen: ZiLiaoShuJuBanBen,
      shuJu: ziLiaoShuJu,
    }
    try {
      localStorage.setItem(`hewolianba_${ZiLiaoShuJuJian}`, JSON.stringify(xinFeng))
    } catch {
      baoCunShuJu(ZiLiaoShuJuJian, xinFeng)
    }
  }

  function huoQuZiLiaoSheZhiYiWanCheng(): boolean {
    return duQuShuJu<boolean>(ZiLiaoSheZhiYiWanChengJian, false) === true
  }

  function sheZhiZiLiaoSheZhiYiWanCheng(wanCheng: boolean) {
    baoCunShuJu(ZiLiaoSheZhiYiWanChengJian, wanCheng)
  }

  function qingKongDengLuZhuCe() {
    moShi.value = 'dengLu'
    dengLuQuHao.value = DaLuQuHao
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
    const jiLu = duQuJiZhuZhangHao()
    jiZhuZhangHao.value = jiLu !== null
    jiZhuMiMa.value = duQuShuJu<boolean>(记住密码键, false) === true
    if (!jiZhuZhangHao.value) jiZhuMiMa.value = false
    ziDongDengLu.value = duQuShuJu<boolean>(自动登录键, false) === true
    if (!jiZhuMiMa.value) ziDongDengLu.value = false
    if (jiLu === null || dengLuShouJiHao.value !== '') return
    dengLuQuHao.value = jiLu.quHao
    dengLuShouJiHao.value = jiLu.benDiHao
  }

  function gengXinJiZhuZhangHao(zhi: boolean) {
    jiZhuZhangHao.value = zhi
    if (!zhi) {
      jiZhuMiMa.value = false
      ziDongDengLu.value = false
    }
  }

  function gengXinJiZhuMiMa(zhi: boolean) {
    jiZhuMiMa.value = zhi
    if (zhi) {
      jiZhuZhangHao.value = true
    } else {
      ziDongDengLu.value = false
    }
  }

  function gengXinZiDongDengLu(zhi: boolean) {
    ziDongDengLu.value = zhi
    if (zhi) {
      jiZhuZhangHao.value = true
      jiZhuMiMa.value = true
    }
  }

  function sheZhiJiZhuZhangHaoMiMa(
    jiZhuZhangHaoZhi: boolean,
    jiZhuMiMaZhi: boolean,
    ziDongDengLuZhi = false,
  ) {
    baoCunShuJu(记住密码键, jiZhuMiMaZhi)
    baoCunShuJu(自动登录键, ziDongDengLuZhi)
    const quHao = guiYiQuHao(dengLuQuHao.value)
    const benDiHao = dengLuShouJiHao.value.replace(/\D/g, '')
    if (!jiZhuZhangHaoZhi || !panDingBenDiHao(quHao, benDiHao).heFa) {
      shanChuShuJu(BaoCunZhangHaoJian)
      return
    }
    const jiLu: JiZhuZhangHaoJiLu = {
      banBen: BaoCunZhangHaoBanBen,
      quHao,
      benDiHao,
    }
    baoCunShuJu(BaoCunZhangHaoJian, jiLu)
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
    dengLuQuHao,
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
    gengXinJiZhuZhangHao,
    gengXinJiZhuMiMa,
    gengXinZiDongDengLu,
  }
})
