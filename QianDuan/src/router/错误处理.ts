import { defineComponent, h, shallowRef } from 'vue'
import type { RouteRecordRaw, Router } from 'vue-router'
import CuoWuBianJie from '@/components/错误边界.vue'
import { huoQuFanYi } from '@/config/翻译表'
import { chuFaCuoWuShangBao } from '@/utils/错误上报'

export type LuYouShiBaiLeiXing = 'chunk' | 'yiban'

export const jiaZaiShiBaiLuYouMing = 'jiaZaiShiBai'

const fenKuaiCuoWuZhengZe =
  /loading (?:css )?chunk|chunkloaderror|failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css|dynamically imported/i

function cuoWuWenBen(cuoWu: unknown): string {
  if (typeof cuoWu === 'string') return cuoWu
  if (cuoWu instanceof Error) return `${cuoWu.name} ${cuoWu.message}`
  if (cuoWu && typeof cuoWu === 'object') {
    const keNeng = cuoWu as { name?: unknown; message?: unknown }
    const mingCheng = typeof keNeng.name === 'string' ? keNeng.name : ''
    const xiaoXi = typeof keNeng.message === 'string' ? keNeng.message : ''
    return `${mingCheng} ${xiaoXi}`
  }
  return ''
}

export function fenLeiLuYouCuoWu(cuoWu: unknown): LuYouShiBaiLeiXing {
  return fenKuaiCuoWuZhengZe.test(cuoWuWenBen(cuoWu)) ? 'chunk' : 'yiban'
}

const dangQianShiBaiLeiXing = shallowRef<LuYouShiBaiLeiXing | null>(null)

let zuiJinChuLiCuoWu: unknown = null

const jiaZaiShiBaiYeMian = defineComponent({
  name: 'JiaZaiShiBaiYeMian',
  render() {
    return h(CuoWuBianJie, {
      qiangZhiXianShi: true,
      miaoShuWenAn: huoQuFanYi(
        'tongYong',
        dangQianShiBaiLeiXing.value === 'chunk' ? 'wangLuoCuoWu' : 'cuoWuBianJieTiShi',
      ),
    })
  },
})

export const jiaZaiShiBaiLuYou: RouteRecordRaw = {
  path: '/jia-zai-shi-bai',
  name: jiaZaiShiBaiLuYouMing,
  component: jiaZaiShiBaiYeMian,
}

export async function qieDaoJiaZaiShiBaiYe(luYouShiLi: Router, cuoWu: unknown): Promise<void> {
  const leiXing = fenLeiLuYouCuoWu(cuoWu)
  if (zuiJinChuLiCuoWu !== cuoWu) {
    zuiJinChuLiCuoWu = cuoWu
    chuFaCuoWuShangBao({
      leiBie: leiXing === 'chunk' ? 'ziYuan' : 'weiZhi',
      cuoWu,
      shiJianChuo: Date.now(),
      fuJia: { laiYuan: 'luYouCuoWu', luYouShiBaiLeiXing: leiXing },
    })
  }
  dangQianShiBaiLeiXing.value = leiXing
  if (luYouShiLi.currentRoute.value.name === jiaZaiShiBaiLuYouMing) return
  try {
    await luYouShiLi.replace({ name: jiaZaiShiBaiLuYouMing })
  } catch {
    // 失败页导航本身再失败：保持当前呈现，不再递归处理
  }
}

export function zhuCeLuYouCuoWuChuLi(luYouShiLi: Router): void {
  luYouShiLi.onError((cuoWu) => {
    void qieDaoJiaZaiShiBaiYe(luYouShiLi, cuoWu)
  })
}
