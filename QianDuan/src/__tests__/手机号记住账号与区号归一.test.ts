import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import 区号选择器 from '@/components/表单/区号选择器.vue'
import {
  fenJieGuoJiHao,
  guiYiBenDiHao,
  panDingBenDiHao,
} from '@/utils/手机号'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8').replace(/\r\n/g, '\n')
const 本地产 = (件: string) => `hewolianba_${件}`
const 账好键 = 本地产('baoCunZhangHao')
const 登录 = 读('views/登录内容.vue')

function 读记录(): unknown {
  const 原文 = localStorage.getItem(账好键)
  return 原文 === null ? null : JSON.parse(原文)
}

describe('国际号拆分与本地号归一', () => {
  it('国际号按最长的合法区号拆成区号与本地号', () => {
    expect(fenJieGuoJiHao('+8616622370059')).toEqual({ quHao: '86', benDiHao: '16622370059' })
    expect(fenJieGuoJiHao('+14155552671')).toEqual({ quHao: '1', benDiHao: '4155552671' })
    expect(fenJieGuoJiHao('+85291234567')).toEqual({ quHao: '852', benDiHao: '91234567' })
    expect(fenJieGuoJiHao('+819012345678')).toEqual({ quHao: '81', benDiHao: '9012345678' })
  })

  it('非法或不完整的国际号不拆分', () => {
    expect(fenJieGuoJiHao('')).toBeNull()
    expect(fenJieGuoJiHao('1234')).toBeNull()
    expect(fenJieGuoJiHao('+999123456')).toBeNull()
  })

  it('输入框粘贴完整国际号时剥掉与当前区号重复的前缀', () => {
    expect(guiYiBenDiHao('86', '8616622370059')).toBe('16622370059')
    expect(guiYiBenDiHao('86', '+86 166 2237 0059')).toBe('16622370059')
    expect(guiYiBenDiHao('852', '85291234567')).toBe('91234567')
    expect(guiYiBenDiHao('1', '14155552671')).toBe('4155552671')
  })

  it('本地号本身不会被误剥前缀', () => {
    expect(guiYiBenDiHao('86', '16622370059')).toBe('16622370059')
    expect(guiYiBenDiHao('852', '91234567')).toBe('91234567')
    expect(guiYiBenDiHao('1', '4155552671')).toBe('4155552671')
    expect(guiYiBenDiHao('86', '')).toBe('')
  })
})

describe('记住账号：结构化持久化与旧值迁移', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('旧版扁平字符串被迁移为区号与本地号，输入框不再承载 +86', () => {
    localStorage.setItem(账好键, JSON.stringify('+8616622370059'))
    setActivePinia(createPinia())
    const 仓库 = 使用认证表单仓库()
    expect(仓库.jiZhuZhangHao).toBe(true)
    expect(仓库.dengLuQuHao).toBe('86')
    expect(仓库.dengLuShouJiHao).toBe('16622370059')
    expect(读记录()).toEqual({ banBen: 1, quHao: '86', benDiHao: '16622370059' })
  })

  it('迁移后的本地号与区号拼回后仍是合法国际号', () => {
    localStorage.setItem(账好键, JSON.stringify('+85291234567'))
    setActivePinia(createPinia())
    const 仓库 = 使用认证表单仓库()
    expect(仓库.dengLuQuHao).toBe('852')
    expect(仓库.dengLuShouJiHao).toBe('91234567')
    expect(panDingBenDiHao(仓库.dengLuQuHao, 仓库.dengLuShouJiHao).heFa).toBe(true)
  })

  it('无法拆分的旧值被清除，不残留脏数据', () => {
    localStorage.setItem(账好键, JSON.stringify('乱码账号'))
    setActivePinia(createPinia())
    const 仓库 = 使用认证表单仓库()
    expect(仓库.jiZhuZhangHao).toBe(false)
    expect(仓库.dengLuShouJiHao).toBe('')
    expect(localStorage.getItem(账好键)).toBeNull()
  })

  it('保存时只落区号与本地号，任何形态都不含加号前缀', () => {
    const 仓库 = 使用认证表单仓库()
    仓库.dengLuQuHao = '852'
    仓库.dengLuShouJiHao = '91234567'
    仓库.sheZhiJiZhuZhangHaoMiMa(true, false, false)
    expect(读记录()).toEqual({ banBen: 1, quHao: '852', benDiHao: '91234567' })
    expect(JSON.stringify(读记录())).not.toContain('+')
  })

  it('取消记住账号或号码非法时不落库', () => {
    const 仓库 = 使用认证表单仓库()
    仓库.dengLuQuHao = '86'
    仓库.dengLuShouJiHao = '16622370059'
    仓库.sheZhiJiZhuZhangHaoMiMa(true, false, false)
    expect(读记录()).not.toBeNull()
    仓库.sheZhiJiZhuZhangHaoMiMa(false, false, false)
    expect(localStorage.getItem(账好键)).toBeNull()
    仓库.dengLuShouJiHao = '12345'
    仓库.sheZhiJiZhuZhangHaoMiMa(true, false, false)
    expect(localStorage.getItem(账好键)).toBeNull()
  })

  it('正在输入的号码不会被加载逻辑覆盖', () => {
    localStorage.setItem(账好键, JSON.stringify({ banBen: 1, quHao: '86', benDiHao: '16622370059' }))
    setActivePinia(createPinia())
    const 仓库 = 使用认证表单仓库()
    仓库.dengLuShouJiHao = '13800138000'
    仓库.jiaZaiJiZhuSheZhi()
    expect(仓库.dengLuShouJiHao).toBe('13800138000')
  })

  it('退出登录清空表单时区号回到大陆默认', () => {
    const 仓库 = 使用认证表单仓库()
    仓库.dengLuQuHao = '852'
    仓库.qingKongDengLuZhuCe()
    expect(仓库.dengLuQuHao).toBe('86')
    expect(仓库.dengLuShouJiHao).toBe('')
  })
})

describe('手机号输入边界：任何入口都不把区号写进输入框', () => {
  it('登录与注册的手机号输入统一走本地号归一', () => {
    expect(登录).toContain('dengLuShouJiHao.value = guiYiBenDiHao(dengLuQuHao.value, zhi)')
    expect(登录).toContain('zhuCeShouJiHao.value = guiYiBenDiHao(DA_LU_QU_HAO, zhi)')
    expect(登录).toContain('feiDaLuShouJiHao.value = guiYiBenDiHao(feiDaLuQuHao.value, zhi)')
    expect(登录).not.toContain('dengLuShouJiHao.value = zhi')
    expect(登录).not.toContain('feiDaLuShouJiHao = ($event.target as HTMLInputElement).value')
  })

  it('登录区号与手机号同源存放在仓库，视图不再自持一份副本', () => {
    expect(登录).toContain('get: () => bd.dengLuQuHao')
    expect(登录).toContain('get: () => bd.dengLuShouJiHao')
    expect(登录).not.toContain('const dengLuQuHao = ref(')
  })

  it('保存记住账号不再接收拼好的国际号', () => {
    expect(登录).toContain('bd.sheZhiJiZhuZhangHaoMiMa(jiZhuZhangHao.value, jiZhuMiMaZhi, ziDongDengLu.value)')
  })
})

describe('非大陆注册页结构上不可能出现 +86', () => {
  it('选择器按排除区号过滤候选，搜索也不会召回被排除项', async () => {
    const 包 = mount(区号选择器, { props: { 模型值: '852', 排除区号: ['86'] }, attachTo: document.body })
    await 包.get('.qu-hao-chu').trigger('click')
    await new Promise((结束) => setTimeout(结束, 0))
    const 浮层 = document.querySelector('.qu-hao-lie-biao') as HTMLElement
    const 全量 = [...浮层.querySelectorAll('.qu-hao-tiao')].map(
      (条) => 条.querySelector('.qu-hao-tiao-hao')?.textContent ?? '',
    )
    expect(全量.length).toBe(244)
    expect(全量).not.toContain('+86')
    const 搜索 = 浮层.querySelector('.qu-hao-sou-suo-shu-ru') as HTMLInputElement
    搜索.value = '86'
    搜索.dispatchEvent(new Event('input'))
    await new Promise((结束) => setTimeout(结束, 0))
    const 命中 = [...浮层.querySelectorAll('.qu-hao-tiao')].map(
      (条) => 条.querySelector('.qu-hao-tiao-hao')?.textContent ?? '',
    )
    expect(命中.length).toBeGreaterThan(0)
    expect(命中).not.toContain('+86')
    包.unmount()
  })

  it('非大陆表单绑定排除区号，进入时把遗留的 86 归一到境外默认', () => {
    expect(登录).toContain(':排除区号="FEI_DA_LU_PAI_CHU_QU_HAO"')
    expect(登录).toContain('const FEI_DA_LU_PAI_CHU_QU_HAO = [DA_LU_QU_HAO]')
    expect(登录).toContain('if (feiDaLuQuHao.value === DA_LU_QU_HAO) feiDaLuQuHao.value = HUO_QU_XIANG_GANG')
    expect(登录).not.toContain('feiDaLuBuShouDaLuHao')
  })
})
