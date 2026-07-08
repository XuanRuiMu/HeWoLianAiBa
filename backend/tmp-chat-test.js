const { io } = require('socket.io-client')

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ5b25nSHVJZCI6IjQ5NjliOTAyLTU2ZjEtNGI4NC04NDJhLTBmNmRkOGQ0MjM0YiIsInNob3VKaUhhbyI6IjEzODAwMTM4MDAyIiwiaWF0IjoxNzgzNDcxMDI5LCJleHAiOjE3ODQwNzU4Mjl9.yw6qgKRA-jsGV1LtU1e9EREjTGWoIlYWhV5RLnYC5WE'
const jiaoSeId = 'a6ca3a81-888f-4886-a4fe-05e150f9b9f8'

const socket = io('http://localhost:3000', {
  path: '/socket.io',
  auth: { token },
  transports: ['websocket'],
})

socket.on('connect', () => {
  console.log('已连接 socket:', socket.id)
  socket.emit('加入聊天', jiaoSeId)
  console.log('已发送 加入聊天')

  setTimeout(() => {
    socket.emit('发送消息')
    console.log('已发送 发送消息 事件')
  }, 1000)
})

socket.on('对方正在输入', (id) => {
  console.log('对方正在输入:', id)
})

socket.on('角色回复', (data) => {
  console.log('角色回复:', JSON.stringify(data, null, 2))
})

socket.on('错误', (err) => {
  console.error('socket 错误:', err)
})

socket.on('disconnect', (reason) => {
  console.log('断开连接:', reason)
})

setTimeout(() => {
  console.log('测试结束，关闭连接')
  socket.close()
  process.exit(0)
}, 30000)
