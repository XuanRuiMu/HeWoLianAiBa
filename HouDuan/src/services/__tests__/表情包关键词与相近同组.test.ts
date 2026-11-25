import { afterEach, describe, expect, it } from 'vitest'
import { 候选系统表情 } from '../表情包库'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const YuanMuLuHuanJing = process.env['BIAO_QING_BAO_MU_LU']
const linShiMuLuLieBiao: string[] = []

function chuangJianMuLu(): string {
  const muLu = fs.mkdtempSync(path.join(os.tmpdir(), 'biaoqing-keyword-'))
  linShiMuLuLieBiao.push(muLu)
  process.env['BIAO_QING_BAO_MU_LU'] = muLu
  return muLu
}

function xieTuPian(muLu: string, ming: string): void {
  fs.writeFileSync(path.join(muLu, `${ming}.png`), Buffer.from(ming, 'utf8'))
}

function xieBiaoZhu(muLu: string, ming: string, duiXiang: Record<string, unknown>): void {
  fs.writeFileSync(path.join(muLu, `${ming}.json`), JSON.stringify(duiXiang), 'utf8')
}

afterEach(() => {
  for (const muLu of linShiMuLuLieBiao.splice(0)) {
    fs.rmSync(muLu, { recursive: true, force: true })
  }
  if (YuanMuLuHuanJing === undefined) delete process.env['BIAO_QING_BAO_MU_LU']
  else process.env['BIAO_QING_BAO_MU_LU'] = YuanMuLuHuanJing
})

describe('文字关键词优先与相似同组抽取', () => {
  it('聊天明确提到瓜时优先命中瓜相关，不混入无关梗图', async () => {
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'gua')
    xieTuPian(muLu, 'xiao')
    xieTuPian(muLu, 'mao')
    xieBiaoZhu(muLu, 'gua', { 短名: '瓜保熟', 描述: '这瓜保熟吗', 情绪标签: '好笑', 适用场景: '说瓜、质疑真假时' })
    xieBiaoZhu(muLu, 'xiao', { 短名: '大笑', 描述: '哈哈哈大笑', 情绪标签: '好笑', 适用场景: '好笑' })
    xieBiaoZhu(muLu, 'mao', { 短名: '猫猫', 描述: '猫猫可爱', 情绪标签: '卖萌', 适用场景: '卖萌' })
    const jieGuo = await 候选系统表情('好笑', 3, { yunXuFengGe: ['黄脸','祝福','日常','梗图'], guanXiJieDuanXuHao: 6, wenBen: '这瓜保熟吗' })
    expect(jieGuo.map((x) => x.duanMing)).toEqual(['瓜保熟'])
  })

  it('相近的同一情绪图不止一张时，从多张相近候选中随机抽取', async () => {
    const muLu = chuangJianMuLu()
    for (const ming of ['笑一', '笑二', '笑三', '哭一']) {
      xieTuPian(muLu, ming)
      xieBiaoZhu(muLu, ming, { 短名: ming, 描述: `测试${ming}`, 情绪标签: ming.startsWith('笑') ? '好笑' : '委屈', 适用场景: '聊天' })
    }
    const chuXian = new Set<string>()
    for (let i = 0; i < 40; i += 1) {
      const jieGuo = await 候选系统表情('好笑', 2)
      jieGuo.forEach((x) => chuXian.add(x.duanMing))
    }
    expect(chuXian.has('笑一')).toBe(true)
    expect(chuXian.has('笑二')).toBe(true)
    expect(chuXian.has('笑三')).toBe(true)
    expect(chuXian.has('哭一')).toBe(false)
  })
})
