import { defineStore } from 'pinia'
import { ref } from 'vue'
import { huoQuYongHuSheZhi, baoCunLiaoTianBeiJing, baoCunYinSiSheZhi, qingKongPaiWeiShuJu } from '@/api/社交'
import { shiHeFaKeJianXing, type KeJianXing } from '@/api/资料'

export const LIAO_TIAN_BEI_JING_XUAN_XIANG = ['moRen', 'miWuSenLin', 'haiYangZhiLan', 'fenSeMengJing', 'yeKongXingHe', 'miSeTianYuan'] as const

export type LiaoTianBeiJing = (typeof LIAO_TIAN_BEI_JING_XUAN_XIANG)[number]

export const 使用用户设置仓库 = defineStore('用户设置', () => {
  const uid = ref('')
  const shouJiHao = ref('')
  const touXiang = ref<string | null>(null)
  const qianMing = ref<string | null>(null)
  const qianMingKeJianXing = ref<KeJianXing>('gong_kai')
  const qianMingBaiMingDan = ref<string[]>([])
  const liaoTianBeiJing = ref<LiaoTianBeiJing>('moRen')
  const gongKaiZhangHao = ref(true)
  const gongKaiShouJiHao = ref(false)
  const gongKaiYouXiang = ref(false)
  const bangDingYouXiang = ref('')
  const yiJiaZai = ref(false)
  let jiaZaiZhong: Promise<void> | null = null

  async function jiaZai(): Promise<void> {
    if (yiJiaZai.value) return
    // 同一时刻多组件并发调用时复用同一请求，不发重复查询
    if (jiaZaiZhong) return jiaZaiZhong
    jiaZaiZhong = zhiXingJiaZai().finally(() => {
      jiaZaiZhong = null
    })
    return jiaZaiZhong
  }

  async function zhiXingJiaZai(): Promise<void> {
    try {
      const sheZhi = await huoQuYongHuSheZhi()
      uid.value = sheZhi.uid
      shouJiHao.value = sheZhi.shou_ji_hao
      touXiang.value = sheZhi.tou_xiang
      qianMing.value = sheZhi.qian_ming
      if (shiHeFaKeJianXing(sheZhi.qian_ming_ke_jian_xing)) {
        qianMingKeJianXing.value = sheZhi.qian_ming_ke_jian_xing
      }
      qianMingBaiMingDan.value = Array.isArray(sheZhi.qian_ming_bai_ming_dan) ? sheZhi.qian_ming_bai_ming_dan : []
      if ((LIAO_TIAN_BEI_JING_XUAN_XIANG as readonly string[]).includes(sheZhi.liao_tian_bei_jing)) {
        liaoTianBeiJing.value = sheZhi.liao_tian_bei_jing as LiaoTianBeiJing
      }
      gongKaiZhangHao.value = sheZhi.gong_kai_zhang_hao
      gongKaiShouJiHao.value = sheZhi.gong_kai_shou_ji_hao
      gongKaiYouXiang.value = sheZhi.gong_kai_you_xiang
      bangDingYouXiang.value = sheZhi.bang_ding_you_xiang
    } catch {
      /* 未登录或后端未迁移时保持本地默认值 */
    } finally {
      yiJiaZai.value = true
    }
  }

  async function qieHuanBeiJing(beiJing: LiaoTianBeiJing): Promise<void> {
    liaoTianBeiJing.value = beiJing
    try {
      await baoCunLiaoTianBeiJing(beiJing)
    } catch {
      /* 离线时仅本地生效 */
    }
  }

  async function baoCunYinSi(canShu: { gongKaiZhangHao?: boolean; gongKaiShouJiHao?: boolean; gongKaiYouXiang?: boolean }): Promise<void> {
    if (canShu.gongKaiZhangHao !== undefined) gongKaiZhangHao.value = canShu.gongKaiZhangHao
    if (canShu.gongKaiShouJiHao !== undefined) gongKaiShouJiHao.value = canShu.gongKaiShouJiHao
    if (canShu.gongKaiYouXiang !== undefined) gongKaiYouXiang.value = canShu.gongKaiYouXiang
    try {
      await baoCunYinSiSheZhi(canShu)
    } catch {
      /* 离线时仅本地生效 */
    }
  }

  async function qingKongPaiWei(): Promise<void> {
    await qingKongPaiWeiShuJu()
  }

  return { uid, shouJiHao, touXiang, qianMing, qianMingKeJianXing, qianMingBaiMingDan, liaoTianBeiJing, gongKaiZhangHao, gongKaiShouJiHao, gongKaiYouXiang, bangDingYouXiang, yiJiaZai, jiaZai, qieHuanBeiJing, baoCunYinSi, qingKongPaiWei }
})
