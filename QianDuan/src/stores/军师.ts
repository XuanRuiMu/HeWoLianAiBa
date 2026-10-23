import { defineStore } from 'pinia'
import { ref } from 'vue'
import { huoQuJunShiZhiDaoZhuangTai } from '@/api/聊天'
import { 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'
import type { JunShiZhiDaoZhuangTaiXinXi } from '@/types/类型定义'

const JIAO_SE_ID_ZHENG_ZE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

export function shiYouXiaoJiaoSeId(id: string): boolean {
  return typeof id === 'string' && JIAO_SE_ID_ZHENG_ZE.test(id)
}

export const 使用军师仓库 = defineStore('军师', () => {
  const jiaoSeId = ref<string | null>(null)
  const zhuangTai = ref<JunShiZhiDaoZhuangTaiXinXi | null>(null)
  const keZaiCiZhiDao = ref(true)
  const youLiaoTianJiLu = ref(true)
  const zhuangTaiCuoWu = ref<QianTaiCuoWu | null>(null)

  function shiDangQianHuiHua(会话ID: string): boolean {
    return jiaoSeId.value === 会话ID
  }

  async function chuShiHuaZhuangTai(会话ID: string): Promise<void> {
    if (!shiYouXiaoJiaoSeId(会话ID)) return
    jiaoSeId.value = 会话ID
    try {
      const {
        zhuangTai: zt,
        keZaiCiZhiDao: kz,
        youLiaoTianJiLu: ylt,
      } = await huoQuJunShiZhiDaoZhuangTai(会话ID)
      if (jiaoSeId.value !== 会话ID) return
      zhuangTai.value = zt
      keZaiCiZhiDao.value = kz
      if (ylt !== undefined) youLiaoTianJiLu.value = ylt
      zhuangTaiCuoWu.value = null
    } catch (cuoWu: unknown) {
      const zhengChangHua = 归一前台错误(cuoWu)
      if (zhengChangHua.xianShi && jiaoSeId.value === 会话ID) zhuangTaiCuoWu.value = zhengChangHua
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
    zhuangTaiCuoWu,
    shiDangQianHuiHua,
    chuShiHuaZhuangTai,
    gengXinZhuangTai,
    gengXinKeZaiCiZhiDao,
    sheZhiZhiDaoZhong,
    sheZhiYiWanCheng,
    qingLi,
  }
})
