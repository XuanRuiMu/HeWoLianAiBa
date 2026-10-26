import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  baoCunLingPai,
  duQuLingPai,
  qingChuLingPai,
  baoCunShuaXinLingPai,
  duQuShuaXinLingPai,
  shiChiJiuHuiHua,
  qingChuShuaXinLingPai,
} from '@/utils/令牌存储'
import { 令牌键, 刷新令牌键, 刷新令牌ID键 } from '@/constants/认证键'
import { huoQuFanYi } from '@/config/翻译表'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')

describe('FP-21 GitHub式持久会话与浏览器记密', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('勾选自动登录：令牌与刷新令牌进 localStorage（浏览器重启不掉登录）', () => {
    baoCunLingPai('access-1', true)
    baoCunShuaXinLingPai('refresh-1', 'rid-1', true)
    expect(localStorage.getItem(令牌键)).toBe('access-1')
    expect(localStorage.getItem(刷新令牌键)).toBe('refresh-1')
    expect(localStorage.getItem(刷新令牌ID键)).toBe('rid-1')
    expect(sessionStorage.getItem(令牌键)).toBeNull()
    expect(duQuLingPai()).toBe('access-1')
    expect(duQuShuaXinLingPai()).toEqual({ shuaXinLingPai: 'refresh-1', shuaXinLingPaiID: 'rid-1' })
    expect(shiChiJiuHuiHua()).toBe(true)
  })

  it('不勾自动登录：只进 sessionStorage（关浏览器即退出，同 GitHub 未勾 Keep me signed in）', () => {
    baoCunLingPai('access-2', false)
    baoCunShuaXinLingPai('refresh-2', 'rid-2', false)
    expect(sessionStorage.getItem(令牌键)).toBe('access-2')
    expect(localStorage.getItem(令牌键)).toBeNull()
    expect(duQuLingPai()).toBe('access-2')
    expect(shiChiJiuHuiHua()).toBe(false)
  })

  it('读取按会话区优先、持久区兜底，写入切换时另一区被清理', () => {
    localStorage.setItem(令牌键, 'chi-jiu-zhi')
    expect(duQuLingPai()).toBe('chi-jiu-zhi')
    baoCunLingPai('hui-hua-zhi', false)
    expect(duQuLingPai()).toBe('hui-hua-zhi')
    expect(localStorage.getItem(令牌键)).toBeNull()
    baoCunLingPai('chi-jiu-xin', true)
    expect(sessionStorage.getItem(令牌键)).toBeNull()
    expect(duQuLingPai()).toBe('chi-jiu-xin')
  })

  it('清除函数双区都清，不留孤儿令牌', () => {
    baoCunLingPai('a', true)
    baoCunShuaXinLingPai('r', 'rid', true)
    qingChuLingPai()
    qingChuShuaXinLingPai()
    expect(localStorage.getItem(令牌键)).toBeNull()
    expect(localStorage.getItem(刷新令牌键)).toBeNull()
    expect(duQuLingPai()).toBeNull()
    expect(duQuShuaXinLingPai().shuaXinLingPai).toBeNull()
  })

  it('登录链按自动登录勾选决定持久区，刷新续期跟随当前持久模式', () => {
    const 用户仓库源码 = 读('stores/用户.ts')
    expect(用户仓库源码).toContain('async function zhiXingDengLu(shouJiHao: string, miMa: string, ziDongDengLu = false)')
    expect(用户仓库源码).toContain('baoCunLingPai(jieGuo.令牌, ziDongDengLu)')
    expect(用户仓库源码).toContain('baoCunShuaXinLingPai(jieGuo.刷新令牌, jieGuo.刷新令牌ID, ziDongDengLu)')
    const 请求源码 = 读('api/请求.ts')
    expect(请求源码).toContain('const chiJiu = shiChiJiuHuiHua()')
    expect(请求源码).not.toContain('baoCunLingPai(shuJu.令牌, false)')
  })

  it('登录成功且勾选记住密码时触发浏览器保存密码（GitHub同思路：密码只进浏览器管理器）', () => {
    const 登录源码 = 读('views/登录内容.vue')
    expect(登录源码).toContain('if (jiZhuMiMaZhi) chuFaLiuLanQiBaoCunMiMa(shouJiHao, miMa)')
    expect(登录源码).toContain("yongHuXiang.autocomplete = 'username'")
    expect(登录源码).toContain("miMaXiang.autocomplete = 'current-password'")
    expect(登录源码).toContain('biaoDan.target = kuangJiaMing')
  })

  it('应用自身永不持久化密码明文（登录仓库无密码写盘路径）', () => {
    const 认证表单源码 = 读('stores/认证表单.ts')
    expect(认证表单源码).not.toContain('baoCunShuJu(BAO_CUN_MI_MA_JIAN')
    expect(认证表单源码).not.toContain("const BAO_CUN_MI_MA_JIAN")
    const 令牌源码 = 读('utils/令牌存储.ts')
    expect(令牌源码).not.toContain('password')
  })

  it('登录页在自动填充免禁名单中，浏览器可自动回填凭据', () => {
    const 守卫源码 = 读('composables/use禁止自动填充.ts')
    expect(守卫源码).toContain("'dengLu'")
  })

  it('偷人提示文案完整（回归锚点）', () => {
    expect(huoQuFanYi('tianJiaWeiXin', 'dengDaiTouRen')).toBe('对方正在偷人...')
  })
})
