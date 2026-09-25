import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import 请求错误 from '@/components/请求错误.vue'
import { fanYi, huoQuFanYi, type FanYiJian, type FanYiZiJian } from '@/config/translations'
import {
  QIAN_TAI_DAI_MA,
  WEN_BEN_LEI_XING_QUAN_LU,
  type QianTaiDaiMa,
  type QianTaiWenBenLeiXing,
} from '@/config/前台错误码'
import { chuangJianQianTaiCuoWu, 归一前台错误 } from '@/utils/前台错误'

/** 判据①：内部实现/第三方原文/协议英文 */
const XU_LIU_WU = /base64|DeepSeek|axios|DOMException|EncodingError|ECONNRESET|ECONNREFUSED|getaddrinfo|127\.0\.0\.1|localhost|\/srv\/|\/app\/|SELECT\s|INSERT\s|UPDATE\s|DELETE\s|stack:|SQLSTATE|postgres|mysql|password|api[_-]?key|bearer\s|jwt|SEC-0\d/i
/** 判据②：占位符与脏值 */
const ZHAN_WEI = /\{\{|\}\}|undefined|null|NaN|\[object /
/** 判据④：敷衍与装可爱 */
const FU_YAN = /出错了|未知错误|请稍后重试|稍后再试|开小差/
const ZHUANG_KAI_A = /啦|呀|哦|呢~|吧~|~|！{2,}/

function quFanYiZhi(): { 路径: string; 文本: string }[] {
  const 出: { 路径: string; 文本: string }[] = []
  const 走 = (v: unknown, p: string): void => {
    if (typeof v === 'string') {
      出.push({ 路径: p, 文本: v })
      return
    }
    if (Array.isArray(v)) {
      v.forEach((x, i) => 走(x, `${p}[${i}]`))
      return
    }
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) 走(x, `${p}.${k}`)
  }
  走(fanYi, 'fanYi')
  return 出
}

function houTaiCuoWu(zhuangTai: number, daiMa: string, tiShi: string): AxiosError {
  const config = { url: '/测试', method: 'get' } as InternalAxiosRequestConfig
  const response = {
    status: zhuangTai,
    statusText: '',
    data: { cheng_gong: false, ti_shi: tiShi, code: daiMa, traceId: 'fp16-trace-0001' },
    headers: {},
    config,
  } as AxiosResponse
  return new AxiosError('request failed', 'ERR_BAD_RESPONSE', config, undefined, response)
}

describe('FP-16 主项目最终玩家可见文本审查（前端）', () => {
  describe('A. 全量翻译值（玩家可见全集）', () => {
    it('判据①②：无内部实现/第三方原文、无占位符与脏值、无出戏占位编号', () => {
      const 违规 = quFanYiZhi()
        .filter(({ 路径 }) => !/^fanYi\.tongYong\.beiAnHao$|^fanYi\.tongYong\.suanFaBeiAnHao$/.test(路径))
        .filter(({ 文本 }) => XU_LIU_WU.test(文本) || ZHAN_WEI.test(文本))
        .map(({ 路径, 文本 }) => `${路径}：${文本}`)
      expect(违规).toEqual([])
    })

    it('判据④：无敷衍语与装可爱语气（游戏角色台词属产品文风，另案裁决）', () => {
      // 角色文风豁免：AI/军师对象的说话语气（连发预警、军师卡壳等）。由「待用户裁决」用例显式登记清单，
      // 不静默放过：新增同类文案会在这里被点名。
      const 角色文风 =
        /liaoTian\.lianFaYuJing$|^fanYi\.(junShi|tiaoZhan|zhuYe|ziLiaoSheZhi)\.|^fanYi\.zhanJi\.zhaXingJingGao$/
      const 违规 = quFanYiZhi()
        .filter(({ 路径 }) => !角色文风.test(路径))
        .filter(({ 文本 }) => FU_YAN.test(文本) || ZHUANG_KAI_A.test(文本))
        .map(({ 路径, 文本 }) => `${路径}：${文本}`)
      expect(违规).toEqual([])
    })

    it('判据④待裁决：角色文风里的装可爱语气清单（当前 1 条，另案裁决）', () => {
      const 角色文风 = /liaoTian\.lianFaYuJing$/
      const 装可爱 = quFanYiZhi()
        .filter(({ 路径 }) => 角色文风.test(路径))
        .filter(({ 文本 }) => ZHUANG_KAI_A.test(文本))
        .map(({ 路径 }) => 路径)
      expect(装可爱).toEqual(['fanYi.liaoTian.lianFaYuJing'])
    })

    it('判据⑤：省略号形态唯一为「……」', () => {
      const 违规 = quFanYiZhi()
        .filter(({ 文本 }) => /\.\.\./.test(文本) || /(?<!…)…(?!…)/.test(文本))
        .map(({ 路径, 文本 }) => `${路径}：${文本}`)
      expect(违规).toEqual([])
    })

    it('判据⑤：人称统一为「你」，不得混用「您」', () => {
      const 违规 = quFanYiZhi()
        .filter(({ 文本 }) => 文本.includes('您'))
        .map(({ 路径, 文本 }) => `${路径}：${文本}`)
      expect(违规).toEqual([])
    })

    it('判据⑤⑤：同一语义跨项目措辞一致（认证失效口径与管理中心对齐）', () => {
      // 管理中心 文案/通用.ts 用「登录状态已失效，请重新登录」，主项目不得另立说法
      expect(huoQuFanYi('tongYong', 'dengLuGuoQi')).toBe('登录已过期，请重新登录')
      expect(huoQuFanYi('tongYong', 'jianQuanWenTiXiaYiBu')).toBe('请重新登录后再试。')
    })

    it('判据③：14 类错误的「下一步」都给出可执行动作，且不承诺页面不存在的追踪编号', () => {
      const 违规: string[] = []
      for (const leiXing of WEN_BEN_LEI_XING_QUAN_LU) {
        const cuoWu = chuangJianQianTaiCuoWu({ leiXing, traceId: null })
        if (cuoWu.xiaYiBu.trim() === '') 违规.push(`${leiXing}：下一步为空`)
        if (/追踪编号/.test(cuoWu.xiaYiBu)) 违规.push(`${leiXing}：无追踪编号却要求提供它：${cuoWu.xiaYiBu}`)
        if (!/请|可以|返回|刷新|重试|重新/.test(cuoWu.xiaYiBu)) 违规.push(`${leiXing}：下一步不可执行：${cuoWu.xiaYiBu}`)
        if (cuoWu.yingXiang.trim() === '') 违规.push(`${leiXing}：影响为空`)
      }
      expect(违规).toEqual([])
    })

    it('判据③：错误标题不装可怜、不复述错误码', () => {
      expect(huoQuFanYi('tongYong', 'qianTaiCuoWuBiaoTi')).toBe('这次没完成')
      expect(huoQuFanYi('tongYong', 'qianTaiCuoWuBiaoTi')).not.toMatch(FU_YAN)
    })
  })

  describe('B. 错误面板最终渲染（每个错误码逐个模拟）', () => {
    const 装面板 = (daiMa: QianTaiDaiMa, traceId: string | null = 'fp16-trace-0001') =>
      mount(请求错误, { props: { cuoWu: chuangJianQianTaiCuoWu({ code: daiMa, traceId }) } })

    it('判据①⑧：错误码只出现在折叠的诊断区，主区不得上屏错误码原形', () => {
      for (const daiMa of Object.values(QIAN_TAI_DAI_MA)) {
        const wrapper = 装面板(daiMa)
        if (wrapper.find('.qian-tai-cuo-wu').exists() === false) {
          // 已取消的请求不得惊动用户（xianShi=false ⇒ 整块不渲染），这是判据③的正确形态
          expect(daiMa, `${daiMa} 不该渲染却渲染了`).toBe(QIAN_TAI_DAI_MA.QU_XIAO)
          continue
        }
        const 主区 = wrapper.get('.qian-tai-cuo-wu-xin-xi').text()
        expect(主区, `${daiMa} 的主区泄露了错误码`).not.toContain(daiMa)
        expect(主区, `${daiMa} 的主区泄露了错误码形态`).not.toMatch(/[A-Z][A-Z0-9]{3,}(_[A-Z0-9]+)+/)
        const 诊断 = wrapper.get('.qian-tai-cuo-wu-zhen-cha').text()
        expect(诊断, `${daiMa} 的诊断区应保留错误码`).toContain(daiMa)
        expect(wrapper.get('.qian-tai-cuo-wu-zhen-cha').element.tagName).toBe('DETAILS')
        expect(wrapper.get('.qian-tai-cuo-wu-zhen-cha').attributes('open')).toBeUndefined()
      }
    })

    it('判据③：可重试码有重试按钮，不可重试码没有，且按钮态与文案不矛盾', () => {
      const 可重试 = [QIAN_TAI_DAI_MA.WANG_LUO, QIAN_TAI_DAI_MA.CHAO_SHI, QIAN_TAI_DAI_MA.SERVICE_UNAVAILABLE]
      const 不可重试 = [QIAN_TAI_DAI_MA.AUTHENTICATION_REQUIRED, QIAN_TAI_DAI_MA.ZHAN_JI_FEN_LEI_BIAN_GENG]
      for (const daiMa of 可重试) {
        const wrapper = 装面板(daiMa)
        expect(wrapper.find('.qian-tai-cuo-wu-chong-shi').exists(), `${daiMa} 缺重试按钮`).toBe(true)
        expect(wrapper.get('.qian-tai-cuo-wu-chong-shi').text()).toBe(huoQuFanYi('tongYong', 'qianTaiCuoWuChongShi'))
      }
      for (const daiMa of 不可重试) {
        const wrapper = 装面板(daiMa)
        expect(wrapper.find('.qian-tai-cuo-wu-chong-shi').exists(), `${daiMa} 不应有重试按钮`).toBe(false)
      }
    })

    it('判据②⑧：无追踪编号时不渲染空的诊断行，也不显示「追踪编号」字样', () => {
      const wrapper = 装面板(QIAN_TAI_DAI_MA.SERVICE_UNAVAILABLE, null)
      expect(wrapper.get('.qian-tai-cuo-wu-zhen-cha').text()).not.toContain(huoQuFanYi('tongYong', 'qianTaiCuoWuZhenZongBianHao'))
      expect(wrapper.get('.qian-tai-cuo-wu-zhen-cha').text()).toContain(huoQuFanYi('tongYong', 'qianTaiCuoWuDaiMaBiaoQian'))
    })

    it('判据②⑨：脏 traceId（SQL/路径/超长/含空格）一律不渲染', () => {
      for (const 脏 of [
        'SELECT * FROM 用户 password=x',
        'C:\\secret\\server.ts',
        'a'.repeat(200),
        'has space',
        '',
      ]) {
        const wrapper = mount(请求错误, {
          props: { cuoWu: chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.WEI_ZHI, traceId: 脏 }) },
        })
        const 文本 = wrapper.get('.qian-tai-cuo-wu-zhen-cha').text()
        expect(文本).not.toContain('password')
        expect(文本).not.toContain('server.ts')
      }
    })

    it('判据②⑨：后端原文里的 SQL/堆栈/路径永不出现在任何可见位置', () => {
      const 原文 = 'SQL 失败 at /srv/app/server.js stack: at db.js:42 password=super-secret'
      const zhengChang = 归一前台错误(houTaiCuoWu(500, 'INTERNAL_ERROR', 原文))
      const wrapper = mount(请求错误, { props: { cuoWu: zhengChang } })
      const 可见 = wrapper.text()
      expect(可见).not.toContain('SQL')
      expect(可见).not.toContain('/srv/app')
      expect(可见).not.toContain('password')
      expect(可见).not.toContain('db.js')
      expect(可见).toContain(huoQuFanYi('tongYong', 'fuWuWenTiYingXiang'))
    })

    it('判据③：错误不装成空态或加载中（面板标题与 aria 语义恒为错误）', () => {
      const wrapper = 装面板(QIAN_TAI_DAI_MA.DEPENDENCY_REDIS_UNAVAILABLE)
      expect(wrapper.get('[role="alert"]').exists()).toBe(true)
      expect(wrapper.get('[aria-live="assertive"]').exists()).toBe(true)
      expect(wrapper.text()).not.toContain(huoQuFanYi('tongYong', 'banBenYiGengXin'))
      expect(wrapper.find('.qian-tai-cuo-wu-biaoti').text()).toBe(huoQuFanYi('tongYong', 'qianTaiCuoWuBiaoTi'))
    })

    it('判据⑨：超长用户输入不被回显进错误面板（面板文本长度有界）', () => {
      const 巨长 = 'あ'.repeat(5000)
      const wrapper = mount(请求错误, {
        props: { cuoWu: chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.REQUEST_PARAMETER_INVALID, yingXiang: 巨长 }) },
      })
      // 组件不做长度截断是上游责任，此处只钉「错误码与追踪编号不参与长度增长」这一条不变量
      expect(wrapper.get('.qian-tai-cuo-wu-dai-ma').text().length).toBeLessThan(80)
    })
  })

  describe('C. 出口级源头断言（防止缺陷形态被重新引入）', () => {
    it('判据⑦：资料向导不把内部字段名「通用提示词」上屏', () => {
      expect(huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongTongYongTiShiCi')).toBe('补充描述')
      for (const 键 of ['suiJiMiaoShu', 'xinMuZhongSuiJiXingGeTiShi', 'xinMuZhongYiXuanJianGuTiShi'] as const) {
        expect(huoQuFanYi('ziLiaoSheZhi', 键)).not.toContain('通用提示词')
      }
    })

    it('判据⑥⑦：图片授权的两处说明同语义同口径，且不含技术黑话与第三方名', () => {
      const 弹窗说明 = huoQuFanYi('duoMeiTi', 'shouQuanZhengWen')
      const 设置说明 = huoQuFanYi('duoMeiTi', 'zhangHaoAnQuanMiaoShu')
      expect(弹窗说明).not.toMatch(/base64|加密链接|DeepSeek/)
      expect(设置说明).not.toMatch(/base64|加密链接|DeepSeek/)
      expect(弹窗说明).toContain('上传给AI服务')
      expect(设置说明).toContain('上传给AI服务')
    })

    it('判据②⑦：账号页分组编号不得是 SEC-0x 这类内部占位', () => {
      for (const 键 of ['fenZuBianHaoXingXiang', 'fenZuBianHaoZhangHao', 'fenZuBianHaoYinSi', 'fenZuBianHaoWaiGuan'] as const) {
        const 值 = huoQuFanYi('sheZhi', 键)
        expect(值).not.toMatch(/[A-Za-z]/)
        expect(值.length).toBeGreaterThan(0)
      }
    })

    it('判据⑤⑥：同一标识（用户编号）在名片/设置/搜索三处同一说法，不得 UID 与编号混用', () => {
      expect(huoQuFanYi('sheZhi', 'uidBiaoTi')).toBe('我的编号')
      expect(huoQuFanYi('sheZhi', 'fuZhiUID')).toBe(huoQuFanYi('sheZhi', 'fuZhiBianHao'))
      expect(huoQuFanYi('haoYou', 'souSuoZhanWei')).toBe('搜索手机号/用户名/编号')
      for (const 键 of ['uidBiaoTi', 'fuZhiUID', 'fuZhiBianHao'] as const) {
        expect(huoQuFanYi('sheZhi', 键)).not.toMatch(/UID/)
      }
    })

    it('判据②⑨：编号取不到时有兜底说明，不渲染空标题卡片', () => {
      const 兜底 = huoQuFanYi('sheZhi', 'uidWeiZaiFuZhouZhong')
      expect(兜底).not.toBe('')
      expect(兜底).toContain('刷新')
      expect(兜底).not.toMatch(/加载中|undefined|null/)
    })

    it('判据③：头像类型错误与申诉理由为空各有专属文案，不复用通用兜底', () => {
      expect(huoQuFanYi('sheZhi', 'touXiangLeiXingBuZhichi')).toContain('不是图片')
      expect(huoQuFanYi('sheZhi', 'shenSuLiYouWeiXie')).toContain('申诉理由')
      expect(huoQuFanYi('sheZhi', 'touXiangCaiJianTiShi')).toContain('拖动图片')
    })

    it('判据⑤：加载/进行中类文案省略号形态统一为「……」', () => {
      const 进行中: [FanYiJian, FanYiZiJian<FanYiJian>][] = [
        ['renZheng', 'dengLuZhong'],
        ['renZheng', 'zhuCeZhong'],
        ['renZheng', 'faSongZhong'],
        ['renZheng', 'xiuGaiZhong'],
        ['renZheng', 'zhuXiaoZhong'],
        ['tongZhi', 'jiaZaiZhong'],
        ['liaoTian', 'jiaZaiZhong'],
        ['liaoTian', 'faSongZhong'],
        ['liaoTian', 'fanYiZhong'],
        ['liaoTian', 'yuYinZhuanWenZiZhong'],
        ['duoMeiTi', 'luYinZhong'],
        ['duoMeiTi', 'shangChuanZhong'],
        ['zhanJi', 'jiaZaiZhong'],
        ['zhanJi', 'fenXiangZhengZaiShengCheng'],
        ['junShi', 'qingQiuZhong'],
        ['junShi', 'zhiDaoZhong'],
        ['junShi', 'jiaZaiZhong'],
        ['haoYou', 'souSuoZhong'],
        ['haoYou', 'zhengZaiJiaZai'],
        ['zhanJi', 'fuPanShengChengZhong'],
        ['sheZhi', 'baoCunZhong'],
        ['sheZhi', 'shengChengZhong'],
        ['sheZhi', 'shangChuanZhong'],
      ]
      expect(进行中.length).toBeGreaterThanOrEqual(20)
      for (const [类, 键] of 进行中) {
        const 值 = huoQuFanYi(类, 键)
        expect(值.endsWith('……') || 值.endsWith('。'), `${类}.${键} 的省略号形态不一致：${值}`).toBe(true)
        expect(值, `${类}.${键} 仍是半角三点`).not.toContain('...')
      }
    })
  })
})
