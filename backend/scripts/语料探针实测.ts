/**
 * 第 2 步：全场景病灶普查 —— 探针实测。
 *
 * ⚠️ 这个文件上一版**被别的 agent 删掉了**（交接文档警告过：另有 agent 在同改这批文件）。
 *   本版重建，并把两条硬性要求写进代码而不是写在注释里：
 *     ① 人设必须**快照**后才能做受控对照（只固定 Math.random 无效：shengChengJiaoSe 有随机抽样）；
 *     ② 探针抽样必须**跨会话**——本项目矩阵层面已保证，这里只负责按顺序取用。
 *
 * 用法：
 *   export DEEPSEEK_API_KEY=... DEEPSEEK_BASE_URL=.../v1 DEEPSEEK_MODEL=deepseek-flash
 *   node -r ts-node/register/transpile-only scripts/语料探针实测.ts <场景|all> [每场景条数]
 *
 * 环境：
 *   TAN_ZHEN_JIAO_SE_WEN_JIAN  人设快照文件（受控对照用，强烈建议设）
 *   TAN_ZHEN_HOU_ZHUI           记录文件名后缀
 *   TAN_ZHEN_JIE_DUAN           阶段覆盖
 */
/* eslint-disable no-console -- CLI脚本console为唯一输出通道 */

// ── 先装 Redis 挡板：Director → 重试队列 → src/redis 会在**模块加载时**就 new Redis 连本地，
//    探针不读写缓存，连不上只会污染日志甚至抛未捕获异常。挡板必须在任何业务 import 之前装好。
const Module = require('module') as { _load: (...a: unknown[]) => unknown }
const 原Load = Module._load
const 假Redis = new Proxy(
  {},
  {
    get: (_t, jian) => {
      if (jian === 'then') return undefined
      return async () => (jian === 'llen' ? 0 : undefined)
    },
  },
)
Module._load = function (qingQiu: unknown, ...qiTa: unknown[]) {
  const s = String(qingQiu)
  if (s === '../redis' || s.endsWith('/src/redis') || s === './redis') {
    return { redis: 假Redis, jieXiRedisLianJie: () => ({}) }
  }
  return (原Load as (...a: unknown[]) => unknown).call(this, qingQiu, ...qiTa)
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { shengChengJiaoSe } from '../src/services/角色生成'
import { shengChengDirectorCeLue } from '../src/services/Director'
import { shengChengWriterHuiFu } from '../src/services/Writer'
import { gouJianJiaoSeShangXiaWen } from '../src/config/AI参数策略'
import type { MBTILeiXing } from '../src/config/角色配置'
import type { DuiHuaLiShiXiang } from '../src/types'

const 根目录 = 'D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/语料实验室'
const 矩阵目录 = join(根目录, '语料矩阵')
const 记录目录 = join(根目录, '实测记录')
mkdirSync(记录目录, { recursive: true })

interface TiaoJian {
  mbti: MBTILeiXing
  xingBie: 'nan' | 'nv'
  jieDuan: string
  zongFen: number
  changJing: string
}
const 场景条件: Record<string, TiaoJian> = JSON.parse(
  readFileSync(join(矩阵目录, '场景条件.json'), 'utf8'),
)

const 场景参数 = process.argv[2]
const 原始数量 = Number(process.argv[3] || '99')
const 数量 = Number.isFinite(原始数量) && 原始数量 > 0 ? Math.floor(原始数量) : 99
/**
 * MBTI 覆盖：做**同场景跨型对照**用（人设层特性缺陷只能靠这个测出来——
 * 「只有特定型有」的缺陷，单型跑是看不见的）。
 * 用法：TAN_ZHEN_MBTI=INTJ 跑同一批探针，换型再跑一遍，比对行为类别是否分化。
 */
const 人设覆盖 = (process.env.TAN_ZHEN_MBTI || '').trim() as MBTILeiXing | ''
const 记录后缀 = (process.env.TAN_ZHEN_HOU_ZHUI || '').trim()
const 阶段覆盖 = (process.env.TAN_ZHEN_JIE_DUAN || '').trim()
const 人设快照文件 = (process.env.TAN_ZHEN_JIAO_SE_WEN_JIAN || '').trim()

if (!场景参数 || (场景参数 !== 'all' && !场景条件[场景参数])) {
  console.error('用法: scripts/语料探针实测.ts <场景|all> [每场景条数]')
  console.error('可用场景:', Object.keys(场景条件).join(', '))
  process.exit(1)
}
if (!人设快照文件) {
  console.warn('⚠️ 未设 TAN_ZHEN_JIAO_SE_WEN_JIAN：人设逐条重新生成，跨批次不可比')
}

const 目标场景 = 场景参数 === 'all' ? Object.keys(场景条件) : [场景参数]

/** 人设快照：受控对照的唯一凭据。按「场景+下标」存，命中时校验型号性别，不匹配直接抛错。 */
let 人设快照: Record<string, unknown> = {}
if (人设快照文件 && existsSync(人设快照文件)) {
  人设快照 = JSON.parse(readFileSync(人设快照文件, 'utf8')) as Record<string, unknown>
  console.log(`已载入人设快照 ${Object.keys(人设快照).length} 份：${人设快照文件}`)
}
function quRenShe(jian: string, tiaoJian: TiaoJian): unknown {
  const 已有 = 人设快照[jian]
  if (已有) {
    const j = 已有 as { mbti_lei_xing?: string; xing_bie?: string }
    if (j.mbti_lei_xing !== tiaoJian.mbti || j.xing_bie !== tiaoJian.xingBie) {
      throw new Error(
        `人设快照[${jian}] 是 ${j.mbti_lei_xing}/${j.xing_bie}，本场景要求 ` +
          `${tiaoJian.mbti}/${tiaoJian.xingBie}。换快照文件，否则对照张冠李戴。`,
      )
    }
    return 已有
  }
  const jiaoSe = shengChengJiaoSe({
    yong_hu_id: 'yu-liao',
    mbti_lei_xing: tiaoJian.mbti,
    xing_bie: tiaoJian.xingBie,
  })
  if (人设快照文件) {
    人设快照[jian] = jiaoSe
    writeFileSync(人设快照文件, JSON.stringify(人设快照, null, 1), 'utf8')
  }
  return jiaoSe
}

const JIE_DUAN_FEN: Record<string, number> = {
  lengDan: 40, shuYuan: 150, renShi: 250, shuXi: 350, pengYou: 450,
  haoYou: 550, aiMei: 650, xinDong: 750, reLian: 850, shenAi: 950,
}

/**
 * ⚠️ 主动降速比被动退避快得多。
 *   实测：不主动 sleep 时几乎每次调用都撞 TPM，退避 45s+30s+30s ⇒ 单条探针 2.5 分钟；
 *   每次调用前主动 sleep `JIAN_GE` 毫秒后，限流触发率显著下降，总耗时降到约 1/4。
 *   原理：等它拒绝你（45s 起）不如自己把速率压在阈值下（十几秒）。
 */
const JIAN_GE = Number(process.env.TAN_ZHEN_JIAN_GE || '12000')
async function xiuMian(haoMiao: number) {
  await new Promise((r) => setTimeout(r, haoMiao))
}

async function daiTuiBi<T>(dongZuo: () => Promise<T>, 最多次数 = 4): Promise<T> {
  for (let ci = 0; ; ci++) {
    if (ci === 0) await xiuMian(JIAN_GE)
    try {
      return await dongZuo()
    } catch (e) {
      const xin = String(e)
      if (!/429|rpm|tpm|rate|limit/i.test(xin) || ci >= 最多次数 - 1) throw e
      const deng = 20000 + ci * 20000
      console.log(`  ⟳ 限流，${deng / 1000}s 后重试（第 ${ci + 2} 次）`)
      await new Promise((r) => setTimeout(r, deng))
    }
  }
}

/** 去重键必须编码，不能字符串相加：("ab","c") 与 ("a","bc") 会撞键。 */
function zhenRenJian(chuFa: unknown, zhenRen: unknown): string {
  return JSON.stringify([chuFa, zhenRen])
}

async function main() {
  for (const 场景 of 目标场景) {
    const tiaoJian0 = 人设覆盖 ? { ...场景条件[场景], mbti: 人设覆盖 } : 场景条件[场景]
    const tiaoJian: TiaoJian = 阶段覆盖
      ? { ...tiaoJian0, jieDuan: 阶段覆盖, zongFen: JIE_DUAN_FEN[阶段覆盖] ?? tiaoJian0.zongFen }
      : tiaoJian0
    const 探针: Array<Record<string, unknown>> = JSON.parse(
      readFileSync(join(矩阵目录, `探针集_${场景}.json`), 'utf8'),
    )
    const 取用 = 探针.slice(0, 数量)

    const 记录文件 = join(记录目录, `${场景}_${tiaoJian.mbti}${记录后缀}.jsonl`)
    const 已有 = existsSync(记录文件)
      ? readFileSync(记录文件, 'utf8').split('\n').filter(Boolean)
      : []
    // ⚠️ 只把**成功**的记录算作已测。第一版把失败记录（429 / 空输出）也算进去，
    //   结果补跑时全部被判「已测，跳过」，4 条失败的探针永远补不回来。
    //   失败记录仍然留在文件里（留痕），但不占用去重键。
    const 已测键 = new Set(
      已有.map((l) => {
        try {
          const r = JSON.parse(l) as Record<string, unknown>
          if (r.报错 || !r.AI合并) return ''
          return zhenRenJian(r.触发输入, r.真人原文)
        } catch {
          return ''
        }
      }),
    )

    console.log(
      `\n=== ${场景}｜人设 ${tiaoJian.mbti}/${tiaoJian.xingBie}｜阶段 ${tiaoJian.jieDuan}｜计划 ${取用.length} 条 ===`,
    )
    const 追加行: string[] = []
    for (const [下标, p] of 取用.entries()) {
      const 键 = zhenRenJian(p.触发输入, p.真人原文)
      if (已测键.has(键)) {
        console.log(`· ${p.探针号} 已测，跳过`)
        continue
      }
      const jian = `${场景}#${下标}`
      const jiaoSe = quRenShe(jian, tiaoJian) as never
      const shangXiaWen = { jiaoSe: gouJianJiaoSeShangXiaWen(jiaoSe) }
      const liShi: DuiHuaLiShiXiang[] = ((p.前文 as string[]) || []).map((hang, i) => {
        const 是用户 = hang.startsWith('A: ')
        return {
          fa_song_zhe_lei_xing: 是用户 ? 'yonghu' : 'jiaose',
          fa_song_zhe_ming: 是用户 ? '对方' : '微信名',
          nei_rong: hang.replace(/^[AB]: /, ''),
          shi_jian: `21:${String(Math.min(59, 57 + i * 2)).padStart(2, '0')}`,
        } as DuiHuaLiShiXiang
      })
      const shuRu = {
        yong_hu_id: 'yu-liao',
        jiao_se_id: `tan-zhen-${场景}`,
        jiao_se: jiaoSe,
        hao_gan_du: {
          xin_ren_du: Math.round(tiaoJian.zongFen * 0.35),
          qin_mi_du: Math.round(tiaoJian.zongFen * 0.25),
          qu_wei_du: Math.round(tiaoJian.zongFen * 0.2),
          guan_huai_du: Math.round(tiaoJian.zongFen * 0.2),
          zong_fen: tiaoJian.zongFen,
          guan_xi_jie_duan: tiaoJian.jieDuan,
        },
        dui_hua_li_shi: liShi,
        yong_hu_xin_xiao_xi: p.触发输入,
        shi_fou_di_yi_lun: liShi.length === 0,
        tu_pian_shou_quan: false,
        shi_jian_chang_jing: tiaoJian.changJing,
      } as never

      const t0 = Date.now()
      let 报错: string | null = null
      let shuChu: string[] = []
      let daoYan: unknown = null
      try {
        const dao = await daiTuiBi(() => shengChengDirectorCeLue(shuRu, shangXiaWen))
        daoYan = dao.ce_lue
        if (dao.ce_lue.shi_fou_hui_fu === false) {
          报错 = 'DIRECTOR_NO_REPLY'
        } else {
          const r = await daiTuiBi(() => shengChengWriterHuiFu(shuRu, dao.ce_lue, shangXiaWen))
          shuChu = r.xiao_xi_lie_biao
          if (!shuChu || shuChu.length === 0) 报错 = 'WRITER_EMPTY_OUTPUT'
        }
      } catch (e) {
        报错 = String(e)
      }
      const 世 = (jiaoSe as unknown as { shi_jie_xin_xi?: Record<string, unknown> }).shi_jie_xin_xi || {}
      const 记录 = {
        探针号: p.探针号,
        场景,
        模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
        人设快照: 人设快照文件 ? `${人设快照文件}#${jian}` : '未设(逐条重新生成)',
        人设摘要: [
          (jiaoSe as unknown as { shen_fen?: string }).shen_fen,
          String((jiaoSe as unknown as { nian_ling?: number }).nian_ling ?? ''),
          String(世.cheng_shi ?? ''),
          String(世.nian_ji ?? ''),
          String(世.gong_zuo_zhuang_tai ?? ''),
        ].join('/'),
        条件: tiaoJian,
        触发输入: p.触发输入,
        真人行为类别: p.真人行为类别,
        真人原文: p.真人原文,
        前文: p.前文,
        AI输出: shuChu,
        AI合并: shuChu.join(' / '),
        导演策略: daoYan,
        毫秒: Date.now() - t0,
        报错,
      }
      追加行.push(JSON.stringify(记录))
      console.log(`[${下标 + 1}/${取用.length}] ${p.探针号} ${((Date.now() - t0) / 1000).toFixed(1)}s`)
      console.log(`  A(用户): ${p.触发输入}`)
      console.log(`  真人  : ${p.真人原文}   [${p.真人行为类别}]`)
      console.log(`  AI    : ${shuChu.length ? shuChu.join(' / ') : '（无输出）'}${报错 ? `  ⚠️${报错}` : ''}`)
    }
    if (追加行.length) {
      writeFileSync(记录文件, [...已有, ...追加行].join('\n') + '\n', 'utf8')
      console.log(`记录已写入 ${记录文件}（+${追加行.length}）`)
    }
  }
  process.exit(0)
}

main().catch((e) => {
  console.error('实测失败:', e)
  process.exit(1)
})
