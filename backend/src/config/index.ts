import dotenv from 'dotenv'

dotenv.config()

function huoQuHuanJingBianLiang(ming: string, moRen: string = ''): string {
  return process.env[ming] || moRen
}

function huoQuHuanJingBianLiangBiTian(ming: string): string {
  const zhi = process.env[ming]
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
const deepSeekApiKey = process.env.DEEPSEEK_API_KEY
if (shiFouShengChan) {
  if (!deepSeekApiKey || deepSeekApiKey.trim() === '' || deepSeekApiKey.includes('your-') || deepSeekApiKey.includes('placeholder')) {
    throw new Error('启动失败：生产环境缺少 DEEPSEEK_API_KEY 或为占位符，请在部署环境中配置有效的 DeepSeek API Key')
  }
} else if (!deepSeekApiKey || deepSeekApiKey.trim() === '') {
  // eslint-disable-next-line no-console -- 配置加载期告警:本模块被日志引擎反向依赖,引入logger有循环初始化风险
  console.warn('[配置警告] 开发/测试环境未设置 DEEPSEEK_API_KEY，AI 功能将不可用')
}

// 低危顺手项：JWT 密钥强制最小长度 32 字节，弱密钥拒绝启动（vitest 测试密钥除外）
const jwtMiYaoZhi = process.env.JWT_SECRET || ''
if (jwtMiYaoZhi.length > 0 && jwtMiYaoZhi.length < 32 && process.env.VITEST !== 'true') {
  throw new Error(`启动失败：JWT_SECRET 长度不足（当前 ${jwtMiYaoZhi.length} 字节），至少需要 32 字节以抵抗暴力破解`)
}

// A9：媒体签名独立密钥；未显式配置时运行期从 JWT 密钥 HKDF 派生独立子钥（见 services/媒体存储.ts）
if (shiFouShengChan && !process.env.MEI_TI_QIAN_MING_MI_YAO) {
  // eslint-disable-next-line no-console -- 配置加载期告警:本模块被日志引擎反向依赖,引入logger有循环初始化风险
  console.warn('[配置警告] 生产环境未设置 MEI_TI_QIAN_MING_MI_YAO，媒体签名密钥将从 JWT 密钥派生独立子钥；建议显式配置独立密钥以彻底隔离密钥面')
}

// P1-4 Redis访问控制：生产环境必须显式配置 REDIS_PASSWORD（与 redis-server --requirepass 一致）；
// 非生产环境连接串缺密码段时仅告警并继续，兼容本地无容器调试场景
const redisLianJieZhi = huoQuHuanJingBianLiang('REDIS_URL', '')
if (shiFouShengChan && !huoQuHuanJingBianLiang('REDIS_PASSWORD', '')) {
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
  jwtGuoQi: huoQuHuanJingBianLiang('JWT_EXPIRES_IN', '7d'),

  // A9：媒体下载签名独立密钥（空值 = 运行期从 JWT 密钥 HKDF 派生独立子钥）
  meiTiQianMingMiYao: huoQuHuanJingBianLiang('MEI_TI_QIAN_MING_MI_YAO', ''),

  // P1-3：ADMIN_PHONES 仅作为一次性初始化引导名单（需 BOOTSTRAP_ADMIN=1 触发启动种子），
  // 运行期管理员判定一律以用户表「管理员」字段为准
  get shenYongYuan() {
    return {
      yunXuLieBiao: jieXiGuanLiYuanShouJiHao(huoQuHuanJingBianLiang('ADMIN_PHONES', '')),
      zhongZiYinDaoKaiGuan: huoQuHuanJingBianLiang('BOOTSTRAP_ADMIN', '') === '1',
    }
  },

  duanXin: {
    fangWenMiYaoId: huoQuHuanJingBianLiang('ALIYUN_ACCESS_KEY_ID', ''),
    fangWenMiYaoMiMa: huoQuHuanJingBianLiang('ALIYUN_ACCESS_KEY_SECRET', ''),
    qianMing: huoQuHuanJingBianLiang('ALIYUN_SMS_SIGN_NAME', ''),
    moBanDaiMa: huoQuHuanJingBianLiang('ALIYUN_SMS_TEMPLATE_CODE', ''),
  },

xianLiu: {
      dengLu: { chuangKou: 60 * 1000, zuiDa: huoQuHuanJingBianLiang('NODE_ENV') === 'production' ? 5 : 100 },
      faSongMa: { chuangKou: 60 * 1000, zuiDa: huoQuHuanJingBianLiang('NODE_ENV') === 'production' ? 1 : 10 },
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
    teShuZiFu: /[!@#$%^&*+=[\]{}|\\:;"'?~`]/,
  },

  shouJiHao: {
    zhengZe: /^1[3-9]\d{9}$/,
  },

  // C5 未成年人保护：注册强制采集出生日期，不满最低年龄硬拦截（法规要求 16 周岁）
  zhuCe: {
    zuiXiaoNianLing: parseInt(huoQuHuanJingBianLiang('ZHU_CE_ZUI_XIAO_NIAN_LING', '16'), 10),
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
  internalToken: huoQuHuanJingBianLiang('INTERNAL_TOKEN', ''),
}

function jieXiYunXuYuan(yuan: string): string[] {
  return yuan
    .split(',')
    .map((y) => y.trim())
    .filter((y) => y.length > 0)
}
