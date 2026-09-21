import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function duQuDockerfile(): string {
  return fs.readFileSync(path.resolve(process.cwd(), 'Dockerfile'), 'utf-8')
}

describe('FP-08 YH-079 前端 Dockerfile 基座与探活', () => {
  it('brotli 构建阶段基于 nginx 镜像（自带 nginx 二进制）', () => {
    const wenBen = duQuDockerfile()
    expect(wenBen).toMatch(/FROM\s+nginx:1\.27-alpine\s+AS\s+brotli-build/)
    expect(wenBen).not.toMatch(/FROM\s+alpine:3\.19\s+AS\s+brotli-build/)
  })

  it('运行阶段固定 nginx 版本', () => {
    const wenBen = duQuDockerfile()
    expect(wenBen).toMatch(/FROM\s+nginx:1\.27-alpine/)
    expect(wenBen).not.toMatch(/FROM\s+nginx:alpine\s*$/m)
  })

  it('版本取值非空校验且构建后校验配置', () => {
    const wenBen = duQuDockerfile()
    expect(wenBen).toContain('test -n "${NGINX_VERSION}"')
    expect(wenBen).toContain('nginx -t')
  })

  it('非 root 运行并带探活', () => {
    const wenBen = duQuDockerfile()
    expect(wenBen).toContain('USER nginx')
    expect(wenBen).toContain('HEALTHCHECK')
  })
})
