import { Router } from 'express'
import type { Response } from 'express'
import Busboy from 'busboy'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { liaoTianXianLiu, aiQingQiuXianLiu } from '../middleware/限流'
import type { RenZhengQingQiu } from '../middleware/认证'
import {
  huoQuXiaoXiLieBiao,
  chuangJianYongHuXiaoXi,
  cheHuiYongHuXiaoXi,
  biaoJiSuoYouWeiDu,
} from '../services/消息'
import { liuShiBaoCunMeiTi, MeiTiCunChuCuoWu, shengChengQianMingURL } from '../services/媒体存储'
import { shiHeFaLeiBie, shiHeFaXiaoXiLeiXing } from '../config/媒体配置'
import { shenHeNeiRongAnQuan } from '../services/安全审核'
import { 获取IP, 记录违规 } from '../services/IP封禁'
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
import { chongZhiJiaoSeTiaoDuQi } from '../socket/聊天'
import { huoQuIo } from '../socket/io'
import { 数据库 } from '../数据库'
import { HAO_GAN_DU_PEI_ZHI } from '../config/好感度配置'
import { sheZhiMiJiHaoGanDu } from '../services/好感度'

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
      console.error('获取会话列表失败', cuoWu)
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
      console.error('创建会话失败', cuoWu)
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

    try {
      const jieGuo = await huoQuXiaoXiLieBiao({
        yong_hu_id: yongHu.yongHuId,
        jiao_se_id: jiaoSeId,
        ye_ma: yeMa,
        mei_ye_tiao_shu: meiYeTiaoShu,
      })
      return chengGongXiangYing(xiangYing, { lie_biao: jieGuo.lie_biao, zong_shu: jieGuo.zong_shu })
    } catch (cuoWu) {
      console.error('获取消息列表失败', cuoWu)
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
              mei_ti_url: shengChengQianMingURL(jieGuo.sha256),
            })
          })
          .catch((cuoWu) => {
            yiXiangYing = true
            if (cuoWu instanceof MeiTiCunChuCuoWu) {
              shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', cuoWu.fanYiJian))
              return
            }
            console.error('媒体上传失败', cuoWu)
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
          console.error('媒体解析失败', cuoWu)
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

    const jiaoSeId = String(qingQiu.params.huiHuaId || '')
    const body = qingQiu.body as Record<string, unknown>
    const neiRong = huoQuZiFuChuan(body, 'neiRong', 'nei_rong')
    const yuanLeiXing = huoQuZiFuChuan(body, 'leiXing', 'lei_xing')
    const leiXing = yuanLeiXing || 'wenben'
    if (!shiHeFaXiaoXiLeiXing(leiXing)) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'xiaoXiLeiXingFeiFa'))
    }
    const shiMeiTi = leiXing !== 'wenben'

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

    if (!jiaoSeId || (!shiMeiTi && !neiRong.trim())) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    // 校验客户端序号：存在则必须为非负整数（BIGINT 范围），拒绝非整数，缺失则视为 null 由服务端按会话追加
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

    try {
      // 安全审核仅对文本消息内容执行
      if (!shiMeiTi) {
        const anQuanJieGuo = await shenHeNeiRongAnQuan(neiRong)
        if (anQuanJieGuo.wei_gui) {
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
        nei_rong: neiRong,
        ke_hu_duan_xu_hao: keHuDuanXuHao,
        lei_xing: leiXing,
        mei_ti_id: meiTiId,
      })
      if (!jieGuo.cheng_gong) {
        return shiBaiXiangYing(xiangYing, jieGuo.zhuang_tai_ma || 400, jieGuo.ti_shi || huoQuFanYi('liaoTian', 'faSongShiBai'))
      }

      // 用户发送新消息后，清除军师「已指导」状态，
      // 使提示消失并允许重新请求指导
      await shanChuJunShiZhiDaoZhuangTai(yongHu.yongHuId, jiaoSeId).catch(() => {})

      if (!shiMeiTi && neiRong.trim().toLowerCase() === HAO_GAN_DU_PEI_ZHI.miJi.miLing.toLowerCase()) {
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

        const io = huoQuIo()
        if (io) {
          io.to(yongHu.yongHuId).emit('角色回复', {
            角色ID: jiaoSeId,
            消息列表: [huiFuXiaoXi],
          })
        }

        return chengGongXiangYing(xiangYing, { ...jieGuo.xiao_xi, shi_mi_ji: true })
      }

      return chengGongXiangYing(xiangYing, jieGuo.xiao_xi)
    } catch (cuoWu) {
      console.error('发送消息失败', cuoWu)
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
      chongZhiJiaoSeTiaoDuQi(yongHu.yongHuId, jiaoSeId)
      const io = huoQuIo()
      if (io) {
        io.to(yongHu.yongHuId).emit('管理员_隐藏信息', {
          类型: '用户撤回',
          内容: `用户撤回了消息（ID: ${xiaoXiId}），AI 上下文已重置`,
          时间: Date.now(),
        })
      }
      return chengGongXiangYing(xiangYing, jieGuo.xiao_xi)
    } catch (cuoWu) {
      console.error('撤回消息失败', cuoWu)
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
      console.error('标记已读失败', cuoWu)
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
      console.error('获取军师列表失败', cuoWu)
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
      console.error('请求军师指导失败', cuoWu)
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
      console.error('获取军师记录失败', cuoWu)
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
      console.error('获取军师指导状态失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

export default luYou
