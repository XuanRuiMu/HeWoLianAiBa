export type GuanLiJiaoSe = 'chao_guan' | 'yun_ying' | 'shen_he_yuan'

export type GuanLiNengLi = 'cha_kan' | 'feng_jin' | 'feng_jin_shen_he' | 'tong_ji_xie' | 'gao_we'

export const 管理角色清单: readonly GuanLiJiaoSe[] = ['chao_guan', 'yun_ying', 'shen_he_yuan']

export const 管理能力清单: readonly GuanLiNengLi[] = ['cha_kan', 'feng_jin', 'feng_jin_shen_he', 'tong_ji_xie', 'gao_we']

/**
 * FP-18 游戏端角色能力矩阵：与 恋爱吧管理中心/管理后端/src/中间件/管理员.ts 的角色能力矩阵
 * 同口径（FP-17 按 docs/契约.md 第 8 行扩权后的五位口径）。两仓是各自独立的构建产物，
 * 无法共享源码，同源由 utils/__tests__/角色能力同源.test.ts 直读对端源文件把守：
 * 改任一仓的角色或能力清单，必须两仓同改。
 *
 * 游戏端逐位用途：
 * cha_kan  只读运营数据（用户/对话/角色详情、系统状态、用量看板、增益曲线、好感度五维明细、
 *          封禁与申诉列表、管理员监控面板与 管理员_* 事件流）
 * feng_jin 封禁写（账号解封）
 * feng_jin_shen_he 封禁申诉审核
 * tong_ji_xie 统计写侧（游戏端暂无该面，仅为与对端矩阵全等而保留）
 * gao_we   高危写与运行时面（夺舍/归还/测试账号签发与登录、授权回收、删除账号、群发通知、
 *          多模态配置热重载、服务端运行时日志流）
 */
export const 角色能力矩阵: Record<GuanLiJiaoSe, readonly GuanLiNengLi[]> = {
  chao_guan: ['cha_kan', 'feng_jin', 'feng_jin_shen_he', 'tong_ji_xie', 'gao_we'],
  yun_ying: ['cha_kan', 'feng_jin', 'tong_ji_xie'],
  shen_he_yuan: ['cha_kan', 'feng_jin_shen_he'],
}

/** 用户表三旗标 → 唯一角色；任一旗标为真即有管理身份，全伪为无角色（不含任何二值兜底） */
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
