import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { fanYi, huoQuFanYi } from '@/config/翻译表'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { 使用角色生成仓库 } from '@/stores/角色生成'

vi.mock('@/views/聊天页面.vue', () => ({ default: { name: 'LiaoTianYe' } }))

const { 预加载聊天页 } = vi.hoisted(() => ({ 预加载聊天页: vi.fn() }))
vi.mock('@/composables/use聊天预加载', () => ({ 预加载聊天页 }))

const { shengChengJiaoSe, queRenJiaoSe, chuangJianHuiHua } = vi.hoisted(() => ({
  shengChengJiaoSe: vi.fn(),
  queRenJiaoSe: vi.fn(),
  chuangJianHuiHua: vi.fn(),
}))
vi.mock('@/api/聊天', () => ({ shengChengJiaoSe, queRenJiaoSe, chuangJianHuiHua }))
vi.mock('@/api/挑战', () => ({ kaiShiTiaoZhan: vi.fn() }))

const 根 = resolve(__dirname, '..')
const 读源 = (相对: string): string => readFileSync(resolve(根, 相对), 'utf8').replace(/\r\n/g, '\n')
const 载入页源 = 读源('components/载入页.vue')
const 添加微信源 = 读源('views/添加微信.vue')
const 载入聊天源 = 读源('views/载入聊天.vue')
const 菜单源 = 读源('components/全局菜单.vue')
const 聊天页源 = 读源('views/聊天页面.vue')

function 基础角色(覆盖: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'jue-se-1',
    ming_zi: '内部真名',
    wei_xin_ming: '小玄',
    xing_bie: 'nv',
    tou_xiang: 'https://cdn.test/tou.png',
    yao_kai_kou: false,
    ...覆盖,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
  预加载聊天页.mockResolvedValue(true)
})

describe('FP-05 加载页预留与微信名', () => {
  it('标题槽位固定高度、单行省略，头像槽位固定尺寸，数据到达不改变卡片结构', () => {
    const 标题块 = /\.zairu-biaoti \{([^}]*)\}/.exec(载入页源)?.[1] ?? ''
    expect(标题块).toContain('height: 29px')
    expect(标题块).toContain('overflow: hidden')
    expect(标题块).toContain('text-overflow: ellipsis')
    expect(标题块).toContain('white-space: nowrap')
    expect(载入页源).toMatch(/\.zairu-touxiang-wei \{[\s\S]*?width: 88px;[\s\S]*?height: 88px;/)
  })

  it('创建与战绩载入只认微信名，不再把真实姓名/内部名作为回退', () => {
    expect(添加微信源).toContain('仓库.jiaoSeXinXi?.wei_xin_ming')
    expect(添加微信源).not.toContain('jiaoSeXinXi?.ming_zi')
    expect(添加微信源).toContain("'💬'")
    expect(载入聊天源).toContain('dangQianJiaoSe.value?.wei_xin_ming')
    expect(载入聊天源).not.toContain('ming_zi')
    expect(菜单源).not.toContain('jiaoSeXinXi?.ming_zi')
    expect(聊天页源).not.toContain('jiaoSeXinXi?.ming_zi')
  })

  it('战绩载入按角色ID匹配当前对象，旧会话数据不会冒充新对象名称', async () => {
    const 路由 = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/zai-ru/:jiaoSeId', name: 'zaiRuLiaoTian', component: { template: '<div />' } },
        { path: '/guo-wang-zhan-ji', name: 'guoWangZhanJi', component: { template: '<div />' } },
      ],
    })
    await 路由.push('/zai-ru/bei-cai-ce')
    await 路由.isReady()
    const 聊天 = 使用聊天仓库()
    聊天.jiaoSeXinXi = 基础角色({ id: 'qi-ta-jiao-se', ming_zi: '别人的真名', wei_xin_ming: '别人的微信名' }) as never
    const 载入聊天 = (await import('@/views/载入聊天.vue')).default
    预加载聊天页.mockReturnValue(new Promise(() => undefined))
    const 包 = mount(载入聊天, {
      global: { plugins: [路由] },
    })
    await flushPromises()
    expect(document.body.textContent).toContain(huoQuFanYi('zaiRuLiaoTian', 'zhengZaiZhaoHui'))
    expect(document.body.textContent).not.toContain('别人的微信名')
    expect(document.body.textContent).not.toContain('别人的真名')
    包.unmount()
  })
})

describe('FP-05 预加载聊天页', () => {
  it('设置、消息、首屏图片与 yuZai 标记在返回前完成，进度单调到100', async () => {
    const 设置 = 使用用户设置仓库()
    const 聊天 = 使用聊天仓库()
    const 设置加载 = vi.spyOn(设置, 'jiaZai').mockResolvedValue(undefined as never)
    vi.spyOn(聊天, 'jiaZaiXiaoXi').mockImplementation(async (id, huiDiao) => {
      expect(id).toBe('hui-hua-1')
      聊天.jiaoSeXinXi = 基础角色() as never
      聊天.xiaoXiLieBiao = [
        {
          id: 'm1',
          hui_hua_id: 'hui-hua-1',
          fa_song_zhe_id: 'j',
          fa_song_zhe_lei_xing: 'jiaose',
          nei_rong: '',
          lei_xing: 'tuPian',
          shi_jian_chuo: Date.now(),
          yi_du: true,
          mei_ti_url: 'https://cdn.test/tu.png',
        },
      ] as never
      huiDiao?.('xiaoXi')
      huiDiao?.('jiaoSe')
    })
    const 标记 = vi.spyOn(聊天, 'biaoJiYuZai').mockImplementation(() => undefined)
    const 进度: number[] = []
    const { 预加载聊天页: 实际预加载 } = await vi.importActual<typeof import('@/composables/use聊天预加载')>('@/composables/use聊天预加载')
    const 成功 = await 实际预加载('hui-hua-1', (值) => 进度.push(值))
    expect(成功).toBe(true)
    expect(设置加载).toHaveBeenCalledTimes(1)
    expect(标记).toHaveBeenCalledWith('hui-hua-1')
    expect(进度.at(-1)).toBe(100)
    for (let i = 1; i < 进度.length; i += 1) expect(进度[i]).toBeGreaterThanOrEqual(进度[i - 1])
  })

  it('首屏消息加载失败时预加载返回假且不标记 yuZai', async () => {
    const 设置 = 使用用户设置仓库()
    const 聊天 = 使用聊天仓库()
    vi.spyOn(设置, 'jiaZai').mockResolvedValue(undefined as never)
    vi.spyOn(聊天, 'jiaZaiXiaoXi').mockImplementation(async () => {
      聊天.jiaZaiShiBai = true
    })
    const 标记 = vi.spyOn(聊天, 'biaoJiYuZai').mockImplementation(() => undefined)
    const { 预加载聊天页: 实际预加载 } = await vi.importActual<typeof import('@/composables/use聊天预加载')>('@/composables/use聊天预加载')
    expect(await 实际预加载('hui-hua-1')).toBe(false)
    expect(标记).not.toHaveBeenCalled()
  })
})

describe('FP-05 创建流程进度与偷人词', () => {
  it('确认响应带 yao_kai_kou=true 时仅预加载期显示偷人词，完成后进度100', async () => {
    shengChengJiaoSe.mockResolvedValue(基础角色())
    queRenJiaoSe.mockResolvedValue(基础角色({ id: 'jue-se-1', yao_kai_kou: true }))
    chuangJianHuiHua.mockResolvedValue({ id: 'hui-hua-1' })
    const 生成 = 使用角色生成仓库()
    生成.kaiShiLiuCheng({ muBiaoXingBie: 'female', xingGeXuanZe: 'INFP' })
    const 等待结果 = 生成.等待完成()
    await vi.waitFor(() => expect(生成.zhuangTai).toBe('yi_wan_cheng'))
    expect(await 等待结果).toBe('yi_wan_cheng')
    expect(预加载聊天页).toHaveBeenCalledWith('hui-hua-1', expect.any(Function))
    expect(生成.touRenTiShi).toBe(true)
    expect(生成.dangQianZiLiao).toMatchObject({ muBiaoXingBie: 'female' })
    expect('dangQianWenAn' in 生成).toBe(false)
    expect(生成.jinDu).toBe(100)
  })

  it('yao_kai_kou=false 时继续轮换趣味词；预加载失败也完成创建并保留进度', async () => {
    shengChengJiaoSe.mockResolvedValue(基础角色())
    queRenJiaoSe.mockResolvedValue(基础角色({ id: 'jue-se-1', yao_kai_kou: false }))
    chuangJianHuiHua.mockResolvedValue({ id: 'hui-hua-1' })
    预加载聊天页.mockResolvedValue(false)
    const 警告 = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const 生成 = 使用角色生成仓库()
    生成.kaiShiLiuCheng({ muBiaoXingBie: 'female', xingGeXuanZe: 'INFP' })
    const 等待结果 = 生成.等待完成()
    await vi.waitFor(() => expect(生成.zhuangTai).toBe('yi_wan_cheng'))
    expect(await 等待结果).toBe('yi_wan_cheng')
    expect(生成.touRenTiShi).toBe(false)
    const 趣味词 = fanYi.zaiRuLiaoTian.quWeiYu.puTong
    expect(趣味词.length).toBeGreaterThan(0)
    expect(趣味词).not.toContain(huoQuFanYi('tianJiaWeiXin', 'dengDaiTouRen'))
    expect(生成.dangQianZiLiao?.muBiaoXingBie).toBe('female')
    expect(警告).toHaveBeenCalled()
    expect(生成.jinDu).toBe(100)
  })
})
