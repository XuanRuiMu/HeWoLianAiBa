import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const 根 = resolve(__dirname, '..')
const 读 = (相对: string): string => readFileSync(resolve(根, 相对), 'utf8')

const 行源 = 读('components/聊天/消息行.vue')
const 聊天页源 = 读('views/聊天页面.vue')
const 好友页源 = 读('views/好友聊天.vue')
const 仓库源 = 读('stores/聊天.ts')
const 翻译表源 = 读('config/翻译表.ts')
const 撤回重编源 = 读('composables/撤回重编.ts')

describe('FP-E 撤回重新编辑：微信样式与隐藏行为', () => {
  it('提示与链接同排居中，无下划线按钮感；窗口外只剩灰字', () => {
    expect(行源).toContain('class="chehui-tishi"')
    expect(行源).toContain('class="chehui-tishi-wen"')
    expect(行源).toContain('class="chehui-chongbian-lianjie"')
    expect(行源).toContain('justify-content: center')
    expect(行源).toContain('gap: var(--jiange-2)')
    expect(行源).not.toContain('text-decoration: underline')
    expect(行源).toContain('v-if="cheHuiWenBen && keChongBian"')
    expect(行源).toContain("emit('chongXinBianJi')")
  })

  it('链接文案走翻译表，不在组件内硬编码', () => {
    expect(翻译表源).toContain("chongXinBianJi: '重新编辑'")
    expect(行源).toContain("huoQuFanYi('liaoTian', 'chongXinBianJi')")
  })

  it('两页都接线重编属性与事件，好友页不遗漏', () => {
    for (const 源 of [聊天页源, 好友页源]) {
      expect(源).toContain(':ke-chong-bian=')
      expect(源).toContain('@chong-xin-bian-ji=')
    }
    expect(聊天页源).toContain('聊天仓库.chongBianKeYongJiHe.has')
    expect(好友页源).toContain('chongBianKeYongJiHe.has')
    expect(聊天页源).toContain('聊天仓库.dianJiChongXinBianJi')
  })

  it('重编只回填已有输入框，不自动发送、不复活旧消息', () => {
    expect(聊天页源).toContain('shuRuNeiRong.value = yuanWen.slice(0, XiaoXiPeiZhi.zuiDaXiaoXiChangDu)')
    expect(好友页源).toContain('shuRuNeiRong.value = yuanWen.slice(0, XiaoXiPeiZhi.zuiDaXiaoXiChangDu)')
    expect(聊天页源).not.toContain('chongXinBianJiFaSong')
    expect(好友页源).not.toContain('chongXinBianJiFaSong')
  })

  it('时限判定使用服务器校准时钟与发送时间，校准缺失失效关闭', () => {
    expect(撤回重编源).toContain('export function shiKeChongBian(')
    expect(撤回重编源).toContain('return xiaoZhunShiKe - faSongShiJianChuo <= huoQuCheHuiChongBianShiXian(leiXing)')
    expect(撤回重编源).not.toContain('Date.now() - xiaoXi')
    expect(仓库源).toContain('chuangJianShiJianXiaoZhunQi')
    expect(仓库源).toContain('shiKeChongBian(xiaoXi.lei_xing, xiaoXi.shi_jian_chuo, shiJianXiaoZhunQi.duQu(), true)')
    expect(仓库源).toContain('shuaXinFuWuQiShiJianXiaoZhun(jieGuo.fuWuQiShiJianChuo)')
  })

  it('类型门禁：仅文字/图片可重编，文件语音表情不可重编', () => {
    expect(撤回重编源).toContain("return leiXing === 'wenben' || leiXing === 'tuPian'")
  })

  it('取原文必须经重编原文接口，且不在普通列表出参带原文', () => {
    expect(仓库源).toContain('huoQuCheHuiChongBianYuanWen')
    expect(仓库源).not.toContain('yuan_shi_nei_rong')
    expect(聊天页源).not.toContain('yuan_shi_nei_rong')
    expect(好友页源).not.toContain('yuan_shi_nei_rong')
  })

  it('翻译键完整：重编链接与覆盖确认走翻译表', () => {
    expect(翻译表源).toContain("chongXinBianJi: '重新编辑'")
    expect(翻译表源).toContain("chongBianFuGaiQueRen: '输入框已有内容，确定用撤回原文覆盖吗？'")
    expect(聊天页源).toContain("huoQuFanYi('liaoTian', 'chongBianFuGaiQueRen')")
    expect(好友页源).toContain("huoQuFanYi('liaoTian', 'chongBianFuGaiQueRen')")
  })

  it('好友页走好友域接口，不走AI聊天会话路由', () => {
    expect(读('api/社交.ts')).toContain('huoQuHaoYouChongBianYuanWen')
    expect(好友页源).toContain('huoQuHaoYouChongBianYuanWen')
    expect(好友页源).not.toContain('huoQuCheHuiChongBianYuanWen')
  })

  it('原文缓存有上限，会话切换清空', () => {
    expect(仓库源).toContain('ChongBianYuanWenShangXian = 50')
    expect(仓库源).toContain('chongBianYuanWenJiLu.clear()')
  })

  it('点击覆盖输入前有确认机制', () => {
    expect(聊天页源).toContain('window.confirm')
    expect(好友页源).toContain('window.confirm')
  })

  it('本人撤回文案与服务端映射一致', () => {
    const houDuanYuan = 读('../../HouDuan/src/services/消息.ts')
    expect(houDuanYuan).toContain("huoQuFanYi('liaoTian', 'ninCheHuiLeYiTiaoXiaoXi')")
    expect(houDuanYuan).toContain("huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')")
    expect(houDuanYuan).toMatch(/faSongZheLeiXing === 'yonghu'[\s\S]{0,120}ninCheHuiLeYiTiaoXiaoXi/)
  })
})
