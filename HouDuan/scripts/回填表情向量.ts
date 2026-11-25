import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { 数据库 } from '../src/数据库'
import { 生成向量, 重置向量缓存 } from '../src/services/嵌入服务'

process.env.BIAO_QING_LOCAL_MODEL_PATH = process.env.BIAO_QING_LOCAL_MODEL_PATH || path.resolve(process.cwd(), '.models')

interface 标注 {
  短名?: string
  描述?: string
  情绪标签?: string
  适用场景?: string
  启用?: boolean
  来源?: string
}

const MIME映射: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

function quMuLu(): string {
  const huanJing = (process.env.BIAO_QING_BAO_MU_LU || '').trim()
  if (huanJing !== '') return path.resolve(huanJing)
  const guiFan = path.resolve(process.cwd(), '..', '表情包')
  return guiFan
}

function duBiaoZhu(muLu: string, duanMing: string): 标注 | null {
  const jsonLuJing = path.join(muLu, `${duanMing}.json`)
  if (!fs.existsSync(jsonLuJing)) return null
  try {
    return JSON.parse(fs.readFileSync(jsonLuJing, 'utf-8')) as 标注
  } catch {
    return null
  }
}

function jianDuan(wenBen: string, zuiDa: number): string {
  const zi = Array.from(String(wenBen || '').trim())
  return zi.length <= zuiDa ? zi.join('') : zi.slice(0, zuiDa).join('')
}

function suanSha256(luJing: string): string {
  const huanChong = fs.readFileSync(luJing)
  return createHash('sha256').update(huanChong).digest('hex').toLowerCase()
}

interface 条目 {
  duanMing: string
  miaoShu: string
  qingXu: string
  changJing: string
  jianSuo: string
  sha256: string
  mime: string
  laiYuan: string
  qiYong: boolean
}

async function zhu(): Promise<void> {
  const muLu = quMuLu()
  if (!fs.existsSync(muLu)) throw new Error(`表情包目录不存在: ${muLu}`)
  const wenJianLieBiao = fs
    .readdirSync(muLu, { withFileTypes: true })
    .filter((xiang) => xiang.isFile())
    .map((xiang) => xiang.name)
  const tuPianLieBiao = wenJianLieBiao.filter((ming) => /\.(png|jpg|jpeg|gif|webp)$/i.test(ming))
  process.stdout.write(`目录: ${muLu}\n图片数: ${tuPianLieBiao.length}\n`)

  const daiChuLi: 条目[] = []
  let tiaoGuo = 0
  for (const wenJianMing of tuPianLieBiao) {
    const duanMing = wenJianMing.replace(/\.[^.]+$/, '').trim()
    if (!duanMing || duanMing.length > 30) {
      tiaoGuo += 1
      continue
    }
    const biaoZhu = duBiaoZhu(muLu, duanMing)
    if (!biaoZhu) {
      tiaoGuo += 1
      continue
    }
    const kuoZhan = path.extname(wenJianMing).toLowerCase()
    const mime = MIME映射[kuoZhan] || 'image/png'
    let sha256 = ''
    try {
      sha256 = suanSha256(path.join(muLu, wenJianMing))
    } catch {
      tiaoGuo += 1
      continue
    }
    const miaoShu = jianDuan(biaoZhu.描述 || '', 120)
    const qingXu = jianDuan(biaoZhu.情绪标签 || '待打标', 20)
    const changJing = jianDuan(biaoZhu.适用场景 || '', 120)
    daiChuLi.push({
      duanMing,
      miaoShu,
      qingXu,
      changJing,
      jianSuo: `${duanMing} ${miaoShu} ${qingXu} ${changJing}`.trim(),
      sha256,
      mime,
      laiYuan: jianDuan(biaoZhu.来源 || '本地表情包库', 120),
      qiYong: biaoZhu.启用 !== false,
    })
  }

  process.stdout.write(`待处理: ${daiChuLi.length} 跳过: ${tiaoGuo}\n`)
  let yiXie = 0
  let shiBai = 0
  let youXiangLiang = 0
  const piLiang = 24

  for (let qi = 0; qi < daiChuLi.length; qi += piLiang) {
    const pi = daiChuLi.slice(qi, qi + piLiang)
    let xiangLiangLieBiao: number[][] = []
    try {
      xiangLiangLieBiao = await 生成向量(pi.map((xiang) => xiang.jianSuo))
    } catch (cuoWu) {
      process.stdout.write(`向量生成失败，本批仅同步表字段: ${String(cuoWu).slice(0, 160)}\n`)
      xiangLiangLieBiao = []
    }
    for (let xuHao = 0; xuHao < pi.length; xuHao += 1) {
      const xiang = pi[xuHao]
      const xiangLiang = xiangLiangLieBiao[xuHao]
      const youLiang = Array.isArray(xiangLiang) && xiangLiang.length === 512
      try {
        if (youLiang) {
          await 数据库.query(
            `INSERT INTO "系统表情" ("短名", "描述", "情绪标签", "适用场景", "SHA256", "MIME", "来源", "启用", "检索文本", "向量")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector)
             ON CONFLICT ("短名") DO UPDATE SET
               "描述" = EXCLUDED."描述",
               "情绪标签" = EXCLUDED."情绪标签",
               "适用场景" = EXCLUDED."适用场景",
               "SHA256" = EXCLUDED."SHA256",
               "MIME" = EXCLUDED."MIME",
               "来源" = EXCLUDED."来源",
               "启用" = EXCLUDED."启用",
               "检索文本" = EXCLUDED."检索文本",
               "向量" = EXCLUDED."向量"`,
            [xiang.duanMing, xiang.miaoShu, xiang.qingXu, xiang.changJing, xiang.sha256, xiang.mime, xiang.laiYuan, xiang.qiYong, xiang.jianSuo, JSON.stringify(xiangLiang)],
          )
          youXiangLiang += 1
        } else {
          await 数据库.query(
            `INSERT INTO "系统表情" ("短名", "描述", "情绪标签", "适用场景", "SHA256", "MIME", "来源", "启用", "检索文本")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT ("短名") DO UPDATE SET
               "描述" = EXCLUDED."描述",
               "情绪标签" = EXCLUDED."情绪标签",
               "适用场景" = EXCLUDED."适用场景",
               "SHA256" = EXCLUDED."SHA256",
               "MIME" = EXCLUDED."MIME",
               "来源" = EXCLUDED."来源",
               "启用" = EXCLUDED."启用",
               "检索文本" = EXCLUDED."检索文本"`,
            [xiang.duanMing, xiang.miaoShu, xiang.qingXu, xiang.changJing, xiang.sha256, xiang.mime, xiang.laiYuan, xiang.qiYong, xiang.jianSuo],
          )
        }
        yiXie += 1
      } catch (cuoWu) {
        shiBai += 1
        if (shiBai <= 5) process.stdout.write(`写库失败 ${xiang.duanMing}: ${String(cuoWu).slice(0, 160)}\n`)
      }
    }
    if ((qi + piLiang) % 240 === 0 || qi + piLiang >= daiChuLi.length) {
      process.stdout.write(`进度 ${Math.min(qi + piLiang, daiChuLi.length)}/${daiChuLi.length} 写入${yiXie} 含向量${youXiangLiang} 失败${shiBai}\n`)
    }
  }

  重置向量缓存()
  const tongJi = await 数据库.query(
    `SELECT count(*)::int AS zong, count(*) FILTER (WHERE "向量" IS NOT NULL)::int AS you_xiang_liang, count(*) FILTER (WHERE "检索文本" <> '')::int AS you_jian_suo, count(*) FILTER (WHERE "启用")::int AS qi_yong FROM "系统表情"`,
  )
  process.stdout.write(`完成: 写入${yiXie} 含向量${youXiangLiang} 失败${shiBai}\n`)
  process.stdout.write(`库统计: ${JSON.stringify(tongJi.rows[0])}\n`)
  await (数据库 as unknown as { end?: () => Promise<void> }).end?.()
}

zhu().catch((cuoWu) => {
  process.stderr.write(`执行失败: ${String(cuoWu)}\n`)
  process.exitCode = 1
})
