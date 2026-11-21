function quHuanJingWenBen(ming: string, moRen: string): string {
  const yuanZhi = process.env[ming]
  if (yuanZhi === undefined) return moRen
  const jianHua = yuanZhi.trim()
  return jianHua === '' ? moRen : jianHua
}

function quQiaDuanZhengShu(ming: string, moRen: number, zuiXiao: number, zuiDa: number): number {
  const wenBen = quHuanJingWenBen(ming, '')
  if (wenBen === '') return moRen
  const shuZhi = Number(wenBen)
  if (!Number.isFinite(shuZhi)) return moRen
  const quZheng = Math.trunc(shuZhi)
  if (quZheng < zuiXiao) return zuiXiao
  if (quZheng > zuiDa) return zuiDa
  return quZheng
}

const ZuiDaMeiLunZhangShu = 1

function quZuiDaMeiLunZhangShu(ming: string): number {
  const wenBen = quHuanJingWenBen(ming, '')
  if (wenBen === '') return ZuiDaMeiLunZhangShu
  const shuZhi = Number(wenBen)
  if (!Number.isFinite(shuZhi)) return ZuiDaMeiLunZhangShu
  if (shuZhi === 0) return 0
  return ZuiDaMeiLunZhangShu
}

const ZiJie = 1024

const MiaoBi = ZiJie * ZiJie

export const 表情包目录环境变量 = 'BIAO_QING_BAO_MU_LU'

export const 表情包目录名 = '表情包'

export const 表情包目录上层层数 = 6

export const 表情待打标 = '待打标'

export const 表情包标注Json后缀 = '.json'

export const 表情运行标签: readonly string[] = [
  '好笑',
  '感动',
  '无语',
  '赞同',
  '撒娇',
  '安慰',
  '庆祝',
  '破冰',
  '告别',
  '卖萌',
  '生气',
  '委屈',
]

export const 表情图片后缀: readonly string[] = ['.png', '.jpg', '.jpeg', '.gif', '.webp']

export const 表情Mime映射: Readonly<Record<string, string>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

export const 表情默认Mime = 'application/octet-stream'

export const 表情短名最大长 = 30

export const 表情描述最大长 = 120

export const 表情适用场景最大长 = 120

export const 表情最大文件字节 = quQiaDuanZhengShu(
  'BIAO_QING_BAO_ZUI_DA_WEN_JIAN_ZI_JIE',
  6 * MiaoBi,
  ZiJie,
  100 * MiaoBi,
)

export const BiaoQingBaoYunXing = {
  houXuanShuLiang: quQiaDuanZhengShu('BIAO_QING_BAO_HOU_XUAN_SHU_LIANG', 8, 1, 50),
  zuiJinChuangKou: quQiaDuanZhengShu('BIAO_QING_BAO_ZUI_JIN_CHUANG_KOU', 3, 0, 20),
  zuiDaMeiLunZhangShu: quZuiDaMeiLunZhangShu('BIAO_QING_BAO_ZUI_DA_MEI_LUN_ZHANG_SHU'),
  daKai: quHuanJingWenBen('BIAO_QING_BAO_AI_DA_KAI', 'true').toLowerCase() !== 'false',
  tieZhiHouDuanJianGe: {
    jiZhun: quQiaDuanZhengShu('BIAO_QING_BAO_TIE_ZHI_HOU_JI_ZHUN_HAO_MIAO', 300, 0, 3000),
    douDong: quQiaDuanZhengShu('BIAO_QING_BAO_TIE_ZHI_HOU_DOU_DONG_HAO_MIAO', 400, 0, 3000),
  } as const,
} as const

export const BiaoQingTieZhiBiaoJi = {
  qianZhui: '贴纸',
  feiFaQianZhui: ['贴图'] as readonly string[],
  maoHao: [':', '：'] as readonly string[],
  zuoKuoHao: ['[', '【'] as readonly string[],
  youKuoHao: [']', '】'] as readonly string[],
  duanMingZuiXiaoChangDu: 1,
  duanMingZuiDaChangDu: 表情短名最大长,
  qingXiGuanJianCi: ['贴纸', '贴图', '表情包'] as readonly string[],
  qingXiKuoHao: [
    { zuo: '[', you: ']' },
    { zuo: '【', you: '】' },
    { zuo: '(', you: ')' },
    { zuo: '（', you: '）' },
    { zuo: '<', you: '>' },
  ] as readonly { zuo: string; you: string }[],
  qingXiYuanWenZuiDaChang: 60,
} as const

export const BiaoQingTieZhiZhanWei = '{duan_ming}'

export const BiaoQingTieZhiShiLi = '[贴纸:{duan_ming}]'

export const BiaoQingFaSongYuanYin = {
  weiMingZhong: '未命中',
  kuWeiKong: '库为空',
  yiJinYong: '已禁用',
  luoKuShiBai: '落库失败',
  daKaiGuanBi: '总开关关闭',
  zhengLunKong: '整轮无内容',
  qingXiHouKong: '清洗后为空',
  douDiBuFa: '兜底补发',
} as const

export const BiaoQingHouXuanWenAn = {
  biaoTi: '【表情包候选】',
  daiTiShuoMing: [
    '下面这几张图这一轮都能用，想发哪张就写 {tie_zhi_shi_li}，放在哪儿随你。',
    '开头先甩一张再开口，那是抢话；话说完了最后补一张，那是收尾；夹在两句中间，就是停了一下；也能这轮一个字都不打，只发一张图。位置本身就是语气。',
    '图替你说了的那层意思，别再用文字说一遍；同一个地方也别又写那个词又贴图。',
    '一轮最多 {zui_da_zhang_shu} 张。关系还没到能随手甩图的份上就别用；正经求助、情绪崩了、深夜倾诉，只说话不发图。',
    '微信自带的小表情（写成 [表情名]，比如 [转圈]、[旺柴]、[破涕为笑]、[捂脸]、[偷笑]、[玫瑰]、[爱心]、[点赞]）不算上面的图，不受轮数限制，想打多少打多少，可以像真人那样连打一串（如「有你真是我们的福气[点赞][点赞][点赞]」）；小表情和图片表情包别混在同一条里。',
  ] as readonly string[],
  hangMoBan: '- {tie_zhi_shi_li} 描述:{miao_shu} | 情绪:{qing_xu} | 场景:{chang_jing}',
  moShuKong: '无',
  changJingKong: '通用',
} as const

export const BiaoQingChuanSongGuiZe: readonly string[] = [
  '接到好笑的事、对方自嘲、玩梗 → 高概率发表情包',
  '对方分享成就喜事 → 庆祝类',
  '对方难过需要安慰 → 先认真文字，可跟一张安慰类',
  '答应请求、表达喜欢 → 亲昵类',
  '对方刚发表情包 → 回敬概率大幅提高',
  '话题尴尬接不下去 → 表情包垫场',
  '对方严肃求助、情绪危机、深夜倾诉 → 禁止发表情包，只许认真文字',
]

export const BiaoQingFaSongShiJiWenAn = BiaoQingChuanSongGuiZe.join('\n')

export const BiaoQingTieZhiTiDaiGuiZe: readonly string[] = [
  `想发图就在要发的位置写一个方括号标记，里面是「${BiaoQingTieZhiBiaoJi.qianZhui}:短名」：放开头、放两句中间、放结尾都行，整条只发图不写字也行。`,
  '图顶掉的那层意思别再用文字说一遍，同一个地方别又写那个词又贴图；方括号里只写短名，不写动作也不写心理活动；这个标记是给系统看的，别跟人解释它，更别当文字发出去。',
]

export const BiaoQingMiDu = {
  jiXian: 0.02,
  chuangKouTiaoShu: quQiaDuanZhengShu('BIAO_QING_BAO_MI_DU_CHUANG_KOU', 12, 4, 60),
  shangCiZhuiSuZuiDuoTiao: quQiaDuanZhengShu('BIAO_QING_BAO_MI_DU_ZHUI_SU', 600, 20, 2000),
  ziLiaoBiaoQingLeiBie: 'biaoqingshu',
  manReBiaoShi: '慢热',
  moRenXiShu: 1,
  renGeXiShu: {
    neiXiang: 1.2,
    waiXiang: 0.9,
    manReGangRenShi: 0.6,
  },
  manReGangRenShiJieDuan: ['冷淡', '疏远', '认识'] as readonly string[],
  guanXiXiShu: {
    冷淡: 0.4,
    疏远: 0.4,
    认识: 0.6,
    熟悉: 1,
    朋友: 1,
    好友: 1.2,
    暧昧: 1.5,
    心动: 1.8,
    热恋: 2,
    深爱: 2,
  },
  huHui: {
    duiFangYou: 2,
    duiFangWu: 0.5,
  },
  jianGe: {
    zuiXiao: quQiaDuanZhengShu('BIAO_QING_BAO_MI_DU_JIAN_GE_ZUI_XIAO', 3, 1, 20),
    zuiDa: quQiaDuanZhengShu('BIAO_QING_BAO_MI_DU_JIAN_GE_ZUI_DA', 500, 50, 5000),
  },
  quXiangYu: {
    偏少: 0.01,
    偏多: 0.04,
  },
} as const

export const BiaoQingYiTuWenAn = {
  biaoTi: '【表情包意图】',
  dingYi: `biao_qing_yi_tu 只是本轮的心情底色，用来筛表情包候选，不决定发不发；发不发、图放在哪儿，由写手自己判断。取值：${表情运行标签.join('、')}，不想给就给 null。`,
  shiJi:
    '时机：接到好笑的事/对方自嘲/玩梗给「好笑」；对方分享喜事给「庆祝」；对方难过先写认真文字、可给「安慰」；答应请求或表达喜欢给「撒娇」；对方刚发表情包回敬时按对方那张的情绪给；话题接不下去给「破冰」。',
  weiJi: '对方严肃求助、情绪危机、深夜倾诉时不要给底色，这种场景只许认真文字。',
  pingFan: '普通日常聊天大部分时候不用给底色；没给也不代表不能发表情包，写手照样按自己的判断决定。',
} as const

export const 表情风格标签: readonly string[] = ['黄脸', '祝福', '日常', '梗图']

export const 表情默认风格 = '日常'

export const 表情人设气质标签: readonly string[] = ['通用', '可爱萌系', '沙雕搞怪', '高冷毒舌', '温柔治愈', '正经严肃', '文艺清新', '热血燃系']
export const 表情圈层门槛标签: readonly string[] = ['大众', '亚文化', '深度梗']

export const 表情人设气质词库: Readonly<Record<string, readonly string[]>> = {
  可爱萌系: ['可爱','软萌','卖萌','元气','撒娇','黏人','甜','软妹','治愈','开朗','活泼','天真','粘人','天真活泼','老顽童'],
  沙雕搞怪: ['沙雕','搞怪','整活','玩笑','幽默','自黑','吐槽','戏精','贫','皮','搞笑','脑洞','抽象','爱玩','贫嘴','社牛','外向','entp','esfp','enfp','estp'],
  高冷毒舌: ['高冷','冷淡','疏离','清冷','寡言','淡漠','少言','毒舌','嘴硬','傲娇','不近人情','不耐烦','冷面','intj','istp'],
  温柔治愈: ['温柔','体贴','善解人意','会哄','善良','照顾','耐心','文静','安静','专注倾听','懂事','isfj','infj'],
  正经严肃: ['严肃','严谨','理性','克制','认真','老实','守规矩','正经','成熟','稳重','istj','estj'],
  文艺清新: ['文艺','诗意','文学','阅读','写作','敏感','感性','infp','intp'],
  热血燃系: ['热血','燃','冲劲','活力','精力','运动','干劲','entj'],
}

export const 表情关系阶段顺序: readonly string[] = [
  '冷淡',
  '疏远',
  '认识',
  '熟悉',
  '朋友',
  '好友',
  '暧昧',
  '心动',
  '热恋',
  '深爱',
]

export const 表情载体配置 = {
  nianLingFenDang: [
    { ming: '青年', nianLingShangXian: 44, yunXuFengGe: ['黄脸', '祝福', '日常', '梗图'], jianGeBeiLv: 1 },
    { ming: '中年', nianLingShangXian: 59, yunXuFengGe: ['黄脸', '祝福', '日常'], jianGeBeiLv: 1.2 },
    { ming: '长辈', nianLingShangXian: 99, yunXuFengGe: ['黄脸', '祝福', '日常'], jianGeBeiLv: 1.6 },
  ] as readonly {
    ming: string
    nianLingShangXian: number
    yunXuFengGe: readonly string[]
    jianGeBeiLv: number
  }[],
  geRenPianHao: {
    jianGeZuiXiaoBeiLv: 0.75,
    jianGeZuiDaBeiLv: 1.35,
  },
  moRenDangMing: '长辈',
  zuiDiYunXuJieDuan: '认识',
  jinYongXiaoShiQiShi: 23,
  jinYongXiaoShiJieShu: 5,
  weiJiGuanJianCi: [
    '求助',
    '帮帮我',
    '崩溃',
    '撑不住',
    '绷不住',
    '想哭',
    '很难受',
    '睡不着',
    '急诊',
    '住院',
    '去世',
    '遗书',
    '不想活',
    '活不下去',
    '没有活下去',
    '自杀',
    '轻生',
    '跳楼',
    '安眠药',
    '眼泪停不下来',
  ] as readonly string[],
  weiJiPaiChuCi: ['笑崩溃', '笑死', '笑到', '太好笑', '太逗了', '笑不活了'] as readonly string[],
  wenBenZuiDaChang: 300,
  fengGeZuiDaChang: 30,
  jieDuanZuiDaChang: 30,
} as const
