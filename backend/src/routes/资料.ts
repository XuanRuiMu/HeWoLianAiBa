import { Router } from 'express'
import type { Response } from 'express'
import Busboy from 'busboy'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { debug日志 } from '../utils/debug日志'
import { liaoTianXianLiu } from '../middleware/限流'
import type { RenZhengQingQiu } from '../middleware/认证'
import { 数据库 } from '../数据库'
import { yanZhengUUID } from '../utils/验证'
import {
  KE_JIAN_XING_LIE_BIAO,
  shiHeFaKeJianXing,
  panDuanKeJian,
  chaXunShiHaoYou,
  duQuQianMingKeJianXinXi,
  type KeJianXing,
} from '../services/可见性'
import { shenHeNeiRongAnQuan } from '../services/安全审核'
import {
  liuShiBaoCunMeiTi,
  MeiTiCunChuCuoWu,
  shengChengQianMingURL,
} from '../services/媒体存储'
import {
  chaXunZhangHaoFengJin,
  jiLuZhangHaoWeiGui,
  tiJiaoShenSu,
} from '../services/账号封禁'
import { 获取IP } from '../services/IP封禁'

const luYou = Router()

/** 真实违规图片类别（审核服务自身不可用不计为用户违规） */
const TU_PIAN_WEI_GUI_LEI_BIE = new Set([
  '涉政有害',
  '淫秽色情',
  '暴力恐怖',
  '邪教',
  '赌博诈骗',
  '侵害未成年人',
  'tuPianWeiGui',
])

/** 签名长度上限（用户口径：500字以内，按 Unicode 码点计数，emoji 计1字） */
const QIAN_MING_ZUI_DA_ZI_FU = 500
/** 白名单人数上限（防滥用） */
const BAI_MING_DAN_ZUI_DA_REN_SHU = 200
/** 头像文件上限2MB（前端已裁剪为1024×1024，此处为服务端硬上限） */
const TOU_XIANG_ZUI_DA_ZI_JIE = 2 * 1024 * 1024
/** 头像允许的 MIME（前端 canvas 统一输出以下格式，各种源图均可选取） */
const TOU_XIANG_MIME_BAI_MING_DAN = new Set(['image/jpeg', 'image/png', 'image/webp'])
/** 头像签名 URL 有效期10年（内容哈希寻址、不可变，换头像即换地址，天然防陈旧缓存） */
const TOU_XIANG_QIAN_MING_YOU_XIAO_MIAO = 10 * 365 * 24 * 3600

function quZiFuChuan(body: Record<string, unknown>, ...jians: string[]): string {
  for (const jian of jians) {
    if (typeof body[jian] === 'string') return body[jian] as string
  }
  return ''
}

/** 校验白名单：数组、长度、UUID 格式、用户存在性 */
async function yanZhengBaiMingDan(zhi: unknown): Promise<{ he_fa: boolean; lie_biao: string[] }> {
  if (!Array.isArray(zhi)) return { he_fa: false, lie_biao: [] }
  const quChong = [...new Set(zhi.filter((x) => typeof x === 'string'))] as string[]
  if (quChong.length > BAI_MING_DAN_ZUI_DA_REN_SHU) return { he_fa: false, lie_biao: [] }
  if (!quChong.every((id) => yanZhengUUID(id))) return { he_fa: false, lie_biao: [] }
  if (quChong.length === 0) return { he_fa: true, lie_biao: [] }
  const cunZai = await 数据库.query(
    `SELECT COUNT(*) AS shu FROM "用户" WHERE "ID" = ANY($1::uuid[])`,
    [quChong],
  )
  if (Number(cunZai.rows[0]?.shu || 0) !== quChong.length) return { he_fa: false, lie_biao: [] }
  return { he_fa: true, lie_biao: quChong }
}

luYou.put('/签名', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  // 任务3：封禁中禁止修改签名（防绕过），申诉走下方专属入口
  const qianMingFengJin = await chaXunZhangHaoFengJin(yongHu.yongHuId)
  if (qianMingFengJin.beiFengJin) {
    return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('anQuan', 'zhangHaoYiBeiFengJin'))
  }
  const body = qingQiu.body as Record<string, unknown>
  const qianMing = quZiFuChuan(body, 'qianMing', 'qian_ming').trim()
  if (Array.from(qianMing).length > QIAN_MING_ZUI_DA_ZI_FU) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('ziLiao', 'qianMingTaiChang'))
  }
  const keJianXingRaw = quZiFuChuan(body, 'keJianXing', 'ke_jian_xing') || 'gong_kai'
  if (!shiHeFaKeJianXing(keJianXingRaw)) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('ziLiao', 'keJianXingFeiFa'))
  }
  const keJianXing: KeJianXing = keJianXingRaw
  let baiMingDan: string[] = []
  if (keJianXing === 'jin_bu_fen_ren') {
    const raw = (body['baiMingDan'] ?? body['bai_ming_dan']) as unknown
    try {
      const yanZheng = await yanZhengBaiMingDan(raw)
      if (!yanZheng.he_fa) {
        return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('ziLiao', 'baiMingDanFeiFa'))
      }
      baiMingDan = yanZheng.lie_biao.filter((id) => id !== yongHu.yongHuId)
    } catch (cuoWu) {
      debug日志.error('资料接口', '校验签名白名单失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  }
  try {
    if (qianMing) {
      const shenHe = await shenHeNeiRongAnQuan(qianMing)
      if (shenHe.wei_gui && shenHe.lei_xing === '审核服务不可用') {
        return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
      }
      if (shenHe.wei_gui) {
        await jiLuZhangHaoWeiGui({
          yongHuId: yongHu.yongHuId,
          ip: 获取IP(qingQiu),
          yuanYin: shenHe.li_you || shenHe.lei_xing || '签名违规',
          leiXing: '签名',
        })
        return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('ziLiao', 'qianMingHanWeiGui'))
      }
    }
    await 数据库.query(
      `UPDATE "用户" SET "签名" = $1, "签名可见性" = $2, "签名白名单" = $3::uuid[], "更新时间" = NOW() WHERE "ID" = $4`,
      [qianMing || null, keJianXing, baiMingDan, yongHu.yongHuId],
    )
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('资料接口', '保存签名失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.put('/签名白名单', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const body = qingQiu.body as Record<string, unknown>
  try {
    const yanZheng = await yanZhengBaiMingDan(body['baiMingDan'] ?? body['bai_ming_dan'])
    if (!yanZheng.he_fa) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('ziLiao', 'baiMingDanFeiFa'))
    }
    const lieBiao = yanZheng.lie_biao.filter((id) => id !== yongHu.yongHuId)
    await 数据库.query(`UPDATE "用户" SET "签名白名单" = $1::uuid[], "更新时间" = NOW() WHERE "ID" = $2`, [
      lieBiao,
      yongHu.yongHuId,
    ])
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('资料接口', '保存签名白名单失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/头像', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  // 任务3：封禁中禁止更换头像
  const touXiangFengJin = await chaXunZhangHaoFengJin(yongHu.yongHuId)
  if (touXiangFengJin.beiFengJin) {
    return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('anQuan', 'zhangHaoYiBeiFengJin'))
  }
  const contentType = String(qingQiu.headers['content-type'] || '')
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('ziLiao', 'touXiangQueShaoWenJian'))
  }
  await new Promise<void>((jieJue) => {
    let yiXiangYing = false
    let chuLiGuoWenJian = false
    const huiYing = (fn: () => void) => {
      if (yiXiangYing) return
      yiXiangYing = true
      fn()
    }
    const busboy = Busboy({ headers: qingQiu.headers, defParamCharset: 'utf8', limits: { files: 1, fileSize: TOU_XIANG_ZUI_DA_ZI_JIE } })
    busboy.on('file', (_fieldMing, wenJianLiu, xinXi) => {
      if (yiXiangYing || chuLiGuoWenJian) {
        wenJianLiu.resume()
        return
      }
      chuLiGuoWenJian = true
      const mime = String(xinXi.mimeType || '').split(';')[0].trim().toLowerCase()
      if (!TOU_XIANG_MIME_BAI_MING_DAN.has(mime)) {
        wenJianLiu.resume()
        huiYing(() => shiBaiXiangYing(xiangYing, 400, huoQuFanYi('ziLiao', 'touXiangGeShiCuoWu')))
        return
      }
      liuShiBaoCunMeiTi(wenJianLiu, xinXi.filename || 'touxiang', mime, 'tupian', yongHu.yongHuId)
        .then((jieGuo) => {
          if (jieGuo.daXiao > TOU_XIANG_ZUI_DA_ZI_JIE) {
            huiYing(() => shiBaiXiangYing(xiangYing, 400, huoQuFanYi('ziLiao', 'touXiangTaiDa')))
            return
          }
          const touXiangURL = shengChengQianMingURL(jieGuo.sha256, TOU_XIANG_QIAN_MING_YOU_XIAO_MIAO)
          数据库.query(`UPDATE "用户" SET "头像" = $1, "更新时间" = NOW() WHERE "ID" = $2`, [touXiangURL, yongHu.yongHuId])
            .then(() => {
              huiYing(() => chengGongXiangYing(xiangYing, { tou_xiang: touXiangURL }))
            })
            .catch((cuoWu) => {
              debug日志.error('资料接口', '保存头像地址失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
              huiYing(() => shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu')))
            })
        })
        .catch(async (cuoWu) => {
          if (cuoWu instanceof MeiTiCunChuCuoWu) {
            // 任务3：真实违规图片记账号违规一次（文件已在存储层销毁，等同撤回）
            if (TU_PIAN_WEI_GUI_LEI_BIE.has(String(cuoWu.fanYiJian))) {
              await jiLuZhangHaoWeiGui({
                yongHuId: yongHu.yongHuId,
                ip: 获取IP(qingQiu),
                yuanYin: String(cuoWu.fanYiJian),
                leiXing: '头像',
              })
              huiYing(() => shiBaiXiangYing(xiangYing, 403, huoQuFanYi('ziLiao', 'touXiangHanWeiGui')))
              return
            }
            huiYing(() => shiBaiXiangYing(xiangYing, 403, huoQuFanYi('ziLiao', 'touXiangShangChuanShiBai')))
            return
          }
          debug日志.error('资料接口', '头像上传失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
          huiYing(() => shiBaiXiangYing(xiangYing, 500, huoQuFanYi('ziLiao', 'touXiangShangChuanShiBai')))
        })
        .finally(() => {
          if (!wenJianLiu.readableEnded) wenJianLiu.resume()
        })
    })
    busboy.on('error', (cuoWu) => {
      debug日志.error('资料接口', '头像解析失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      huiYing(() => shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa')))
    })
    busboy.on('close', () => {
      if (!chuLiGuoWenJian) {
        huiYing(() => shiBaiXiangYing(xiangYing, 400, huoQuFanYi('ziLiao', 'touXiangQueShaoWenJian')))
      }
      jieJue()
    })
    qingQiu.pipe(busboy)
  })
})

/** 微信式个人名片：手机号永不返回；签名按可见性“类”过滤 */
luYou.get('/名片/:userId', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const muBiaoId = String(qingQiu.params.userId || '')
  if (!yanZhengUUID(muBiaoId)) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  try {
    const jiChu = await 数据库.query(
      `SELECT "ID", "用户名", "昵称", "头像" FROM "用户" WHERE "ID" = $1 LIMIT 1`,
      [muBiaoId],
    )
    if (!jiChu.rows.length) return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('ziLiao', 'mingPianBuCunZai'))
    const hang = jiChu.rows[0] as Record<string, unknown>
    const shiZiJi = muBiaoId === yongHu.yongHuId
    const shiHaoYou = shiZiJi ? true : await chaXunShiHaoYou(yongHu.yongHuId, muBiaoId)
    const xinXi = await duQuQianMingKeJianXinXi(muBiaoId)
    let qianMing: string | null = null
    if (xinXi && xinXi.qianMing) {
      if (
        panDuanKeJian(xinXi.keJianXing, {
          chaKanZheId: yongHu.yongHuId,
          yongYouZheId: muBiaoId,
          shiHaoYou,
          baiMingDan: xinXi.baiMingDan,
        })
      ) {
        qianMing = xinXi.qianMing
      }
    }
    return chengGongXiangYing(xiangYing, {
      id: String(hang['ID']),
      yong_hu_ming: hang['用户名'] ? String(hang['用户名']) : null,
      ni_cheng: hang['昵称'] ? String(hang['昵称']) : null,
      tou_xiang: hang['头像'] ? String(hang['头像']) : null,
      qian_ming: qianMing,
      shi_hao_you: shiHaoYou,
      shi_zi_ji: shiZiJi,
    })
  } catch (cuoWu) {
    debug日志.error('资料接口', '查询名片失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

/** 任务3：账号封禁状态查询（封禁中也可查，用于展示解封时间与申诉入口） */
luYou.get('/封禁状态', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  try {
    const zhuangTai = await chaXunZhangHaoFengJin(yongHu.yongHuId)
    return chengGongXiangYing(xiangYing, {
      bei_feng_jin: zhuangTai.beiFengJin,
      ji_bie: zhuangTai.jiBie,
      wei_gui_ci_shu: zhuangTai.weiGuiCiShu,
      jie_feng_shi_jian: zhuangTai.jieFengShiJian ? zhuangTai.jieFengShiJian.toISOString() : null,
      shen_su_zhuang_tai: zhuangTai.shenSuZhuangTai,
    })
  } catch (cuoWu) {
    debug日志.error('资料接口', '查询封禁状态失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

/** 任务3：被封禁用户提交申诉（未封禁或空理由拒绝） */
luYou.post('/申诉', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const body = qingQiu.body as Record<string, unknown>
  const liYou = quZiFuChuan(body, 'liYou', 'li_you')
  if (!liYou.trim()) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
  }
  try {
    const jieGuo = await tiJiaoShenSu(yongHu.yongHuId, liYou)
    if (!jieGuo.cheng_gong) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
    }
    return chengGongXiangYing(xiangYing, { cheng_gong: true }, huoQuFanYi('ziLiao', 'shenSuYiTiJiao'))
  } catch (cuoWu) {
    debug日志.error('资料接口', '提交申诉失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

export { KE_JIAN_XING_LIE_BIAO }
export default luYou
