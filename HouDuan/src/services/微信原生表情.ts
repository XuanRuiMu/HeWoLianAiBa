import { readFileSync } from 'fs'
import { resolve } from 'path'

export interface WeiXinBiaoQing {
  name: string
  category: string
  path: string
}

let biao: WeiXinBiaoQing[] | null = null

function loadBiao(): WeiXinBiaoQing[] {
  if (!biao) {
    biao = JSON.parse(readFileSync(resolve(__dirname, '../config/微信原生表情码表.json'), 'utf-8')) as WeiXinBiaoQing[]
  }
  return biao
}

export function chaZhaoWeiXinBiaoQing(mingCheng: string): WeiXinBiaoQing | null {
  const qingLi = mingCheng.trim().replace(/^\[|\]$/g, '').trim()
  if (!qingLi) return null
  const biaoBen = loadBiao()
  return biaoBen.find((xiang) => xiang.name === qingLi) ?? null
}

export function biaoQingTuPianLuJing(mingCheng: string): string | null {
  const xiang = chaZhaoWeiXinBiaoQing(mingCheng)
  return xiang ? `/wechat-emojis/${xiang.path}` : null
}
