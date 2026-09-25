import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  baoCunBiaoQingPaiXu,
  huoQuWoDeBiaoQing,
  shanChuBiaoQing as shanChuBiaoQingQingQiu,
  tianJiaBiaoQing,
  type BiaoQingXiang,
} from '@/api/表情'
import { huoQuFanYi } from '@/config/translations'

/**
 * FP-06b 我的表情：面板数据源。按账号拉取，换设备/换端登录同一账号看到同一套表情。
 * 只缓存「当前账号」的列表：登录态一切换（dangQianYongHuId 变了）就必须重拉，
 * 否则会出现甲的表情出现在乙的面板上。
 */
export const 使用表情仓库 = defineStore('表情', () => {
  const woDeBiaoQing = ref<BiaoQingXiang[]>([])
  const dangQianYongHuId = ref<string | null>(null)
  const jiaZaiZhong = ref(false)
  const tianJiaZhong = ref(false)
  const cuoWuXinXi = ref<string | null>(null)

  async function jiaZai(yongHuId: string, qiangZhi = false): Promise<void> {
    if (!yongHuId) return
    if (dangQianYongHuId.value !== yongHuId) {
      // 换账号：先清空上一账号的列表，避免甲的表情在乙的拉取请求返回前出现在面板里
      woDeBiaoQing.value = []
      dangQianYongHuId.value = null
    }
    if (!qiangZhi && dangQianYongHuId.value === yongHuId && !jiaZaiZhong.value) return
    jiaZaiZhong.value = true
    cuoWuXinXi.value = null
    try {
      const jieGuo = await huoQuWoDeBiaoQing()
      woDeBiaoQing.value = jieGuo.lie_biao
      dangQianYongHuId.value = yongHuId
    } catch {
      cuoWuXinXi.value = huoQuFanYi('duoMeiTi', 'biaoQingJiaZaiShiBai')
    } finally {
      jiaZaiZhong.value = false
    }
  }

  /**
   * 添加一张图进「我的表情」。返回 null 表示失败（提示已写入 cuoWuXinXi）。
   * yiCunZai 取服务端 yi_cun_zai（同 SHA256 命中原条目）——FP-20「添加到表情」据此给
   * 「已在我的表情里」而非报错红字；列表侧仍按 id 幂等，绝不产生重复条目。
   */
  async function tianJia(
    wenJian: File | Blob,
    wenJianMing?: string,
  ): Promise<{ xiang: BiaoQingXiang; yiCunZai: boolean } | null> {
    tianJiaZhong.value = true
    cuoWuXinXi.value = null
    try {
      const { xiang, yiCunZai } = await tianJiaBiaoQing(wenJian, wenJianMing)
      if (!woDeBiaoQing.value.some((yi) => yi.id === xiang.id)) woDeBiaoQing.value.push(xiang)
      return { xiang, yiCunZai }
    } catch (cuoWu: unknown) {
      cuoWuXinXi.value = quCuoWuWenBen(cuoWu, huoQuFanYi('duoMeiTi', 'biaoQingTianJiaShiBai'))
      return null
    } finally {
      tianJiaZhong.value = false
    }
  }

  async function shanChu(id: string): Promise<boolean> {
    cuoWuXinXi.value = null
    try {
      await shanChuBiaoQingQingQiu(id)
      woDeBiaoQing.value = woDeBiaoQing.value.filter((xiang) => xiang.id !== id)
      return true
    } catch (cuoWu: unknown) {
      cuoWuXinXi.value = quCuoWuWenBen(cuoWu, huoQuFanYi('duoMeiTi', 'biaoQingShanChuShiBai'))
      return false
    }
  }

  async function yiDong(duanMing: 'qian' | 'hou', id: string): Promise<void> {
    const suoYin = woDeBiaoQing.value.findIndex((xiang) => xiang.id === id)
    if (suoYin === -1) return
    const muBiaoXiaBiao = duanMing === 'qian' ? suoYin - 1 : suoYin + 1
    const lieBiao = [...woDeBiaoQing.value]
    if (muBiaoXiaBiao < 0 || muBiaoXiaBiao >= lieBiao.length) return
    const liuDong = lieBiao[muBiaoXiaBiao]
    lieBiao[muBiaoXiaBiao] = lieBiao[suoYin]
    lieBiao[suoYin] = liuDong
    woDeBiaoQing.value = lieBiao
    cuoWuXinXi.value = null
    try {
      const jieGuo = await baoCunBiaoQingPaiXu(lieBiao.map((xiang) => xiang.id))
      woDeBiaoQing.value = jieGuo.lie_biao
    } catch (cuoWu: unknown) {
      const wenBen = quCuoWuWenBen(cuoWu, huoQuFanYi('duoMeiTi', 'biaoQingPaiXuShiBai'))
      // 重拉会把 cuoWuXinXi 归零，故提示必须在重拉之后写，否则「已恢复原顺序」永远不显示
      await chongXinJiaZai()
      cuoWuXinXi.value = wenBen
    }
  }

  async function chongXinJiaZai(): Promise<void> {
    if (dangQianYongHuId.value) await jiaZai(dangQianYongHuId.value, true)
  }

  function qingKong(): void {
    woDeBiaoQing.value = []
    dangQianYongHuId.value = null
    jiaZaiZhong.value = false
    tianJiaZhong.value = false
    cuoWuXinXi.value = null
  }

  return {
    woDeBiaoQing,
    dangQianYongHuId,
    jiaZaiZhong,
    tianJiaZhong,
    cuoWuXinXi,
    jiaZai,
    tianJia,
    shanChu,
    yiDong,
    chongXinJiaZai,
    qingKong,
  }
})

/**
 * 后端 ti_shi 已在响应层过滤（SQL/路径/驱动词会被替换为兜底文案），这里再挡一层：
 * 只有含中文且不含拉丁字母的文本才允许直接上屏，其余一律回落到调用点给定的安全默认文案。
 * 目的是不让「服务端改了文案」或「异常路径塞进 ti_shi」把英文/内部原文带到玩家眼前。
 */
function duQuKeXianShiWenBen(wenBen: unknown): string | null {
  if (typeof wenBen !== 'string') return null
  const jieGuo = wenBen.trim()
  if (jieGuo === '' || jieGuo.length > 200) return null
  if (!/[\u4e00-\u9fff]/.test(jieGuo)) return null
  if (/[A-Za-z]/.test(jieGuo)) return null
  return jieGuo
}

function quCuoWuWenBen(cuoWu: unknown, moRen: string): string {
  const cuoWuTi = cuoWu as { response?: { data?: { ti_shi?: unknown } } }
  return duQuKeXianShiWenBen(cuoWuTi?.response?.data?.ti_shi) ?? moRen
}
