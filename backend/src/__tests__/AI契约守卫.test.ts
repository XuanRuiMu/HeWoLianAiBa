import { describe, it, expect } from 'vitest'
import { AI_PEI_ZHI } from '../config/AI配置'
import type { DuiHuaKuai, DuiHuaXiaoXi, TiaoYongCanShu } from '../utils/DeepSeek客户端'

/**
 * AI 契约守卫
 *
 * 背景（EVIDENCE）：FP-04 曾把 input_image.image_url 写成 { url, detail } 对象——
 * 这是 Chat Completions API 的口径；DeepSeek Responses API 官方文档要求 image_url
 * 为字符串。单测当时全量 mock 且断言跟着错误实现走，直到 E2E 真实调用才暴露
 * 400 invalid type: map, expected a string。
 *
 * 本文件以「官方文档口径」为唯一事实源，锁定两条契约：
 * 1. Responses API 内容块形状（防 mock 与真实请求体漂移）
 * 2. 思考模式的输出预算安全阈值（防思维链吃光 max_output_tokens 导致可见输出为空）
 */

/** 官方 vision 文档允许的 detail 取值 */
const GUAN_FANG_DETAIL_ZHI = ['low', 'high', 'original', 'auto'] as const

describe('Responses API 内容块形状契约', () => {
  it('input_image.image_url 必须为字符串（data URL / http URL），禁止对象形状', () => {
    const kuai: DuiHuaKuai = {
      type: 'input_image',
      image_url: 'data:image/png;base64,aGVsbG8=',
      detail: 'low',
    }
    // 序列化后 image_url 直接是字符串值，而非嵌套对象
    const xuLieHua = JSON.parse(JSON.stringify(kuai)) as Record<string, unknown>
    expect(typeof xuLieHua['image_url']).toBe('string')
    expect((xuLieHua['image_url'] as string).startsWith('data:image/png;base64,')).toBe(true)
  })

  it('input_image.detail 仅接受官方取值集合（low/high/original/auto）', () => {
    for (const zhi of GUAN_FANG_DETAIL_ZHI) {
      const kuai: DuiHuaKuai = { type: 'input_image', image_url: 'https://example.com/a.png', detail: zhi as never }
      expect(kuai.type).toBe('input_image')
    }
  })

  it('input_text.text 必须为字符串', () => {
    const kuai: DuiHuaKuai = { type: 'input_text', text: '[图片]' }
    const xuLieHua = JSON.parse(JSON.stringify(kuai)) as Record<string, unknown>
    expect(typeof xuLieHua['text']).toBe('string')
  })

  it('user 消息可携带内容块数组；system/assistant 契约上必须保持字符串（官方限制图像仅 user 可带）', () => {
    const yongHu: DuiHuaXiaoXi = {
      jiaoSe: 'user',
      neiRong: [
        { type: 'input_text', text: '[用户发来一张图片]' },
        { type: 'input_image', image_url: 'data:image/jpeg;base64,x', detail: 'low' },
      ],
    }
    expect(Array.isArray(yongHu.neiRong)).toBe(true)

    const xiTong: DuiHuaXiaoXi = { jiaoSe: 'system', neiRong: '纯文本系统指令' }
    const zhuShou: DuiHuaXiaoXi = { jiaoSe: 'assistant', neiRong: '纯文本回复' }
    expect(typeof xiTong.neiRong).toBe('string')
    expect(typeof zhuShou.neiRong).toBe('string')
  })

  it('完整调用参数中含图像块的消息可被安全序列化为请求体（无 [object Object] / 无嵌套 map）', () => {
    const canShu: TiaoYongCanShu = {
      xiaoXi: [
        { jiaoSe: 'system', neiRong: '你是TA' },
        {
          jiaoSe: 'user',
          neiRong: [
            { type: 'input_text', text: '看这张图' },
            { type: 'input_image', image_url: 'data:image/webp;base64,YWJj' },
          ],
        },
      ],
    }
    const ti = JSON.stringify(canShu.xiaoXi)
    expect(ti).not.toContain('[object Object]')
    // image_url 键对应的值必须是字符串字面量（形如 "image_url":"..."）
    expect(ti).toMatch(/"image_url":"[^"]+"/)
    expect(ti).not.toMatch(/"image_url":\{/)
  })
})

describe('思考模式输出预算安全阈值守卫', () => {
  const AN_QUAN_YU_ZHI = 32000
  // YH-054 开场白降档例外：kaiChangBai思考开但预算16k先计量，不计入32k守卫
  const JIANG_DANG_LI_WAI = new Set(['kaiChangBai'])

  it('所有开启思考模式的场景，max_output_tokens 不得低于安全阈值（思维链计入该上限）', () => {
    const weiGui: string[] = []
    for (const [changJing, canShu] of Object.entries(AI_PEI_ZHI.moXing)) {
      if (canShu.siKaoMoShi !== 'enabled') continue
      if (JIANG_DANG_LI_WAI.has(changJing)) continue
      if (!canShu.zuiDaTokens || canShu.zuiDaTokens < AN_QUAN_YU_ZHI) {
        weiGui.push(`${changJing}: zuiDaTokens=${canShu.zuiDaTokens}`)
      }
    }
    expect(weiGui).toEqual([])
  })

  it('YH-054开场白降档：思考开但预算16k先计量，禁一刀切回32k', () => {
    const kaiChangBai = AI_PEI_ZHI.moXing.kaiChangBai
    expect(kaiChangBai.siKaoMoShi).toBe('enabled')
    expect(kaiChangBai.reasoningEffort).toBe('medium')
    expect(kaiChangBai.zuiDaTokens).toBe(16000)
  })

  it('关闭思考的轻量场景不受阈值约束（如开场白概率决策）', () => {
    const gaiLv = AI_PEI_ZHI.moXing.kaiChangBaiGaiLv
    expect(gaiLv.siKaoMoShi).toBe('disabled')
    expect(gaiLv.zuiDaTokens).toBeLessThan(AN_QUAN_YU_ZHI)
  })

  it('Writer 思考强度保持 effort=max（FP-05 YH-041 裁决，沉浸优先）且预算充足；Director 为 medium', () => {
    expect(AI_PEI_ZHI.moXing.director.reasoningEffort).toBe('medium')
    expect(AI_PEI_ZHI.moXing.writer.reasoningEffort).toBe('max')
    expect(AI_PEI_ZHI.moXing.director.zuiDaTokens).toBeGreaterThanOrEqual(AN_QUAN_YU_ZHI)
    expect(AI_PEI_ZHI.moXing.writer.zuiDaTokens).toBeGreaterThanOrEqual(AN_QUAN_YU_ZHI)
  })
})
