import { huoQuFanYi } from '../config/translations'
import { peiZhi } from '../config'
import { debug日志 } from '../utils/debug日志'
import { shengChengXiTongTiShiId } from '../utils/消息身份'
import { redis } from '../redis'
import { huoQuIo } from '../socket/io'
import { shengChengDirectorCeLue } from './Director'
import { shengChengWriterHuiFu } from './Writer'
import { jianChaAiWei, panDuanShiFouCaiYang, panDuanShiFouMoXingChouJian, guoLvAiWeiXiaoXi } from '../config/去AI味配置'
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

const ZUI_DA_TIAO_SHU = 5

function xiuZhengTiaoShu(tiaoShu: number): number {
  return Math.max(0, Math.min(ZUI_DA_TIAO_SHU, tiaoShu))
}

function hanWeiJinCi(wenBen: string): boolean {
  return peiZhi.shuChuWeiJinCiLieBiao.some((ci) => ci.length > 0 && wenBen.includes(ci))
}

function qieGeXiaoXi(xiaoXiLieBiao: string[], tiaoShu: number): string[] {
  return xiaoXiLieBiao.slice(0, xiuZhengTiaoShu(tiaoShu))
}

const YU_SUAN_YU_JING_YU_LIANG = 50

function tuiSongXiTongTiShi(yongHuId: string, jiaoSeId: string, wenBen: string): void {
  const io = huoQuIo()
  if (!io) return
  io.to(yongHuId).emit('角色回复', {
    角色ID: jiaoSeId,
    消息列表: [{
      id: shengChengXiTongTiShiId(),
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

const yuSuanNeiCunJiShu = new Map<string, { count: number; riQi: string; resetTime: number }>()
const YU_SUAN_NEI_CUN_ZUI_DA = 500

function qingLiGuoQiNeiCun(): void {
  const xianZai = Date.now()
  for (const [jianMing, value] of yuSuanNeiCunJiShu) {
    if (xianZai > value.resetTime) {
      yuSuanNeiCunJiShu.delete(jianMing)
    }
  }
  while (yuSuanNeiCunJiShu.size > YU_SUAN_NEI_CUN_ZUI_DA) {
    const shouJian = yuSuanNeiCunJiShu.keys().next().value
    if (shouJian === undefined) break
    yuSuanNeiCunJiShu.delete(shouJian)
  }
}

async function jianChaMeiRiYuSuan(yongHuId: string): Promise<{ yunXu: boolean; chuFaYuJing: boolean }> {
    const riQi = new Date().toISOString().slice(0, 10)

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

    qingLiGuoQiNeiCun()
    const jianMing = `${yongHuId}:${riQi}`
    const jiLu = yuSuanNeiCunJiShu.get(jianMing)
    const yuSuan = peiZhi.meiRiAIQingQiuYuSuan

    if (!jiLu || jiLu.riQi !== riQi) {
      yuSuanNeiCunJiShu.set(jianMing, { count: 1, riQi, resetTime: Date.now() + 24 * 60 * 60 * 1000 })
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
  waiBuXinHao?: AbortSignal,
): Promise<AIYinQingShuChu> {
  if (waiBuXinHao?.aborted) {
    return {
      xiao_xi_lie_biao: [],
      shi_fou_hui_fu: false,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
    }
  }

  const shiYuJingTongDao = shuRu.yong_hu_xin_xiao_xi.startsWith('[系统提示：用户连发多条消息')
  const yuSuanJieGuo = shiYuJingTongDao
    ? { yunXu: true, chuFaYuJing: false }
    : await jianChaMeiRiYuSuan(shuRu.yong_hu_id)
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

  if (!shuRu.yong_hu_xin_xiao_xi?.trim()) {
    return {
      xiao_xi_lie_biao: [],
      shi_fou_hui_fu: false,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
    }
  }


  let ceLue: DirectorCeLue | undefined
  let jiang_ji_mo_shi = false
  let cuoWuXinXi: string | undefined

  const shangXiaWen: CanShuShangXiaWen = {
    jiaoSe: gouJianJiaoSeShangXiaWen(shuRu.jiao_se),
    haoGanDu: shuRu.hao_gan_du
      ? {
          zong_fen: shuRu.hao_gan_du.zong_fen,
          guan_xi_jie_duan: shuRu.hao_gan_du.guan_xi_jie_duan,
        }
      : undefined,
  }

  const directorJieGuo = await shengChengDirectorCeLue(shuRu, shangXiaWen, waiBuXinHao)
  const directorSiKao = directorJieGuo.si_kao || undefined
  if (directorJieGuo.cheng_gong) {
    ceLue = directorJieGuo.ce_lue
  } else if (directorJieGuo.cuo_wu === 'XIAN_LIU_429') {
    return {
      xiao_xi_lie_biao: [],
      shi_fou_hui_fu: false,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
      cuo_wu_xin_xi: huoQuFanYi('AI', 'aiXianLiuQingShaoHou'),
      cuo_wu_ma: 'XIAN_LIU_429',
      yong_hu_id: shuRu.yong_hu_id,
    }
  } else if (directorJieGuo.cuo_wu === 'YU_E_BU_ZU_402') {
    return {
      xiao_xi_lie_biao: [],
      shi_fou_hui_fu: false,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
      cuo_wu_xin_xi: huoQuFanYi('AI', 'aiYuEBuZuQingLianXiRenGong'),
      cuo_wu_ma: 'YU_E_BU_ZU_402',
    }
  } else {
    jiang_ji_mo_shi = true
    cuoWuXinXi = huoQuFanYi('AI', 'DirectorDiaoYongShiBai')
    debug日志.error('AI引擎', 'Director调用失败，降级为单代理模式', { xiang_qing: { cuo_wu: String(directorJieGuo.cuo_wu) } })
  }

  if (ceLue && !ceLue.shi_fou_hui_fu) {
    return {
      xiao_xi_lie_biao: [],
      shi_fou_hui_fu: false,
      shi_fou_che_hui: ceLue.shi_fou_che_hui,
jiang_ji_mo_shi,
        si_kao: directorSiKao ? { director: directorSiKao } : undefined,
        ce_lue: ceLue,
      }
    }

  try {
    if (waiBuXinHao?.aborted) {
      return {
        xiao_xi_lie_biao: [],
        shi_fou_hui_fu: false,
        shi_fou_che_hui: false,
jiang_ji_mo_shi: false,
          ce_lue: ceLue,
        }
      }
    const writerJieGuo = await shengChengWriterHuiFu(shuRu, ceLue, shangXiaWen, waiBuXinHao)

    let xiaoXiLieBiao = qieGeXiaoXi(writerJieGuo.xiao_xi_lie_biao, ZUI_DA_TIAO_SHU)
    if (writerJieGuo.xiao_xi_lie_biao.length > ZUI_DA_TIAO_SHU) {
      debug日志.warn('AI引擎', 'Writer 输出条数超失控护栏，已截断', {
        xiang_qing: {
          jiao_se_id: shuRu.jiao_se_id,
          yong_hu_id: shuRu.yong_hu_id,
          yuan_shu_liao: writerJieGuo.xiao_xi_lie_biao.length,
          huo_liu: ZUI_DA_TIAO_SHU,
        },
      })
    }

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
          ce_lue: ceLue,
        }
    }

    const aiWeiGuoLv = guoLvAiWeiXiaoXi(xiaoXiLieBiao)
    if (aiWeiGuoLv.beiFengSha.length > 0) {
      xiaoXiLieBiao = aiWeiGuoLv.baoLiu
      debug日志.warn('AI引擎', 'Writer输出命中过AI味规则，已过滤', {
        xiang_qing: {
          jiao_se_id: shuRu.jiao_se_id,
          tiao_shu: aiWeiGuoLv.beiFengSha.length,
        },
      })
    }

    const aiWeiWenBen = xiaoXiLieBiao.join('\n')
    const aiWeiJianCha = jianChaAiWei(aiWeiWenBen)
    if (!aiWeiJianCha.tongGuo && panDuanShiFouCaiYang()) {
      debug日志.warn('AI引擎', 'Writer输出命中去AI味规则，采样送检', {
        xiang_qing: { jiao_se_id: shuRu.jiao_se_id, ming_zhong: aiWeiJianCha.mingZhong.slice(0, 5) },
      })
      if (panDuanShiFouMoXingChouJian()) {
        const { paiRuZhongShiDuiLie } = await import('./重试队列')
        await paiRuZhongShiDuiLie({ leiXing: 'quAiWeiChouJian', yuanYin: aiWeiJianCha.mingZhong.slice(0, 3).join(',') || 'gui_ze_ming_zhong' }).catch(() => undefined)
      }
    }

    const zhenDeYaHui = ceLue?.shi_fou_hui_fu !== false
    if (zhenDeYaHui && xiaoXiLieBiao.length === 0 && !cuoWuXinXi) {
      debug日志.error('AI引擎', 'Director要求回复但Writer输出为空，按失败处理（区别于「已读不回」）', {
        xiang_qing: {
          jiao_se_id: shuRu.jiao_se_id,
          ce_lue: ceLue?.hui_fu_ce_lue,
          yuan_wen_chang_du: writerJieGuo.yuan_wen?.length ?? 0,
        },
      })
      cuoWuXinXi = huoQuFanYi('AI', 'WriterFuShiKongBai')
    }

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
      ce_lue: ceLue,
      kai_chang_hou_xuan: writerJieGuo.kai_chang_hou_xuan,
      yuan_wen: writerJieGuo.yuan_wen,
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
        ce_lue: ceLue,
      }
    }
}
