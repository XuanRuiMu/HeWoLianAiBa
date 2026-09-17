import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

function huoQuHuanJingBianLiang(ming: string, moRen: string = ''): string {
  return process.env[ming] || moRen
}

function huoQuJiMi(ming: string, moRen: string = ''): string {
  const wenJianLuJing = process.env[`${ming}_FILE`]
  if (wenJianLuJing) {
    try {
      return fs.readFileSync(wenJianLuJing, 'utf8').trim() || moRen
    } catch {
      return process.env[ming] || moRen
    }
  }
  return process.env[ming] || moRen
}

function huoQuHuanJingBianLiangBiTian(ming: string): string {
  const zhi = huoQuJiMi(ming)
  if (!zhi) {
    throw new Error(`缺少必要环境变量: ${ming}`)
  }
  return zhi
}

function jieXiGuanLiYuanShouJiHao(shouJiHao: string): string[] {
  return shouJiHao
    .split(',')
    .map((hao) => hao.trim())
    .filter((hao) => hao.length > 0)
}

function jieXiZiFuChuanLieBiao(zhi: string): string[] {
  return zhi
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
}

const heFaYunXingHuanJingLieBiao = ['development', 'test', 'production']

// R3 输出侧本地违禁词兜底默认词表（可用 SHU_CHU_WEI_JIN_CI 环境变量覆盖）
const MO_REN_WEI_JIN_CI_LIE_BIAO = '强奸,轮奸,性侵,幼女,未成年人性行为,制毒,冰毒制作,自杀教程,炸弹制作'

// P1-1 输入侧本地违禁词兜底默认词表（以输出侧词表为基础扩充涉政暴恐/色情引流/诈骗类高风险词；可用 SHU_RU_WEI_JIN_CI 环境变量整体覆盖）
const MO_REN_SHU_RU_WEI_JIN_CI_LIE_BIAO = `${MO_REN_WEI_JIN_CI_LIE_BIAO},恐怖袭击,制造爆炸物,煽动分裂国家,颠覆国家政权,极端组织招募,约炮,裸聊,援交,有偿一夜情,上门特殊服务,博彩,赌球,刷单返利,转账解冻,加微信领钱`

export function huoQuQiDongHuanJingCuoWu(huanJing: string | undefined): string | null {
  if (huanJing !== undefined && huanJing !== '' && heFaYunXingHuanJingLieBiao.includes(huanJing)) {
    return null
  }
  if (huanJing === undefined || huanJing === '') {
    return '启动失败：未设置环境变量 NODE_ENV。为防止误将开发模式（固定验证码）暴露到公网，未显式配置时拒绝启动；生产部署请在部署环境中设置 NODE_ENV=production，本地开发请在 backend/.env 中设置 NODE_ENV=development'
  }
  return `启动失败：环境变量 NODE_ENV 取值 "${huanJing}" 非法，仅允许 development、test、production；请修改部署环境或 backend/.env 中的 NODE_ENV 配置后重新启动`
}

const qiDongHuanJingCuoWu = huoQuQiDongHuanJingCuoWu(process.env.NODE_ENV)
if (qiDongHuanJingCuoWu && !process.env.VITEST) {
  throw new Error(qiDongHuanJingCuoWu)
}

const shiFouShengChan = process.env.NODE_ENV === 'production'
const rawInternalToken = huoQuHuanJingBianLiang('INTERNAL_TOKEN', '')
// YH-022 内部令牌生产必填且长度≥32；缺失或过短生产拒绝启动
if (shiFouShengChan) {
  if (!rawInternalToken || rawInternalToken.trim().length < 32) {
    throw new Error('启动失败：生产环境 INTERNAL_TOKEN 必填且长度≥32字节，请在部署环境中配置强随机内部令牌')
  }
} else if (rawInternalToken && rawInternalToken.trim() !== '' && rawInternalToken.trim().length < 16) {
  // eslint-disable-next-line no-console -- 配置加载期告警:本模块被日志引擎反向依赖,引入logger有循环初始化风险
  console.warn('[配置警告] INTERNAL_TOKEN 长度不足16字节，内部调用鉴别强度偏弱')
}
// YH-022 告警通道生产必填或声明降级：缺收件人时生产拒绝启动（除非显式声明降级）
const rawGaoJingShouJianRen = huoQuHuanJingBianLiang('GAO_JING_SHOU_JIAN_REN', '')
const gaoJingShengMingJiangJi = huoQuHuanJingBianLiang('GAO_JING_SHENG_MING_JIANG_JI', 'false') === 'true'
if (shiFouShengChan && !rawGaoJingShouJianRen.trim() && !gaoJingShengMingJiangJi) {
  throw new Error('启动失败：生产环境 GAO_JING_SHOU_JIAN_REN 为空且未声明降级（GAO_JING_SHENG_MING_JIANG_JI=true），请配置收件人或显式声明降级')
}
const deepSeekApiKey = huoQuJiMi('DEEPSEEK_API_KEY')
if (shiFouShengChan) {
  if (!deepSeekApiKey || deepSeekApiKey.trim() === '' || deepSeekApiKey.includes('your-') || deepSeekApiKey.includes('placeholder')) {
    throw new Error('启动失败：生产环境缺少 DEEPSEEK_API_KEY 或为占位符，请在部署环境中配置有效的 DeepSeek API Key')
  }
} else if (!deepSeekApiKey || deepSeekApiKey.trim() === '') {
  // eslint-disable-next-line no-console -- 配置加载期告警:本模块被日志引擎反向依赖,引入logger有循环初始化风险
  console.warn('[配置警告] 开发/测试环境未设置 DEEPSEEK_API_KEY，AI 功能将不可用')
}

// 低危顺手项：JWT 密钥强制最小长度 32 字节，弱密钥拒绝启动（vitest 测试密钥除外）
const jwtMiYaoZhi = huoQuJiMi('JWT_SECRET')
if (jwtMiYaoZhi.length > 0 && jwtMiYaoZhi.length < 32 && process.env.VITEST !== 'true') {
  throw new Error(`启动失败：JWT_SECRET 长度不足（当前 ${jwtMiYaoZhi.length} 字节），至少需要 32 字节以抵抗暴力破解`)
}

// A9：媒体签名独立密钥；未显式配置时运行期从 JWT 密钥 HKDF 派生独立子钥（见 services/媒体存储.ts）
if (shiFouShengChan && !process.env.MEI_TI_QIAN_MING_MI_YAO && !process.env.MEI_TI_QIAN_MING_MI_YAO_FILE) {
  // eslint-disable-next-line no-console -- 配置加载期告警:本模块被日志引擎反向依赖,引入logger有循环初始化风险
  console.warn('[配置警告] 生产环境未设置 MEI_TI_QIAN_MING_MI_YAO，媒体签名密钥将从 JWT 密钥派生独立子钥；建议显式配置独立密钥以彻底隔离密钥面')
}

// P1-4 Redis访问控制：生产环境必须显式配置 REDIS_PASSWORD（与 redis-server --requirepass 一致）；
// 非生产环境连接串缺密码段时仅告警并继续，兼容本地无容器调试场景
const redisLianJieZhi = huoQuHuanJingBianLiang('REDIS_URL', '')
if (shiFouShengChan && !huoQuJiMi('REDIS_PASSWORD')) {
  throw new Error('启动失败：生产环境缺少 REDIS_PASSWORD，请在部署环境中配置与 redis-server --requirepass 一致的密码')
} else if (!shiFouShengChan && redisLianJieZhi && !redisLianJieZhi.includes('@')) {
  // eslint-disable-next-line no-console -- 配置加载期告警:本模块被日志引擎反向依赖,引入logger有循环初始化风险
  console.warn('[配置警告] REDIS_URL 未包含密码，Redis 处于无认证状态；请配置形如 redis://:<密码>@localhost:6379 的连接串')
}

export const peiZhi = {
  duanKou: parseInt(huoQuHuanJingBianLiang('PORT', '3000'), 10),
  huanJing: huoQuHuanJingBianLiang('NODE_ENV', 'production'),
  kaiFaMoShi: ['development', 'test'].includes(huoQuHuanJingBianLiang('NODE_ENV', '')),

  shuJuKuLianJie: huoQuHuanJingBianLiangBiTian('DATABASE_URL'),
  redisLianJie: huoQuHuanJingBianLiangBiTian('REDIS_URL'),
  // R7 连接池显式参数（默认值按中小规模部署设定，可按部署规模通过环境变量调整）
  shuJuKuLianChi: {
    zuiDa: parseInt(huoQuHuanJingBianLiang('SHU_JU_KU_LIAN_CHI_ZUI_DA', '20'), 10),
    lianJieChaoShiHaoMiao: parseInt(huoQuHuanJingBianLiang('SHU_JU_KU_LIAN_JIE_CHAO_SHI_HAO_MIAO', '10000'), 10),
    kongXianChaoShiHaoMiao: parseInt(huoQuHuanJingBianLiang('SHU_JU_KU_KONG_XIAN_CHAO_SHI_HAO_MIAO', '30000'), 10),
    yuJuChaoShiHaoMiao: parseInt(huoQuHuanJingBianLiang('SHU_JU_KU_YU_JU_CHAO_SHI_HAO_MIAO', '30000'), 10),
  },

  jwtMiYao: huoQuHuanJingBianLiangBiTian('JWT_SECRET'),
  jwtGuoQi: huoQuHuanJingBianLiang('JWT_EXPIRES_IN', '25m'),

  shuaXinLingPaiYouXiaoMiao: parseInt(huoQuHuanJingBianLiang('SHUA_XIN_LING_PAI_YOU_XIAO_MIAO', String(7 * 24 * 60 * 60)), 10),

  // A9：媒体下载签名独立密钥（空值 = 运行期从 JWT 密钥 HKDF 派生独立子钥）
  meiTiQianMingMiYao: huoQuJiMi('MEI_TI_QIAN_MING_MI_YAO'),

  // P1-3：ADMIN_PHONES 仅作为一次性初始化引导名单（需 BOOTSTRAP_ADMIN=1 触发启动种子），
  // 运行期管理员判定一律以用户表「管理员」字段为准
  get shenYongYuan() {
    return {
      yunXuLieBiao: jieXiGuanLiYuanShouJiHao(huoQuHuanJingBianLiang('ADMIN_PHONES', '')),
      zhongZiYinDaoKaiGuan: huoQuHuanJingBianLiang('BOOTSTRAP_ADMIN', '') === '1',
    }
  },

  duanXin: {
    fangWenMiYaoId: huoQuJiMi('ALIYUN_ACCESS_KEY_ID'),
    fangWenMiYaoMiMa: huoQuJiMi('ALIYUN_ACCESS_KEY_SECRET'),
    qianMing: huoQuHuanJingBianLiang('ALIYUN_SMS_SIGN_NAME', ''),
    moBanDaiMa: huoQuHuanJingBianLiang('ALIYUN_SMS_TEMPLATE_CODE', ''),
  },

xianLiu: {
      dengLu: { chuangKou: 60 * 1000, zuiDa: huoQuHuanJingBianLiang('NODE_ENV') === 'production' ? 5 : 100 },
      faSongMa: { chuangKou: 60 * 1000, zuiDa: huoQuHuanJingBianLiang('NODE_ENV') === 'production' ? 1 : 10 },
      // YH-011 注册独立严限流：IP维度防换号刷注册
      zhuCe: {
        chuangKou: parseInt(huoQuHuanJingBianLiang('ZHU_CE_XIAN_LIU_CHUANG_KOU_HAO_MIAO', '60000'), 10),
        zuiDa: parseInt(huoQuHuanJingBianLiang('ZHU_CE_XIAN_LIU_MEI_FEN_ZUI_DA', '5'), 10),
      },
      changGui: { chuangKou: 60 * 1000, zuiDa: 100 },
    liaoTian: { chuangKou: 60 * 1000, zuiDa: 30 },
    aiQingQiu: { chuangKou: 60 * 1000, zuiDa: 15 },
    guanLi: { chuangKou: 60 * 1000, zuiDa: 10 },
    // A8：前端日志上报独立严限流（匿名端点防刷量）
    riZhiJieShou: {
      chuangKou: parseInt(huoQuHuanJingBianLiang('RI_ZHI_JIE_SHOU_XIAN_LIU_CHUANG_KOU_HAO_MIAO', '60000'), 10),
      zuiDa: parseInt(huoQuHuanJingBianLiang('RI_ZHI_JIE_SHOU_XIAN_LIU_MEI_FEN_ZUI_DA', '10'), 10),
    },
    // P2-2 /检查手机 匿名端点独立严限流（IP 维度），抑制手机号注册状态枚举探测
    jianChaShouJi: {
      chuangKou: parseInt(huoQuHuanJingBianLiang('JIAN_CHA_SHOU_JI_XIAN_LIU_CHUANG_KOU_HAO_MIAO', '60000'), 10),
      zuiDa: parseInt(huoQuHuanJingBianLiang('JIAN_CHA_SHOU_JI_XIAN_LIU_MEI_FEN_ZUI_DA', '10'), 10),
    },
  },

  xieYiBanBen: huoQuHuanJingBianLiang('PROTOCOL_VERSION', 'v1.0'),

  deepSeek: {
    apiMiYao: huoQuHuanJingBianLiang('DEEPSEEK_API_KEY', ''),
    jiChuUrl: huoQuHuanJingBianLiang('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
    moXing: huoQuHuanJingBianLiang('DEEPSEEK_MODEL', 'deepseek-v4.1-flash-expires-on-0910'),
  },

  yanZhengMa: {
    changDu: 6,
    youXiaoQi: 5 * 60,
    faSongJianGe: 60,
    kaiFaMoShiGuDing: '123456',
  },

  // A7 短信费用攻击防护：每手机号/每IP 每日验证码发送上限（Redis 计数）
  duanXinRiPeiE: {
    meiShouJiHaoMeiRi: parseInt(huoQuHuanJingBianLiang('DUAN_XIN_MEI_SHOU_JI_HAO_MEI_RI', '10'), 10),
    meiIPMeiRi: parseInt(huoQuHuanJingBianLiang('DUAN_XIN_MEI_IP_MEI_RI', '30'), 10),
  },

  yongHuMing: {
    zuiXiao: 1,
    zuiDa: 30,
    // YH-021 用户名白名单：中文/字母/数字/下划线/中划线，其余一律拒绝
    baiMingDan: /^[\u4e00-\u9fa5A-Za-z0-9_-]{1,30}$/,
    teShuZiFu: /[!@#$%^&*+=[\]{}|\\:;"'?~`<>()]/,
  },

  // YH-021 密码复杂度：最少8位且含字母与数字
  miMa: {
    zuiXiaoChangDu: parseInt(huoQuHuanJingBianLiang('MI_MA_ZUI_XIAO_CHANG_DU', '8'), 10),
    biXuHanZiMuHeShuZi: huoQuHuanJingBianLiang('MI_MA_XU_ZI_MU_SHU_ZI', 'true') === 'true',
  },

  shouJiHao: {
    zhengZe: /^1[3-9]\d{9}$/,
  },

  // C5 未成年人保护：体验内测阶段按拟人化新规收紧为 18 周岁硬拦截；
  // 虚拟伴侣禁向未成年人提供，不满 14 周岁另需监护人同意（本阶段直接拦截）
  zhuCe: {
    zuiXiaoNianLing: parseInt(huoQuHuanJingBianLiang('ZHU_CE_ZUI_XIAO_NIAN_LING', '18'), 10),
  },

  weiJiGanYu: {
    guanJianCi: jieXiZiFuChuanLieBiao(
      huoQuHuanJingBianLiang(
        'WEI_JI_GUAN_JIAN_CI',
        '想死,不想活了,自杀,轻生,结束生命,割腕,跳楼,上吊,安眠药自杀,死了一了百了',
      ),
    ),
    yuanZhuReXian: huoQuHuanJingBianLiang('YUAN_ZHU_RE_XIAN', '400-161-9995,800-810-1117'),
    chaoShiTiXingMiao: parseInt(huoQuHuanJingBianLiang('WEI_JI_CHAO_SHI_TI_XING_MIAO', '300'), 10),
  },

  // 方案A体验内测：1000 人内测上限，TI_YAN_BAN_ZUI_DA_YONG_HU_SHU 可配，默认 1000
  tiYanBan: {
    zuiDaYongHuShu: parseInt(huoQuHuanJingBianLiang('TI_YAN_BAN_ZUI_DA_YONG_HU_SHU', '1000'), 10),
  },

  minGanZiDuan: {
    guanJianZi: jieXiZiFuChuanLieBiao(
      huoQuHuanJingBianLiang(
        'MIN_GAN_GUAN_JIAN_ZI',
        'password,miMa,mi_ma,yanZhengMa,yan_zheng_ma,token,lingPai,ling_pai,jwt,mi_yao,miYao,apiKey,api_key,apiMiYao,api_mi_yao',
      ),
    ),
    ziDuanMing: jieXiZiFuChuanLieBiao(
      huoQuHuanJingBianLiang(
        'MIN_GAN_ZI_DUAN_MING',
        'password,miMa,mi_ma,yanZhengMa,yan_zheng_ma,token,lingPai,ling_pai,jwt,miYao,mi_yao,apiKey,api_key,apiMiYao,api_mi_yao,fangWenMiYao,fang_wen_mi_yao,fangWenMiYaoMiMa,fang_wen_mi_yao_mi_ma,ALIYUN_ACCESS_KEY_SECRET,DEEPSEEK_API_KEY,JWT_SECRET,GUI_JI_LIU_DONG_API_MI_YAO,TU_XIANG_SHENG_CHENG_API_MI_YAO,SHI_PIN_SHENG_CHENG_API_MI_YAO,shou_ji_hao,shouJiHao,手机号,手机',
      ),
    ),
  },

  yunXuDeYuan: jieXiYunXuYuan(huoQuHuanJingBianLiang(
    'ALLOWED_ORIGINS',
    'http://localhost,http://127.0.0.1,https://localhost,https://127.0.0.1,http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080,http://localhost:8090,http://127.0.0.1:8090',
  )),

  // P2-2 可信代理网段白名单：默认仅本机回环；生产经 KE_XIN_DAI_LI_WANG_DUAN 覆盖为实际反代网段
  // （逗号分隔；IPv4 支持 a.b.c.d/n CIDR 写法，IPv6 按精确地址匹配）
  get keXinDaiLiWangDuan() {
    return jieXiZiFuChuanLieBiao(huoQuHuanJingBianLiang('KE_XIN_DAI_LI_WANG_DUAN', '127.0.0.1,::1'))
  },

  riZhiLengCunBaoLiuTian: parseInt(huoQuHuanJingBianLiang('LOG_COLD_RETENTION_DAYS', '183'), 10),
  // C6 审计日志保留天数（≥6个月，定期归档删除）
  shenJiRiZhiBaoLiuTian: parseInt(huoQuHuanJingBianLiang('SHEN_JI_RI_ZHI_BAO_LIU_TIAN', '185'), 10),
  riZhiGunDongWenJianShu: parseInt(huoQuHuanJingBianLiang('LOG_ROLLING_FILE_COUNT', '30'), 10),
  riZhiGunDongWenJianDaXiao: huoQuHuanJingBianLiang('LOG_ROLLING_FILE_SIZE', '500m'),

  // R3 输出侧本地违禁词兜底词表（Writer 输出命中即拦截本轮回复）
  shuChuWeiJinCiLieBiao: jieXiZiFuChuanLieBiao(
    huoQuHuanJingBianLiang('SHU_CHU_WEI_JIN_CI', MO_REN_WEI_JIN_CI_LIE_BIAO),
  ),

  // P1-1 输入侧本地违禁词兜底词表（AI 审核不可用降级时对用户消息做本地扫描）
  shuRuWeiJinCiLieBiao: jieXiZiFuChuanLieBiao(
    huoQuHuanJingBianLiang('SHU_RU_WEI_JIN_CI', MO_REN_SHU_RU_WEI_JIN_CI_LIE_BIAO),
  ),

  // M3 每用户每日 AI 请求预算（超过后当日拒绝触发 LLM 调用）；P1-5 上调至 600（一局40轮实际消耗160~250次）
  meiRiAIQingQiuYuSuan: parseInt(huoQuHuanJingBianLiang('MEI_RI_AI_QING_QIU_YU_SUAN', '600'), 10),

  // A12 告警通道（SMTP 邮件；未配置时降级为仅告警日志）
  gaoJing: {
    smtpZhuJi: huoQuHuanJingBianLiang('SMTP_ZHU_JI', ''),
    smtpDuanKou: parseInt(huoQuHuanJingBianLiang('SMTP_DUAN_KOU', '465'), 10),
    smtpYongHuMing: huoQuHuanJingBianLiang('SMTP_YONG_HU_MING', ''),
    smtpMiMa: huoQuHuanJingBianLiang('SMTP_MI_MA', ''),
    faJianRen: huoQuHuanJingBianLiang('GAO_JING_FA_JIAN_REN', ''),
    shouJianRenLieBiao: jieXiZiFuChuanLieBiao(huoQuHuanJingBianLiang('GAO_JING_SHOU_JIAN_REN', '')),
  },

  // A12 连续 AI 失败告警阈值
  aiLianXuShiBaiGaoJingYuZhi: parseInt(huoQuHuanJingBianLiang('AI_LIAN_XU_SHI_BAI_GAO_JING_YU_ZHI', '5'), 10),

  // M4 首屏背景模型懒加载开关（首屏渲染完成后再挂载背景页）
  beiJingYanChiJiaZaiHaoMiao: parseInt(huoQuHuanJingBianLiang('BEI_JING_YAN_CHI_JIA_ZAI_HAO_MIAO', '2500'), 10),

  // TTS 语音合成配置
  ttsEnabled: huoQuHuanJingBianLiang('TTS_ENABLED', 'true') === 'true',
  ttsServiceUrl: huoQuHuanJingBianLiang('TTS_SERVICE_URL', 'http://localhost:8001'),
  internalToken: rawInternalToken,

  // YH-015 服务端拉取 SSRF 收敛：https+域名白名单+内网拒绝+大小超时上限
  yuanChengLaQu: {
    yunXuXieYi: ['https:'],
    yuMingBaiMingDan: jieXiZiFuChuanLieBiao(huoQuHuanJingBianLiang('YUAN_CHENG_LA_QU_YU_MING_BAI_MING_DAN', '')),
    zuiDaZiJie: parseInt(huoQuHuanJingBianLiang('YUAN_CHENG_LA_QU_ZUI_DA_ZI_JIE', String(20 * 1024 * 1024)), 10),
    chaoShiHaoMiao: parseInt(huoQuHuanJingBianLiang('YUAN_CHENG_LA_QU_CHAO_SHI_HAO_MIAO', '30000'), 10),
  },

  // YH-148 超时分级+keepalive：长连接与API两套时钟收敛，环境变量可配
  chaoShi: {
    apiHaoMiao: parseInt(huoQuHuanJingBianLiang('CHAO_SHI_API_HAO_MIAO', '30000'), 10),
    changLianJieHaoMiao: parseInt(huoQuHuanJingBianLiang('CHAO_SHI_CHANG_LIAN_JIE_HAO_MIAO', '600000'), 10),
    keepAliveHaoMiao: parseInt(huoQuHuanJingBianLiang('KEEP_ALIVE_HAO_MIAO', '65000'), 10),
  },

  // YH-011 行为验证码（发码配额联动）：同一手机号/IP失败N次后必须携带行为验证通过凭证
  xingWeiYanZheng: {
    shiBaiYuZhi: parseInt(huoQuHuanJingBianLiang('XING_WEI_YAN_ZHENG_SHI_BAI_YU_ZHI', '3'), 10),
    youXiaoMiao: parseInt(huoQuHuanJingBianLiang('XING_WEI_YAN_ZHENG_YOU_XIAO_MIAO', '600'), 10),
  },

  bingDuSaoMiao: {
    qiYong: huoQuHuanJingBianLiang('BING_DU_SAO_MIAO_QI_YONG', 'false') === 'true',
    fuWuUrl: huoQuHuanJingBianLiang('BING_DU_SAO_MIAO_FU_WU_URL', ''),
    chaoShiHaoMiao: parseInt(huoQuHuanJingBianLiang('BING_DU_SAO_MIAO_CHAO_SHI_HAO_MIAO', '15000'), 10),
  },

  // YH-020 生产默认开查毒：BING_DU_SAO_MIAO_QI_YONG 未显式配置时生产默认 true
  get bingDuSaoMiaoShengChanMoRen(): boolean {
    const yuanShi = (process.env['BING_DU_SAO_MIAO_QI_YONG'] || '').trim()
    if (yuanShi !== '') return yuanShi === 'true'
    return process.env['NODE_ENV'] === 'production'
  },
}

function jieXiYunXuYuan(yuan: string): string[] {
  return yuan
    .split(',')
    .map((y) => y.trim())
    .filter((y) => y.length > 0)
}
