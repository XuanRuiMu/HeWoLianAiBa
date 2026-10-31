const HUAN_JING_QIAN_ZHUI = (process.env.NODE_ENV || 'dev').trim() || 'dev'
const FU_WU_MING = 'lian-ai-ba'

export function jianMingJian(yeWu: string, ...buFen: Array<string | number>): string {
  const qingXi = buFen.map((bu) => String(bu).trim()).filter((bu) => bu !== '')
  return `${HUAN_JING_QIAN_ZHUI}:${FU_WU_MING}:${yeWu}:${qingXi.join(':')}`
}

const JIU_XIN_JIAN_YING_SHE: Record<string, (buFen: string[]) => { jiuJian: string; xinJian: string }> = {
  aiYuSuan: (buFen) => ({ jiuJian: `ai_yu_suan:${buFen.join(':')}`, xinJian: jianMingJian('ai-yu-suan', ...buFen) }),
  yanZhengMa: (buFen) => ({ jiuJian: `yan_zheng_ma:${buFen.join(':')}`, xinJian: jianMingJian('yan-zheng-ma', ...buFen) }),
  dengLuShiBai: (buFen) => ({ jiuJian: `deng_lu_shi_bai:${buFen.join(':')}`, xinJian: jianMingJian('deng-lu-shi-bai', ...buFen) }),
  shuaXinLingPai: (buFen) => ({ jiuJian: `refresh_token:${buFen.join(':')}`, xinJian: jianMingJian('refresh-token', ...buFen) }),
  jwtHeiMingDan: (buFen) => ({ jiuJian: `jwt_blacklist:${buFen.join(':')}`, xinJian: jianMingJian('jwt-hei-ming-dan', ...buFen) }),
  jwtCheXiao: (buFen) => ({ jiuJian: `jwt_yong_hu_cheXiao:${buFen.join(':')}`, xinJian: jianMingJian('jwt-che-xiao', ...buFen) }),
}

export function huoQuShuangXieJian(leiBie: keyof typeof JIU_XIN_JIAN_YING_SHE, ...buFen: string[]): { jiuJian: string; xinJian: string } {
  return JIU_XIN_JIAN_YING_SHE[leiBie](buFen)
}
