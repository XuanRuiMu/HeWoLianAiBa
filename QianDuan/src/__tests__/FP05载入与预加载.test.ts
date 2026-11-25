




























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
