import { Router } from 'express'
import type { Response } from 'express'
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
import { shenHeNeiRongAnQuan } from '../services/安全审核'
import { 获取IP, 记录违规 } from '../services/IP封禁'
import { 聊天内容验证中间件 } from '../middleware/输入验证'
import {
  huoQuJunShiLieBiao,
  qingQiuJunShiZhiDao,
  huoQuJunShiJiLu,
} from '../services/军师'
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
  '/会话/:huiHuaId/消息',
  liaoTianXianLiu,
  聊天内容验证中间件,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const jiaoSeId = String(qingQiu.params.huiHuaId || '')
    const neiRong = huoQuZiFuChuan(qingQiu.body as Record<string, unknown>, 'neiRong', 'nei_rong')

    if (!jiaoSeId || !neiRong.trim()) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
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

      const jieGuo = await chuangJianYongHuXiaoXi({
        yong_hu_id: yongHu.yongHuId,
        jiao_se_id: jiaoSeId,
        nei_rong: neiRong,
      })
      if (!jieGuo.cheng_gong) {
        return shiBaiXiangYing(xiangYing, jieGuo.zhuang_tai_ma || 400, jieGuo.ti_shi || huoQuFanYi('liaoTian', 'faSongShiBai'))
      }

      if (neiRong.trim().toLowerCase() === HAO_GAN_DU_PEI_ZHI.miJi.miLing.toLowerCase()) {
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

export default luYou
