'use strict'

const crypto = require('node:crypto')

function 生成幂等键(运行标识, 局标识, 轮次, 会话标识) {
  const 来源 = `${运行标识}|${局标识}|${会话标识 || ''}|${轮次}`
  const 摘要 = crypto.createHash('sha256').update(来源, 'utf8').digest()
  const 字节 = 摘要.subarray(0, 16)
  字节[6] = (字节[6] & 0x0f) | 0x40
  字节[8] = (字节[8] & 0x3f) | 0x80
  const 十六 = 字节.toString('hex')
  return `${十六.slice(0, 8)}-${十六.slice(8, 12)}-${十六.slice(12, 16)}-${十六.slice(16, 20)}-${十六.slice(20, 32)}`
}

function 校验回显(发送正文, 上条序号, 响应) {
  const 回显正文 = String(响应?.data?.shu_ju?.nei_rong || 响应?.数据?.shu_ju?.nei_rong || '')
  const 回显序号 = Number(响应?.data?.shu_ju?.ke_hu_duan_xu_hao ?? 响应?.数据?.shu_ju?.ke_hu_duan_xu_hao ?? -1)
  const 消息ID = String(响应?.data?.shu_ju?.id || 响应?.数据?.shu_ju?.id || '')
  return {
    一致: 回显正文 === 发送正文 && 回显序号 > 上条序号,
    回显正文,
    回显序号,
    消息ID,
  }
}

module.exports = { 生成幂等键, 校验回显 }
