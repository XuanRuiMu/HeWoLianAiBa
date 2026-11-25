export type 管理角色 = 'chao_guan' | 'yun_ying' | 'shen_he_yuan'

export type 管理能力 = 'cha_kan' | 'feng_jin' | 'feng_jin_shen_he' | 'tong_ji_xie' | 'gao_we'

export const 管理角色清单: readonly 管理角色[] = ['chao_guan', 'yun_ying', 'shen_he_yuan']

export const 管理能力清单: readonly 管理能力[] = ['cha_kan', 'feng_jin', 'feng_jin_shen_he', 'tong_ji_xie', 'gao_we']

export function 归一管理角色(原始值: unknown): 管理角色 | null {
  return 管理角色清单.includes(原始值 as 管理角色) ? (原始值 as 管理角色) : null
}

export function 归一管理能力列表(原始值: unknown): 管理能力[] {
  if (!Array.isArray(原始值)) return []
  return 原始值.filter((项): 项 is 管理能力 => 管理能力清单.includes(项 as 管理能力))
}
