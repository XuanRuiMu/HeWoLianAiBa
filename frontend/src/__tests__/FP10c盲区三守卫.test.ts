import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import http from '@/api/请求'
import TuWenShuRuQu from '@/components/聊天/图文输入区.vue'
import { use待发图文, type BianJiQiDuan, type DaiFaGuangBiao } from '@/composables/use待发图文'
import { use长按菜单, type CaiDanXiaoXi } from '@/composables/use长按菜单'
import { shiBenDiLinShiXiaoXi } from '@/utils/消息内容块'
import { huoQuFanYi } from '@/config/translations'
import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { 使用聊天仓库 } from '@/stores/聊天'
import { duQuShuRuQuText, xieRuShuRuQu } from './输入区夹具'

/**
 * 第四波 BlindSpot 审计（.agents/evidence/traces/AUDIT-wave4-blindspot-20260923.md）三条重大缺陷的守卫：
 *
 *  M-1 纯文本态每次按键全量重建 + 抢选区：签名读的是**字符串型 prop**，而 use待发图文 的「原地改写」
 *      纪律覆盖不到 string ⇒ 编辑当轮算出的「已渲染签名」是上一轮的旧文字 ⇒ post-flush watch 每键都判
 *      为签名变化。守卫＝连打 5 个字符后**文本节点身份守恒**且组件一次都没有清选区。
 *  M-2 `fuYuanGuangBiao` 无条件 `removeAllRanges()` 抢整份文档选区。守卫＝编辑区未持有选区时外部写入
 *      只重建 DOM、不动选区；编辑区持有焦点/选区时**照旧**恢复光标（不许把正常路径一起挡掉）。
 *      判定实现只许有一份（composables/use长按菜单.ts 的共用出口），两页的聊天组件都从那里取。
 *  M-3 乐观气泡（`id === ke_hu_duan_id === linshi-*`）经「长按 → 引用」无条件进引用槽 ⇒ 发送时带的
 *      是服务端从不认得的 id（backend/src/services/消息.ts 判非法 UUID ⇒ 400），且 shallowRef 持旧对象
 *      不会自愈。守卫＝临时消息**没有引用入口**、引用槽的**唯一出口**拒绝它、store 的引用入参再挡一层。
 *
 * 判定一律走行为 / DOM / 真请求体；源码文本只用来钉「同一判定只有一处实现」这一条结构性契约。
 */

const 源目录 = resolve(__dirname, '..')
const 输入区路径 = 'components/聊天/图文输入区.vue'
const 菜单路径 = 'composables/use长按菜单.ts'
const 消息块路径 = 'utils/消息内容块.ts'

function 读源(相对路径: string): string {
  return readFileSync(join(源目录, 相对路径), 'utf-8')
}

function 遍历(目录: string): string[] {
  const 结果: string[] = []
  for (const 项 of readdirSync(目录, { withFileTypes: true })) {
    if (项.name === '__tests__' || 项.name === 'node_modules') continue
    const 完整 = join(目录, 项.name)
    if (项.isDirectory()) 结果.push(...遍历(完整))
    else if (/\.(ts|vue)$/.test(项.name)) 结果.push(完整)
  }
  return 结果
}

function 含串的文件(串: RegExp): string[] {
  return 遍历(源目录)
    .filter((路) => 串.test(readFileSync(路, 'utf-8')))
    .map((路) => 路.replace(/\\/g, '/').split('/src/')[1])
    .sort()
}

/* ---------------- M-1 / M-2 的挂载台（与两页同构：真源＝use待发图文，组件只接线） ---------------- */

interface 台 {
  wrapper: ReturnType<typeof mount>
  bianJi: ReturnType<typeof use待发图文>
  读投影: () => string
  写投影: (zhi: string) => void
  编辑器: () => HTMLElement
}

function 挂台(): 台 {
  const shuRuNeiRong = ref('')
  const bianJi = use待发图文({ shuRuNeiRong })
  const zhuJi = defineComponent({
    setup: () => () =>
      h(TuWenShuRuQu, {
        kuaiLieBiao: bianJi.kuaiLieBiao.value,
        wenBen: shuRuNeiRong.value,
        guangBiao: bianJi.guangBiao.value,
        zhanWeiFu: huoQuFanYi('liaoTian', 'shuRuXiaoXi'),
        zuiDaChangDu: XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu,
        onGengXinGuangBiao: (weiZhi: DaiFaGuangBiao) => bianJi.gengXinGuangBiao(weiZhi),
        onBianJi: (duan: BianJiQiDuan[], xianShiXuanRanIds: string[]) =>
          bianJi.tongBuCongBianJiQi(duan, xianShiXuanRanIds),
        onChaRuWenBen: (wenBen: string, weiZhi: DaiFaGuangBiao) => bianJi.chaRuWenZi(wenBen, weiZhi),
      }),
  })
  const wrapper = mount(zhuJi, { attachTo: document.body })
  return {
    wrapper,
    bianJi,
    读投影: () => shuRuNeiRong.value,
    写投影: (zhi: string) => {
      shuRuNeiRong.value = zhi
    },
    编辑器: () => wrapper.find('.shuru-kuang').element as HTMLElement,
  }
}

/** 浏览器原生插入：只改文本节点 + 派发 input，**测试自己一律不碰选区** ⇒ 期间任何 removeAllRanges 都来自组件 */
async function 键入一个字(台: 台, zi: string): Promise<void> {
  const cao = 台.编辑器()
  const jieDian = cao.firstChild
  if (!jieDian || jieDian.nodeType !== Node.TEXT_NODE) {
    throw new Error('输入区里没有文字节点 ⇒ 「节点身份守恒」的前提不成立')
  }
  jieDian.textContent = `${jieDian.textContent ?? ''}${zi}`
  cao.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
  await nextTick()
}

function 选区清空计数器(): { 次数: () => number; 复原: () => void } {
  if (typeof Selection === 'undefined') {
    throw new Error('环境没有 Selection ⇒ 选区类用例无法执行（这是环境不成立，不是跳过）')
  }
  const yuanBan = Selection.prototype.removeAllRanges
  let jiShu = 0
  Selection.prototype.removeAllRanges = function (...args: Parameters<typeof yuanBan>) {
    jiShu += 1
    return yuanBan.apply(this, args)
  }
  return {
    次数: () => jiShu,
    复原: () => {
      Selection.prototype.removeAllRanges = yuanBan
    },
  }
}

describe('FP-10c 盲区守卫 M-1：纯文本态按键不得全量重建', () => {
  it('连打 5 个字符：同一个文本节点活到最后，且组件一次都没有清文档选区', async () => {
    const 台 = 挂台()
    await xieRuShuRuQu(台.wrapper, '甲')
    const cao = 台.编辑器()
    const 首节点 = cao.firstChild
    const 计数 = 选区清空计数器()
    try {
      for (const zi of ['乙', '丙', '丁', '戊']) {
        await 键入一个字(台, zi)
        expect(台.编辑器().firstChild, `键入 ${zi} 后文本节点被换成新对象 ⇒ 整棵重建`).toBe(首节点)
        expect(台.编辑器().childNodes).toHaveLength(1)
        expect(台.读投影()).toBe(`甲${'乙丙丁戊'.slice(0, ['乙', '丙', '丁', '戊'].indexOf(zi) + 1)}`)
      }
      expect(计数.次数(), '每次按键都 removeAllRanges ⇒ 全局选区被抢（撤销栈/软键盘/拖选一起废）').toBe(0)
    } finally {
      计数.复原()
      台.wrapper.unmount()
    }
  })

  it('签名不再读字符串 prop：编辑当轮算出的「已渲染签名」必须与本轮真源一致（行为面反证）', async () => {
    const 台 = 挂台()
    await xieRuShuRuQu(台.wrapper, '一句')
    const 重建前 = 台.编辑器().firstChild
    await 键入一个字(台, '话')
    expect(台.编辑器().firstChild, '真源已写回、签名仍是上一轮的文字 ⇒ watch 每键都重建').toBe(重建前)
    expect(duQuShuRuQuText(台.wrapper)).toBe('一句话')
    台.wrapper.unmount()
  })

  it('外部写入（草稿恢复）仍要重建 DOM：守卫不许把该重建的路径一起挡掉', async () => {
    const 台 = 挂台()
    await xieRuShuRuQu(台.wrapper, '旧草稿')
    const 旧节点 = 台.编辑器().firstChild
    台.写投影('新草稿')
    await nextTick()
    await nextTick()
    expect(台.编辑器().firstChild, '外部写入没触发重建 ⇒ 输入区停留在旧文字').not.toBe(旧节点)
    expect(duQuShuRuQuText(台.wrapper)).toBe('新草稿')
    台.wrapper.unmount()
  })
})

describe('FP-10c 盲区守卫 M-2：文档选区的归属判定只有一份', () => {
  afterEach(() => {
    const xuanQu = typeof window.getSelection === 'function' ? window.getSelection() : null
    xuanQu?.removeAllRanges()
  })

  it('编辑区未持有选区时，外部真源写入只重建 DOM、不动页面别处的拖选', async () => {
    const 台 = 挂台()
    const 外部 = document.createElement('p')
    外部.textContent = '整段拖选的正文'
    document.body.appendChild(外部)
    const xuanQu = window.getSelection()
    const fanWei = document.createRange()
    fanWei.selectNodeContents(外部)
    xuanQu?.removeAllRanges()
    xuanQu?.addRange(fanWei)
    const 计数 = 选区清空计数器()
    try {
      台.写投影('发送后清空的草稿')
      await nextTick()
      await nextTick()
      expect(duQuShuRuQuText(台.wrapper), '该做的重建被守卫挡掉了').toBe('发送后清空的草稿')
      expect(计数.次数(), '输入区抢了整份文档的选区').toBe(0)
      const 之后 = window.getSelection()
      expect(之后?.anchorNode, '选区端点被挪走了').toBe(外部)
      expect(台.编辑器().contains(之后?.anchorNode ?? null), '选区落进编辑器了').toBe(false)
    } finally {
      计数.复原()
      外部.remove()
      台.wrapper.unmount()
    }
  })

  it('编辑区持有焦点时，外部写入照旧把光标放回文字流末尾', async () => {
    const 台 = 挂台()
    const cao = 台.编辑器()
    const 描述 = Object.getOwnPropertyDescriptor(document, 'activeElement')
    Object.defineProperty(document, 'activeElement', { configurable: true, get: () => cao })
    try {
      await xieRuShuRuQu(台.wrapper, '草稿')
      台.写投影('草稿改过')
      await nextTick()
      await nextTick()
      const xuanQu = window.getSelection()
      expect(xuanQu?.rangeCount, '聚焦态的外部写入没有恢复选区').toBe(1)
      expect(cao.contains(xuanQu?.anchorNode ?? null), '光标跑到编辑器外了').toBe(true)
    } finally {
      if (描述) Object.defineProperty(document, 'activeElement', 描述)
      else delete (document as unknown as Record<string, unknown>).activeElement
      台.wrapper.unmount()
    }
  })

  it('共用出口：选区归属判定只有一处实现，输入区与引用气泡块取同一份', () => {
    expect(含串的文件(/function keYiJieGuanXuanQu\(/), '选区归属判定出现了第二份实现').toEqual([菜单路径])
    const 输入区源 = 读源(输入区路径)
    expect(输入区源).toMatch(/import\s*\{[^}]*keYiJieGuanXuanQu[^}]*\}\s*from\s*'@\/composables\/use长按菜单'/)
    expect(输入区源, '输入区自己写了一份焦点判定').not.toMatch(/activeElement/)
    expect((输入区源.match(/keYiJieGuanXuanQu\(/g) ?? []).length, '守卫在组件里被调了不止一次').toBe(1)
    expect(输入区源, '重建后无条件抢选区（守卫没接住 fuYuanGuangBiao）').toMatch(
      /if \(yuJieGuan\) fuYuanGuangBiao\(/,
    )
    // 同一批新代码里的另一处文档选区消费者：判定也只能来自那个共用出口，不再各写一份
    const 气泡源 = 读源('components/聊天/引用气泡块.vue')
    expect(气泡源).toMatch(/from\s*'@\/composables\/use长按菜单'/)
    expect(气泡源).not.toMatch(/removeAllRanges|document\.activeElement/)
  })
})

/* ---------------- M-3：乐观气泡的 id 不许进引用槽 ---------------- */

const 服务端ID = 'aaaaaaaa-1111-4111-8111-111111111111'

function 造气泡(附加: Partial<CaiDanXiaoXi> = {}): CaiDanXiaoXi {
  return {
    id: 服务端ID,
    nei_rong: '你好',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    fa_song_zhe_lei_xing: 'yonghu',
    ...附加,
  }
}

function 临时气泡(附加: Partial<CaiDanXiaoXi> = {}): CaiDanXiaoXi {
  const linShiId = 'linshi-1700000000000-1'
  return 造气泡({ id: linShiId, ke_hu_duan_id: linShiId, ...附加 })
}

function 造菜单(选项: { zhiChiTuPianYinYong?: boolean } = {}) {
  return use长按菜单<CaiDanXiaoXi>({
    dangQianShiJian: ref(Date.now()),
    cheHuiXiaoXi: vi.fn().mockResolvedValue(undefined),
    zhiChiTuPianYinYong: 选项.zhiChiTuPianYinYong ?? true,
  })
}

vi.mock('@/api/请求', () => ({
  default: { post: vi.fn(), get: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn(), connected: false })),
}))

const 会话ID = 'h1'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function 消息回包() {
  return {
    data: {
      cheng_gong: true,
      shu_ju: {
        id: 服务端ID,
        hui_hua_id: 会话ID,
        fa_song_zhe_id: 'u1',
        fa_song_zhe_lei_xing: 'yonghu',
        nei_rong: '正文',
        lei_xing: 'wenben',
        shi_jian_chuo: 1700000000000,
        yi_du: true,
      },
    },
  } as never
}

/** 按正文找那一次的请求体：队列/重试会插入别的请求，按下标取会误伤 */
function 请求体按正文(正文: string): Record<string, unknown> {
  const zhao = vi
    .mocked(http.post)
    .mock.calls.map((xiang) => xiang[1] as Record<string, unknown>)
    .filter((ti) => ti && ti.neiRong === 正文)
  if (zhao.length === 0) throw new Error(`没有为「${正文}」发出过请求`)
  return zhao[zhao.length - 1]
}

describe('FP-10c 盲区守卫 M-3：引用槽只接服务端 id', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(http.post).mockReset()
    vi.mocked(http.get).mockReset()
  })

  it('判定本身：id 与 ke_hu_duan_id 同值＝还没落库的本地气泡（服务端认得的那一行只保留后者）', () => {
    expect(shiBenDiLinShiXiaoXi(临时气泡())).toBe(true)
    expect(shiBenDiLinShiXiaoXi(造气泡())).toBe(false)
    expect(shiBenDiLinShiXiaoXi(造气泡({ ke_hu_duan_id: 'linshi-1-1' }))).toBe(false)
    expect(shiBenDiLinShiXiaoXi(null)).toBe(false)
  })

  it('文本菜单：临时气泡不给「引用」入口，执行口再挡一次；服务端气泡两条都放行', async () => {
    const 菜单 = 造菜单()
    const 临时 = 临时气泡()
    expect(菜单.huoQuWenBenCaiDanXiang(临时)).not.toContain('yinYong')
    菜单.daKaiWenBenCaiDan(临时, {} as MouseEvent)
    await 菜单.zhiXingWenBenCaiDanXiang('yinYong')
    expect(菜单.yinYongXiaoXi.value, '乐观气泡进了引用槽 ⇒ 发出去必 400').toBeNull()

    expect(菜单.huoQuWenBenCaiDanXiang(造气泡())).toContain('yinYong')
    菜单.daKaiWenBenCaiDan(造气泡(), {} as MouseEvent)
    await 菜单.zhiXingWenBenCaiDanXiang('yinYong')
    expect(菜单.yinYongXiaoXi.value?.id).toBe(服务端ID)
  })

  it('语音 / 图片菜单与 sheZhiYinYong 同一个出口：临时气泡一律拒，服务端 id 一律放', async () => {
    const 语音 = 造菜单()
    expect(语音.huoQuYuYinCaiDanXiang(临时气泡({ lei_xing: 'yuYin' }))).not.toContain('yinYong')
    expect(语音.huoQuYuYinCaiDanXiang(造气泡({ lei_xing: 'yuYin' }))).toContain('yinYong')
    语音.daKaiYuYinCaiDan(临时气泡({ lei_xing: 'yuYin' }), {} as MouseEvent)
    await 语音.zhiXingYuYinCaiDanXiang('yinYong')
    expect(语音.yinYongXiaoXi.value).toBeNull()

    const 图片 = 造菜单()
    expect(图片.huoQuTuPianCaiDanXiang(临时气泡({ lei_xing: 'tuPian' }))).not.toContain('yinYong')
    图片.daKaiTuPianCaiDan(临时气泡({ lei_xing: 'tuPian' }), {} as MouseEvent)
    await 图片.zhiXingTuPianCaiDanXiang('yinYong')
    expect(图片.yinYongXiaoXi.value).toBeNull()

    const 直连 = 造菜单()
    直连.sheZhiYinYong(临时气泡())
    expect(直连.yinYongXiaoXi.value, 'sheZhiYinYong 绕过守卫 ⇒ 引用槽又脏了').toBeNull()
    直连.sheZhiYinYong(造气泡())
    expect(直连.yinYongXiaoXi.value?.id).toBe(服务端ID)
  })

  it('引用槽只有一处赋值出口（非清空）', () => {
    const 源 = 读源(菜单路径)
    expect((源.match(/yinYongXiaoXi\.value\s*=(?!\s*null)/g) ?? []).length).toBe(1)
  })

  it('store 入参守卫：临时气泡的 id 进不了请求体，消息照发；服务端 id 照旧带上', async () => {
    vi.mocked(http.post).mockRejectedValueOnce(new Error('网络断了'))
    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.dangQianHuiHuaId = 会话ID
    await 聊天仓库.faSongXiaoXi('先发失败的一条')
    const 残泡 = 聊天仓库.xiaoXiLieBiao[0]
    expect(shiBenDiLinShiXiaoXi(残泡), '前提不成立：列表里没有乐观气泡').toBe(true)

    vi.mocked(http.post).mockResolvedValue(消息回包())
    await 聊天仓库.faSongXiaoXi('引用一条在途气泡', 残泡.id)
    const 请求体 = 请求体按正文('引用一条在途气泡')
    expect(请求体, '把服务端从不认得的 id 当引用发出去 ⇒ 恒 400').not.toHaveProperty('beiYongXiaoXiId')

    await 聊天仓库.faSongXiaoXi('引用一条已落库的', 服务端ID)
    const 放行 = 请求体按正文('引用一条已落库的')
    expect(放行.beiYongXiaoXiId).toBe(服务端ID)
    expect(String(放行.幂等键)).toMatch(UUID)
  })

  it('同一判定只有一处实现，store 与菜单共用', () => {
    expect(含串的文件(/function shiBenDiLinShiXiaoXi/)).toEqual([消息块路径])
    for (const 消费方 of [菜单路径, 'stores/聊天.ts']) {
      expect(读源(消费方), `${消费方} 没有复用共用判定`).toMatch(/import[\s\S]*shiBenDiLinShiXiaoXi[\s\S]*from\s*'@\/utils\/消息内容块'/)
    }
  })
})
