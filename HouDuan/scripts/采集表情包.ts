import { createHash } from 'crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { execFileSync } from 'child_process'
import '../src/config/env'
import { 数据库 } from '../src/数据库'
import { huoQuBenDiLuJing } from '../src/services/媒体存储'

async function huoQuWangLuoHuanChong(url: string): Promise<Buffer> {
  try {
    const xiangYing = await fetch(url, { headers: { 'User-Agent': 'lianai-ba-collector' } })
    if (!xiangYing.ok) throw new Error(`HTTP ${xiangYing.status}`)
    return Buffer.from(await xiangYing.arrayBuffer())
  } catch {
    return execFileSync(
      'curl',
      ['-s', '-L', '--max-time', '60', '-A', 'lianai-ba-collector', url],
      { maxBuffer: 32 * 1024 * 1024, timeout: 70000 },
    )
  }
}

const CANG_KU = 'zhaoolee/ChineseBQB'
const FEN_ZHI = 'master'
const YUAN = 'ChineseBQB(zhaoolee, GitHub)'
const MEI_MU_LU_XIAN_ZHI = Number(huoQuCanShuShuZi('--meimulu', '3'))
const ZONG_SHU_XIAN_ZHI = Number(huoQuCanShuShuZi('--zongshu', '150'))

function huoQuCanShuShuZi(ming: string, moRen: string): string {
  return huoQuCanShu(ming, moRen)
}
const ZUI_DA_ZI_JIE: Record<string, number> = { '.jpg': 500 * 1024, '.jpeg': 500 * 1024, '.png': 500 * 1024, '.gif': 1500 * 1024 }

const MU_LU_BIAO_QIAN: Record<string, string> = {
  '001Funny_滑稽大佬😏BQB': '好笑',
  '002CuteGirl_可爱的女孩纸👧BQB': '卖萌',
  '003CuteBoy_可爱男孩纸👶BQB': '卖萌',
  '004SmirkBoy_假笑男孩👦BQB': '无语',
  '005ShowerheadBoy_莲蓬头男孩👲BQB': '无语',
  '006Hamster_仓鼠🐹BQB': '卖萌',
  '007Tiger_胖虎🐯BQB': '好笑',
  '008HappyDuck_开心鸭🐥BQB': '庆祝',
  '009KumamotoBear_熊本熊🐻BQB': '卖萌',
  '010Cat_是喵星人啦🐱BQB': '卖萌',
  '011Dog_狗🐶BQB': '卖萌',
  '012Parrot_鹦鹉🐦BQB': '好笑',
  '013PigPecs_小猪佩奇👑BQB': '卖萌',
  '014Pig_猪🐖BQB': '好笑',
  '015Golden_Curator_Panda金馆长熊猫🐼BQB': '好笑',
  '016spray_喷雾🚿BQB': '无语',
  '017Playing_演奏🎻BQB': '破冰',
  '018WangEgg_汪蛋🥚BQB': '好笑',
  '019Green_Hat绿帽子🖼BQB': '无语',
  '020TATANBQB': '好笑',
  '021TongfuInn_同福客栈🏫BQB': '好笑',
  '022SuDaqiang_苏大强👴BQB': '无语',
  '023Emoji_表情符号BQB': '好笑',
  '024Programmer_程序员BQB': '无语',
  '025SuperHeroes_超级英雄们👤BQB': '破冰',
  '026Chicken_小幺鸡🐔BQB': '好笑',
}

const DA_BIAO_MEI_PI_SHU = 10

function huoQuCanShu(ming: string, moRen: string): string {
  const suoYin = process.argv.indexOf(ming)
  return suoYin >= 0 && process.argv[suoYin + 1] ? process.argv[suoYin + 1] : moRen
}

interface ShuXing {
  path: string
  size?: number
}

async function laQuMuLu(): Promise<ShuXing[]> {
  const huanChong = await huoQuWangLuoHuanChong(`https://api.github.com/repos/${CANG_KU}/git/trees/${FEN_ZHI}?recursive=1`)
  const shuJu = JSON.parse(huanChong.toString('utf-8')) as { tree?: ShuXing[]; truncated?: boolean }
  if (!shuJu.tree) throw new Error('目录拉取失败：响应无 tree')
  return shuJu.tree.filter((xiang) => xiang.type === 'blob')
}

function guoLvTuPian(blobs: ShuXing[]): ShuXing[] {
  return blobs.filter((xiang) => {
    const houZhui = resolveHouZhui(xiang.path)
    if (!houZhui) return false
    const daXiao = xiang.size ?? 0
    if (daXiao <= 0 || daXiao > (ZUI_DA_ZI_JIE[houZhui] ?? 0)) return false
    const muLu = xiang.path.split('/')[0]
    return Boolean(MU_LU_BIAO_QIAN[muLu])
  })
}

function resolveHouZhui(luJing: string): string | null {
  const dian = luJing.toLowerCase().lastIndexOf('.')
  if (dian < 0) return null
  const houZhui = luJing.slice(dian)
  return houZhui in ZUI_DA_ZI_JIE ? houZhui : null
}

async function caiJi(): Promise<void> {
  const blobs = guoLvTuPian(await laQuMuLu())
  const anMuLu = new Map<string, ShuXing[]>()
  for (const xiang of blobs) {
    const muLu = xiang.path.split('/')[0]
    const lieBiao = anMuLu.get(muLu) ?? []
    lieBiao.push(xiang)
    anMuLu.set(muLu, lieBiao)
  }
  const yiYou = await 数据库.query(`SELECT COUNT(*)::int AS shu FROM "系统表情" WHERE "来源" = $1`, [YUAN])
  let yiXia = Number(yiYou.rows[0]?.shu ?? 0)
  const xuHaoQi = Number(yiYou.rows[0]?.shu ?? 0)

  for (const [muLu, lieBiao] of anMuLu) {
    if (yiXia >= ZONG_SHU_XIAN_ZHI) break
    const biaoQian = MU_LU_BIAO_QIAN[muLu] ?? '待打标'
    const paiXu = lieBiao.slice().sort((a, b) => (a.path > b.path ? 1 : -1))
    let muLuJiShu = 0
    for (const xiang of paiXu) {
      if (muLuJiShu >= MEI_MU_LU_XIAN_ZHI || yiXia >= ZONG_SHU_XIAN_ZHI) break
      const houZhui = resolveHouZhui(xiang.path)
      if (!houZhui) continue
      let huanChong: Buffer
      try {
        huanChong = await huoQuWangLuoHuanChong(`https://raw.githubusercontent.com/${CANG_KU}/${FEN_ZHI}/${encodeURI(xiang.path)}`)
      } catch {
        continue
      }
      if (huanChong.length === 0 || huanChong.length > (ZUI_DA_ZI_JIE[houZhui] ?? 0)) continue
      const sha256 = createHash('sha256').update(huanChong).digest('hex').toLowerCase()
      const luJing = huoQuBenDiLuJing(sha256)
      if (!luJing) continue
      if (!existsSync(luJing)) {
        mkdirSync(dirname(luJing), { recursive: true })
        writeFileSync(luJing, huanChong)
      }
      const mime = houZhui === '.png' ? 'image/png' : houZhui === '.gif' ? 'image/gif' : 'image/jpeg'
      const duanMing = `bqb${String(xuHaoQi + yiXia + 1).padStart(4, '0')}`
      await 数据库.query(
        `INSERT INTO "系统表情" ("短名", "描述", "情绪标签", "适用场景", "SHA256", "MIME", "来源")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT ("短名") DO NOTHING`,
        [duanMing, '', biaoQian, '', sha256, mime, YUAN],
      )
      yiXia += 1
      muLuJiShu += 1
    }
  }
  const zuiZhong = await 数据库.query(`SELECT COUNT(*)::int AS shu FROM "系统表情" WHERE "来源" = $1`, [YUAN])
  process.stdout.write(`采集完成：来源累计 ${zuiZhong.rows[0]?.shu ?? 0} 张\n`)
}

interface DaBiaoJieGuo {
  duanMing: string
  miaoShu: string
  qingXuBiaoQian: string
  shiYongChangJing: string
}

const YUN_XU_BIAO_QIAN = new Set(['好笑', '感动', '无语', '赞同', '撒娇', '安慰', '庆祝', '破冰', '告别', '卖萌', '生气', '委屈'])

function jieXiDaBiao(neiRong: string): DaBiaoJieGuo | null {
  const piPei = neiRong.trim().match(/\{[\s\S]*\}/)
  if (!piPei) return null
  try {
    const shuJu = JSON.parse(piPei[0]) as Record<string, unknown>
    const duanMing = String(shuJu['短名'] ?? '').trim()
    const miaoShu = String(shuJu['描述'] ?? '').trim().slice(0, 60)
    const qingXuBiaoQian = String(shuJu['情绪标签'] ?? '').trim()
    const shiYongChangJing = String(shuJu['适用场景'] ?? '').trim().slice(0, 60)
    if (!duanMing || !miaoShu || !YUN_XU_BIAO_QIAN.has(qingXuBiaoQian)) return null
    return { duanMing: duanMing.slice(0, 12), miaoShu, qingXuBiaoQian, shiYongChangJing }
  } catch {
    return null
  }
}

async function daBiao(): Promise<void> {
  const daiDaBiao = await 数据库.query(
    `SELECT "ID", "短名", "SHA256", "MIME" FROM "系统表情" WHERE "描述" = '' AND "启用" = TRUE ORDER BY "创建时间" LIMIT $1`,
    [DA_BIAO_MEI_PI_SHU],
  )
  const { genJuPeiZhiTiaoYong } = await import('../src/utils/DeepSeek客户端')
  for (const hang of daiDaBiao.rows as Array<Record<string, unknown>>) {
    const sha256 = String(hang.SHA256).toLowerCase()
    const luJing = huoQuBenDiLuJing(sha256)
    if (!luJing || !existsSync(luJing)) continue
    const huanChong = readFileSync(luJing)
    const mime = String(hang.MIME || 'image/png')
    try {
      const xiangYing = await genJuPeiZhiTiaoYong('TuPianShenHe', [
        {
          jiaoSe: 'user',
          neiRong: [
            {
              type: 'input_text',
              text: [
                '你在为中文表情包库打标。看这张表情包，输出 JSON：',
                '{"短名":"2到6个字的称呼，如 笑哭、狗头、无语猫", "描述":"一句话说明画面内容，20字内", "情绪标签":"好笑|感动|无语|赞同|撒娇|安慰|庆祝|破冰|告别|卖萌|生气|委屈 之一", "适用场景":"什么时候发，20字内"}',
                '只输出 JSON。',
              ].join('\n'),
            },
            { type: 'input_image', image_url: `data:${mime};base64,${huanChong.toString('base64')}`, detail: 'low' },
          ] as never,
        },
      ])
      const jieGuo = jieXiDaBiao(xiangYing.neiRong)
      if (!jieGuo) continue
      const duanMing = jieGuo.duanMing
      const zhanYong = await 数据库.query(`SELECT 1 FROM "系统表情" WHERE "短名" = $1 AND "ID" <> $2 LIMIT 1`, [duanMing, hang.ID])
      const zuiZhongDuanMing = zhanYong.rows.length > 0 ? String(hang.短名) : duanMing
      await 数据库.query(
        `UPDATE "系统表情" SET "短名" = $1, "描述" = $2, "情绪标签" = $3, "适用场景" = $4 WHERE "ID" = $5`,
        [zuiZhongDuanMing, jieGuo.miaoShu, jieGuo.qingXuBiaoQian, jieGuo.shiYongChangJing, hang.ID],
      )
    } catch (cuoWu) {
      process.stdout.write(`打标失败 ${String(hang.短名)}: ${String(cuoWu).slice(0, 120)}\n`)
    }
  }
  const wanCheng = await 数据库.query(`SELECT COUNT(*)::int AS shu FROM "系统表情" WHERE "描述" <> ''`)
  process.stdout.write(`打标完成：已有描述 ${wanCheng.rows[0]?.shu ?? 0} 张\n`)
}

async function zhuRu(): Promise<void> {
  const jieDuan = huoQuCanShu('--jieduan', 'caiji')
  if (jieDuan === 'caiji') await caiJi()
  else if (jieDuan === 'dabiao') await daBiao()
  else throw new Error(`未知阶段 ${jieDuan}，支持 caiji / dabiao`)
  await (数据库 as unknown as { end?: () => Promise<void> }).end?.()
}

zhuRu().catch((cuoWu) => {
  process.stderr.write(`执行失败: ${String(cuoWu)}\n`)
  process.exitCode = 1
})
