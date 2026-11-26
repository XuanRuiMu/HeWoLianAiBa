import { redis } from '../redis'
import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'
import { yanZhengUUID } from '../utils/验证'
import { huoQuYongHuHuoDongFenBu, caiYangHuoDongShiKe } from './主动关怀时段'
import { huoQuChongTuXinXi } from './冲突弧'
import { huoQuAIJiaoSeXinXi, huoQuZuiJinDuiHuaLiShi, 保存角色XiaoXi } from './AI输入准备'
import { huoQuWanZhengHaoGanDu } from './好感度'
import {
  baoCunGuanHuaiWenAn,
  dangQianShiDuanMiaoShu,
  FuDuXiangSiDuYuZhi,
  guanHuaiXiangSiDu,
  huoQuZuiJinGuanHuaiWenAn,
  shengChengGuanHuaiNeiRong,
} from './主动关怀生成'
import { DanFaZhaMenYouXiaoMiao, shengChengDanFaZhaMenJian } from '../config/单发闸门'
import { huoQuJiaoSeBianHao } from './公开编号'
import { jiaoSeShiFouBeiDuoShe } from './夺舍'
import { huoQuIo } from '../socket/io'
import { huoQuShiQu } from '../config/语言与时区'
import type { GuanHuaiTiShiShuRu } from './Prompt构建器'
import type { ChongTuZhuangTaiMing, DuiHuaLiShiXiang } from '../types'

const SuoQianZhui = 'zhu_dong_guan_huai_suo:'
const YiFaQianZhui = 'zhu_dong_guan_huai_yifa:'
const YiFaYouXiaoMiao = 172800
const JingMoChuFaXiaoShi = 20
const JingMoChuFaHaoMiao = JingMoChuFaXiaoShi * 3600 * 1000
const XunJianJianGeHaoMiao = 30 * 60 * 1000
const XunJianMeiYongHuZuiDaHuiHuaShu = 10

function tuiSuanJingMoHaoMiao(liShi: DuiHuaLiShiXiang[], beiFenHaoMiao: number): number {
  for (let i = liShi.length - 1; i >= 0; i--) {
    const chuo = liShi[i]?.shi_jian_chuo
    if (typeof chuo === 'number' && Number.isFinite(chuo) && chuo > 0) {
      const cha = Date.now() - chuo
      return Number.isFinite(cha) && cha > 0 ? cha : beiFenHaoMiao
    }
  }
  return beiFenHaoMiao
}

async function chaXunJingMoHaoMiao(yongHuId: string, jiaoSeId: string): Promise<number | null> {
  try {
    const jieGuo = await 数据库.query(
      `SELECT EXTRACT(EPOCH FROM (NOW() - MAX("创建时间"))) * 1000 AS haoMiao
       FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
      [yongHuId, jiaoSeId],
    )
    const zhi = Number(jieGuo.rows[0]?.haoMiao || 0)
    return Number.isFinite(zhi) ? zhi : null
  } catch (chaXunCuoWu) {
    debug日志.warn('主动关怀', '静默时长查询失败，本次按未回归放行', {
      xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, cuo_wu: String(chaXunCuoWu).slice(0, 200) },
    })
    return null
  }
}

async function duQuYongHuShiQu(yongHuId: string): Promise<string> {
  try {
    const jieGuo = await 数据库.query(`SELECT "时区" FROM "用户" WHERE "ID" = $1 LIMIT 1`, [yongHuId])
    return huoQuShiQu(jieGuo.rows[0]?.时区)
  } catch (cuoWu) {
    debug日志.warn('主动关怀', '读取用户时区失败，按兜底时区处理', {
      xiang_qing: { yong_hu_id: yongHuId, cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return huoQuShiQu(null)
  }
}

async function faSongGuanHuaiXiaoXi(yongHuId: string, jiaoSeId: string, neiRong: string): Promise<void> {
  const 保存结果 = await 保存角色XiaoXi({ yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, nei_rong: neiRong })
  try {
    const io = huoQuIo()
    if (!io) return
    const duiWaiJiaoSeId = await huoQuJiaoSeBianHao(jiaoSeId).catch(() => jiaoSeId)
    io.to(yongHuId).emit('角色回复', { 角色ID: duiWaiJiaoSeId, 消息列表: [保存结果] })
  } catch (tuiSongCuoWu) {
    debug日志.warn('主动关怀', '关怀消息已落库但推送失败，降级不抛', {
      xiang_qing: {
        yong_hu_id: yongHuId,
        jiao_se_id: jiaoSeId,
        xiao_xi_id: 保存结果?.id ?? '',
        cuo_wu: String(tuiSongCuoWu).slice(0, 200),
      },
    })
  }
}

export async function zhiXingGuanHuaiFaSong(
  yongHuId: string,
  jiaoSeId: string,
  anPaiShiJingMoHaoMiao: number,
): Promise<boolean> {
  let chongTuZhuangTai: ChongTuZhuangTaiMing = 'wu'
  let chongTuShiYou = ''
  try {
    const chongTuXinXi = await huoQuChongTuXinXi(yongHuId, jiaoSeId)
    chongTuZhuangTai = chongTuXinXi?.zhuangTai ?? 'wu'
    chongTuShiYou = chongTuXinXi?.shiYou ?? ''
  } catch (chaXunCuoWu) {
    debug日志.warn('主动关怀', '发送时刻冲突档读取失败，按无冲突放行', {
      xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, cuo_wu: String(chaXunCuoWu).slice(0, 200) },
    })
  }
  if (chongTuZhuangTai === 'yiDuBuHui') {
    debug日志.debug('主动关怀', '发送时刻冲突已到已读不回，放弃本次关怀（不占用48小时已发锁，化解后可补偿）', {
      xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId },
    })
    return false
  }
  const yuJianZhaMenJian = shengChengDanFaZhaMenJian(yongHuId, jiaoSeId)
  const zhaMenYiZhan = await redis.get(yuJianZhaMenJian).catch(() => null)
  if (zhaMenYiZhan) {
    debug日志.debug('主动关怀', '单发闸门已被占用（生成前廉价预检），本次关怀放弃', {
      xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId },
    })
    return false
  }
  let yiFaJian: string | null = null
  let zhaMenJian: string | null = null
  const shiFangYiZhanSuo = async (): Promise<void> => {
    if (yiFaJian) await redis.del(yiFaJian).catch(() => null)
    if (zhaMenJian) await redis.del(zhaMenJian).catch(() => null)
  }
  try {
    const [jiaoSe, duiHuaLiShi, haoGanDu, zuiJinGuanHuai, yongHuShiQu] = await Promise.all([
      huoQuAIJiaoSeXinXi(jiaoSeId),
      huoQuZuiJinDuiHuaLiShi(yongHuId, jiaoSeId),
      huoQuWanZhengHaoGanDu(yongHuId, jiaoSeId).catch(() => null),
      huoQuZuiJinGuanHuaiWenAn(yongHuId, jiaoSeId),
      duQuYongHuShiQu(yongHuId),
    ])
    if (!jiaoSe) {
      debug日志.warn('主动关怀', '角色信息读取失败，本次关怀放弃（不占用48小时已发锁）', {
        xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId },
      })
      return false
    }
    const jiChuShuRu: GuanHuaiTiShiShuRu = {
      jiao_se: jiaoSe,
      hao_gan_du: haoGanDu,
      dui_hua_li_shi: duiHuaLiShi.slice(-6),
      jingMoMiao: tuiSuanJingMoHaoMiao(duiHuaLiShi, anPaiShiJingMoHaoMiao),
      dangQianShiDuan: dangQianShiDuanMiaoShu(new Date(), yongHuShiQu),
      chongTuZhuangTai,
      chongTuShiYou,
      zuiJinGuanHuai,
    }
    let neiRong = await shengChengGuanHuaiNeiRong(jiChuShuRu)
    if (neiRong === null) {
      debug日志.warn('主动关怀', '关怀内容生成失败，本次关怀放弃（不占用48小时已发锁，下个窗口可补偿）', {
        xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId },
      })
      return false
    }
    if (guanHuaiXiangSiDu(neiRong, zuiJinGuanHuai) >= FuDuXiangSiDuYuZhi) {
      debug日志.warn('主动关怀', '生成内容与最近关怀相似度过高，追加更强禁令重试一次', {
        xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId },
      })
      neiRong = await shengChengGuanHuaiNeiRong({ ...jiChuShuRu, jiaQiangJinLing: true })
      if (neiRong === null) {
        debug日志.warn('主动关怀', '重试生成仍失败，本次关怀放弃（不占用48小时已发锁，下个窗口可补偿）', {
          xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId },
        })
        return false
      }
      if (guanHuaiXiangSiDu(neiRong, zuiJinGuanHuai) >= FuDuXiangSiDuYuZhi) {
        debug日志.warn('主动关怀', '重试后仍与最近关怀重复，本次关怀放弃（不占用48小时已发锁，下个窗口可补偿）', {
          xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId },
        })
        return false
      }
    }
    const fuHeHaoMiao = await chaXunJingMoHaoMiao(yongHuId, jiaoSeId)
    if (fuHeHaoMiao !== null && fuHeHaoMiao < JingMoChuFaHaoMiao) {
      debug日志.warn('主动关怀', '用户已回归，放弃本次关怀（不占锁不发送）', {
        xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, jing_mo_xiao_shi: Math.round(fuHeHaoMiao / 3600000) },
      })
      return false
    }
    zhaMenJian = shengChengDanFaZhaMenJian(yongHuId, jiaoSeId)
    yiFaJian = `${YiFaQianZhui}${yongHuId}:${jiaoSeId}`
    const zhanSuo = await redis.set(yiFaJian, '1', 'EX', YiFaYouXiaoMiao, 'NX').catch(() => null)
    if (!zhanSuo) {
      debug日志.debug('主动关怀', '48小时已发锁已被占用，本次关怀放弃', {
        xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId },
      })
      return false
    }
    const zhaMenQiangZhan = await redis.set(zhaMenJian, '1', 'EX', DanFaZhaMenYouXiaoMiao, 'NX').catch(() => null)
    if (!zhaMenQiangZhan) {
      await redis.del(yiFaJian).catch(() => null)
      yiFaJian = null
      debug日志.warn('主动关怀', '单发闸门被追加消息占用，本次关怀放弃并释放48小时锁', {
        xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId },
      })
      return false
    }
    const faSongQianFuHe = await chaXunJingMoHaoMiao(yongHuId, jiaoSeId)
    if (faSongQianFuHe !== null && faSongQianFuHe < JingMoChuFaHaoMiao) {
      await shiFangYiZhanSuo()
      yiFaJian = null
      zhaMenJian = null
      debug日志.warn('主动关怀', '用户已回归，放弃本次关怀（不占锁不发送）', {
        xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, jing_mo_xiao_shi: Math.round(faSongQianFuHe / 3600000) },
      })
      return false
    }
    try {
      await faSongGuanHuaiXiaoXi(yongHuId, jiaoSeId, neiRong)
    } catch (faSongCuoWu) {
      await shiFangYiZhanSuo()
      yiFaJian = null
      zhaMenJian = null
      debug日志.warn('主动关怀', '关怀消息落库失败，已释放48小时锁与单发闸门以便下个窗口补偿', {
        xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, cuo_wu: String(faSongCuoWu).slice(0, 200) },
      })
      return false
    }
    await baoCunGuanHuaiWenAn(yongHuId, jiaoSeId, neiRong)
    await jiLuGuanHuaiFaSong(yongHuId, jiaoSeId, neiRong)
    debug日志.info('主动关怀', '主动关怀消息已发送', {
      xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, zi_shu: neiRong.length, chong_tu: chongTuZhuangTai },
    })
    return true
  } catch (cuoWu) {
    await shiFangYiZhanSuo()
    debug日志.warn('主动关怀', '主动关怀发送失败', {
      xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return false
  }
}

export async function anPaiGuanHuai(
  yongHuId: string,
  jiaoSeId: string,
): Promise<void> {
  try {
    if (await jiaoSeShiFouBeiDuoShe(jiaoSeId)) {
      debug日志.info('主动关怀', '角色已被夺舍接管，跳过本次关怀安排', {
        xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId },
      })
      return
    }
    const suoJian = `${SuoQianZhui}${yongHuId}:${jiaoSeId}`
    const yiFa = await redis.get(`${YiFaQianZhui}${yongHuId}:${jiaoSeId}`).catch(() => null)
    if (yiFa) return

    const jingMoHaoMiao = await chaXunJingMoHaoMiao(yongHuId, jiaoSeId)
    if (jingMoHaoMiao === null || jingMoHaoMiao < JingMoChuFaHaoMiao) return

    const yongHuShiQu = await duQuYongHuShiQu(yongHuId)
    const fenBu = await huoQuYongHuHuoDongFenBu(yongHuId, jiaoSeId)
    const shiKe = caiYangHuoDongShiKe(fenBu, new Date())
    if (!shiKe) return

    const dengDaiHaoMiao = shiKe.getTime() - Date.now()
    if (dengDaiHaoMiao <= 0) return

    const zhanSuo = await redis.set(suoJian, '1', 'PX', dengDaiHaoMiao, 'NX').catch(() => null)
    if (!zhanSuo) {
      debug日志.info('主动关怀', '该会话已有关怀排期，不重复堆叠定时器', {
        xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId },
      })
      return
    }
    debug日志.info('主动关怀', '已安排 48 小时窗口内的主动关怀', {
      xiang_qing: { jiao_se_id: jiaoSeId, jing_mo_xiao_shi: Math.round(jingMoHaoMiao / 3600000), fa_song_shi_ke: shiKe.toISOString() },
    })

    setTimeout(() => {
      void zhiXingGuanHuaiFaSong(yongHuId, jiaoSeId, jingMoHaoMiao)
    }, dengDaiHaoMiao)
  } catch (cuoWu) {
    debug日志.warn('主动关怀', '主动关怀安排失败', { xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) } })
  }
}

export async function jianChaBingAnPaiGuanHuaiDuiHua(yongHuId: string, jiaoSeId: string): Promise<void> {
  try {
    if (!yanZhengUUID(yongHuId) || !yanZhengUUID(jiaoSeId)) return
    const jingMoHaoMiao = await chaXunJingMoHaoMiao(yongHuId, jiaoSeId)
    if (jingMoHaoMiao === null || jingMoHaoMiao < JingMoChuFaHaoMiao) return
    await anPaiGuanHuai(yongHuId, jiaoSeId)
  } catch (cuoWu) {
    debug日志.warn('主动关怀', '触发源检查失败，跳过本次关怀安排', {
      xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, cuo_wu: String(cuoWu).slice(0, 200) },
    })
  }
}

function shouJiZaiXianYongHuIdLieBiao(): string[] {
  const io = huoQuIo()
  if (!io) return []
  const fangJian = io.sockets?.adapter?.rooms
  if (!fangJian || typeof fangJian.keys !== 'function') return []
  const jieGuo: string[] = []
  for (const jian of fangJian.keys()) {
    if (yanZhengUUID(jian)) jieGuo.push(jian)
  }
  return jieGuo
}

export async function zhiXingYiCiGuanHuaiXunJian(): Promise<void> {
  try {
    const zaiXian = shouJiZaiXianYongHuIdLieBiao()
    if (zaiXian.length === 0) return
    for (const yongHuId of zaiXian) {
      let huiHuaLieBiao: unknown[]
      try {
        const jieGuo = await 数据库.query(
          `SELECT "角色ID" FROM "消息"
           WHERE "用户ID" = $1
           GROUP BY "角色ID"
           HAVING MAX("创建时间") < NOW() - ($2 || ' hours')::interval
           LIMIT $3`,
          [yongHuId, String(JingMoChuFaXiaoShi), XunJianMeiYongHuZuiDaHuiHuaShu],
        )
        huiHuaLieBiao = jieGuo.rows
      } catch (chaXunCuoWu) {
        debug日志.warn('主动关怀', '巡检会话查询失败，跳过该用户', {
          xiang_qing: { yong_hu_id: yongHuId, cuo_wu: String(chaXunCuoWu).slice(0, 200) },
        })
        continue
      }
      for (const hang of huiHuaLieBiao) {
        const jiaoSeId = typeof (hang as Record<string, unknown>)['角色ID'] === 'string'
          ? String((hang as Record<string, unknown>)['角色ID'])
          : ''
        if (!jiaoSeId) continue
        await anPaiGuanHuai(yongHuId, jiaoSeId)
      }
    }
  } catch (cuoWu) {
    debug日志.warn('主动关怀', '在线用户关怀巡检失败', { xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) } })
  }
}

let xunJianDingShiQi: NodeJS.Timeout | null = null

export function qiDongGuanHuaiXunJianDingShiQi(): void {
  if (xunJianDingShiQi) return
  xunJianDingShiQi = setInterval(() => {
    void zhiXingYiCiGuanHuaiXunJian()
  }, XunJianJianGeHaoMiao)
  xunJianDingShiQi.unref?.()
}

export function tingZhiGuanHuaiXunJianDingShiQi(): void {
  if (xunJianDingShiQi) {
    clearInterval(xunJianDingShiQi)
    xunJianDingShiQi = null
  }
}

export async function jiLuGuanHuaiFaSong(yongHuId: string, jiaoSeId: string, neiRong: string): Promise<void> {
  try {
    await 数据库.query(
      `INSERT INTO "通知" ("接收者ID", "标题", "内容", "已读") VALUES ($1, $2, $3, FALSE)`,
      [yongHuId, '来自 AI 的关心', neiRong],
    )
  } catch (cuoWu) {
    debug日志.warn('主动关怀', '关怀记录落库失败', { xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) } })
  }
}
