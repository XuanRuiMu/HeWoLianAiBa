import { Router } from 'express'
import type { Response } from 'express'
import Busboy from 'busboy'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { debug日志 } from '../utils/debug日志'
import { liaoTianXianLiu } from '../middleware/限流'
import type { RenZhengQingQiu } from '../middleware/认证'
import { yanZhengUUID } from '../utils/验证'
import { 数据库 } from '../数据库'
import { liuShiBaoCunMeiTi, MeiTiCunChuCuoWu, shengChengQianMingURL } from '../services/媒体存储'
import { panDingMeiTiShenHeChuCan } from '../services/媒体审核出参'
import { chaXunZhangHaoFengJin, jiLuZhangHaoWeiGui } from '../services/账号封禁'
import { 获取IP } from '../services/IP封禁'
import { BIAO_QING_PEI_ZHI, BIAO_QING_MEI_TI_LEI_BIE } from '../config/表情配置'

const luYou = Router()

const KONG_ZHI_ZI_FU = new RegExp('[\\u0000-\\u001f\\u007f]', 'g')

interface BiaoQingXing {
  id: string
  mei_ti_id: string
  sha256: string
  mime: string
  duan_ming: string
  pai_xu: number
  chuang_jian_shi_jian: string
  mei_ti_url: string
}

function qingLiDuanMing(yuanShiWenJianMing: unknown): string {
  const ming = String(yuanShiWenJianMing ?? '')
    .replace(KONG_ZHI_ZI_FU, '')
    .trim()
  if (!ming) return ''
  return Array.from(ming)
    .slice(0, BIAO_QING_PEI_ZHI.duanMingZuiDaChangDu)
    .join('')
}

function zhuangHuaBiaoQingXing(hang: Record<string, unknown>, yongHuId: string): BiaoQingXing {
  const sha256 = String(hang['sha256'] || '').toLowerCase()
  return {
    id: String(hang['id']),
    mei_ti_id: String(hang['mei_ti_id']),
    sha256,
    mime: String(hang['mime'] || ''),
    duan_ming: String(hang['duan_ming'] || ''),
    pai_xu: Number(hang['pai_xu'] ?? 0),
    chuang_jian_shi_jian: String(hang['chuang_jian_shi_jian'] || ''),
    mei_ti_url: shengChengQianMingURL(sha256, yongHuId),
  }
}

export const BIAO_QING_YU_JU = {
  查列表: `
  SELECT b."ID" AS id, b."媒体ID" AS mei_ti_id, m."SHA256" AS sha256, m."MIME" AS mime,
         b."短名" AS duan_ming, b."排序" AS pai_xu, b."创建时间" AS chuang_jian_shi_jian
    FROM "用户表情" b
    JOIN "媒体文件" m ON m."ID" = b."媒体ID"
   WHERE b."用户ID" = $1
   ORDER BY b."排序" ASC, b."创建时间" ASC`,
  按内容查一条: `
  SELECT b."ID" AS id, b."媒体ID" AS mei_ti_id, m."SHA256" AS sha256, m."MIME" AS mime,
         b."短名" AS duan_ming, b."排序" AS pai_xu, b."创建时间" AS chuang_jian_shi_jian
    FROM "用户表情" b
    JOIN "媒体文件" m ON m."ID" = b."媒体ID"
   WHERE b."用户ID" = $1 AND m."SHA256" = $2
   ORDER BY b."排序" ASC
   LIMIT 1`,
  计数与下一序: `
   SELECT COUNT(*)::int AS shu, COALESCE(MAX("排序") + 1, 0)::int AS xu
     FROM "用户表情" WHERE "用户ID" = $1`,
  本人标识: `SELECT lower("ID"::text) AS id FROM "用户表情" WHERE "用户ID" = $1`,
  插入: `
   INSERT INTO "用户表情" ("用户ID", "媒体ID", "短名", "排序")
   VALUES ($1, $2, $3, $4)
   RETURNING "ID" AS id, "媒体ID" AS mei_ti_id, "短名" AS duan_ming,
             "排序" AS pai_xu, "创建时间" AS chuang_jian_shi_jian`,
  删除: `DELETE FROM "用户表情" WHERE "ID" = $1 AND "用户ID" = $2 RETURNING "ID"`,
  批量改序: `
   UPDATE "用户表情" b SET "排序" = x.shi_xu
     FROM (SELECT unnest($2::uuid[]) AS id,
                  generate_series(0, array_length($2::uuid[], 1) - 1) AS shi_xu) x
    WHERE b."ID" = x.id AND b."用户ID" = $1`,
  回收媒体行: `DELETE FROM "媒体文件" WHERE "ID" = $1 AND "上传者ID" = $2`,
  开启事务: 'BEGIN',
  提交事务: 'COMMIT',
  回滚事务: 'ROLLBACK',
  取登记锁: `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
} as const

export function biaoQingDengJiSuoJian(yongHuId: string): string {
  return `biaoqing-dengji:${yongHuId}`
}

async function quBiaoQingLieBiao(yongHuId: string): Promise<BiaoQingXing[]> {
  const jieGuo = await 数据库.query(BIAO_QING_YU_JU.查列表, [yongHuId])
  return jieGuo.rows.map((hang: Record<string, unknown>) => zhuangHuaBiaoQingXing(hang, yongHuId))
}

type DengJiJieGuo =
  | { zhuang_tai: 'yi_cun_zai'; biao_qing: BiaoQingXing }
  | { zhuang_tai: 'xin_zeng'; biao_qing: BiaoQingXing }
  | { zhuang_tai: 'yi_man' }

async function dengJiBiaoQing(
  yongHuId: string,
  meiTi: { mediaId: string; sha256: string; mime: string },
  duanMing: string,
): Promise<DengJiJieGuo> {
  const lianJie = await 数据库.connect()
  try {
    await lianJie.query(BIAO_QING_YU_JU.开启事务)
    await lianJie.query(BIAO_QING_YU_JU.取登记锁, [biaoQingDengJiSuoJian(yongHuId)])

    const yiYou = await lianJie.query(BIAO_QING_YU_JU.按内容查一条, [yongHuId, meiTi.sha256])
    if (yiYou.rows.length > 0) {
      const biaoQing = zhuangHuaBiaoQingXing(yiYou.rows[0] as Record<string, unknown>, yongHuId)
      await lianJie.query(BIAO_QING_YU_JU.回收媒体行, [meiTi.mediaId, yongHuId])
      await lianJie.query(BIAO_QING_YU_JU.提交事务)
      return { zhuang_tai: 'yi_cun_zai', biao_qing: biaoQing }
    }

    const jiShu = await lianJie.query(BIAO_QING_YU_JU.计数与下一序, [yongHuId])
    const shuHang = jiShu.rows[0] as Record<string, unknown> | undefined
    if (Number(shuHang?.shu ?? 0) >= BIAO_QING_PEI_ZHI.meiYongHuZuiDaTiaoShu) {
      await lianJie.query(BIAO_QING_YU_JU.回滚事务)
      return { zhuang_tai: 'yi_man' }
    }

    const chaRu = await lianJie.query(BIAO_QING_YU_JU.插入, [
      yongHuId,
      meiTi.mediaId,
      duanMing,
      Number(shuHang?.xu ?? 0),
    ])
    await lianJie.query(BIAO_QING_YU_JU.提交事务)
    const hang = chaRu.rows[0] as Record<string, unknown>
    return {
      zhuang_tai: 'xin_zeng',
      biao_qing: zhuangHuaBiaoQingXing(
        { ...hang, sha256: meiTi.sha256, mime: meiTi.mime },
        yongHuId,
      ),
    }
  } catch (cuoWu) {
    await lianJie.query(BIAO_QING_YU_JU.回滚事务).catch(() => undefined)
    throw cuoWu
  } finally {
    lianJie.release()
  }
}

async function huiYingMeiTiCuoWu(
  cuoWu: unknown,
  xiangYing: Response,
  yongHuId: string,
  qingQiu: RenZhengQingQiu,
): Promise<void> {
  if (cuoWu instanceof MeiTiCunChuCuoWu) {
    const jian = String(cuoWu.fanYiJian)
    const chuCan = panDingMeiTiShenHeChuCan(jian)
    if (chuCan.xuYaoJiWeiGui) {
      await jiLuZhangHaoWeiGui({
        yongHuId,
        ip: 获取IP(qingQiu),
        yuanYin: jian,
        leiXing: '用户表情',
      })
    }
    shiBaiXiangYing(xiangYing, chuCan.zhuangTaiMa, chuCan.tiShi)
    return
  }
  debug日志.error('表情接口', '自定义表情存储失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
  shiBaiXiangYing(xiangYing, 500, huoQuFanYi('liaoTian', 'meiTiShangChuanShiBai'))
}

luYou.get('/我的', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  try {
    const lieBiao = await quBiaoQingLieBiao(yongHu.yongHuId)
    return chengGongXiangYing(xiangYing, { lie_biao: lieBiao, zong_shu: lieBiao.length })
  } catch (cuoWu) {
    debug日志.error('表情接口', '查询自定义表情失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/我的', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const fengJin = await chaXunZhangHaoFengJin(yongHu.yongHuId)
  if (fengJin.beiFengJin) {
    return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('anQuan', 'zhangHaoYiBeiFengJin'))
  }
  const contentType = String(qingQiu.headers['content-type'] || '')
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'meiTiQueShaoWenJian'))
  }

  await new Promise<void>((jieJue) => {
    let yiXiangYing = false
    let chuLiGuoWenJian = false
    const huiYing = (zhi: () => void) => {
      if (yiXiangYing) return
      yiXiangYing = true
      zhi()
    }
    const busboy = Busboy({
      headers: qingQiu.headers,
      defParamCharset: 'utf8',
      limits: { files: 1 },
    })

    busboy.on('file', (_fieldMing, wenJianLiu, xinXi) => {
      if (yiXiangYing || chuLiGuoWenJian) {
        wenJianLiu.resume()
        return
      }
      chuLiGuoWenJian = true
      liuShiBaoCunMeiTi(
        wenJianLiu,
        xinXi.filename || 'biaoqing',
        xinXi.mimeType || '',
        BIAO_QING_MEI_TI_LEI_BIE,
        yongHu.yongHuId,
      )
        .then(async (jieGuo) => {
          const jieLun = await dengJiBiaoQing(
            yongHu.yongHuId,
            { mediaId: jieGuo.mediaId, sha256: jieGuo.sha256, mime: jieGuo.mime },
            qingLiDuanMing(xinXi.filename),
          )
          if (jieLun.zhuang_tai === 'yi_man') {
            huiYing(() =>
              shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'biaoQingShuLiangYiMan')),
            )
            return
          }
          huiYing(() =>
            chengGongXiangYing(xiangYing, {
              biao_qing: jieLun.biao_qing,
              yi_cun_zai: jieLun.zhuang_tai === 'yi_cun_zai',
            }),
          )
        })
        .catch(async (cuoWu) => {
          await huiYingMeiTiCuoWu(cuoWu, xiangYing, yongHu.yongHuId, qingQiu)
        })
        .finally(() => {
          if (!wenJianLiu.readableEnded) wenJianLiu.resume()
        })
    })

    busboy.on('error', (cuoWu) => {
      debug日志.error('表情接口', '表情图片解析失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      huiYing(() => shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa')))
    })

    busboy.on('close', () => {
      if (!chuLiGuoWenJian) {
        huiYing(() =>
          shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'meiTiQueShaoWenJian')),
        )
      }
      jieJue()
    })

    qingQiu.pipe(busboy)
  })
})

luYou.delete(
  '/我的/:biaoQingId',
  liaoTianXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    const biaoQingId = String(qingQiu.params.biaoQingId || '')
    if (!yanZhengUUID(biaoQingId)) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
    }
    try {
      const jieGuo = await 数据库.query(BIAO_QING_YU_JU.删除, [biaoQingId, yongHu.yongHuId])
      if (jieGuo.rowCount === 0) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('liaoTian', 'biaoQingBuCunZai'))
      }
      return chengGongXiangYing(xiangYing, { cheng_gong: true, shan_chu_id: biaoQingId })
    } catch (cuoWu) {
      debug日志.error('表情接口', '删除自定义表情失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.put(
  '/我的/排序',
  liaoTianXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    const qingQiuTi = qingQiu.body as Record<string, unknown>
    const yuanShi = qingQiuTi['shunXu'] ?? qingQiuTi['shun_xu']
    if (!Array.isArray(yuanShi) || yuanShi.length === 0) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }
    if (yuanShi.length > BIAO_QING_PEI_ZHI.meiYongHuZuiDaTiaoShu) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
    }
    const idLieBiao = yuanShi.map((xiang) => String(xiang ?? '').trim().toLowerCase())
    if (!idLieBiao.every((id) => yanZhengUUID(id))) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
    }
    if (new Set(idLieBiao).size !== idLieBiao.length) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
    }
    try {
      const dangQian = await 数据库.query(BIAO_QING_YU_JU.本人标识, [yongHu.yongHuId])
      const benRenJi = new Set(
        dangQian.rows.map((hang: Record<string, unknown>) => String(hang['id'])),
      )
      if (
        benRenJi.size !== idLieBiao.length ||
        !idLieBiao.every((id) => benRenJi.has(id))
      ) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('liaoTian', 'biaoQingBuCunZai'))
      }
      await 数据库.query(BIAO_QING_YU_JU.批量改序, [yongHu.yongHuId, idLieBiao])
      const lieBiao = await quBiaoQingLieBiao(yongHu.yongHuId)
      return chengGongXiangYing(xiangYing, { lie_biao: lieBiao, zong_shu: lieBiao.length })
    } catch (cuoWu) {
      debug日志.error('表情接口', '保存表情排序失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

export default luYou
