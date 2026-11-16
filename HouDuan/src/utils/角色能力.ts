export type 管理角色 = 'chao_guan' | 'yun_ying' | 'shen_he_yuan'

export type 管理能力 = 'cha_kan' | 'feng_jin' | 'feng_jin_shen_he' | 'tong_ji_xie' | 'gao_we'

export const 管理角色清单: readonly 管理角色[] = ['chao_guan', 'yun_ying', 'shen_he_yuan']

export const 管理能力清单: readonly 管理能力[] = ['cha_kan', 'feng_jin', 'feng_jin_shen_he', 'tong_ji_xie', 'gao_we']

export const 角色能力矩阵: Record<管理角色, readonly 管理能力[]> = {
  chao_guan: ['cha_kan', 'feng_jin', 'feng_jin_shen_he', 'tong_ji_xie', 'gao_we'],
  yun_ying: ['cha_kan', 'feng_jin', 'tong_ji_xie'],
  shen_he_yuan: ['cha_kan', 'feng_jin_shen_he'],
}

export function 取管理角色(行: Record<string, unknown>): 管理角色 | null {
  if (行['管理员'] === true) return 'chao_guan'
  if (行['运营'] === true) return 'yun_ying'
  if (行['审核员'] === true) return 'shen_he_yuan'
  return null
}

export function 取角色能力(角色: 管理角色 | null): readonly 管理能力[] {
  if (角色 === null) return []
  return 角色能力矩阵[角色]
}

export function 角色具备能力(角色: 管理角色 | null, 能力: 管理能力): boolean {
  return 取角色能力(角色).includes(能力)
}
