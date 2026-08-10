import { defineStore } from 'pinia'
import { ref } from 'vue'
import { huoQuJunShiZhiDaoZhuangTai } from '@/api/聊天'
import type { JunShiZhiDaoZhuangTaiXinXi } from '@/types'

// 角色 ID（UUID v4）格式白名单，防止非法会话污染跨导航持久状态（P0 输入验证）
const JIAO_SE_ID_ZHENG_ZE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

export function shiYouXiaoJiaoSeId(id: string): boolean {
  return typeof id === 'string' && JIAO_SE_ID_ZHENG_ZE.test(id)
}

export const 使用军师仓库 = defineStore('军师', () => {
  // 跨导航唯一事实源：当前会话的军师「指导中」状态。
  // 组件卸载（路由切换 / 面板 v-if 关闭）不再清空，离开再回来颜色恒与后端真值一致。
  const jiaoSeId = ref<string | null>(null)
  const zhuangTai = ref<JunShiZhiDaoZhuangTaiXinXi | null>(null)
  const keZaiCiZhiDao = ref(true)
  const youLiaoTianJiLu = ref(true)

  // 仅当 store 持有的会话与当前组件会话一致时，派生函数才采用本 store 状态，
  // 避免会话切换竞态窗口下误用旧会话状态。
  function shiDangQianHuiHua(会话ID: string): boolean {
    return jiaoSeId.value === 会话ID
  }

  // 由后端持久真值 seed（而非组件本地易失 ref 猜测）。
  async function chuShiHuaZhuangTai(会话ID: string): Promise<void> {
    if (!shiYouXiaoJiaoSeId(会话ID)) return
    jiaoSeId.value = 会话ID
    try {
      const {
        zhuangTai: zt,
        keZaiCiZhiDao: kz,
        youLiaoTianJiLu: ylt,
      } = await huoQuJunShiZhiDaoZhuangTai(会话ID)
      // 仅在会话未被切换的前提下写入，避免异步竞态覆盖
      if (jiaoSeId.value !== 会话ID) return
      zhuangTai.value = zt
      keZaiCiZhiDao.value = kz
      if (ylt !== undefined) youLiaoTianJiLu.value = ylt
    } catch {
      // 拉取失败保留既有状态，不打断交互
    }
  }

  function gengXinZhuangTai(
    zt: JunShiZhiDaoZhuangTaiXinXi | null,
    kz: boolean,
    ylt?: boolean,
  ): void {
    zhuangTai.value = zt
    keZaiCiZhiDao.value = kz
    if (ylt !== undefined) youLiaoTianJiLu.value = ylt
  }

  function gengXinKeZaiCiZhiDao(kz: boolean): void {
    keZaiCiZhiDao.value = kz
  }

  function sheZhiZhiDaoZhong(会话ID: string, junShiId: string): void {
    if (!shiYouXiaoJiaoSeId(会话ID)) return
    jiaoSeId.value = 会话ID
    zhuangTai.value = {
      zhuang_tai: 'zhi_dao_zhong',
      jun_shi_id: junShiId,
      kai_shi_shi_jian: new Date().toISOString(),
      youLiaoTianJiLu: true,
    }
  }

  function sheZhiYiWanCheng(
    会话ID: string,
    junShiId: string,
    jieGuo: JunShiZhiDaoZhuangTaiXinXi['jie_guo'],
  ): void {
    if (!shiYouXiaoJiaoSeId(会话ID)) return
    jiaoSeId.value = 会话ID
    zhuangTai.value = {
      zhuang_tai: 'yi_wan_cheng',
      jun_shi_id: junShiId,
      kai_shi_shi_jian: zhuangTai.value?.kai_shi_shi_jian ?? new Date().toISOString(),
      jie_guo: jieGuo,
      youLiaoTianJiLu: true,
    }
  }

  // 跨导航持久：组件卸载不清空。仅在明确切换会话或主动清理时才重置。
  function qingLi(会话ID?: string): void {
    if (会话ID && jiaoSeId.value && jiaoSeId.value !== 会话ID) return
    jiaoSeId.value = null
    zhuangTai.value = null
    keZaiCiZhiDao.value = true
    youLiaoTianJiLu.value = true
  }

  return {
    jiaoSeId,
    zhuangTai,
    keZaiCiZhiDao,
    youLiaoTianJiLu,
    shiDangQianHuiHua,
    chuShiHuaZhuangTai,
    gengXinZhuangTai,
    gengXinKeZaiCiZhiDao,
    sheZhiZhiDaoZhong,
    sheZhiYiWanCheng,
    qingLi,
  }
})
