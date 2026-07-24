/* eslint-disable vue/one-component-per-file */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h, defineComponent } from 'vue'
import 错误边界 from '@/components/错误边界.vue'
import { huoQuFanYi } from '@/config/translations'
import {
  sheZhiCuoWuShangBaoHanShu,
  chuFaCuoWuShangBao,
  anZhuangQuanJuCuoWuJianTingQi,
  moRenShangBaoHanShu,
  chuShiHuaCuoWuShangBao,
} from '@/utils/错误上报'

function chuangJianPaoCuoZuJian(cuoWu: unknown) {
  return defineComponent({
    name: 'PaoCuoZuJian',
    setup() {
      throw cuoWu
    },
    render() {
      return h('div', '永远不会渲染')
    },
  })
}

function chuangJianZhengChangZuJian() {
  return defineComponent({
    name: 'ZhengChangZuJian',
    render() {
      return h('div', { class: 'zhengchang-neirong' }, '正常内容')
    },
  })
}

function chuangJianKeKongZuJian() {
  const zhuangTai = { paoCuo: true }
  const ZuJian = defineComponent({
    name: 'KeKongZuJian',
    setup() {
      if (zhuangTai.paoCuo) {
        zhuangTai.paoCuo = false
        throw new Error('首次渲染抛错')
      }
      return {}
    },
    render() {
      return h('div', { class: 'kekong-neirong' }, '恢复渲染')
    },
  })
  return { ZuJian, zhuangTai }
}

describe('FP-03 前端全局错误边界', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    sheZhiCuoWuShangBaoHanShu(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    sheZhiCuoWuShangBaoHanShu(null)
  })

  describe('错误边界组件', () => {
    it('无错误时渲染子组件内容', () => {
      const PaoCuo = chuangJianZhengChangZuJian()
      const wrapper = mount(错误边界, {
        slots: { default: h(PaoCuo) },
      })
      expect(wrapper.find('.zhengchang-neirong').exists()).toBe(true)
      expect(wrapper.find('.cuowu-tishi').exists()).toBe(false)
    })

    it('子组件抛出错误时显示错误提示 UI', async () => {
      const PaoCuo = chuangJianPaoCuoZuJian(new TypeError('渲染失败'))
      const wrapper = mount(错误边界, {
        slots: { default: h(PaoCuo) },
      })
      await flushPromises()
      expect(wrapper.find('.cuowu-tishi').exists()).toBe(true)
      expect(wrapper.find('.zhengchang-neirong').exists()).toBe(false)
    })

    it('错误提示包含翻译标题与描述', async () => {
      const PaoCuo = chuangJianPaoCuoZuJian(new Error('boom'))
      const wrapper = mount(错误边界, {
        slots: { default: h(PaoCuo) },
      })
      await flushPromises()
      expect(wrapper.find('.cuowu-biaoti').text()).toBe(huoQuFanYi('tongYong', 'cuoWuBianJie'))
      expect(wrapper.find('.cuowu-miaoshu').text()).toBe(
        huoQuFanYi('tongYong', 'cuoWuBianJieTiShi'),
      )
    })

    it('错误提示包含刷新页面按钮', async () => {
      const PaoCuo = chuangJianPaoCuoZuJian(new Error('boom'))
      const wrapper = mount(错误边界, {
        slots: { default: h(PaoCuo) },
      })
      await flushPromises()
      const anNiu = wrapper.find('.shuaxin-anniu')
      expect(anNiu.exists()).toBe(true)
      expect(anNiu.text()).toBe(huoQuFanYi('tongYong', 'cuoWuBianJieShuaXin'))
    })

    it('点击刷新按钮调用 window.location.reload', async () => {
      const reloadSpy = vi.fn()
      vi.stubGlobal('location', { reload: reloadSpy })
      const PaoCuo = chuangJianPaoCuoZuJian(new Error('boom'))
      const wrapper = mount(错误边界, {
        slots: { default: h(PaoCuo) },
      })
      await flushPromises()
      await wrapper.find('.shuaxin-anniu').trigger('click')
      expect(reloadSpy).toHaveBeenCalledOnce()
      vi.unstubAllGlobals()
    })

    it('点击清除错误按钮重置错误状态并恢复子组件渲染', async () => {
      const { ZuJian } = chuangJianKeKongZuJian()
      const wrapper = mount(错误边界, {
        slots: { default: h(ZuJian) },
      })
      await flushPromises()
      expect(wrapper.find('.cuowu-tishi').exists()).toBe(true)
      await wrapper.find('.chongzhi-anniu').trigger('click')
      await flushPromises()
      expect(wrapper.find('.cuowu-tishi').exists()).toBe(false)
      expect(wrapper.find('.kekong-neirong').exists()).toBe(true)
    })

    it('清除错误按钮文案使用翻译', async () => {
      const PaoCuo = chuangJianPaoCuoZuJian(new Error('boom'))
      const wrapper = mount(错误边界, {
        slots: { default: h(PaoCuo) },
      })
      await flushPromises()
      expect(wrapper.find('.chongzhi-anniu').text()).toBe(
        huoQuFanYi('tongYong', 'cuoWuBianJieChongZhi'),
      )
    })

    it('错误捕获时触发 cuoWuBuHuo 事件并附带错误信息', async () => {
      const cuoWu = new TypeError('类型错误')
      const PaoCuo = chuangJianPaoCuoZuJian(cuoWu)
      const onCuoWuBuHuo = vi.fn()
      mount(错误边界, {
        slots: { default: h(PaoCuo) },
        attrs: { onCuoWuBuHuo },
      })
      await flushPromises()
      expect(onCuoWuBuHuo).toHaveBeenCalledOnce()
      const canShu = onCuoWuBuHuo.mock.calls[0][0]
      expect(canShu.cuoWu).toBe(cuoWu)
      expect(typeof canShu.xinXi).toBe('string')
      expect(typeof canShu.shiJianChuo).toBe('number')
      expect(canShu.leiXing).toBe('leiXing')
    })

    it('TypeError 归类为 leiXing', async () => {
      const PaoCuo = chuangJianPaoCuoZuJian(new TypeError('x'))
      const onCuoWuBuHuo = vi.fn()
      mount(错误边界, {
        slots: { default: h(PaoCuo) },
        attrs: { onCuoWuBuHuo },
      })
      await flushPromises()
      expect(onCuoWuBuHuo.mock.calls[0][0].leiXing).toBe('leiXing')
    })

    it('SyntaxError 归类为 yuFa', async () => {
      const PaoCuo = chuangJianPaoCuoZuJian(new SyntaxError('x'))
      const onCuoWuBuHuo = vi.fn()
      mount(错误边界, {
        slots: { default: h(PaoCuo) },
        attrs: { onCuoWuBuHuo },
      })
      await flushPromises()
      expect(onCuoWuBuHuo.mock.calls[0][0].leiXing).toBe('yuFa')
    })

    it('普通 Error 归类为 weiZhi', async () => {
      const PaoCuo = chuangJianPaoCuoZuJian(new Error('x'))
      const onCuoWuBuHuo = vi.fn()
      mount(错误边界, {
        slots: { default: h(PaoCuo) },
        attrs: { onCuoWuBuHuo },
      })
      await flushPromises()
      expect(onCuoWuBuHuo.mock.calls[0][0].leiXing).toBe('weiZhi')
    })

    it('defineExpose 暴露 huoQuDangQianCuoWu 与 qingChuCuoWu 方法', async () => {
      const cuoWu = new Error('test')
      const PaoCuo = chuangJianPaoCuoZuJian(cuoWu)
      const wrapper = mount(错误边界, {
        slots: { default: h(PaoCuo) },
      })
      await flushPromises()
      const vm = wrapper.vm as unknown as {
        huoQuDangQianCuoWu: () => unknown
        qingChuCuoWu: () => void
      }
      expect(vm.huoQuDangQianCuoWu()).toBe(cuoWu)
      vm.qingChuCuoWu()
      expect(vm.huoQuDangQianCuoWu()).toBeNull()
    })

    it('错误提示含 role=alert 与 aria-live 属性', async () => {
      const PaoCuo = chuangJianPaoCuoZuJian(new Error('x'))
      const wrapper = mount(错误边界, {
        slots: { default: h(PaoCuo) },
      })
      await flushPromises()
      const rongQi = wrapper.find('.cuowu-tishi')
      expect(rongQi.attributes('role')).toBe('alert')
      expect(rongQi.attributes('aria-live')).toBe('assertive')
    })
  })

  describe('错误上报 hook', () => {
    it('未设置上报函数时 chuFaCuoWuShangBao 安全无副作用', () => {
      expect(() =>
        chuFaCuoWuShangBao({
          leiBie: 'vue',
          cuoWu: new Error('x'),
          shiJianChuo: Date.now(),
        }),
      ).not.toThrow()
    })

    it('设置后 chuFaCuoWuShangBao 调用上报函数', () => {
      const hanShu = vi.fn()
      sheZhiCuoWuShangBaoHanShu(hanShu)
      const canShu = {
        leiBie: 'vue' as const,
        cuoWu: new Error('x'),
        shiJianChuo: 123,
        fuJia: { a: 1 },
      }
      chuFaCuoWuShangBao(canShu)
      expect(hanShu).toHaveBeenCalledWith(canShu)
    })

    it('上报函数自身抛错不会冒泡', () => {
      const hanShu = vi.fn(() => {
        throw new Error('上报失败')
      })
      sheZhiCuoWuShangBaoHanShu(hanShu)
      expect(() =>
        chuFaCuoWuShangBao({
          leiBie: 'weiZhi',
          cuoWu: null,
          shiJianChuo: 1,
        }),
      ).not.toThrow()
    })

    it('传 null 清除上报函数', () => {
      const hanShu = vi.fn()
      sheZhiCuoWuShangBaoHanShu(hanShu)
      sheZhiCuoWuShangBaoHanShu(null)
      chuFaCuoWuShangBao({
        leiBie: 'vue',
        cuoWu: null,
        shiJianChuo: 1,
      })
      expect(hanShu).not.toHaveBeenCalled()
    })

    it('anZhuangQuanJuCuoWuJianTingQi 重复调用只安装一次', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      anZhuangQuanJuCuoWuJianTingQi()
      const diYiCiShu = addSpy.mock.calls.length
      anZhuangQuanJuCuoWuJianTingQi()
      const diErCiShu = addSpy.mock.calls.length
      expect(diErCiShu).toBe(diYiCiShu)
    })

    it('unhandledrejection 事件触发上报（leiBie=chengNuo）', async () => {
      const hanShu = vi.fn()
      sheZhiCuoWuShangBaoHanShu(hanShu)
      anZhuangQuanJuCuoWuJianTingQi()
      const shiJian = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: new Error('promise 失败'),
      })
      window.dispatchEvent(shiJian)
      expect(hanShu).toHaveBeenCalledOnce()
      const canShu = hanShu.mock.calls[0][0]
      expect(canShu.leiBie).toBe('chengNuo')
      expect(canShu.fuJia.leiXing).toBe('unhandledrejection')
    })

    it('error 事件（资源加载）触发上报（leiBie=ziYuan）', () => {
      const hanShu = vi.fn()
      sheZhiCuoWuShangBaoHanShu(hanShu)
      anZhuangQuanJuCuoWuJianTingQi()
      const img = document.createElement('img')
      img.src = 'broken.png'
      const shiJian = new Event('error', { bubbles: true })
      Object.defineProperty(shiJian, 'target', { value: img })
      Object.defineProperty(shiJian, 'error', { value: new Error('load fail') })
      window.dispatchEvent(shiJian)
      expect(hanShu).toHaveBeenCalled()
      const canShu = hanShu.mock.calls[0][0]
      expect(canShu.leiBie).toBe('ziYuan')
      expect(canShu.fuJia.leiXing).toBe('resource')
    })
  })

  describe('FP-04 默认上报函数', () => {
    beforeEach(() => {
      sheZhiCuoWuShangBaoHanShu(null)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      sheZhiCuoWuShangBaoHanShu(null)
    })

    it('moRenShangBaoHanShu 使用 sendBeacon 上报到 /api/logs', async () => {
      const sendBeaconSpy = vi.fn(() => true)
      vi.stubGlobal('navigator', { sendBeacon: sendBeaconSpy })

      moRenShangBaoHanShu({
        leiBie: 'vue',
        cuoWu: new Error('测试错误'),
        shiJianChuo: 123,
      })

      expect(sendBeaconSpy).toHaveBeenCalledOnce()
      const [url, blob] = sendBeaconSpy.mock.calls[0] as [string, Blob]
      expect(url).toBe('/api/logs')
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/json')
      const wenBen = await blob.text()
      const ti = JSON.parse(wenBen)
      expect(ti.lei_xing).toBe('cuoWu')
      expect(ti.xiang_qing.leiBie).toBe('vue')
      expect(ti.xiang_qing.cuoWu.message).toBe('测试错误')
      expect(ti.xiang_qing.shiJianChuo).toBe(123)
    })

    it('Error 对象被序列化为 name/message/stack', async () => {
      const sendBeaconSpy = vi.fn(() => true)
      vi.stubGlobal('navigator', { sendBeacon: sendBeaconSpy })

      const cuoWu = new Error('序列化测试')
      cuoWu.name = 'CustomError'
      moRenShangBaoHanShu({
        leiBie: 'vue',
        cuoWu,
        shiJianChuo: 1,
      })

      const blob = sendBeaconSpy.mock.calls[0][1] as Blob
      const wenBen = await blob.text()
      const ti = JSON.parse(wenBen)
      expect(ti.xiang_qing.cuoWu.name).toBe('CustomError')
      expect(ti.xiang_qing.cuoWu.message).toBe('序列化测试')
      expect(typeof ti.xiang_qing.cuoWu.stack).toBe('string')
    })

    it('sendBeacon 不可用时回退到 fetch keepalive', () => {
      const fetchSpy = vi.fn(() => Promise.resolve({} as Response))
      vi.stubGlobal('fetch', fetchSpy)
      vi.stubGlobal('navigator', {})

      moRenShangBaoHanShu({
        leiBie: 'vue',
        cuoWu: new Error('x'),
        shiJianChuo: 1,
      })

      expect(fetchSpy).toHaveBeenCalledOnce()
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('/api/logs')
      expect(init.method).toBe('POST')
      expect(init.keepalive).toBe(true)
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    })

    it('sendBeacon 返回 false 时回退到 fetch', () => {
      const fetchSpy = vi.fn(() => Promise.resolve({} as Response))
      vi.stubGlobal('fetch', fetchSpy)
      vi.stubGlobal('navigator', { sendBeacon: () => false })

      moRenShangBaoHanShu({
        leiBie: 'vue',
        cuoWu: new Error('x'),
        shiJianChuo: 1,
      })

      expect(fetchSpy).toHaveBeenCalledOnce()
    })

    it('性能指标（fuJia.shangBaoLeiXing=xingNengZhiBiao）上报 lei_xing=xingNengZhiBiao', async () => {
      const sendBeaconSpy = vi.fn(() => true)
      vi.stubGlobal('navigator', { sendBeacon: sendBeaconSpy })

      moRenShangBaoHanShu({
        leiBie: 'weiZhi',
        cuoWu: { zhiBiaoMing: 'LCP', zhi: 1500, pingFen: 'good' },
        shiJianChuo: 456,
        fuJia: { shangBaoLeiXing: 'xingNengZhiBiao' },
      })

      const blob = sendBeaconSpy.mock.calls[0][1] as Blob
      const wenBen = await blob.text()
      const ti = JSON.parse(wenBen)
      expect(ti.lei_xing).toBe('xingNengZhiBiao')
      expect(ti.xiang_qing.zhiBiaoMing).toBe('LCP')
      expect(ti.xiang_qing.zhi).toBe(1500)
      expect(ti.xiang_qing.pingFen).toBe('good')
      expect(ti.xiang_qing.shiJianChuo).toBe(456)
    })

    it('chuShiHuaCuoWuShangBao 设置默认 hook 后 chuFaCuoWuShangBao 触发 sendBeacon', () => {
      const sendBeaconSpy = vi.fn(() => true)
      vi.stubGlobal('navigator', { sendBeacon: sendBeaconSpy })

      chuShiHuaCuoWuShangBao()
      chuFaCuoWuShangBao({
        leiBie: 'vue',
        cuoWu: new Error('初始化后上报'),
        shiJianChuo: 1,
      })

      expect(sendBeaconSpy).toHaveBeenCalledOnce()
    })
  })
})
