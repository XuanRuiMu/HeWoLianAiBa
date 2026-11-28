'use strict'
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..', '..')
const dir = path.join(root, '测试报告', '真实用户模拟')
const run = process.argv[2] || (() => { try { return JSON.parse(fs.readFileSync(path.join(dir, '总数据.json'), 'utf8')).运行标识 } catch { return null } })()
if (!run) { console.error('找不到运行标识'); process.exit(1) }
let 全局异常 = 0
for (const tag of ['E局', 'I局']) {
  const f = path.join(dir, `${run}-${tag}.json`)
  if (!fs.existsSync(f)) { console.log(`${tag}: 文件不存在`); continue }
  const data = JSON.parse(fs.readFileSync(f, 'utf8'))
  const 轮次 = data.轮次 || []
  let 无回复 = 0, 有模型 = 0, 有耗时 = 0, 有好感 = 0, 有异常 = 0, 有表情 = 0, 多消息 = 0
  for (const r of 轮次) {
    const 回复 = r.AI回复 || []
    if (!Array.isArray(回复) || 回复.length === 0) 无回复++
    if (Array.isArray(回复) && 回复.length > 1) 多消息++
    if (回复.some(x => x.类型 === 'biaoQingBao' || String(x.内容 || '').includes('[表情]'))) 有表情++
    if (Array.isArray(r.模型名列表) && r.模型名列表.length) 有模型++
    if (r.耗时毫秒 != null) 有耗时++
    if (r.好感度 || r.累计变化) 有好感++
    if (r.异常) 有异常++
  }
  全局异常 += 有异常
  console.log(`${tag}: 轮次=${轮次.length} 无回复=${无回复} 多消息轮=${多消息} 有模型名=${有模型} 有耗时=${有耗时} 有好感=${有好感} 含表情=${有表情} 轮级异常=${有异常} 结局=${data.结局 || '无'} 状态=${data.当前状态 || '?'}`)
  if (data.异常) console.log(`  ${tag}局级异常: ${JSON.stringify(data.异常).slice(0, 300)}`)
}
console.log(`总轮级异常=${全局异常}`)
