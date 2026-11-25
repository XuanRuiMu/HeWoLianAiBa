import { debug日志 } from '../utils/debug日志'
import { huoQuFanYi } from '../config/translations'
import { JunShiZhiDaoDuanDingYi } from '../config/军师配置'
import { 按配置调用 } from '../utils/通用模型调用'
import { gouJianJunShiQiuZhuPrompt } from './Prompt构建器'
import { 构建军师知识层, 检索通用知识 } from './通用知识检索'
import { xiaoChuShuZhiXieLu } from '../utils/数值泄露过滤'
import { guoLvFenXiBiaoDa } from '../utils/分析层表达过滤'
import { 整理军师输入, 渲染军师证据文本 } from './军师输入'
import type { JunShiQiuZhuCanShu, JunShiQiuZhuJieGuo, JunShiZhiDaoFenDuan } from '../types'
import type { 参数上下文 } from '../config/AI参数策略'

export async function shengChengJunShiZhiDao(
  canShu: JunShiQiuZhuCanShu,
  _shangXiaWen?: 参数上下文,
): Promise<JunShiQiuZhuJieGuo> {
  try {
    void _shangXiaWen
    const 输入 = 整理军师输入(canShu.dui_hua_li_shi)
    if (!输入.可分析 || 输入.证据段.every((段) => 段.文本.includes(huoQuFanYi('liaoTian', 'yiCheHuiYuanWenQianZhui')))) {
      return { zhi_dao_fen_duan: null, zhi_dao_zheng_duan: huoQuJiangJiWenBen() }
    }
    const duiHuaWenBen = 渲染军师证据文本(输入)
    const zhiShiJianSuo = 检索通用知识(duiHuaWenBen)
    const zhiShiCeng = zhiShiJianSuo.被注入攻击拦截 ? '' : 构建军师知识层(zhiShiJianSuo)
    const xiangYing = await 按配置调用('JunShiQiuZhu', [
      { jiaoSe: 'system', neiRong: canShu.jun_shi_pei_zhi.xiTongTiShi },
      {
        jiaoSe: 'user',
        neiRong: gouJianJunShiQiuZhuPrompt(duiHuaWenBen, '', canShu.hao_gan_du, undefined, zhiShiCeng),
      },
    ])
    const yuanWen = xiangYing.neiRong.trim()
    if (!yuanWen) return { zhi_dao_fen_duan: null, zhi_dao_zheng_duan: huoQuJiangJiWenBen() }
    const fenDuan = jieXiJunShiFenDuan(yuanWen)
    if (!fenDuan) {
      debug日志.warn('军师指导', '军师输出不符合结构化 JSON', { xiang_qing: { zi_shu: yuanWen.length } })
      return { zhi_dao_fen_duan: null, zhi_dao_zheng_duan: huoQuJiangJiWenBen() }
    }
    const guoLvHou = guoLvJunShiBiaoDa(fenDuan)
    if (!guoLvHou.dangQianJuMian && !guoLvHou.xiaYiBuZenMeHui && !guoLvHou.weiShenMeZheMeLiao && !guoLvHou.kanDaoDeJiXiang && !guoLvHou.guLi) {
      return { zhi_dao_fen_duan: null, zhi_dao_zheng_duan: huoQuJiangJiWenBen() }
    }
    return { zhi_dao_fen_duan: guoLvHou, zhi_dao_zheng_duan: pinJieJunShiFenDuan(guoLvHou) }
  } catch (cuoWu) {
    debug日志.error('军师指导', '军师指导生成失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return { zhi_dao_fen_duan: null, zhi_dao_zheng_duan: huoQuJiangJiWenBen() }
  }
}

function qingLiJSONKuai(neiRong: string): Record<string, unknown> | null {
  const qingLi = neiRong.trim()
  const changShi: string[] = [qingLi]
  const piPei = qingLi.match(/\{[\s\S]*\}/)
  if (piPei) changShi.push(piPei[0])
  for (const changShiText of changShi) {
    try {
      const jieXi = JSON.parse(changShiText) as unknown
      if (jieXi && typeof jieXi === 'object' && !Array.isArray(jieXi)) return jieXi as Record<string, unknown>
    } catch {
      continue
    }
  }
  return null
}

function qieDuanWenBen(wenBen: string, zuiDaZiShu: number): string {
  const qu = wenBen.trim()
  const zi = Array.from(qu)
  if (zi.length <= zuiDaZiShu) return qu
  return `${zi.slice(0, Math.max(0, zuiDaZiShu - 1)).join('')}…`
}

export function jieXiJunShiFenDuan(neiRong: string): JunShiZhiDaoFenDuan | null {
  const duiXiang = qingLiJSONKuai(neiRong)
  if (!duiXiang) return null
  const fenDuan: JunShiZhiDaoFenDuan = {
    dangQianJuMian: '',
    xiaYiBuZenMeHui: '',
    weiShenMeZheMeLiao: '',
    kanDaoDeJiXiang: '',
    guLi: '',
  }
  for (const duan of JunShiZhiDaoDuanDingYi) {
    const yuanShi = duiXiang[duan.模型键]
    let wenBen = typeof yuanShi === 'string' ? yuanShi : ''
    if (duan.ziDuan === 'xiaYiBuZenMeHui') {
      wenBen = wenBen.split('\n').map((行) => qieDuanWenBen(行, 40)).filter((行) => 行).slice(0, 3).join('\n')
      fenDuan[duan.ziDuan] = wenBen
      continue
    }
    fenDuan[duan.ziDuan] = qieDuanWenBen(xiaoChuShuZhiXieLu(wenBen), duan.zuiDaZiShu)
  }
  if (!fenDuan.dangQianJuMian && !fenDuan.xiaYiBuZenMeHui && !fenDuan.weiShenMeZheMeLiao && !fenDuan.kanDaoDeJiXiang && !fenDuan.guLi) return null
  return fenDuan
}

function guoLvJunShiBiaoDa(fenDuan: JunShiZhiDaoFenDuan): JunShiZhiDaoFenDuan {
  return {
    dangQianJuMian: guoLvFenXiBiaoDa(fenDuan.dangQianJuMian, '军师·当前局面'),
    xiaYiBuZenMeHui: guoLvFenXiBiaoDa(fenDuan.xiaYiBuZenMeHui, '军师·下一步怎么回'),
    weiShenMeZheMeLiao: guoLvFenXiBiaoDa(fenDuan.weiShenMeZheMeLiao, '军师·为什么这么聊'),
    kanDaoDeJiXiang: guoLvFenXiBiaoDa(fenDuan.kanDaoDeJiXiang, '军师·关键提醒'),
    guLi: guoLvFenXiBiaoDa(fenDuan.guLi, '军师·鼓励'),
  }
}

export const JunShiZongZiShuShangXian = 200

export function pinJieJunShiFenDuan(fenDuan: JunShiZhiDaoFenDuan): string {
  const wenBen = JunShiZhiDaoDuanDingYi.map((duan) => fenDuan[duan.ziDuan]).filter((zhi) => zhi.length > 0).join('\n')
  const zi = Array.from(wenBen)
  if (zi.length <= JunShiZongZiShuShangXian) return wenBen
  return `${zi.slice(0, JunShiZongZiShuShangXian - 1).join('')}…`
}

function huoQuJiangJiWenBen(): string {
  return huoQuFanYi('junShi', 'zanShiMeiXiangHao')
}
