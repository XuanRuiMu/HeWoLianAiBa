import { describe, it, expect } from 'vitest'
import {
  yanZhengShouJiHao,
  yanZhengYongHuMing,
  yanZhengXingBie,
  yanZhengLiaoTianNeiRong,
  yanZhengMiMa,
} from '../utils/输入验证'
import { huoQuFanYi } from '../config/translations'

describe('输入验证工具', () => {
  it('手机号：合法手机号通过', () => {
    expect(yanZhengShouJiHao('13812345678').heFa).toBe(true)
  })

  it('手机号：12345返回错误并匹配翻译', () => {
    const jieGuo = yanZhengShouJiHao('12345')
    expect(jieGuo.heFa).toBe(false)
    expect(jieGuo.xiaoXi).toBe(huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu'))
  })

  it('用户名：1-30字符无特殊符号通过', () => {
    expect(yanZhengYongHuMing('玄锐暮').heFa).toBe(true)
  })

  it('用户名：a!@#返回错误并匹配翻译', () => {
    const jieGuo = yanZhengYongHuMing('a!@#')
    expect(jieGuo.heFa).toBe(false)
    expect(jieGuo.xiaoXi).toBe(huoQuFanYi('renZheng', 'yongHuMingTeShuZiFu'))
  })

  it('用户名：空字符串返回长度错误', () => {
    const jieGuo = yanZhengYongHuMing('')
    expect(jieGuo.heFa).toBe(false)
    expect(jieGuo.xiaoXi).toBe(huoQuFanYi('renZheng', 'yongHuMingChangDuCuoWu'))
  })

  it('用户名：31字符返回长度错误', () => {
    const jieGuo = yanZhengYongHuMing('a'.repeat(31))
    expect(jieGuo.heFa).toBe(false)
    expect(jieGuo.xiaoXi).toBe(huoQuFanYi('renZheng', 'yongHuMingChangDuCuoWu'))
  })

  it('性别：男/女/nan/nv通过', () => {
    expect(yanZhengXingBie('男').heFa).toBe(true)
    expect(yanZhengXingBie('女').heFa).toBe(true)
    expect(yanZhengXingBie('nan').heFa).toBe(true)
    expect(yanZhengXingBie('nv').heFa).toBe(true)
  })

  it('性别：other返回错误并匹配翻译', () => {
    const jieGuo = yanZhengXingBie('other')
    expect(jieGuo.heFa).toBe(false)
    expect(jieGuo.xiaoXi).toBe(huoQuFanYi('anQuan', 'shenFenBuHeFa'))
  })

  it('聊天内容：500字符内通过', () => {
    expect(yanZhengLiaoTianNeiRong('你好').heFa).toBe(true)
    expect(yanZhengLiaoTianNeiRong('a'.repeat(500)).heFa).toBe(true)
  })

  it('聊天内容：超过500字符返回错误', () => {
    const jieGuo = yanZhengLiaoTianNeiRong('a'.repeat(501))
    expect(jieGuo.heFa).toBe(false)
    expect(jieGuo.xiaoXi).toBe(huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'))
  })

  it('聊天内容：空字符串返回错误', () => {
    const jieGuo = yanZhengLiaoTianNeiRong('')
    expect(jieGuo.heFa).toBe(false)
    expect(jieGuo.xiaoXi).toBe(huoQuFanYi('liaoTian', 'xiaoXiNeiRongWeiKong'))
  })

  it('密码：非空通过', () => {
    expect(yanZhengMiMa('Test123456').heFa).toBe(true)
  })

  it('密码：空字符串返回错误', () => {
    const jieGuo = yanZhengMiMa('')
    expect(jieGuo.heFa).toBe(false)
    expect(jieGuo.xiaoXi).toBe(huoQuFanYi('renZheng', 'miMaKong'))
  })
})
