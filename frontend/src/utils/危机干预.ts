export function jianCeWeiJiXinHao(wenBen: string): boolean {
  if (typeof wenBen !== 'string' || !wenBen.trim()) return false
  const guanJianCi = ['想死', '不想活了', '自杀', '轻生', '结束生命', '割腕', '跳楼']
  return guanJianCi.some((ci) => wenBen.includes(ci))
}
