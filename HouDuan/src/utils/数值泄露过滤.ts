const SHU_ZHI_XIE_LU_RE =
  /(信任度|亲密度|趣味度|关怀度|信任|亲密|趣味|关怀|总好感|好感度|总分|分值|阶段值|阶段名)[^\d。！？\n]{0,8}\d+(?:\.\d+)?\s*(?:分|点)?/g

export function xiaoChuShuZhiXieLu(wenBen: string): string {
  if (!wenBen) return ''
  return wenBen.replace(SHU_ZHI_XIE_LU_RE, '').replace(/[ \t]{2,}/g, ' ').trim()
}
