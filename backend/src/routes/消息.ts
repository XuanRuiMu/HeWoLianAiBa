import { Router } from 'express'
import type { Response } from 'express'
import Busboy from 'busboy'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { debug日志 } from '../utils/debug日志'
import { liaoTianXianLiu, aiQingQiuXianLiu } from '../middleware/限流'
import type { RenZhengQingQiu } from '../middleware/认证'
import {
  huoQuXiaoXiLieBiao,
  chuangJianYongHuXiaoXi,
  cheHuiYongHuXiaoXi,
  biaoJiSuoYouWeiDu,
} from '../services/消息'
import {
  shouKouXiaoXiYunYingZiDuan,
  shouKouXiaoXiLieBiaoYunYingZiDuan,
} from '../services/消息出参收口'
import { kuaiShenHeWenBen, qingLiTiJiaoKuai } from '../services/消息内容块'
import { liuShiBaoCunMeiTi, MeiTiCunChuCuoWu, shengChengQianMingURL } from '../services/媒体存储'
import { panDingMeiTiShenHeChuCan } from '../services/媒体审核出参'
import { SHEN_HE_FU_WU_BU_KE_YONG_JIAN, shiHeFaLeiBie, shiHeFaXiaoXiLeiXing } from '../config/媒体配置'
import { shenHeNeiRongAnQuan, jianCeWeiJiXinHao } from '../services/安全审核'
import { peiZhi } from '../config'
import { jiLuShenJiRiZhi } from '../services/审计日志'
import { 获取IP, 记录违规 } from '../services/IP封禁'
import { chaXunZhangHaoFengJin, jiLuZhangHaoWeiGui } from '../services/账号封禁'
import { 聊天内容验证中间件 } from '../middleware/输入验证'
import {
  huoQuJunShiLieBiao,
  qingQiuJunShiZhiDao,
  huoQuJunShiJiLu,
  huoQuJunShiZhiDaoZhuangTaiXinXi,
} from '../services/军师'
import { shanChuJunShiZhiDaoZhuangTai } from '../services/军师缓存'
import { yanZhengUUID } from '../utils/验证'
import {
  baoCunJiaoSeXiaoXi,
} from '../services/AI输入准备'
import { chongZhiJiaoSeTiaoDuQi, luoKuChuFaJiaoSeTiaoDuQi } from '../socket/聊天'
import { huoQuIo } from '../socket/io'
import { 管理监控房间名 } from '../socket/管理通道'
import { jiLuSiKao } from '../services/思考记录'
import { 数据库 } from '../数据库'
import { HAO_GAN_DU_PEI_ZHI } from '../config/好感度配置'
import { sheZhiMiJiHaoGanDu } from '../services/好感度'
import { fanYiWenBen } from '../services/翻译'
import { mianFeiZhuanXieYuYin } from '../services/语音转写'
import { huoQuDuoMoTaiQianDuanShiTu, chongZaiDuoMoTaiHuanJing } from '../config/多模态配置'
import { gouJianYuYinKeDuWenBen } from '../services/语音理解'
import { gouJianShiPinKeDuWenBen } from '../services/视频多模态'
import { guanLiGaoWeiMenKong } from '../middleware/管理员'
import { huoQuJiaoSeSuoYouZhe } from '../services/消息'
import { 执行落库后副作用 } from '../utils/落库后副作用'

const luYou = Router()

function huoQuZiFuChuan(body: Record<string, unknown>, jian: string, tianChongJian?: string): string {
  const zhi = body[jian]
  if (typeof zhi === 'string') return zhi
  if (tianChongJian && typeof body[tianChongJian] === 'string') return String(body[tianChongJian])
  return ''
}

function huoQuShuZi(zhi: unknown, moRen: number): number {
  if (typeof zhi === 'number') return zhi
  if (typeof zhi === 'string') {
    const jieXi = parseInt(zhi, 10)
    return Number.isNaN(jieXi) ? moRen : jieXi
  }
  return moRen
}

luYou.get(
  '/会话',
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    try {
      const jieGuo = await 数据库.query(
        `SELECT "ID" as id, "名字" as jiao_se_ming, "头像" as tou_xiang, "创建时间" as kai_shi_shi_jian
         FROM "角色" WHERE "用户ID" = $1 ORDER BY "创建时间" DESC`,
        [yongHu.yongHuId],
      )
      const lieBiao = jieGuo.rows.map((row) => ({
        id: String(row.id),
        jiao_se_id: String(row.id),
        yong_hu_id: yongHu.yongHuId,
        kai_shi_shi_jian: row.kai_shi_shi_jian ? new Date(row.kai_shi_shi_jian).getTime() : Date.now(),
        zui_hou_xiao_xi_shi_jian: row.kai_shi_shi_jian ? new Date(row.kai_shi_shi_jian).getTime() : Date.now(),
        wei_du_shu: 0,
      }))
      return chengGongXiangYing(xiangYing, lieBiao)
    } catch (cuoWu) {
      debug日志.error('消息接口', '获取会话列表失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.post(
  '/会话',
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const body = qingQiu.body as Record<string, unknown>
    const jiaoSeId = huoQuZiFuChuan(body, 'jiaoSeId', 'jiao_se_id')
    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const jianCha = await 数据库.query(
        `SELECT "ID" FROM "角色" WHERE "ID" = $1 AND "用户ID" = $2 LIMIT 1`,
        [jiaoSeId, yongHu.yongHuId],
      )
      if (jianCha.rows.length === 0) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
      }

      const shiJian = Date.now()
      return chengGongXiangYing(xiangYing, {
        id: jiaoSeId,
        jiao_se_id: jiaoSeId,
        yong_hu_id: yongHu.yongHuId,
        kai_shi_shi_jian: shiJian,
        zui_hou_xiao_xi_shi_jian: shiJian,
        wei_du_shu: 0,
      })
    } catch (cuoWu) {
      debug日志.error('消息接口', '创建会话失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.get(
  '/会话/:huiHuaId/消息',
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const jiaoSeId = String(qingQiu.params.huiHuaId || '')
    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    const yeMa = huoQuShuZi(qingQiu.query.ye_ma, 1)
    const meiYeTiaoShu = huoQuShuZi(qingQiu.query.mei_ye_tiao_shu, 50)

    // M6 keyset 游标（可选）：上滑加载更早消息时由前端携带上一页末条消息的定位信息
    let youBiaoXuHao: number | null = null
    if (qingQiu.query.you_biao_xu_hao !== undefined && /^\d+$/.test(String(qingQiu.query.you_biao_xu_hao))) {
      youBiaoXuHao = Number(qingQiu.query.you_biao_xu_hao)
    }
    let youBiaoShiJianChuo: number | null = null
    if (
      qingQiu.query.you_biao_shi_jian_chuo !== undefined &&
      /^\d+$/.test(String(qingQiu.query.you_biao_shi_jian_chuo))
    ) {
      youBiaoShiJianChuo = Number(qingQiu.query.you_biao_shi_jian_chuo)
    }
    const youBiaoId =
      typeof qingQiu.query.you_biao_id === 'string' && qingQiu.query.you_biao_id.length > 0
        ? qingQiu.query.you_biao_id
        : null

    try {
      const jieGuo = await huoQuXiaoXiLieBiao({
        yong_hu_id: yongHu.yongHuId,
        jiao_se_id: jiaoSeId,
        ye_ma: yeMa,
        mei_ye_tiao_shu: meiYeTiaoShu,
        you_biao_xu_hao: youBiaoXuHao,
        you_biao_shi_jian_chuo: youBiaoShiJianChuo,
        you_biao_id: youBiaoId,
      })
      return chengGongXiangYing(xiangYing, {
        lie_biao: await shouKouXiaoXiLieBiaoYunYingZiDuan(jieGuo.lie_biao, yongHu.yongHuId),
        zong_shu: jieGuo.zong_shu,
        hai_you_geng_duo: jieGuo.hai_you_geng_duo,
      })
    } catch (cuoWu) {
      debug日志.error('消息接口', '获取消息列表失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.post(
  '/会话/:huiHuaId/媒体',
  liaoTianXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }
    // 任务3：账号封禁中禁止上传任何媒体
    const shangChuanFengJin = await chaXunZhangHaoFengJin(yongHu.yongHuId)
    if (shangChuanFengJin.beiFengJin) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('anQuan', 'zhangHaoYiBeiFengJin'))
    }

    const jiaoSeId = String(qingQiu.params.huiHuaId || '')
    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    const body = qingQiu.body as Record<string, unknown>
    const leiBie = typeof qingQiu.query.leiBie === 'string' ? qingQiu.query.leiBie : body['leiBie']
    if (!shiHeFaLeiBie(leiBie)) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'meiTiLeiXingFeiFa'))
    }

    const contentType = String(qingQiu.headers['content-type'] || '')
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'meiTiQueShaoWenJian'))
    }

    await new Promise<void>((jieJue) => {
      let yiXiangYing = false
      let chuLiGuoWenJian = false

      // defParamCharset: 'utf8' —— 中文文件名按 RFC 5987 UTF-8 解码，避免 Latin-1 乱码
      const busboy = Busboy({ headers: qingQiu.headers, defParamCharset: 'utf8' })

      busboy.on('file', (_fieldMing, wenJianLiu, xinXi) => {
        if (yiXiangYing || chuLiGuoWenJian) {
          wenJianLiu.resume()
          return
        }
        chuLiGuoWenJian = true
        liuShiBaoCunMeiTi(
          wenJianLiu,
          xinXi.filename || 'weimingming',
          xinXi.mimeType || '',
          leiBie,
          yongHu.yongHuId,
        )
          .then((jieGuo) => {
            yiXiangYing = true
            chengGongXiangYing(xiangYing, {
              mediaId: jieGuo.mediaId,
              sha256: jieGuo.sha256,
              mime: jieGuo.mime,
              daXiao: jieGuo.daXiao,
              leiBie: jieGuo.leiBie,
              yuanShiWenJianMing: jieGuo.yuanShiWenJianMing,
              mei_ti_url: shengChengQianMingURL(jieGuo.sha256, yongHu.yongHuId),
            })
          })
          .catch(async (cuoWu) => {
            yiXiangYing = true
            if (cuoWu instanceof MeiTiCunChuCuoWu) {
              // 任务3：真实违规图片记账号违规一次（文件已在存储层销毁，等同撤回）；
              // 状态码/文案/是否记违规全部取自 services/媒体审核出参 这一个出口
              const chuCan = panDingMeiTiShenHeChuCan(String(cuoWu.fanYiJian))
              if (chuCan.xuYaoJiWeiGui) {
                await jiLuZhangHaoWeiGui({
                  yongHuId: yongHu.yongHuId,
                  ip: 获取IP(qingQiu),
                  yuanYin: String(cuoWu.fanYiJian),
                  leiXing: 'AI聊天图片',
                })
              }
              shiBaiXiangYing(xiangYing, chuCan.zhuangTaiMa, chuCan.tiShi)
              return
            }
            debug日志.error('消息接口', '媒体上传失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
            shiBaiXiangYing(xiangYing, 500, huoQuFanYi('liaoTian', 'meiTiShangChuanShiBai'))
          })
          .finally(() => {
            // 服务在校验失败时可能未消费文件流；排空以避免 busboy 因背压挂起
            if (!wenJianLiu.readableEnded) {
              wenJianLiu.resume()
            }
          })
      })

      busboy.on('error', (cuoWu) => {
        if (!yiXiangYing) {
          yiXiangYing = true
          debug日志.error('消息接口', '媒体解析失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
          shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
        }
      })

      busboy.on('close', () => {
        if (!chuLiGuoWenJian && !yiXiangYing) {
          yiXiangYing = true
          shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'meiTiQueShaoWenJian'))
        }
        jieJue()
      })

      qingQiu.pipe(busboy)
    })
  },
)

luYou.post(
  '/会话/:huiHuaId/消息',
  liaoTianXianLiu,
  聊天内容验证中间件,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }
    // 任务3：账号封禁中禁止发送任何内容（申诉入口不受影响，见资料路由）
    const zhangHaoFengJin = await chaXunZhangHaoFengJin(yongHu.yongHuId)
    if (zhangHaoFengJin.beiFengJin) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('anQuan', 'zhangHaoYiBeiFengJin'))
    }

    const jiaoSeId = String(qingQiu.params.huiHuaId || '')
    const body = qingQiu.body as Record<string, unknown>
    const neiRong = huoQuZiFuChuan(body, 'neiRong', 'nei_rong')
    const yuanLeiXing = huoQuZiFuChuan(body, 'leiXing', 'lei_xing')
    const leiXing = yuanLeiXing || 'wenben'
    if (!shiHeFaXiaoXiLeiXing(leiXing)) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'xiaoXiLeiXingFeiFa'))
    }
    // FP-10（缺陷9）图文混排：块是唯一真源。带了块就不再要求单媒体字段，
    // 送审/秘密指令等一切「按正文判定」的分支都改用块里拼出的审核文本，
    // 落库侧（消息服务）会再清洗一次并派生 内容/类型/媒体ID —— 路由不做第二套裁定。
    const tiJiaoKuaiZhi = body['nei_rong_kuai'] ?? body['neiRongKuai'] ?? body['内容块']
    const daiKuai = qingLiTiJiaoKuai(tiJiaoKuaiZhi, '消息接口').kuai
    const shenHeWenBen = daiKuai ? kuaiShenHeWenBen(daiKuai) : neiRong
    const shiMeiTi = leiXing !== 'wenben' && daiKuai === null

    // 媒体消息：meiTiId 必填且格式合法（存在性与归属校验在消息服务内完成）
    let meiTiId: string | null = null
    if (shiMeiTi) {
      const yuanMeiTiId = typeof body['meiTiId'] === 'string'
        ? body['meiTiId']
        : typeof body['mei_ti_id'] === 'string'
          ? body['mei_ti_id']
          : ''
      if (!yuanMeiTiId || !yanZhengUUID(yuanMeiTiId)) {
        return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'meiTiBiXuXianChuanShu'))
      }
      meiTiId = yuanMeiTiId
    }

    // FP-08a（缺陷5）引用槽：形状（是不是 UUID）在路由判，与 媒体ID 同口径直接 400；
    // 存在性/同会话/同用户/未撤回/非自引用在消息服务判（只有它拿得到会话归属与事务边界）。
    // 绝不容忍脏值降级为「无引用」继续落库 —— 幂等键脏了只影响去重，引用脏了是把别人的消息
    // 当作本会话内容渲染出来的越权面，两种脏值的后果不同级，不可套用同一条「不丢消息」的宽容口径。
    const yuanShiBeiYongZhi = body['beiYongXiaoXiId'] ?? body['bei_yong_xiao_xi_id'] ?? body['被引用消息ID']
    let beiYongXiaoXiId: string | null = null
    if (yuanShiBeiYongZhi !== undefined && yuanShiBeiYongZhi !== null && yuanShiBeiYongZhi !== '') {
      if (!yanZhengUUID(yuanShiBeiYongZhi)) {
        return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'yinYongXiaoXiFeiFa'))
      }
      beiYongXiaoXiId = yuanShiBeiYongZhi
    }

    // 带了合法块 ⇒ 正文要求由「块里有没有用户文字」变成「有没有块」：纯图片块消息（一张图 + 零文字）
    // 是图文混排的合法形态，老口径在这里就会把它 400 掉。块全被判脏丢光时仍由消息服务给出明确 400。
    if (!jiaoSeId || (!shiMeiTi && daiKuai === null && !shenHeWenBen.trim())) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    // 兼容读取：旧客户端仍会上报自增「客户端序号」。序号自 FP-09 起由服务端事务内权威分配，
    // 该值只被容忍（格式非法仍按 400 拒收，不 500）而不再参与取号与幂等判据。
    const yuanShiXuHao = (qingQiu.body as Record<string, unknown>)['客户端序号']
    let keHuDuanXuHao: number | null = null
    if (yuanShiXuHao !== undefined && yuanShiXuHao !== null) {
      if (typeof yuanShiXuHao === 'number' && Number.isInteger(yuanShiXuHao) && yuanShiXuHao >= 0) {
        keHuDuanXuHao = yuanShiXuHao
      } else if (typeof yuanShiXuHao === 'string' && /^\d+$/.test(yuanShiXuHao)) {
        keHuDuanXuHao = Number(yuanShiXuHao)
      } else {
        return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
      }
    }

    // FP-09 幂等判据：客户端为每条待发消息生成的稳定 UUID。非 UUID 不在路由层拒 400，
    // 由服务层降级为「无幂等键」——脏字段不该让用户消息发不出去。
    const yuanShiMiDengJian = body['幂等键'] ?? body['miDengJian'] ?? body['mi_deng_jian']
    const miDengJian = typeof yuanShiMiDengJian === 'string' ? yuanShiMiDengJian : null

    try {
      // 安全审核：只要消息里带用户文字就必须审（图文混排的文字与纯文本走同一道闸）；
      // 纯图片消息没有文字可审，其像素由上传时的视觉审核负责。
      // 拦截在落库前（非法数据直接销毁，等同撤回）；审核服务自身不可用不计为用户违规。
      if (shenHeWenBen.trim()) {
        const weiJi = jianCeWeiJiXinHao(shenHeWenBen)
        if (weiJi) {
          const jieGuo = await chuangJianYongHuXiaoXi({
            yong_hu_id: yongHu.yongHuId,
            jiao_se_id: jiaoSeId,
            nei_rong: shenHeWenBen,
            nei_rong_kuai: tiJiaoKuaiZhi,
            ke_hu_duan_xu_hao: keHuDuanXuHao,
            mi_deng_jian: miDengJian,
            lei_xing: leiXing,
            mei_ti_id: meiTiId,
            bei_yong_xiao_xi_id: beiYongXiaoXiId,
          })
          if (!jieGuo.cheng_gong) {
            return shiBaiXiangYing(xiangYing, jieGuo.zhuang_tai_ma || 400, jieGuo.ti_shi || huoQuFanYi('liaoTian', 'faSongShiBai'))
          }
          // 消息已落库：之后的审计与 AI 触发都是副作用，失败只落日志，不得把已成功请求改写成 500
          执行落库后副作用('危机干预审计落账', () => jiLuShenJiRiZhi({
            yong_hu_id: yongHu.yongHuId,
            ip: 获取IP(qingQiu),
            shi_jian_lei_xing: '危机干预',
            xiang_qing: { jiao_se_id: jiaoSeId, ming_zhong_ci: weiJi.ming_zhong_ci },
            lei_xing: '安全',
          }), { yong_hu_id: yongHu.yongHuId, jiao_se_id: jiaoSeId })
          const weiJiLuoKuXiaoXi = jieGuo.xiao_xi
          if (weiJiLuoKuXiaoXi) {
            执行落库后副作用(
              '落库后触发AI调度器',
              () => luoKuChuFaJiaoSeTiaoDuQi(yongHu.yongHuId, jiaoSeId, weiJiLuoKuXiaoXi),
              { yong_hu_id: yongHu.yongHuId, jiao_se_id: jiaoSeId },
            )
          }
          return chengGongXiangYing(xiangYing, {
            ...(await shouKouXiaoXiYunYingZiDuan(jieGuo.xiao_xi, yongHu.yongHuId)),
            wei_ji_gan_yu: true,
            yuan_zhu_re_xian: weiJi.yuan_zhu_re_xian,
            gan_yu_ti_shi: weiJi.ti_shi,
            chao_shi_ti_xing_miao: peiZhi.weiJiGanYu.chaoShiTiXingMiao,
          })
        }
        const anQuanJieGuo = await shenHeNeiRongAnQuan(shenHeWenBen)
        if (anQuanJieGuo.wei_gui) {
          if (anQuanJieGuo.lei_xing !== SHEN_HE_FU_WU_BU_KE_YONG_JIAN) {
            await jiLuZhangHaoWeiGui({
              yongHuId: yongHu.yongHuId,
              ip: 获取IP(qingQiu),
              yuanYin: anQuanJieGuo.li_you || anQuanJieGuo.lei_xing || '内容违规',
              leiXing: 'AI聊天',
            })
          }
          const jiLuJieGuo = await 记录违规(
            获取IP(qingQiu),
            '内容违规',
            anQuanJieGuo.yan_zhong_cheng_du === 'yan_zhong'
              ? '严重'
              : anQuanJieGuo.yan_zhong_cheng_du === 'zhong_deng'
                ? '中等'
                : '轻微',
          )
          if (jiLuJieGuo.已封禁) {
            return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('anQuan', 'ipYiBeiFengJin'))
          }
          return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('anQuan', 'xiaoXiNeiRongWeiGui'))
        }
      }

      const jieGuo = await chuangJianYongHuXiaoXi({
        yong_hu_id: yongHu.yongHuId,
        jiao_se_id: jiaoSeId,
        nei_rong: shenHeWenBen,
        nei_rong_kuai: tiJiaoKuaiZhi,
        ke_hu_duan_xu_hao: keHuDuanXuHao,
        mi_deng_jian: miDengJian,
        lei_xing: leiXing,
        mei_ti_id: meiTiId,
        bei_yong_xiao_xi_id: beiYongXiaoXiId,
      })
      if (!jieGuo.cheng_gong) {
        return shiBaiXiangYing(xiangYing, jieGuo.zhuang_tai_ma || 400, jieGuo.ti_shi || huoQuFanYi('liaoTian', 'faSongShiBai'))
      }

      // 用户发送新消息后，清除军师「已指导」状态，
      // 使提示消失并允许重新请求指导
      执行落库后副作用(
        '清除军师已指导状态',
        () => shanChuJunShiZhiDaoZhuangTai(yongHu.yongHuId, jiaoSeId),
        { yong_hu_id: yongHu.yongHuId, jiao_se_id: jiaoSeId },
      )

      if (!shiMeiTi && shenHeWenBen.trim().toLowerCase() === HAO_GAN_DU_PEI_ZHI.miJi.miLing.toLowerCase()) {
        const miJiJieGuo = await sheZhiMiJiHaoGanDu(
          yongHu.yongHuId,
          jiaoSeId,
          HAO_GAN_DU_PEI_ZHI.miJi.miLing,
        )
        if (!miJiJieGuo.cheng_gong) {
          return shiBaiXiangYing(
            xiangYing,
            miJiJieGuo.zhuang_tai_ma || 500,
            miJiJieGuo.ti_shi || huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'),
          )
        }

        const huiFuXiaoXi = await baoCunJiaoSeXiaoXi({
          yong_hu_id: yongHu.yongHuId,
          jiao_se_id: jiaoSeId,
          nei_rong: huoQuFanYi('liaoTian', 'miJiQiYongChengGong'),
        })

        执行落库后副作用('秘密指令确认后推送角色回复', () => {
          const io = huoQuIo()
          if (!io) return
          io.to(yongHu.yongHuId).emit('角色回复', {
            角色ID: jiaoSeId,
            消息列表: [huiFuXiaoXi],
          })
        }, { yong_hu_id: yongHu.yongHuId, jiao_se_id: jiaoSeId })

        // FP-04：秘密指令只回确认消息、不驱动 AI —— 与旧「前端仅在非秘密时才发触发信号」语义一致
        return chengGongXiangYing(xiangYing, {
          ...(await shouKouXiaoXiYunYingZiDuan(jieGuo.xiao_xi, yongHu.yongHuId)),
          shi_mi_ji: true,
        })
      }

      const luoKuXiaoXi = jieGuo.xiao_xi
      if (luoKuXiaoXi) {
        执行落库后副作用(
          '落库后触发AI调度器',
          () => luoKuChuFaJiaoSeTiaoDuQi(yongHu.yongHuId, jiaoSeId, luoKuXiaoXi),
          { yong_hu_id: yongHu.yongHuId, jiao_se_id: jiaoSeId },
        )
      }
      return chengGongXiangYing(
        xiangYing,
        await shouKouXiaoXiYunYingZiDuan(jieGuo.xiao_xi, yongHu.yongHuId),
      )
    } catch (cuoWu) {
      debug日志.error('消息接口', '发送消息失败', {
        xiang_qing: { cuo_wu: String(cuoWu), zhan: cuoWu instanceof Error ? cuoWu.stack : undefined },
      })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('liaoTian', 'faSongShiBai'))
    }
  },
)

luYou.put(
  '/会话/:huiHuaId/消息/:xiaoXiId/撤回',
  liaoTianXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const jiaoSeId = String(qingQiu.params.huiHuaId || '')
    const xiaoXiId = String(qingQiu.params.xiaoXiId || '')
    if (!jiaoSeId || !xiaoXiId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const jieGuo = await cheHuiYongHuXiaoXi({
        yong_hu_id: yongHu.yongHuId,
        jiao_se_id: jiaoSeId,
        xiao_xi_id: xiaoXiId,
      })
      if (!jieGuo.cheng_gong) {
        return shiBaiXiangYing(xiangYing, jieGuo.zhuang_tai_ma || 400, jieGuo.ti_shi || huoQuFanYi('liaoTian', 'cheHuiShiBai'))
      }
      执行落库后副作用(
        '撤回后重置AI调度器',
        () => chongZhiJiaoSeTiaoDuQi(yongHu.yongHuId, jiaoSeId),
        { yong_hu_id: yongHu.yongHuId, jiao_se_id: jiaoSeId },
      )
      执行落库后副作用('撤回后推送管理监控隐藏信息', () => {
        const io = huoQuIo()
        if (!io) return
        io.to(管理监控房间名(yongHu.yongHuId)).emit('管理员_隐藏信息', {
          类型: '用户撤回',
          内容: `用户撤回了消息（ID: ${xiaoXiId}），AI上下文已重置`,
          时间: Date.now(),
        })
      }, { yong_hu_id: yongHu.yongHuId, jiao_se_id: jiaoSeId })
      执行落库后副作用('撤回后写思考记录', () => jiLuSiKao({
        yong_hu_id: yongHu.yongHuId,
        jiao_se_id: jiaoSeId,
        shi_jian: 'guan-li-yuan-yin-cang-xin-xi',
        lei_xing: '用户撤回',
        nei_rong: `用户撤回了消息（ID: ${xiaoXiId}），AI上下文已重置`,
      }), { yong_hu_id: yongHu.yongHuId, jiao_se_id: jiaoSeId })
      return chengGongXiangYing(
        xiangYing,
        await shouKouXiaoXiYunYingZiDuan(jieGuo.xiao_xi, yongHu.yongHuId),
      )
    } catch (cuoWu) {
      debug日志.error('消息接口', '撤回消息失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('liaoTian', 'cheHuiShiBai'))
    }
  },
)

luYou.put(
  '/会话/:huiHuaId/已读',
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const jiaoSeId = String(qingQiu.params.huiHuaId || '')
    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      await biaoJiSuoYouWeiDu(yongHu.yongHuId, jiaoSeId)
      return chengGongXiangYing(xiangYing, null)
    } catch (cuoWu) {
      debug日志.error('消息接口', '标记已读失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.get(
  '/军师/列表',
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    try {
      const jieGuo = await huoQuJunShiLieBiao()
      return chengGongXiangYing(xiangYing, { junShiLieBiao: jieGuo.junShiLieBiao })
    } catch (cuoWu) {
      debug日志.error('消息接口', '获取军师列表失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.post(
  '/军师',
  aiQingQiuXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const jiaoSeId = huoQuZiFuChuan(qingQiu.body as Record<string, unknown>, 'jiaoSeId', 'jiao_se_id')
    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    const junShiId = huoQuZiFuChuan(qingQiu.body as Record<string, unknown>, 'junShiId', 'jun_shi_id')

    try {
      const jieGuo = await qingQiuJunShiZhiDao({
        yong_hu_id: yongHu.yongHuId,
        jiao_se_id: jiaoSeId,
        jun_shi_id: junShiId,
      })
      if (!jieGuo.cheng_gong) {
        return shiBaiXiangYing(xiangYing, jieGuo.zhuang_tai_ma || 400, jieGuo.ti_shi || huoQuFanYi('junShi', 'shengChengShiBai'), jieGuo.cuo_wu_ma)
      }
      return chengGongXiangYing(xiangYing, jieGuo.jie_guo)
    } catch (cuoWu) {
      debug日志.error('消息接口', '请求军师指导失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.get(
  '/军师/记录/:jiaoSeId',
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const jiaoSeId = String(qingQiu.params.jiaoSeId || '')
    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const jieGuo = await huoQuJunShiJiLu(yongHu.yongHuId, jiaoSeId)
      return chengGongXiangYing(xiangYing, { jiLuLieBiao: jieGuo.jiLuLieBiao })
    } catch (cuoWu) {
      debug日志.error('消息接口', '获取军师记录失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.get(
  '/军师/状态/:jiaoSeId',
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const jiaoSeId = String(qingQiu.params.jiaoSeId || '')
    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const jieGuo = await huoQuJunShiZhiDaoZhuangTaiXinXi(yongHu.yongHuId, jiaoSeId)
      return chengGongXiangYing(xiangYing, {
        zhuangTai: jieGuo.zhuang_tai,
        keZaiCiZhiDao: jieGuo.ke_zai_ci_zhi_dao,
        youLiaoTianJiLu: jieGuo.you_liao_tian_ji_lu,
      })
    } catch (cuoWu) {
      debug日志.error('消息接口', '获取军师指导状态失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

// V8：签名 URL 过期后前端 @error 触发重签（校验会话归属与媒体归属）
luYou.get(
  '/会话/:huiHuaId/媒体签名/:meiTiId',
  liaoTianXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const jiaoSeId = String(qingQiu.params.huiHuaId || '')
    const meiTiId = String(qingQiu.params.meiTiId || '')
    if (!yanZhengUUID(jiaoSeId) || !yanZhengUUID(meiTiId)) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
    }

    try {
      // 会话必须属于当前用户，且该媒体必须出现在当前会话的消息中
      const guiShuJieGuo = await 数据库.query(
        `SELECT 1 FROM "角色" WHERE "ID" = $1 AND "用户ID" = $2 LIMIT 1`,
        [jiaoSeId, yongHu.yongHuId],
      )
      if (guiShuJieGuo.rows.length === 0) {
        return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('liaoTian', 'wuQuanXian'))
      }

      const meiTiJieGuo = await 数据库.query(
        `SELECT mf."SHA256"
           FROM "消息" m
           JOIN "媒体文件" mf ON m."媒体ID" = mf."ID"
          WHERE m."媒体ID" = $1 AND m."用户ID" = $2 AND m."角色ID" = $3
          LIMIT 1`,
        [meiTiId, yongHu.yongHuId, jiaoSeId],
      )
      if (meiTiJieGuo.rows.length === 0) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('liaoTian', 'meiTiBuCunZai'))
      }

      return chengGongXiangYing(xiangYing, {
        mei_ti_url: shengChengQianMingURL(String(meiTiJieGuo.rows[0].SHA256).toLowerCase(), yongHu.yongHuId),
      })
    } catch (cuoWu) {
      debug日志.error('消息接口', '重签媒体URL失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.post(
  '/翻译',
  aiQingQiuXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }
    const body = qingQiu.body as Record<string, unknown>
    const neiRong = huoQuZiFuChuan(body, 'neiRong', 'nei_rong')
    if (!neiRong.trim()) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'xiaoXiNeiRongWeiKong'))
    }
    const yuanYu = body['yuanYu'] ?? body['yuan_yu']
    const muBiaoYu = body['muBiaoYu'] ?? body['mu_biao_yu']
    try {
      const jieGuo = await fanYiWenBen(neiRong, yuanYu, muBiaoYu)
      if (!jieGuo.cheng_gong) {
        return shiBaiXiangYing(xiangYing, 500, jieGuo.ti_shi || huoQuFanYi('liaoTian', 'fanYiShiBai'))
      }
      return chengGongXiangYing(xiangYing, { fanYiWenBen: jieGuo.fan_yi })
    } catch (cuoWu) {
      debug日志.error('消息接口', '文本翻译失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('liaoTian', 'fanYiShiBai'))
    }
  },
)

luYou.post(
  '/语音/转写',
  liaoTianXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }
    const body = qingQiu.body as Record<string, unknown>
    const meiTiId = huoQuZiFuChuan(body, 'meiTiId', 'mei_ti_id')
    if (!meiTiId.trim()) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }
    try {
      const wenBen = await mianFeiZhuanXieYuYin({ meiTiId: meiTiId.trim() })
      if (!wenBen) {
        return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('liaoTian', 'yuYinZhuanWenZiShiBai'))
      }
      return chengGongXiangYing(xiangYing, { zhuanXieWenBen: wenBen })
    } catch (cuoWu) {
      debug日志.error('消息接口', '语音转写失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('liaoTian', 'yuYinZhuanWenZiShiBai'))
    }
  },
)

luYou.get(
  '/多模态配置',
  liaoTianXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }
    return chengGongXiangYing(xiangYing, huoQuDuoMoTaiQianDuanShiTu())
  },
)

luYou.post(
  '/多模态配置/重载',
  liaoTianXianLiu,
  guanLiGaoWeiMenKong,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }
    try {
      const jianLieBiao = chongZaiDuoMoTaiHuanJing()
      return chengGongXiangYing(xiangYing, { yiZhongZaiJianShu: jianLieBiao.length })
    } catch (cuoWu) {
      debug日志.error('消息接口', '多模态配置重载失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.post(
  '/会话/:huiHuaId/语音理解',
  liaoTianXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }
    const jiaoSeId = String(qingQiu.params.huiHuaId || '')
    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }
    const body = qingQiu.body as Record<string, unknown>
    const zhuanXie = typeof body['zhuanXieWenBen'] === 'string' ? String(body['zhuanXieWenBen']).trim().slice(0, 500) : typeof body['zhuan_xie_wen_ben'] === 'string' ? String(body['zhuan_xie_wen_ben']).trim().slice(0, 500) : ''
    const shiJianMiaoShu = typeof body['yinPinShiJianMiaoShu'] === 'string' ? String(body['yinPinShiJianMiaoShu']).trim().slice(0, 200) : typeof body['yin_pin_shi_jian_miao_shu'] === 'string' ? String(body['yin_pin_shi_jian_miao_shu']).trim().slice(0, 200) : ''
    const yuanShiChang = body['shiChangHaoMiao'] ?? body['shi_chang_hao_miao']
    const shiChang = typeof yuanShiChang === 'number' && Number.isFinite(yuanShiChang) && yuanShiChang > 0 ? yuanShiChang : null
    try {
      const suoYou = await huoQuJiaoSeSuoYouZhe(jiaoSeId)
      if (!suoYou || suoYou.yong_hu_id !== yongHu.yongHuId) {
        return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('liaoTian', 'wuQuanXian'))
      }
      const keDuWenBen = gouJianYuYinKeDuWenBen({ zhuanXieWenBen: zhuanXie || null, yinPinShiJianMiaoShu: shiJianMiaoShu || null, shiChangHaoMiao: shiChang })
      return chengGongXiangYing(xiangYing, { keDuWenBen })
    } catch (cuoWu) {
      debug日志.error('消息接口', '语音理解失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('liaoTian', 'yuYinLiJieShiBai'))
    }
  },
)

luYou.post(
  '/会话/:huiHuaId/生图',
  aiQingQiuXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }
    return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('liaoTian', 'shengTuGaiYouAIDaiFa'))
  },
)

luYou.post(
  '/会话/:huiHuaId/生成视频',
  aiQingQiuXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }
    return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('liaoTian', 'shengTuGaiYouAIDaiFa'))
  },
)

luYou.get(
  '/会话/:huiHuaId/视频理解',
  liaoTianXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }
    const jiaoSeId = String(qingQiu.params.huiHuaId || '')
    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }
    try {
      const suoYou = await huoQuJiaoSeSuoYouZhe(jiaoSeId)
      if (!suoYou || suoYou.yong_hu_id !== yongHu.yongHuId) {
        return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('liaoTian', 'wuQuanXian'))
      }
      const wenJianMing = typeof qingQiu.query.wenJianMing === 'string' ? String(qingQiu.query.wenJianMing).slice(0, 100) : '视频'
      const body = (qingQiu.body || {}) as Record<string, unknown>
      const meiTiId = typeof body['meiTiId'] === 'string' ? body['meiTiId'] : typeof body['mei_ti_id'] === 'string' ? String(body['mei_ti_id']) : ''
      let sha256: string | null = null
      if (meiTiId && yanZhengUUID(meiTiId)) {
        const meiTiChaXun = await 数据库.query(`SELECT "SHA256" FROM "媒体文件" WHERE "ID" = $1 AND "上传者ID" = $2 LIMIT 1`, [meiTiId, yongHu.yongHuId])
        if (meiTiChaXun.rows.length > 0) sha256 = String(meiTiChaXun.rows[0]['SHA256'] || '').toLowerCase()
      }
      const { huoQuHuoJieXiShiPinMiaoShu } = await import('../services/视频理解')
      const jieXi = await huoQuHuoJieXiShiPinMiaoShu(sha256)
      const keDuWenBen = gouJianShiPinKeDuWenBen({ wenJianMing, huaMianMiaoShu: jieXi.huaMianMiaoShu, zhuanXieWenBen: jieXi.zhuanXieWenBen })
      return chengGongXiangYing(xiangYing, { keDuWenBen })
    } catch (cuoWu) {
      debug日志.error('消息接口', '视频理解失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

export default luYou
