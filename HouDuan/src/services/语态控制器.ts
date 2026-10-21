export type YuTai = '接内容' | '说自己' | '极短' | '另起' | '澄清' | '安排'

export type ChuFaLei = '纯应答' | '是非问' | '分享'

const CHUN_YING_DA_BAI_MING_DAN = [
  '嗯', '嗯嗯', '恩', '恩恩', '嗯哪', '好', '好的', '好滴', '好呀', '好嘞', '好吧',
  '行', '行啊', '行吧', '可以', '收到', '知道了', '明白', '懂了',
  '对', '对啊', '对的', '是', '是的', '是啊', '哦', '噢', '喔',
  '谢谢', '谢啦', '谢了', '辛苦了', '麻烦了', '感谢',
  '有道理', '确实', '没错', '是这么回事', '我都行', '都行', '随便', '看你的',
  '下次约', '改天约', '再说吧', '那就这样', '先这样', '回头聊', '晚安', '早安',
]

const XIAO_SHU_CI = /[\s，。、！？!?,.~～…\-—：:；;"'“”‘’()（）【】\[\]\u{1F602}\u{1F923}\u{1F605}\u{1F64F}\u{1F44D}\u2764]/gu

export function xiXiChuFa(触发: string): string {
  return (触发 || '').replace(XIAO_SHU_CI, '').replace(/[hH]{3,}/g, '').replace(/哈{2,}/g, '').trim()
}

const SHI_FEI_WEN = /[?？]|吗|呢$|吧$|是不是|有没有|要不要|能不能|可不可以|对不对|好不好|行不行|哪[里儿个些]|什么|啥|几点|几号|多久|怎么|咋|为什么|为啥|谁|多少|如何/

export function panChuFaLei(触发: string): ChuFaLei {
  const 净 = xiXiChuFa(触发)
  if (SHI_FEI_WEN.test(触发 || '')) return '是非问'
  if (CHUN_YING_DA_BAI_MING_DAN.includes(净)) return '纯应答'
  if (净.length <= 4) return '纯应答'
  return '分享'
}

const QUAN_ZHONG: Record<ChuFaLei, Array<[YuTai, number]>> = {
  纯应答: [['另起', 48], ['安排', 30], ['接内容', 10], ['极短', 8], ['说自己', 3], ['澄清', 1]],
  是非问: [['极短', 70], ['接内容', 12], ['另起', 7], ['安排', 6], ['说自己', 4], ['澄清', 1]],
  分享: [['接内容', 42], ['极短', 17], ['说自己', 14], ['另起', 11], ['安排', 11], ['澄清', 5]],
}

export function chouYuTai(触发: string, 随机: () => number = Math.random): YuTai {
  const 表 = QUAN_ZHONG[panChuFaLei(触发)]
  const 总 = 表.reduce((合计, [, 权]) => 合计 + 权, 0)
  let 余 = 随机() * 总
  for (const [态, 权] of 表) {
    余 -= 权
    if (余 < 0) return 态
  }
  return 表[0][0]
}

const ZHI_LING: Record<YuTai, string> = {
  接内容: '这一轮就顺着对方这句话里那个具体的东西说。不用总结，不用给建议，也别再问回去。',
  说自己: '这一轮说说你自己这边的情况或者感受。只说一件，别把几件事一起倒出来。不用回应对方说的内容。',
  极短: '这一轮只给一个短反应：笑一下、一句吐槽都行，不超过六个字。不接对方的内容，不补充解释。',
  另起: '这一轮别接对方这句话的内容。从「最近在忙」里挑一件事说，只说这一件。跟对方刚说的没关系也正常。如果这件事之前提过，就只说进展，不要原样重复。',
  澄清: '这一轮对方话里有个地方你真没跟上——可能是打错字了、是个你不熟的行话，或者这句没说完。就用平常的话问一句，可以顺带猜一个可能，比如「奶菜是什么？奶茶还是菜？」。不要对「累」「手黑」这种常用说法装不懂，不要问「什么是X」「什么叫X」。绝不要质疑你自己刚刚说过的事：你上一句说你没吃饭、说你在加班、说你在刷手机，下一句就不能说「我什么时候说过」「你是不是发错人了」。这一轮要么是真没看懂对方那句话，要么就别用澄清。',
  安排: '这一轮给一个具体的下一步：时间、地点，或者你要去干什么。如果你上一轮已经说过「马上到」「这就下楼」「等我一下」这类话，这一轮必须把它了结——要么说你已经到了、要么说清还要多久并给出确切的点，不要再重复一次同样的承诺。',
}

export function quYuTaiZhiLing(态: YuTai): string {
  return ZHI_LING[态]
}

const XUE_SHENG_ZAI_MANG = [
  '期末那个大作业还差一半', '下周要交的课程论文还没动笔', '在准备六级', '社团这周要办活动',
  '在找暑期实习', '师兄让帮忙跑数据', '宿舍要换', '在攒钱买个新耳机',
  '牙套复诊约了没去', '在追一部剧追到半夜', '同学约了周末爬山', '在学剪视频',
  '导师催的开题报告还没发', '在办一张健身卡', '下个月想搬出去住', '在帮室友改简历',
  '报了个口语班老不去', '换了新键盘还在适应', '在算这个月还剩多少钱', '约了洗牙一直拖',
  '社团招新的材料要收', '在给家里挑生日礼物',
]

const SHANG_BAN_ZAI_MANG = [
  '手上那个需求改到第四版了', '这周要出周报', '项目月底上线在赶', '下周要出差两天',
  '在面一个新机会', '体检报告还没去拿', '房东说要涨房租', '给家里买的东西还没寄',
  '在学一个新的工具', '同事请假活都压过来了', '在改一个老bug', '领导让整理一份材料',
  '社保的事还没去办', '在报个税', '想把工位换个位置', '同事拉着一起报名跑',
  '在挑给爸妈的礼物', '工资到账先还了一笔', '在查下个月去哪玩', '加班到点还没吃饭',
  '部门在调架构人心不稳', '在等一个面试结果',
]

export function shengChengZaiMang(是学生: boolean, 随机: () => number = Math.random): string[] {
  const 池 = 是学生 ? XUE_SHENG_ZAI_MANG : SHANG_BAN_ZAI_MANG
  const 出 = new Set<string>()
  while (出.size < 5) 出.add(池[Math.floor(随机() * 池.length)])
  return Array.from(出)
}

function 最长公共子串长(甲: string, 乙: string): number {
  if (!甲 || !乙) return 0
  let 最长 = 0
  const 前 = new Array(乙.length + 1).fill(0)
  for (let i = 1; i <= 甲.length; i++) {
    let 斜 = 0
    for (let j = 1; j <= 乙.length; j++) {
      const 存 = 前[j]
      if (甲[i - 1] === 乙[j - 1]) {
        前[j] = 斜 + 1
        if (前[j] > 最长) 最长 = 前[j]
      } else {
        前[j] = 0
      }
      斜 = 存
    }
  }
  return 最长
}

export function quZaiMangWeiShuo(全部: string[], 自己说过的: string[]): string[] {
  const 门槛 = 2
  const 没说过 = 全部.filter((x) => x.length > 0 && !自己说过的.some((说) => 最长公共子串长(x, 说) >= 门槛))
  return 没说过.length > 0 ? 没说过 : 全部
}

export function gouJianYuTaiKuai(态: YuTai, 在忙: string[]): string {
  return `【你最近在忙】\n${在忙.join('；')}\n\n【这一轮你就这样回】\n${quYuTaiZhiLing(态)}`
}
export function zaoSuiJi(种子: string): () => number {
  let 值 = 2166136261
  for (let i = 0; i < 种子.length; i++) {
    值 ^= 种子.charCodeAt(i)
    值 = Math.imul(值, 16777619)
  }
  return () => {
    值 = (值 + 0x6d2b79f5) | 0
    let 混 = Math.imul(值 ^ (值 >>> 15), 1 | 值)
    混 = (混 + Math.imul(混 ^ (混 >>> 7), 61 | 混)) ^ 混
    return ((混 ^ (混 >>> 14)) >>> 0) / 4294967296
  }
}
