import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('viewport meta 标签', () => {
  it('index.html 包含 viewport-fit=cover', () => {
    const indexPath = path.resolve(__dirname, '../../index.html')
    const html = fs.readFileSync(indexPath, 'utf-8')
    expect(html).toContain('viewport-fit=cover')
  })
})
