import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { ref } from 'vue'
import { fanYi, huoQuFanYi } from '@/config/translations'
import {
  LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI,
  MEI_TI_XIAO_XI_LEI_XING,
  WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN,
  huoQuMeiTiYinYongZhanWei,
} from '@/config/消息配置'
import { use长按菜单, huoQuYinYongZhaiYao } from '@/composables/use长按菜单'
import YinYongQiPaoKuai from '@/components/聊天/引用气泡块.vue'
import 聊天页面 from '@/views/聊天页面.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { faSongXiaoXi, shangChuanMeiTi } from '@/api/聊天'
import { xieRuShuRuQu } from './输入区夹具'
import type { 消息 } from '@/types'

/**
 * FP-08d（需求 #5 的最后两个洞，第三波 Spec 轴审计抓到）：
 *  ①媒体直发路径此前**既不带被引用消息、也不清引用态** ⇒ 用户带着待发引用条直发一条语音/文件/贴纸后，
 *    引用条残留悬挂，且下一条文字消息会**继承上一条的引用**（新 bug）。选定方案＝补引用参数 + 成功必清，
 *    与文本 / 图文混排同口径（判据全部走真正发出的调用入参与 DOM，不碰源码文本）。
 *  ②图片右键菜单没有 `yinYong` 项 ⇒ 图片根本无法被引用。补项后引用条 / 气泡内引用块仍复用 FP-09 两件套。
 *  ③媒体目标的摘要一律吃 translations 键（新增 yinYongTuPianZhanWei / yinYongBiaoQingBaoZhanWei /
 *    yinYongWenJianZhanWei；语音沿用既有 yinYongYuYinZhanWei），撤回/取不到目标的既有占位优先级不变。
 */

vi.mock('@/api/聊天', () => ({
  huoQuXiaoXi: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
  faSongXiaoXi: vi.fn(),
  shangChuanMeiTi: vi.fn(),
  DUO_MEI_TI_LEI_XING_SHANG_CHUAN_LEI_BIE: {
    tuPian: 'tupian',
    biaoQingBao: 'biaoqingshu',
    yuYin: 'yuyin',
    wenJian: 'wenjian',
  },
  cheHuiXiaoXi: vi.fn(),
  biaoJiYiDu: vi.fn(),
  fanYiWenBen: vi.fn(),
  zhuanXieYuYin: vi.fn(),
  chuangJianHuiHua: vi.fn(),
  chongQianMeiTiURL: vi.fn(),
  huoQuJunShiLieBiao: vi.fn().mockResolvedValue({ junShiLieBiao: [] }),
  huoQuJiaoSeXiangQing: vi.fn().mockResolvedValue({
    jiao_se: {
      id: 'j1',
      ming_zi: '测试角色',
      wei_xin_ming: '小甜心',
      tou_xiang: '',
      xing_bie: 'nv',
      nian_ling: 22,
      wai_mao: '',
      xing_ge: '',
      bei_jing_gu_shi: '',
      xi_hao: [],
      yan_yu_feng_ge: '',
      biao_qian: [],
      re_du: 0,
      chuang_jian_shi_jian: new Date().toISOString(),
    },
    dang_an_zhuang_tai: null,
  }),
  huoQuFuPan: vi.fn().mockResolvedValue({
    fu_pan_nei_rong: null,
    fu_pan_shi_jian_xian: [],
    fu_pan_pi_zhu: null,
    jun_shi_zhi_dao_ji_lu: [],
    guan_jian_shi_jian: [],
    jia_zai_zhong: false,
  }),
}))

vi.mock('@/api/通知', () => ({
  huoQuTongZhiLieBiao: vi.fn().mockResolvedValue({ lie_biao: [], wei_du_shu: 0 }),
  biaoJiTongZhiYiDu: vi.fn(),
  biaoJiQuanBuTongZhiYiDu: vi.fn(),
}))

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn(), connected: false })),
}))

const 会话ID = 'h1'
const 文字被引用ID = 'w1'
const 图片被引用ID = 'tu-1'
const 上传媒体ID = 'm-shang-chuan'
const QIAN_MING_URL = '/api/媒体/' + 'a'.repeat(64) + '?e=1893456000&u=u1&t=1&s=deadbeef'

function zaoXiaoXi(gengDuo: Partial<消息> = {}): 消息 {
  return {
    id: 文字被引用ID,
    hui_hua_id: 会话ID,
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: '被引用的那句原文',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: true,
    ...gengDuo,
  }
}

function zaoTuPianXiaoXi(gengDuo: Partial<消息> = {}): 消息 {
  return zaoXiaoXi({
    id: 图片被引用ID,
    nei_rong: '',
    lei_xing: 'tuPian',
    mei_ti_id: 'mt-1',
    mei_ti_url: QIAN_MING_URL,
    ...gengDuo,
  })
}

function 投递成功(附加: Record<string, unknown> = {}) {
  return {
    xiaoXi: {
      id: 'luo-ku-1',
      hui_hua_id: 会话ID,
      fa_song_zhe_id: 'u1',
      fa_song_zhe_lei_xing: 'yonghu',
      nei_rong: '',
      lei_xing: 'wenben',
      shi_jian_chuo: Date.now(),
      yi_du: true,
      ...附加,
    },
    shiMiJi: false,
  }
}

const yiGuaZai: Array<{ unmount: () => void }> = []

async function mountChat(xiaoXiLieBiao: 消息[]) {
  const luYou = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/chat/:huiHuaId', name: 'liaoTian', component: 聊天页面 }],
  })
  await luYou.push('/chat/' + 会话ID)
  const pinia = createPinia()
  setActivePinia(pinia)
  const 用户仓库 = 使用用户仓库()
  用户仓库.dangQianYongHu = {
    id: 'u1',
    shou_ji_hao: '13800138000',
    yong_hu_ming: '测试用户',
    ni_cheng: '测试昵称',
    xing_bie: 'male',
    mu_biao_xing_bie: 'female',
    xing_ge_xuan_ze: 'INTJ',
    ren_she_biao_qian: 'neiLianXueBa',
    yun_xu_zha_nan_zha_nv: false,
    tou_xiang: null,
    sheng_ri: null,
    qian_ming: null,
    huo_yue_ren_she_id: null,
    hai_wang_fen_shu: 0,
    chuang_jian_shi_jian: new Date().toISOString(),
    geng_xin_shi_jian: new Date().toISOString(),
  }
  用户仓库.令牌 = 'test-token'
  const 聊天仓库 = 使用聊天仓库()
  聊天仓库.jiaoSeXinXi = {
    id: 'j1',
    ming_zi: '测试角色',
    wei_xin_ming: '小甜心',
    tou_xiang: '',
    xing_bie: 'nv',
    nian_ling: 22,
    wai_mao: '',
    xing_ge: '',
    bei_jing_gu_shi: '',
    xi_hao: [],
    yan_yu_feng_ge: '',
    biao_qian: [],
    re_du: 0,
    chuang_jian_shi_jian: new Date().toISOString(),
  }
  const wrapper = mount(聊天页面, { global: { plugins: [pinia, luYou] }, attachTo: document.body })
  yiGuaZai.push(wrapper)
  await flushPromises()
  聊天仓库.xiaoXiLieBiao = xiaoXiLieBiao
  await flushPromises()
  return { wrapper, 聊天仓库 }
}

/** 打开某条消息的右键菜单，返回浮层里的菜单按钮文本（DOM 结构，不读源码） */
async function daKaiYouJianCaiDan(
  wrapper: Awaited<ReturnType<typeof mountChat>>['wrapper'],
  xiaBiao: number,
): Promise<string[]> {
  await wrapper.findAll('.xiaoxi-xiangmu')[xiaBiao].trigger('contextmenu', {
    clientX: 88,
    clientY: 120,
  })
  await flushPromises()
  return [...document.body.querySelectorAll('.chehui-caidan .chehui-xiangmu')].map(
    (anNiu) => anNiu.textContent ?? '',
  )
}

function dianCaiDanXiang(wenBen: string): void {
  const anNiu = [...document.body.querySelectorAll('.chehui-caidan .chehui-xiangmu')].find(
    (item) => item.textContent === wenBen,
  )
  expect(anNiu, `菜单里找不到「${wenBen}」项`).toBeTruthy()
  anNiu?.click()
}

async function shuRuBingFaSong(
  wrapper: Awaited<ReturnType<typeof mountChat>>['wrapper'],
  neiRong: string,
) {
  await xieRuShuRuQu(wrapper, neiRong)
  await flushPromises()
  await wrapper.find('.fasong-anniu').trigger('click')
  await flushPromises()
  await flushPromises()
}

/** 文件选择口：直发入口的真实触发面（change 事件 + files），不碰任何源码文本 */
async function xuanZeWenJian(
  wrapper: Awaited<ReturnType<typeof mountChat>>['wrapper'],
  ming: string,
) {
  const shuRu = wrapper
    .findAll('input[type="file"]')
    .find((xiang) => xiang.attributes('accept') === WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN)
  expect(shuRu, '找不到文件选择入口').toBeTruthy()
  Object.defineProperty(shuRu!.element, 'files', {
    value: [new File(['内容'], ming, { type: 'text/plain' })],
    configurable: true,
  })
  await shuRu!.trigger('change')
  await flushPromises()
  await flushPromises()
}

function yinYongTiaoZhaiYao(wrapper: Awaited<ReturnType<typeof mountChat>>['wrapper']): string {
  const jie = wrapper.find('.yinyong-tiao .yinyong-tiao-zhaiyao')
  expect(jie.exists(), '引用条不在（引用态没被设上）').toBe(true)
  // 引用条带发送者前缀（`名字: 摘要`），气泡内引用块在同一次挂载里不带 ⇒ 比较时剥掉前缀
  return jie.text().replace(/^[^:]*:\s/, '').trim()
}

function 挂引用气泡块(lieBiao: 消息[], beiYongID: string) {
  const 包 = mount(YinYongQiPaoKuai, {
    props: {
      beiYongXiaoXiId: beiYongID,
      lieBiao,
      gunDongRongQi: () => null,
    },
  })
  yiGuaZai.push(包)
  return 包
}

function 气泡块摘要(包: ReturnType<typeof 挂引用气泡块>): string {
  const jie = 包.find('.yinyong-kuai-zhaiyao')
  return jie.exists() ? (jie.text() ?? '').trim() : (包.find('.yinyong-kuai-chehui').text() ?? '').trim()
}

beforeEach(() => {
  vi.mocked(faSongXiaoXi).mockReset()
  vi.mocked(shangChuanMeiTi).mockReset()
  vi.mocked(shangChuanMeiTi).mockResolvedValue({
    mediaId: 上传媒体ID,
    leiBie: 'tupian',
    yiCunZai: false,
  } as never)
})

afterEach(() => {
  while (yiGuaZai.length) yiGuaZai.pop()?.unmount()
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('FP-08d ① 媒体直发带引用、成功必清（store 层：真正发出的入参）', () => {
  function 准备仓库() {
    setActivePinia(createPinia())
    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.dangQianHuiHuaId = 会话ID
    return 聊天仓库
  }

  it.each(['yuYin', 'wenJian', 'biaoQingBao', 'tuPian'] as const)(
    '%s 直发：入参对象带 yinYong.beiYongXiaoXiId，乐观气泡同时钉上 bei_yong_xiao_xi_id',
    async (leiXing) => {
      // 在 api 被调的那一刻读列表 ⇒ 拿到的是**乐观气泡**（尚未与服务端行对齐）
      const 乐观快照: Array<消息 | undefined> = []
      vi.mocked(faSongXiaoXi).mockImplementation(() => {
        乐观快照.push(使用聊天仓库().xiaoXiLieBiao[0])
        return Promise.resolve(
          投递成功({ lei_xing: leiXing, bei_yong_xiao_xi_id: 文字被引用ID }) as never,
        )
      })
      const 聊天仓库 = 准备仓库()
      const wenJian = new Blob(['bin'], { type: 'application/octet-stream' })
      const jieGuo = await 聊天仓库.faSongMeiTiXiaoXi(
        leiXing,
        wenJian as unknown as File,
        { shiChangHaoMiao: 3 },
        文字被引用ID,
      )
      expect(jieGuo).toBeTruthy()
      expect(vi.mocked(faSongXiaoXi)).toHaveBeenCalledTimes(1)
      expect(vi.mocked(faSongXiaoXi).mock.calls[0][0]).toMatchObject({
        huiHuaId: 会话ID,
        leiXing,
        meiTiId: 上传媒体ID,
        yinYong: { beiYongXiaoXiId: 文字被引用ID },
      })
      expect(乐观快照[0]?.bei_yong_xiao_xi_id).toBe(文字被引用ID)
      expect(聊天仓库.xiaoXiLieBiao[0].bei_yong_xiao_xi_id).toBe(文字被引用ID)
    },
  )

  it('无引用态直发：入参的 yinYong 缺席（undefined 即不进 body，body 逐键与改前相同）', async () => {
    vi.mocked(faSongXiaoXi).mockResolvedValue(投递成功({ lei_xing: 'yuYin' }) as never)
    const 聊天仓库 = 准备仓库()
    await 聊天仓库.faSongMeiTiXiaoXi(
      'yuYin',
      new Blob(['yin'], { type: 'audio/webm' }) as unknown as File,
      {},
    )
    const 实参 = vi.mocked(faSongXiaoXi).mock.calls[0][0] as Record<string, unknown>
    expect(实参.yinYong).toBeUndefined()
    expect(Object.keys(实参).sort()).toEqual(['huiHuaId', 'leiXing', 'meiTiId', 'miDengJian', 'neiRong'])
    expect(聊天仓库.xiaoXiLieBiao[0]).not.toHaveProperty('bei_yong_xiao_xi_id')
  })
})

describe('FP-08d ① 媒体直发清引用态（页面级：引用条消失、下一条不继承）', () => {
  it('右键引用 → 选文件直发：请求带 beiYongXiaoXiId，发完引用条消失，下一条文字不再带引用', async () => {
    vi.mocked(faSongXiaoXi).mockResolvedValue(投递成功() as never)
    const { wrapper } = await mountChat([zaoXiaoXi()])
    await daKaiYouJianCaiDan(wrapper, 0)
    dianCaiDanXiang(huoQuFanYi('liaoTian', 'yinYong'))
    await flushPromises()
    expect(wrapper.find('.yinyong-tiao').exists()).toBe(true)

    await xuanZeWenJian(wrapper, 'bei-zhao-de.txt')
    expect(vi.mocked(faSongXiaoXi).mock.calls[0][0]).toMatchObject({
      leiXing: 'wenJian',
      meiTiId: 上传媒体ID,
      yinYong: { beiYongXiaoXiId: 文字被引用ID },
    })
    // 悬挂面：直发后引用条必须消失（旧形态这里仍挂着，且下一条文字会继承它）
    expect(wrapper.find('.yinyong-tiao').exists()).toBe(false)

    await shuRuBingFaSong(wrapper, '直发之后接着敲的一句')
    expect(vi.mocked(faSongXiaoXi).mock.calls[1][0].neiRong).toBe('直发之后接着敲的一句')
    expect(vi.mocked(faSongXiaoXi).mock.calls[1][0].yinYong).toBeUndefined()
  })

  it('媒体直发失败不清引用态：引用条留在原地（与文本/图文同一口径）', async () => {
    vi.mocked(faSongXiaoXi).mockRejectedValue(new Error('网络异常'))
    const { wrapper } = await mountChat([zaoXiaoXi()])
    await daKaiYouJianCaiDan(wrapper, 0)
    dianCaiDanXiang(huoQuFanYi('liaoTian', 'yinYong'))
    await flushPromises()
    await xuanZeWenJian(wrapper, 'shi-bai.txt')
    expect(wrapper.find('.yinyong-tiao').exists()).toBe(true)
  })
})

describe('FP-08d ② 图片右键菜单补引用项（页面级接线，复用 FP-09 两件套）', () => {
  it('图片气泡的菜单里有「引用」，点它设上引用态且不误走「添加到表情」', async () => {
    const { wrapper } = await mountChat([zaoTuPianXiaoXi()])
    const 菜单项 = await daKaiYouJianCaiDan(wrapper, 0)
    expect(菜单项).toContain(huoQuFanYi('liaoTian', 'yinYong'))
    expect(菜单项).toContain(huoQuFanYi('liaoTian', 'tianJiaDaoBiaoQing'))
    dianCaiDanXiang(huoQuFanYi('liaoTian', 'yinYong'))
    await flushPromises()
    // 引用条出现 = 引用态被设上；同时菜单浮层已关（若误投给「添加到表情」，引用态恒为 null）
    expect(document.body.querySelectorAll('.chehui-caidan .chehui-xiangmu')).toHaveLength(0)
    expect(wrapper.find('.yinyong-tiao').exists()).toBe(true)
  })

  it('被引用的图片能一路发到服务端：文字消息 body 带图片那条的 ID', async () => {
    vi.mocked(faSongXiaoXi).mockResolvedValue(投递成功() as never)
    const { wrapper } = await mountChat([zaoTuPianXiaoXi()])
    await daKaiYouJianCaiDan(wrapper, 0)
    dianCaiDanXiang(huoQuFanYi('liaoTian', 'yinYong'))
    await flushPromises()
    await shuRuBingFaSong(wrapper, '引用了上面那张图')
    expect(vi.mocked(faSongXiaoXi).mock.calls[0][0]).toMatchObject({
      neiRong: '引用了上面那张图',
      yinYong: { beiYongXiaoXiId: 图片被引用ID },
    })
  })

  it('非图片气泡（文字/语音/文件/贴纸）不会被接到图片菜单', async () => {
    const { wrapper } = await mountChat([
      zaoXiaoXi({ id: 'b1', lei_xing: 'biaoQingBao' }),
      zaoXiaoXi({ id: 'f1', lei_xing: 'wenJian' }),
    ])
    const 菜单项 = await daKaiYouJianCaiDan(wrapper, 0)
    expect(菜单项).not.toContain(huoQuFanYi('liaoTian', 'tianJiaDaoBiaoQing'))
    expect(菜单项).not.toContain(huoQuFanYi('liaoTian', 'yinYong'))
  })
})

describe('FP-08d ③ 媒体引用摘要一律吃 translations 既有键（解析值 + DOM 结构）', () => {
  it('三种媒体的占位各自解析为翻译值，语音与文字返回 null（仍归截断唯一出口）', () => {
    expect(huoQuMeiTiYinYongZhanWei('tuPian')).toBe(fanYi.liaoTian.yinYongTuPianZhanWei)
    expect(huoQuMeiTiYinYongZhanWei('biaoQingBao')).toBe(fanYi.liaoTian.yinYongBiaoQingBaoZhanWei)
    expect(huoQuMeiTiYinYongZhanWei('wenJian')).toBe(fanYi.liaoTian.yinYongWenJianZhanWei)
    expect(huoQuMeiTiYinYongZhanWei('yuYin')).toBeNull()
    expect(huoQuMeiTiYinYongZhanWei('wenben')).toBeNull()
  })

  it('每种媒体类型都有非空摘要口径，且每个键都在 liaoTian 语言档里存在', () => {
    const 全覆盖 = MEI_TI_XIAO_XI_LEI_XING.every((leiXing) => {
      const zhanWei =
        huoQuMeiTiYinYongZhanWei(leiXing) ?? huoQuYinYongZhaiYao(zaoXiaoXi({ lei_xing: leiXing }))
      return typeof zhanWei === 'string' && zhanWei.trim().length > 0
    })
    expect(全覆盖, '新增媒体类型却没有摘要口径即红').toBe(true)
    for (const jian of ['yinYongTuPianZhanWei', 'yinYongBiaoQingBaoZhanWei', 'yinYongWenJianZhanWei']) {
      expect(fanYi.liaoTian).toHaveProperty(jian)
      expect((fanYi.liaoTian as Record<string, string>)[jian].trim()).not.toBe('')
    }
  })

  it('引用条与气泡内引用块对同一张图解析出同一份摘要（两件套不得各写一份）', async () => {
    const 图 = zaoTuPianXiaoXi()
    const { wrapper } = await mountChat([图])
    await daKaiYouJianCaiDan(wrapper, 0)
    dianCaiDanXiang(huoQuFanYi('liaoTian', 'yinYong'))
    await flushPromises()
    const 包 = 挂引用气泡块([图], 图片被引用ID)
    expect(yinYongTiaoZhaiYao(wrapper)).toBe(气泡块摘要(包))
    expect(气泡块摘要(包)).toBe(fanYi.liaoTian.yinYongTuPianZhanWei)
  })

  it('语音 / 文件 / 贴纸目标的气泡摘要各自取占位，文字目标仍走截断唯一出口', () => {
    const 语音 = zaoXiaoXi({ id: 'y1', lei_xing: 'yuYin', nei_rong: '' })
    expect(气泡块摘要(挂引用气泡块([语音], 'y1'))).toBe(fanYi.liaoTian.yinYongYuYinZhanWei)
    const 文件 = zaoXiaoXi({ id: 'f1', lei_xing: 'wenJian', nei_rong: '' })
    expect(气泡块摘要(挂引用气泡块([文件], 'f1'))).toBe(fanYi.liaoTian.yinYongWenJianZhanWei)
    const 贴纸 = zaoXiaoXi({ id: 'b1', lei_xing: 'biaoQingBao', nei_rong: '' })
    expect(气泡块摘要(挂引用气泡块([贴纸], 'b1'))).toBe(fanYi.liaoTian.yinYongBiaoQingBaoZhanWei)
    const 长文 = zaoXiaoXi({
      id: 'w9',
      nei_rong: '一'.repeat(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yinYongZhaiYaoZuiDaZiFu + 5),
    })
    expect(气泡块摘要(挂引用气泡块([长文], 'w9'))).toBe(
      `${'一'.repeat(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yinYongZhaiYaoZuiDaZiFu)}...`,
    )
  })

  it('已撤回的媒体目标仍走既有撤回占位（媒体占位不得越过撤回分支）', () => {
    const 撤回图 = zaoTuPianXiaoXi({ yi_che_hui: true, nei_rong: '已撤回的消息' })
    expect(气泡块摘要(挂引用气泡块([撤回图], 图片被引用ID))).toBe(
      fanYi.liaoTian.duiFangCheHuiLeYiTiaoXiaoXi,
    )
    expect(气泡块摘要(挂引用气泡块([], 图片被引用ID))).toBe(
      fanYi.liaoTian.duiFangCheHuiLeYiTiaoXiaoXi,
    )
  })
})

describe('FP-08d ④ 菜单结构（解析值判定，不读源码文本）', () => {
  it('图片菜单的每一项都能在 liaoTian 语言档里取到非空文案', () => {
    for (const xiang of LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.tuPianCaiDanXiang) {
      expect(fanYi.liaoTian).toHaveProperty(xiang)
      expect(huoQuFanYi('liaoTian', xiang).trim()).not.toBe('')
    }
  })

  it('三个右键菜单的引用项齐备（文本/语音/图片）', () => {
    const 含引用 = (清单: readonly string[]) => 清单.includes('yinYong')
    expect([
      含引用(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.wenBenCaiDanXiang),
      含引用(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yuYinCaiDanXiang),
      含引用(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.tuPianCaiDanXiang),
    ]).toEqual([true, true, true])
  })

  it('composable 的图片菜单分派不含引用项时才落到「添加到表情」，故页面侧接线是唯一出口', async () => {
    const tianJiaDaoBiaoQing = vi.fn().mockResolvedValue(undefined)
    const caiDan = use长按菜单({
      dangQianShiJian: ref(Date.now()),
      cheHuiXiaoXi: async () => undefined,
      tianJiaDaoBiaoQing,
    })
    caiDan.daKaiTuPianCaiDan(zaoTuPianXiaoXi(), {} as MouseEvent)
    await caiDan.zhiXingTuPianCaiDanXiang('tianJiaDaoBiaoQing')
    expect(tianJiaDaoBiaoQing).toHaveBeenCalledTimes(1)
    expect(caiDan.yinYongXiaoXi.value).toBeNull()
  })
})

