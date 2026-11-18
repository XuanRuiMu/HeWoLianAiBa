import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createHash } from 'crypto'
import type { 表情包条目 } from './表情包库'

export interface WeiXinBiaoQing {
  name: string
  category: string
  path: string
}

let biao: WeiXinBiaoQing[] | null = null

function loadBiao(): WeiXinBiaoQing[] {
  if (!biao) {
    biao = JSON.parse(
      readFileSync(resolve(__dirname, '../config/微信原生表情码表.json'), 'utf-8'),
    ) as WeiXinBiaoQing[]
  }
  return biao
}

export function yuanShengBiaoQingMingDan(): string[] {
  return loadBiao().map((x) => x.name)
}

export function isYuanShengBiaoQingDuanMing(duanMing: string): boolean {
  return duanMing.startsWith('wx_')
}

export function yuanShengBiaoQingLuJing(mingCheng: string): string | null {
  const qingLi = mingCheng.replace(/^wx_/, '').trim()
  const xiang = loadBiao().find((x) => x.name === qingLi)
  if (!xiang) return null
  return resolve(__dirname, '../../../QianDuan/public/wechat-emojis', xiang.path.replace('assets/', ''))
}

function mingChengHash(mingCheng: string): string {
  return createHash('sha256').update('weixin-native:' + mingCheng, 'utf8').digest('hex')
}

export function 构建原生表情条目(mingCheng: string): 表情包条目 | null {
  const luJing = yuanShengBiaoQingLuJing(mingCheng)
  if (!luJing) return null
  try {
    const ziJieShu = require('fs').statSync(luJing).size
    const duanMing = 'wx_' + mingCheng
    return {
      duanMing,
      miaoShu: '微信原生表情：' + mingCheng,
      qingXuBiaoQian: yuanShengQingXu(mingCheng),
      shiYongChangJing: '',
      qiYong: true,
      fengGe: '日常',
      guanXiJieDuanXiaXian: 0,
      sha256: mingChengHash(mingCheng),
      mime: 'image/png',
      ziJieShu,
      wenJianMing: duanMing + '.png',
      wenJianLuJing: luJing,
    }
  } catch {
    return null
  }
}

const QingXuYingShe: Record<string, string> = {
  微笑: '无语', 撇嘴: '委屈', 色: '调皮', 发呆: '无语', 得意: '庆祝',
  流泪: '难过', 害羞: '撒娇', 闭嘴: '无语', 睡: '告别', 大哭: '难过',
  尴尬: '破冰', 发怒: '生气', 调皮: '好笑', 呲牙: '好笑', 惊讶: '吃瓜',
  难过: '难过', 囧: '尴尬', 抓狂: '崩溃', 吐: '无语', 偷笑: '好笑',
  愉快: '庆祝', 白眼: '无语', 傲慢: '无语', 困: '疲惫', 惊恐: '吃瓜',
  憨笑: '好笑', 悠闲: '庆祝', 咒骂: '生气', 疑问: '吃瓜', 哈欠: '疲惫',
  敲打: '生气', 拥抱: '安慰', 玫瑰: '撒娇', 凋谢: '安慰', 嘴唇: '撒娇',
  爱心: '撒娇', 心碎: '难过', 蛋糕: '庆祝', 闪电: '吃瓜', 炸弹: '吃瓜',
  刀: '吃瓜', 足球: '庆祝', 瓢虫: '好笑', 便便: '好笑', 月亮: '告别',
  太阳: '庆祝', 红包: '庆祝', 发: '庆祝', 福: '庆祝', 烟花: '庆祝',
  爆竹: '庆祝', 猪: '好笑', 跳跳: '好笑', 发抖: '吃瓜', 转圈: '无语',
  OK: '赞同', good: '赞同', 加油: '赞同', 握手: '赞同', 胜利: '庆祝',
  抱拳: '赞同', 勾引: '撒娇', 拳头: '生气', 啤酒: '庆祝', 咖啡: '破冰',
  666: '赞同', Emm: '无语', 旺柴: '好笑', 捂脸: '好笑', 骷髅: '吃瓜',
  右哼哼: '无语', 左哼哼: '无语', 嘘: '破冰', 晕: '无语',
}

export function yuanShengQingXu(mingCheng: string): string {
  return QingXuYingShe[mingCheng] ?? '好笑'
}

export async function yuanShengBiaoQingTiaoMuLieBiao(): Promise<表情包条目[]> {
  const out: 表情包条目[] = []
  for (const ming of yuanShengBiaoQingMingDan()) {
    const tiaoMu = 构建原生表情条目(ming)
    if (tiaoMu) out.push(tiaoMu)
  }
  return out
}
