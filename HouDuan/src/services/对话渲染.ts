import { AI_PEI_ZHI } from '../config/AI配置'
import { huoQuFanYi } from '../config/translations'
import { gouJianDanTiaoTuXiangKuai, meiTiZhanShiWenBen, shiTuXiangLeiBie } from './AI视觉辅助'
import { gouJianYuYinKeDuWenBen, tiQuYinPinShiJian } from './语音理解'
import { gouJianShiPinKeDuWenBen } from './视频多模态'
import type { DuiHuaKuai } from '../utils/DeepSeek客户端'
import type { DuiHuaLiShiXiang } from '../types'


export const ZAI_TI_BIAO_JI_SHUO_MING =
  '内容里的方括号只是系统标的发送载体标记：图片=对方发了张图片，表情包=对方发了个表情包，语音(N秒)=对方发了条语音，视频、文件 同理，已撤回=那条被对方撤回。它们只在对方真的发来对应载体时才会出现在那一行里；对方发的是普通文字就只会是文字。这些标记不是对方说的话、不是对方的口头禅也不是昵称，不许自己数它们出现了几次，不许把没发来过的载体说成对方发过，更不许拿它们当梗反复引用。'

export interface ZhuangZaiBuFen {
  视频画面描述?: string | null
  视频转写文本?: string | null
}

function shiShiPinWenjian(xiaoXi: DuiHuaLiShiXiang): boolean {
  const ming = xiaoXi.yuanShiWenJianMing || ''
  const xiaoMIME = (xiaoXi.meiTiMIME || '').toLowerCase()
  return (
    xiaoMIME.startsWith('video/') ||
    ming.toLowerCase().match(/\.(mp4|mov|webm|m4v)$/) !== null
  )
}

export const YIN_YONG_ZHAN_SHI_QIAN_ZHUI = '引用'

export type YinYongChaXun = (xiaoXiId: string) => DuiHuaLiShiXiang | null

export function gouJianYinYongChaXun(liShi: DuiHuaLiShiXiang[]): YinYongChaXun {
  const suo = new Map<string, DuiHuaLiShiXiang>()
  for (const xiang of liShi) {
    if (xiang.id && !suo.has(xiang.id)) suo.set(xiang.id, xiang)
  }
  return (xiaoXiId: string) => suo.get(xiaoXiId) ?? null
}

function zhanShiYinYongHang(xiaoXi: DuiHuaLiShiXiang, chaXun: YinYongChaXun): string {
  const beiYongId = xiaoXi.beiYongXiaoXiId
  if (!beiYongId || beiYongId === xiaoXi.id) return ''
  const muBiao = chaXun(beiYongId)
  if (!muBiao) return ''
  const neiRong = muBiao.yi_che_hui
    ? huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
    : zhanShiZaiTiZhengWen(muBiao)
  return `${YIN_YONG_ZHAN_SHI_QIAN_ZHUI}[${muBiao.fa_song_zhe_ming}]: ${neiRong}`
}

export function zhanShiXiaoXiZhengWen(
  xiaoXi: DuiHuaLiShiXiang,
  buFen?: ZhuangZaiBuFen,
  chaXun?: YinYongChaXun,
): string {
  const zhengWen = zhanShiZaiTiZhengWen(xiaoXi, buFen)
  if (!chaXun) return zhengWen
  const yinYong = zhanShiYinYongHang(xiaoXi, chaXun)
  return yinYong ? `${yinYong}\n${zhengWen}` : zhengWen
}

export const WEN_JIAN_KUAI_KAI = '<WEN_JIAN_ZHENG_WEN>'
export const WEN_JIAN_KUAI_BI = '</WEN_JIAN_ZHENG_WEN>'

function zhongHeFengLanNeiBiaoJi(wenBen: string): string {
  return wenBen
    .split(WEN_JIAN_KUAI_BI)
    .join('⟨/WEN_JIAN_ZHENG_WEN⟩')
    .split(WEN_JIAN_KUAI_KAI)
    .join('⟨WEN_JIAN_ZHENG_WEN⟩')
    .replace(/<\|/g, '⟨|')
    .replace(/\|>/g, '|⟩')
}

function zhanShiWenJianNeiRongKuai(xiaoXi: DuiHuaLiShiXiang): string {
  const tiQu = xiaoXi.wenJianTiQu
  if (xiaoXi.yi_che_hui || !tiQu || tiQu.wenBen.trim() === '') return ''
  const shengMing = [huoQuFanYi('liaoTian', 'wenJianZhengWenShengMing')]
  if (tiQu.beiCaiDuan) shengMing.push(huoQuFanYi('liaoTian', 'wenJianZhengWenBeiCaiDuan'))
  return `${WEN_JIAN_KUAI_KAI}\n${zhongHeFengLanNeiBiaoJi(tiQu.wenBen)}\n${WEN_JIAN_KUAI_BI}\n${shengMing.join('')}`
}

function zhanShiZaiTiZhengWen(xiaoXi: DuiHuaLiShiXiang, buFen?: ZhuangZaiBuFen): string {
  if (xiaoXi.meiTiLeiBie === 'yuyin' && !xiaoXi.yi_che_hui) {
    const zhuanXie = (xiaoXi.nei_rong || '').trim()
    if (zhuanXie) {
      return gouJianYuYinKeDuWenBen({
        zhuanXieWenBen: zhuanXie,
        yinPinShiJianMiaoShu: tiQuYinPinShiJian(zhuanXie),
        shiChangHaoMiao: xiaoXi.meiTiShiChangHaoMiao ?? null,
      })
    }
  }
  if (xiaoXi.meiTiLeiBie === 'wenjian' && !xiaoXi.yi_che_hui && shiShiPinWenjian(xiaoXi)) {
    const zhuanXie = (xiaoXi.nei_rong || '').trim()
    return gouJianShiPinKeDuWenBen({
      wenJianMing: xiaoXi.yuanShiWenJianMing || '视频',
      mime: xiaoXi.meiTiMIME,
      shiChangHaoMiao: xiaoXi.meiTiShiChangHaoMiao ?? null,
      zhuanXieWenBen: (buFen?.视频转写文本 || '').trim() || zhuanXie || null,
      huaMianMiaoShu: buFen?.视频画面描述 ?? null,
    })
  }
  if (!(xiaoXi.tuWenHunPai && !xiaoXi.yi_che_hui)) {
    const meiTiMiaoShu = meiTiZhanShiWenBen(xiaoXi.meiTiLeiBie, {
      yiCheHui: xiaoXi.yi_che_hui,
      shiChangHaoMiao: xiaoXi.meiTiShiChangHaoMiao,
      yuanShiWenJianMing: xiaoXi.yuanShiWenJianMing,
      mime: xiaoXi.meiTiMIME,
    })
    if (meiTiMiaoShu) {
      const wenJianKuai = zhanShiWenJianNeiRongKuai(xiaoXi)
      return wenJianKuai ? `${meiTiMiaoShu}\n${wenJianKuai}` : meiTiMiaoShu
    }
  }
  if (xiaoXi.yi_che_hui) return huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
  return xiaoXi.nei_rong
}

export function quZuiXinYongHuXiaoXiXiang(
  liShi: DuiHuaLiShiXiang[],
): DuiHuaLiShiXiang | null {
  for (let i = liShi.length - 1; i >= 0; i--) {
    if (liShi[i].fa_song_zhe_lei_xing === 'yonghu') return liShi[i]
  }
  return null
}

export function quBenLunJiaoDianXiaoXiXiang(
  liShi: DuiHuaLiShiXiang[],
  quDongXiaoXiId?: string | null,
): DuiHuaLiShiXiang | null {
  if (quDongXiaoXiId) {
    for (let i = liShi.length - 1; i >= 0; i--) {
      if (liShi[i].id === quDongXiaoXiId && liShi[i].fa_song_zhe_lei_xing === 'yonghu') return liShi[i]
    }
  }
  return quZuiXinYongHuXiaoXiXiang(liShi)
}

export interface LiShiFenQu {
  背景: DuiHuaLiShiXiang[]
  焦点: DuiHuaLiShiXiang | null
}

export function fenGeZuiXinYongHuXiaoXi(liShi: DuiHuaLiShiXiang[]): LiShiFenQu {
  for (let i = liShi.length - 1; i >= 0; i--) {
    if (liShi[i].fa_song_zhe_lei_xing === 'yonghu') {
      return { 背景: liShi.slice(0, i), 焦点: liShi[i] }
    }
  }
  return { 背景: liShi, 焦点: null }
}

export interface LiShiXuanXiang {
  角色名: string
  用户名: string
  最多条数?: number
  时间在前?: boolean
}

export function zhanShiLiShiWenBen(
  liShi: DuiHuaLiShiXiang[],
  xuanXiang: LiShiXuanXiang,
): string {
  const zuiDa = xuanXiang.最多条数 ?? AI_PEI_ZHI.prompt.liShiXiaoXiShuLiang
  const buZhang = Math.max(1, AI_PEI_ZHI.prompt.liShiCaiDuanBuZhang)
  const zongShu = liShi[0]?.duiHuaZongTiaoShu
  const youZongShu = typeof zongShu === 'number' && zongShu >= liShi.length
    && liShi.every((x) => x.duiHuaZongTiaoShu === zongShu)
  const liQi = youZongShu
    ? Math.max(0, Math.min(liShi.length, Math.floor(Math.max(0, zongShu - zuiDa) / buZhang) * buZhang - (zongShu - liShi.length)))
    : Math.floor(Math.max(0, liShi.length - zuiDa) / buZhang) * buZhang
  const zuiJin = liShi.slice(liQi)
  if (zuiJin.length === 0) return ''
  const chaXun = gouJianYinYongChaXun(liShi)

  return zuiJin
    .map((xiaoXi) => {
      const faSongZhe =
        xiaoXi.fa_song_zhe_lei_xing === 'jiaose' ? xuanXiang.角色名 : xuanXiang.用户名
      return xuanXiang.时间在前
        ? `[${xiaoXi.shi_jian}] ${faSongZhe}: ${zhanShiXiaoXiZhengWen(xiaoXi, undefined, chaXun)}`
        : `${faSongZhe}(${xiaoXi.shi_jian}): ${zhanShiXiaoXiZhengWen(xiaoXi, undefined, chaXun)}`
    })
    .join('\n')
}

export function quBenLunDengDaiHuiFuXiang(liShi: DuiHuaLiShiXiang[]): DuiHuaLiShiXiang[] {
  let qi = liShi.length
  while (qi > 0 && liShi[qi - 1].fa_song_zhe_lei_xing === 'yonghu') qi--
  return liShi.slice(qi)
}

export async function zhuRuBenLunTuXiangKuai(
  liShi: DuiHuaLiShiXiang[],
): Promise<DuiHuaKuai[]> {
  const shangXian = AI_PEI_ZHI.prompt.benLunTuXiangZuiDuoZhuRuShu
  const houXuan = quBenLunDengDaiHuiFuXiang(liShi).filter(
    (xiang) => !xiang.yi_che_hui && shiTuXiangLeiBie(xiang.meiTiLeiBie),
  )
  const jieGuo: DuiHuaKuai[] = []
  for (const xiang of houXuan.slice(-shangXian)) {
    jieGuo.push(...(await gouJianDanTiaoTuXiangKuai(xiang)))
  }
  return jieGuo
}
