import { debug日志 } from '../utils/debug日志'
import { souSuoWangYe, zhuaQuWangYe, type WangYeSouSuoTiaoMu } from './DeepSeek官方工具'

const RiZhiLeiXing = '联网搜索'

const HuanCunQianZhui = 'lian_wang_sou_suo:'
const HuanCunYouXiaoMiao = 30 * 60 * 1000
const neiCunHuanCun = new Map<string, string>()

const XuYaoLianWangTeZheng: RegExp[] = [
  /最近|最新|今天|昨天|刚刚|这几天|目前|现在|今年|最近几年|上个月|这个月/,
  /新闻|热搜|热点|比分|赛事|战绩|排名|榜单|股价|汇率|天气|气温|降水/,
  /发布|上线|版本|更新|公告|活动|机票|火车票|日程|赛程|上映/,
  /谁赢了|结果如何|最新消息|发生了什么|有什么新|官方说|官网|一手/,
]

const BuXuYaoLianWangTeZheng: RegExp[] = [
  /你觉得|你认为|你感觉|你喜欢|你讨厌|你的心情|你陪我|哄哄我|抱抱我|亲亲我/,
  /我是谁|你是谁|我们聊过|你记得吗|刚才|上一句|你刚说|我说过/,
  /角色扮演|人设|剧本|设定|梦到|想象/,
]

export function panDuanXuYaoLianWang(xiaoXi: string): boolean {
  const wenBen = String(xiaoXi || '').trim()
  if (wenBen.length < 4) return false
  if (wenBen.length > 500) return false
  if (BuXuYaoLianWangTeZheng.some((m) => m.test(wenBen))) return false
  return XuYaoLianWangTeZheng.some((m) => m.test(wenBen))
}

const KouYuQianZhui: readonly RegExp[] = [
  /^(?:请问|问一下|想问下|想问一下|你知道|你知不知道|你知道吗|你晓得|你了解|你说说|你说说看|帮我查查|帮我查一下|帮我查|帮我搜搜|帮我搜一下|帮我搜|能帮我|能不能|可以帮我|麻烦|我想知道|我想了解|我想问问|告诉我的?|那个|话说|对了|诶|哎|嘿|喂|然后)[\s,，。?？!！~～]*/i,
]

const TingYongCiZhengCi: readonly string[] = [
  '请问', '想问', '知道', '告诉我', '帮我', '查一下', '查查', '搜一下', '搜搜',
  '什么', '哪些', '哪个', '怎么样', '怎么', '怎样', '如何', '为什么', '是不是', '有没有', '能不能',
  '可以', '会不会', '要不要', '我们', '你们', '他们', '这个', '那个', '这些', '那些',
  '一下', '一些', '特别', '非常', '比较', '有点', '一点', '你', '我', '他', '她', '它',
]

const YuQiCiJieWei: readonly string[] = ['吗', '呢', '吧', '啊', '呀', '哦', '嘛', '哈', '呗', '了', '的']

interface SouSuoYiTu {
  ceShi: RegExp
  ciZu: string[]
  xuDiMing?: boolean
}

const 搜索意图表: readonly SouSuoYiTu[] = [
  { ceShi: /电影|影片|片子|上映|影视|院线/, ciZu: ['热映电影'] },
  { ceShi: /新闻|热点|热搜|时事|头条/, ciZu: ['热门新闻'] },
  { ceShi: /梗|流行语|网络用语|热词/, ciZu: ['网络流行语'] },
  { ceShi: /游戏|新游|手游|端游/, ciZu: ['新游戏'] },
  { ceShi: /天气|气温|下雨|降温/, ciZu: ['天气'], xuDiMing: true },
  { ceShi: /股票|股市|大盘|基金|行情/, ciZu: ['A股行情'] },
  { ceShi: /比分|比赛|赛果|赛事|战绩/, ciZu: ['比赛比分'] },
  { ceShi: /汇率|人民币|美元|日元/, ciZu: ['人民币汇率'] },
  { ceShi: /房价|楼市/, ciZu: ['楼市房价'] },
  { ceShi: /机票|火车票|航班/, ciZu: ['机票价格'] },
]

const 地名排除词: readonly string[] = [
  '你们', '我们', '他们', '这里', '那里', '这边', '那边', '今天', '明天', '后天',
  '最近', '这个', '那个', '什么', '怎么', '啥', '你', '我', '他',
]

const 常见地名: readonly string[] = [
  '北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '重庆', '武汉', '西安',
  '天津', '苏州', '长沙', '郑州', '青岛', '大连', '厦门', '福州', '济南', '合肥',
  '昆明', '南宁', '贵阳', '南昌', '太原', '石家庄', '哈尔滨', '长春', '沈阳', '兰州',
  '海口', '三亚', '珠海', '东莞', '佛山', '宁波', '无锡', '常州', '徐州', '温州',
  '香港', '澳门', '台北', '乌鲁木齐', '拉萨', '呼和浩特', '银川', '西宁',
]

function 提取地名(wenBen: string): string {
  for (const di of 常见地名) {
    if (wenBen.includes(di)) return di
  }
  const ming = /([\u4e00-\u9fa5]{2,4})(?:市|区|县)\s*(?:今天|明天|后天|最近|这周|本周)?\s*(?:的)?\s*(?:天气|气温)/.exec(wenBen)
  if (ming) {
    const di = ming[1].trim()
    if (!地名排除词.includes(di)) return di
  }
  return ''
}

export function tiLianSouSuoGuanJianCi(yuanWen: string, zuiDaChang = 40): string {
  let wenBen = String(yuanWen || '').trim()
  if (wenBen === '') return ''
  for (const moShi of KouYuQianZhui) wenBen = wenBen.replace(moShi, '')

  for (const yiTu of 搜索意图表) {
    if (!yiTu.ceShi.test(wenBen)) continue
    const ci = yiTu.ciZu[0]
    if (yiTu.xuDiMing) {
      const diMing = 提取地名(wenBen)
      if (diMing !== '') return `${diMing}${ci}`.slice(0, zuiDaChang)
    }
    return ci.slice(0, zuiDaChang)
  }

  const 洗过 = wenBen
    .replace(/(?:最近|目前|现在|今天|这两天|这几天|最近几天|怎么样|如何|有什么|有哪些|啥)/g, ' ')
    .replace(/[，。！？、；：,.!?;:"'“”‘’（）()【】\[\]…—~～]+/g, ' ')
    .trim()
  if (洗过 !== '' && 洗过.length >= 2) {
    return 洗过.split(/\s+/).filter((x) => x.length >= 2).slice(0, 3).join(' ').slice(0, zuiDaChang)
  }

  wenBen = wenBen.replace(/[，。！？、；：,.!?;:"'“”‘’（）()【】\[\]…—~～]/g, ' ')
  const ciLie = wenBen.split(/\s+/).map((ci) => ci.trim()).filter((ci) => ci !== '')
  const baoLiu: string[] = []
  for (const ci of ciLie) {
    let sheng = ci
    for (const ciYu of TingYongCiZhengCi) {
      if (sheng.length <= ciYu.length) continue
      sheng = sheng.split(ciYu).join('')
    }
    let gaiBian = true
    while (gaiBian) {
      gaiBian = false
      for (const yuQi of YuQiCiJieWei) {
        if (sheng.length > yuQi.length && sheng.endsWith(yuQi)) {
          sheng = sheng.slice(0, -yuQi.length)
          gaiBian = true
        }
      }
    }
    sheng = sheng.trim()
    if (sheng.length >= 2) baoLiu.push(sheng)
  }
  const jieGuo = (baoLiu.length > 0 ? baoLiu.join(' ') : ciLie.join(' ')).slice(0, zuiDaChang).trim()
  return jieGuo
}

function huanCunJian(xiaoXi: string): string {
  const qingXi = xiaoXi.replace(/\s+/g, ' ').trim().toLowerCase()
  return `${HuanCunQianZhui}${qingXi}`
}

async function duHuanCun(xiaoXi: string): Promise<string | null> {
  const jian = huanCunJian(xiaoXi)
  const neiCun = neiCunHuanCun.get(jian)
  if (neiCun !== undefined) return neiCun
  try {
    const { redis } = await import('../redis')
    const zhi = await redis.get(jian)
    if (zhi) {
      neiCunHuanCun.set(jian, zhi)
      return zhi
    }
  } catch {
    /* 缓存失败不阻断 */
  }
  return null
}

async function xieHuanCun(xiaoXi: string, zhuRu: string): Promise<void> {
  const jian = huanCunJian(xiaoXi)
  neiCunHuanCun.set(jian, zhuRu)
  try {
    const { redis } = await import('../redis')
    await redis.setex(jian, Math.round(HuanCunYouXiaoMiao / 1000), zhuRu)
  } catch {
    /* 缓存失败不阻断 */
  }
}

function yaSuoTiaoMu(tiaoMu: WangYeSouSuoTiaoMu[]): string {
  return tiaoMu
    .slice(0, 5)
    .map((xiang, i) => {
      const b = [`${i + 1}. ${xiang.title}`]
      if (xiang.date) b.push(`日期：${xiang.date.slice(0, 10)}`)
      b.push(`来源：${xiang.site_name || xiang.url}`)
      if (xiang.summary) b.push(`摘要：${xiang.summary.slice(0, 220)}`)
      return b.join('\n')
    })
    .join('\n\n')
}

function pinZhuRu(wenBen: string): string {
  return [
    '【实时联网信息】',
    '以下是刚从网上搜索到的资料，可能包含最新事实。回答时可参考，但要用自己的口气说出来；',
    '不确定的部分不要编。如果资料与问题无关，就当没看到，按正常聊天回。',
    wenBen,
  ].join('\n')
}

export async function huoQuLianWangSouSuoZhuRu(
  yongHuXiaoXi: string,
  shiFouDiYiLun: boolean,
): Promise<string> {
  if (process.env.VITEST === 'true') return ''
  const qiYong = (process.env['LIAN_WANG_SOU_SUO_QI_YONG'] || 'true').trim().toLowerCase() !== 'false'
  if (!qiYong) return ''
  if (shiFouDiYiLun) return ''
  const xiaoXi = String(yongHuXiaoXi || '').trim()
  if (!panDuanXuYaoLianWang(xiaoXi)) return ''
  const huanCun = await duHuanCun(xiaoXi)
  if (huanCun) return huanCun
  const guanJianCi = tiLianSouSuoGuanJianCi(xiaoXi)
  const souSuoYong = guanJianCi.length >= 2 ? guanJianCi : xiaoXi.slice(0, 64)
  const jieGuo = await souSuoWangYe({ query: souSuoYong.slice(0, 128), tiaoShu: 5, yuanShiWenTi: xiaoXi })
  if (!jieGuo.cheng_gong || jieGuo.tiaoMu.length === 0) {
    debug日志.warn(RiZhiLeiXing, '搜索无结果或失败，本轮不注入', { xiang_qing: { ti_shi: jieGuo.ti_shi || '', sou_suo_yong: souSuoYong } })
    return ''
  }
  const zhuRu = pinZhuRu(yaSuoTiaoMu(jieGuo.tiaoMu))
  await xieHuanCun(xiaoXi, zhuRu)
  debug日志.info(RiZhiLeiXing, '联网搜索注入完成', {
    xiang_qing: { tiao_shu: jieGuo.tiaoMu.length, shou_tiao: jieGuo.tiaoMu[0]?.title || '', sou_suo_yong: souSuoYong },
  })
  return zhuRu
}

export async function zhuaQuWangYeNeiRong(url: string): Promise<{ cheng_gong: boolean; title: string; neiRong: string }> {
  return await zhuaQuWangYe(url)
}
