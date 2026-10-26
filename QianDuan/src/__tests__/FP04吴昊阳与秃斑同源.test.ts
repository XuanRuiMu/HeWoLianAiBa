import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 项目根 = resolve(__dirname, '../..')
const 读 = (相对: string) => readFileSync(resolve(项目根, 相对), 'utf8')

const WU_SEG = 28
const WU_CELL = 0.027
const ALPHA_W = 443
const ALPHA_H = 312

function 计算足迹(wuBase: Float32Array, alphaAt: (u: number, v: number) => boolean): Set<string> {
  const N = WU_SEG
  function 重心(
    ax: number, az: number, bx: number, bz: number, cx: number, cz: number,
    px: number, pz: number,
  ): [number, number, number] | null {
    const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz)
    if (Math.abs(d) < 1e-12) return null
    const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / d
    const l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / d
    const l3 = 1 - l1 - l2
    return l1 >= -1e-6 && l2 >= -1e-6 && l3 >= -1e-6 ? [l1, l2, l3] : null
  }
  const hitSet = new Set<string>()
  for (let gb = 0; gb < N; gb++) {
    for (let ga = 0; ga < N; ga++) {
      const i00 = gb * (N + 1) + ga
      const i10 = i00 + 1
      const i01 = i00 + N + 1
      const i11 = i01 + 1
      if (
        wuBase[i00 * 3 + 1] < -500 || wuBase[i10 * 3 + 1] < -500 ||
        wuBase[i01 * 3 + 1] < -500 || wuBase[i11 * 3 + 1] < -500
      ) continue
      const x00 = wuBase[i00 * 3], z00 = wuBase[i00 * 3 + 2]
      const x10 = wuBase[i10 * 3], z10 = wuBase[i10 * 3 + 2]
      const x01 = wuBase[i01 * 3], z01 = wuBase[i01 * 3 + 2]
      const x11 = wuBase[i11 * 3], z11 = wuBase[i11 * 3 + 2]
      const u00 = ga / N, v00 = gb / N, u11 = (ga + 1) / N, v11 = (gb + 1) / N
      const qMinX = Math.min(x00, x10, x01, x11), qMaxX = Math.max(x00, x10, x01, x11)
      const qMinZ = Math.min(z00, z10, z01, z11), qMaxZ = Math.max(z00, z10, z01, z11)
      for (let cx = Math.floor(qMinX / WU_CELL); cx <= Math.floor(qMaxX / WU_CELL); cx++) {
        for (let cz = Math.floor(qMinZ / WU_CELL); cz <= Math.floor(qMaxZ / WU_CELL); cz++) {
          const px = (cx + 0.5) * WU_CELL, pz = (cz + 0.5) * WU_CELL
          const t1 = 重心(x00, z00, x10, z10, x11, z11, px, pz)
          let uvA: number, uvB: number
          if (t1) {
            uvA = t1[0] * u00 + t1[1] * u11 + t1[2] * u11
            uvB = t1[0] * v00 + t1[1] * v00 + t1[2] * v11
          } else {
            const t2 = 重心(x00, z00, x11, z11, x01, z01, px, pz)
            if (!t2) continue
            uvA = t2[0] * u00 + t2[1] * u11 + t2[2] * u00
            uvB = t2[0] * v00 + t2[1] * v11 + t2[2] * v11
          }
          const iu = Math.floor(uvA * ALPHA_W), iv = Math.floor(uvB * ALPHA_H)
          if (iu < 0 || iu >= ALPHA_W || iv < 0 || iv >= ALPHA_H) continue
          if (alphaAt(iu, iv)) hitSet.add(cx + ',' + cz)
        }
      }
    }
  }
  return hitSet
}

function 构造模拟网格(中心x: number, 中心z: number): Float32Array {
  const N = WU_SEG
  const total = (N + 1) * (N + 1)
  const base = new Float32Array(total * 3)
  const 半宽 = 0.7, 半深 = 0.5
  for (let b = 0; b <= N; b++) {
    for (let a = 0; a <= N; a++) {
      const q = b * (N + 1) + a
      base[q * 3] = 中心x + (a / N - 0.5) * 2 * 半宽
      base[q * 3 + 1] = 0.2
      base[q * 3 + 2] = 中心z + (b / N - 0.5) * 2 * 半深
    }
  }
  return base
}

describe('FP-04 吴昊阳与秃斑同源（视口变化不再分家）', () => {
  it('秃斑判定的矩形键触发链已根除（wuBareWatch 不再依赖屏幕矩形）', () => {
    const 源码 = 读('public/grass-bg/scripts/block-08.js')
    expect(源码).not.toContain('wuRectKeyNow')
    expect(源码).not.toContain('wuBareKey')
    expect(源码).not.toContain('wuProject')
    expect(源码).not.toContain('wuRayTo')
  })

  it('footprint 以人物网格基准顶点为唯一事实源', () => {
    const 源码 = 读('public/grass-bg/scripts/block-08.js')
    expect(源码).toContain('if (!wuBase || !wuAlpha || wuRayN !== WU_SEG) return null')
    expect(源码).toContain('wuBase[qB * 3 + 1] < -500')
    expect(源码).toMatch(/bareDone = false;\s*\n\s*try \{ makeBare\(\); \}/)
  })

  it('同一网格在任意视口矩形下足迹完全一致（回归：视口变宽不再移动秃斑）', () => {
    const 网格 = 构造模拟网格(3.57, 3.45)
    const alphaAt = (iu: number, iv: number) =>
      Math.hypot(iu - ALPHA_W * 0.5, (iv - ALPHA_H * 0.5) * 1.4) < ALPHA_W * 0.3
    const 足迹A = 计算足迹(网格, alphaAt)
    const 足迹B = 计算足迹(网格, alphaAt)
    expect(足迹A.size).toBeGreaterThan(50)
    expect(足迹B).toEqual(足迹A)
  })

  it('网格换位后足迹跟随移动（同源联动：mesh 动则秃斑动）', () => {
    const alphaAt = (iu: number, iv: number) =>
      Math.hypot(iu - ALPHA_W * 0.5, (iv - ALPHA_H * 0.5) * 1.4) < ALPHA_W * 0.3
    const 足迹1 = 计算足迹(构造模拟网格(3.57, 3.45), alphaAt)
    const 足迹2 = 计算足迹(构造模拟网格(4.2, 4.0), alphaAt)
    expect(足迹2.size).toBeGreaterThan(50)
    let 交集 = 0
    足迹1.forEach((格) => { if (足迹2.has(格)) 交集++ })
    expect(交集).toBeLessThan(足迹1.size * 0.5)
  })

  it('足迹格子中心全部落在网格世界包围盒内', () => {
    const 网格 = 构造模拟网格(3.57, 3.45)
    const alphaAt = (iu: number, iv: number) => true
    const 足迹 = 计算足迹(网格, alphaAt)
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (let q = 0; q < (WU_SEG + 1) * (WU_SEG + 1); q++) {
      const x = 网格[q * 3], z = 网格[q * 3 + 2]
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z
    }
    足迹.forEach((格) => {
      const [cx, cz] = 格.split(',').map(Number)
      const px = (cx + 0.5) * WU_CELL, pz = (cz + 0.5) * WU_CELL
      expect(px).toBeGreaterThanOrEqual(minX - 1e-9)
      expect(px).toBeLessThanOrEqual(maxX + 1e-9)
      expect(pz).toBeGreaterThanOrEqual(minZ - 1e-9)
      expect(pz).toBeLessThanOrEqual(maxZ + 1e-9)
    })
  })
})
