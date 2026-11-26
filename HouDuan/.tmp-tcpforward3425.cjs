const net = require('net')
const src = net.createServer((c) => {
  const d = net.connect(3425, '127.0.0.1')
  c.pipe(d).pipe(c)
  c.on('error', () => d.destroy())
  d.on('error', () => c.destroy())
})
src.listen(3426, '0.0.0.0', () => console.log('forwarder 0.0.0.0:3426 -> 127.0.0.1:3425'))
