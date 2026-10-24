import { randomInt, randomUUID, timingSafeEqual } from 'crypto'
import { redis } from '../redis'
import { peiZhi } from '../config'
import { debug日志 } from '../utils/debug日志'
import type { YanZhengMaYongTu } from './短信'

export const REN_JI_ZI_FU_BIAO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const REN_JI_PIAO_JU_ZHENG_ZE = /^rj_[0-9a-f]{32}$/
const REN_JI_DA_AN_ZHENG_ZE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/
const REN_JI_DA_AN_CHANG_DU = 4

const REN_JI_ZI_XING: Readonly<Record<string, readonly string[]>> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
}

export type RenJiXiaoHaoYuanYin =
  | 'guoQi'
  | 'ipBuPiPei'
  | 'yongTuBuPiPei'
  | 'daAnCuoWu'
  | 'changShiChaoChu'
  | 'piaoJuBuHeFa'
  | 'daAnBuHeFa'
  | 'neiBuCuoWu'

export interface RenJiXiaoHaoJieGuo {
  cheng_gong: boolean
  yuanYin?: RenJiXiaoHaoYuanYin
}

export interface RenJiTiaoZhanShuJu {
  id: string
  svg: string
  guoQiMiao: number
}

function quYouXiaoMiao(): number {
  const zhi = peiZhi.renJiYanZheng.youXiaoMiao
  return Number.isSafeInteger(zhi) && zhi >= 30 && zhi <= 600 ? zhi : 120
}

function quZuiDaChangShi(): number {
  const zhi = peiZhi.renJiYanZheng.zuiDaChangShi
  return Number.isSafeInteger(zhi) && zhi >= 1 && zhi <= 10 ? zhi : 5
}

function suiJi(zuiDa: number): number {
  return randomInt(0, zuiDa)
}

function geShiHuaShu(zhi: number): string {
  return zhi.toFixed(1)
}

function shengChengZiXingZu(ziFu: string, xuHao: number): string {
  const ziXing = REN_JI_ZI_XING[ziFu]
  if (!ziXing) return ''
  const jiZhunX = 19 + xuHao * 40 + suiJi(5) - 2
  const jiZhunY = 13 + suiJi(5) - 2
  const xuanZhuan = suiJi(15) - 7
  const dian: string[] = []
  for (let hangHao = 0; hangHao < ziXing.length; hangHao += 1) {
    const hang = ziXing[hangHao]
    for (let lieHao = 0; lieHao < hang.length; lieHao += 1) {
      if (hang[lieHao] !== '1') continue
      const banJing = 2 + suiJi(5) / 10
      dian.push(
        `<circle cx="${geShiHuaShu(lieHao * 6 + 3)}" cy="${geShiHuaShu(hangHao * 6 + 3)}" r="${geShiHuaShu(banJing)}"/>`,
      )
    }
  }
  return `<g transform="translate(${jiZhunX} ${jiZhunY}) rotate(${xuanZhuan})" fill="#e9d29a">${dian.join('')}</g>`
}

export function shengChengRenJiDaAn(): string {
  let daAn = ''
  for (let xuHao = 0; xuHao < REN_JI_DA_AN_CHANG_DU; xuHao += 1) {
    daAn += REN_JI_ZI_FU_BIAO[suiJi(REN_JI_ZI_FU_BIAO.length)]
  }
  return daAn
}

export function shengChengRenJiTiaoZhanSvg(daAn: string): string {
  const ziXing = daAn
    .split('')
    .map((ziFu, xuHao) => shengChengZiXingZu(ziFu, xuHao))
    .join('')
  const ganRao: string[] = []
  for (let xuHao = 0; xuHao < 3; xuHao += 1) {
    ganRao.push(
      `<line x1="${suiJi(30)}" y1="${suiJi(64)}" x2="${150 + suiJi(30)}" y2="${suiJi(64)}" stroke="#c9a96a" stroke-opacity="0.2" stroke-width="1"/>`,
    )
  }
  for (let xuHao = 0; xuHao < 10; xuHao += 1) {
    ganRao.push(
      `<circle cx="${suiJi(180)}" cy="${suiJi(64)}" r="1" fill="#d5b878" fill-opacity="0.45"/>`,
    )
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 64" width="180" height="64" aria-hidden="true" focusable="false"><rect width="180" height="64" rx="12" fill="#141a2d"/><rect x="0.5" y="0.5" width="179" height="63" rx="11.5" fill="none" stroke="#c9a96a" stroke-opacity="0.5"/>${ganRao.join('')}${ziXing}</svg>`
}

function huoQuCunChuJian(piaoJu: string): string {
  return `ren_ji_tiao_zhan:${piaoJu}`
}

export function shiHeFaRenJiPiaoJu(zhi: unknown): zhi is string {
  return typeof zhi === 'string' && REN_JI_PIAO_JU_ZHENG_ZE.test(zhi)
}

export function guiYiHuaRenJiDaAn(zhi: unknown): string {
  return typeof zhi === 'string' ? zhi.trim().toUpperCase() : ''
}

export function shiHeFaRenJiDaAn(zhi: unknown): zhi is string {
  return REN_JI_DA_AN_ZHENG_ZE.test(guiYiHuaRenJiDaAn(zhi))
}

function anQuanXiangDeng(cunChu: string, tiJiao: string): boolean {
  const cunChuHuan = Buffer.from(cunChu, 'utf8')
  const tiJiaoHuan = Buffer.from(tiJiao, 'utf8')
  return cunChuHuan.length === tiJiaoHuan.length && timingSafeEqual(cunChuHuan, tiJiaoHuan)
}

export async function qianFaRenJiTiaoZhan(
  ip: string,
  yongTu: YanZhengMaYongTu,
): Promise<RenJiTiaoZhanShuJu | null> {
  const daAn = shengChengRenJiDaAn()
  const piaoJu = `rj_${randomUUID().replace(/-/g, '')}`
  const guoQiMiao = quYouXiaoMiao()
  const cunChuJian = huoQuCunChuJian(piaoJu)
  try {
    await redis.hset(cunChuJian, 'daAn', daAn, 'ip', ip, 'yongTu', yongTu, 'changShiCiShu', 0)
    await redis.expire(cunChuJian, guoQiMiao)
  } catch (cuoWu) {
    await redis.del(cunChuJian).catch(() => null)
    debug日志.error('人机验证', '挑战写入缓存失败', {
      xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return null
  }
  return {
    id: piaoJu,
    svg: shengChengRenJiTiaoZhanSvg(daAn),
    guoQiMiao,
  }
}

export async function xiaoHaoRenJiTiaoZhan(
  piaoJu: unknown,
  daAn: unknown,
  ip: string,
  yongTu: YanZhengMaYongTu,
): Promise<RenJiXiaoHaoJieGuo> {
  if (!shiHeFaRenJiPiaoJu(piaoJu)) {
    return { cheng_gong: false, yuanYin: 'piaoJuBuHeFa' }
  }
  const guiYiDaAn = guiYiHuaRenJiDaAn(daAn)
  if (!shiHeFaRenJiDaAn(guiYiDaAn)) {
    return { cheng_gong: false, yuanYin: 'daAnBuHeFa' }
  }
  const cunChuJian = huoQuCunChuJian(piaoJu)
  try {
    const cunChu = await redis.hgetall(cunChuJian)
    if (!cunChu || !cunChu.daAn) {
      return { cheng_gong: false, yuanYin: 'guoQi' }
    }
    if (cunChu.ip !== ip) {
      return { cheng_gong: false, yuanYin: 'ipBuPiPei' }
    }
    if (cunChu.yongTu !== yongTu) {
      return { cheng_gong: false, yuanYin: 'yongTuBuPiPei' }
    }
    if (anQuanXiangDeng(cunChu.daAn, guiYiDaAn)) {
      const shanChuShu = await redis.del(cunChuJian)
      return shanChuShu === 1
        ? { cheng_gong: true }
        : { cheng_gong: false, yuanYin: 'guoQi' }
    }
    const changShiCiShu = await redis.hincrby(cunChuJian, 'changShiCiShu', 1)
    if (changShiCiShu === 1 && (await redis.ttl(cunChuJian)) < 0) {
      await redis.del(cunChuJian)
      return { cheng_gong: false, yuanYin: 'guoQi' }
    }
    const chaoChu = changShiCiShu >= quZuiDaChangShi()
    if (chaoChu) await redis.del(cunChuJian)
    return { cheng_gong: false, yuanYin: chaoChu ? 'changShiChaoChu' : 'daAnCuoWu' }
  } catch (cuoWu) {
    debug日志.warn('人机验证', '校验缓存读写失败', {
      xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return { cheng_gong: false, yuanYin: 'neiBuCuoWu' }
  }
}
