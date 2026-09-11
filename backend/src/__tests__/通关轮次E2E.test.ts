import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { sheZhiMockTiaoYong } from '../utils/DeepSeek客户端'
import { huoQuWanZhengHaoGanDu, chuShiHuaHaoGanDu, gengXinHaoGanDu, jiSuanShuaiJianBianHua } from '../services/好感度'
import { pingPanHaoGanDuBianHuaNei } from '../services/好感度评判'
import { chuLiYongHuBiaoBai } from '../services/胜利失败条件'
import { jiSuanZongFen } from '../services/好感度'
import { HAO_GAN_DU_PEI_ZHI } from '../config/好感度配置'
import { debug日志 } from '../utils/debug日志'

interface MoNiYongHu {
  yongHuId: string
  jiaoSeId: string
  chuShiFen: number
  lunShu: number
  shengLi: boolean
}

const MO_NI_YONG_HU_SHU = 500
const SHENG_LI_FEN = 800
const P50_YUE_SHU = 40
const P90_YUE_SHU = 46

function shengChengSuJiId(): string {
  return randomUUID()
}

function suiJiChuShiFen(): number {
  return Math.floor(Math.random() * (500 - 300 + 1)) + 300
}

function paiXuShuZu<T>(arr: T[], getVal: (item: T) => number): T[] {
  return [...arr].sort((a, b) => getVal(a) - getVal(b))
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

describe('FP-02 A-3 通关轮次E2E模拟', () => {
  let moNiYongHuLieBiao: MoNiYongHu[] = []
  let mockTiaoYongCount = 0

  beforeAll(async () => {
    // 设置 mock 评分器
    sheZhiMockTiaoYong(async (canShu) => {
      mockTiaoYongCount++
      const xiaoXi = canShu.xiaoXi
      // 从对话历史中提取用户消息（通常是第2条，role为user）
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

      const mockResponse = {
        信任度变化: xin_ren_du_bian_hua,
        亲密度变化: qin_mi_du_bian_hua,
        趣味度变化: qu_wei_du_bian_hua,
        关怀度变化: guan_huai_du_bian_hua,
        理由: 'mock评分',
      }

      // 调试：前3次调用打印
      if (mockTiaoYongCount <= 3) {
        console.log(`Mock调用#${mockTiaoYongCount}:`, { neiRongStr: neiRongStr.slice(0, 50), mockResponse })
      }

      return {
        neiRong: JSON.stringify(mockResponse),
        xinXi: { role: 'assistant', content: '' },
        yuanShuJu: {},
      }
    })

    // 创建 500 个模拟用户
    for (let i = 0; i < MO_NI_YONG_HU_SHU; i++) {
      const yongHuId = shengChengSuJiId()
      const jiaoSeId = shengChengSuJiId()
      const chuShiFen = suiJiChuShiFen()

      // 直接在数据库创建用户、角色和初始好感度
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
    }
  }, 120000)

  afterAll(async () => {
    sheZhiMockTiaoYong(null)
    const yongHuIds = moNiYongHuLieBiao.map((u) => u.yongHuId)
    await qingLiMoNiShuJu(yongHuIds)
    await 数据库.end()
    await redis.quit()
  }, 120000)

  it('500用户模拟通关 → P50≤40轮 且 P90≤46轮', async () => {
    const shengLiLunShu: number[] = []
    let shengLiShu = 0
    // 用户之间相互独立，分片并发模拟以压缩墙钟耗时；每用户内部仍严格串行推进
    const BING_FA_SHU = 10

    async function moNiDanYongHu(yongHu: MoNiYongHu): Promise<void> {
      let dangQianFen = yongHu.chuShiFen
      let lunShu = 0
      const maxLunShu = 100 // 防止无限循环

      while (dangQianFen < SHENG_LI_FEN && lunShu < maxLunShu) {
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
          // 模拟用户表白
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

      // 如果未在 maxLunShu 内通关，记录 maxLunShu
      if (!yongHu.shengLi) {
        yongHu.lunShu = maxLunShu
        shengLiLunShu.push(maxLunShu)
      }
    }

    for (let i = 0; i < moNiYongHuLieBiao.length; i += BING_FA_SHU) {
      const fenPian = moNiYongHuLieBiao.slice(i, i + BING_FA_SHU)
      await Promise.all(fenPian.map((yongHu) => moNiDanYongHu(yongHu)))
    }

    const p50 = jiSuanP50(shengLiLunShu)
    const p90 = jiSuanP90(shengLiLunShu)

    console.log(`模拟完成：总用户=${MO_NI_YONG_HU_SHU}，通关=${shengLiShu}，P50=${p50}，P90=${p90}`)
    console.log(`Mock 调用次数: ${mockTiaoYongCount}`)

    // 验收标准断言
    expect(p50).toBeLessThanOrEqual(P50_YUE_SHU)
    expect(p90).toBeLessThanOrEqual(P90_YUE_SHU)
    expect(shengLiShu).toBeGreaterThan(MO_NI_YONG_HU_SHU * 0.8) // 至少 80% 通关
  }, 600000)
})