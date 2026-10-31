import './env'
import fs from 'fs'

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

const MO_REN_WEI_JIN_CI_LIE_BIAO = '强奸,轮奸,性侵,幼女,未成年人性行为,制毒,冰毒制作,自杀教程,炸弹制作'

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
if (qiDongHuanJingCuoWu) {
  throw new Error(qiDongHuanJingCuoWu)
}

const shiFouShengChan = process.env.NODE_ENV === 'production'
const rawInternalToken = huoQuHuanJingBianLiang('INTERNAL_TOKEN', '')
if (shiFouShengChan) {
  if (!rawInternalToken || rawInternalToken.trim().length < 32) {
    throw new Error('启动失败：生产环境 INTERNAL_TOKEN 必填且长度≥32字节，请在部署环境中配置强随机内部令牌')
  }
} else if (rawInternalToken && rawInternalToken.trim() !== '' && rawInternalToken.trim().length < 16) {
  console.warn('[配置警告] INTERNAL_TOKEN 长度不足16字节，内部调用鉴别强度偏弱')
}
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
  console.warn('[配置警告] 开发/测试环境未设置 DEEPSEEK_API_KEY，AI 功能将不可用')
}

const jwtMiYaoZhi = huoQuJiMi('JWT_SECRET')
if (jwtMiYaoZhi.length > 0 && jwtMiYaoZhi.length < 32) {
  throw new Error(`启动失败：JWT_SECRET 长度不足（当前 ${jwtMiYaoZhi.length} 字节），至少需要 32 字节以抵抗暴力破解`)
}

if (shiFouShengChan && !process.env.MEI_TI_QIAN_MING_MI_YAO && !process.env.MEI_TI_QIAN_MING_MI_YAO_FILE) {
  console.warn('[配置警告] 生产环境未设置 MEI_TI_QIAN_MING_MI_YAO，媒体签名密钥将从 JWT 密钥派生独立子钥；建议显式配置独立密钥以彻底隔离密钥面')
}

const redisLianJieZhi = huoQuHuanJingBianLiang('REDIS_URL', '')
if (shiFouShengChan && !huoQuJiMi('REDIS_PASSWORD')) {
  throw new Error('启动失败：生产环境缺少 REDIS_PASSWORD，请在部署环境中配置与 redis-server --requirepass 一致的密码')
} else if (!shiFouShengChan && redisLianJieZhi && !redisLianJieZhi.includes('@')) {
  console.warn('[配置警告] REDIS_URL 未包含密码，Redis 处于无认证状态；请配置形如 redis://:<密码>@localhost:6379 的连接串')
}

export const peiZhi = {
  duanKou: parseInt(huoQuHuanJingBianLiang('PORT', '3000'), 10),
  huanJing: huoQuHuanJingBianLiang('NODE_ENV', 'production'),
  kaiFaMoShi: ['development', 'test'].includes(huoQuHuanJingBianLiang('NODE_ENV', '')),

  shuJuKuLianJie: huoQuHuanJingBianLiangBiTian('DATABASE_URL'),
  redisLianJie: huoQuHuanJingBianLiangBiTian('REDIS_URL'),
  shuJuKuLianChi: {
    zuiDa: parseInt(huoQuHuanJingBianLiang('SHU_JU_KU_LIAN_CHI_ZUI_DA', '20'), 10),
    lianJieChaoShiHaoMiao: parseInt(huoQuHuanJingBianLiang('SHU_JU_KU_LIAN_JIE_CHAO_SHI_HAO_MIAO', '10000'), 10),
    kongXianChaoShiHaoMiao: parseInt(huoQuHuanJingBianLiang('SHU_JU_KU_KONG_XIAN_CHAO_SHI_HAO_MIAO', '30000'), 10),
    yuJuChaoShiHaoMiao: parseInt(huoQuHuanJingBianLiang('SHU_JU_KU_YU_JU_CHAO_SHI_HAO_MIAO', '30000'), 10),
  },

  jwtMiYao: huoQuHuanJingBianLiangBiTian('JWT_SECRET'),
  jwtGuoQi: huoQuHuanJingBianLiang('JWT_EXPIRES_IN', '25m'),

  shuaXinLingPaiYouXiaoMiao: parseInt(huoQuHuanJingBianLiang('SHUA_XIN_LING_PAI_YOU_XIAO_MIAO', String(7 * 24 * 60 * 60)), 10),

  meiTiQianMingMiYao: huoQuJiMi('MEI_TI_QIAN_MING_MI_YAO'),

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
    gongYingShang: huoQuHuanJingBianLiang('ALIYUN_SMS_PROVIDER', 'dysms'),
  },

xianLiu: {
      dengLu: { chuangKou: 60 * 1000, zuiDa: huoQuHuanJingBianLiang('NODE_ENV') === 'production' ? 5 : 100 },
      faSongMa: { chuangKou: 60 * 1000, zuiDa: huoQuHuanJingBianLiang('NODE_ENV') === 'production' ? 1 : 10 },
      zhuCe: {
        chuangKou: parseInt(huoQuHuanJingBianLiang('ZHU_CE_XIAN_LIU_CHUANG_KOU_HAO_MIAO', '60000'), 10),
        zuiDa: parseInt(huoQuHuanJingBianLiang('ZHU_CE_XIAN_LIU_MEI_FEN_ZUI_DA', '5'), 10),
      },
      chongZhiMiMa: {
        chuangKou: parseInt(huoQuHuanJingBianLiang('CHONG_ZHI_MI_MA_XIAN_LIU_CHUANG_KOU_HAO_MIAO', '600000'), 10),
        zuiDa: parseInt(huoQuHuanJingBianLiang('CHONG_ZHI_MI_MA_XIAN_LIU_MEI_FEN_ZUI_DA', '5'), 10),
      },
      changGui: { chuangKou: 60 * 1000, zuiDa: 100 },
    liaoTian: { chuangKou: 60 * 1000, zuiDa: 30 },
    aiQingQiu: { chuangKou: 60 * 1000, zuiDa: 15 },
    guanLi: { chuangKou: 60 * 1000, zuiDa: 10 },
    riZhiJieShou: {
      chuangKou: parseInt(huoQuHuanJingBianLiang('RI_ZHI_JIE_SHOU_XIAN_LIU_CHUANG_KOU_HAO_MIAO', '60000'), 10),
      zuiDa: parseInt(huoQuHuanJingBianLiang('RI_ZHI_JIE_SHOU_XIAN_LIU_MEI_FEN_ZUI_DA', '10'), 10),
    },
    jianChaShouJi: {
      chuangKou: parseInt(huoQuHuanJingBianLiang('JIAN_CHA_SHOU_JI_XIAN_LIU_CHUANG_KOU_HAO_MIAO', '60000'), 10),
      zuiDa: parseInt(huoQuHuanJingBianLiang('JIAN_CHA_SHOU_JI_XIAN_LIU_MEI_FEN_ZUI_DA', '10'), 10),
    },
    renJiTiaoZhan: {
      chuangKou: parseInt(huoQuHuanJingBianLiang('REN_JI_TIAO_ZHAN_XIAN_LIU_CHUANG_KOU_HAO_MIAO', '60000'), 10),
      zuiDa: parseInt(huoQuHuanJingBianLiang('REN_JI_TIAO_ZHAN_XIAN_LIU_MEI_FEN_ZUI_DA', '20'), 10),
    },
  },

  xieYiBanBen: huoQuHuanJingBianLiang('PROTOCOL_VERSION', 'v1.0'),

  deepSeek: {
    apiMiYao: huoQuHuanJingBianLiang('DEEPSEEK_API_KEY', ''),
    jiChuUrl: huoQuHuanJingBianLiang('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
    moXing: huoQuHuanJingBianLiang('DEEPSEEK_MODEL', 'deepseek-flash'),
  },

  yanZhengMa: {
    changDu: 6,
    youXiaoQi: 5 * 60,
    faSongJianGe: 60,
    kaiFaMoShiGuDing: '123456',
  },

  duanXinRiPeiE: {
    meiShouJiHaoMeiRi: parseInt(huoQuHuanJingBianLiang('DUAN_XIN_MEI_SHOU_JI_HAO_MEI_RI', '10'), 10),
    meiIPMeiRi: parseInt(huoQuHuanJingBianLiang('DUAN_XIN_MEI_IP_MEI_RI', '30'), 10),
  },

  renJiYanZheng: {
    youXiaoMiao: parseInt(huoQuHuanJingBianLiang('REN_JI_YAN_ZHENG_YOU_XIAO_MIAO', '120'), 10),
    zuiDaChangShi: parseInt(huoQuHuanJingBianLiang('REN_JI_YAN_ZHENG_ZUI_DA_CHANG_SHI', '5'), 10),
  },

  yongHuMing: {
    zuiXiao: 1,
    zuiDa: 30,
    baiMingDan: /^[\u4e00-\u9fa5A-Za-z0-9_-]{1,30}$/,
    teShuZiFu: /[!@#$%^&*+=[\]{}|\\:;"'?~`<>()]/,
  },

  miMa: {
    zuiXiaoChangDu: parseInt(huoQuHuanJingBianLiang('MI_MA_ZUI_XIAO_CHANG_DU', '8'), 10),
    biXuHanZiMuHeShuZi: huoQuHuanJingBianLiang('MI_MA_XU_ZI_MU_SHU_ZI', 'true') === 'true',
  },

  shouJiHao: {
    zhengZe: /^\+\d{4,16}$/,
  },

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

  get keXinDaiLiWangDuan() {
    return jieXiZiFuChuanLieBiao(huoQuHuanJingBianLiang('KE_XIN_DAI_LI_WANG_DUAN', '127.0.0.1,::1'))
  },

  riZhiLengCunBaoLiuTian: parseInt(huoQuHuanJingBianLiang('LOG_COLD_RETENTION_DAYS', '183'), 10),
  shenJiRiZhiBaoLiuTian: parseInt(huoQuHuanJingBianLiang('SHEN_JI_RI_ZHI_BAO_LIU_TIAN', '185'), 10),
  riZhiGunDongWenJianShu: parseInt(huoQuHuanJingBianLiang('LOG_ROLLING_FILE_COUNT', '30'), 10),
  riZhiGunDongWenJianDaXiao: huoQuHuanJingBianLiang('LOG_ROLLING_FILE_SIZE', '500m'),

  shuChuWeiJinCiLieBiao: jieXiZiFuChuanLieBiao(
    huoQuHuanJingBianLiang('SHU_CHU_WEI_JIN_CI', MO_REN_WEI_JIN_CI_LIE_BIAO),
  ),

  shuRuWeiJinCiLieBiao: jieXiZiFuChuanLieBiao(
    huoQuHuanJingBianLiang('SHU_RU_WEI_JIN_CI', MO_REN_SHU_RU_WEI_JIN_CI_LIE_BIAO),
  ),

  meiRiAIQingQiuYuSuan: parseInt(huoQuHuanJingBianLiang('MEI_RI_AI_QING_QIU_YU_SUAN', '600'), 10),

  gaoJing: {
    smtpZhuJi: huoQuHuanJingBianLiang('SMTP_ZHU_JI', ''),
    smtpDuanKou: parseInt(huoQuHuanJingBianLiang('SMTP_DUAN_KOU', '465'), 10),
    smtpYongHuMing: huoQuHuanJingBianLiang('SMTP_YONG_HU_MING', ''),
    smtpMiMa: huoQuHuanJingBianLiang('SMTP_MI_MA', ''),
    faJianRen: huoQuHuanJingBianLiang('GAO_JING_FA_JIAN_REN', ''),
    shouJianRenLieBiao: jieXiZiFuChuanLieBiao(huoQuHuanJingBianLiang('GAO_JING_SHOU_JIAN_REN', '')),
  },

  aiLianXuShiBaiGaoJingYuZhi: parseInt(huoQuHuanJingBianLiang('AI_LIAN_XU_SHI_BAI_GAO_JING_YU_ZHI', '5'), 10),

  beiJingYanChiJiaZaiHaoMiao: parseInt(huoQuHuanJingBianLiang('BEI_JING_YAN_CHI_JIA_ZAI_HAO_MIAO', '2500'), 10),

  ttsEnabled: huoQuHuanJingBianLiang('TTS_ENABLED', 'true') === 'true',
  ttsServiceUrl: huoQuHuanJingBianLiang('TTS_SERVICE_URL', 'http://localhost:8001'),
  internalToken: rawInternalToken,

  yuanChengLaQu: {
    yunXuXieYi: ['https:'],
    yuMingBaiMingDan: jieXiZiFuChuanLieBiao(huoQuHuanJingBianLiang('YUAN_CHENG_LA_QU_YU_MING_BAI_MING_DAN', '')),
    zuiDaZiJie: parseInt(huoQuHuanJingBianLiang('YUAN_CHENG_LA_QU_ZUI_DA_ZI_JIE', String(20 * 1024 * 1024)), 10),
    chaoShiHaoMiao: parseInt(huoQuHuanJingBianLiang('YUAN_CHENG_LA_QU_CHAO_SHI_HAO_MIAO', '30000'), 10),
  },

  chaoShi: {
    apiHaoMiao: parseInt(huoQuHuanJingBianLiang('CHAO_SHI_API_HAO_MIAO', '30000'), 10),
    changLianJieHaoMiao: parseInt(huoQuHuanJingBianLiang('CHAO_SHI_CHANG_LIAN_JIE_HAO_MIAO', '600000'), 10),
    keepAliveHaoMiao: parseInt(huoQuHuanJingBianLiang('KEEP_ALIVE_HAO_MIAO', '65000'), 10),
  },

  xingWeiYanZheng: {
    shiBaiYuZhi: parseInt(huoQuHuanJingBianLiang('XING_WEI_YAN_ZHENG_SHI_BAI_YU_ZHI', '3'), 10),
    youXiaoMiao: parseInt(huoQuHuanJingBianLiang('XING_WEI_YAN_ZHENG_YOU_XIAO_MIAO', '600'), 10),
  },

  bingDuSaoMiao: {
    qiYong: huoQuHuanJingBianLiang('BING_DU_SAO_MIAO_QI_YONG', 'false') === 'true',
    fuWuUrl: huoQuHuanJingBianLiang('BING_DU_SAO_MIAO_FU_WU_URL', ''),
    chaoShiHaoMiao: parseInt(huoQuHuanJingBianLiang('BING_DU_SAO_MIAO_CHAO_SHI_HAO_MIAO', '15000'), 10),
  },

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
