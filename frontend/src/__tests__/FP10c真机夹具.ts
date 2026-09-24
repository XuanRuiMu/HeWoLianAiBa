/**
 * FP-10c-12 真机夹具（仅真浏览器取证用，vitest 不收集：文件名不含 .test）。
 *
 * jsdom 结构上看不见这四条缺陷（scoped 命令式节点、块边界光标、Shift+Enter 换行归一化、
 * 图后插入落位），本夹具把**生产同一份** 图文输入区.vue + use待发图文.ts 挂进真实 DOM，
 * 页面外壳用 inline style 复刻 .tui-mian  flex 列（聊天页面.vue 只准读不准改）：
 * 折叠档输入框被顶成一条色带的真机形态要能原样复现。
 * 驱动脚本住在仓库外：`.agents/scratch/FP10c-fix-verify.cjs`。
 */
import { createApp, defineComponent, h, ref } from 'vue'
import TuWenShuRuQu from '@/components/聊天/图文输入区.vue'
import { use待发图文, type BianJiQiDuan, type DaiFaGuangBiao } from '@/composables/use待发图文'
import { huoQuFanYi } from '@/config/translations'
import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import '@/styles/variables.css'
import '@/styles/global.css'

const shuRuNeiRong = ref('')
const zhanKai = ref(false)
const bianJi = use待发图文({
  shuRuNeiRong,
  chuangJianYuLan: (wenJian: File | Blob) => URL.createObjectURL(wenJian),
})

const zhuJi = defineComponent({
  setup: () => () =>
    h('div', { style: 'display:flex;flex-direction:column;height:100vh;padding:16px;gap:8px' }, [
      h('div', { style: 'flex:1' }),
      h('div', { style: 'display:flex;align-items:flex-end;gap:8px' }, [
        h(TuWenShuRuQu, {
          kuaiLieBiao: bianJi.kuaiLieBiao.value,
          wenBen: shuRuNeiRong.value,
          guangBiao: bianJi.guangBiao.value,
          zhanWeiFu: huoQuFanYi('liaoTian', 'shuRuXiaoXi'),
          zuiDaChangDu: XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu,
          zhanKai: zhanKai.value,
          onGengXinGuangBiao: (weiZhi: DaiFaGuangBiao) => bianJi.gengXinGuangBiao(weiZhi),
          onBianJi: (duan: BianJiQiDuan[], ids: string[]) => bianJi.tongBuCongBianJiQi(duan, ids),
          onChaRuWenBen: (wenBen: string, weiZhi: DaiFaGuangBiao) => bianJi.chaRuWenZi(wenBen, weiZhi),
          onFaSong: () => {},
          onShanChu: (id: string) => bianJi.shanChuKuai(id),
          onYiDong: (congId: string, daoXiaBiao: number) => bianJi.yiDongKuai(congId, daoXiaBiao),
        }),
      ]),
    ]),
})

createApp(zhuJi).mount('#app')

interface WuTai {
  tuPian: (kuan: number, gao: number, buJu: string) => Promise<File>
  chaTu: (buJu: string) => Promise<{ chengGong: boolean; yuanYin: string; kuaiId: string }>
  kuaiXu: () => Array<{ id: string; lei_xing: string; nei_rong: string }>
  touYing: () => string
  guangBiao: () => { kuaiId: string; pianYi: number }
  miaoShu: () => { jieDian: string; pianYi: number; zaiBianJiQi: boolean }
  liang: () => unknown
  kuoZhanKai: (zhi: boolean) => Promise<void>
  zhongZhi: () => Promise<void>
}

declare global {
  interface Window {
    tai: WuTai
  }
}

async function dengyi(): Promise<void> {
  await new Promise<void>((jieJue) => requestAnimationFrame(() => jieJue()))
  await new Promise<void>((jieJue) => setTimeout(jieJue, 30))
  await new Promise<void>((jieJue) => requestAnimationFrame(() => jieJue()))
}

function bianJiQi(): HTMLElement {
  const ele = document.querySelector('.shuru-kuang')
  if (!ele) throw new Error('夹具里找不到 .shuru-kuang')
  return ele as HTMLElement
}

window.tai = {
  async tuPian(kuan: number, gao: number, buJu: string): Promise<File> {
    const huaBu = document.createElement('canvas')
    huaBu.width = kuan
    huaBu.height = gao
    const bi = huaBu.getContext('2d')
    if (!bi) throw new Error('夹具环境没有 canvas 2d')
    bi.fillStyle = buJu
    bi.fillRect(0, 0, kuan, gao)
    bi.fillStyle = '#ffffff'
    bi.fillRect(kuan / 4, gao / 4, kuan / 2, gao / 2)
    const tuPian = await new Promise<Blob | null>((jieJue) => huaBu.toBlob(jieJue, 'image/png'))
    if (!tuPian) throw new Error('toBlob 失败')
    return new File([tuPian], 'qiu-zhen.png', { type: 'image/png' })
  },
  async chaTu(buJu: string): Promise<{ chengGong: boolean; yuanYin: string; kuaiId: string }> {
    const wenJian = await this.tuPian(600, 200, buJu)
    const jieGuo = bianJi.chaRuTuPian(wenJian, 'tupian')
    await dengyi()
    return { chengGong: jieGuo.chengGong, yuanYin: jieGuo.yuanYin, kuaiId: jieGuo.kuaiId }
  },
  kuaiXu: () => bianJi.kuaiLieBiao.value.map((xiang) => ({ id: xiang.id, lei_xing: xiang.lei_xing, nei_rong: xiang.nei_rong })),
  touYing: () => shuRuNeiRong.value,
  guangBiao: () => ({ kuaiId: bianJi.guangBiao.value.kuaiId, pianYi: bianJi.guangBiao.value.pianYi }),
  miaoShu: () => {
    const xuanQu = window.getSelection()
    const jieDian = xuanQu && xuanQu.rangeCount > 0 ? xuanQu.anchorNode : null
    return {
      jieDian: jieDian ? `${jieDian.nodeName}` : '(null)',
      pianYi: xuanQu && xuanQu.rangeCount > 0 ? xuanQu.anchorOffset : -1,
      zaiBianJiQi: !!jieDian && bianJiQi().contains(jieDian),
    }
  },
  liang: () => {
    const cao = bianJiQi()
    const waiKe = document.querySelector('.shuru-kuang-waike') as HTMLElement
    return {
      waiKeGao: waiKe?.getBoundingClientRect().height ?? null,
      caoChildren: Array.from(cao.childNodes).map((zi) => ({
        ming: zi.nodeName,
        lei: zi.nodeType === 1 ? (zi as HTMLElement).className : '',
        kuai: zi.nodeType === 1 ? (zi as HTMLElement).getAttribute('data-kuai-id') ?? '' : '',
        text: zi.textContent ?? '',
      })),
      tuKuai: Array.from(cao.querySelectorAll('.dai-fa-kuai--tu')).map((xiang) => {
        const ju = xiang.getBoundingClientRect()
        const tu = xiang.querySelector('img.dai-fa-kuai-tu') as HTMLImageElement | null
        const js = tu ? getComputedStyle(tu) : null
        const jj = tu?.getBoundingClientRect()
        return {
          kuaiId: xiang.getAttribute('data-kuai-id') ?? '',
          kuaiRect: { x: ju.x, y: ju.y, w: ju.width, h: ju.height },
          imgRect: jj ? { x: jj.x, y: jj.y, w: jj.width, h: jj.height } : null,
          imgStyle: js ? { width: js.width, height: js.height, objectFit: js.objectFit, display: js.display } : null,
          dataV: xiang.getAttributeNames().filter((m) => m.startsWith('data-v-')),
        }
      }),
      wenZiKuai: Array.from(cao.querySelectorAll('.dai-fa-kuai--wen')).map((xiang) => {
        const ju = xiang.getBoundingClientRect()
        return {
          kuaiId: xiang.getAttribute('data-kuai-id') ?? '',
          text: xiang.textContent ?? '',
          rect: { x: ju.x, y: ju.y, w: ju.width, h: ju.height },
        }
      }),
      weiKong: cao.classList.contains('wei-kong'),
    }
  },
  async kuoZhanKai(zhi: boolean): Promise<void> {
    zhanKai.value = zhi
    await dengyi()
  },
  async zhongZhi(): Promise<void> {
    bianJi.qingKong()
    bianJiQi().focus()
    await dengyi()
  },
}
