import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, it, expect } from 'vitest'
import { 候选系统表情 } from '../表情包库'

const YuanMuLuHuanJing = process.env['BIAO_QING_BAO_MU_LU']

const linShiMuLuLieBiao: string[] = []

function chuangJianMuLu(): string {
  const muLu = fs.mkdtempSync(path.join(os.tmpdir(), 'biaoqingbao-zhenshi-'))
  linShiMuLuLieBiao.push(muLu)
  process.env['BIAO_QING_BAO_MU_LU'] = muLu
  return muLu
}

afterEach(() => {
  for (const muLu of linShiMuLuLieBiao.splice(0)) {
    fs.rmSync(muLu, { recursive: true, force: true })
  }
  if (YuanMuLuHuanJing === undefined) delete process.env['BIAO_QING_BAO_MU_LU']
  else process.env['BIAO_QING_BAO_MU_LU'] = YuanMuLuHuanJing
})

function xieTuPian(muLu: string, ming: string): void {
  fs.writeFileSync(path.join(muLu, `${ming}.png`), Buffer.from(ming, 'utf8'))
}

describe('真实标注回归：人设气质+圈层门槛读入与候选过滤', () => {
  it('温柔人设只能拿温柔图；其他气质不流通', async () => {
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'ta')
    xieTuPian(muLu, 'ke')
    fs.writeFileSync(
      path.join(muLu, 'ta.json'),
      JSON.stringify({
        短名: 'ta',
        描述: '拥抱温柔',
        情绪标签: '安慰',
        适用场景: '安慰对方时',
        启用: true,
        风格: '日常',
        关系阶段下限: '认识',
        人设气质: ['温柔治愈'],
        圈层门槛: '大众',
      }),
      'utf8',
    )
    fs.writeFileSync(
      path.join(muLu, 'ke.json'),
      JSON.stringify({
        短名: 'ke',
        描述: '嘲笑翻白',
        情绪标签: '好笑',
        适用场景: '吐槽',
        启用: true,
        风格: '梗图',
        关系阶段下限: '认识',
        人设气质: ['沙雕搞怪'],
        圈层门槛: '大众',
      }),
      'utf8',
    )

    const wenRou = await 候选系统表情(null, 10, {
      yunXuFengGe: ['黄脸', '祝福', '日常', '梗图'],
      guanXiJieDuanXuHao: 2,
      renSheQiZhi: ['温柔治愈'],
    })
    expect(wenRou.map((x) => x.duanMing)).toEqual(['ta'])

    const keAi = await 候选系统表情(null, 10, {
      yunXuFengGe: ['黄脸', '祝福', '日常', '梗图'],
      guanXiJieDuanXuHao: 2,
      renSheQiZhi: ['沙雕搞怪'],
    })
    expect(keAi.map((x) => x.duanMing)).toEqual(['ke'])
  })

  it('深度梗图必须达到熟悉阶段才放行', async () => {
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'deep')
    fs.writeFileSync(
      path.join(muLu, 'deep.json'),
      JSON.stringify({
        短名: 'deep',
        描述: '圈内黑话梗图',
        情绪标签: '好笑',
        适用场景: '熟人斗梗',
        启用: true,
        风格: '梗图',
        关系阶段下限: '认识',
        人设气质: ['沙雕搞怪'],
        圈层门槛: '深度梗',
      }),
      'utf8',
    )

    const shuXiQian = await 候选系统表情(null, 10, {
      yunXuFengGe: ['黄脸', '祝福', '日常', '梗图'],
      guanXiJieDuanXuHao: 2,
      renSheQiZhi: ['沙雕搞怪'],
    })
    expect(shuXiQian.map((x) => x.duanMing)).not.toContain('deep')

    const shuXiHou = await 候选系统表情(null, 10, {
      yunXuFengGe: ['黄脸', '祝福', '日常', '梗图'],
      guanXiJieDuanXuHao: 3,
      renSheQiZhi: ['沙雕搞怪'],
    })
    expect(shuXiHou.map((x) => x.duanMing)).toContain('deep')
  })
})
