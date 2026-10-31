import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const 配置 = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../BuShu/nginx.conf'), 'utf8')

describe('nginx 生产配置', () => {
  it('静态根目录指向部署产物', () => {
    expect(配置).toContain('root /opt/lianaiba/QianDuan/dist;')
  })

  it('API 与 WebSocket 反代到本机后端', () => {
    expect(配置).toContain('proxy_pass http://127.0.0.1:3000;')
    expect(配置).toContain('location /socket.io/')
  })

  it('入口不缓存，哈希资源长缓存', () => {
    expect(配置).toContain('no-store, no-cache, must-revalidate, max-age=0')
    expect(配置).toContain('public, max-age=31536000, immutable')
  })

  it('保留限流与上传体积设置', () => {
    expect(配置).toContain('limit_req zone=api_zheng_chang burst=20 nodelay;')
    expect(配置).toContain('client_max_body_size 60m;')
  })

  it('拒绝访问点文件', () => {
    expect(配置).toContain('location ~ /\\. {')
    expect(配置).toContain('deny all;')
  })
})
