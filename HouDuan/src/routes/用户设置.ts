import { Router } from 'express'
import type { Response } from 'express'
import Busboy from 'busboy'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { debug日志 } from '../utils/debug日志'
import { liaoTianXianLiu } from '../middleware/限流'
import type { RenZhengQingQiu } from '../middleware/认证'
import { 数据库 } from '../数据库'
import {
  liuShiBaoCunMeiTi,
  MeiTiCunChuCuoWu,
  shengChengMeiTiYinYong,
  shengChengQianMingURL,
  zhongXinQianMingMeiTiURL,
  type MeiTiBaoCunJieGuo,
} from '../services/媒体存储'
import {
  WaiGuanCuoWu,
  guiYiCunChuShuJu,
  guiYiShangChuanShuJu,
  shengChengChuCan,
  tiQuShuJuNeiSha,
} from '../services/外观自定义'
import { panDingMeiTiShenHeChuCan } from '../services/媒体审核出参'
import { chaXunZhangHaoFengJin, jiLuZhangHaoWeiGui } from '../services/账号封禁'
import { 获取IP } from '../services/IP封禁'
import {
  QI_PAO_AI_MO_REN,
  QI_PAO_ZI_JI_MO_REN,
  shiHeFaQiPao as danYuanShiHeFaQiPao,
} from '../config/气泡主题'

const luYou = Router()

const LIAO_TIAN_BEI_JING_YU_SHE = new Set(['moRen', 'miWuSenLin', 'haiYangZhiLan', 'fenSeMengJing', 'yeKongXingHe', 'miSeTianYuan', 'chenWuQing', 'muZiXingYe'])
const BEI_JING_URL_ZUI_DA_CHANG_DU = 2000
const MEI_TI_QIAN_MING_LU_JING = /^\/api\/媒体\/[0-9a-f]{64}(\?e=\d{1,12}&s=[0-9a-f]+)?$/
const NEI_WANG_ZHU_JI = [/^localhost$/i, /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^0\.0\.0\.0$/, /^169\.254\./, /^\[?(::1|::ffff:.*|::)\]?$/i]

function shiZiDingYiBeiJingURL(zhi: unknown): boolean {
  if (typeof zhi !== 'string') return false
  const qingLi = zhi.trim()
  if (!qingLi || qingLi.length > BEI_JING_URL_ZUI_DA_CHANG_DU) return false
  if (qingLi.startsWith('/')) {
    if (MEI_TI_QIAN_MING_LU_JING.test(qingLi)) return true
    const xinQianMing = /^\/api\/媒体\/[0-9a-f]{64}\?e=\d{1,12}&u=[0-9a-f-]{36}&t=\d{1,15}&s=[0-9a-f]+$/i.test(qingLi)
    return xinQianMing
  }
  let jieXi: URL
  try {
    jieXi = new URL(qingLi)
  } catch {
    return false
  }
  if (jieXi.protocol !== 'https:') return false
  if (jieXi.username || jieXi.password) return false
  if (NEI_WANG_ZHU_JI.some((biaoDaShi) => biaoDaShi.test(jieXi.hostname))) return false
  return true
}

export function shiHeFaLiaoTianBeiJing(zhi: unknown): zhi is string {
  return typeof zhi === 'string' && (LIAO_TIAN_BEI_JING_YU_SHE.has(zhi) || shiZiDingYiBeiJingURL(zhi))
}

export function shiHeFaQiPao(zhi: unknown): zhi is string {
  return danYuanShiHeFaQiPao(zhi)
}

function duQuQiPao(sheZhi: Record<string, unknown>, jian: string, moRen: string): string {
  const zhi = sheZhi[jian]
  return shiHeFaQiPao(zhi) ? String(zhi) : moRen
}

async function queBaoSheZhiHang(yongHuId: string): Promise<Record<string, unknown>> {
  await 数据库.query(
    `INSERT INTO "用户设置" ("用户ID") VALUES ($1) ON CONFLICT ("用户ID") DO NOTHING`,
    [yongHuId],
  )
  const jieGuo = await 数据库.query(`SELECT * FROM "用户设置" WHERE "用户ID" = $1 LIMIT 1`, [yongHuId])
  return jieGuo.rows[0] as Record<string, unknown>
}

async function jieShouTuPianShangChuan(
  qingQiu: RenZhengQingQiu,
  xiangYing: Response,
  weiGuiLeiXing: string,
  chengGong: (
    yongHuId: string,
    jieGuo: MeiTiBaoCunJieGuo,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>,
): Promise<void> {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    return
  }
  const shangChuanFengJin = await chaXunZhangHaoFengJin(yongHu.yongHuId)
  if (shangChuanFengJin.beiFengJin) {
    shiBaiXiangYing(xiangYing, 403, huoQuFanYi('anQuan', 'zhangHaoYiBeiFengJin'))
    return
  }
  const contentType = String(qingQiu.headers['content-type'] || '')
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'meiTiQueShaoWenJian'))
    return
  }
  await new Promise<void>((jieJue) => {
    let yiXiangYing = false
    let chuLiGuoWenJian = false
    const huiYing = (fn: () => void) => {
      if (yiXiangYing) return
      yiXiangYing = true
      fn()
    }
    const busboy = Busboy({ headers: qingQiu.headers, defParamCharset: 'utf8', limits: { files: 1 } })
    busboy.on('file', (_fieldMing, wenJianLiu, xinXi) => {
      if (yiXiangYing || chuLiGuoWenJian) {
        wenJianLiu.resume()
        return
      }
      chuLiGuoWenJian = true
      liuShiBaoCunMeiTi(
        wenJianLiu,
        xinXi.filename || 'wai-guan-tu-pian',
        xinXi.mimeType || '',
        'tupian',
        yongHu.yongHuId,
      )
        .then(async (jieGuo) => {
          try {
            const shuJu = await chengGong(yongHu.yongHuId, jieGuo)
            huiYing(() => chengGongXiangYing(xiangYing, shuJu))
          } catch (cuoWu) {
            if (cuoWu instanceof WaiGuanCuoWu) {
              huiYing(() => shiBaiXiangYing(xiangYing, 400, cuoWu.fanYiJian))
              return
            }
            debug日志.error('用户设置接口', '外观图片落库失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
            huiYing(() => shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu')))
          }
        })
        .catch(async (cuoWu) => {
          if (cuoWu instanceof MeiTiCunChuCuoWu) {
            const chuCan = panDingMeiTiShenHeChuCan(String(cuoWu.fanYiJian))
            if (chuCan.xuYaoJiWeiGui) {
              await jiLuZhangHaoWeiGui({
                yongHuId: yongHu.yongHuId,
                ip: 获取IP(qingQiu),
                yuanYin: String(cuoWu.fanYiJian),
                leiXing: weiGuiLeiXing,
              })
            }
            huiYing(() => shiBaiXiangYing(xiangYing, chuCan.zhuangTaiMa, chuCan.tiShi))
            return
          }
          debug日志.error('用户设置接口', '外观图片上传失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
          huiYing(() => shiBaiXiangYing(xiangYing, 500, huoQuFanYi('liaoTian', 'meiTiShangChuanShiBai')))
        })
        .finally(() => {
          if (!wenJianLiu.readableEnded) wenJianLiu.resume()
        })
    })
    busboy.on('error', (cuoWu) => {
      debug日志.error('用户设置接口', '外观图片解析失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      huiYing(() => shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa')))
    })
    busboy.on('close', () => {
      if (!chuLiGuoWenJian) {
        huiYing(() => shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'meiTiQueShaoWenJian')))
      }
      jieJue()
    })
    qingQiu.pipe(busboy)
  })
}

luYou.get('/', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  try {
    const sheZhi = await queBaoSheZhiHang(yongHu.yongHuId)
    const yongHuHang = await 数据库.query(
      `SELECT "ID", "手机号", "用户名", "昵称", "头像", "签名", "签名可见性", "签名白名单" FROM "用户" WHERE "ID" = $1 LIMIT 1`,
      [yongHu.yongHuId],
    )
    const hang = yongHuHang.rows[0] as Record<string, unknown> | undefined
    const baiMingDanRaw = hang?.['签名白名单']
    const { tiQuMeiTiSha } = await import('../services/媒体存储')
    const cunChuBeiJing = String(sheZhi['聊天背景'] || 'moRen')
    const beiJingSha = tiQuMeiTiSha(cunChuBeiJing)
    const zhanShiBeiJing = beiJingSha ? zhongXinQianMingMeiTiURL(cunChuBeiJing, yongHu.yongHuId) || 'moRen' : cunChuBeiJing
    const cunChuQian = String(sheZhi['聊天背景浅色'] || '')
    const cunChuShen = String(sheZhi['聊天背景深色'] || '')
    const jieSuoBeiJing = (cunChu: string): string => {
      const luoKu = cunChu || cunChuBeiJing
      const sha = tiQuMeiTiSha(luoKu)
      return sha ? zhongXinQianMingMeiTiURL(luoKu, yongHu.yongHuId) || 'moRen' : luoKu
    }
    const zhanShiQian = jieSuoBeiJing(cunChuQian)
    const zhanShiShen = jieSuoBeiJing(cunChuShen)
    const duiXiang = await 数据库.query(
      `SELECT "ID", "头像" FROM "角色" WHERE "用户ID" = $1 ORDER BY "创建时间" DESC LIMIT 1`,
      [yongHu.yongHuId],
    )
    const duiXiangHang = duiXiang.rows[0] as Record<string, unknown> | undefined
    const duiXiangTouXiangCun = duiXiangHang?.['头像'] ? String(duiXiangHang['头像']) : ''
    const duiXiangTouXiang = duiXiangTouXiangCun
      ? zhongXinQianMingMeiTiURL(duiXiangTouXiangCun, yongHu.yongHuId) || duiXiangTouXiangCun
      : null
    const waiGuan = guiYiCunChuShuJu(sheZhi['外观自定义'])
    return chengGongXiangYing(xiangYing, {
      uid: yongHu.yongHuId,
      shou_ji_hao: String(hang?.['手机号'] || ''),
      tou_xiang: hang?.['头像'] ? String(hang['头像']) : null,
      qian_ming: hang?.['签名'] ? String(hang['签名']) : null,
      qian_ming_ke_jian_xing: typeof hang?.['签名可见性'] === 'string' ? String(hang['签名可见性']) : 'gong_kai',
      qian_ming_bai_ming_dan: Array.isArray(baiMingDanRaw) ? baiMingDanRaw.map((x) => String(x)) : [],
      liao_tian_bei_jing: zhanShiBeiJing,
      liao_tian_bei_jing_qian: zhanShiQian,
      liao_tian_bei_jing_shen: zhanShiShen,
      qi_pao_zi_ji: duQuQiPao(sheZhi, '气泡自己', QI_PAO_ZI_JI_MO_REN),
      qi_pao_ai: duQuQiPao(sheZhi, '气泡AI', QI_PAO_AI_MO_REN),
      gong_kai_zhang_hao: sheZhi['公开账号'] !== false,
      gong_kai_shou_ji_hao: sheZhi['公开手机号'] === true,
      gong_kai_you_xiang: sheZhi['公开邮箱'] === true,
      bang_ding_you_xiang: String(sheZhi['绑定邮箱'] || ''),
      wai_guan: shengChengChuCan(waiGuan, yongHu.yongHuId),
      dui_xiang_jiao_se_id: duiXiangHang ? String(duiXiangHang['ID']) : null,
      dui_xiang_tou_xiang: duiXiangTouXiang,
    })
  } catch (cuoWu) {
    debug日志.error('用户设置接口', '查询设置失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.put('/聊天背景', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const qingQiuTi = qingQiu.body as Record<string, unknown>
  const beiJing = typeof qingQiuTi['beiJing'] === 'string' ? qingQiuTi['beiJing'] : typeof qingQiuTi['bei_jing'] === 'string' ? String(qingQiuTi['bei_jing']) : ''
  const moShiYuanShi = typeof qingQiuTi['moShi'] === 'string' ? qingQiuTi['moShi'] : typeof qingQiuTi['mo_shi'] === 'string' ? String(qingQiuTi['mo_shi']) : ''
  const moShi = moShiYuanShi === 'qian' || moShiYuanShi === 'shen' ? moShiYuanShi : ''
  if (!shiHeFaLiaoTianBeiJing(beiJing)) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  }
  try {
    await queBaoSheZhiHang(yongHu.yongHuId)
    const { tiQuMeiTiSha: tiQuSha, shengChengMeiTiYinYong } = await import('../services/媒体存储')
    let luoKuZhi = beiJing
    const beiJingSha = tiQuSha(beiJing)
    if (beiJingSha) {
      const guiShu = await 数据库.query(`SELECT 1 FROM "媒体文件" WHERE "SHA256" = $1 AND "上传者ID" = $2 LIMIT 1`, [beiJingSha, yongHu.yongHuId])
      if (guiShu.rows.length === 0) {
        return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'meiTiWuQuanXian'))
      }
      luoKuZhi = shengChengMeiTiYinYong(beiJingSha)
    }
    if (moShi === 'qian') {
      await 数据库.query(`UPDATE "用户设置" SET "聊天背景浅色" = $1, "更新时间" = NOW() WHERE "用户ID" = $2`, [luoKuZhi, yongHu.yongHuId])
    } else if (moShi === 'shen') {
      await 数据库.query(`UPDATE "用户设置" SET "聊天背景深色" = $1, "更新时间" = NOW() WHERE "用户ID" = $2`, [luoKuZhi, yongHu.yongHuId])
    } else {
      await 数据库.query(`UPDATE "用户设置" SET "聊天背景" = $1, "聊天背景浅色" = $1, "聊天背景深色" = $1, "更新时间" = NOW() WHERE "用户ID" = $2`, [luoKuZhi, yongHu.yongHuId])
    }
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('用户设置接口', '保存聊天背景失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/聊天背景/上传', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  await jieShouTuPianShangChuan(qingQiu, xiangYing, '聊天背景', (yongHuId, jieGuo) => {
    return { bei_jing: shengChengQianMingURL(jieGuo.sha256, yongHuId) }
  })
})

luYou.post('/外观/上传', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  await jieShouTuPianShangChuan(qingQiu, xiangYing, '自定义外观', (yongHuId, jieGuo) => {
    return { tu_di_zhi: shengChengQianMingURL(jieGuo.sha256, yongHuId) }
  })
})

luYou.post('/对象头像', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  await jieShouTuPianShangChuan(qingQiu, xiangYing, '对象头像', async (yongHuId, jieGuo) => {
    const jiaoSe = await 数据库.query(
      `SELECT "ID" FROM "角色" WHERE "用户ID" = $1 ORDER BY "创建时间" DESC LIMIT 1`,
      [yongHuId],
    )
    if (jiaoSe.rows.length === 0) {
      throw new WaiGuanCuoWu(huoQuFanYi('sheZhi', 'duiXiangJiaoSeMeiYou'))
    }
    const jiaoSeId = String(jiaoSe.rows[0].ID)
    const yinYong = shengChengMeiTiYinYong(jieGuo.sha256)
    await 数据库.query(`UPDATE "角色" SET "头像" = $1 WHERE "ID" = $2`, [yinYong, jiaoSeId])
    return {
      dui_xiang_jiao_se_id: jiaoSeId,
      dui_xiang_tou_xiang: zhongXinQianMingMeiTiURL(yinYong, yongHuId),
    }
  })
})

luYou.put('/外观', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  try {
    const shuJu = guiYiShangChuanShuJu(qingQiu.body)
    const shaLie = tiQuShuJuNeiSha(shuJu)
    if (shaLie.length > 0) {
      const guiShu = await 数据库.query(
        `SELECT DISTINCT "SHA256" FROM "媒体文件" WHERE "SHA256" = ANY($1::text[]) AND "上传者ID" = $2`,
        [shaLie, yongHu.yongHuId],
      )
      const yiYou = new Set(guiShu.rows.map((hang) => String(hang.SHA256).toLowerCase()))
      if (shaLie.some((sha) => !yiYou.has(sha))) {
        return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'meiTiWuQuanXian'))
      }
    }
    await queBaoSheZhiHang(yongHu.yongHuId)
    await 数据库.query(
      `UPDATE "用户设置" SET "外观自定义" = $1::jsonb, "更新时间" = NOW() WHERE "用户ID" = $2`,
      [JSON.stringify(shuJu), yongHu.yongHuId],
    )
    return chengGongXiangYing(xiangYing, shengChengChuCan(shuJu, yongHu.yongHuId))
  } catch (cuoWu) {
    if (cuoWu instanceof WaiGuanCuoWu) {
      return shiBaiXiangYing(xiangYing, 400, cuoWu.fanYiJian)
    }
    debug日志.error('用户设置接口', '保存外观自定义失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.put('/气泡', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const qingQiuTi = qingQiu.body as Record<string, unknown>
  const ziJi = qingQiuTi['ziJi'] ?? qingQiuTi['zi_ji']
  const ai = qingQiuTi['ai']
  if ((ziJi !== undefined && !shiHeFaQiPao(ziJi)) || (ai !== undefined && !shiHeFaQiPao(ai))) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  }
  if (ziJi === undefined && ai === undefined) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }
  try {
    await queBaoSheZhiHang(yongHu.yongHuId)
    if (ziJi !== undefined) {
      await 数据库.query(`UPDATE "用户设置" SET "气泡自己" = $1, "气泡已显式设置" = true, "更新时间" = NOW() WHERE "用户ID" = $2`, [String(ziJi), yongHu.yongHuId])
    }
    if (ai !== undefined) {
      await 数据库.query(`UPDATE "用户设置" SET "气泡AI" = $1, "更新时间" = NOW() WHERE "用户ID" = $2`, [String(ai), yongHu.yongHuId])
    }
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('用户设置接口', '保存气泡主题失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.put('/隐私', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const qingQiuTi = qingQiu.body as Record<string, unknown>
  const quZhi = (jian: string, xiaHuaJian: string): boolean | null => {
    if (typeof qingQiuTi[jian] === 'boolean') return qingQiuTi[jian] as boolean
    if (typeof qingQiuTi[xiaHuaJian] === 'boolean') return qingQiuTi[xiaHuaJian] as boolean
    return null
  }
  const gongKaiZhangHao = quZhi('gongKaiZhangHao', 'gong_kai_zhang_hao')
  const gongKaiShouJi = quZhi('gongKaiShouJiHao', 'gong_kai_shou_ji_hao')
  const gongKaiYouXiang = quZhi('gongKaiYouXiang', 'gong_kai_you_xiang')
  try {
    await queBaoSheZhiHang(yongHu.yongHuId)
    if (gongKaiZhangHao !== null) {
      await 数据库.query(`UPDATE "用户设置" SET "公开账号" = $1, "更新时间" = NOW() WHERE "用户ID" = $2`, [gongKaiZhangHao, yongHu.yongHuId])
    }
    if (gongKaiShouJi !== null) {
      await 数据库.query(`UPDATE "用户设置" SET "公开手机号" = $1, "更新时间" = NOW() WHERE "用户ID" = $2`, [gongKaiShouJi, yongHu.yongHuId])
    }
    if (gongKaiYouXiang !== null) {
      await 数据库.query(`UPDATE "用户设置" SET "公开邮箱" = $1, "更新时间" = NOW() WHERE "用户ID" = $2`, [gongKaiYouXiang, yongHu.yongHuId])
    }
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('用户设置接口', '保存隐私设置失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/排位/清空', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  try {
    await 数据库.query(`DELETE FROM "挑战积分" WHERE "用户ID" = $1`, [yongHu.yongHuId])
    await 数据库.query(`DELETE FROM "挑战对局" WHERE "用户ID" = $1`, [yongHu.yongHuId])
    await queBaoSheZhiHang(yongHu.yongHuId)
    await 数据库.query(`UPDATE "用户设置" SET "清空排位时间" = NOW(), "更新时间" = NOW() WHERE "用户ID" = $1`, [yongHu.yongHuId])
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('用户设置接口', '清空排位赛数据失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

export default luYou
