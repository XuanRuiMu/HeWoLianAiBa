import { describe, expect, it } from 'vitest'
import {
  HAO_YOU_SHANG_CHUAN_LEI_BIE,
  LEI_BIE_LIE_BIAO,
  YU_YIN_SHI_CHANG_SHANG_XIAN_HAO_MIAO,
  guiYiHuaShangChuanShiChang,
  shiHaoYouShangChuanLeiBie,
} from '../../config/媒体配置'
import { HAO_YOU_YU_JU, yingSheHaoYouXiaoXi } from '../../routes/好友'
import type { KuaiShangXiaWen } from '../../services/消息'

const WU_KUAI: KuaiShangXiaWen = { kuaiOf: () => null, meiTiOf: () => null }

describe('好友媒体上传白名单', () => {
  it('语音在好友上传白名单内，与全量媒体类别一致', () => {
    expect(HAO_YOU_SHANG_CHUAN_LEI_BIE).toEqual(LEI_BIE_LIE_BIAO)
    expect(shiHaoYouShangChuanLeiBie('yuyin')).toBe(true)
    expect(shiHaoYouShangChuanLeiBie('tupian')).toBe(true)
    expect(shiHaoYouShangChuanLeiBie('biaoqingshu')).toBe(true)
    expect(shiHaoYouShangChuanLeiBie('wenjian')).toBe(true)
  })

  it('白名单之外的类别被拒绝', () => {
    expect(shiHaoYouShangChuanLeiBie('')).toBe(false)
    expect(shiHaoYouShangChuanLeiBie('shiPin')).toBe(false)
    expect(shiHaoYouShangChuanLeiBie(undefined)).toBe(false)
  })
})

describe('上传时长归一化', () => {
  it('合法毫秒数取整保留', () => {
    expect(guiYiHuaShangChuanShiChang(5000)).toBe(5000)
    expect(guiYiHuaShangChuanShiChang('7000')).toBe(7000)
    expect(guiYiHuaShangChuanShiChang(4999.6)).toBe(5000)
    expect(guiYiHuaShangChuanShiChang(YU_YIN_SHI_CHANG_SHANG_XIAN_HAO_MIAO)).toBe(
      YU_YIN_SHI_CHANG_SHANG_XIAN_HAO_MIAO,
    )
  })

  it('非法或超上限的时长一律不落库', () => {
    expect(guiYiHuaShangChuanShiChang(0)).toBeNull()
    expect(guiYiHuaShangChuanShiChang(-1)).toBeNull()
    expect(guiYiHuaShangChuanShiChang(YU_YIN_SHI_CHANG_SHANG_XIAN_HAO_MIAO + 1)).toBeNull()
    expect(guiYiHuaShangChuanShiChang(Number.NaN)).toBeNull()
    expect(guiYiHuaShangChuanShiChang(Number.POSITIVE_INFINITY)).toBeNull()
    expect(guiYiHuaShangChuanShiChang('abc')).toBeNull()
    expect(guiYiHuaShangChuanShiChang('')).toBeNull()
    expect(guiYiHuaShangChuanShiChang(undefined)).toBeNull()
    expect(guiYiHuaShangChuanShiChang(null)).toBeNull()
    expect(guiYiHuaShangChuanShiChang({})).toBeNull()
  })
})

describe('好友消息查询与出参带出语音时长', () => {
  it('两条分页语句都取媒体时长列', () => {
    expect(HAO_YOU_YU_JU.查消息列表).toContain('f."时长毫秒"')
    expect(HAO_YOU_YU_JU.查更早消息).toContain('f."时长毫秒"')
  })

  it('语音时长映射为 mei_ti_shi_chang_hao_miao 出参', () => {
    const chuCan = yingSheHaoYouXiaoXi(
      {
        ID: 'xiao-xi-1',
        发送者ID: 'wo',
        接收者ID: 'ta',
        内容: '',
        类型: 'yuYin',
        媒体ID: 'mei-ti-1',
        已读: false,
        撤回: false,
        创建时间: '2026-10-24T00:00:00.000Z',
        内容块: null,
        被引用消息ID: null,
        SHA256: 'a'.repeat(64),
        类别: 'yuyin',
        原始文件名: 'yuyin-1.webm',
        大小字节: 20480,
        时长毫秒: 8000,
      },
      'wo',
      WU_KUAI,
    )
    expect(chuCan.lei_xing).toBe('yuYin')
    expect(chuCan.mei_ti_shi_chang_hao_miao).toBe(8000)
  })

  it('无时长或已撤回的消息出参时长为 null', () => {
    const jiChu = {
      ID: 'xiao-xi-2',
      发送者ID: 'wo',
      接收者ID: 'ta',
      内容: '',
      类型: 'yuYin',
      媒体ID: 'mei-ti-2',
      已读: false,
      撤回: false,
      创建时间: '2026-10-24T00:00:00.000Z',
      内容块: null,
      被引用消息ID: null,
      SHA256: 'b'.repeat(64),
      类别: 'yuyin',
      原始文件名: null,
      大小字节: null,
      时长毫秒: null,
    }
    expect(yingSheHaoYouXiaoXi(jiChu, 'wo', WU_KUAI).mei_ti_shi_chang_hao_miao).toBeNull()
    expect(
      yingSheHaoYouXiaoXi({ ...jiChu, 撤回: true, 时长毫秒: 8000 }, 'wo', WU_KUAI)
        .mei_ti_shi_chang_hao_miao,
    ).toBeNull()
  })
})
