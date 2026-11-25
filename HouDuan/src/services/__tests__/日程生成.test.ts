import { describe, expect, it } from 'vitest'
import { jieXiRiChengShuZu, gouJianRiChengPrompt } from '../日程生成'

describe('日程生成提示词', () => {
  it('工作日和周末提示不同', () => {
    const jiaoSe = { ming_zi: '糖糖', shen_fen: '大学生', nian_ling: 20, xi_hao: ['摄影'] }
    const gongZuo = gouJianRiChengPrompt(jiaoSe, 3)
    const zhouMo = gouJianRiChengPrompt(jiaoSe, 6)
    expect(gongZuo).toContain('工作日')
    expect(zhouMo).toContain('周末')
  })

  it('带人设信息且禁止编聊天日程', () => {
    const wen = gouJianRiChengPrompt({
      ming_zi: '糖糖',
      shen_fen: '大学生',
      zhi_ye: '汉语言文学',
      nian_ling: 20,
      xi_hao: ['摄影'],
      cheng_shi: '长沙',
    }, 1)
    expect(wen).toContain('糖糖')
    expect(wen).toContain('大学生')
    expect(wen).toContain('汉语言文学')
    expect(wen).toContain('长沙')
    expect(wen).toContain('摄影')
    expect(wen).toContain('不要排「和你聊天」')
    expect(wen).toContain('8 到 12 段')
  })
})

describe('日程 JSON 解析', () => {
  it('标准数组解析', () => {
    const yuan = JSON.stringify([
      { shi_jian: '07:30', huo_dong: '起床洗漱' },
      { shi_jian: '08:30', huo_dong: '上课' },
    ])
    const jieGuo = jieXiRiChengShuZu(yuan)
    expect(jieGuo.length).toBe(2)
    expect(jieGuo[0].huoDong).toBe('起床洗漱')
  })

  it('中英文字段名都认', () => {
    const yuan = JSON.stringify([{ time: '09:00', activity: '自习' }])
    const jieGuo = jieXiRiChengShuZu(yuan)
    expect(jieGuo.length).toBe(1)
    expect(jieGuo[0].shiJian).toBe('09:00')
    expect(jieGuo[0].huoDong).toBe('自习')
  })

  it('空活动、非法时间、非数组项全部跳过', () => {
    const yuan = JSON.stringify([
      { shi_jian: '07:30', huo_dong: '' },
      { shi_jian: 'abc', huo_dong: '上课' },
      { shi_jian: '08:30', huo_dong: '有效' },
      null,
      42,
      '字符串',
      { shi_jian: '09:00' },
    ])
    const jieGuo = jieXiRiChengShuZu(yuan)
    expect(jieGuo.length).toBe(1)
    expect(jieGuo[0].huoDong).toBe('有效')
  })

  it('带 markdown 代码围栏的输入也能解析', () => {
    const yuan = '```json\n[{"shi_jian":"10:00","huo_dong":"上课"}]\n```'
    const jieGuo = jieXiRiChengShuZu(yuan)
    expect(jieGuo.length).toBe(1)
  })

  it('坏 JSON、空串、非数组都不抛错，返回空', () => {
    expect(jieXiRiChengShuZu('不是JSON')).toEqual([])
    expect(jieXiRiChengShuZu('')).toEqual([])
    expect(jieXiRiChengShuZu('{}')).toEqual([])
    expect(jieXiRiChengShuZu('null')).toEqual([])
  })
})
describe('日程 JSON 解析（第三方模型形态兼容）', () => {
  it('单对象形态也能解析', () => {
    const jieGuo = jieXiRiChengShuZu('{"shi_jian":"07:30","huo_dong":"起床洗漱"}')
    expect(jieGuo.length).toBe(1)
    expect(jieGuo[0].shiJian).toBe('07:30')
  })

  it('schedule 包裹形态能解析', () => {
    const jieGuo = jieXiRiChengShuZu('{"schedule":[{"time":"08:00","activity":"早餐"}]}')
    expect(jieGuo.length).toBe(1)
    expect(jieGuo[0].huoDong).toBe('早餐')
  })

  it('riCheng 包裹形态能解析', () => {
    const jieGuo = jieXiRiChengShuZu('{"riCheng":[{"shi_jian":"09:00","huo_dong":"上课"}]}')
    expect(jieGuo.length).toBe(1)
    expect(jieGuo[0].huoDong).toBe('上课')
  })
})
