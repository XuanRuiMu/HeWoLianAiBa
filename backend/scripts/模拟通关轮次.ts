#!/usr/bin/env ts-node
/* eslint-disable no-console */
/**
 * A-3 通关轮次E2E模拟脚本
 * 
 * 使用 mock 评分器驱动全链路：评判→更新好感度（含衰减+保底）→判定胜利(≥800且表白)
 * 500个模拟用户，初始分在[300,500]随机，记录每用户轮数
 * 断言 P50≤40轮、P90≤46轮
 */

import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { 数据库 } from '../src/数据库'
import { redis } from '../src/redis'
import { sheZhiMockTiaoYong } from '../src/utils/DeepSeek客户端'
import { chuShiHuaHaoGanDu, gengXinHaoGanDu } from '../src/services/好感度'
import { pingPanHaoGanDuBianHuaNei } from '../src/services/好感度评判'
import { chuLiYongHuBiaoBai } from '../src/services/胜利失败条件'

const MO_NI_YONG_HU_SHU = 500
const SHENG_LI_FEN = 800
const P50_YUE_SHU = 40
const P90_YUE_SHU = 46
const MAX_LUN_SHU = 100

interface MoNiYongHu {
  yongHuId: string
  jiaoSeId: string
  chuShiFen: number
  lunShu: number
  shengLi: boolean
}

let mockTiaoYongCount = 0

function shengChengSuJiId(): string {
  return randomUUID()
}

function suiJiChuShiFen(): number {
  return Math.floor(Math.random() * (500 - 300 + 1)) + 300
}

function jiSuanP50(lunShuLieBiao: number[]): number {
  const paiXu = [...lunShuLieBiao].sort((a, b) => a - b)
  const index = Math.floor(paiXu.length * 0.5)
  return paiXu[index]
}

function jiSuanP90(lunShuLieBiao: number[]): number {
  const paiXu = [...lunShuLieBiao].sort((a, b) => a - b)
  const index = Math.floor(paiXu.length * 0.9)
  return paiXu[index]
}

async function qingLiMoNiShuJu(yongHuIds: string[]): Promise<void> {
  for (const yongHuId of yongHuIds) {
    await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [yongHuId])
    await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [yongHuId])
    await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [yongHuId])
    await redis.del(`hao_gan_du_zeng_liang:${yongHuId}`)
  }
}

async function main(): Promise<void> {
  console.log('=== A-3 通关轮次E2E模拟开始 ===')
  console.log(`模拟用户数: ${MO_NI_YONG_HU_SHU}`)
  console.log(`胜利分数线: ${SHENG_LI_FEN}`)
  console.log(`P50阈值: ${P50_YUE_SHU}`)
  console.log(`P90阈值: ${P90_YUE_SHU}`)
  console.log('')

  // 设置 mock 评分器
  sheZhiMockTiaoYong(async (canShu) => {
    mockTiaoYongCount++
    const xiaoXi = canShu.xiaoXi
    const yongHuXiaoXiObj = xiaoXi.find((x) => x.jiaoSe === 'user')
    const promptText = typeof yongHuXiaoXiObj?.neiRong === 'string' ? yongHuXiaoXiObj.neiRong : JSON.stringify(yongHuXiaoXiObj?.neiRong)

    // 从 prompt 中提取真实的用户消息（在 "用户消息：" 后面，被 <<<USER_CONTENT_START>>> 和 <<<USER_CONTENT_END>>> 包裹）
    const userMsgMatch = promptText.match(/用户消息：<<<USER_CONTENT_START>>>([\s\S]*?)<<<USER_CONTENT_END>>>/)
    const neiRongStr = userMsgMatch ? userMsgMatch[1] : promptText

    // 保守打分分支：根据关键词判断类型（使用下限+随机上浮，模拟真实评分波动）
    let xin_ren_du_bian_hua = 0
    let qin_mi_du_bian_hua = 0
    let qu_wei_du_bian_hua = 0
    let guan_huai_du_bian_hua = 0

    if (neiRongStr.includes('寒暄') || neiRongStr.includes('你好') || neiRongStr.includes('早安') || neiRongStr.includes('晚安')) {
      // 寒暄 ±3 下限，取 1~4
      const base = 1 + Math.floor(Math.random() * 4)
      xin_ren_du_bian_hua = base
      qin_mi_du_bian_hua = base
      qu_wei_du_bian_hua = base
      guan_huai_du_bian_hua = base
    } else if (neiRongStr.includes('共鸣') || neiRongStr.includes('理解') || neiRongStr.includes('懂我')) {
      // 共鸣 +50下限，取 50~60
      const base = 50 + Math.floor(Math.random() * 11)
      xin_ren_du_bian_hua = base
      qin_mi_du_bian_hua = base
      qu_wei_du_bian_hua = base
      guan_huai_du_bian_hua = base
    } else {
      // 正常 +26下限，取 26~40
      const base = 26 + Math.floor(Math.random() * 15)
      xin_ren_du_bian_hua = base
      qin_mi_du_bian_hua = base
      qu_wei_du_bian_hua = base
      guan_huai_du_bian_hua = base
    }

    return {
      neiRong: JSON.stringify({
        信任度变化: xin_ren_du_bian_hua,
        亲密度变化: qin_mi_du_bian_hua,
        趣味度变化: qu_wei_du_bian_hua,
        关怀度变化: guan_huai_du_bian_hua,
        理由: 'mock评分',
      }),
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {},
    }
  })

  // 创建模拟用户
  const moNiYongHuLieBiao: MoNiYongHu[] = []
  console.log('创建模拟用户...')
  for (let i = 0; i < MO_NI_YONG_HU_SHU; i++) {
    const yongHuId = shengChengSuJiId()
    const jiaoSeId = shengChengSuJiId()
    const chuShiFen = suiJiChuShiFen()

    const miMaHaXi = await bcrypt.hash('mock_password', 10)
    const shouJiHao = `138${String(i).padStart(8, '0')}${String(Date.now()).slice(-4)}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
    const yongHuMing = `模拟用户${i}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    await 数据库.query(
      `INSERT INTO "用户" ("ID", "手机号", "用户名", "密码哈希", "测试", "创建时间", "更新时间")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [yongHuId, shouJiHao, yongHuMing, miMaHaXi, true],
    )

    await 数据库.query(
      `INSERT INTO "角色" ("ID", "用户ID", "名字", "性别", "MBTI", "是否渣型", "对局模式", "创建时间")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [jiaoSeId, yongHuId, `模拟角色${i}`, 'nv', 'INFP', false, 'putong'],
    )

    await chuShiHuaHaoGanDu(yongHuId, jiaoSeId, chuShiFen)

    moNiYongHuLieBiao.push({
      yongHuId,
      jiaoSeId,
      chuShiFen,
      lunShu: 0,
      shengLi: false,
    })

    if ((i + 1) % 100 === 0) {
      console.log(`  已创建 ${i + 1}/${MO_NI_YONG_HU_SHU} 用户`)
    }
  }
  console.log('用户创建完成\n')

  // 运行模拟
  console.log('开始模拟通关...')
  const shengLiLunShu: number[] = []
  let shengLiShu = 0

  for (const yongHu of moNiYongHuLieBiao) {
    let dangQianFen = yongHu.chuShiFen
    let lunShu = 0

    while (dangQianFen < SHENG_LI_FEN && lunShu < MAX_LUN_SHU) {
      lunShu++

      // 模拟用户消息（轮询不同类型以触发不同打分分支）
      let yongHuXiaoXi = '正常聊天内容'
      if (lunShu % 10 === 0) {
        yongHuXiaoXi = '寒暄问候'
      } else if (lunShu % 15 === 0) {
        yongHuXiaoXi = '我们有共鸣，彼此理解'
      }

      // 调用好感度评判（内部会走 mock）
      const pingPanJieGuo = await pingPanHaoGanDuBianHuaNei(
        yongHuXiaoXi,
        '角色回复内容',
        '模拟角色',
        undefined,
        undefined,
        yongHu.yongHuId,
        yongHu.jiaoSeId,
      )

      // 更新好感度（含衰减+保底系数）
      const gengXinJieGuo = await gengXinHaoGanDu(
        yongHu.yongHuId,
        yongHu.jiaoSeId,
        pingPanJieGuo.jieGuo,
        pingPanJieGuo.xiShu,
        pingPanJieGuo.muBiaoQuXian,
        pingPanJieGuo.lianXuWeiDaBiao,
      )

      if (!gengXinJieGuo.cheng_gong || !gengXinJieGuo.hao_gan_du) {
        break
      }

      dangQianFen = gengXinJieGuo.hao_gan_du.zong_fen

      // 检查胜利条件：≥800 且表白
      if (dangQianFen >= SHENG_LI_FEN) {
        const biaoBaiJieGuo = await chuLiYongHuBiaoBai(yongHu.yongHuId, yongHu.jiaoSeId, dangQianFen)
        if (biaoBaiJieGuo && biaoBaiJieGuo.jie_guo_lei_xing === 'sheng_li_ai_qing') {
          yongHu.lunShu = lunShu
          yongHu.shengLi = true
          shengLiLunShu.push(lunShu)
          shengLiShu++
          break
        }
      }
    }

    if (!yongHu.shengLi) {
      yongHu.lunShu = MAX_LUN_SHU
      shengLiLunShu.push(MAX_LUN_SHU)
    }

    if ((shengLiShu + (moNiYongHuLieBiao.indexOf(yongHu) - shengLiShu + 1)) % 50 === 0) {
      console.log(`  进度: ${moNiYongHuLieBiao.indexOf(yongHu) + 1}/${MO_NI_YONG_HU_SHU}`)
    }
  }

  const p50 = jiSuanP50(shengLiLunShu)
  const p90 = jiSuanP90(shengLiLunShu)

  console.log('')
  console.log('=== 模拟结果 ===')
  console.log(`总用户: ${MO_NI_YONG_HU_SHU}`)
  console.log(`通关用户: ${shengLiShu}`)
  console.log(`通关率: ${((shengLiShu / MO_NI_YONG_HU_SHU) * 100).toFixed(1)}%`)
  console.log(`P50轮数: ${p50} (阈值: ${P50_YUE_SHU}) ${p50 <= P50_YUE_SHU ? '✓' : '✗'}`)
  console.log(`P90轮数: ${p90} (阈值: ${P90_YUE_SHU}) ${p90 <= P90_YUE_SHU ? '✓' : '✗'}`)
  console.log(`Mock 调用次数: ${mockTiaoYongCount}`)

  // 清理数据
  console.log('\n清理模拟数据...')
  const yongHuIds = moNiYongHuLieBiao.map((u) => u.yongHuId)
  await qingLiMoNiShuJu(yongHuIds)

  await 数据库.end()
  await redis.quit()

  // 验收判定
  const p50Pass = p50 <= P50_YUE_SHU
  const p90Pass = p90 <= P90_YUE_SHU
  const passRatePass = shengLiShu >= MO_NI_YONG_HU_SHU * 0.8

  if (p50Pass && p90Pass && passRatePass) {
    console.log('\n✓ 所有验收标准通过')
    process.exit(0)
  } else {
    console.log('\n✗ 验收标准未通过')
    if (!p50Pass) console.log(`  - P50: ${p50} > ${P50_YUE_SHU}`)
    if (!p90Pass) console.log(`  - P90: ${p90} > ${P90_YUE_SHU}`)
    if (!passRatePass) console.log(`  - 通关率: ${(shengLiShu / MO_NI_YONG_HU_SHU * 100).toFixed(1)}% < 80%`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('模拟执行失败:', err)
  process.exit(1)
})