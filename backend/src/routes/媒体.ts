import { debug日志 } from '../utils/debug日志'
import { Router } from 'express'
import type { Request, Response } from 'express'
import fs from 'fs'
import { huoQuFanYi } from '../config/translations'
import { shiBaiXiangYing } from '../utils/xiangying'
import { 数据库 } from '../数据库'
import { huoQuBenDiLuJing, yanZhengQianMing } from '../services/媒体存储'

const luYou = Router()

luYou.get('/:sha256', async (qingQiu: Request, xiangYing: Response) => {
  const sha256 = String(qingQiu.params.sha256 || '')
  const eCanShu = qingQiu.query.e
  const sCanShu = qingQiu.query.s

  if (!yanZhengQianMing(sha256, eCanShu, sCanShu)) {
    return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('liaoTian', 'qianMingWuXiao'))
  }

  try {
    const di = sha256.toLowerCase()
    const luJing = huoQuBenDiLuJing(di)
    if (!luJing) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('liaoTian', 'qianMingWuXiao'))
    }

    const chaXun = await 数据库.query(
      `SELECT "MIME", "原始文件名", "类别" FROM "媒体文件" WHERE "SHA256" = $1 LIMIT 1`,
      [di],
    )
    if (chaXun.rows.length === 0) {
      return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('liaoTian', 'meiTiBuCunZai'))
    }

    let wenJianCunZai = false
    try {
      wenJianCunZai = (await fs.promises.stat(luJing)).isFile()
    } catch {
      wenJianCunZai = false
    }
    if (!wenJianCunZai) {
      return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('liaoTian', 'meiTiBuCunZai'))
    }

    // 低危顺手项：wenjian 类下载强制附件形式，防止内联渲染 HTML/SVG 类内容
    if (String(chaXun.rows[0].类别 || '') === 'wenjian') {
      const anQuanWenJianMing = String(chaXun.rows[0].原始文件名 || 'download')
        .replace(/[\r\n"\\]/g, '_')
      xiangYing.setHeader('Content-Disposition', `attachment; filename="${anQuanWenJianMing}"`)
      xiangYing.setHeader('X-Content-Type-Options', 'nosniff')
    }

    // 关闭 send 自带的 ETag/Cache-Control/Last-Modified，改用内容哈希作为强校验器
    xiangYing.setHeader('ETag', `"${di}"`)
    xiangYing.setHeader('Cache-Control', 'private, max-age=31536000, immutable')
    xiangYing.type(String(chaXun.rows[0].MIME))
    return xiangYing.sendFile(luJing, {
      etag: false,
      cacheControl: false,
      lastModified: false,
      dotfiles: 'deny',
    }, (cuoWu) => {
      if (cuoWu && !xiangYing.headersSent) {
        shiBaiXiangYing(xiangYing, 404, huoQuFanYi('liaoTian', 'meiTiBuCunZai'))
        return
      }
      if (cuoWu) {
        xiangYing.end()
      }
    })
  } catch (cuoWu) {
    debug日志.error('媒体下载', '媒体下载失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

export default luYou
