import { huoQuFanYi } from '@/config/translations'
import { huoQuQiPaoDingYi, type QiPaoYuShe } from '@/config/气泡主题'
import { EMOJI_ZITI_DUI } from './表情包库'

// 战报海报：竖版 3:4（社交平台通用比例），纯 canvas 手绘，不引入截图类依赖。
// 配色一律取 variables.css 的设计令牌（明暗两套由 data-theme 级联自动切换），
// 几何尺寸是本文件唯一事实源的具名常量；气泡配色取 config/气泡主题.ts 的既有主题。
export const ZHAN_BAO_KUAN = 1080
export const ZHAN_BAO_GAO = 1440

const BIAN_JU = 72
const NEI_KUAN = ZHAN_BAO_KUAN - BIAN_JU * 2
const DING_BU_Y = 130
const BIAO_TI_Y = 225
const BIAO_QING_Y = 390
const BIAO_QING_ZHAI_JING = 200
const MING_CHEN_Y = 545
const MIAO_SHU_Y = 590
const SHU_JU_KUAN_GE = 136
const SHU_JU_XING_JIAN_GE = 20
const SHU_JU_GE_MEI_HANG = 2
const WEI_ZHU_Y = ZHAN_BAO_GAO - 200
const KAPIAN_YUAN_JIAO = 28
const HANG_JU = 1.3
const ZHI_HAO = {
  yingYongMing: 32,
  biaoTi: 72,
  biaoQing: 110,
  jiaoSeMing: 62,
  miaoShuBiaoQian: 26,
  miaoShuZhengWen: 46,
  zhuangTai: 30,
  shuJuBiaoQian: 28,
  shuJuZhi: 46,
  fuBiaoTi: 30,
  mianZe: 26,
} as const
const JIE_GUO_ZUI_DA_HANG_SHU = 2

export interface ZhanBaoShuRu {
  jiaoSeMing: string
  jieGuoWenBen: string
  jieGuoFenLei: 'shengli' | 'shibai'
  biaoQing: string
  liaoTianTianShu: number
  xiaoXiZongShu: number
  mbtiLeiXing?: string
  jieShuShiJianWenBen?: string
  qiPaoAI: QiPaoYuShe
}

interface YangShiPin {
  beijing: readonly string[]
  kaPian: string
  kaPianBianKuang: string
  zhuWenBen: string
  ciWenBen: string
  qiangDiao: string
  qiangDiaoQian: string
  zhuangTaiBeiJing: string
  zhuangTaiWenBen: string
  ziTiJiaZu: string
}

function quChuKongBai(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function feiFuZhengShu(value: unknown): number {
  const zhi = Number(value)
  return Number.isFinite(zhi) && zhi > 0 ? Math.trunc(zhi) : 0
}

function quLingPai(ming: string): string {
  if (typeof document === 'undefined') {
    throw new Error(huoQuFanYi('zhanJi', 'haiBaoShengChengShiBai'))
  }
  const zhi = getComputedStyle(document.documentElement).getPropertyValue(ming).trim()
  if (!zhi) {
    throw new Error(huoQuFanYi('zhanJi', 'haiBaoShengChengShiBai'))
  }
  return zhi
}

function quYangShiPin(fenLei: ZhanBaoShuRu['jieGuoFenLei']): YangShiPin {
  const chengGong = fenLei === 'shengli'
  return {
    beijing: [
      quLingPai('--beijing-jianbian-1'),
      quLingPai('--beijing-jianbian-2'),
      quLingPai('--beijing-jianbian-3'),
      quLingPai('--beijing-jianbian-4'),
    ],
    kaPian: quLingPai('--beijing-kaopian'),
    kaPianBianKuang: quLingPai('--boli-biankuang'),
    zhuWenBen: quLingPai('--wenben-zhuse'),
    ciWenBen: quLingPai('--wenben-ciuse'),
    qiangDiao: quLingPai('--yanse-zhanji'),
    qiangDiaoQian: quLingPai('--yanse-zhanji-qian'),
    zhuangTaiBeiJing: quLingPai(
      chengGong ? '--biao-qian-chenggong-beijing' : '--biao-qian-shibai-beijing',
    ),
    zhuangTaiWenBen: quLingPai(
      chengGong ? '--biao-qian-chenggong-wenben' : '--biao-qian-shibai-wenben',
    ),
    ziTiJiaZu: quLingPai('--ziti-jiazu'),
  }
}

function yuanJiaoJuXing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kuan: number,
  gao: number,
  jiaoR: number,
): void {
  const banJing = Math.max(0, Math.min(jiaoR, kuan / 2, gao / 2))
  ctx.beginPath()
  ctx.moveTo(x + banJing, y)
  ctx.lineTo(x + kuan - banJing, y)
  ctx.quadraticCurveTo(x + kuan, y, x + kuan, y + banJing)
  ctx.lineTo(x + kuan, y + gao - banJing)
  ctx.quadraticCurveTo(x + kuan, y + gao, x + kuan - banJing, y + gao)
  ctx.lineTo(x + banJing, y + gao)
  ctx.quadraticCurveTo(x, y + gao, x, y + gao - banJing)
  ctx.lineTo(x, y + banJing)
  ctx.quadraticCurveTo(x, y, x + banJing, y)
  ctx.closePath()
}

function duanHang(
  ctx: CanvasRenderingContext2D,
  wenBen: string,
  zuiDaKuan: number,
  zuiDaHangShu: number,
): string[] {
  const ziList = Array.from(wenBen ?? '')
  const hangList: string[] = []
  let xiaYi = 0
  while (xiaYi < ziList.length && hangList.length < zuiDaHangShu) {
    let jieShu = xiaYi + 1
    while (
      jieShu < ziList.length &&
      ctx.measureText(ziList.slice(xiaYi, jieShu + 1).join('')).width <= zuiDaKuan
    ) {
      jieShu += 1
    }
    hangList.push(ziList.slice(xiaYi, jieShu).join(''))
    xiaYi = jieShu
  }
  if (xiaYi < ziList.length && hangList.length > 0) {
    hangList[hangList.length - 1] += '…'
  }
  return hangList
}

function huaBeiJing(ctx: CanvasRenderingContext2D, pin: YangShiPin): void {
  const jianBian = ctx.createLinearGradient(0, 0, ZHAN_BAO_KUAN, ZHAN_BAO_GAO)
  const zhi = pin.beijing.length
  pin.beijing.forEach((se, suoYin) => {
    jianBian.addColorStop(zhi === 1 ? 1 : suoYin / (zhi - 1), se)
  })
  ctx.fillStyle = jianBian
  ctx.fillRect(0, 0, ZHAN_BAO_KUAN, ZHAN_BAO_GAO)
}

function huaDingBu(ctx: CanvasRenderingContext2D, pin: YangShiPin): void {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${ZHI_HAO.yingYongMing}px ${pin.ziTiJiaZu}`
  ctx.fillStyle = pin.ciWenBen
  ctx.fillText(quChuKongBai(huoQuFanYi('renZheng', 'yingYongMing')), ZHAN_BAO_KUAN / 2, DING_BU_Y)

  ctx.font = `${ZHI_HAO.biaoTi}px ${pin.ziTiJiaZu}`
  ctx.fillStyle = pin.zhuWenBen
  ctx.fillText(
    quChuKongBai(huoQuFanYi('zhanJi', 'fenXiangHaiBaoBiaoTi')),
    ZHAN_BAO_KUAN / 2,
    BIAO_TI_Y,
  )
}

function huaBiaoQing(
  ctx: CanvasRenderingContext2D,
  pin: YangShiPin,
  yiLai: ZhanBaoShuRu,
): void {
  yuanJiaoJuXing(
    ctx,
    ZHAN_BAO_KUAN / 2 - BIAO_QING_ZHAI_JING / 2,
    BIAO_QING_Y - BIAO_QING_ZHAI_JING / 2,
    BIAO_QING_ZHAI_JING,
    BIAO_QING_ZHAI_JING,
    BIAO_QING_ZHAI_JING / 2,
  )
  ctx.fillStyle = pin.kaPian
  ctx.fill()
  ctx.strokeStyle = pin.kaPianBianKuang
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${ZHI_HAO.biaoQing}px ${EMOJI_ZITI_DUI}`
  ctx.fillText(yiLai.biaoQing, ZHAN_BAO_KUAN / 2, BIAO_QING_Y + 4)
}

function huaJiaoSeMing(ctx: CanvasRenderingContext2D, pin: YangShiPin, ming: string): void {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${ZHI_HAO.jiaoSeMing}px ${pin.ziTiJiaZu}`
  ctx.fillStyle = pin.qiangDiao
  const hangList = duanHang(ctx, ming, NEI_KUAN, 1)
  ctx.fillText(hangList[0] ?? '', ZHAN_BAO_KUAN / 2, MING_CHEN_Y)
}

function huaJieGuo(
  ctx: CanvasRenderingContext2D,
  pin: YangShiPin,
  yiLai: ZhanBaoShuRu,
): number {
  const qiPao = huoQuQiPaoDingYi(yiLai.qiPaoAI)
  // 先设正文字号再断行：measureText 依赖当前字体，用上一次遗留字号量会误判换行点
  ctx.font = `${ZHI_HAO.miaoShuZhengWen}px ${pin.ziTiJiaZu}`
  const hangList = duanHang(ctx, yiLai.jieGuoWenBen, NEI_KUAN - 96, JIE_GUO_ZUI_DA_HANG_SHU)
  const zhengWenGao = ZHI_HAO.miaoShuZhengWen * HANG_JU
  const paoGao = 80 + Math.max(1, hangList.length) * zhengWenGao
  yuanJiaoJuXing(ctx, BIAN_JU, MIAO_SHU_Y, NEI_KUAN, paoGao, KAPIAN_YUAN_JIAO)
  ctx.fillStyle = qiPao.beiJing
  ctx.fill()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${ZHI_HAO.miaoShuBiaoQian}px ${pin.ziTiJiaZu}`
  ctx.fillStyle = qiPao.wenBen
  ctx.fillText(quChuKongBai(huoQuFanYi('zhanJi', 'haiBaoJieGuoBiaoQian')), ZHAN_BAO_KUAN / 2, MIAO_SHU_Y + 40)
  ctx.font = `${ZHI_HAO.miaoShuZhengWen}px ${pin.ziTiJiaZu}`
  hangList.forEach((hang, suoYin) => {
    ctx.fillText(hang, ZHAN_BAO_KUAN / 2, MIAO_SHU_Y + 78 + zhengWenGao * (suoYin + 0.5))
  })

  const zhuangTaiWen =
    yiLai.jieGuoFenLei === 'shengli'
      ? quChuKongBai(huoQuFanYi('zhanJi', 'zhuangTaiShengLi'))
      : quChuKongBai(huoQuFanYi('zhanJi', 'zhuangTaiShiBai'))
  const paoDiBu = MIAO_SHU_Y + paoGao
  ctx.font = `${ZHI_HAO.zhuangTai}px ${pin.ziTiJiaZu}`
  const biaoQianKuan = ctx.measureText(zhuangTaiWen).width + 56
  const biaoQianGao = ZHI_HAO.zhuangTai * 2
  const biaoQianY = paoDiBu + 22
  yuanJiaoJuXing(
    ctx,
    ZHAN_BAO_KUAN / 2 - biaoQianKuan / 2,
    biaoQianY,
    biaoQianKuan,
    biaoQianGao,
    biaoQianGao / 2,
  )
  ctx.fillStyle = pin.zhuangTaiBeiJing
  ctx.fill()
  ctx.fillStyle = pin.zhuangTaiWenBen
  ctx.fillText(zhuangTaiWen, ZHAN_BAO_KUAN / 2, biaoQianY + biaoQianGao / 2)
  return biaoQianY + biaoQianGao
}

function shuJuGeList(yiLai: ZhanBaoShuRu): { biaoQian: string; zhi: string }[] {
  const xiang: { biaoQian: string; zhi: string }[] = [
    {
      biaoQian: quChuKongBai(huoQuFanYi('zhanJi', 'haiBaoTianShuBiaoQian')),
      zhi: String(feiFuZhengShu(yiLai.liaoTianTianShu)),
    },
    {
      biaoQian: quChuKongBai(huoQuFanYi('zhanJi', 'haiBaoXiaoXiBiaoQian')),
      zhi: String(feiFuZhengShu(yiLai.xiaoXiZongShu)),
    },
    {
      biaoQian: quChuKongBai(huoQuFanYi('zhanJi', 'haiBaoXingGeBiaoQian')),
      zhi: quChuKongBai(yiLai.mbtiLeiXing),
    },
    {
      biaoQian: quChuKongBai(huoQuFanYi('zhanJi', 'haiBaoJieShuBiaoQian')),
      zhi: quChuKongBai(yiLai.jieShuShiJianWenBen),
    },
  ]
  return xiang.filter((tiao) => tiao.biaoQian && tiao.zhi)
}

function huaShuJuGe(
  ctx: CanvasRenderingContext2D,
  pin: YangShiPin,
  yiLai: ZhanBaoShuRu,
  qiShiY: number,
): number {
  const lieBiao = shuJuGeList(yiLai)
  if (lieBiao.length === 0) return qiShiY
  const geKuan = (NEI_KUAN - SHU_JU_XING_JIAN_GE * (SHU_JU_GE_MEI_HANG - 1)) / SHU_JU_GE_MEI_HANG
  lieBiao.forEach((tiao, suoYin) => {
    const hang = Math.floor(suoYin / SHU_JU_GE_MEI_HANG)
    const lie = suoYin % SHU_JU_GE_MEI_HANG
    const x = BIAN_JU + lie * (geKuan + SHU_JU_XING_JIAN_GE)
    const y = qiShiY + hang * (SHU_JU_KUAN_GE + SHU_JU_XING_JIAN_GE)
    yuanJiaoJuXing(ctx, x, y, geKuan, SHU_JU_KUAN_GE, KAPIAN_YUAN_JIAO)
    ctx.fillStyle = pin.kaPian
    ctx.fill()
    ctx.strokeStyle = pin.kaPianBianKuang
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = pin.ciWenBen
    ctx.font = `${ZHI_HAO.shuJuBiaoQian}px ${pin.ziTiJiaZu}`
    ctx.fillText(tiao.biaoQian, x + geKuan / 2, y + 42)
    ctx.fillStyle = pin.zhuWenBen
    ctx.font = `${ZHI_HAO.shuJuZhi}px ${pin.ziTiJiaZu}`
    const zhiHang = duanHang(ctx, tiao.zhi, geKuan - 48, 1)
    ctx.fillText(zhiHang[0] ?? '', x + geKuan / 2, y + 94)
  })
  const hangShu = Math.ceil(lieBiao.length / SHU_JU_GE_MEI_HANG)
  return qiShiY + hangShu * SHU_JU_KUAN_GE + (hangShu - 1) * SHU_JU_XING_JIAN_GE
}

function huaWeiZhu(ctx: CanvasRenderingContext2D, pin: YangShiPin): void {
  const jianBian = ctx.createLinearGradient(BIAN_JU, WEI_ZHU_Y, BIAN_JU + NEI_KUAN, WEI_ZHU_Y)
  jianBian.addColorStop(0, pin.qiangDiao)
  jianBian.addColorStop(1, pin.qiangDiaoQian)
  yuanJiaoJuXing(ctx, BIAN_JU, WEI_ZHU_Y, NEI_KUAN, 8, 4)
  ctx.fillStyle = jianBian
  ctx.fill()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = pin.zhuWenBen
  ctx.font = `${ZHI_HAO.fuBiaoTi}px ${pin.ziTiJiaZu}`
  ctx.fillText(
    quChuKongBai(huoQuFanYi('renZheng', 'yingYongFuBiaoTi')),
    ZHAN_BAO_KUAN / 2,
    WEI_ZHU_Y + 52,
  )
  ctx.fillStyle = pin.ciWenBen
  ctx.font = `${ZHI_HAO.mianZe}px ${pin.ziTiJiaZu}`
  ctx.fillText(quChuKongBai(huoQuFanYi('tongYong', 'aiTiShiTiao')), ZHAN_BAO_KUAN / 2, WEI_ZHU_Y + 104)
}

export async function shengChengZhanBaoHaiBao(yiLai: ZhanBaoShuRu): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = ZHAN_BAO_KUAN
  canvas.height = ZHAN_BAO_GAO
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(huoQuFanYi('zhanJi', 'haiBaoShengChengShiBai'))
  const pin = quYangShiPin(yiLai.jieGuoFenLei)

  huaBeiJing(ctx, pin)
  huaDingBu(ctx, pin)
  huaBiaoQing(ctx, pin, yiLai)
  huaJiaoSeMing(
    ctx,
    pin,
    quChuKongBai(yiLai.jiaoSeMing) || quChuKongBai(huoQuFanYi('haoYou', 'weiMingMing')),
  )
  const zhuangTaiDiBu = huaJieGuo(ctx, pin, yiLai)
  huaShuJuGe(ctx, pin, yiLai, zhuangTaiDiBu + 36)
  huaWeiZhu(ctx, pin)

  return new Promise<Blob>((jieJue, juJue) => {
    canvas.toBlob(
      (blob) => {
        if (blob) jieJue(blob)
        else juJue(new Error(huoQuFanYi('zhanJi', 'haiBaoShengChengShiBai')))
      },
      'image/png',
    )
  })
}

export function huoQuZhanBaoWenAn(yiLai: ZhanBaoShuRu): string {
  const ming = quChuKongBai(yiLai.jiaoSeMing) || quChuKongBai(huoQuFanYi('haoYou', 'weiMingMing'))
  return quChuKongBai(huoQuFanYi('zhanJi', 'fenXiangWenAn'))
    .replace('{应用}', quChuKongBai(huoQuFanYi('renZheng', 'yingYongMing')))
    .replace('{对象}', ming)
    .replace('{天}', String(feiFuZhengShu(yiLai.liaoTianTianShu)))
    .replace('{条}', String(feiFuZhengShu(yiLai.xiaoXiZongShu)))
    .replace('{结局}', quChuKongBai(yiLai.jieGuoWenBen))
}

export function huoQuZhanBaoWenJianMing(yiLai: ZhanBaoShuRu): string {
  const ming = quChuKongBai(yiLai.jiaoSeMing) || quChuKongBai(huoQuFanYi('haoYou', 'weiMingMing'))
  return `${quChuKongBai(huoQuFanYi('zhanJi', 'fenXiangHaiBaoBiaoTi'))}-${ming}.png`
}
