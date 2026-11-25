import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import 消息行 from '@/components/聊天/消息行.vue'
import 语音气泡 from '@/components/聊天/语音气泡.vue'
import 全局菜单 from '@/components/全局菜单.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { faSongXiaoXi, shangChuanMeiTi } from '@/api/聊天'
import { fanYi } from '@/config/翻译表'
import type { DaiFaKuai } from '@/composables/use待发图文'
import type { 消息 } from '@/types/类型定义'

vi.mock('@/api/聊天', async (yuanShi) => {
  const 实际 = await yuanShi<typeof import('@/api/聊天')>()
  return {
    ...实际,
    faSongXiaoXi: vi.fn(),
    shangChuanMeiTi: vi.fn(),
    huoQuXiaoXi: vi.fn(),
    huoQuJiaoSeXiangQing: vi.fn(),
    biaoJiYiDu: vi.fn(),
  }
})

vi.mock('@/utils/页面刷新', () => ({ 强制刷新当前页面: vi.fn() }))

const 源码根 = resolve(__dirname, '..')
const 读源 = (xiangDui: string): string => readFileSync(resolve(源码根, xiangDui), 'utf8')
const 语音源 = 读源('components/聊天/语音气泡.vue')
const 菜单源 = 读源('components/全局菜单.vue')
const 令牌源 = 读源('styles/设计令牌.css')

const 图片媒体标识 = '11111111-1111-4111-8111-111111111111'
const 语音媒体标识 = '22222222-2222-4222-8222-222222222222'

function 服务端消息(fuGai: Partial<消息> = {}): 消息 {
  return {
    id: 'fu-wu-qi-xiao-xi',
    hui_hua_id: 'hui-hua-1',
    fa_song_zhe_id: '',
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '',
    lei_xing: 'tuPian',
    shi_jian_chuo: Date.now(),
    yi_du: false,
    ...fuGai,
  }
}

function 准备仓库() {
  const 仓库 = 使用聊天仓库()
  仓库.dangQianHuiHuaId = 'hui-hua-1'
  仓库.jiaoSeXinXi = { id: 'jue-se-1', wei_xin_ming: '小玄' } as never
  return 仓库
}

function 唯一用户消息(仓库: ReturnType<typeof 准备仓库>): 消息 {
  const 消息项 = 仓库.xiaoXiLieBiao.find((xiang) => xiang.fa_song_zhe_lei_xing === 'yonghu')
  expect(消息项).toBeDefined()
  return 消息项 as 消息
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
})

describe('FP-04 语音条圆点颜色语义', () => {
  it('喇叭圆点与两段波浪全部 currentColor，播放不改变喇叭颜色', () => {
    const 圆点规则 = 语音源.match(/\.laba-duan--1\s*\{[^}]*\}/)?.[0] ?? ''
    expect(圆点规则).toContain('fill: currentColor')
    expect(圆点规则).not.toContain('--yuyin-yuandian')
    expect(语音源).not.toContain('--yuyin-yuandian-hui')
    expect(语音源).not.toContain('--yuyin-yuandian-lan')
    expect(语音源).not.toMatch(/\.yuyin-qipao\.bofangzhong\s+\.laba-duan--1/)
    expect(语音源).toContain('fill="currentColor"')
    expect(语音源).toContain('stroke="currentColor"')
  })

  it('进度滑块圆点仅由播放态切换蓝/灰，WebKit 与 Firefox 规则同源', () => {
    const 取规则 = (xuanZeQi: string): string => {
      const zhuanYi = xuanZeQi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return 语音源.match(new RegExp(`${zhuanYi}\\s*\\{[^}]*\\}`))?.[0] ?? ''
    }
    expect(取规则('.yuyin-jindu-tiao::-webkit-slider-thumb')).toContain(
      'background: var(--yuyin-jindu-yuandian-jingtai)',
    )
    expect(取规则('.yuyin-jindu-tiao::-moz-range-thumb')).toContain(
      'background: var(--yuyin-jindu-yuandian-jingtai)',
    )
    expect(取规则('.yuyin-jindu-tiao--bofang::-webkit-slider-thumb')).toContain(
      'background: var(--yuyin-jindu-yuandian-bofang)',
    )
    expect(取规则('.yuyin-jindu-tiao--bofang::-moz-range-thumb')).toContain(
      'background: var(--yuyin-jindu-yuandian-bofang)',
    )
    expect(令牌源).toContain('--yuyin-jindu-yuandian-bofang: #1a73e8;')
    expect(令牌源).toContain('--yuyin-jindu-yuandian-jingtai: #9e9e9e;')
  })

  it('播放态给滑块加类，暂停/停止时移除，减少动效下颜色切换瞬时', () => {
    const 播放 = mount(语音气泡, {
      props: {
        xiaoXi: { mei_ti_shi_chang_hao_miao: 10000 },
        boFangZhong: true,
        xuanZhong: true,
        jinDuMiao: 0,
        zongMiao: 10,
      },
    })
    expect(播放.get('input.yuyin-jindu-tiao').classes()).toContain('yuyin-jindu-tiao--bofang')
    播放.unmount()
    const 暂停 = mount(语音气泡, {
      props: {
        xiaoXi: { mei_ti_shi_chang_hao_miao: 10000 },
        boFangZhong: false,
        xuanZhong: true,
        jinDuMiao: 0,
        zongMiao: 10,
      },
    })
    expect(暂停.get('input.yuyin-jindu-tiao').classes()).not.toContain(
      'yuyin-jindu-tiao--bofang',
    )
    暂停.unmount()
    const 动效段 = 语音源.slice(语音源.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(动效段).toContain('.laba-duan')
    expect(动效段).toContain('.yuyin-jindu-tiao::-webkit-slider-thumb')
    expect(动效段).toContain('.yuyin-jindu-tiao::-moz-range-thumb')
    expect(动效段.match(/transition: none/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
  })
})

describe('FP-04 媒体发送失败保留与重试', () => {
  it('图片上传成功但发送失败：保留气泡、灰滤镜失败态与本地预览', async () => {
    vi.mocked(shangChuanMeiTi).mockResolvedValue({ mediaId: 图片媒体标识 } as never)
    vi.mocked(faSongXiaoXi).mockRejectedValue(new Error('网络错误'))
    const 仓库 = 准备仓库()
    const 结果 = await 仓库.faSongMeiTiXiaoXi('tuPian', new Blob(['tu'], { type: 'image/png' }))
    expect(结果).toBeNull()
    const 气泡 = 唯一用户消息(仓库)
    expect(气泡.lei_xing).toBe('tuPian')
    expect(气泡.fa_song_zhong).toBe(false)
    expect(气泡.mei_ti_id).toBe(图片媒体标识)
    expect(气泡.ben_di_yu_lan_url).toMatch(/^blob:/)
    expect(气泡.ke_hu_duan_id).toBeTruthy()
    expect(仓库.faSongShiBaiJiHe.has(气泡.ke_hu_duan_id as string)).toBe(true)
    expect(仓库.faSongShiBaiJiHe.size).toBe(1)
  })

  it('已有媒体ID时重试直接走消息接口，不重复上传，成功后清除失败集合', async () => {
    vi.mocked(shangChuanMeiTi).mockResolvedValue({ mediaId: 图片媒体标识 } as never)
    vi.mocked(faSongXiaoXi).mockRejectedValueOnce(new Error('发送失败'))
    const 仓库 = 准备仓库()
    await 仓库.faSongMeiTiXiaoXi('tuPian', new Blob(['tu'], { type: 'image/png' }))
    const 失败气泡 = 唯一用户消息(仓库)
    const keHuDuanId = 失败气泡.ke_hu_duan_id as string
    vi.mocked(faSongXiaoXi).mockResolvedValue({
      xiaoXi: 服务端消息({
        id: 'fu-wu-qi-tu',
        mi_deng_jian: 失败气泡.mi_deng_jian,
        mei_ti_id: 图片媒体标识,
        mei_ti_url: 'https://cdn/tu.png',
      }),
      shiMiJi: false,
    } as never)

    const 成功 = await 仓库.chongShiFaSongXiaoXi(keHuDuanId)

    expect(成功).toBe(true)
    expect(shangChuanMeiTi).toHaveBeenCalledTimes(1)
    expect(faSongXiaoXi).toHaveBeenLastCalledWith(
      expect.objectContaining({ meiTiId: 图片媒体标识, leiXing: 'tuPian' }),
    )
    const 对齐后 = 仓库.xiaoXiLieBiao.find((xiang) => xiang.ke_hu_duan_id === keHuDuanId)
    expect(对齐后?.id).toBe('fu-wu-qi-tu')
    expect(对齐后?.fa_song_zhong).toBeFalsy()
    expect(仓库.faSongShiBaiJiHe.has(keHuDuanId)).toBe(false)
  })

  it('上传阶段失败时保留本地文件，重试重新上传后再发送', async () => {
    vi.mocked(shangChuanMeiTi).mockRejectedValueOnce(new Error('上传失败'))
    const 仓库 = 准备仓库()
    await 仓库.faSongMeiTiXiaoXi(
      'yuYin',
      new Blob(['yu-yin'], { type: 'audio/webm' }),
      { shiChangHaoMiao: 3200 },
    )
    const 失败气泡 = 唯一用户消息(仓库)
    expect(faSongXiaoXi).not.toHaveBeenCalled()
    expect(失败气泡.mei_ti_id).toBeNull()
    expect(失败气泡.fa_song_zhong).toBe(false)
    const keHuDuanId = 失败气泡.ke_hu_duan_id as string
    expect(仓库.faSongShiBaiJiHe.has(keHuDuanId)).toBe(true)

    vi.mocked(shangChuanMeiTi).mockResolvedValue({ mediaId: 语音媒体标识 } as never)
    vi.mocked(faSongXiaoXi).mockResolvedValue({
      xiaoXi: 服务端消息({
        id: 'fu-wu-qi-yin',
        mi_deng_jian: 失败气泡.mi_deng_jian,
        lei_xing: 'yuYin',
        mei_ti_id: 语音媒体标识,
        mei_ti_url: 'https://cdn/yin.webm',
      }),
      shiMiJi: false,
    } as never)

    const 成功 = await 仓库.chongShiFaSongXiaoXi(keHuDuanId)

    expect(成功).toBe(true)
    expect(shangChuanMeiTi).toHaveBeenCalledTimes(2)
    expect(faSongXiaoXi).toHaveBeenLastCalledWith(
      expect.objectContaining({ meiTiId: 语音媒体标识, leiXing: 'yuYin' }),
    )
    expect(仓库.faSongShiBaiJiHe.has(keHuDuanId)).toBe(false)
  })

  it('切换会话时清理失败媒体记录，无法再对旧消息重试', async () => {
    vi.mocked(shangChuanMeiTi).mockRejectedValueOnce(new Error('上传失败'))
    const 仓库 = 准备仓库()
    await 仓库.faSongMeiTiXiaoXi('wenJian', new Blob(['shi-pin'], { type: 'video/mp4' }))
    const 失败气泡 = 唯一用户消息(仓库)
    const keHuDuanId = 失败气泡.ke_hu_duan_id as string
    仓库.qingKongZhuangTai()
    expect(仓库.xiaoXiLieBiao).toHaveLength(0)
    expect(仓库.faSongShiBaiJiHe.size).toBe(0)
    expect(await 仓库.chongShiFaSongXiaoXi(keHuDuanId)).toBe(false)
    expect(shangChuanMeiTi).toHaveBeenCalledTimes(1)
  })

  it('图文混排失败保留气泡与内容块，重试按 nei_rong_kuai 重发而不是退化为文本', async () => {
    vi.mocked(shangChuanMeiTi).mockResolvedValue({ mediaId: 图片媒体标识 } as never)
    vi.mocked(faSongXiaoXi).mockRejectedValueOnce(new Error('发送失败'))
    const 仓库 = 准备仓库()
    const 待发块: DaiFaKuai[] = [
      {
        id: 'kuai-tu',
        lei_xing: 'tupian',
        nei_rong: '',
        wen_jian: new Blob(['tuwen'], { type: 'image/png' }),
        mei_ti_id: null,
        mei_ti_lei_bie: 'tupian',
        yu_lan_url: 'blob:tuwen-yu-lan',
        mi_deng_jian: '',
      },
      {
        id: 'kuai-wen',
        lei_xing: 'wenzi',
        nei_rong: '你好',
        wen_jian: null,
        mei_ti_id: null,
        mei_ti_lei_bie: null,
        yu_lan_url: null,
        mi_deng_jian: '',
      },
    ]
    await 仓库.faSongTuWenXiaoXi(待发块)
    const 失败气泡 = 唯一用户消息(仓库)
    const keHuDuanId = 失败气泡.ke_hu_duan_id as string
    const miDengJian = 失败气泡.mi_deng_jian
    expect(失败气泡.nei_rong_kuai).toHaveLength(2)
    expect(仓库.faSongShiBaiJiHe.has(keHuDuanId)).toBe(true)

    vi.mocked(faSongXiaoXi).mockResolvedValue({
      xiaoXi: 服务端消息({
        id: 'fu-wu-qi-tuwen',
        mi_deng_jian: miDengJian,
        lei_xing: 'wenben',
        nei_rong: '你好',
        nei_rong_kuai: 失败气泡.nei_rong_kuai,
      }),
      shiMiJi: false,
    } as never)

    const 成功 = await 仓库.chongShiFaSongXiaoXi(keHuDuanId)

    expect(成功).toBe(true)
    expect(shangChuanMeiTi).toHaveBeenCalledTimes(1)
    const 提交参数 = vi.mocked(faSongXiaoXi).mock.calls.at(-1)?.[0] as {
      neiRongKuai?: Array<{ lei_xing: string; mei_ti_id?: string; nei_rong?: string }>
      miDengJian?: string | null
    }
    expect(提交参数.neiRongKuai).toHaveLength(2)
    expect(提交参数.neiRongKuai?.[0]).toEqual(
      expect.objectContaining({ lei_xing: 'tupian', mei_ti_id: 图片媒体标识 }),
    )
    expect(提交参数.neiRongKuai?.[1]).toEqual(
      expect.objectContaining({ lei_xing: 'wenzi', nei_rong: '你好' }),
    )
    expect(提交参数.miDengJian).toBe(miDengJian)
    const 对齐后 = 仓库.xiaoXiLieBiao.find((xiang) => xiang.ke_hu_duan_id === keHuDuanId)
    expect(对齐后?.nei_rong_kuai).toHaveLength(2)
    expect(仓库.faSongShiBaiJiHe.has(keHuDuanId)).toBe(false)
  })

  it('媒体发送中加灰滤镜、失败显示红色感叹号并只在成功前保留', async () => {
    const 发送中 = mount(消息行, {
      props: { shiBenRen: true, faSongZhong: true, faSongTiShi: '发送中' },
      slots: { default: '<div class="ce-shi-mei-ti">图片</div>' },
    })
    expect(发送中.get('.qipao-waike').classes()).toContain('qipao-fasong-zhong')
    expect(发送中.find('.fasong-shibai-jiaobiao').exists()).toBe(false)
    发送中.unmount()

    const 失败 = mount(消息行, {
      props: { shiBenRen: true, faSongShiBai: true, faSongTiShi: '重新发送' },
      slots: { default: '<div class="ce-shi-mei-ti">图片</div>' },
    })
    expect(失败.get('.qipao-waike').classes()).not.toContain('qipao-fasong-zhong')
    const 徽标 = 失败.get('.fasong-shibai-jiaobiao')
    expect(徽标.text()).toBe('!')
    expect(徽标.attributes('title')).toBe('重新发送')
    await 徽标.trigger('click')
    expect(失败.emitted('chongXinFaSong')).toHaveLength(1)
    失败.unmount()
  })
})

describe('FP-04 聊天输入提示只由输入态驱动', () => {
  it('聊天页在任意 aiZhuangTai 取值下渲染文本都不出现偷人文案', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const 路由 = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/chat/:huiHuaId', name: 'liaoTian', component: { template: '<div />' } },
      ],
    })
    await 路由.push({ name: 'liaoTian', params: { huiHuaId: 'hui-hua-1' } })
    await 路由.isReady()
    const 仓库 = 使用聊天仓库()
    仓库.jiaoSeXinXi = { id: 'jue-se-1', wei_xin_ming: '小玄' } as never
    const 壳 = mount(全局菜单, { global: { plugins: [pinia, 路由] } })
    try {
      for (const zhuangTai of ['kong_xian', 'zheng_zai_shu_ru', 'ren_yi_wei_zhi_zhuang_tai']) {
        仓库.aiZhuangTai = zhuangTai
        await nextTick()
        expect(壳.text(), `aiZhuangTai=${zhuangTai} 时不得渲染偷人文案`).not.toContain('对方正在偷人')
      }
      仓库.aiZhuangTai = 'zheng_zai_shu_ru'
      await nextTick()
      expect(壳.get('.duifang-shuru-tishi').text()).toBe('对方正在输入...')
    } finally {
      壳.unmount()
    }
  })

  it('源码不再把载入页词条接进聊天输入提示，文案恰为三个半角点', () => {
    expect(菜单源).not.toContain('dengDaiTouRen')
    expect(菜单源).toMatch(
      /shiLiaoTianYe\.value\s*&&\s*!!聊天仓库\.jiaoSeXinXi\s*&&\s*聊天仓库\.zhengZaiShuRu/,
    )
    expect(fanYi.liaoTian.duiFangZhengZaiShuRu).toBe('对方正在输入...')
  })

  it('进入聊天页不显示提示，输入态为真才显示，退出输入态即隐藏', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const 路由 = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/chat/:huiHuaId', name: 'liaoTian', component: { template: '<div />' } },
      ],
    })
    await 路由.push({ name: 'liaoTian', params: { huiHuaId: 'hui-hua-1' } })
    await 路由.isReady()
    const 仓库 = 使用聊天仓库()
    仓库.jiaoSeXinXi = { id: 'jue-se-1', wei_xin_ming: '小玄' } as never
    const 壳 = mount(全局菜单, { global: { plugins: [pinia, 路由] } })
    try {
      await nextTick()
      expect(壳.find('.duifang-shuru-tishi').exists()).toBe(false)
      仓库.aiZhuangTai = 'zheng_zai_shu_ru'
      await nextTick()
      expect(壳.get('.duifang-shuru-tishi').text()).toBe('对方正在输入...')
      仓库.qingKongZhuangTai()
      await nextTick()
      expect(壳.find('.duifang-shuru-tishi').exists()).toBe(false)
    } finally {
      壳.unmount()
    }
  })
})
