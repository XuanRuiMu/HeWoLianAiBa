import { huoQuFanYi } from '../config/translations'
import { peiZhi } from '../config'
import { debug日志 } from '../utils/debug日志'
import { shengChengXiTongTiShiId } from '../utils/消息身份'
import { redis } from '../redis'
import { huoQuIo } from '../socket/io'
import { shengChengDirectorCeLue } from './Director'
import { shengChengWriterHuiFu } from './Writer'
import { jianChaAiWei, panDuanShiFouCaiYang, panDuanShiFouMoXingChouJian, guoLvAiWeiXiaoXi, jianChaTaoHua, panDuanTaoHuaCaiYang } from '../config/去AI味配置'
import { gouJianJiaoSeShangXiaWen, type 参数上下文 } from '../config/AI参数策略'
import { 检索通用知识, 提取必答事实 } from './通用知识检索'
import { qingXiBiaoQingBaoCanPian } from './表情包标记'
import { 转义表情标记 } from './表情标记'
import type {
  AIYinQingShuChu,
  AIYinQingShuRu,
  BiDaShiShi,
  DirectorCeLue,
} from '../types'

export * from './Director'
export * from './Writer'
export * from './情感分析'
export * from './好感度评判'
export * from './安全审核'
export * from './军师求助'

const ZuiDaTiaoShu = 5

function shuoDaoLeShiShi(xiaoXiLieBiao: readonly string[], biDaShiShi: BiDaShiShi): boolean {
  const 合文 = xiaoXiLieBiao.join('\n')
  return biDaShiShi.bi_xu_yao_su.some((写法集合) =>
    写法集合.some((写法) => 合文.includes(写法)),
  )
}

function xiuZhengTiaoShu(tiaoShu: number): number {
  return Math.max(0, Math.min(ZuiDaTiaoShu, tiaoShu))
}

function hanWeiJinCi(wenBen: string): boolean {
  return peiZhi.shuChuWeiJinCiLieBiao.some((ci) => ci.length > 0 && wenBen.includes(ci))
}

function shiBiaoQingBaoTiao(mu: string): boolean {
  return /^\s*\[表情包[:：][^\]]+\]\s*$/.test(String(mu || ''))
}

export function qieGeXiaoXi(xiaoXiLieBiao: string[], tiaoShu: number): string[] {
  const 上限 = xiuZhengTiaoShu(tiaoShu)
  if (上限 <= 0) return []
  const 结果: string[] = []
  let 文字条数 = 0
  for (const 条 of 小列表化(xiaoXiLieBiao)) {
    if (shiBiaoQingBaoTiao(条)) {
      结果.push(条)
      continue
    }
    if (文字条数 >= 上限) break
    结果.push(条)
    文字条数 += 1
  }
  const 有文字 = 结果.some((条) => !shiBiaoQingBaoTiao(条))
  if (!有文字) {
    const 首条文字 = xiaoXiLieBiao.find((条) => !shiBiaoQingBaoTiao(条))
    if (首条文字) 结果.push(首条文字)
  }
  return 结果
}

function 小列表化(xiaoXiLieBiao: string[]): string[] {
  return Array.isArray(xiaoXiLieBiao) ? xiaoXiLieBiao : []
}

const YuSuanYuJingYuLiang = 50

function tuiSongXiTongTiShi(用户ID: string, jiaoSeId: string, wenBen: string): void {
  const io = huoQuIo()
  if (!io) return
  io.to(用户ID).emit('角色回复', {
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
const YuSuanNeiCunZuiDa = 500

function qingLiGuoQiNeiCun(): void {
  const xianZai = Date.now()
  for (const [jianMing, value] of yuSuanNeiCunJiShu) {
    if (xianZai > value.resetTime) {
      yuSuanNeiCunJiShu.delete(jianMing)
    }
  }
  while (yuSuanNeiCunJiShu.size > YuSuanNeiCunZuiDa) {
    const shouJian = yuSuanNeiCunJiShu.keys().next().value
    if (shouJian === undefined) break
    yuSuanNeiCunJiShu.delete(shouJian)
  }
}

async function jianChaMeiRiYuSuan(用户ID: string): Promise<{ yunXu: boolean; chuFaYuJing: boolean }> {
    const riQi = new Date().toISOString().slice(0, 10)

  try {
    const yiYong = await redis.incr(`ai_yu_suan:${用户ID}:${riQi}`)
    if (yiYong === 1) {
      await redis.expire(`ai_yu_suan:${用户ID}:${riQi}`, 2 * 24 * 60 * 60)
    }
    const yuSuan = peiZhi.meiRiAIQingQiuYuSuan
    let chuFaYuJing = false
    if (yiYong >= yuSuan - YuSuanYuJingYuLiang && yiYong <= yuSuan) {
      const sheZhi = await redis.set(`ai_yu_suan_yu_jing:${用户ID}:${riQi}`, '1', 'EX', 86400, 'NX')
      chuFaYuJing = sheZhi === 'OK'
    }
    return { yunXu: yiYong <= yuSuan, chuFaYuJing }
  } catch (cuoWu) {
    debug日志.warn('AI引擎', 'AI 日预算 Redis 故障，启用本地内存兜底', {
      xiang_qing: { cuo_wu: String(cuoWu), yong_hu_id: 用户ID },
    })

    qingLiGuoQiNeiCun()
    const jianMing = `${用户ID}:${riQi}`
    const jiLu = yuSuanNeiCunJiShu.get(jianMing)
    const yuSuan = peiZhi.meiRiAIQingQiuYuSuan

    if (!jiLu || jiLu.riQi !== riQi) {
      yuSuanNeiCunJiShu.set(jianMing, { count: 1, riQi, resetTime: Date.now() + 24 * 60 * 60 * 1000 })
      return { yunXu: true, chuFaYuJing: false }
    }

    jiLu.count++
    const yiYong = jiLu.count
    let chuFaYuJing = false
    if (yiYong >= yuSuan - YuSuanYuJingYuLiang && yiYong <= yuSuan) {
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

  if (!shuRu.yong_hu_xin_xiao_xi?.trim()) {
    return {
      xiao_xi_lie_biao: [],
      shi_fou_hui_fu: false,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
    }
  }

  const zhiShi = 检索通用知识(shuRu.yong_hu_xin_xiao_xi, !shuRu.zui_jia_shuo_de_shi)
  const biDaShiShi = 提取必答事实(shuRu.yong_hu_xin_xiao_xi, zhiShi) ?? undefined
  let benLunShuRu: AIYinQingShuRu = biDaShiShi ? { ...shuRu, bi_da_shi_shi: biDaShiShi } : shuRu

  const yuSuanJieGuo = await jianChaMeiRiYuSuan(shuRu.yong_hu_id)
  if (yuSuanJieGuo.chuFaYuJing) {
    tuiSongXiTongTiShi(shuRu.yong_hu_id, shuRu.jiao_se_id, huoQuFanYi('liaoTian', 'yuSuanYuJing'))
  }
  if (!yuSuanJieGuo.yunXu) {
    tuiSongXiTongTiShi(shuRu.yong_hu_id, shuRu.jiao_se_id, huoQuFanYi('liaoTian', 'aiYuSuanYiYongJin'))
    if (biDaShiShi) {
      return {
        xiao_xi_lie_biao: [biDaShiShi.wen_an],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      }
    }
    return {
      xiao_xi_lie_biao: [],
      shi_fou_hui_fu: false,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
      cuo_wu_xin_xi: huoQuFanYi('liaoTian', 'aiYuSuanYiYongJin'),
    }
  }

  let ceLue: DirectorCeLue | undefined
  let jiang_ji_mo_shi = false
  let cuoWuXinXi: string | undefined

  const shangXiaWen: 参数上下文 = {
    jiaoSe: gouJianJiaoSeShangXiaWen(shuRu.jiao_se),
    haoGanDu: shuRu.hao_gan_du
      ? {
          zong_fen: shuRu.hao_gan_du.zong_fen,
          guan_xi_jie_duan: shuRu.hao_gan_du.guan_xi_jie_duan,
        }
      : undefined,
  }

  const directorJieGuo = await shengChengDirectorCeLue(benLunShuRu, shangXiaWen, waiBuXinHao, zhiShi)
  const directorSiKao = directorJieGuo.si_kao || undefined
  if (directorJieGuo.cheng_gong) {
    ceLue = directorJieGuo.ce_lue
  } else if (directorJieGuo.cuo_wu === 'XIAN_LIU_429') {
    if (biDaShiShi) {
      return {
        xiao_xi_lie_biao: [biDaShiShi.wen_an],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
        yong_hu_id: shuRu.yong_hu_id,
      }
    }
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
    if (biDaShiShi) {
      return {
        xiao_xi_lie_biao: [biDaShiShi.wen_an],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      }
    }
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

  const huiYingDengJi = benLunShuRu.huiYingDengJi ?? 2
  if (ceLue && !ceLue.shi_fou_hui_fu && !biDaShiShi && huiYingDengJi <= 1) {
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
    const zuiJinJiaoSeKaiTou = benLunShuRu.dui_hua_li_shi
      .filter((xiaoXi) => xiaoXi.fa_song_zhe_lei_xing === 'jiaose')
      .slice(-6)
      .map((xiaoXi) => (xiaoXi.nei_rong || '').replace(/\s+/g, '').slice(0, 6))
      .filter((kaiTou) => kaiTou.length >= 3)
    let writerJieGuo = await shengChengWriterHuiFu(benLunShuRu, ceLue, shangXiaWen, waiBuXinHao, zhiShi, benLunShuRu.zuiJinDuanMing)
    const huiFuKaiTou = (lieBiao: string[]): string | null => {
      const wenBen = lieBiao
        .map((tiao) => qingXiBiaoQingBaoCanPian(tiao).replace(/\s+/g, ''))
        .find((tiao) => tiao.length >= 6)
      return wenBen ? wenBen.slice(0, 6) : null
    }
    const shiFouKaiTouZhongFu = (lieBiao: string[]): boolean => {
      const kaiTou = huiFuKaiTou(lieBiao)
      return Boolean(kaiTou) && zuiJinJiaoSeKaiTou.includes(kaiTou as string)
    }
    if (ceLue && ceLue.need_recall === true && !benLunShuRu.benLunYiHuiXiang) {
      try {
        const { huiXiangLiShiYuanWen, gouJianHuiXiangTiShiWenBen } = await import('./历史回想')
        const huiXiangJieGuo = await huiXiangLiShiYuanWen(
          benLunShuRu.yong_hu_id,
          benLunShuRu.jiao_se_id,
          String(benLunShuRu.yong_hu_xin_xiao_xi || ''),
        ).catch(() => null)
        if (huiXiangJieGuo && huiXiangJieGuo.zhaoDao && huiXiangJieGuo.yuanWen.length > 0) {
          debug日志.info('AI引擎', 'need_recall 强制历史回想命中，注入后让 Writer 重答一轮', {
            xiang_qing: { jiao_se_id: benLunShuRu.jiao_se_id, tiao_shu: huiXiangJieGuo.yuanWen.length },
          })
          benLunShuRu = {
            ...benLunShuRu,
            huiXiangTiShi: gouJianHuiXiangTiShiWenBen(huiXiangJieGuo),
            benLunYiHuiXiang: true,
          }
          const chongDaJieGuo = await shengChengWriterHuiFu(
            benLunShuRu,
            ceLue,
            shangXiaWen,
            waiBuXinHao,
            zhiShi,
            benLunShuRu.zuiJinDuanMing,
          )
          if (chongDaJieGuo.xiao_xi_lie_biao.length > 0) writerJieGuo = chongDaJieGuo
        }
      } catch (huiXiangCuoWu) {
        debug日志.warn('AI引擎', 'need_recall 强制回想或重答失败，保留首次回复', {
          xiang_qing: { jiao_se_id: benLunShuRu.jiao_se_id, cuo_wu: String(huiXiangCuoWu) },
        })
      }
    }
    if (ceLue?.shi_fou_hui_fu !== false && zuiJinJiaoSeKaiTou.length > 0 && shiFouKaiTouZhongFu(writerJieGuo.xiao_xi_lie_biao)) {
      debug日志.warn('AI引擎', 'Writer 开头与近几条角色消息重复，带事实重生成一次', {
        xiang_qing: { jiao_se_id: shuRu.jiao_se_id, zui_jin_kai_tou: zuiJinJiaoSeKaiTou.slice(-3) },
      })
      const chongShuJieGuo = await shengChengWriterHuiFu(
        {
          ...benLunShuRu,
          shengChengJiuCuo: '你最近几条已经用过相似开头或同一个梗；这一轮先换一种说法，再接着当前话题。不要把同一段虚构日常细节继续当自己的经历。',
          ...(biDaShiShi ? { bi_da_shi_shi: { ...biDaShiShi, zhong_shi: true } } : {}),
        },
        ceLue,
        shangXiaWen,
        waiBuXinHao,
        zhiShi,
        benLunShuRu.zuiJinDuanMing,
      )
      if (chongShuJieGuo.xiao_xi_lie_biao.length > 0) {
        const haiShiZhongFu = shiFouKaiTouZhongFu(chongShuJieGuo.xiao_xi_lie_biao)
        writerJieGuo = chongShuJieGuo
        debug日志[haiShiZhongFu ? 'warn' : 'debug']('AI引擎', '重复开头重试完成', {
          xiang_qing: { jiao_se_id: shuRu.jiao_se_id, 重试后仍重复: haiShiZhongFu, 重试后输出: writerJieGuo.yuan_wen },
        })
      }
    }
    if (biDaShiShi && !shuoDaoLeShiShi(writerJieGuo.xiao_xi_lie_biao, biDaShiShi)) {
      debug日志.warn('AI引擎', 'Writer 漏掉了必答事实，带强调重生成一次', {
        xiang_qing: { jiao_se_id: shuRu.jiao_se_id, shi_shi: biDaShiShi.biao_shi },
      })
      writerJieGuo = await shengChengWriterHuiFu(
        { ...benLunShuRu, bi_da_shi_shi: { ...biDaShiShi, zhong_shi: true } },
        ceLue,
        shangXiaWen,
        waiBuXinHao,
        zhiShi,
        benLunShuRu.zuiJinDuanMing,
      )
    }

    if (biDaShiShi && !shuoDaoLeShiShi(writerJieGuo.xiao_xi_lie_biao, biDaShiShi)) {
      debug日志.error('AI引擎', '必答事实两次都未说出，回退到事实原文以保证不撒谎', {
        xiang_qing: { jiao_se_id: shuRu.jiao_se_id, shi_shi: biDaShiShi.biao_shi },
      })
      return {
        xiao_xi_lie_biao: [biDaShiShi.wen_an],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi,
        si_kao: directorSiKao ? { director: directorSiKao } : undefined,
        ce_lue: ceLue,
      }
    }

    let xiaoXiLieBiao = qieGeXiaoXi(
      writerJieGuo.xiao_xi_lie_biao.map((tiao) => 转义表情标记(tiao)),
      ceLue?.hui_fu_tiao_shu ?? ZuiDaTiaoShu,
    )
    if (writerJieGuo.xiao_xi_lie_biao.length > ZuiDaTiaoShu) {
      debug日志.warn('AI引擎', 'Writer 输出条数超失控护栏，已截断', {
        xiang_qing: {
          jiao_se_id: shuRu.jiao_se_id,
          yong_hu_id: shuRu.yong_hu_id,
          yuan_shu_liao: writerJieGuo.xiao_xi_lie_biao.length,
          huo_liu: ZuiDaTiaoShu,
        },
      })
    }

    const weiJinTiaoMu = xiaoXiLieBiao.filter((tiao) => hanWeiJinCi(qingXiBiaoQingBaoCanPian(tiao)))
    if (weiJinTiaoMu.length > 0) {
      debug日志.error('AI引擎', 'Writer输出命中本地违禁词兜底，已拦截本轮回复', {
        xiang_qing: {
          jiao_se_id: shuRu.jiao_se_id,
          tiao_shu: weiJinTiaoMu.length,
        },
      })
      if (biDaShiShi) {
        return {
          xiao_xi_lie_biao: [biDaShiShi.wen_an],
          shi_fou_hui_fu: true,
          shi_fou_che_hui: false,
          jiang_ji_mo_shi,
          ce_lue: ceLue,
        }
      }
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
      const baoLiuLieBiao = aiWeiGuoLv.baoLiu
      if (baoLiuLieBiao.length === 0 && biDaShiShi) {
        xiaoXiLieBiao = [biDaShiShi.wen_an]
      } else {
        xiaoXiLieBiao = baoLiuLieBiao
      }
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

    const taoHuaJianCha = jianChaTaoHua(aiWeiWenBen)
    if (!taoHuaJianCha.tongGuo && panDuanTaoHuaCaiYang()) {
      debug日志.warn('AI引擎', 'Writer输出命中温暖套话，采样送检（不拦截）', {
        xiang_qing: { jiao_se_id: shuRu.jiao_se_id, ming_zhong: taoHuaJianCha.mingZhong.slice(0, 5) },
      })
      if (panDuanShiFouMoXingChouJian()) {
        const { paiRuZhongShiDuiLie } = await import('./重试队列')
        await paiRuZhongShiDuiLie({ leiXing: 'quAiWeiChouJian', yuanYin: 'tao_hua:' + taoHuaJianCha.mingZhong.slice(0, 3).join(',') }).catch(() => undefined)
      }
    }

    const zhenDeYaHui = ceLue?.shi_fou_hui_fu !== false
    if (zhenDeYaHui && xiaoXiLieBiao.length === 0 && biDaShiShi) {
      return {
        xiao_xi_lie_biao: [biDaShiShi.wen_an],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi,
        si_kao: directorSiKao ? { director: directorSiKao } : undefined,
        ce_lue: ceLue,
      }
    }
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

    const zuiHouYuanWen = xiaoXiLieBiao.join('\n')
    debug日志.debug('AI引擎', '最终发送文本及触发链路', {
      xiang_qing: {
        消息条数: xiaoXiLieBiao.length,
        是否回复: ceLue?.shi_fou_hui_fu ?? true,
        Director策略: ceLue?.hui_fu_ce_lue ?? null,
        必答事实: biDaShiShi?.biao_shi ?? null,
        降级模式: jiang_ji_mo_shi,
        正文: zuiHouYuanWen,
      },
    })

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
    if (biDaShiShi) {
      return {
        xiao_xi_lie_biao: [biDaShiShi.wen_an],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: true,
        si_kao: directorSiKao ? { director: directorSiKao } : undefined,
        ce_lue: ceLue,
      }
    }
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
