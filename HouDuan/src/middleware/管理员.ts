import { debug日志 } from '../utils/debug日志'
import type { Response, NextFunction } from 'express'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuFanYi } from '../config/translations'
import { shiBaiXiangYing } from '../utils/xiangying'
import { 取管理角色, 角色具备能力, type 管理角色, type 管理能力 } from '../utils/角色能力'
import type { RenZhengQingQiu } from './认证'
import { CuoWuDaiMa, JiuDaiMa } from '../config/错误码注册表'

export interface GuanLiQingQiu extends RenZhengQingQiu {
  guan_li_jiao_se?: 管理角色
}

const huanCunYouXiaoQiHaoMiao = 30 * 1000
const huanCunRongLiangShangXian = 5000
const jiaoSeHuanCun = new Map<string, { zhi: 管理角色 | null; daoQiHaoMiao: number }>()

const ShiXiaoPinDao = 'guan_li_shi_xiao'
let yiDingYueShiXiao = false

export function 解析失效载荷(xiaoXi: string): string | null {
  try {
    const jieXi = JSON.parse(xiaoXi) as { 用户ID?: unknown; 用户编号?: unknown }
    if (typeof jieXi.用户ID === 'string' && jieXi.用户ID.length > 0) return jieXi.用户ID
    if (typeof jieXi.用户编号 === 'string' && jieXi.用户编号.length > 0) return jieXi.用户编号
    return null
  } catch {
    return null
  }
}

function chuLiShiXiaoXiaoXi(xiaoXi: string): void {
  const miaoBiao = 解析失效载荷(xiaoXi)
  if (miaoBiao) {
    jiaoSeHuanCun.delete(miaoBiao)
  } else {
    jiaoSeHuanCun.clear()
  }
}

function queBaoDingYue(): void {
  if (yiDingYueShiXiao || process.env.VITEST === 'true') return
  yiDingYueShiXiao = true
  try {
    const dingYueDuan = redis.duplicate()
    void dingYueDuan.subscribe(ShiXiaoPinDao).catch(() => undefined)
    dingYueDuan.on('message', (pinDao: string, xiaoXi: string) => {
      if (pinDao === ShiXiaoPinDao) chuLiShiXiaoXiaoXi(xiaoXi)
    })
  } catch {
    yiDingYueShiXiao = false
  }
}

export function qingChuJiaoSeHuanCun(用户ID?: string): void {
  if (用户ID) {
    jiaoSeHuanCun.delete(用户ID)
  } else {
    jiaoSeHuanCun.clear()
  }
  queBaoDingYue()
  try {
    void redis.publish(ShiXiaoPinDao, JSON.stringify({ 用户ID: 用户ID ?? null })).catch(() => undefined)
  } catch {
    return
  }
}

function xieRuHuanCun(用户ID: string, zhi: 管理角色 | null, daoQiHaoMiao: number): void {
  if (jiaoSeHuanCun.size >= huanCunRongLiangShangXian) {
    const xianZaiHaoMiao = Date.now()
    for (const [jian, xiang] of jiaoSeHuanCun) {
      if (xiang.daoQiHaoMiao <= xianZaiHaoMiao) {
        jiaoSeHuanCun.delete(jian)
      }
    }
    if (jiaoSeHuanCun.size >= huanCunRongLiangShangXian) {
      jiaoSeHuanCun.clear()
    }
  }
  jiaoSeHuanCun.set(用户ID, { zhi, daoQiHaoMiao })
}

export async function anYongHuIdQuJiaoSe(用户ID: string): Promise<管理角色 | null> {
  const xianZaiHaoMiao = Date.now()
  const huanCun = jiaoSeHuanCun.get(用户ID)
  if (huanCun && huanCun.daoQiHaoMiao > xianZaiHaoMiao) {
    return huanCun.zhi
  }
  const jieGuo = await 数据库.query(
    `SELECT "管理员", "运营", "审核员" FROM "用户" WHERE "ID" = $1 LIMIT 1`,
    [用户ID],
  )
  const jiaoSe = jieGuo.rows.length === 0 ? null : 取管理角色(jieGuo.rows[0])
  xieRuHuanCun(用户ID, jiaoSe, xianZaiHaoMiao + huanCunYouXiaoQiHaoMiao)
  return jiaoSe
}

export async function anYongHuIdJuBeiNengLi(用户ID: string, nengLi: 管理能力): Promise<boolean> {
  return 角色具备能力(await anYongHuIdQuJiaoSe(用户ID), nengLi)
}

async function menKong(
  qingQiu: RenZhengQingQiu,
  xiangYing: Response,
  xiaYiBu: NextFunction,
  xuYaoNengLi: 管理能力,
): Promise<void> {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CuoWuDaiMa.AUTHENTICATION_REQUIRED)
    return
  }

  try {
    const jiaoSe = await anYongHuIdQuJiaoSe(yongHu.用户ID)
    if (!角色具备能力(jiaoSe, xuYaoNengLi)) {
      shiBaiXiangYing(xiangYing, 403, huoQuFanYi('guanLiYuan', 'wuGuanLiQuanXian'), JiuDaiMa.WU_GUAN_LI_QUAN_XIAN)
      return
    }
    ;(qingQiu as GuanLiQingQiu).guan_li_jiao_se = jiaoSe as 管理角色
    xiaYiBu()
  } catch (cuoWu) {
    debug日志.error('管理员门禁', '管理身份校验失败', { xiang_qing: { cuo_wu: String(cuoWu), men_kong: xuYaoNengLi } })
    shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'), CuoWuDaiMa.DATABASE_ERROR)
  }
}

export function 创建能力门禁(所需能力: 管理能力) {
  return async (qingQiu: RenZhengQingQiu, xiangYing: Response, xiaYiBu: NextFunction): Promise<void> => {
    await menKong(qingQiu, xiangYing, xiaYiBu, 所需能力)
  }
}

export const guanLiZhiDuMenKong = 创建能力门禁('cha_kan')
export const guanLiFengJinMenKong = 创建能力门禁('feng_jin')
export const guanLiFengJinShenHeMenKong = 创建能力门禁('feng_jin_shen_he')
export const guanLiTongJiMenKong = 创建能力门禁('tong_ji_xie')
export const guanLiGaoWeiMenKong = 创建能力门禁('gao_we')
