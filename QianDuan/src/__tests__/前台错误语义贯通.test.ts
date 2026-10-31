import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import 请求错误 from '@/components/请求错误.vue'
import { fanYi, huoQuFanYi } from '@/config/翻译表'
import {
  LIAN_AI_DAI_MA,
  QIAN_TAI_DAI_MA,
  WEN_BEN_ZU,
  guiYiQianTaiDaiMa,
  huoQuLianAiMa,
  type LianAiMa,
} from '@/config/前台错误码'
import { chuangJianQianTaiCuoWu, tiQuCuoWuWenBen, 归一前台错误 } from '@/utils/前台错误'

const 新码 = [
  QIAN_TAI_DAI_MA.AUTH_VERIFICATION_CODE_INVALID,
  QIAN_TAI_DAI_MA.AUTH_VERIFICATION_CODE_EXPIRED,
  QIAN_TAI_DAI_MA.AUTH_VERIFICATION_CODE_ATTEMPTS_EXCEEDED,
  QIAN_TAI_DAI_MA.AUTH_PHONE_NOT_ACCEPTED,
  QIAN_TAI_DAI_MA.AUTH_PASSWORD_WEAK,
  QIAN_TAI_DAI_MA.AUTH_ACCOUNT_ALREADY_EXISTS,
  QIAN_TAI_DAI_MA.AUTH_USERNAME_TAKEN,
  QIAN_TAI_DAI_MA.AUTH_USERNAME_INVALID,
  QIAN_TAI_DAI_MA.AUTH_BIRTH_DATE_INVALID,
  QIAN_TAI_DAI_MA.AUTH_AGREEMENT_REQUIRED,
] as const

describe('新错误码在前端四处真源里全部登记', () => {
  it('每个新码都有恋爱码映射，不会被降级成未知错误', () => {
    for (const daiMa of 新码) {
      expect(LIAN_AI_DAI_MA[daiMa], `${daiMa} 缺 LIAN_AI_DAI_MA`).toBeTruthy()
      expect(WEN_BEN_ZU[daiMa], `${daiMa} 缺 WEN_BEN_ZU`).toBeTruthy()
      expect(guiYiQianTaiDaiMa(daiMa), `${daiMa} 被降级`).toBe(daiMa)
    }
  })

  it('每个恋爱码在 lianAi 翻译表里都有具体文案', () => {
    for (const daiMa of 新码) {
      const lianAiMa = huoQuLianAiMa(daiMa)
      const wenAn = huoQuFanYi('lianAi', lianAiMa as LianAiMa)
      expect(wenAn, `${lianAiMa} 缺文案`).toBeTruthy()
      expect(wenAn).toMatch(/[\u4e00-\u9fa5]/)
    }
  })

  it('无重复占用恋爱码：新码之间文案互不相同', () => {
    const 文案 = 新码.map((daiMa) => huoQuFanYi('lianAi', huoQuLianAiMa(daiMa) as LianAiMa))
    expect(new Set(文案).size).toBe(新码.length)
  })
})

describe('玩家看到的是事实，不是文学化兜底', () => {
  it('验证码错误 / 过期 / 超限三条文案都点名「验证码」，且互不相同', () => {
    const 三条 = [
      QIAN_TAI_DAI_MA.AUTH_VERIFICATION_CODE_INVALID,
      QIAN_TAI_DAI_MA.AUTH_VERIFICATION_CODE_EXPIRED,
      QIAN_TAI_DAI_MA.AUTH_VERIFICATION_CODE_ATTEMPTS_EXCEEDED,
    ].map((daiMa) => huoQuFanYi('lianAi', huoQuLianAiMa(daiMa) as LianAiMa))
    for (const 条 of 三条) expect(条).toContain('验证码')
    expect(new Set(三条).size).toBe(3)
  })

  it('验证码错误不再显示「换个说法再说一次」', () => {
    const 包 = mount(请求错误, {
      props: { cuoWu: chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.AUTH_VERIFICATION_CODE_INVALID }) },
    })
    const 文本 = 包.get('.qian-tai-cuo-wu-wen-an').text()
    expect(文本).toContain('验证码')
    expect(文本).not.toContain('换个说法再说一次')
    expect(文本).not.toBe(fanYi.lianAi.LianAi_006)
  })

  it('登录密码错误明确说是账号或密码错误，不甩锅给服务器', () => {
    const 包 = mount(请求错误, {
      props: { cuoWu: chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.AUTH_INVALID_CREDENTIALS }) },
    })
    const 文本 = 包.text()
    expect(文本).toContain('密码')
    expect(文本).not.toContain('服务器的问题')
  })

  it('依赖不可用必须是服务器问题口径，与账号密码无关', () => {
    for (const daiMa of [
      QIAN_TAI_DAI_MA.DEPENDENCY_POSTGRES_UNAVAILABLE,
      QIAN_TAI_DAI_MA.DEPENDENCIES_UNAVAILABLE,
      QIAN_TAI_DAI_MA.SERVICE_UNAVAILABLE,
    ] as const) {
      const 文本 = mount(请求错误, { props: { cuoWu: chuangJianQianTaiCuoWu({ code: daiMa }) } })
        .get('.qian-tai-cuo-wu-wen-an')
        .text()
      expect(文本, `${daiMa} 未说明是服务器问题`).toContain('服务器')
      expect(文本).toContain('不是你的账号或密码')
    }
  })
})

describe('前端不解析后端 message 作为玩家可见文案', () => {
  it('已知后端码时，即使后端 message 不同也以注册表译文为准', () => {
    const cuoWu = 归一前台错误({
      response: {
        status: 400,
        data: {
          cheng_gong: false,
          code: 'AUTH_VERIFICATION_CODE_INVALID',
          message: '提交的内容不符合要求',
          ti_shi: '提交的内容不符合要求',
        },
      },
    })
    expect(cuoWu.code).toBe(QIAN_TAI_DAI_MA.AUTH_VERIFICATION_CODE_INVALID)
    expect(tiQuCuoWuWenBen(cuoWu, '兜底')).toBe(
      huoQuFanYi('lianAi', 'LianAi_070'),
    )
    expect(tiQuCuoWuWenBen(cuoWu, '兜底')).not.toContain('提交的内容不符合要求')
  })
})
