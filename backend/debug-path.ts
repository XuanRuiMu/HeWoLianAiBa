import express from 'express'
import request from 'supertest'

const app = express()
app.use(express.json())
app.use((req, _res, next) => {
  req.url = decodeURI(req.url)
  next()
})
app.use((req, _res, next) => {
  console.log('url:', req.url)
  console.log('path:', req.path)
  console.log('decoded path:', decodeURIComponent(req.path))
  next()
})
app.post('/api/聊天/会话/:id/消息', (_req, res) => res.send('ok'))

async function main() {
  const res1 = await request(app).post('/api/聊天/会话/123/消息').send({})
  console.log('decoded path status', res1.status)
  const res2 = await request(app).post('/api/%E8%81%8A%E5%A4%A9/%E4%BC%9A%E8%AF%9D/123/%E6%B6%88%E6%81%AF').send({})
  console.log('encoded path status', res2.status)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
