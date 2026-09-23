import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WenJianQiPao from '@/components/聊天/文件气泡.vue'
import { WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/translations'

/**
 * FP-12b：文件气泡共享组件 + 文件选择 accept 与后端白名单同源。
 * ① accept 同源：前端 WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN 必须覆盖后端 mimeBaiMingDan.wenjian
 *    里那四条此前漏掉的文本类型（.md/.csv/.json/.html ↔ text/markdown 等），直读后端源文件把守。
 * ② 单一组件：两个聊天页都 import components/聊天/文件气泡.vue 并渲染 <WenJianQiPao>，
 *    页面源码里不得再内联第二份 .wenjian-* 卡片（类名与样式只住在组件里）。
 * ③ 组件行为：文件名截断、大小行、下载 href/download/aria-label 由组件统一给出。
 */

const 前端源目录 = resolve(__dirname, '..')
const 聊天页源 = readFileSync(resolve(前端源目录, 'views/聊天页面.vue'), 'utf-8')
const 好友页源 = readFileSync(resolve(前端源目录, 'views/好友聊天.vue'), 'utf-8')
const 组件源 = readFileSync(resolve(前端源目录, 'components/聊天/文件气泡.vue'), 'utf-8')
const 后端媒体配置 = readFileSync(
  resolve(前端源目录, '../../backend/src/config/媒体配置.ts'),
  'utf-8',
)

const 接受扩展名 = WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN.split(',')

describe('FP-12b accept 与后端文件白名单同源', () => {
  it('四条此前漏掉的文本类型已进 accept：.md / .csv / .json / .html', () => {
    for (const kuoZhan of ['.md', '.csv', '.json', '.html']) {
      expect(接受扩展名, `accept 缺 ${kuoZhan}`).toContain(kuoZhan)
    }
  })

  it('后端 mimeBaiMingDan.wenjian 含对应四条 MIME（改一侧必红灯）', () => {
    const baiMingDan = /wenjian:\s*\[([\s\S]*?)\]/.exec(后端媒体配置)
    expect(baiMingDan, '后端找不到 mimeBaiMingDan.wenjian').toBeTruthy()
    const neirong = baiMingDan![1]
    for (const mime of ['text/markdown', 'text/csv', 'application/json', 'text/html']) {
      expect(neirong, `后端白名单缺 ${mime}`).toContain(`'${mime}'`)
    }
  })

  it('四个扩展名在前端常量里各只出现一次（重复拼接即 accept 语义漂移）', () => {
    const yuanMa = readFileSync(resolve(前端源目录, 'config/消息配置.ts'), 'utf-8')
    const chang = /export const WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN = \[([\s\S]*?)\]\.join/.exec(
      yuanMa,
    )
    expect(chang, '找不到 WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN 常量定义').toBeTruthy()
    const lieBiao = [...chang![1].matchAll(/'([^']+)'/g)].map((xiang) => xiang[1])
    for (const kuoZhan of ['.md', '.csv', '.json', '.html']) {
      expect(lieBiao.filter((项) => 项 === kuoZhan), `${kuoZhan} 重复`).toHaveLength(1)
    }
    expect(lieBiao).toEqual(接受扩展名)
  })
})

describe('FP-12b 文件气泡单一组件', () => {
  it('两页都接 <WenJianQiPao>，且源码里零内联 .wenjian 卡片', () => {
    for (const [ming, yuan] of [
      ['聊天页面', 聊天页源],
      ['好友聊天', 好友页源],
    ] as const) {
      expect(yuan, `${ming} 未接文件气泡组件`).toContain(
        "import WenJianQiPao from '@/components/聊天/文件气泡.vue'",
      )
      expect(yuan, `${ming} 未渲染 <WenJianQiPao`).toContain('<WenJianQiPao')
      expect(yuan, `${ming} 残留第二份文件卡片结构`).not.toMatch(
        /class="wenjian-(qipao|ming|daxiao|xiazai|tubiao|xinxi)"/,
      )
    }
  })

  it('文件卡片类名与样式只住在组件文件内', () => {
    expect(组件源).toContain('class="wenjian-qipao"')
    expect(组件源).toContain('class="wenjian-ming"')
    expect(组件源).toContain('class="wenjian-xiazai"')
    for (const [ming, yuan] of [
      ['聊天页面', 聊天页源],
      ['好友聊天', 好友页源],
    ] as const) {
      expect(yuan, `${ming} 残留 .wenjian 样式规则`).not.toContain('.wenjian-qipao')
      expect(yuan, `${ming} 残留 .wenjian 样式规则`).not.toContain('.wenjian-xiazai')
    }
  })

  it('组件行为：文件名超长截断、大小行、下载 href/download/aria-label', () => {
    const changMing = `${'a'.repeat(30)}.pdf`
    const bao = mount(WenJianQiPao, {
      props: {
        mingCheng: changMing,
        daXiao: '2.0MB',
        xiaZaiDiZhi: '/api/media/qianming',
        xiaZaiMing: changMing,
        shiBenRen: true,
      },
    })
    try {
      const xianShi = bao.find('.wenjian-ming').text()
      expect(xianShi.length).toBeLessThan(changMing.length)
      expect(xianShi.endsWith('...')).toBe(true)
      expect(bao.find('.wenjian-daxiao').text()).toBe('2.0MB')
      const xiaZai = bao.find('a.wenjian-xiazai')
      expect(xiaZai.attributes('href')).toBe('/api/media/qianming')
      expect(xiaZai.attributes('download')).toBe(changMing)
      expect(xiaZai.attributes('aria-label')).toBe(huoQuFanYi('duoMeiTi', 'xiaZaiWenJian'))
      expect(bao.find('.wenjian-qipao').classes()).toContain('wenjian-qipao--benren')
    } finally {
      bao.unmount()
    }
  })

  it('组件行为：缺地址不渲染 href、缺 download 名不带 download、对方气泡走 duifang 主题档', () => {
    const bao = mount(WenJianQiPao, {
      props: {
        mingCheng: huoQuFanYi('haoYou', 'weiMingMing'),
        daXiao: '',
        shiBenRen: false,
      },
    })
    try {
      expect(bao.find('.wenjian-daxiao').exists()).toBe(false)
      expect(bao.find('a.wenjian-xiazai').attributes('href')).toBeUndefined()
      expect(bao.find('a.wenjian-xiazai').attributes('download')).toBeUndefined()
      expect(bao.find('.wenjian-qipao').classes()).toContain('wenjian-qipao--duifang')
      expect(bao.find('.wenjian-ming').text()).toBe(huoQuFanYi('haoYou', 'weiMingMing'))
    } finally {
      bao.unmount()
    }
  })
})
