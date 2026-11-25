import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { huoQuFanYi } from '../config/翻译表'

const dangQianMuLu = dirname(fileURLToPath(import.meta.url))
const xieYiLuJing = [
  resolve(dangQianMuLu, '../assets/yongHuXieYi.txt'),
  resolve(dangQianMuLu, '../assets/yinSiZhengCe.txt'),
]
const yuanDaiMaMuLu = resolve(dangQianMuLu, '..')
const wenBenHouZhui = /\.(vue|ts|txt|html|json|css|js)$/

function shouJiWenBenWenJian(muLu: string): string[] {
  const jieGuo: string[] = []
  for (const xiang of readdirSync(muLu)) {
    if (xiang === '__tests__' || xiang === 'node_modules') continue
    const quanLuJing = join(muLu, xiang)
    const zhuangTai = statSync(quanLuJing)
    if (zhuangTai.isDirectory()) {
      jieGuo.push(...shouJiWenBenWenJian(quanLuJing))
    } else if (wenBenHouZhui.test(quanLuJing)) {
      jieGuo.push(quanLuJing)
    }
  }
  return jieGuo
}

describe('FP-03 协议元数据', () => {
  it('两份协议头部均显示最新更新日期2026.05.10与版本号v1.0', () => {
    for (const luJing of xieYiLuJing) {
      const neiRong = readFileSync(luJing, 'utf8')
      expect(neiRong, luJing).toContain('最新更新日期2026.05.10，版本号v1.0')
    }
  })

  it('两份协议变更记录整段已删除，联系邮箱统一为新邮箱', () => {
    for (const luJing of xieYiLuJing) {
      const neiRong = readFileSync(luJing, 'utf8')
      expect(neiRong, luJing).not.toContain('附：变更记录')
      expect(neiRong, luJing).not.toContain('变更记录')
      expect(neiRong, luJing).not.toContain('同版本号')
      expect(neiRong, luJing).not.toContain('lianaiba.app')
      expect(neiRong, luJing).toContain('1319676572@qq.com')
    }
  })

  it('节编号与标题之间统一为一个空格', () => {
    for (const luJing of xieYiLuJing) {
      const neiRong = readFileSync(luJing, 'utf8')
      expect(neiRong.match(/^\d+\.\d+[^ \d]/gm) ?? []).toEqual([])
    }
  })

  it('源代码目录无旧日期与旧版本号残留', () => {
    const canLiu: string[] = []
    for (const wenJian of shouJiWenBenWenJian(yuanDaiMaMuLu)) {
      const neiRong = readFileSync(wenJian, 'utf8')
      if (neiRong.includes('2026.10.23')) canLiu.push(`${wenJian} :: 2026.10.23`)
      if (neiRong.includes('v1.1')) canLiu.push(`${wenJian} :: v1.1`)
    }
    expect(canLiu).toEqual([])
  })
})

describe('FP-03 渣男渣女挑战勾选说明', () => {
  it('翻译表文案为对象仍是你所选的性格且保留省略号', () => {
    expect(huoQuFanYi('ziLiaoSheZhi', 'zhaXingTiShi')).toBe(
      '勾选后，对象仍是你所选的性格，但{ta}只是为了玩弄你的感情罢了……',
    )
  })

  it('源代码目录无旧说明文本残留', () => {
    const canLiu: string[] = []
    for (const wenJian of shouJiWenBenWenJian(yuanDaiMaMuLu)) {
      const neiRong = readFileSync(wenJian, 'utf8')
      if (neiRong.includes('对象为你所选性格')) canLiu.push(`${wenJian} :: 对象为你所选性格`)
    }
    expect(canLiu).toEqual([])
  })
})
