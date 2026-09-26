import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('public资源体积清理验证', () => {
  const publicDir = path.resolve(process.cwd(), 'public')

  it('应删除死资源文件', () => {
    const deletedFiles = [
      '_tmp_target.png',
       'models/source.png',
       'models/source_crop.png',
       'verify_v9.html',
       // 非 purple 变体：已被 -purple- 变体取代，无任何引用
      'grass-bg/references/-assets-index-G3tB3Owe.patched.js',
       // FP-08 YH-076：r128 断裂残留全套删除（2021 版与 0.186 不兼容，失败即隐藏背景）
      'three-r128.min.js',
      'GLTFLoader-r128.js',
      'OrbitControls-r128.js',
      'TransformControls-r128.js',
      // FP-08 YH-076：草地调试测试台零引用，删
      'grass-bg/ceshi.html',
    ]

    for (const file of deletedFiles) {
      const filePath = path.join(publicDir, file)
      expect(fs.existsSync(filePath)).toBe(false)
    }
  })

  it('应保留3D首页必需资源', () => {
    const retainedFiles = [
      'grass-bg/draco/draco_decoder.wasm',
      'grass-bg/models/islands/islands-2.glb',
      // 草地引擎本体与样式（grass-bg.html 动态加载，勿删）
      'grass-bg/references/-assets-index-G3tB3Owe-purple.patched.js',
       'grass-bg/references/-assets-index-DF8svE4a.css',
       // 音频静音占位（消除/grass-bg/audio404导致的Core.Resources ERR刷屏）
      'grass-bg/audio/button.mp3',
      'grass-bg/audio/birds.mp3',
      'grass-bg/audio/wind.mp3',
    ]

    for (const file of retainedFiles) {
      const filePath = path.join(publicDir, file)
      expect(fs.existsSync(filePath)).toBe(true)
    }
  })

  it('军师头像应压缩至100KB以下', () => {
    const avatarFiles = [
      '图片/军师头像/军师玄锐暮头像.webp',
      '图片/军师头像/军师测试军师1头像.webp',
      '图片/军师头像/军师测试军师2头像.webp',
    ]

    for (const file of avatarFiles) {
      const filePath = path.join(publicDir, file)
      expect(fs.existsSync(filePath)).toBe(true)
      const stats = fs.statSync(filePath)
      const sizeKB = stats.size / 1024
      expect(sizeKB).toBeLessThan(100)
    }
  })

  it('原PNG头像文件应已删除', () => {
    const originalPngs = [
      '图片/军师头像/军师玄锐暮头像.png',
      '图片/军师头像/军师测试军师1头像.png',
      '图片/军师头像/军师测试军师2头像.png',
    ]

    for (const file of originalPngs) {
      const filePath = path.join(publicDir, file)
      expect(fs.existsSync(filePath)).toBe(false)
    }
  })

  it('public目录总体积应显著下降', () => {
    function getDirSize(dir: string): number {
      let total = 0
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) total += getDirSize(fullPath)
        else total += fs.statSync(fullPath).size
      }
      return total
    }

    const totalSizeMB = getDirSize(publicDir) / 1024 / 1024
    console.log(`public 目录总大小: ${totalSizeMB.toFixed(2)} MB`)
    // 预期清理后应小于 20MB (原约 25MB+)
    expect(totalSizeMB).toBeLessThan(20)
  })
})
