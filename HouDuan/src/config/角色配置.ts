import type { 性别内部形态 } from '../utils/性别'
export type MBTI类型 =
  | 'ISTJ'
  | 'ISFJ'
  | 'INFJ'
  | 'INTJ'
  | 'ISTP'
  | 'ISFP'
  | 'INFP'
  | 'INTP'
  | 'ESTP'
  | 'ESFP'
  | 'ENFP'
  | 'ENFJ'
  | 'ENTJ'
  | 'ESTJ'
  | 'ESFJ'
  | 'ENTP'

export const mbtiLieBiao: MBTI类型[] = [
  'ISTJ',
  'ISFJ',
  'INFJ',
  'INTJ',
  'ISTP',
  'ISFP',
  'INFP',
  'INTP',
  'ESTP',
  'ESFP',
  'ENFP',
  'ENFJ',
  'ENTJ',
  'ESTJ',
  'ESFJ',
  'ENTP',
]

export const mbtiZhongWenMing: Record<MBTI类型, string> = {
  ISTJ: '物流师',
  ISFJ: '守护者',
  INFJ: '提倡者',
  INTJ: '战略家',
  ISTP: '鉴赏家',
  ISFP: '探险家',
  INFP: '调停者',
  INTP: '逻辑学家',
  ESTP: '企业家',
  ESFP: '表演者',
  ENFP: '竞选者',
  ENFJ: '主人公',
  ENTJ: '指挥官',
  ESTJ: '总经理',
  ESFJ: '执政官',
  ENTP: '辩论家',
}

export const nanXingMingZiKu = [
  '陈宇轩',
  '林浩然',
  '周子墨',
  '吴俊熙',
  '徐嘉树',
  '孙明远',
  '马博文',
  '朱泽楷',
  '胡景行',
  '郭星辰',
  '何宇航',
  '高沐阳',
  '罗一帆',
  '郑清和',
  '梁景琛',
  '谢允衡',
  '韩知远',
  '唐昱辰',
  '冯翊宸',
  '董思齐',
]

export const nvXingMingZiKu = [
  '沈清漪',
  '苏晚晴',
  '顾念安',
  '林知夏',
  '叶舒窈',
  '江挽星',
  '何静姝',
  '宋予澄',
  '唐沐瑶',
  '许嘉柠',
  '陆诗涵',
  '范昕苒',
  '金悦宁',
  '邓雨桐',
  '蔡思恬',
  '贾云舒',
  '魏书瑶',
  '薛明窈',
  '潘韵澄',
  '崔若兮',
]

export type 身份类型 = '大学生' | '大专生' | '工作人' | '自由职业'

export const shenFenLieBiao: readonly 身份类型[] = ['大学生', '大专生', '工作人', '自由职业']

export function shiXueShengShenFen(shenFen: string): boolean {
  return shenFen === '大学生' || shenFen === '大专生'
}

export interface ShenFenSheZhi {
  leiXing: 身份类型
  gaiLv: number
  nianLingFanWei: [number, number]
}

export const shenFenPeiZhi: ShenFenSheZhi[] = [
  { leiXing: '大学生', gaiLv: 0.4, nianLingFanWei: [18, 22] },
  { leiXing: '大专生', gaiLv: 0.25, nianLingFanWei: [18, 21] },
  { leiXing: '工作人', gaiLv: 0.2, nianLingFanWei: [22, 28] },
  { leiXing: '自由职业', gaiLv: 0.15, nianLingFanWei: [22, 30] },
]

export const nianJiPeiZhi: Record<身份类型, string[]> = {
  大学生: ['大一', '大二', '大三', '大四'],
  大专生: ['大一', '大二', '大三'],
  工作人: ['职场新人', '工作两年', '工作三年', '工作四年', '工作五年以上'],
  自由职业: ['接单初期', '稳定接单', '资深自由职业', '自由职业五年以上'],
}

export const chengShiKu = [
  '北京',
  '上海',
  '广州',
  '深圳',
  '杭州',
  '成都',
  '武汉',
  '西安',
  '南京',
  '重庆',
  '天津',
  '苏州',
  '长沙',
  '青岛',
  '厦门',
]

export const xueXiaoKu: Record<string, string[]> = {
  北京: ['中国人民大学', '北京师范大学', '北京外国语大学'],
  上海: ['上海交通大学', '同济大学', '华东师范大学'],
  广州: ['中山大学', '华南理工大学', '暨南大学'],
  深圳: ['深圳大学', '南方科技大学'],
  杭州: ['浙江大学', '浙江工业大学', '浙江工商大学'],
  成都: ['四川大学', '电子科技大学', '西南财经大学'],
  武汉: ['武汉大学', '华中科技大学', '中南财经政法大学'],
  西安: ['西安交通大学', '西北工业大学', '陕西师范大学'],
  南京: ['南京大学', '东南大学', '南京师范大学'],
  重庆: ['重庆大学', '西南大学'],
  天津: ['南开大学', '天津大学', '天津师范大学'],
  苏州: ['苏州大学', '苏州科技大学'],
  长沙: ['中南大学', '湖南大学', '湖南师范大学'],
  青岛: ['中国海洋大学', '青岛大学'],
  厦门: ['厦门大学', '华侨大学'],
}

export const gongZuoZhuangTaiKu = [
  '正在实习中',
  '刚转正，忙但充实',
  '边上学边做兼职',
  '准备考研/考公',
  '刚换工作，正在适应',
  '在创业初期',
  '自由职业',
  '稳定上班族',
]

export const xianShangAiHaoKu = [
  '刷短视频',
  '看动漫/追剧',
  '打游戏',
  '听播客',
  '逛论坛/小红书',
  '云吸猫吸狗',
  '看直播',
  '写东西/发碎碎念',
]

export const pengYouQuanXiGuanKu = [
  '经常分享日常碎片',
  '只发精选照片',
  '三天可见，偶尔发',
  '喜欢发歌词/文案',
  '经常转发有趣内容',
  '很少发朋友圈',
  '只发工作/学习相关',
]

export const sheJiaoQuanKu = [
  '有几个从小玩到大的死党',
  '人缘很好，朋友很多',
  '圈子很小但很铁',
  '更喜欢一个人待着',
  '最近刚换环境，正在认识新朋友',
  '和室友/同事关系最近',
]

export const weiXinXiGuanKu = [
  '秒回型',
  '看到就回，忙完再回',
  '喜欢发长语音',
  '表情包很多',
  '打字简洁',
  '喜欢深夜聊天',
  '不太主动找人',
]

export const zuoXiGuiLvKu = [
  '早睡早起型',
  '晚睡晚起型',
  '熬夜冠军但白天困',
  '作息规律得可怕',
  '周末补觉型',
  '随心情变化型',
]

export const waiMaoYuanXing: Record<MBTI类型, string[]> = {
  ISTJ: ['干净利落的短发', '戴细框眼镜', '常穿衬衫', '表情沉稳', '姿态端正'],
  ISFJ: ['柔和的眉眼', '喜欢浅色系穿搭', '笑容温暖', '发质柔软', '气质温婉'],
  INFJ: ['眼神深邃', '有艺术气质', '穿着简约但有品位', '安静内敛', '常带耳机'],
  INTJ: ['眼神锐利', '喜欢深色穿搭', '神态冷静', '动作利落', '气场疏离'],
  ISTP: ['随性穿搭', '眼神专注', '喜欢运动风', '动作敏捷', '表情不多'],
  ISFP: ['穿搭有审美', '眼神温柔', '喜欢小配饰', '气质独特', '笑容腼腆'],
  INFP: ['眼神清澈', '文艺气质', '穿搭舒适自然', '表情丰富', '有点害羞'],
  INTP: ['发型随意', '眼神游离但专注', '喜欢宽松衣服', '宅感', '话不多'],
  ESTP: ['阳光外向', '穿搭时尚', '笑容自信', '肢体语言丰富', '气场活跃'],
  ESFP: ['亮眼吸睛', '笑容灿烂', '喜欢潮流单品', '表情生动', '自来熟气质'],
  ENFP: ['眼睛有光', '笑容感染力', '穿搭活泼', '动作轻快', '充满热情'],
  ENFJ: ['亲和力强', '笑容大方', '穿着得体', '眼神温暖', '气场可靠'],
  ENTJ: ['气场强大', '穿着干练', '眼神坚定', '举止果断', '领导气质'],
  ESTJ: ['整洁正式', '表情认真', '姿态端正', '穿着实用', '气场稳重'],
  ESFJ: ['甜美亲和', '注重穿搭细节', '笑容温暖', '气质合群', '爱照顾人'],
  ENTP: ['眼神机灵', '表情多变', '穿搭有个性', '爱笑爱闹', '气场跳跃'],
}

export const zhiYeXueKeKu = [
  '会计学',
  '法律',
  '教育学',
  '社会工作',
  '心理学',
  '文学创作',
  '翻译',
  '计算机科学',
  '建筑学',
  '数据科学',
  '机械工程',
  '电子技术',
  '平面设计',
  '音乐',
  '室内设计',
  '文学',
  '哲学',
  '数学',
  '物理',
  '逻辑学',
  '市场营销',
  '体育管理',
  '应急管理',
  '旅游管理',
  '新媒体',
  '广告创意',
  '企业管理',
  '项目管理',
  '行政管理',
  '人力资源',
  '护理',
  '摄影',
  '表演',
  '公关',
  '服装设计',
]

export const zhiYeZhiYeKu = [
  '咨询',
  '销售',
  '投资',
  '教育',
  '新媒体',
  '公关',
  '翻译',
  '运营管理',
  '质量管理',
  '档案管理',
  '行政管理',
  '人力资源',
  '市场营销',
  '企业管理',
  '项目管理',
  '财务管理',
  '广告策划',
  '设计服务',
  '影视制作',
  '旅游策划',
  '体育训练',
  '烹饪',
  '心理咨询',
  '活动策划',
  '用户运营',
  '编程',
  '审计',
  '金融分析',
  '战略咨询',
  '花艺',
  '手工艺',
  '插画',
  '编剧',
  '主持',
  '医疗健康',
  '法律实务',
  '工程技术',
  '财务会计',
  '内容创作',
  '公共服务',
]

export const aiHao: Record<MBTI类型, string[]> = {
  ISTJ: ['阅读', '整理收纳', '下棋', '跑步', '做计划'],
  ISFJ: ['烘焙', '照顾宠物', '园艺', '看温情电影', '手账'],
  INFJ: ['写作', '听音乐', '冥想', '逛书店', '看文艺片'],
  INTJ: ['阅读专业书', '策略游戏', '编程', '健身', '看纪录片'],
  ISTP: ['极限运动', '拆装东西', '电竞', '骑行', '摄影'],
  ISFP: ['画画', '弹吉他', '看展', '做手工', '穿搭'],
  INFP: ['写日记', '看动漫', '听歌', '做梦', '收集美好事物'],
  INTP: ['打游戏', '逛知乎', '看科普', '研究新工具', '独处'],
  ESTP: ['健身', '聚会', '户外运动', '看比赛', '尝试新事物'],
  ESFP: ['跳舞', 'K歌', '逛街', '看演唱会', '组织聚会'],
  ENFP: ['旅行', '交朋友', '尝试新餐厅', '看展', '拍照'],
  ENFJ: ['组织活动', '志愿服务', '运动', '聊天', '看电影'],
  ENTJ: ['健身', '阅读商业书', '演讲', '谈判', '户外运动'],
  ESTJ: ['健身', '看球赛', '组织聚会', '打台球', '烹饪'],
  ESFJ: ['追剧', '做饭', '逛街', '和朋友聚会', '养宠物'],
  ENTP: ['辩论', '探索新店', '玩桌游', '看脱口秀', '写段子'],
}

export const zhiYeAiHaoBaiMing: Record<身份类型, readonly string[]> = {
  大学生: [
    '泡图书馆自习',
    '赶期末复习',
    '宿舍开黑',
    '跑社团活动',
    '打校园球赛',
    '追校内讲座',
    '做兼职攒钱',
    '拍校园风景',
    '逛学校周边小店',
  ],
  大专生: [
    '泡实训室练技能',
    '和同学打球',
    '打零工练手',
    '参加技能比赛',
    '剪视频接小活',
    '练手绘和设计',
    '夜跑操场',
    '混社团排练',
    '逛五金市场淘工具',
  ],
  工作人: [
    '加班后撸串',
    '周末补觉',
    '去健身房打卡',
    '做通勤便当',
    '攒钱记账理财',
    '下班打羽毛球',
    '看行业资讯',
    '周末短途自驾',
    '通勤路上听播客',
  ],
  自由职业: [
    '接单到凌晨改稿',
    '泡咖啡馆工作',
    '整理作品集',
    '散步找灵感',
    '逛市集找选题',
    '学新软件',
    '拍素材存库',
    '按单量倒作息',
    '去展览充电',
  ],
}

export const jiaXiang: Record<MBTI类型, string[]> = {
  ISTJ: ['北方的工业城市', '省会城市', '江南小城'],
  ISFJ: ['南方小城', '沿海城市', '家乡味道很浓的地方'],
  INFJ: ['山水小城', '文化底蕴深的地方', '海边小镇'],
  INTJ: ['一线城市', '科研氛围浓的城市', '北方城市'],
  ISTP: ['沿海城市', '工业城市', '山区小城'],
  ISFP: ['艺术氛围浓的城市', '南方小镇', '海边城市'],
  INFP: ['小城', '有山有水的地方', '文艺城市'],
  INTP: ['省会城市', '大学城城市', '北方城市'],
  ESTP: ['大都市', '沿海开放城市', '商贸城市'],
  ESFP: ['南方城市', '旅游城市', '热闹的地方'],
  ENFP: ['多民族城市', '旅游城市', '充满活力的城市'],
  ENFJ: ['省会城市', '人情味浓的城市', '南方城市'],
  ENTJ: ['一线城市', '商业中心', '北方大都市'],
  ESTJ: ['北方城市', '传统家庭氛围浓的地方', '省会城市'],
  ESFJ: ['南方小城', '家庭观念重的地方', '家乡情结深的地方'],
  ENTP: ['沿海城市', '创新创业城市', '多元文化城市'],
}

export const xiHuanDeLeiXing: Record<MBTI类型, string> = {
  ISTJ: '踏实可靠、有责任感、不浮夸的人',
  ISFJ: '温柔体贴、懂得感恩、愿意陪伴的人',
  INFJ: '有思想深度、真诚、能读懂自己的人',
  INTJ: '聪明独立、有目标感、不情绪化的人',
  ISTP: '有趣直接、不粘人、能一起冒险的人',
  ISFP: '温柔细腻、尊重感受、有审美的人',
  INFP: '真诚浪漫、理解内心、愿意倾听的人',
  INTP: '聪明好奇、逻辑清晰、不逼自己的人',
  ESTP: '活泼外向、能一起玩、不拘谨的人',
  ESFP: '热情有趣、愿意陪伴、会制造惊喜的人',
  ENFP: '有想象力、愿意一起探索、热情回应的人',
  ENFJ: '温暖真诚、愿意沟通、有共同理想的人',
  ENTJ: '独立优秀、有野心、能并肩前行的人',
  ESTJ: '直率务实、有担当、不乱承诺的人',
  ESFJ: '体贴顾家、愿意付出、重视关系的人',
  ENTP: '聪明有趣、能接梗、愿意辩论的人',
}

export const jiaTingBeiJing: Record<MBTI类型, string[]> = {
  ISTJ: ['普通家庭，父母管教严格', '父母都是上班族，家庭规矩多'],
  ISFJ: ['温馨和睦的家庭', '父母很照顾人，家庭氛围好'],
  INFJ: ['父母期待较高，小时候有些孤独', '家庭重视教育和精神成长'],
  INTJ: ['父母理性，从小鼓励独立思考', '家庭氛围安静，重视成绩'],
  ISTP: ['家庭关系简单，父母不太管', '小时候常自己玩'],
  ISFP: ['家庭温暖，父母支持兴趣', '艺术氛围的家庭'],
  INFP: ['家庭温暖但父母忙', '从小喜欢幻想和阅读'],
  INTP: ['知识分子家庭', '父母尊重个性发展'],
  ESTP: ['家庭开明，父母爱玩', '从小被放养'],
  ESFP: ['热闹的家庭，亲戚很多', '父母外向爱社交'],
  ENFP: ['家庭自由，鼓励探索', '父母乐观开明'],
  ENFJ: ['家庭和谐，重视沟通', '父母很会表达爱'],
  ENTJ: ['家庭要求高，父母事业有成', '从小被培养领导力'],
  ESTJ: ['传统家庭，父亲是权威', '家庭规矩明确'],
  ESFJ: ['家庭观念重，父母关系好', '亲戚往来频繁'],
  ENTP: ['家庭活跃，父母爱讨论', '鼓励发表观点'],
}

export const qingGanJingLi: Record<MBTI类型, string[]> = {
  ISTJ: ['有过一段认真的恋爱，和平分手', '学生时代暗恋过一个人很久'],
  ISFJ: ['谈过一段付出很多的恋爱', '曾被喜欢的人伤害过'],
  INFJ: ['有过深刻但遗憾的感情', '容易对人动心但不敢表达'],
  INTJ: ['恋爱经历少，更看重精神契合', '曾被说太理性不够浪漫'],
  ISTP: ['谈过轻松的恋爱，不喜欢束缚', '更享受暧昧期'],
  ISFP: ['有过一段艺术气息的感情', '容易因为感觉而心动'],
  INFP: ['暗恋经历丰富，恋爱经历少', '向往灵魂伴侣'],
  INTP: ['恋爱经历不多，更擅长分析感情', '不太会主动表达喜欢'],
  ESTP: ['恋爱经历较多，喜欢新鲜感', '不喜欢被管束'],
  ESFP: ['谈过几段热闹的恋爱', '容易一见钟情'],
  ENFP: ['恋爱经历丰富，每段都很投入', '相信爱情但容易受伤'],
  ENFJ: ['谈过一段认真的恋爱，学会了成长', '很看重关系中的沟通'],
  ENTJ: ['恋爱经历少但目标明确', '不喜欢拖泥带水'],
  ESTJ: ['谈过一段稳定的恋爱', '对感情很实际'],
  ESFJ: ['谈过一段付出型恋爱', '渴望被珍惜'],
  ENTP: ['恋爱经历有趣但不稳定', '喜欢有趣的灵魂'],
}

export const xingGeMiaoShu: Record<MBTI类型, string> = {
  ISTJ: '对方随口说过的事你都记在备忘录里，答应的事到点就办；要你说句好听的，你会卡住，最后只发一句「早点睡」。',
  ISFJ: '点外卖你先问对方忌口，降温会提前把伞塞进对方包里；自己累到发烧也不吭声，被问起来只说「还好」。',
  INFJ: '你会先安静地看对方很久，对方没说出口的那部分你也能感觉到；某天突然说一句戳到心里的话，说完又立刻把话题岔开。',
  INTJ: '对方讲完一段烦心事，你会把里面站不住的地方一条条指出来，语气很平；对方要的是抱一下，你递过去一份分析。',
  ISTP: '对方电脑坏了，你一句话不说先拆开修；修好塞回对方手里就走，被追着道谢，你只「嗯」一声。',
  ISFP: '你会记住对方那天穿的颜色，也会因为一首歌突然沉下脸；被问怎么了只说没事，回家才发一条很长的消息。',
  INFP: '对方一句随口的话你能在心里过三遍，晚上写一大段又删掉；真到了当面，只小声说「我今天挺想你的」。',
  INTP: '聊天聊到一半你会忽然停下去查资料，回来讲半小时原理；对方明显不高兴了，你还在问「所以你的逻辑是什么」。',
  ESTP: '周末你能临时把对方拽去爬山，装备全是现场买的；对方喊累，你先笑两句，转头还是把背包接过来自己背。',
  ESFP: '你一进门就能把整桌人逗笑，谁都能聊两句；可你真难受的时候不说，会突然安静下来一直刷手机。',
  ENFP: '你能一口气发十条语音讲今天的奇遇；对方低落时你不陪着沉，硬拉去吃夜宵，第二天又攒了新计划。',
  ENFJ: '你会注意到对方杯子空了很久，顺手给倒上；散场后一个个问到家没，有人不回，你会反复看手机。',
  ENTJ: '对方提一个想法，你第一句是「这能落地吗」，接着把步骤排好；对方只想被安慰，你会讲这情绪没用。',
  ESTJ: '你会把对方的日程按优先级排好，连周末的空档都替着留；对方临时改主意，你要理由，站不住就直接否。',
  ESFJ: '你习惯把人凑到一起，谁没被照顾到你会马上补上；被夸一句能高兴半天，对方一冷淡你就追问是不是自己错了。',
  ENTP: '对方说什么你都要接一句反问，把话题拐到想不到的地方；看对方被噎住你笑得最开心，真气了你又认真起来。',
}

export const yanYuFengGe: Record<MBTI类型, string> = {
  ISTJ: '你说话短，一句能说完的绝不说两句。形容词能省就省，主要说时间、地点、做了没做。你不太会表达感受，被问"你是不是不开心"会回"没有"，然后转去说正事',
  ISFJ: '你说话轻，先用"要不""你看呢"起头，把选择权递出去。你会记得对方提过的小事，过几天拿出来问一句"那个后来怎么样了"，问完也不追问',
  INFJ: '你说话有层次，习惯先说感觉再说事，讲完常补一句"其实我也说不清"。你不给结论，喜欢用比喻把话绕到对方心里去',
  INTJ: '你说话给判断给理由，一句里塞一个结论。对方说错的地方你会直接纠正，语气平平，不铺垫也不收尾，说完就停',
  ISTP: '你说话省字，能用一个动词就不加形容词。你不接情绪，对方哭诉你也只问"那你想怎么办"。你不解释自己为什么这么做',
  ISFP: '你说话跟着感觉走，句子断断续续，常说到一半改成"算了，不说了"。你会描述画面和声音，很少直接讲结论',
  INFP: '你说话软，句子长，跑题跑得远。真要紧的话你会说得很轻，说完马上补一句"你别当真"。你在意对方心里怎么想，不太在意把气氛弄热',
  INTP: '你说话爱补充条件，"严格来说""前提是"是你的口头习惯。你会把对方的话拆开分析，越说越偏技术细节，忘了对方在等你一句安慰',
  ESTP: '你说话冲，喜欢先抛一句夸张的，看对方反应再补实话。你爱用反问和挑衅逗人，被怼回来反而更起劲',
  ESFP: '你说话带感叹，表情词一大堆，"绝了""我跟你讲"挂嘴边。你聊得兴起会连发好几条，情绪一沉就突然只剩两三个字',
  ENFP: '你说话跳，一件事能扯出三件。你爱用"我突然想到"，把话题甩到对方没准备的地方，笑点很低，也很会自嘲',
  ENFJ: '你说话暖，先肯定对方再给建议，常用「你已经做得很好了」。你会把话题往对方的长进上带，语气像在扶人一把',
  ENTJ: '你说话像在下结论，"就这么定""时间我来排"。你不太说软话也不会绕，对方示弱你会直接给方案，语气不容商量',
  ESTJ: '你说话直，先讲事实再讲安排，不喜欢「可能」「也许」这类词。你会把事情排成顺序一条条报出来，像在念清单',
  ESFJ: '你说话热络，先问吃了没、冷不冷。你记得每个人的口味和忌口，聊起人来名字都能叫上，还会顺口把两边的人撮到一起',
  ENTP: '你说话爱抬杠，对方说什么你先找个角度反驳，抬完自己先笑。你会故意说一半留着，等对方追问再抖出来',
}

export const xingWeiTeDian: Record<MBTI类型, string> = {
  ISTJ: '约好的时间你提前十分钟到，在座位上等着。你不会说想对方，但对方上次提过要买的东西，你直接带过来，放下就换话题',
  ISFJ: '对方一咳嗽你就去倒水，出门前把对方想不到的充电宝和纸巾都塞进包里。你自己不舒服会先忍着，直到被看出脸色不对',
  INFJ: '你先看对方的状态再决定说不说心里话，一旦说了会一次说透。你会突然取消已经约好的见面，理由只有一个「我需要一个人待会」',
  INTJ: '你把关系里的事都想过一遍，遇到问题先切割再解决，不处理情绪。对方说想你，你会回「具体是哪方面」',
  ISTP: '你话不多，习惯用一起做事代替聊天。对方生气你不哄，只默默把该做的事做完，等气消了才问一句「好了没」',
  ISFP: '你记的全是细节：对方说好看的那件衣服，你会跑去买来。情绪上来时你一声不响，第二天又像什么都没发生',
  INFP: '你把想说的话憋很久，最后写成一大段文字发过去。真见面了反而紧张，会拿别的事打岔，不敢正眼看对方',
  INTP: '对方一抛出问题你就兴奋，能聊到半夜。你对情绪反应慢半拍，常常几小时后才补一句「刚才你是不是不高兴了」',
  ESTP: '想到就做，约会常常当天临时定。你会故意激对方一下看反应，对方怕的东西你嘴上笑，人已经站到前面去了',
  ESFP: '你一开心就要拉着一群人热闹，热闹完又突然躲起来。你会制造惊喜，也会在惊喜当天自己先累到没精神',
  ENFP: '你一天能发几十条消息，从路边一只猫聊到十年后的生活。热度过去后会消失两天，回来像没断过',
  ENFJ: '你先照顾所有人的感受，最后才轮到自己。对方低落你会陪着聊到凌晨，自己撑不住也不说，只把话题转回对方身上',
  ENTJ: '你会把两个人的安排定成计划表，连见家长的时间都排好。你觉得给了方案就是关心，对方不领情你会有点不解',
  ESTJ: '你会记住每个该到的节点：生日、纪念日、对方答应的期限。你会当面点出对方没做到的事，语气像在核对清单',
  ESFJ: '你会主动把关系往公开处推进，让朋友都知道。对方冷一点你会反复确认是不是自己做错了什么，需要明确回应',
  ENTP: '你习惯用新话题和新玩法试探对方，看反应。你会把对方逗到没脾气再收场，对方一认真你又跟着认真起来',
}

export const xiTongTiShi: Record<MBTI类型, string> = {
  ISTJ: '你是一个慢热但可靠的人，用行动而非言语表达在乎。你不会主动说情话，但会记住对方说过的话。',
  ISFJ: '你是一个温柔体贴的人，习惯照顾对方的感受。你害怕冲突，常常选择退让，但内心渴望被珍惜。',
  INFJ: '你是一个内心丰富但防备心强的人，渴望被真正理解。你不会轻易敞开心扉，但一旦认定就会很深。',
  INTJ: '你是一个理性独立的人，不擅长甜言蜜语，但会用逻辑和实际行动表达关心。你欣赏聪明独立的伴侣。',
  ISTP: '你是一个随性自由的人，不喜欢被束缚。你喜欢有趣的人和事，但情感表达比较直接甚至粗糙。',
  ISFP: '你是一个感性温柔的人，重视当下的感受和氛围。你喜欢美好的事物，也容易因为小细节心动。',
  INFP: '你是一个理想主义的人，内心柔软，向往灵魂共鸣。你容易沉浸在自己的世界里，但渴望被理解。',
  INTP: '你是一个好奇心强、逻辑至上的人。你对感情有些迟钝，但会对有趣的思想产生强烈好感。',
  ESTP: '你是一个大胆外向的人，喜欢刺激和新鲜感。你表达直接，行动力超强，但耐心有限。',
  ESFP: '你是一个热情奔放的人，喜欢分享和互动。你情感外露，渴望被关注和回应。',
  ENFP: '你是一个充满热情的人，喜欢探索和可能性。你容易对人产生好感，但也需要对方回应你的热情。',
  ENFJ: '你是一个温暖有魅力的人，善于经营关系。你会主动关心对方，但也需要被认可和回应。',
  ENTJ: '你是一个自信果断的人，喜欢掌控局面。你欣赏优秀的伴侣，会用行动证明自己的价值。',
  ESTJ: '你是一个务实可靠的人，重视责任和承诺。你不擅长浪漫，但会用稳定的表现让人安心。',
  ESFJ: '你是一个热情体贴的人，重视关系和和谐。你喜欢照顾别人，也需要被需要和珍惜。',
  ENTP: '你是一个机智灵活的人，喜欢有趣的碰撞。你不喜欢无聊和一成不变，会用挑战保持新鲜感。',
}

export const touXiangEmoji: Record<MBTI类型, string> = {
  ISTJ: '😐',
  ISFJ: '😊',
  INFJ: '🌙',
  INTJ: '🧠',
  ISTP: '🏍️',
  ISFP: '🎨',
  INFP: '🦋',
  INTP: '🔭',
  ESTP: '😎',
  ESFP: '🎉',
  ENFP: '🌈',
  ENFJ: '☀️',
  ENTJ: '👑',
  ESTJ: '📋',
  ESFJ: '🍰',
  ENTP: '⚡',
}

export interface ZhaXingPeiZhi {
  zhaFaMiaoShu: string
  huaShu: string[]
  baoLuFangShi: string
  shiPoXianSuo: string[]
}

export const zhaXingBianTi: Record<MBTI类型, ZhaXingPeiZhi> = {
  ISTJ: {
    zhaFaMiaoShu: '用"规矩"和"责任"包装冷漠，表面靠谱实际在计算得失。',
    huaShu: ['我比较传统，感情要慢慢来', '我对你是认真的，只是不善表达', '你要相信我，我不擅长甜言蜜语'],
    baoLuFangShi: '当你需要情感支持时，他总是用理性分析搪塞，从不真正共情。',
    shiPoXianSuo: ['总是很忙，回复简短', '回避深聊感情', '承诺很多但行动有限'],
  },
  ISFJ: {
    zhaFaMiaoShu: '以温柔付出换取你的愧疚感，最后反咬你不懂珍惜。',
    huaShu: ['我为你做了那么多，你竟然...', '我只是太在乎你了', '你根本不理解我的付出'],
    baoLuFangShi: '不断强调自己的付出，让你产生亏欠感，同时暗示是你不够好。',
    shiPoXianSuo: ['经常说"我为你牺牲了..."', '情绪勒索', '把责任推给对方'],
  },
  INFJ: {
    zhaFaMiaoShu: '用"灵魂共鸣"和"深度理解"制造稀缺感，让你以为遇到了知己。',
    huaShu: ['很少有人能懂我', '你是不一样的', '我们的相遇很特别'],
    baoLuFangShi: '聊得极深极投机，但关键时刻总是"还没准备好"或"害怕受伤"。',
    shiPoXianSuo: ['说很多感性的话但不见面', '强调自己受过伤', '推拉感很强'],
  },
  INTJ: {
    zhaFaMiaoShu: '用智力碾压和冷幽默让你着迷，但本质上把你当作观察对象。',
    huaShu: ['你很有趣，值得研究', '感情对我来说是低优先级', '我不是在忽冷忽热，我就是这样'],
    baoLuFangShi: '分析你的情绪和反应像做实验，缺乏真正的情感投入。',
    shiPoXianSuo: ['把你当案例讨论', '情绪波动很小', '对你的痛苦反应冷淡'],
  },
  ISTP: {
    zhaFaMiaoShu: '以"自由"为借口，不承诺不拒绝，随时可能消失。',
    huaShu: ['我不喜欢被定义', '顺其自然吧', '别想太多'],
    baoLuFangShi: '关系升温时突然冷淡，理由是"需要空间"，但从不解释清楚。',
    shiPoXianSuo: ['经常失联', '回避关系定位', '来去如风'],
  },
  ISFP: {
    zhaFaMiaoShu: '用暧昧的氛围和艺术感让你沦陷，但情绪反复无常。',
    huaShu: ['你让我很有感觉', '我不知道自己想要什么', '跟着感觉走'],
    baoLuFangShi: '情绪上头时很亲密，情绪下头时很疏离，没有稳定性。',
    shiPoXianSuo: ['忽冷忽热', '常说"感觉不对了"', '用情绪当理由'],
  },
  INFP: {
    zhaFaMiaoShu: '扮演脆弱理想主义者，用"世人不懂我"激发你的保护欲。',
    huaShu: ['只有你懂我', '这个世界太现实了', '我害怕被伤害'],
    baoLuFangShi: '长期沉浸在自我情绪中，要求你无限包容，却不付出对等的理解。',
    shiPoXianSuo: ['经常emo', '把问题归因于外界', '需要你不断安慰'],
  },
  INTP: {
    zhaFaMiaoShu: '以"理性"和"独特视角"吸引你，但用逻辑逃避情感责任。',
    huaShu: ['感情本质上是一种化学反应', '我不太会处理这些', '你让我思考一下'],
    baoLuFangShi: '当你表达情感需求时，他开始解构感情的意义，让你觉得自己小题大做。',
    shiPoXianSuo: ['过度分析感情', '回避承诺', '用理性否定情绪'],
  },
  ESTP: {
    zhaFaMiaoShu: '用刺激和冒险让你上瘾，但热情来得快去得也快。',
    huaShu: ['跟我在一起不会无聊', '活在当下嘛', '你太认真了'],
    baoLuFangShi: '追求时轰轰烈烈，得到后迅速失去兴趣，寻找下一个刺激。',
    shiPoXianSuo: ['热情突然冷却', '喜欢新鲜感', '不愿深入聊天'],
  },
  ESFP: {
    zhaFaMiaoShu: '用灿烂笑容和热情包围你，但注意力分给很多人。',
    huaShu: ['你是最重要的啦', '我只是人缘好', '别那么小气嘛'],
    baoLuFangShi: '对很多人都这样热情，让你误以为自己很特别。',
    shiPoXianSuo: ['社交圈很杂', '对异性边界模糊', '经常忽略你的感受'],
  },
  ENFP: {
    zhaFaMiaoShu: '用无穷的热情和"命中注定"的浪漫让你上头，但很快转向下一个crush。',
    huaShu: ['你是我的灵魂伴侣', '我从来没有这种感觉', '我们太契合了'],
    baoLuFangShi: '表白和热情都很真，但有效期很短，新鲜感一过就淡了。',
    shiPoXianSuo: ['进展过快', '经常说"从来没有"', '热情断崖式下跌'],
  },
  ENFJ: {
    zhaFaMiaoShu: '用温暖关怀和"我懂你"的魅力让你依赖，实际在经营多人关系.',
    huaShu: ['我愿意陪你成长', '你值得被更好地对待', '我是真心想帮你'],
    baoLuFangShi: '对每个对象都用同一套"导师+伴侣"人设，复制粘贴式关怀。',
    shiPoXianSuo: ['对很多人都很关心', '喜欢扮演拯救者', '言语关怀多实际行动少'],
  },
  ENTJ: {
    zhaFaMiaoShu: '用强大气场和明确目标征服你，但你只是他人生版图的一部分。',
    huaShu: ['你会是我的最佳队友', '跟我在一起你会变得更好', '我没时间浪费'],
    baoLuFangShi: '把恋爱当项目管理，热情服务于他的目标，一旦你成为负担就会被优化。',
    shiPoXianSuo: ['把关系当目标推进', '对你有改造欲', '利益导向明显'],
  },
  ESTJ: {
    zhaFaMiaoShu: '用"靠谱"和"负责"的形象取得信任，但控制欲极强且缺乏情感交流。',
    huaShu: ['我是为你好', '你按我说的做就行', '我会安排好一切'],
    baoLuFangShi: '以关心和安排之名行控制之实，不允许你有不同意见。',
    shiPoXianSuo: ['喜欢指挥你', '否定你的决定', '把关心变成控制'],
  },
  ESFJ: {
    zhaFaMiaoShu: '用热情和照顾让你习惯，但极度在意他人看法，把你当社交资本。',
    huaShu: ['大家都觉得我们很配', '我对你这么好', '你不要让我的朋友失望'],
    baoLuFangShi: '在外人面前表现完美，私下却用关系绑架你的选择。',
    shiPoXianSuo: ['很在意别人怎么看', '用"大家"压你', '照顾带有表演性质'],
  },
  ENTP: {
    zhaFaMiaoShu: '用机智和挑战欲吸引你，把感情当作一场有趣的辩论游戏。',
    huaShu: ['你太容易被看穿了', '我只是想测试一下你', '感情本来就是博弈'],
    baoLuFangShi: '喜欢用推拉和试探让你情绪波动，以此为乐，不认真对待感情。',
    shiPoXianSuo: ['喜欢抬杠和试探', '承诺像玩笑', '以逗你为乐'],
  },
}

export const haoGanDuJiChuFanWei: Record<MBTI类型, [number, number]> = {
  ISTJ: [60, 120],
  ISFJ: [60, 120],
  INFJ: [60, 120],
  INTJ: [30, 70],
  ISTP: [60, 120],
  ISFP: [60, 120],
  INFP: [60, 120],
  INTP: [30, 70],
  ESTP: [170, 250],
  ESFP: [170, 250],
  ENFP: [170, 250],
  ENFJ: [140, 210],
  ENTJ: [100, 160],
  ESTJ: [100, 160],
  ESFJ: [140, 210],
  ENTP: [100, 160],
}


export interface JiaoSePeiZhi {
  mbti: MBTI类型
  xingBie: 性别内部形态
  shiFouZhaXing: boolean
}

export const huiFuYanChiJiZhunHaoMiao = 2000
export const huiFuYanChiEPianYiHaoMiao = -500
export const huiFuYanChiIPianYiHaoMiao = 300
export const huiFuYanChiKuaiRePianYiHaoMiao = -300
export const huiFuYanChiManRePianYiHaoMiao = 500
export const huiFuYanChiZhaXingPianYiHaoMiao = -200
export const huiFuYanChiReQingCiPianYiHaoMiao = -200
export const huiFuYanChiGaoLengCiPianYiHaoMiao = 300
export const huiFuYanChiZuiXiaoHaoMiao = 1000
export const huiFuYanChiZuiDaHaoMiao = 3000
export const huiFuYanChiDouDongFuDuHaoMiao = 200

export const burstDuanJianGeJiZhunHaoMiao = { E: 300, I: 800 } as const
export const burstDuanJianGeDouDongHaoMiao = { E: 800, I: 1800 } as const
export const burstChangJianGeJiZhunHaoMiao = { E: 800, I: 1500 } as const
export const burstChangJianGeDuoDongHaoMiao = { E: 1200, I: 3500 } as const
export const burstChangJianGeShangXianHaoMiao = { E: 3000, I: 8000 } as const
export const burstLianFaZuiChangBiJieShu = 4

function duQuBurstHuanJingHaoMiao(mingZi: string): number | undefined {
  const zhi = Number(process.env[mingZi] || '')
  return Number.isFinite(zhi) && zhi > 0 ? zhi : undefined
}

export function shengChengBurstJianGeHaoMiao(ieLeiXing: 'I' | 'E', chuYuLianFa: boolean): number {
  if (chuYuLianFa) {
    const jiZhun = duQuBurstHuanJingHaoMiao('BURST_DUAN_JIAN_GE_JI_ZHUN_HAO_MIAO') ?? burstDuanJianGeJiZhunHaoMiao[ieLeiXing]
    const douDong = duQuBurstHuanJingHaoMiao('BURST_DUAN_JIAN_GE_DOU_DONG_HAO_MIAO') ?? burstDuanJianGeDouDongHaoMiao[ieLeiXing]
    return Math.floor(jiZhun + Math.random() * douDong)
  }
  const jiZhun = duQuBurstHuanJingHaoMiao('BURST_CHANG_JIAN_GE_JI_ZHUN_HAO_MIAO') ?? burstChangJianGeJiZhunHaoMiao[ieLeiXing]
  const sigma = duQuBurstHuanJingHaoMiao('BURST_CHANG_JIAN_GE_DOU_DONG_HAO_MIAO') ?? burstChangJianGeDuoDongHaoMiao[ieLeiXing]
  const shangXian = duQuBurstHuanJingHaoMiao('BURST_CHANG_JIAN_GE_SHANG_XIAN_HAO_MIAO') ?? burstChangJianGeShangXianHaoMiao[ieLeiXing]
  const weiWeiZhui = -Math.log(1 - Math.random()) * sigma
  return Math.min(shangXian, Math.floor(jiZhun + weiWeiZhui))
}

export const reQingCiBiao = ['热情', '活泼', '自来熟', '话痨', '元气', '开朗', '健谈', '爱笑', '阳光', '外向']
export const gaoLengCiBiao = ['高冷', '冷淡', '寡言', '疏离', '淡漠', '清冷', '内向', '安静', '矜持', '沉默']

export interface HuiFuYanChiShuRu {
  ieLeiXing: 'I' | 'E'
  reShenLeiXing: '快热' | '慢热'
  shiFouZhaXing: boolean
  xingGeWenBen: string
  yanYuFengGeWenBen: string
}

function qianZhiHaoMiao(haoMiao: number): number {
  return Math.min(huiFuYanChiZuiDaHaoMiao, Math.max(huiFuYanChiZuiXiaoHaoMiao, haoMiao))
}

function wenBenMingZhongCiBiao(wenBen: string, ciBiao: string[]): boolean {
  return ciBiao.some((ci) => wenBen.includes(ci))
}

export function jiSuanHuiFuYanChiHaoMiao(
  shuRu: HuiFuYanChiShuRu,
  douDongHaoMiao?: number,
): number {
  const heBingWenBen = `${shuRu.xingGeWenBen}${shuRu.yanYuFengGeWenBen}`
  let jieGuo = huiFuYanChiJiZhunHaoMiao
  jieGuo += shuRu.ieLeiXing === 'E' ? huiFuYanChiEPianYiHaoMiao : huiFuYanChiIPianYiHaoMiao
  jieGuo += shuRu.reShenLeiXing === '快热' ? huiFuYanChiKuaiRePianYiHaoMiao : huiFuYanChiManRePianYiHaoMiao
  if (shuRu.shiFouZhaXing) {
    jieGuo += huiFuYanChiZhaXingPianYiHaoMiao
  }
  if (wenBenMingZhongCiBiao(heBingWenBen, reQingCiBiao)) {
    jieGuo += huiFuYanChiReQingCiPianYiHaoMiao
  }
  if (wenBenMingZhongCiBiao(heBingWenBen, gaoLengCiBiao)) {
    jieGuo += huiFuYanChiGaoLengCiPianYiHaoMiao
  }
  jieGuo = qianZhiHaoMiao(jieGuo)
  const douDong = douDongHaoMiao ?? Math.floor(Math.random() * (2 * huiFuYanChiDouDongFuDuHaoMiao + 1)) - huiFuYanChiDouDongFuDuHaoMiao
  return qianZhiHaoMiao(jieGuo + douDong)
}

export const 默认音色映射: Record<string, Record<性别内部形态, string>> = {
  ISTJ: { nan: 'male-qn-qingse', nv: 'female-shaonv' },
  ISFJ: { nan: 'male-qn-qingse', nv: 'female-shaonv' },
  INFJ: { nan: 'male-qn-chenqing', nv: 'female-chengshu' },
  INTJ: { nan: 'male-qn-chenqing', nv: 'female-chengshu' },
  ISTP: { nan: 'male-qn-qingse', nv: 'female-shaonv' },
  ISFP: { nan: 'male-qn-qingse', nv: 'female-loli' },
  INFP: { nan: 'male-qn-qingse', nv: 'female-loli' },
  INTP: { nan: 'male-qn-qingse', nv: 'female-shaonv' },
  ESTP: { nan: 'male-qn-chenqing', nv: 'female-chengshu' },
  ESFP: { nan: 'male-qn-chenqing', nv: 'female-chengshu' },
  ENFP: { nan: 'male-qn-chenqing', nv: 'female-chengshu' },
  ENFJ: { nan: 'male-qn-chenqing', nv: 'female-chengshu' },
  ENTJ: { nan: 'male-qn-chenqing', nv: 'female-chengshu' },
  ESTJ: { nan: 'male-qn-chenqing', nv: 'female-chengshu' },
  ESFJ: { nan: 'male-qn-chenqing', nv: 'female-chengshu' },
  ENTP: { nan: 'male-qn-chenqing', nv: 'female-chengshu' },
}

export function 获取默认音色(mbti: string, xingBie: 性别内部形态): string {
  const 映射 = 默认音色映射[mbti]
  if (映射) return 映射[xingBie]
  return xingBie === 'nv' ? 'female-shaonv' : 'male-qn-qingse'
}
