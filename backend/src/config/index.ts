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

export const peiZhi = {
  duanKou: parseInt(huoQuHuanJingBianLiang('PORT', '3000'), 10),
  huanJing: huoQuHuanJingBianLiang('NODE_ENV', 'development'),
  kaiFaMoShi: ['development', 'test'].includes(huoQuHuanJingBianLiang('NODE_ENV', 'development')),

  shuJuKuLianJie: huoQuHuanJingBianLiangBiTian('DATABASE_URL'),
  redisLianJie: huoQuHuanJingBianLiangBiTian('REDIS_URL'),

  jwtMiYao: huoQuHuanJingBianLiangBiTian('JWT_SECRET'),
  jwtGuoQi: huoQuHuanJingBianLiang('JWT_EXPIRES_IN', '7d'),

  get shenYongYuan() {
    return {
      yunXuLieBiao: jieXiGuanLiYuanShouJiHao(huoQuHuanJingBianLiang('ADMIN_PHONES', '')),
    }
  },

  duanXin: {
    fangWenMiYaoId: huoQuHuanJingBianLiang('ALIYUN_ACCESS_KEY_ID', ''),
    fangWenMiYaoMiMa: huoQuHuanJingBianLiang('ALIYUN_ACCESS_KEY_SECRET', ''),
    qianMing: huoQuHuanJingBianLiang('ALIYUN_SMS_SIGN_NAME', ''),
    moBanDaiMa: huoQuHuanJingBianLiang('ALIYUN_SMS_TEMPLATE_CODE', ''),
  },

  xianLiu: {
    dengLu: { chuangKou: 60 * 1000, zuiDa: 5 },
    faSongMa: { chuangKou: 60 * 1000, zuiDa: 1 },
    changGui: { chuangKou: 60 * 1000, zuiDa: 100 },
    liaoTian: { chuangKou: 60 * 1000, zuiDa: 30 },
    aiQingQiu: { chuangKou: 60 * 1000, zuiDa: 15 },
    guanLi: { chuangKou: 60 * 1000, zuiDa: 10 },
  },

  deepSeek: {
    apiMiYao: huoQuHuanJingBianLiang('DEEPSEEK_API_KEY', ''),
    jiChuUrl: huoQuHuanJingBianLiang('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
    moXing: huoQuHuanJingBianLiang('DEEPSEEK_MODEL', 'deepseek-v4-flash-vision-exp'),
  },

  yanZhengMa: {
    changDu: 6,
    youXiaoQi: 5 * 60,
    faSongJianGe: 60,
    kaiFaMoShiGuDing: '123456',
  },

  yongHuMing: {
    zuiXiao: 1,
    zuiDa: 30,
    teShuZiFu: /[!@#$%^&*+=[\]{}|\\:;"'?~`]/,
  },

  shouJiHao: {
    zhengZe: /^1[3-9]\d{9}$/,
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
        'password,miMa,mi_ma,yanZhengMa,yan_zheng_ma,token,lingPai,ling_pai,jwt,miYao,mi_yao,apiKey,api_key,apiMiYao,api_mi_yao,fangWenMiYao,fang_wen_mi_yao,fangWenMiYaoMiMa,fang_wen_mi_yao_mi_ma,ALIYUN_ACCESS_KEY_SECRET,DEEPSEEK_API_KEY,JWT_SECRET',
      ),
    ),
  },

  yunXuDeYuan: jieXiYunXuYuan(huoQuHuanJingBianLiang(
    'ALLOWED_ORIGINS',
    'http://localhost,http://127.0.0.1,http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080,http://localhost:8090,http://127.0.0.1:8090',
  )),
}

function jieXiYunXuYuan(yuan: string): string[] {
  return yuan
    .split(',')
    .map((y) => y.trim())
    .filter((y) => y.length > 0)
}
