// YH-065 Redis键公约：{env}:{svc}:{biz}:{id} 双写迁移
// 根因：中英混杂无隔离，管理侧一踩就错；收敛为统一公约，新键走公约旧键双写兼容
const HUAN_JING_QIAN_ZHUI = (process.env.NODE_ENV || 'dev').trim() || 'dev'
const FU_WU_MING = 'lian-ai-ba'

export function jianMingJian(yeWu: string, ...buFen: Array<string | number>): string {
  const qingXi = buFen.map((bu) => String(bu).trim()).filter((bu) => bu !== '')
  return `${HUAN_JING_QIAN_ZHUI}:${FU_WU_MING}:${yeWu}:${qingXi.join(':')}`
}

// 旧键→公约键映射（双写迁移期）：读时双读，写时双写
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
