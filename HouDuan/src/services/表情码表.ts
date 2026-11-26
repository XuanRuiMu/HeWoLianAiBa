import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface 微信表情条目 {
  name: string
  category: string
  path: string
}

let 微信缓存: 微信表情条目[] | null = null

function 载入微信(): 微信表情条目[] {
  if (!微信缓存) {
    微信缓存 = JSON.parse(
      readFileSync(resolve(__dirname, '../config/微信原生表情码表.json'), 'utf-8'),
    ) as 微信表情条目[]
  }
  return 微信缓存
}

export const 微信表情名单: ReadonlySet<string> = new Set(载入微信().map((xiang) => xiang.name))

export function 微信表情路径(mingCheng: string): string | null {
  const jianHua = mingCheng.trim()
  const xiang = 载入微信().find((xiang) => xiang.name === jianHua)
  if (!xiang) return null
  return resolve(__dirname, '../../../QianDuan/public/wechat-emojis', xiang.path.replace('assets/', ''))
}

const 微信情绪映射: Record<string, string> = {
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

export function 微信表情情绪(mingCheng: string): string {
  return 微信情绪映射[mingCheng] ?? '好笑'
}

export const Emoji名称表: Readonly<Record<string, string>> = {
  微笑: '🙂', 开心: '😄', 大笑: '😆', 笑哭: '😂', 苦笑: '😅', 偷笑: '🤭',
  哈哈: '😃', 呲牙: '😁', 憨笑: '😊', 害羞: '😊', 亲亲: '😘', 飞吻: '😘',
  色: '😍', 花痴: '😍', 星星眼: '🤩', 可爱: '🥰', 爱心眼: '😍', 得意: '😎',
  酷: '😎', 墨镜: '😎', 调皮: '😜', 吐舌: '😛', 鬼脸: '😝', 卖萌: '🥺',
  委屈: '🥺', 可怜: '🥺', 哭: '😭', 大哭: '😭', 流泪: '😢', 难过: '😔',
  沮丧: '😞', 失落: '😞', 无语: '😑', 沉默: '😶', 尴尬: '😅', 汗: '😓',
  冷汗: '😰', 害怕: '😨', 惊恐: '😱', 惊讶: '😲', 吃惊: '😮', 疑问: '🤔',
  思考: '🤔', 白眼: '🙄', 鄙视: '😒', 生气: '😠', 发怒: '😡', 抓狂: '🤯',
  崩溃: '🤯', 晕: '😵', 困: '😪', 睡: '😴', 累: '😩', 叹气: '😮‍💨',
  嘘: '🤫', 闭嘴: '🤐', 捂脸: '🤦', 摊手: '🤷', 点头: '😌', 摇头: '🙂‍↔️',
  加油: '💪', 拳头: '👊', 鼓掌: '👏', 点赞: '👍', 强: '👍', 差: '👎',
  弱: '👎', OK: '👌', 胜利: '✌️', 比心: '🫰', 握手: '🤝', 抱拳: '🙏',
  合十: '🙏', 拜托: '🙏', 拥抱: '🤗', 招手: '👋', 再见: '👋', 拜拜: '👋',
  玫瑰: '🌹', 花: '🌸', 凋谢: '🥀', 太阳: '☀️', 月亮: '🌙', 星星: '⭐',
  火: '🔥', 爆炸: '💥', 闪电: '⚡', 彩虹: '🌈', 咖啡: '☕', 啤酒: '🍺',
  蛋糕: '🎂', 礼物: '🎁', 红包: '🧧', 庆祝: '🎉', 烟花: '🎆', 爆竹: '🧨',
  福: '🧧', 心: '❤️', 爱心: '❤️', 心碎: '💔', 两颗心: '💕', 心动: '💓',
  骷髅: '💀', 便便: '💩', 猪: '🐷', 狗头: '🐶', 旺柴: '🐶', 猫: '🐱',
  转圈: '🌀', 发抖: '🥶', 吃瓜: '🍉', 摸鱼: '🐟', 裂开: '💔', 打脸: '🤦',
  机智: '😏', 奸笑: '😏', 坏笑: '😏', 社会: '😎', 让我看看: '👀',
  好的: '👌', 收到: '👌', 天啊: '😱', 哇: '😲', 耶: '✌️', 快哭了: '🥹',
  脸红: '😳', 生病: '🤒', 失望: '😞', 苦涩: '😖', 傲慢: '😤', 悠闲: '😌',
  咒骂: '🤬', 敲打: '🔨', 亲: '😚', 嘴唇: '👄', 猪头: '🐷', 跳跳: '🐰',
  六六六: '👍', 社会社会: '😎', 翻白眼: '🙄', 嘿哈: '😆', 皱眉: '😣',
}

export const Emoji名单: ReadonlySet<string> = new Set(Object.keys(Emoji名称表))

export function Emoji字符(mingCheng: string): string | null {
  const jianHua = mingCheng.trim()
  if (jianHua === '') return null
  if (Emoji名称表[jianHua]) return Emoji名称表[jianHua]
  const 直接字符 = Array.from(jianHua)
  if (直接字符.length === 1 && /\p{Extended_Pictographic}/u.test(直接字符[0])) return 直接字符[0]
  if (直接字符.every((zi) => /\p{Extended_Pictographic}|\uFE0F|\u200D/u.test(zi))) return jianHua
  return null
}
