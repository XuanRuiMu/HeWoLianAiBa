import fs from 'node:fs'
import path from 'node:path'
import Rough from 'roughjs'

const shuChuLuJing = path.resolve(process.cwd(), 'src/assets/手绘笔触路径.ts')
const jiaoXingKuanDu = 240
const wenYangYiDanYuan = 112
const wenYangYiJuLi = 28
const wenYangErDanYuan = 168
const wenYangErJuLi = 42
const waiKuO = 18

const generator = Rough.generator()

function quZhengShuZhi(yuanShi) {
  return yuanShi.replace(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g, (piPei) => {
    const shuZhi = Number(piPei)
    if (!Number.isFinite(shuZhi)) return piPei
    const baoLiu = Math.round(shuZhi * 10) / 10
    return Object.is(baoLiu, -0) ? '0' : String(baoLiu)
  })
}

function luJingQingDan(xingZhuang) {
  return generator
    .toPaths(xingZhuang)
    .map((xiang) => quZhengShuZhi(xiang.d))
    .filter((luJing) => luJing.length > 1)
}

function sanJiaoXing() {
  return [
    [0, 0],
    [jiaoXingKuanDu - 4, 0],
    [0, jiaoXingKuanDu - 4],
  ]
}

function jiaoXingTianChong(seed) {
  const xin = generator.polygon(sanJiaoXing(), {
    fill: '#000000',
    fillStyle: 'hachure',
    hachureAngle: 135,
    hachureGap: 9,
    fillWeight: 1.25,
    stroke: '#000000',
    strokeWidth: 1.25,
    roughness: 2.4,
    bowing: 1.5,
    seed,
  })
  return luJingQingDan(xin).slice(0, 1)
}

function jiaoXingLunKuo(seed) {
  const bian = jiaoXingKuanDu - 4
  const xin = generator.linearPath(
    [
      [bian, 0],
      [0, bian],
    ],
    {
      stroke: '#000000',
      strokeWidth: 2.1,
      roughness: 2.8,
      bowing: 2.3,
      seed,
    },
  )
  return luJingQingDan(xin)
}

function jiaoXingTuoWei(seed) {
  const bian = jiaoXingKuanDu - 4
  const pianYi = [56, 102, 150, 196]
  return pianYi.map((pian, xuHao) =>
    luJingQingDan(
      generator.line(pian, bian, bian, pian, {
        stroke: '#000000',
        strokeWidth: 1.7 - xuHao * 0.32,
        roughness: 2.1,
        bowing: 1.7,
        seed: seed + xuHao + 11,
      }),
    )[0],
  )
}

function wenYangLuJing(danYuan, juLi, seed, kuanDu) {
  const chu = []
  for (let pian = juLi; pian < danYuan * 2; pian += juLi) {
    const luJing = luJingQingDan(
      generator.line(-waiKuO, pian + waiKuO, pian + waiKuO, -waiKuO, {
        stroke: '#000000',
        strokeWidth: kuanDu,
        roughness: 1.7,
        bowing: 1.4,
        seed: seed + pian,
      }),
    )[0]
    if (luJing) chu.push(luJing)
  }
  return chu
}

const jiaoXingZuoShang = {
  tianChong: jiaoXingTianChong(1011),
  lunKuo: jiaoXingLunKuo(2022),
  tuoWei: jiaoXingTuoWei(3033),
}

const wenYangYi = {
  danYuan: wenYangYiDanYuan,
  luJing: wenYangLuJing(wenYangYiDanYuan, wenYangYiJuLi, 4044, 1.5),
}

const wenYangEr = {
  danYuan: wenYangErDanYuan,
  luJing: wenYangLuJing(wenYangErDanYuan, wenYangErJuLi, 5055, 1.1),
}

function duiXiangDaoZiDong(ming, shu) {
  return `export const ${ming} = ${JSON.stringify(shu, null, 2)} as const\n`
}

const neiRong = [
  'export const jiaoXingKuanDu = ' + jiaoXingKuanDu,
  '',
  duiXiangDaoZiDong('jiaoXingZuoShang', jiaoXingZuoShang),
  duiXiangDaoZiDong('wenYangYi', wenYangYi),
  duiXiangDaoZiDong('wenYangEr', wenYangEr),
].join('\n')

if (/NaN|Infinity|\[object/.test(neiRong)) {
  throw new Error('SHENG_CHENG_SHI_BAI_LU_JING_HAN_FEI_FA_SHU_ZHI')
}

fs.writeFileSync(shuChuLuJing, neiRong, 'utf8')

const jiShu = {
  tianChongShu: jiaoXingZuoShang.tianChong.length,
  lunKuoShu: jiaoXingZuoShang.lunKuo.length,
  tuoWeiShu: jiaoXingZuoShang.tuoWei.length,
  wenYangYiShu: wenYangYi.luJing.length,
  wenYangErShu: wenYangEr.luJing.length,
  ziJieShu: neiRong.length,
}
console.log('SHENG_CHENG_WAN_CHENG ' + JSON.stringify(jiShu))
