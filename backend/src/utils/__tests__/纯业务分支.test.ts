import { describe, expect, it } from 'vitest'
import { fanYi } from '../../config/translations'
import { jianMingJian, huoQuShuangXieJian } from '../键公约'
import { yinBiMinGanZiDuan, yinBiShouJiHao } from '../掩码'
import { 取角色能力, 取管理角色, 角色能力矩阵, 角色具备能力 } from '../角色能力'
import { 读回性别, 落库性别或拒绝, 内部转展示, 内部转用户形态, 归一角色性别, 是可识别性别, 解析性别 } from '../性别'
import { guiYiHuaIP, huoQuZhenShiIP, jieXiKeXinWangDuan, shiDuanKeXinDaiLi } from '../真实IP'
import {
  解析落库枚举,
  解析结局类型,
  解析结局文案,
  是否通关结局,
  随机结局趣味文案,
  结局枚举列表,
  结局趣味文案池,
  渲染性别变体文案,
  渲染结局文案,
  渲染结局池文案,
  失败结局枚举列表,
  通关结局枚举列表,
} from '../结局'

const 任意请求 = (remoteAddress: string | undefined, headers: Record<string, string> = {}) => ({
  socket: remoteAddress === undefined ? undefined : { remoteAddress },
  headers,
})

describe('纯业务工具分支', () => {
  it('手机号掩码覆盖空值、短值、标准值和自定义字段', () => {
    expect(yinBiShouJiHao('')).toBe('')
    expect(yinBiShouJiHao('123')).toBe('***')
    expect(yinBiShouJiHao(' 13800138000 ')).toBe('138****8000')
    const 原对象 = { shou_ji_hao: '13800138000', shouJiHao: 'abc', 其他: '13800138000' }
    const 结果 = yinBiMinGanZiDuan(原对象, ['shou_ji_hao'])
    expect(结果).toEqual({ shou_ji_hao: '138****8000', shouJiHao: 'abc', 其他: '13800138000' })
    expect(原对象.shou_ji_hao).toBe('13800138000')
  })

  it('键公约清理空片段并覆盖全部双写映射', () => {
    const 环境 = (process.env.NODE_ENV || 'dev').trim() || 'dev'
    expect(jianMingJian('业务', ' 一 ', '', 2)).toBe(`${环境}:lian-ai-ba:业务:一:2`)
    expect(huoQuShuangXieJian('aiYuSuan', 'a', 'b')).toEqual({
      jiuJian: 'ai_yu_suan:a:b',
      xinJian: `${环境}:lian-ai-ba:ai-yu-suan:a:b`,
    })
    expect(huoQuShuangXieJian('yanZhengMa', '1')).toMatchObject({ jiuJian: 'yan_zheng_ma:1' })
    expect(huoQuShuangXieJian('dengLuShiBai', '1')).toMatchObject({ jiuJian: 'deng_lu_shi_bai:1' })
    expect(huoQuShuangXieJian('shuaXinLingPai', '1')).toMatchObject({ jiuJian: 'refresh_token:1' })
    expect(huoQuShuangXieJian('jwtHeiMingDan', '1')).toMatchObject({ jiuJian: 'jwt_blacklist:1' })
    expect(huoQuShuangXieJian('jwtCheXiao', '1')).toMatchObject({ jiuJian: 'jwt_yong_hu_cheXiao:1' })
  })

  it('管理角色按优先级解析并正确限制能力', () => {
    expect(取管理角色({ 管理员: true, 运营: true, 审核员: true })).toBe('chao_guan')
    expect(取管理角色({ 运营: true, 审核员: true })).toBe('yun_ying')
    expect(取管理角色({ 审核员: true })).toBe('shen_he_yuan')
    expect(取管理角色({})).toBeNull()
    expect(取角色能力(null)).toEqual([])
    expect(取角色能力('yun_ying')).toEqual(角色能力矩阵.yun_ying)
    expect(角色具备能力('yun_ying', 'feng_jin')).toBe(true)
    expect(角色具备能力('yun_ying', 'feng_jin_shen_he')).toBe(false)
  })

  it('性别解析、读回、落库拒绝和展示转换保持唯一口径', () => {
    expect(解析性别(' MALE ')).toBe('nan')
    expect(解析性别('female')).toBe('nv')
    expect(解析性别('其他')).toBeNull()
    expect(是可识别性别('男')).toBe(true)
    expect(读回性别('未知', '来源', '标识')).toBe('nan')
    expect(落库性别或拒绝('女', '来源', '标识')).toBe('nv')
    expect(() => 落库性别或拒绝('其他', '来源', '标识')).toThrow(fanYi.anQuan.shenFenBuHeFa)
    try {
      落库性别或拒绝('其他', '来源', '标识')
    } catch (错误) {
      expect((错误 as Error & { zhuang_tai_ma?: number }).zhuang_tai_ma).toBe(400)
    }
    expect(内部转展示('nan')).toBe('男')
    expect(内部转展示('nv')).toBe('女')
    expect(内部转展示(null)).toBe('未知')
    expect(内部转用户形态('nan')).toBe('male')
    expect(内部转用户形态('nv')).toBe('female')
    expect(内部转用户形态(undefined)).toBeNull()
    expect(归一角色性别('MALE')).toBe('男')
  })

  it('真实IP解析可信代理、网段和非法输入', () => {
    const 原环境 = process.env.KE_XIN_DAI_LI_WANG_DUAN
    process.env.KE_XIN_DAI_LI_WANG_DUAN = '10.0.0.0/8,::1'
    expect(guiYiHuaIP('::ffff:192.168.1.1')).toBe('192.168.1.1')
    expect(guiYiHuaIP('::ffff:999.1.1.1')).toBe('::ffff:999.1.1.1')
    expect(jieXiKeXinWangDuan(['', '10.0.0.1/8', '10.0.0.1/33', '10.0.0.1/x', '2001:db8::1', '2001:db8::1/64', 'bad'])).toEqual([
      { lei_xing: 'ipv4', wang_duan_zhi: ((10 << 24) >>> 0) + 1, you_yi_wei_shu: 24 },
      { lei_xing: 'jing_que', di_zhi: '2001:db8::1' },
    ])
    expect(shiDuanKeXinDaiLi('10.1.2.3')).toBe(true)
    expect(shiDuanKeXinDaiLi('11.1.2.3')).toBe(false)
    expect(huoQuZhenShiIP(任意请求(undefined))).toBe('127.0.0.1')
    expect(huoQuZhenShiIP(任意请求('127.0.0.1', { 'x-real-ip': '10.2.3.4' }))).toBe('10.2.3.4')
    expect(huoQuZhenShiIP(任意请求('127.0.0.1', { 'x-real-ip': 'bad' }))).toBe('127.0.0.1')
    expect(huoQuZhenShiIP(任意请求('11.1.2.3', { 'x-real-ip': '10.2.3.4' }))).toBe('11.1.2.3')
    if (原环境 === undefined) delete process.env.KE_XIN_DAI_LI_WANG_DUAN
    else process.env.KE_XIN_DAI_LI_WANG_DUAN = 原环境
  })

  it('结局枚举、变体文案和随机池覆盖新旧存储值', () => {
    expect(结局枚举列表).toContain('sheng_li_ai_qing')
    expect(解析落库枚举('sheng_li_ai_qing')).toBe('sheng_li_ai_qing')
    expect(解析落库枚举(fanYi.jieJu.sheng_li_ai_qing)).toBe('sheng_li_ai_qing')
    expect(解析落库枚举('胜利-爱情')).toBe('sheng_li_ai_qing')
    expect(解析落库枚举('不存在')).toBeNull()
    expect(解析结局类型('不存在', false)).toBe('jinxing_zhong')
    expect(解析结局类型('不存在', true)).toBe('shi_bai_hao_gan_du_gui_ling')
    expect(渲染性别变体文案('jieJu', 'sheng_li_shi_po', '男')).toBe('识破渣男')
    expect(渲染性别变体文案('jieJu', '不存在', '未知')).toBe('')
    expect(渲染结局文案('jinxing_zhong', '男')).toBe('')
    expect(渲染结局文案('sheng_li_ai_qing', '女')).toBe(fanYi.jieJu.sheng_li_ai_qing)
    expect(是否通关结局('jinxing_zhong')).toBe(false)
    expect(是否通关结局(通关结局枚举列表[0])).toBe(true)
    expect(是否通关结局(失败结局枚举列表[0])).toBe(false)
    const 池 = 结局趣味文案池('sheng_li_ai_qing', '女')
    expect(池.length).toBeGreaterThan(0)
    expect(池.every((句子) => !句子.includes('{TA}'))).toBe(true)
    expect(结局趣味文案池('jinxing_zhong', '男')).toEqual([])
    expect(渲染结局池文案('{TA}来了', '女')).toBe('她来了')
    expect(随机结局趣味文案('sheng_li_ai_qing', '男', (候选) => 候选[0])).toBe(结局趣味文案池('sheng_li_ai_qing', '男')[0])
    expect(随机结局趣味文案('jinxing_zhong', '男')).toBe('')
    expect(解析结局文案('sheng_li_ai_qing', '男', '  已保存快照  ')).toBe('已保存快照')
    expect(解析结局文案('sheng_li_ai_qing', '男')).toBe(fanYi.jieJu.sheng_li_ai_qing)
  })
})
