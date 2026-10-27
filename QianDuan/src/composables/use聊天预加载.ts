import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { 使用用户仓库 } from '@/stores/用户'
import { shengChengTouXiangURL } from '@/utils/头像'
import type { 消息 } from '@/types/类型定义'

const TU_PIAN_LEI_XING = new Set(['tuPian', 'biaoQingBao'])
const ZUI_DUO_YU_JIA_ZAI_TU_PIAN = 12
const DAN_ZHANG_TU_PIAN_DENG_DAI_HAO_MIAO = 3000

function shouJiTuPian(消息列表: 消息[]): string[] {
  const diZhi: string[] = []
  for (const xiaoXi of 消息列表.slice(-20)) {
    if (xiaoXi.yi_che_hui) continue
    if (TU_PIAN_LEI_XING.has(xiaoXi.lei_xing) && xiaoXi.mei_ti_url) diZhi.push(xiaoXi.mei_ti_url)
    for (const kuai of xiaoXi.nei_rong_kuai ?? []) {
      if (kuai.lei_xing === 'tupian' && kuai.mei_ti_url) diZhi.push(kuai.mei_ti_url)
    }
  }
  return [...new Set(diZhi)].slice(-ZUI_DUO_YU_JIA_ZAI_TU_PIAN)
}

async function yuJiaZaiTuPian(diZhi: string): Promise<void> {
  if (typeof Image === 'undefined') return
  const url = shengChengTouXiangURL(diZhi)
  if (!url) return
  const tu = new Image()
  tu.src = url
  try {
    await Promise.race([
      typeof tu.decode === 'function' ? tu.decode() : Promise.resolve(),
      new Promise<void>((jieShu) => setTimeout(jieShu, DAN_ZHANG_TU_PIAN_DENG_DAI_HAO_MIAO)),
    ])
  } catch {
    return
  }
}

export async function 预加载聊天页(
  huiHuaId: string,
  huiBaoJinDu?: (baiFenShu: number) => void,
): Promise<boolean> {
  if (!huiHuaId) return false
  const 聊天 = 使用聊天仓库()
  const 设置 = 使用用户设置仓库()
  const 用户 = 使用用户仓库()
  huiBaoJinDu?.(8)
  await Promise.all([
    import('@/views/聊天页面.vue'),
    (async () => {
      try {
        await 设置.jiaZai()
      } catch {
        return
      }
    })(),
  ])
  huiBaoJinDu?.(24)
  await 聊天.jiaZaiXiaoXi(huiHuaId, (jieDuan) => {
    huiBaoJinDu?.(jieDuan === 'xiaoXi' ? 62 : 80)
  })
  if (聊天.jiaZaiShiBai) return false
  huiBaoJinDu?.(86)
  const tuPian = [
    ...(聊天.jiaoSeXinXi?.tou_xiang ? [聊天.jiaoSeXinXi.tou_xiang] : []),
    ...(用户.dangQianYongHu?.tou_xiang ? [用户.dangQianYongHu.tou_xiang] : []),
    ...shouJiTuPian(聊天.xiaoXiLieBiao),
  ]
  await Promise.all(tuPian.map(yuJiaZaiTuPian))
  huiBaoJinDu?.(100)
  聊天.biaoJiYuZai(huiHuaId)
  return true
}
