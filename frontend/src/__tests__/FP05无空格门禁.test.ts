import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const dangQianMuLu = dirname(fileURLToPath(import.meta.url))
const qianDuanFanYiLuJing = resolve(dangQianMuLu, '../config/translations.ts')
const houDuanFanYiLuJing = resolve(dangQianMuLu, '../../../backend/src/config/translations.ts')
const qianDuanShiTuMuLu = resolve(dangQianMuLu, '../views')
const qianDuanZuJianMuLu = resolve(dangQianMuLu, '../components')
const houDuanLuYouMuLu = resolve(dangQianMuLu, '../../../backend/src/routes')
const yeMianMiaoShuLuJing = resolve(dangQianMuLu, '../../index.html')
const xieYiWenBenLuJing = [
  resolve(dangQianMuLu, '../assets/yongHuXieYi.txt'),
  resolve(dangQianMuLu, '../assets/yinSiZhengCe.txt'),
]

const hanZiKongZiMu = /[一-鿿] +[A-Za-z0-9]/
const ziMuKongHanZi = /[A-Za-z0-9] +[一-鿿]/
const hanZiKongZhanWei = /[一-鿿] +\{/
const zhanWeiKongHanZi = /\} +[一-鿿]/

function tiQuHanZiZiFuChuan(yuanMa: string): string[] {
  const jieGuo: string[] = []
  for (const hang of yuanMa.split('\n')) {
    const quDuan = hang.trim()
    if (quDuan.startsWith('//') || quDuan.startsWith('*') || quDuan.startsWith('/*')) {
      continue
    }
    const zhengZe = /'([^']*[一-鿿][^']*)'|"([^"]*[一-鿿][^"]*)"|`([^`]*[一-鿿][^`]*)`/g
    let piPei: RegExpExecArray | null
    while ((piPei = zhengZe.exec(hang)) !== null) {
      jieGuo.push(piPei[0])
    }
  }
  return jieGuo
}

function youHunPaiKongGe(ziFuChuan: string): boolean {
  return (
    hanZiKongZiMu.test(ziFuChuan) ||
    ziMuKongHanZi.test(ziFuChuan) ||
    hanZiKongZhanWei.test(ziFuChuan) ||
    zhanWeiKongHanZi.test(ziFuChuan)
  )
}

function shouJiVueWenJian(muLu: string): string[] {
  const jieGuo: string[] = []
  for (const xiang of readdirSync(muLu)) {
    const quanLuJing = join(muLu, xiang)
    const zhuangTai = statSync(quanLuJing)
    if (zhuangTai.isDirectory()) {
      jieGuo.push(...shouJiVueWenJian(quanLuJing))
    } else if (xiang.endsWith('.vue')) {
      jieGuo.push(quanLuJing)
    }
  }
  return jieGuo
}

function tiQuMoBanChunWenBenHang(yuanMa: string): string[] {
  const moBanPiPei = yuanMa.match(/<template>([\s\S]*?)<\/template>/)
  if (!moBanPiPei) return []
  let neiRong = moBanPiPei[1].replace(/<!--[\s\S]*?-->/g, '')
  neiRong = neiRong.replace(/<[^>]*>/g, '')
  neiRong = neiRong.replace(/\{\{[\s\S]*?\}\}/g, '　')
  return neiRong.split('\n')
}

describe('FP-05 无空格门禁', () => {
  it('前端翻译文件零中英数字混排空格', () => {
    const yuanMa = readFileSync(qianDuanFanYiLuJing, 'utf8')
    const weiGui = tiQuHanZiZiFuChuan(yuanMa).filter(youHunPaiKongGe)
    expect(weiGui).toEqual([])
  })

  it('后端翻译文件零中英数字混排空格', () => {
    const yuanMa = readFileSync(houDuanFanYiLuJing, 'utf8')
    const weiGui = tiQuHanZiZiFuChuan(yuanMa).filter(youHunPaiKongGe)
    expect(weiGui).toEqual([])
  })

  it('账号与安全描述走翻译无硬编码', () => {
    const yuanMa = readFileSync(resolve(dangQianMuLu, '../views/账号与安全.vue'), 'utf8')
    expect(yuanMa).toContain("huoQuFanYi('duoMeiTi', 'zhangHaoAnQuanMiaoShu')")
    expect(yuanMa).not.toContain('base64 形式')
    expect(yuanMa).not.toContain('传输至 DeepSeek')
  })

  it('模板插值组合零空格', () => {
    const tiaoZhanZhuYe = readFileSync(resolve(dangQianMuLu, '../views/挑战主页.vue'), 'utf8')
    expect(tiaoZhanZhuYe).toContain("{{ gaiKuang.ji_fen }}{{ huoQuFanYi('tiaoZhan', 'fenDanWei') }}")
    const junShiXiangQing = readFileSync(resolve(dangQianMuLu, '../views/军师记录详情.vue'), 'utf8')
    expect(junShiXiangQing).toContain("{{ huoQuFanYi('junShi', 'cheHuiYu') }}{{ xiaoXi.che_hui_shi_jian }}")
    const shiShiRiZhi = readFileSync(resolve(dangQianMuLu, '../components/实时日志.vue'), 'utf8')
    expect(shiShiRiZhi).toContain("{{ huoQuFanYi('shiShiRiZhi', 'tiaoShu') }}{{")
    expect(shiShiRiZhi).toContain("{{ huoQuFanYi('shiShiRiZhi', 'diuQi') }}{{")
    const guanLiJianKong = readFileSync(resolve(dangQianMuLu, '../components/管理员监控.vue'), 'utf8')
    expect(guanLiJianKong).toContain('{{ 维度.维度键 }}{{ 维度')
  })

  it('后端工具用户可见提示零中英数字混排空格', () => {
    const wenJianLieBiao = [
      '../../../backend/src/utils/jwt.ts',
      '../../../backend/src/utils/邮件告警.ts',
    ]
    const weiGui: string[] = []
    for (const xiangDuiLuJing of wenJianLieBiao) {
      const yuanMa = readFileSync(resolve(dangQianMuLu, xiangDuiLuJing), 'utf8')
      for (const ziFuChuan of tiQuHanZiZiFuChuan(yuanMa)) {
        if (youHunPaiKongGe(ziFuChuan)) {
          weiGui.push(`${xiangDuiLuJing} :: ${ziFuChuan.slice(0, 80)}`)
        }
      }
    }
    expect(weiGui).toEqual([])
  })

  it('后端全路由用户可见提示零中英数字混排空格', () => {
    const weiGui: string[] = []
    for (const xiang of readdirSync(houDuanLuYouMuLu)) {
      if (!xiang.endsWith('.ts')) continue
      const yuanMa = readFileSync(join(houDuanLuYouMuLu, xiang), 'utf8')
      for (const ziFuChuan of tiQuHanZiZiFuChuan(yuanMa)) {
        if (youHunPaiKongGe(ziFuChuan)) {
          weiGui.push(`${xiang} :: ${ziFuChuan.slice(0, 80)}`)
        }
      }
    }
    expect(weiGui).toEqual([])
  })

  it('前端模板纯文本零中英数字混排空格', () => {
    const weiGui: string[] = []
    const wenJianLieBiao = [
      ...shouJiVueWenJian(qianDuanShiTuMuLu),
      ...shouJiVueWenJian(qianDuanZuJianMuLu),
    ]
    for (const wenJian of wenJianLieBiao) {
      const yuanMa = readFileSync(wenJian, 'utf8')
      for (const hang of tiQuMoBanChunWenBenHang(yuanMa)) {
        if (!/[一-鿿]/.test(hang)) continue
        if (youHunPaiKongGe(hang)) {
          weiGui.push(`${wenJian} :: ${hang.trim().slice(0, 80)}`)
        }
      }
    }
    expect(weiGui).toEqual([])
  })

  it('页面描述与协议文本零中英数字混排空格', () => {
    const weiGui: string[] = []
    const yeMian = readFileSync(yeMianMiaoShuLuJing, 'utf8')
    for (const hang of yeMian.split('\n')) {
      if (!/[一-鿿]/.test(hang)) continue
      if (youHunPaiKongGe(hang)) {
        weiGui.push(`index.html :: ${hang.trim().slice(0, 80)}`)
      }
    }
    for (const luJing of xieYiWenBenLuJing) {
      const neiRong = readFileSync(luJing, 'utf8')
      for (const hang of neiRong.split('\n')) {
        if (!/[一-鿿]/.test(hang)) continue
        if (youHunPaiKongGe(hang)) {
          weiGui.push(`${luJing} :: ${hang.trim().slice(0, 80)}`)
        }
      }
    }
    expect(weiGui).toEqual([])
  })
})
