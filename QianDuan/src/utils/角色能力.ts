export type GuanLiJiaoSe = 'chao_guan' | 'yun_ying' | 'shen_he_yuan'

export type GuanLiNengLi = 'cha_kan' | 'feng_jin' | 'feng_jin_shen_he' | 'tong_ji_xie' | 'gao_we'

export const 管理角色清单: readonly GuanLiJiaoSe[] = ['chao_guan', 'yun_ying', 'shen_he_yuan']

export const 管理能力清单: readonly GuanLiNengLi[] = ['cha_kan', 'feng_jin', 'feng_jin_shen_he', 'tong_ji_xie', 'gao_we']

export function 归一管理角色(原始值: unknown): GuanLiJiaoSe | null {
  return 管理角色清单.includes(原始值 as GuanLiJiaoSe) ? (原始值 as GuanLiJiaoSe) : null
}

export function 归一管理能力列表(原始值: unknown): GuanLiNengLi[] {
  if (!Array.isArray(原始值)) return []
  return 原始值.filter((项): 项 is GuanLiNengLi => 管理能力清单.includes(项 as GuanLiNengLi))
}
