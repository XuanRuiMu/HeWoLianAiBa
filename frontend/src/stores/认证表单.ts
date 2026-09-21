import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { 性别, 性格选择, 人设标签 } from '@/types'
import { baoCunShuJu, duQuShuJu, shanChuShuJu } from '@/utils/storage'
import { 记住密码键, 自动登录键 } from '@/constants/auth'
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
  /** 年龄输入框为 number 类型时 v-model 可能产出数字，统一按字符串处理，0-100整数可选 */
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
  // C5 未成年人保护：注册强制采集出生日期
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

  // 「心目中的TA」是否填写了任意一项（用于向导展示与透传判断）
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

    // 与保存侧对称：优先裸读业务信封（测试与外部写入走裸localStorage），回退统一存储层解包
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
    // YH-091 版本信封经统一存储层二次包装：裸读回双层信封，需解一层再验业务版本
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
    // 记住密码 = 持久化登录令牌（localStorage），绝不明文存密码；
    // 不勾选则令牌仅放 sessionStorage，关浏览器即失效
    jiZhuMiMa.value = duQuShuJu<boolean>(记住密码键, false) === true
    if (!jiZhuZhangHao.value) jiZhuMiMa.value = false
    // 自动登录是记住密码的子选项：仅记住密码勾选时有效
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
    // 记住密码只决定令牌持久层级，明文密码禁止写入任何存储
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
