export type GuanLiJiaoSe = 'chao_guan' | 'yun_ying' | 'shen_he_yuan'

/** 能力位词表与 后端 utils/角色能力.ts 的 GuanLiNengLi 逐字同集合（FP-17 五位口径），由 __tests__/角色能力同源.test.ts 把守 */
export type GuanLiNengLi = 'cha_kan' | 'feng_jin' | 'feng_jin_shen_he' | 'tong_ji_xie' | 'gao_we'

export const 管理角色清单: readonly GuanLiJiaoSe[] = ['chao_guan', 'yun_ying', 'shen_he_yuan']

export const 管理能力清单: readonly GuanLiNengLi[] = ['cha_kan', 'feng_jin', 'feng_jin_shen_he', 'tong_ji_xie', 'gao_we']

/**
 * FP-18 游戏端前端权限视图的唯一入口。
 * 授权判定在服务端（backend/src/utils/角色能力.ts 的角色能力矩阵），前端只消费服务端
 * 下发的 jiao_se / neng_li 作视图门；本文件刻意不放 角色能力矩阵，避免第二份推导真源。
 * 清单与服务端矩阵同源，由 __tests__/角色能力同源.test.ts 直读后端源文件把守。
 */
export function 归一管理角色(原始值: unknown): GuanLiJiaoSe | null {
  return 管理角色清单.includes(原始值 as GuanLiJiaoSe) ? (原始值 as GuanLiJiaoSe) : null
}

/** 能力白名单过滤：非白名单值（含服务端未下发的 undefined/非数组）一律丢弃，视图门 fail-closed */
export function 归一管理能力列表(原始值: unknown): GuanLiNengLi[] {
  if (!Array.isArray(原始值)) return []
  return 原始值.filter((项): 项 is GuanLiNengLi => 管理能力清单.includes(项 as GuanLiNengLi))
}
