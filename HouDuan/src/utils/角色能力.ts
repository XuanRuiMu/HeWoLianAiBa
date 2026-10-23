export type GuanLiJiaoSe = 'chao_guan' | 'yun_ying' | 'shen_he_yuan'

export type GuanLiNengLi = 'cha_kan' | 'feng_jin' | 'feng_jin_shen_he' | 'tong_ji_xie' | 'gao_we'

export const 管理角色清单: readonly GuanLiJiaoSe[] = ['chao_guan', 'yun_ying', 'shen_he_yuan']

export const 管理能力清单: readonly GuanLiNengLi[] = ['cha_kan', 'feng_jin', 'feng_jin_shen_he', 'tong_ji_xie', 'gao_we']

export const 角色能力矩阵: Record<GuanLiJiaoSe, readonly GuanLiNengLi[]> = {
  chao_guan: ['cha_kan', 'feng_jin', 'feng_jin_shen_he', 'tong_ji_xie', 'gao_we'],
  yun_ying: ['cha_kan', 'feng_jin', 'tong_ji_xie'],
  shen_he_yuan: ['cha_kan', 'feng_jin_shen_he'],
}

export function 取管理角色(行: Record<string, unknown>): GuanLiJiaoSe | null {
  if (行['管理员'] === true) return 'chao_guan'
  if (行['运营'] === true) return 'yun_ying'
  if (行['审核员'] === true) return 'shen_he_yuan'
  return null
}

export function 取角色能力(角色: GuanLiJiaoSe | null): readonly GuanLiNengLi[] {
  if (角色 === null) return []
  return 角色能力矩阵[角色]
}

export function 角色具备能力(角色: GuanLiJiaoSe | null, 能力: GuanLiNengLi): boolean {
  return 取角色能力(角色).includes(能力)
}
