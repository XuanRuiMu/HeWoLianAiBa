
const GUO_WAI_SHI_CHA: Record<string, number> = {
  '纽约': -5, '洛杉矶': -8, '旧金山': -8, '西雅图': -8, '波士顿': -5,
  '芝加哥': -6, '多伦多': -5, '温哥华': -8, '休斯顿': -6, '迈阿密': -5,
  '西雅图/纽约': -5,
  '东京': 9, '首尔': 9, '香港': 8, '澳门': 8,
  '伦敦': 0, '巴黎': 1, '柏林': 1, '罗马': 1, '莫斯科': 3, '悉尼': 10, '墨尔本': 10,
  '新加坡': 8, '曼谷': 7, '迪拜': 4,
}

const JING_NEI_CHENG_SHI = new Set([
  '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安',
  '南京', '重庆', '天津', '苏州', '长沙', '青岛', '厦门',
])

export function duShiChaXiaShi(chengShi: string): number {
  const quanQiu = duPeiZhiShiCha()
  if (quanQiu !== 0) return quanQiu
  const zheng = (chengShi || '').trim()
  if (!zheng) return 0
  if (JING_NEI_CHENG_SHI.has(zheng)) return 0
  for (const [cheng, cha] of Object.entries(GUO_WAI_SHI_CHA)) {
    if (zheng.includes(cheng)) return cha
  }
  return 0
}

export function duPeiZhiShiCha(): number {
  const yuan = Number((process.env.XING_SHI_CHA || '').trim())
  if (Number.isFinite(yuan) && yuan >= -12 && yuan <= 14) return yuan
  return 0
}
