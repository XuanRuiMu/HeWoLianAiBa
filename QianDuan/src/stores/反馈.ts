import { defineStore } from 'pinia'
import { ref } from 'vue'
import { huoQuWoDeFanKui, tiJiaoFanKui } from '@/api/意见反馈'
import type { BiaoQingXiang } from '@/api/表情'
import { huoQuFanYi } from '@/config/翻译表'
import { 归一前台错误 } from '@/utils/前台错误'
import { shiBenDiLinShiXiaoXi } from '@/utils/消息内容块'
import type {
  BiaoQingBaoYinYongKuaiZhao,
  FanKuiSheBeiXinXi,
  FanKuiTiJiao,
  FanKuiXiaoXiLeiXing,
  WoDeFanKuiXiang,
  XiaoXiYinYongKuaiZhao,
} from '@/types/类型定义'

export const FuJianXiaoXiShangXian = 10
export const BiaoQingXuanZeShangXian = 5
export const WoDeFanKuiMeiYeTiaoShu = 20
export const FanKuiZhengWenZuiShaoZiShu = 10
export const FanKuiZhengWenZuiDuoZiShu = 1000
export const FanKuiBiaoQianShangXian = 5
export const FanKuiZhaiYaoZuiDaZiFu = 200

export type FuJianQieHuanJieGuo = 'tianJia' | 'yiChu' | 'yiMan' | 'wuXiao'

export interface FanKuiKeXuanXiaoXi {
  id: string
  lei_xing: string
  nei_rong?: string
  fa_song_zhe_lei_xing?: string
  yi_che_hui?: boolean
  shi_jian_chuo?: number
  mei_ti_url?: string | null
  ben_di_yu_lan_url?: string | null
  mei_ti_shi_chang_hao_miao?: number | null
}

export type XiaoXiLaiYuanHuoQu = () => readonly FanKuiKeXuanXiaoXi[] | null

interface KuaiZhaoLaiYuanXiaoXi {
  id?: unknown
  ke_hu_duan_id?: unknown
  nei_rong?: unknown
  lei_xing?: unknown
  fa_song_zhe_lei_xing?: unknown
  shi_jian_chuo?: unknown
  mei_ti_url?: unknown
  mei_ti_shi_chang_hao_miao?: unknown
  yi_che_hui?: unknown
}

const KuaiZhaoLeiXingBiao: Record<string, FanKuiXiaoXiLeiXing> = {
  wenben: 'wenben',
  tuPian: 'tuPian',
  biaoQingBao: 'biaoQingBao',
  yuYin: 'yuYin',
  wenJian: 'wenJian',
  xitong: 'xitong',
  neiXinHuoDong: 'neiXinHuoDong',
}

function guiYiKuaiZhaoLeiXing(leiXing: unknown): FanKuiXiaoXiLeiXing {
  if (typeof leiXing === 'string') {
    const zhiJie = KuaiZhaoLeiXingBiao[leiXing]
    if (zhiJie) return zhiJie
    const xiaoXie = leiXing.trim().toLowerCase()
    const rongCuo = KuaiZhaoLeiXingBiao[xiaoXie]
    if (rongCuo) return rongCuo
  }
  return 'wenben'
}

function guiYiFaSongZheLeiXing(zhi: unknown): 'yonghu' | 'jiaose' | 'xitong' {
  if (zhi === 'yonghu' || zhi === 'jiaose' || zhi === 'xitong') return zhi
  if (zhi === 'duifang') return 'jiaose'
  return 'yonghu'
}

function jieQuZhaiYao(wenBen: string, zuiDa = FanKuiZhaiYaoZuiDaZiFu): string {
  const zhengLi = wenBen.trim()
  if (zhengLi.length <= zuiDa) return zhengLi
  return `${zhengLi.slice(0, zuiDa)}……`
}

export function chuangJianXiaoXiKuaiZhao(xiaoXi: KuaiZhaoLaiYuanXiaoXi): XiaoXiYinYongKuaiZhao | null {
  const xiaoXiId = typeof xiaoXi.id === 'string' && xiaoXi.id ? xiaoXi.id : null
  if (!xiaoXiId || xiaoXi.yi_che_hui === true || shiBenDiLinShiXiaoXi(xiaoXi)) return null
  const leiXing = guiYiKuaiZhaoLeiXing(xiaoXi.lei_xing)
  const neiRong = typeof xiaoXi.nei_rong === 'string' ? xiaoXi.nei_rong : ''
  let zhaiYao: string
  if (leiXing === 'tuPian') {
    zhaiYao = huoQuFanYi('liaoTian', 'yinYongTuPianZhanWei')
  } else if (leiXing === 'biaoQingBao') {
    zhaiYao = huoQuFanYi('liaoTian', 'yinYongBiaoQingBaoZhanWei')
  } else if (leiXing === 'wenJian') {
    zhaiYao = huoQuFanYi('liaoTian', 'yinYongWenJianZhanWei')
  } else if (leiXing === 'yuYin') {
    const shiChang =
      typeof xiaoXi.mei_ti_shi_chang_hao_miao === 'number' && xiaoXi.mei_ti_shi_chang_hao_miao > 0
        ? Math.round(xiaoXi.mei_ti_shi_chang_hao_miao / 1000)
        : null
    const qianZhui = shiChang !== null ? `${shiChang}″` : huoQuFanYi('liaoTian', 'yinYongYuYinZhanWei')
    zhaiYao = neiRong.trim() ? `${qianZhui} ${jieQuZhaiYao(neiRong)}` : qianZhui
  } else {
    zhaiYao = jieQuZhaiYao(neiRong)
  }
  const kuaiZhao: XiaoXiYinYongKuaiZhao = {
    xiao_xi_id: xiaoXiId,
    lei_xing: leiXing,
    zhai_yao: zhaiYao,
    fa_song_zhe_lei_xing: guiYiFaSongZheLeiXing(xiaoXi.fa_song_zhe_lei_xing),
    shi_jian_chuo: typeof xiaoXi.shi_jian_chuo === 'number' ? xiaoXi.shi_jian_chuo : Date.now(),
  }
  if (typeof xiaoXi.mei_ti_url === 'string' && xiaoXi.mei_ti_url) {
    kuaiZhao.mei_ti_url = xiaoXi.mei_ti_url
  }
  if (typeof xiaoXi.mei_ti_shi_chang_hao_miao === 'number') {
    kuaiZhao.mei_ti_shi_chang_hao_miao = xiaoXi.mei_ti_shi_chang_hao_miao
  }
  return kuaiZhao
}

function huoQuShiQu(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    return ''
  }
}

export function chuangJianSheBeiXinXi(yeMian: string): FanKuiSheBeiXinXi {
  return {
    yeMian,
    shiKouKuanGao: typeof window !== 'undefined' ? window.innerWidth : 0,
    shiKouGaoDu: typeof window !== 'undefined' ? window.innerHeight : 0,
    pingMuKuan: typeof screen !== 'undefined' ? screen.width : 0,
    pingMuGao: typeof screen !== 'undefined' ? screen.height : 0,
    xiangSuBi: typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1,
    yuYan: typeof navigator !== 'undefined' ? navigator.language || '' : '',
    pingTai:
      typeof navigator !== 'undefined' ? (navigator.userAgent || '').slice(0, 200) : '',
    shiQu: huoQuShiQu(),
    shiJianChuo: Date.now(),
  }
}

export const 使用反馈仓库 = defineStore('反馈', () => {
  const tanChuangXianShi = ref(false)
  const fuJianXiaoXi = ref<XiaoXiYinYongKuaiZhao[]>([])
  const biaoQingXuanZe = ref<BiaoQingBaoYinYongKuaiZhao[]>([])
  const tiJiaoZhong = ref(false)
  const woDeLieBiao = ref<WoDeFanKuiXiang[]>([])
  const woDeJiaZaiZhong = ref(false)
  const woDeYeMa = ref(1)
  const woDeHaiYouGengDuo = ref(false)
  const woDeYiJiaZaiGuo = ref(false)
  const woDeJiaZaiShiBai = ref(false)
  let woDeQingQiuDaiCi = 0
  const waiBuXiaoXiLaiYuan = ref<XiaoXiLaiYuanHuoQu | null>(null)

  function zhuCeXiaoXiLaiYuan(huoQu: XiaoXiLaiYuanHuoQu | null): void {
    waiBuXiaoXiLaiYuan.value = huoQu
  }

  function shiFuJianXiaoXi(xiaoXiId: unknown): boolean {
    if (typeof xiaoXiId !== 'string' || !xiaoXiId) return false
    return fuJianXiaoXi.value.some((kuaiZhao) => kuaiZhao.xiao_xi_id === xiaoXiId)
  }

  function tianJiaFuJian(xiaoXi: KuaiZhaoLaiYuanXiaoXi): boolean {
    const kuaiZhao = chuangJianXiaoXiKuaiZhao(xiaoXi)
    if (!kuaiZhao) return false
    if (shiFuJianXiaoXi(kuaiZhao.xiao_xi_id)) return true
    if (fuJianXiaoXi.value.length >= FuJianXiaoXiShangXian) return false
    fuJianXiaoXi.value = [...fuJianXiaoXi.value, kuaiZhao]
    return true
  }

  function yiChuFuJian(xiaoXiId: string): void {
    fuJianXiaoXi.value = fuJianXiaoXi.value.filter((kuaiZhao) => kuaiZhao.xiao_xi_id !== xiaoXiId)
  }

  function qieHuanFuJian(xiaoXi: KuaiZhaoLaiYuanXiaoXi): FuJianQieHuanJieGuo {
    const xiaoXiId = typeof xiaoXi.id === 'string' && xiaoXi.id ? xiaoXi.id : null
    if (!xiaoXiId) return 'wuXiao'
    if (shiFuJianXiaoXi(xiaoXiId)) {
      yiChuFuJian(xiaoXiId)
      return 'yiChu'
    }
    if (fuJianXiaoXi.value.length >= FuJianXiaoXiShangXian) return 'yiMan'
    return tianJiaFuJian(xiaoXi) ? 'tianJia' : 'yiMan'
  }

  function qingKongFuJian(): void {
    fuJianXiaoXi.value = []
  }

  function shiBiaoQingXuanZe(meiTiId: unknown): boolean {
    if (typeof meiTiId !== 'string' || !meiTiId) return false
    return biaoQingXuanZe.value.some((xiang) => xiang.mei_ti_id === meiTiId)
  }

  function tianJiaBiaoQing(biaoQing: BiaoQingXiang): boolean {
    if (!biaoQing?.mei_ti_id || !biaoQing.mei_ti_url) return false
    if (biaoQingXuanZe.value.some((xiang) => xiang.mei_ti_id === biaoQing.mei_ti_id)) return true
    if (biaoQingXuanZe.value.length >= BiaoQingXuanZeShangXian) return false
    biaoQingXuanZe.value = [
      ...biaoQingXuanZe.value,
      {
        mei_ti_id: biaoQing.mei_ti_id,
        mei_ti_url: biaoQing.mei_ti_url,
        lai_yuan: 'biaoQingKu',
      },
    ]
    return true
  }

  function yiChuBiaoQing(meiTiId: string): void {
    biaoQingXuanZe.value = biaoQingXuanZe.value.filter((xiang) => xiang.mei_ti_id !== meiTiId)
  }

  function qingKongBiaoQing(): void {
    biaoQingXuanZe.value = []
  }

  function daKaiTanChuang(): void {
    tanChuangXianShi.value = true
  }

  function guanBiTanChuang(): void {
    tanChuangXianShi.value = false
  }

  async function tiJiao(biaoDan: FanKuiTiJiao): Promise<string> {
    if (tiJiaoZhong.value) return ''
    tiJiaoZhong.value = true
    try {
      const jieGuo = await tiJiaoFanKui(biaoDan)
      qingKongFuJian()
      qingKongBiaoQing()
      woDeYiJiaZaiGuo.value = false
      return jieGuo.id
    } finally {
      tiJiaoZhong.value = false
    }
  }

  async function jiaZaiWoDe(chongZhi = false): Promise<void> {
    if (woDeJiaZaiZhong.value) return
    if (chongZhi) {
      woDeYeMa.value = 1
      woDeLieBiao.value = []
      woDeHaiYouGengDuo.value = true
      woDeYiJiaZaiGuo.value = false
    }
    if (!chongZhi && !woDeHaiYouGengDuo.value) return
    const daiCi = ++woDeQingQiuDaiCi
    const benCiYeMa = woDeYeMa.value
    woDeJiaZaiZhong.value = true
    woDeJiaZaiShiBai.value = false
    try {
      const ye = await huoQuWoDeFanKui(benCiYeMa)
      if (daiCi !== woDeQingQiuDaiCi) return
      const yiCun = new Set(woDeLieBiao.value.map((xiang) => xiang.id))
      const xinZeng = ye.lie_biao.filter((xiang) => !yiCun.has(xiang.id))
      woDeLieBiao.value = [...woDeLieBiao.value, ...xinZeng]
      woDeHaiYouGengDuo.value = ye.hai_you_geng_duo
      woDeYeMa.value = benCiYeMa + 1
      woDeYiJiaZaiGuo.value = true
    } catch (cuoWu: unknown) {
      if (daiCi !== woDeQingQiuDaiCi) return
      woDeJiaZaiShiBai.value = true
      throw 归一前台错误(cuoWu)
    } finally {
      if (daiCi === woDeQingQiuDaiCi) woDeJiaZaiZhong.value = false
    }
  }

  function chongZhiWoDe(): void {
    woDeQingQiuDaiCi += 1
    woDeLieBiao.value = []
    woDeYeMa.value = 1
    woDeHaiYouGengDuo.value = false
    woDeYiJiaZaiGuo.value = false
    woDeJiaZaiZhong.value = false
    woDeJiaZaiShiBai.value = false
  }

  return {
    tanChuangXianShi,
    fuJianXiaoXi,
    biaoQingXuanZe,
    tiJiaoZhong,
    woDeLieBiao,
    woDeJiaZaiZhong,
    woDeYeMa,
    woDeHaiYouGengDuo,
    woDeYiJiaZaiGuo,
    woDeJiaZaiShiBai,
    waiBuXiaoXiLaiYuan,
    zhuCeXiaoXiLaiYuan,
    shiFuJianXiaoXi,
    tianJiaFuJian,
    yiChuFuJian,
    qieHuanFuJian,
    qingKongFuJian,
    tianJiaBiaoQing,
    yiChuBiaoQing,
    shiBiaoQingXuanZe,
    qingKongBiaoQing,
    daKaiTanChuang,
    guanBiTanChuang,
    tiJiao,
    jiaZaiWoDe,
    chongZhiWoDe,
  }
})
