import { 数据库 } from '../数据库'
import { huiFuYanChiJiZhunHaoMiao } from '../config/角色配置'
import { AI_PEI_ZHI } from '../config/AI配置'
import { jiLuXiaoXiCaoZuo } from '../utils/debug日志'
import { 内部转展示, 读回性别 } from '../utils/性别'
import type {
  AIJiaoSeXinXi,
  DuiHuaLiShiXiang,
} from '../types'
import type { XiaoXiXinXi } from './消息'
import { huiHuaXiaoXiSuoJian, shiXiaoXiaoXiZongShuHuanCun } from './消息'
import { qingLiLuoKuKuai, shiTuWenHunPaiKuai } from './消息内容块'
import { buQiWenJianTiQuWenBen } from './文档文本提取'

export interface BaoCunJiaoSeXiaoXiCanShu {
  yong_hu_id: string
  jiao_se_id: string
  nei_rong: string
}

function jieXiJSONZiDuan(zhi: unknown): unknown {
  if (typeof zhi === 'string') {
    try {
      return JSON.parse(zhi)
    } catch {
      return zhi
    }
  }
  return zhi
}

function anQuanZiFuChuan(zhi: unknown): string {
  if (zhi === null || zhi === undefined) return ''
  return String(zhi)
}

function anQuanZiFuChuanShuZu(zhi: unknown): string[] {
  if (Array.isArray(zhi)) return zhi.map((x) => String(x))
  return []
}

export async function huoQuJiaoSeIELeiXing(
  jiao_se_id: string,
): Promise<'I' | 'E' | null> {
  const jieGuo = await 数据库.query(
    `SELECT "IE类型" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [jiao_se_id],
  )
  if (jieGuo.rows.length === 0) return null
  const ie = String(jieGuo.rows[0].IE类型 || 'I')
  return ie === 'E' ? 'E' : 'I'
}

export async function huoQuJiaoSeHuiFuYanChiHaoMiao(
  jiao_se_id: string,
): Promise<number> {
  const jieGuo = await 数据库.query(
    `SELECT "回复延迟毫秒" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [jiao_se_id],
  )
  if (jieGuo.rows.length === 0) return huiFuYanChiJiZhunHaoMiao
  return Number(jieGuo.rows[0].回复延迟毫秒) || huiFuYanChiJiZhunHaoMiao
}

export async function huoQuAIJiaoSeXinXi(
  jiao_se_id: string,
): Promise<AIJiaoSeXinXi | null> {
  const jieGuo = await 数据库.query(
    `SELECT * FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [jiao_se_id],
  )
  if (jieGuo.rows.length === 0) return null

  const shuJuHang = jieGuo.rows[0]
  const shiJieXinXi = jieXiJSONZiDuan(shuJuHang.世界信息)
  const xingBie = 读回性别(shuJuHang.性别, 'AI输入准备', jiao_se_id)
  const mbtiLeiXing = anQuanZiFuChuan(shuJuHang.MBTI || shuJuHang.预设类型 || 'INTJ')
  const ieLeiXing = String(shuJuHang.IE类型 || mbtiLeiXing.charAt(0) || 'I') as 'I' | 'E'
  const reShenLeiXing = String(shuJuHang.热身类型 || '慢热') as '慢热' | '快热'
  const nianLing = Number(shuJuHang.年龄 || 20)
  const mingZi = anQuanZiFuChuan(shuJuHang.名字 || shuJuHang.真实姓名)
  const weiXinMing = anQuanZiFuChuan(shuJuHang.微信昵称 || shuJuHang.名字)

  const beiJingGuShi = anQuanZiFuChuan(shuJuHang.背景故事)
  const xiHuanDeLeiXing = anQuanZiFuChuan(shuJuHang.喜欢的类型)
  const jiaTingBeiJing = anQuanZiFuChuan(shuJuHang.家庭背景)
  const qingGanJingLi = anQuanZiFuChuan(shuJuHang.情感经历)
  const yinSeId = anQuanZiFuChuan(shuJuHang.音色ID)

  return {
    id: jiao_se_id,
    ming_zi: mingZi,
    wei_xin_ming: weiXinMing,
    xing_bie: xingBie,
    mbti_lei_xing: mbtiLeiXing,
    ie_lei_xing: ieLeiXing,
    re_shen_lei_xing: reShenLeiXing,
    nian_ling: Number.isNaN(nianLing) ? 20 : nianLing,
    shen_fen: '',
    wai_mao: anQuanZiFuChuan(shuJuHang.外貌),
    xing_ge: anQuanZiFuChuan(shuJuHang.性格),
    bei_jing_gu_shi: beiJingGuShi,
    xi_hao: anQuanZiFuChuanShuZu(shuJuHang.爱好),
    yan_yu_feng_ge: anQuanZiFuChuan(shuJuHang.言语风格),
    xing_wei_te_dian: '',
    tou_xiang: anQuanZiFuChuan(shuJuHang.头像),
    xi_huan_de_lei_xing: xiHuanDeLeiXing,
    jia_ting_bei_jing: jiaTingBeiJing,
    qing_gan_jing_li: qingGanJingLi,
    shi_fou_zha_xing: Boolean(shuJuHang.是否渣型),
    zha_fa_miao_shu: shuJuHang.是否渣型 ? anQuanZiFuChuan(shuJuHang.渣法描述) : undefined,
    hua_shu: shuJuHang.是否渣型 ? anQuanZiFuChuanShuZu(shuJuHang.话术) : undefined,
    bao_lu_fang_shi: shuJuHang.是否渣型 ? anQuanZiFuChuan(shuJuHang.暴露方式) : undefined,
    shi_po_xian_suo: shuJuHang.是否渣型 ? anQuanZiFuChuanShuZu(shuJuHang.识破线索) : undefined,
    voice_id: yinSeId || undefined,
    shi_jie_xin_xi: typeof shiJieXinXi === 'object' && shiJieXinXi !== null
      ? (shiJieXinXi as Record<string, unknown>)
      : {},
    ba_da_mo_kuai: {
      ji_ben_xin_xi: `${mingZi}，${内部转展示(xingBie)}，${nianLing}岁`,
      wai_mao: anQuanZiFuChuan(shuJuHang.外貌),
      xing_ge: anQuanZiFuChuan(shuJuHang.性格),
      bei_jing: beiJingGuShi,
      yan_yu: anQuanZiFuChuan(shuJuHang.言语风格),
      xing_wei: '',
      guan_xi: `喜欢的类型：${xiHuanDeLeiXing}`,
      xi_tong_ti_shi: '',
    },
  }
}

/**
 * 取最近对话历史。多取一个淘汰步长，而不是正好取渲染上限：
 * 若只取 liShiXiaoXiShuLiang 条，会话超过该条数后每来一条新消息，取数窗口整体前移一条，
 * 历史段第一个字节每轮都变，zhanShiLiShiWenBen 的步长对齐就形同虚设，官方前缀缓存整段失效
 * （实测超长历史命中率仅 1.9%）。多取步长后窗口起点可稳定一个步长的轮次。
 */
export async function huoQuZuiJinDuiHuaLiShi(
  yong_hu_id: string,
  jiao_se_id: string,
  shu_liang: number = AI_PEI_ZHI.prompt.liShiXiaoXiShuLiang + AI_PEI_ZHI.prompt.liShiCaiDuanBuZhang,
): Promise<DuiHuaLiShiXiang[]> {
  const jieGuo = await 数据库.query(
    `SELECT m.*, mf."SHA256" AS "媒体SHA256", mf."MIME" AS "媒体MIME", mf."类别" AS "媒体类别",
            mf."时长毫秒" AS "媒体时长毫秒", mf."原始文件名" AS "媒体原始文件名",
            COUNT(*) OVER() AS "对话总条数"
     FROM "消息" m LEFT JOIN "媒体文件" mf ON m."媒体ID" = mf."ID"
     WHERE m."用户ID" = $1 AND m."角色ID" = $2
     ORDER BY m."创建时间" DESC
     LIMIT $3`,
    [yong_hu_id, jiao_se_id, shu_liang],
  )

  const liShi = jieGuo.rows.reverse().map((shuJuHang): DuiHuaLiShiXiang => {
    const faSongZheLeiXing =
      shuJuHang.发送者 === 'yonghu'
        ? 'yonghu'
        : shuJuHang.发送者 === 'jiaose'
          ? 'jiaose'
          : 'xitong'
    const shiJian = new Date(String(shuJuHang.创建时间))
    const shi = String(shiJian.getHours()).padStart(2, '0')
    const fen = String(shiJian.getMinutes()).padStart(2, '0')

    // 图片/表情包/视频携带 sha 供视觉注入与视频解析；语音/文件不带图只文本化
    const meiTiLeiBie = shuJuHang.媒体类别 ? String(shuJuHang.媒体类别) : undefined
    const shiTuXiang = meiTiLeiBie === 'tupian' || meiTiLeiBie === 'biaoqingshu'
    const yuanMIME = shuJuHang.媒体MIME ? String(shuJuHang.媒体MIME) : ''
    const shiShiPin = meiTiLeiBie === 'wenjian' && (yuanMIME.toLowerCase().startsWith('video/') || String(shuJuHang.媒体原始文件名 || '').toLowerCase().match(/\.(mp4|mov|webm|m4v)$/) !== null)
    // FP-10：行内落了图文混排块 ⇒ 内容 已是按块顺序展开的投影，读取侧不得再用单占位符覆盖它
    const tuWenHunPai = shiTuWenHunPaiKuai(qingLiLuoKuKuai(shuJuHang.内容块, String(shuJuHang.ID)))

    return {
      id: String(shuJuHang.ID),
      fa_song_zhe_lei_xing: faSongZheLeiXing,
      fa_song_zhe_ming:
        faSongZheLeiXing === 'jiaose'
          ? anQuanZiFuChuan(shuJuHang.角色名 || shuJuHang.微信昵称 || '对方')
          : '对方',
      nei_rong: String(shuJuHang.内容 || ''),
      shi_jian: `${shi}:${fen}`,
      yi_che_hui: Boolean(shuJuHang.已撤回),
      // FP-26：模型装配口不再读取 `原始内容`（撤回原文不进语料），故此处不映射该列
      meiTiLeiBie,
      tuWenHunPai,
      meiTiSha256: (shiTuXiang || shiShiPin) && shuJuHang.媒体SHA256 ? String(shuJuHang.媒体SHA256).toLowerCase() : undefined,
      meiTiMIME: (shiTuXiang || shiShiPin) && shuJuHang.媒体MIME ? String(shuJuHang.媒体MIME) : undefined,
      meiTiShiChangHaoMiao: shuJuHang.媒体时长毫秒 != null ? Number(shuJuHang.媒体时长毫秒) : null,
      yuanShiWenJianMing: shuJuHang.媒体原始文件名 ? String(shuJuHang.媒体原始文件名) : undefined,
      // FP-12：文档正文提取按媒体行 ID 批量取 MIME/哈希，故这里只带身份不带正文副本
      meiTiId: shuJuHang.媒体ID ? String(shuJuHang.媒体ID) : undefined,
      duiHuaZongTiaoShu: shuJuHang.对话总条数 != null ? Number(shuJuHang.对话总条数) : undefined,
      beiYongXiaoXiId: shuJuHang.被引用消息ID ? String(shuJuHang.被引用消息ID) : null,
    }
  })
  // FP-12：阈值内的文档消息在送模前挂上提取正文（军师/军事分析/复盘/主聊天共用这一个补全口）
  return await buQiWenJianTiQuWenBen(liShi)
}

export async function baoCunJiaoSeXiaoXi(
  canShu: BaoCunJiaoSeXiaoXiCanShu,
): Promise<XiaoXiXinXi> {
  const ZUI_DA_CHONG_SHI_CI_SHU = 10
  const CHU_SHI_CHONG_SHI_YAN_CHI_MS = 50

  // R8 原子序号：pg_advisory_xact_lock 按会话串行取号+落库，禁 MAX+1 并发重复
  // 根因：50 并发同读 MAX 得同号，冲突后读回同一行致 50 条变 2 条；收敛为事务内串行取号
  // FP-09：锁键与序号分配口径的唯一真源在 services/消息.ts（用户消息走同一把锁），
  //         角色消息的序号一律服务端权威分配，不再接受调用方指定序号。
  const huiHuaSuoJian = huiHuaXiaoXiSuoJian(canShu.yong_hu_id, canShu.jiao_se_id)

  let lastError: Error | null = null

  for (let ciShu = 0; ciShu <= ZUI_DA_CHONG_SHI_CI_SHU; ciShu++) {
    const keHuDuan = await 数据库.connect()
    try {
      await keHuDuan.query('BEGIN')
      await keHuDuan.query('SELECT pg_advisory_xact_lock($1)', [huiHuaSuoJian])
      const xuHaoJieGuo = await keHuDuan.query(
        `SELECT COALESCE(MAX("客户端序号"), 0) as zui_da FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [canShu.yong_hu_id, canShu.jiao_se_id],
      )
      const keHuDuanXuHao = Number(xuHaoJieGuo.rows[0]?.zui_da ?? 0) + 1
      // FP-09：序号撞号不再用 ON CONFLICT DO NOTHING 静默「读回一行」——那正是把用户消息
      // 当成重复而吞掉的机制本体。加锁后理论上不撞；真撞（通话链未加锁写入）就报错重试。
      const jieGuo = await keHuDuan.query(
        `INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读", "客户端序号")
         VALUES ($1, $2, $3, 'jiaose', 'wenben', true, $4)
         RETURNING *`,
        [canShu.yong_hu_id, canShu.jiao_se_id, canShu.nei_rong, keHuDuanXuHao],
      )

      const shuJuHang = jieGuo.rows[0]
      await keHuDuan.query('COMMIT')
      keHuDuan.release()
      const faSongZheLeiXing = 'jiaose' as const
      const xiaoXi = {
        id: String(shuJuHang.ID),
        hui_hua_id: canShu.jiao_se_id,
        fa_song_zhe_id: canShu.jiao_se_id,
        fa_song_zhe_lei_xing: faSongZheLeiXing,
        ai_biao_shi: true,
        nei_rong: String(shuJuHang.内容),
        lei_xing: String(shuJuHang.类型 || 'wenben'),
        shi_jian_chuo: new Date(String(shuJuHang.创建时间)).getTime(),
        yi_du: Boolean(shuJuHang.已读),
        yi_che_hui: Boolean(shuJuHang.已撤回),
        che_hui_shi_jian: shuJuHang.撤回时间 ? String(shuJuHang.撤回时间) : null,
        yuan_shi_nei_rong: null,
        ke_hu_duan_xu_hao: shuJuHang.客户端序号 != null ? Number(shuJuHang.客户端序号) : null,
        mi_deng_jian: shuJuHang.幂等键 ? String(shuJuHang.幂等键) : null,
        mei_ti_id: shuJuHang.媒体ID ? String(shuJuHang.媒体ID) : null,
        mei_ti_url: null,
      }
      jiLuXiaoXiCaoZuo('角色消息发送', canShu.yong_hu_id, canShu.jiao_se_id, 'jiaose', { xiao_xi_id: xiaoXi.id })
      await shiXiaoXiaoXiZongShuHuanCun(canShu.yong_hu_id, canShu.jiao_se_id).catch(() => {})
      return xiaoXi
    } catch (cuoWu) {
      try {
        await keHuDuan.query('ROLLBACK')
      } catch {
        // 忽略回滚失败
      }
      keHuDuan.release()
      lastError = cuoWu as Error
      const pgError = cuoWu as { code?: string; constraint?: string }

      if (pgError.code === '23505' && pgError.constraint?.includes('客户端序号')) {
        if (ciShu < ZUI_DA_CHONG_SHI_CI_SHU) {
          const yanChi = CHU_SHI_CHONG_SHI_YAN_CHI_MS * Math.pow(2, ciShu)
          await new Promise(resolve => setTimeout(resolve, yanChi))
          continue
        }
      }
      throw cuoWu
    }
  }

  throw lastError
}
