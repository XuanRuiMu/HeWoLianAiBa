import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { qingLiGeShiXianLieShi, haiYouZiShouZiCountZhi } from '../开场候选约束'

/**
 * 中和模型自编的频率断言（第十二轮实测 P1-③）。
 *
 * 现象（`out_16xing_D_new.json` 实测原文）：
 *   `ESFP/L5`  「那杯奶茶我都提第三次了哦」      —— 实际第 1–2 次
 *   `ESFP/L14` 「我奶茶提了三次烤肉提了两次」  —— 实际是 7 轮与 6 轮
 * 调研结论（imprint-memory / Replica / nocturne_memory）：计数必须由系统维护，
 * 模型自己数就会编。修法在**输出侧**（与 P0-① 同型，已验证有效），
 * 因为本项目反复证明往 prompt 加约束会让 AI 味更重。
 */
describe('自编频率断言中和', () => {
  it('中和：去掉编造的数字，保留语气', () => {
    expect(qingLiGeShiXianLieShi('我奶茶提了三次烤肉提了两次')).toBe('我奶茶提了好几次烤肉提了两次')
    expect(qingLiGeShiXianLieShi('我奶茶提三次都没这排面')).toBe('我奶茶提好几次都没这排面')
    expect(qingLiGeShiXianLieShi('我说了两遍')).toBe('我说了好几遍')
    expect(qingLiGeShiXianLieShi('那杯奶茶我都提第三次了')).toBe('那杯奶茶我都提第好几次了')
  })

  it('不误伤：对「用户」的计数、时间、以及非计数用法', () => {
    expect(qingLiGeShiXianLieShi('我等你三次了')).toBe('我等你三次了')
    expect(qingLiGeShiXianLieShi('我三点睡的')).toBe('我三点睡的')
    expect(qingLiGeShiXianLieShi('你提了三次我都没回')).toBe('你提了三次我都没回')
    expect(qingLiGeShiXianLieShi('我提了这个问题但你不信')).toBe('我提了这个问题但你不信')
  })

  it('不误伤：「说一次/说一句」是正常口语（实测 ENTJ/L23 曾被误伤）', () => {
    expect(qingLiGeShiXianLieShi('那我再说一次，先把头发吹干')).toBe('那我再说一次，先把头发吹干')
    expect(qingLiGeShiXianLieShi('我提一句')).toBe('我提一句')
    expect(qingLiGeShiXianLieShi('我问一句你是几点睡的')).toBe('我问一句你是几点睡的')
  })

  // 说明：本用例的期望值曾经写死成 4，但那条基线是**用与实现不一致的临时脚本**数出来的
  //（临时脚本漏了「我都提第三次了」里的「第」字，也把该豁免的「我再说一次」算进去了）。
  // 实测语料只作回归样本，**命中数不写死** —— 写死等于把脚本 bug 变成契约。
  //
  // ⚠️ 断言必须用**实现同源**的判据（导入生产里的正则），
  // 不能在本文件另抄一份 —— 另抄会与「说一次」豁免逻辑漂移，
  // 把合法的「我再说一次」误判成「中和失败」（实测踩过：ENTJ 那条）。
it('真实语料回归：命中条全部被中和', (ctx) => {
    // ⚠️ 路径必须从本文件位置反推 —— vitest 的 cwd 是 backend/，不是仓库根
    const wen = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../.语料工作区/out_16xing_D_new.json')
    if (!existsSync(wen)) {
      // 第三方语料工作区是 gitignore 的，不在 CI 里，跳过而不是让 CI 红
      ctx.skip()
      return
    }
    const j = JSON.parse(readFileSync(wen, 'utf8')) as {
      suoYouLun: Array<{ mbti: string; lun: number; xiaoXi: string[] }>
    }
    let zhong = 0
    for (const r of j.suoYouLun) {
      for (const t of r.xiaoXi) {
        if (!haiYouZiShouZiCountZhi(t)) continue
        zhong++
        const xin = qingLiGeShiXianLieShi(t)
        expect( haiYouZiShouZiCountZhi(xin), `${r.mbti}/L${r.l} 中和后仍含频率断言：${xin}`,
        ).toBe(false)
      }
    }
    expect(zhong, '该样本应至少命中 1 条，否则说明样本或正则已失效，回归失去意义').toBeGreaterThan(0)
  })
})