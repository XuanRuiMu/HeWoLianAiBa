/**
 * 第 6 步长程实测：固定人设连续对聊 N 轮，看人格是否衰减、是否退回无 persona 基线。
 *
 * ⚠️ 本文件上一版被别的 agent 删掉了，现重建。
 * 用户台词取自语料矩阵各场景探针的 A 侧原句（轮换使用），保证输入是真实语料形态。
 *
 * 用法：
 *   node -r ts-node/register/transpile-only scripts/长程实测.ts [轮数] [型1,型2,...]
 * 环境：DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL / DEEPSEEK_MODEL、TAN_ZHEN_HOU_ZHUI
 */
/* eslint-disable no-console -- CLI脚本console为唯一输出通道 */

// 先装 Redis 挡板（同 语料探针实测.ts：Director→重试队列→src/redis 模块级连接）
const Module = require('module') as { _load: (...a: unknown[]) => unknown }
const 原Load = Module._load
const 假Redis = new Proxy({}, {
  get: (_t, jian) => (jian === 'then' ? undefined : async () => (jian === 'llen' ? 0 : undefined)),
})
Module._load = function (qingQiu: unknown, ...qiTa: unknown[]) {
  const s = String(qingQiu)
  if (s === '../redis' || s.endsWith('/src/redis') || s === './redis') {
    return { redis: 假Redis, jieXiRedisLianJie: () => ({}) }
  }
  return (原Load as (...a: unknown[]) => unknown).call(this, qingQiu, ...qiTa)
}

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { shengChengJiaoSe } from '../src/services/角色生成'
import { shengChengDirectorCeLue } from '../src/services/Director'
import { shengChengWriterHuiFu } from '../src/services/Writer'
import { gouJianJiaoSeShangXiaWen } from '../src/config/AI参数策略'
import type { MBTILeiXing } from '../src/config/角色配置'
import type { DuiHuaLiShiXiang } from '../src/types'

const 根目录 = 'D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/语料实验室'
const 记录目录 = join(根目录, '实测记录')
mkdirSync(记录目录, { recursive: true })

const 原始轮数 = Number(process.argv[2] || '20')
const 轮数 = Number.isFinite(原始轮数) && 原始轮数 > 0 ? Math.floor(原始轮数) : 20
const 型号列表 = (process.argv[3] || 'ENTP,ESFP,INTJ').split(',').filter(Boolean) as MBTILeiXing[]

const 阶段 = 'pengYou'
const zongFen = 450
const 记录后缀 = (process.env.TAN_ZHEN_HOU_ZHUI || '').trim()

// 台词池：全部探针的 A 侧原句
const 台词池: string[] = []
const 矩阵目录 = join(根目录, '语料矩阵')
for (const f of readdirSync(矩阵目录).filter((x) => x.startsWith('探针集_'))) {
  for (const p of JSON.parse(readFileSync(join(矩阵目录, f), 'utf8')) as Array<{ 触发输入: string }>) {
    if ([...p.触发输入].length <= 100) 台词池.push(p.触发输入)
  }
}
console.log(`台词池 ${台词池.length} 句`)

async function daiTuiBi<T>(dongZuo: () => Promise<T>, 最多次数 = 4): Promise<T> {
  for (let ci = 0; ; ci++) {
    try {
      return await dongZuo()
    } catch (e) {
      const xin = String(e)
      if (!/429|rpm|tpm|rate|limit/i.test(xin) || ci >= 最多次数 - 1) throw e
      const deng = 45000 + ci * 30000
      console.log(`  ⟳ 限流，${deng / 1000}s 后重试`)
      await new Promise((r) => setTimeout(r, deng))
    }
  }
}

async function main() {
  for (const 型 of 型号列表) {
    const jiaoSe = shengChengJiaoSe({ yong_hu_id: 'chang-cheng', mbti_lei_xing: 型, xing_bie: 'nan' }) as never
    const shangXiaWen = { jiaoSe: gouJianJiaoSeShangXiaWen(jiaoSe) }
    const 姓名 = (jiaoSe as unknown as { wei_xin_ming: string }).wei_xin_ming
    const liShi: DuiHuaLiShiXiang[] = []
    const 轮记录: unknown[] = []
    console.log(`\n=== 长程实测：${型}（${姓名}）× ${轮数} 轮 ===`)
    let 分 = 57
    for (let lun = 1; lun <= 轮数; lun++) {
      const 用户句 = 台词池[(lun * 7) % 台词池.length]
      const shuRu = {
        yong_hu_id: 'chang-cheng',
        jiao_se_id: `chang-cheng-${型}`,
        jiao_se: jiaoSe,
        hao_gan_du: { xin_ren_du: 158, qin_mi_du: 113, qu_wei_du: 90, guan_huai_du: 90, zong_fen: zongFen, guan_xi_jie_duan: 阶段 },
        dui_hua_li_shi: [...liShi],
        yong_hu_xin_xiao_xi: 用户句,
        shi_fou_di_yi_lun: lun === 1,
        tu_pian_shou_quan: false,
        shi_jian_chang_jing: '晚上，随手聊',
      } as never
      let shuChu: string[] = []
      let 报错: string | null = null
      try {
        const daoYan = await daiTuiBi(() => shengChengDirectorCeLue(shuRu as never, shangXiaWen))
        if (daoYan.ce_lue.shi_fou_hui_fu !== false) {
          const r = await daiTuiBi(() => shengChengWriterHuiFu(shuRu, daoYan.ce_lue, shangXiaWen))
          shuChu = r.xiao_xi_lie_biao
          // ⚠️ 空输出必须记账，否则下游按「有报错」过滤会把它当有效轮，分母被灌水
          if (!shuChu || shuChu.length === 0) 报错 = 'WRITER_EMPTY_OUTPUT'
        } else {
          报错 = 'DIRECTOR_NO_REPLY'
        }
      } catch (e) {
        报错 = String(e)
      }
      const shiJian = `21:${String(Math.min(59, 分)).padStart(2, '0')}`
      分 += 2
      if (shuChu.length) {
        liShi.push({ fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: 用户句, shi_jian: shiJian } as DuiHuaLiShiXiang)
        liShi.push({ fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: 姓名, nei_rong: shuChu.join('\n'), shi_jian: shiJian } as DuiHuaLiShiXiang)
      }
      轮记录.push({
        轮: lun, 模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash', 阶段, 人设: 型, 昵称: 姓名,
        用户: 用户句, AI: shuChu, 合并: shuChu.join(' / '), 报错,
      })
      console.log(`[${lun}] 用户「${用户句.slice(0, 24)}」→ ${shuChu.join(' / ')}${报错 ? ` ⚠️${报错.slice(0, 60)}` : ''}`)
    }
    const 文件 = join(记录目录, `长程_${型}${记录后缀}.jsonl`)
    writeFileSync(文件, 轮记录.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8')
    console.log(`已写入 ${文件}`)
  }
  process.exit(0)
}

main().catch((e) => { console.error('长程实测失败:', e); process.exit(1) })
