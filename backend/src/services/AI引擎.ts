import { huoQuFanYi } from '../config/translations'
import { peiZhi } from '../config'
import { debug日志 } from '../utils/debug日志'
import { redis } from '../redis'
import { huoQuIo } from '../socket/io'
import { shengChengDirectorCeLue } from './Director'
import { shengChengWriterHuiFu } from './Writer'
import { gouJianJiaoSeShangXiaWen, type CanShuShangXiaWen } from '../config/AI参数策略'
import type {
  AIYinQingShuRu,
  AIYinQingShuChu,
  DirectorCeLue,
} from '../types'

export * from './Director'
export * from './Writer'
export * from './情感分析'
export * from './好感度评判'
export * from './安全审核'
export * from './军师求助'
export * from './关键事件提取'

function xiuZhengTiaoShu(tiaoShu: number): number {
  return Math.max(0, Math.min(5, tiaoShu))
}

// R3 输出侧本地违禁词兜底：词表来自 peiZhi.shuChuWeiJinCiLieBiao，命中即拦截本轮全部回复
function hanWeiJinCi(wenBen: string): boolean {
  return peiZhi.shuChuWeiJinCiLieBiao.some((ci) => ci.length > 0 && wenBen.includes(ci))
}

function qieGeXiaoXi(xiaoXiLieBiao: string[], tiaoShu: number): string[] {
  return xiaoXiLieBiao.slice(0, xiuZhengTiaoShu(tiaoShu))
}

// P1-5 预算余量预警阈值：当日余量≤50时向用户推送一次提醒
const YU_SUAN_YU_JING_YU_LIANG = 50

// P1-5 预算触顶/预警的用户感知：经 Socket 向用户房间推送系统提示（结构与调度器 发送系统错误提示 一致）
function tuiSongXiTongTiShi(yongHuId: string, jiaoSeId: string, wenBen: string): void {
  const io = huoQuIo()
  if (!io) return
  io.to(yongHuId).emit('角色回复', {
    角色ID: jiaoSeId,
    消息列表: [{
      id: `sys-${Date.now()}`,
      hui_hua_id: jiaoSeId,
      fa_song_zhe_id: 'system',
      fa_song_zhe_lei_xing: 'xitong',
      nei_rong: wenBen,
      lei_xing: 'xitong_ti_shi',
      shi_jian_chuo: Date.now(),
      yi_du: false,
    }],
  })
}

// 本地内存兜底计数器（Redis 故障时使用）
const yuSuanNeiCunJiShu = new Map<string, { count: number; riQi: string; resetTime: number }>()

function qingLiGuoQiNeiCun(): void {
  const xianZai = Date.now()
  for (const [key, value] of yuSuanNeiCunJiShu) {
    if (xianZai > value.resetTime) {
      yuSuanNeiCunJiShu.delete(key)
    }
  }
}

// M3 成本护栏：每用户每日 AI 请求预算（Redis 计数），超限当日不再触发 LLM 调用。
// Redis 故障时本地内存兜底计数，避免预算检查拖垮主链路（C-7）。
async function jianChaMeiRiYuSuan(yongHuId: string): Promise<{ yunXu: boolean; chuFaYuJing: boolean }> {
  const riQi = new Date().toISOString().slice(0, 10)
  const jian = `ai_yu_suan:${yongHuId}:${riQi}`

  try {
    const yiYong = await redis.incr(`ai_yu_suan:${yongHuId}:${riQi}`)
    if (yiYong === 1) {
      await redis.expire(`ai_yu_suan:${yongHuId}:${riQi}`, 2 * 24 * 60 * 60)
    }
    const yuSuan = peiZhi.meiRiAIQingQiuYuSuan
    let chuFaYuJing = false
    if (yiYong >= yuSuan - YU_SUAN_YU_JING_YU_LIANG && yiYong <= yuSuan) {
      const sheZhi = await redis.set(`ai_yu_suan_yu_jing:${yongHuId}:${riQi}`, '1', 'EX', 86400, 'NX')
      chuFaYuJing = sheZhi === 'OK'
    }
    return { yunXu: yiYong <= yuSuan, chuFaYuJing }
  } catch (cuoWu) {
    debug日志.warn('AI引擎', 'AI 日预算 Redis 故障，启用本地内存兜底', {
      xiang_qing: { cuo_wu: String(cuoWu), yong_hu_id: yongHuId },
    })

    // 本地内存兜底
    qingLiGuoQiNeiCun()
    const key = `${yongHuId}:${riQi}`
    const jiLu = yuSuanNeiCunJiShu.get(key)
    const yuSuan = peiZhi.meiRiAIQingQiuYuSuan

    if (!jiLu || jiLu.riQi !== riQi) {
      yuSuanNeiCunJiShu.set(key, { count: 1, riQi, resetTime: Date.now() + 24 * 60 * 60 * 1000 })
      return { yunXu: true, chuFaYuJing: false }
    }

    jiLu.count++
    const yiYong = jiLu.count
    let chuFaYuJing = false
    if (yiYong >= yuSuan - YU_SUAN_YU_JING_YU_LIANG && yiYong <= yuSuan) {
      chuFaYuJing = true
    }
    return { yunXu: yiYong <= yuSuan, chuFaYuJing }
  }
}

export async function yunXingAIYinQing(
  shuRu: AIYinQingShuRu,
): Promise<AIYinQingShuChu> {
  // 检查点0：每用户日预算护栏（触顶推送系统提示，不再静默已读不回）
  const yuSuanJieGuo = await jianChaMeiRiYuSuan(shuRu.yong_hu_id)
  if (yuSuanJieGuo.chuFaYuJing) {
    tuiSongXiTongTiShi(shuRu.yong_hu_id, shuRu.jiao_se_id, huoQuFanYi('liaoTian', 'yuSuanYuJing'))
  }
  if (!yuSuanJieGuo.yunXu) {
    tuiSongXiTongTiShi(shuRu.yong_hu_id, shuRu.jiao_se_id, huoQuFanYi('liaoTian', 'aiYuSuanYiYongJin'))
    return {
      xiao_xi_lie_biao: [],
      shi_fou_hui_fu: false,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
      cuo_wu_xin_xi: huoQuFanYi('liaoTian', 'aiYuSuanYiYongJin'),
    }
  }

  // 检查点1：Director前 - 输入校验
  if (!shuRu.yong_hu_xin_xiao_xi?.trim()) {
    return {
      xiao_xi_lie_biao: [],
      shi_fou_hui_fu: false,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
    }
  }

  // M2 调用收敛：用户输入的安全审核已在 REST 路由层统一执行
  // （routes/消息.ts，含违规记录与 IP 封禁联动），引擎层不再重复调用 LLM 审核。
  // 输出侧防护由 Writer 输出后的本地违禁词兜底承担（见下方 guoLvShuChuWeiJin）。

  let ceLue: DirectorCeLue | undefined
  let jiang_ji_mo_shi = false
  let cuoWuXinXi: string | undefined

  // 人设/关系上下文：驱动 Director 与 Writer 的调用参数（温度/top_p）随 AI对象人设与关系阶段动态变化，
  // 而非沿用固定基座值。这是“按 AI对象具体人设确定参数”的根因落点。
  const shangXiaWen: CanShuShangXiaWen = {
    jiaoSe: gouJianJiaoSeShangXiaWen(shuRu.jiao_se),
    haoGanDu: shuRu.hao_gan_du
      ? {
          zong_fen: shuRu.hao_gan_du.zong_fen,
          guan_xi_jie_duan: shuRu.hao_gan_du.guan_xi_jie_duan,
        }
      : undefined,
  }

  // Director调用
  const directorJieGuo = await shengChengDirectorCeLue(shuRu, shangXiaWen)
  const directorSiKao = directorJieGuo.si_kao || undefined
  if (directorJieGuo.cheng_gong) {
    ceLue = directorJieGuo.ce_lue
  } else {
    // Director失败降级为单代理模式
    jiang_ji_mo_shi = true
    cuoWuXinXi = huoQuFanYi('AI', 'DirectorDiaoYongShiBai')
    // eslint-disable-next-line no-console -- AI引擎.test 断言此输出含「Director调用失败」(行为契约)
    console.error('Director调用失败，降级为单代理模式', directorJieGuo.cuo_wu)
  }

  // 检查点2：Writer前
  if (ceLue && !ceLue.shi_fou_hui_fu) {
    return {
      xiao_xi_lie_biao: [],
      shi_fou_hui_fu: false,
      shi_fou_che_hui: ceLue.shi_fou_che_hui,
      jiang_ji_mo_shi,
      si_kao: directorSiKao ? { director: directorSiKao } : undefined,
    }
  }

  try {
    // Writer调用（Director失败时降级为单代理，ceLue为undefined）
    const writerJieGuo = await shengChengWriterHuiFu(shuRu, ceLue, shangXiaWen)

    // 检查点2：Writer后 - R3 输出侧本地违禁词兜底（零额外 LLM 调用）
    const zuiZhongTiaoShu = ceLue
      ? xiuZhengTiaoShu(ceLue.hui_fu_tiao_shu)
      : writerJieGuo.xiao_xi_lie_biao.length
    let xiaoXiLieBiao = qieGeXiaoXi(writerJieGuo.xiao_xi_lie_biao, zuiZhongTiaoShu)

    const weiJinTiaoMu = xiaoXiLieBiao.filter((tiao) => hanWeiJinCi(tiao))
    if (weiJinTiaoMu.length > 0) {
      debug日志.error('AI引擎', 'Writer输出命中本地违禁词兜底，已拦截本轮回复', {
        xiang_qing: {
          jiao_se_id: shuRu.jiao_se_id,
          tiao_shu: weiJinTiaoMu.length,
        },
      })
      return {
        xiao_xi_lie_biao: [],
        shi_fou_hui_fu: false,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi,
        cuo_wu_xin_xi: huoQuFanYi('AI', 'ShenHeWeiGui'),
      }
    }

    // 检查点3：保存前
    return {
      xiao_xi_lie_biao: xiaoXiLieBiao,
      shi_fou_hui_fu: xiaoXiLieBiao.length > 0,
      shi_fou_che_hui: ceLue?.shi_fou_che_hui || false,
      jiang_ji_mo_shi,
      cuo_wu_xin_xi: cuoWuXinXi,
      si_kao:
        directorSiKao || writerJieGuo.si_kao
          ? { director: directorSiKao, writer: writerJieGuo.si_kao || undefined }
          : undefined,
    }
  } catch (cuoWu) {
    const writerCuoWu = cuoWu instanceof Error ? cuoWu.message : String(cuoWu)
    debug日志.error('AI引擎', 'Writer调用失败', { xiang_qing: { cuo_wu: writerCuoWu } })
    return {
      xiao_xi_lie_biao: [],
      shi_fou_hui_fu: false,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: true,
      cuo_wu_xin_xi: huoQuFanYi('AI', 'WriterDiaoYongShiBai'),
      si_kao: directorSiKao ? { director: directorSiKao } : undefined,
    }
  }
}
