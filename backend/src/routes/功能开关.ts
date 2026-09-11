import { Router } from 'express'
import type { Request, Response } from 'express'
import { chengGongXiangYing } from '../utils/xiangying'

type TeZhengKaiGuanBiao = Record<string, boolean>

const MO_REN_KAI_GUAN: TeZhengKaiGuanBiao = { junShi: true }

export function jieXiTeZhengKaiGuan(yuanWen: string | undefined): TeZhengKaiGuanBiao {
  if (!yuanWen || yuanWen.trim() === '') {
    return { ...MO_REN_KAI_GUAN }
  }
  try {
    const jieXi: unknown = JSON.parse(yuanWen)
    if (typeof jieXi !== 'object' || jieXi === null || Array.isArray(jieXi)) {
      throw new Error('FEATURE_FLAGS必须是JSON对象')
    }
    const jieGuo: TeZhengKaiGuanBiao = { ...MO_REN_KAI_GUAN }
    for (const [jian, zhi] of Object.entries(jieXi as Record<string, unknown>)) {
      if (typeof zhi === 'boolean') jieGuo[jian] = zhi
    }
    return jieGuo
  } catch (cuoWu) {
    // eslint-disable-next-line no-console -- 功能开关.test 断言 console.warn 被调用(行为契约)
    console.warn('[配置警告] FEATURE_FLAGS环境变量非法，已回退默认全开:', cuoWu)
    return { ...MO_REN_KAI_GUAN }
  }
}

const kaiGuan = jieXiTeZhengKaiGuan(process.env.FEATURE_FLAGS)

const luYou = Router()

luYou.get('/', (_qingQiu: Request, xiangYing: Response) => {
  xiangYing.set('Cache-Control', 'public, max-age=60')
  chengGongXiangYing(xiangYing, { ...kaiGuan })
})

export default luYou
