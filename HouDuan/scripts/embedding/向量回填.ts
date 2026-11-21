import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { 生成向量 } from '../../src/services/嵌入服务'
import { 数据库 } from '../../src/数据库'
import { debug日志 } from '../../src/utils/debug日志'

const muLu = process.env.BIAO_QING_BAO_MU_LU || path.resolve(process.cwd(), '..', '表情包')
const imageExt = new Set(['.png', '.gif', '.jpg', '.jpeg', '.webp'])
const files = fs.readdirSync(muLu).filter((f) => {
  const ext = path.extname(f).toLowerCase()
  return imageExt.has(ext) && fs.existsSync(path.join(muLu, `${path.basename(f, ext)}.json`))
})
let logLine = 0

function 原始输出(message: string): void {
  logLine += 1
  fs.appendFileSync(path.join(os.tmpdir(), 'vector-backfill.log'), `${logLine}: ${message}\n`, 'utf-8')
}

async function main() {
  原始输出(`start total=${files.length}`)
  debug日志.info('向量回填', '总数', { xiang_qing: { total: files.length } })
  let done = 0
  let fail = 0
  for (let i = 0; i < files.length; i += 5) {
    const batch = files.slice(i, i + 5)
    try {
      const texts = batch.map((f) => {
        const j = JSON.parse(fs.readFileSync(path.join(muLu, `${path.basename(f, path.extname(f))}.json`), 'utf-8'))
        return `${j.短名 || path.basename(f, path.extname(f))} ${j.描述 || ''} ${j.情绪标签 || ''} ${j.适用场景 || ''}`
      })
      const vectors = await 生成向量(texts)
      for (let k = 0; k < batch.length; k += 1) {
        const f = batch[k]
        const jie = JSON.stringify(vectors[k])
        const name = path.basename(f, path.extname(f))
        await 确保表情行(f)
        await 数据库.query(
          `UPDATE "系统表情" SET "检索文本" = $2::varchar, "向量" = ($3::text)::vector WHERE "短名" = $1::varchar`,
          [name, texts[k], jie],
        )
        done += 1
      }
    } catch (e) {
      fail += batch.length
      原始输出(`fail ${fail}: ${String(e).slice(0, 400)}`)
      debug日志.error('向量回填', '批次失败', { xiang_qing: { skip: fail, msg: String(e).slice(0, 150) } })
      break
    }
    if ((i / 5) % 20 === 0) debug日志.info('向量回填', '进度', { xiang_qing: { done, index: i, total: files.length } })
  }
  debug日志.info('向量回填', '结束', { xiang_qing: { done, failed: fail } })
  原始输出(`end done=${done} fail=${fail}`)
  process.exit(0)
}

async function 确保表情行(f: string) {
  const name = path.basename(f, path.extname(f))
  const j = JSON.parse(fs.readFileSync(path.join(muLu, `${name}.json`), 'utf-8'))
  await 数据库.query(
    `INSERT INTO "系统表情" ("短名","描述","情绪标签","适用场景","SHA256","MIME","启用")
     SELECT $1::varchar,$2::varchar,$3::varchar,$4::varchar, md5(random()::text),$5::varchar,true
     WHERE NOT EXISTS (SELECT 1 FROM "系统表情" WHERE "短名" = $1::varchar)`,
    [name, j.描述 || '', j.情绪标签 || '', j.适用场景 || '', 'image/' + path.extname(f).slice(1) as string],
  )
}

void main()
