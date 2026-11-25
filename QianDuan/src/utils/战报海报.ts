import { huoQuFanYi } from '@/config/翻译表'
import { huoQuQiPaoDingYi, type QiPaoYuShe } from '@/config/气泡主题'
import { EmojiZitiDui } from './表情包库'

export const ZhanBaoKuan = 1080
export const ZhanBaoGao = 1440

const BianJu = 72
const NeiKuan = ZhanBaoKuan - BianJu * 2
const DingBuY = 130
const BiaoTiY = 225
const BiaoQingY = 390
const BiaoQingZhaiJing = 200
const MingChenY = 545
const MiaoShuY = 590
const ShuJuKuanGe = 136
const ShuJuXingJianGe = 20
const ShuJuGeMeiHang = 2
const WeiZhuY = ZhanBaoGao - 200
const KapianYuanJiao = 28
const HangJu = 1.3
const ZhiHao = {
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
const JieGuoZuiDaHangShu = 2

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
  huaBuShangXiaWen: CanvasRenderingContext2D,
  x: number,
  y: number,
  kuan: number,
  gao: number,
  jiaoR: number,
): void {
  const banJing = Math.max(0, Math.min(jiaoR, kuan / 2, gao / 2))
  huaBuShangXiaWen.beginPath()
  huaBuShangXiaWen.moveTo(x + banJing, y)
  huaBuShangXiaWen.lineTo(x + kuan - banJing, y)
  huaBuShangXiaWen.quadraticCurveTo(x + kuan, y, x + kuan, y + banJing)
  huaBuShangXiaWen.lineTo(x + kuan, y + gao - banJing)
  huaBuShangXiaWen.quadraticCurveTo(x + kuan, y + gao, x + kuan - banJing, y + gao)
  huaBuShangXiaWen.lineTo(x + banJing, y + gao)
  huaBuShangXiaWen.quadraticCurveTo(x, y + gao, x, y + gao - banJing)
  huaBuShangXiaWen.lineTo(x, y + banJing)
  huaBuShangXiaWen.quadraticCurveTo(x, y, x + banJing, y)
  huaBuShangXiaWen.closePath()
}

function duanHang(
  huaBuShangXiaWen: CanvasRenderingContext2D,
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
      huaBuShangXiaWen.measureText(ziList.slice(xiaYi, jieShu + 1).join('')).width <= zuiDaKuan
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

function huaBeiJing(huaBuShangXiaWen: CanvasRenderingContext2D, pin: YangShiPin): void {
  const jianBian = huaBuShangXiaWen.createLinearGradient(0, 0, ZhanBaoKuan, ZhanBaoGao)
  const zhi = pin.beijing.length
  pin.beijing.forEach((se, suoYin) => {
    jianBian.addColorStop(zhi === 1 ? 1 : suoYin / (zhi - 1), se)
  })
  huaBuShangXiaWen.fillStyle = jianBian
  huaBuShangXiaWen.fillRect(0, 0, ZhanBaoKuan, ZhanBaoGao)
}

function huaDingBu(huaBuShangXiaWen: CanvasRenderingContext2D, pin: YangShiPin): void {
  huaBuShangXiaWen.textAlign = 'center'
  huaBuShangXiaWen.textBaseline = 'middle'
  huaBuShangXiaWen.font = `${ZhiHao.yingYongMing}px ${pin.ziTiJiaZu}`
  huaBuShangXiaWen.fillStyle = pin.ciWenBen
  huaBuShangXiaWen.fillText(quChuKongBai(huoQuFanYi('renZheng', 'yingYongMing')), ZhanBaoKuan / 2, DingBuY)

  huaBuShangXiaWen.font = `${ZhiHao.biaoTi}px ${pin.ziTiJiaZu}`
  huaBuShangXiaWen.fillStyle = pin.zhuWenBen
  huaBuShangXiaWen.fillText(
    quChuKongBai(huoQuFanYi('zhanJi', 'fenXiangHaiBaoBiaoTi')),
    ZhanBaoKuan / 2,
    BiaoTiY,
  )
}

function huaBiaoQing(
  huaBuShangXiaWen: CanvasRenderingContext2D,
  pin: YangShiPin,
  yiLai: ZhanBaoShuRu,
): void {
  yuanJiaoJuXing(
    huaBuShangXiaWen,
    ZhanBaoKuan / 2 - BiaoQingZhaiJing / 2,
    BiaoQingY - BiaoQingZhaiJing / 2,
    BiaoQingZhaiJing,
    BiaoQingZhaiJing,
    BiaoQingZhaiJing / 2,
  )
  huaBuShangXiaWen.fillStyle = pin.kaPian
  huaBuShangXiaWen.fill()
  huaBuShangXiaWen.strokeStyle = pin.kaPianBianKuang
  huaBuShangXiaWen.lineWidth = 2
  huaBuShangXiaWen.stroke()
  huaBuShangXiaWen.textAlign = 'center'
  huaBuShangXiaWen.textBaseline = 'middle'
  huaBuShangXiaWen.font = `${ZhiHao.biaoQing}px ${EmojiZitiDui}`
  huaBuShangXiaWen.fillText(yiLai.biaoQing, ZhanBaoKuan / 2, BiaoQingY + 4)
}

function huaJiaoSeMing(huaBuShangXiaWen: CanvasRenderingContext2D, pin: YangShiPin, ming: string): void {
  huaBuShangXiaWen.textAlign = 'center'
  huaBuShangXiaWen.textBaseline = 'middle'
  huaBuShangXiaWen.font = `${ZhiHao.jiaoSeMing}px ${pin.ziTiJiaZu}`
  huaBuShangXiaWen.fillStyle = pin.qiangDiao
  const hangList = duanHang(huaBuShangXiaWen, ming, NeiKuan, 1)
  huaBuShangXiaWen.fillText(hangList[0] ?? '', ZhanBaoKuan / 2, MingChenY)
}

function huaJieGuo(
  huaBuShangXiaWen: CanvasRenderingContext2D,
  pin: YangShiPin,
  yiLai: ZhanBaoShuRu,
): number {
  const qiPao = huoQuQiPaoDingYi(yiLai.qiPaoAI)
  huaBuShangXiaWen.font = `${ZhiHao.miaoShuZhengWen}px ${pin.ziTiJiaZu}`
  const hangList = duanHang(huaBuShangXiaWen, yiLai.jieGuoWenBen, NeiKuan - 96, JieGuoZuiDaHangShu)
  const zhengWenGao = ZhiHao.miaoShuZhengWen * HangJu
  const paoGao = 80 + Math.max(1, hangList.length) * zhengWenGao
  yuanJiaoJuXing(huaBuShangXiaWen, BianJu, MiaoShuY, NeiKuan, paoGao, KapianYuanJiao)
  huaBuShangXiaWen.fillStyle = qiPao.beiJing
  huaBuShangXiaWen.fill()

  huaBuShangXiaWen.textAlign = 'center'
  huaBuShangXiaWen.textBaseline = 'middle'
  huaBuShangXiaWen.font = `${ZhiHao.miaoShuBiaoQian}px ${pin.ziTiJiaZu}`
  huaBuShangXiaWen.fillStyle = qiPao.wenBen
  huaBuShangXiaWen.fillText(quChuKongBai(huoQuFanYi('zhanJi', 'haiBaoJieGuoBiaoQian')), ZhanBaoKuan / 2, MiaoShuY + 40)
  huaBuShangXiaWen.font = `${ZhiHao.miaoShuZhengWen}px ${pin.ziTiJiaZu}`
  hangList.forEach((hang, suoYin) => {
    huaBuShangXiaWen.fillText(hang, ZhanBaoKuan / 2, MiaoShuY + 78 + zhengWenGao * (suoYin + 0.5))
  })

  const zhuangTaiWen =
    yiLai.jieGuoFenLei === 'shengli'
      ? quChuKongBai(huoQuFanYi('zhanJi', 'zhuangTaiShengLi'))
      : quChuKongBai(huoQuFanYi('zhanJi', 'zhuangTaiShiBai'))
  const paoDiBu = MiaoShuY + paoGao
  huaBuShangXiaWen.font = `${ZhiHao.zhuangTai}px ${pin.ziTiJiaZu}`
  const biaoQianKuan = huaBuShangXiaWen.measureText(zhuangTaiWen).width + 56
  const biaoQianGao = ZhiHao.zhuangTai * 2
  const biaoQianY = paoDiBu + 22
  yuanJiaoJuXing(
    huaBuShangXiaWen,
    ZhanBaoKuan / 2 - biaoQianKuan / 2,
    biaoQianY,
    biaoQianKuan,
    biaoQianGao,
    biaoQianGao / 2,
  )
  huaBuShangXiaWen.fillStyle = pin.zhuangTaiBeiJing
  huaBuShangXiaWen.fill()
  huaBuShangXiaWen.fillStyle = pin.zhuangTaiWenBen
  huaBuShangXiaWen.fillText(zhuangTaiWen, ZhanBaoKuan / 2, biaoQianY + biaoQianGao / 2)
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
  huaBuShangXiaWen: CanvasRenderingContext2D,
  pin: YangShiPin,
  yiLai: ZhanBaoShuRu,
  qiShiY: number,
): number {
  const lieBiao = shuJuGeList(yiLai)
  if (lieBiao.length === 0) return qiShiY
  const geKuan = (NeiKuan - ShuJuXingJianGe * (ShuJuGeMeiHang - 1)) / ShuJuGeMeiHang
  lieBiao.forEach((tiao, suoYin) => {
    const hang = Math.floor(suoYin / ShuJuGeMeiHang)
    const lie = suoYin % ShuJuGeMeiHang
    const x = BianJu + lie * (geKuan + ShuJuXingJianGe)
    const y = qiShiY + hang * (ShuJuKuanGe + ShuJuXingJianGe)
    yuanJiaoJuXing(huaBuShangXiaWen, x, y, geKuan, ShuJuKuanGe, KapianYuanJiao)
    huaBuShangXiaWen.fillStyle = pin.kaPian
    huaBuShangXiaWen.fill()
    huaBuShangXiaWen.strokeStyle = pin.kaPianBianKuang
    huaBuShangXiaWen.lineWidth = 2
    huaBuShangXiaWen.stroke()
    huaBuShangXiaWen.textAlign = 'center'
    huaBuShangXiaWen.textBaseline = 'middle'
    huaBuShangXiaWen.fillStyle = pin.ciWenBen
    huaBuShangXiaWen.font = `${ZhiHao.shuJuBiaoQian}px ${pin.ziTiJiaZu}`
    huaBuShangXiaWen.fillText(tiao.biaoQian, x + geKuan / 2, y + 42)
    huaBuShangXiaWen.fillStyle = pin.zhuWenBen
    huaBuShangXiaWen.font = `${ZhiHao.shuJuZhi}px ${pin.ziTiJiaZu}`
    const zhiHang = duanHang(huaBuShangXiaWen, tiao.zhi, geKuan - 48, 1)
    huaBuShangXiaWen.fillText(zhiHang[0] ?? '', x + geKuan / 2, y + 94)
  })
  const hangShu = Math.ceil(lieBiao.length / ShuJuGeMeiHang)
  return qiShiY + hangShu * ShuJuKuanGe + (hangShu - 1) * ShuJuXingJianGe
}

function huaWeiZhu(huaBuShangXiaWen: CanvasRenderingContext2D, pin: YangShiPin): void {
  const jianBian = huaBuShangXiaWen.createLinearGradient(BianJu, WeiZhuY, BianJu + NeiKuan, WeiZhuY)
  jianBian.addColorStop(0, pin.qiangDiao)
  jianBian.addColorStop(1, pin.qiangDiaoQian)
  yuanJiaoJuXing(huaBuShangXiaWen, BianJu, WeiZhuY, NeiKuan, 8, 4)
  huaBuShangXiaWen.fillStyle = jianBian
  huaBuShangXiaWen.fill()

  huaBuShangXiaWen.textAlign = 'center'
  huaBuShangXiaWen.textBaseline = 'middle'
  huaBuShangXiaWen.fillStyle = pin.zhuWenBen
  huaBuShangXiaWen.font = `${ZhiHao.fuBiaoTi}px ${pin.ziTiJiaZu}`
  huaBuShangXiaWen.fillText(
    quChuKongBai(huoQuFanYi('renZheng', 'yingYongFuBiaoTi')),
    ZhanBaoKuan / 2,
    WeiZhuY + 52,
  )
  huaBuShangXiaWen.fillStyle = pin.ciWenBen
  huaBuShangXiaWen.font = `${ZhiHao.mianZe}px ${pin.ziTiJiaZu}`
  huaBuShangXiaWen.fillText(quChuKongBai(huoQuFanYi('tongYong', 'aiTiShiTiao')), ZhanBaoKuan / 2, WeiZhuY + 104)
}

export async function shengChengZhanBaoHaiBao(yiLai: ZhanBaoShuRu): Promise<Blob> {
  const huaBu = document.createElement('canvas')
  huaBu.width = ZhanBaoKuan
  huaBu.height = ZhanBaoGao
  const huaBuShangXiaWen = huaBu.getContext('2d')
  if (!huaBuShangXiaWen) throw new Error(huoQuFanYi('zhanJi', 'haiBaoShengChengShiBai'))
  const pin = quYangShiPin(yiLai.jieGuoFenLei)

  huaBeiJing(huaBuShangXiaWen, pin)
  huaDingBu(huaBuShangXiaWen, pin)
  huaBiaoQing(huaBuShangXiaWen, pin, yiLai)
  huaJiaoSeMing(
    huaBuShangXiaWen,
    pin,
    quChuKongBai(yiLai.jiaoSeMing) || quChuKongBai(huoQuFanYi('haoYou', 'weiMingMing')),
  )
  const zhuangTaiDiBu = huaJieGuo(huaBuShangXiaWen, pin, yiLai)
  huaShuJuGe(huaBuShangXiaWen, pin, yiLai, zhuangTaiDiBu + 36)
  huaWeiZhu(huaBuShangXiaWen, pin)

  return new Promise<Blob>((jieJue, juJue) => {
    huaBu.toBlob(
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
