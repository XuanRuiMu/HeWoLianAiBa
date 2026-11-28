'use strict'

const fs = require('node:fs')
const path = require('node:path')

const 后端根 = path.resolve(__dirname, '..')
const 项目根 = path.resolve(后端根, '..')
const 数据目录 = path.join(项目根, '测试报告', '真实用户模拟')
const 运行标识 = (process.argv[2] || '20261128-085845').trim()
const 数据来源 = path.join(数据目录, `${运行标识}-E局.json`)
const 日志来源 = path.join(数据目录, `${运行标识}-完整模型日志.txt`)
const 报告路径 = path.join(数据目录, '真实对话报告.html')

function 转义(值) {
  return String(值 ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function 读JSON(文件) {
  try {
    return JSON.parse(fs.readFileSync(文件, 'utf8'))
  } catch {
    return null
  }
}

function 美化(值) {
  if (值 == null) return ''
  if (typeof 值 === 'string') return 值
  try {
    return JSON.stringify(值, null, 2)
  } catch {
    return String(值)
  }
}

function 折叠文本(标题, 内容, 上限) {
  if (内容 == null || String(内容).trim() === '') return `<div class="无">${转义(标题)}：未记录</div>`
  const 文 = String(内容)
  const 长 = 文.length
  const 裁 = 上限 && 长 > 上限
  const 显示 = 裁 ? 文.slice(0, 上限) + '\n……（已截断，原始共 ' + 长 + ' 字符）' : 文
  return `<details class="折叠"><summary>${转义(标题)}（${长}字，点击展开）</summary><pre class="码">${转义(显示)}</pre></details>`
}

function 取数据(对象, 路径串) {
  return 路径串.split('.').reduce((o, k) => (o == null ? undefined : o[k]), 对象)
}

const 样式 = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#EDEDED;--panel:#F7F7F7;--green:#95EC69;--line:#DCDCDC;--ink:#191919;--sub:#667;
--accent:#07C160;--warn:#E64340;--amber:#E6A23C;--code-bg:#1e1e1e;--code-ink:#d4d4d4}
html,body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
color:var(--ink);background:var(--bg);font-size:14px;line-height:1.6}
body{padding-bottom:40px}
.顶{position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid var(--line);
padding:10px 18px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;box-shadow:0 1px 4px rgba(0,0,0,.04)}
.顶 h1{font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px}
.顶 h1::before{content:"";width:9px;height:9px;border-radius:50%;background:var(--accent)}
.顶 .sp{margin-left:auto}
.按钮{border:1px solid var(--line);background:#fff;border-radius:6px;padding:5px 12px;cursor:pointer;color:var(--ink);font-size:12px}
.按钮:hover{background:var(--panel)}
.壳{max-width:900px;margin:0 auto;padding:16px}
.头卡{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin-bottom:14px}
.头卡 h2{font-size:17px;margin-bottom:6px}
.头卡 .子{color:var(--sub);font-size:12.5px}
.标{display:inline-block;background:var(--accent);color:#fff;border-radius:4px;padding:2px 8px;font-size:11px;margin-right:6px}
.标.红{background:var(--warn)}
.概{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:12px}
.概 div{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:10px;text-align:center}
.概 b{display:block;font-size:18px;font-weight:750;color:var(--accent)}
.概 span{font-size:11px;color:var(--sub)}
.聊天{background:#fff;border:1px solid var(--line);border-radius:10px;padding:18px;min-height:400px}
.局头{font-size:15px;font-weight:700;padding-bottom:12px;border-bottom:1px solid var(--line);margin-bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.签{color:var(--sub);font-size:11px;font-weight:400}
.时间条{text-align:center;color:#fff;background:#C9C9C9;border-radius:4px;display:inline-block;padding:1px 9px;font-size:11px;margin:18px auto 8px}
.轮{border-bottom:1px dashed #eee;padding-bottom:10px;margin-bottom:8px}
.行{display:flex;gap:8px;margin-bottom:8px;align-items:flex-start}
.行.我{flex-direction:row-reverse}
.头像{width:36px;height:36px;border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#7bc0ff,#4a90e2);color:#fff;font-weight:700;font-size:14px}
.行.我 .头像{background:linear-gradient(135deg,#ffb36b,#f27a3b)}
.气泡{max-width:min(72%,560px);background:#fff;border-radius:6px;padding:9px 13px;line-height:1.55;position:relative;box-shadow:0 1px 2px rgba(0,0,0,.06);word-break:break-word;font-size:14px}
.行.我 .气泡{background:var(--green)}
.气泡 .元{font-size:10.5px;color:var(--sub);margin-top:4px}
.行.我 .气泡 .元{color:#5a7a4a}
.气泡.表情包{background:var(--panel);border:1px dashed var(--line)}
.气泡.语音{background:var(--panel)}
.展开{margin:6px 0 2px;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)}
.展开 summary{padding:8px 13px;cursor:pointer;font-size:12.5px;font-weight:600;color:#333;user-select:none;list-style:none;display:flex;align-items:center;gap:8px}
.展开 summary::-webkit-details-marker{display:none}
.展开 summary::before{content:"▸";color:var(--accent);transition:transform .2s}
.展开[open] summary::before{transform:rotate(90deg)}
.展开 summary:hover{background:#eef7f0}
.展身{padding:8px 13px 13px;border-top:1px solid var(--line)}
.块{background:#fff;border:1px solid var(--line);border-radius:7px;margin-top:9px;overflow:hidden}
.块头{padding:6px 11px;background:#fafafa;border-bottom:1px solid var(--line);font-size:12px;font-weight:600}
.块身{padding:9px 11px;font-size:12px;line-height:1.65}
.键{color:var(--sub);font-size:11px;margin-right:6px}
.值{white-space:pre-wrap;word-break:break-word}
.无{color:#aaa;font-style:italic;font-size:11.5px}
.码{background:var(--code-bg);color:var(--code-ink);border-radius:5px;padding:9px 11px;font:11.5px/1.55 Consolas,Monaco,"Courier New",monospace;white-space:pre-wrap;word-break:break-all;max-height:260px;overflow:auto;margin-top:5px}
.折叠{margin-top:6px}
.折叠 summary{cursor:pointer;color:var(--accent);font-size:11.5px}
.行内{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.行内 span{background:#eef4ff;border:1px solid #d6e4ff;border-radius:4px;padding:2px 7px;font-size:10.5px;color:#2b5fa8}
.好感{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.好感 div{background:#f6ffed;border:1px solid #b7eb8f;border-radius:5px;padding:3px 8px;font-size:11px}
.好感 b{color:var(--accent)}
.日志{border:1px solid var(--line);border-radius:6px;margin-top:8px;background:#fff;overflow:hidden}
.日志 .头{padding:6px 10px;background:#fafafa;border-bottom:1px solid var(--line);font-size:11.5px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.日志 .头 .lv{border-radius:3px;padding:0 5px;font-size:10px;color:#fff;background:#999}
.日志 .头 .lv.info{background:var(--accent)}
.日志 .头 .lv.warn{background:var(--amber)}
.日志 .头 .lv.error,.日志 .头 .lv.fatal{background:var(--warn)}
.日志 .身{padding:7px 10px;font-size:11.5px}
.日志 .身 .msg{word-break:break-word}
.异{background:#fff1f0;border:1px solid #ffccc7;color:#a8071a;border-radius:6px;padding:8px 10px;margin-top:8px;font-size:12px;white-space:pre-wrap;word-break:break-word}
.问表{width:100%;border-collapse:collapse;font-size:12px;background:#fff}
.问表 th,.问表 td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}
.问表 th{background:var(--panel);font-weight:600}
.脚{text-align:center;color:#999;font-size:11px;margin-top:20px}
@media(max-width:760px){.气泡{max-width:82%}.壳{padding:8px}.顶{padding:8px}}
`

function 渲染日志(片段) {
  const 级 = String(片段.ji_bie || '')
  const 类 = `lv ${级.toLowerCase().replace(/[^a-z]/g, '')}`
  const 时 = 片段.shi_jian ? new Date(片段.shi_jian).toLocaleTimeString('zh-CN', { hour12: false }) : ''
  const 详情 = 片段.xiang_qing
  const 详情文 = 详情 == null ? '' : 美化(详情)
  const 长 = 详情文.length
  const 裁 = 长 > 2000
  const 显示 = 裁 ? 详情文.slice(0, 2000) + '\n……（已截断，原始共 ' + 长 + ' 字符）' : 详情文
  const 详情块 = 长
    ? (裁
      ? `<details class="折叠"><summary>xiang_qing 详情（${长}字，已截断，点击展开）</summary><pre class="码">${转义(显示)}</pre></details>`
      : `<details class="折叠"><summary>xiang_qing 详情（${长}字，点击展开）</summary><pre class="码">${转义(显示)}</pre></details>`)
    : '<div class="无">xiang_qing：无</div>'
  return `<div class="日志"><div class="头"><span class="${类}">${转义(级 || '日志')}</span><span>${转义(时)}</span><span>${转义(片段.lei_xing || '')}</span><span class="签">trace ${转义((片段.trace_id || '').slice(0, 8))}</span></div>
    <div class="身"><div class="msg">${转义(片段.xiao_xi || '')}</div>${详情块}</div></div>`
}

function 渲染AI消息(消息) {
  const 类型 = String(消息.lei_xing || 'wenben')
  const 内容 = String(消息.nei_rong ?? '')
  const 是表情 = 类型.includes('biaoqing') || 类型.includes('表情')
  const 是语音 = 类型.includes('yuyin') || 类型.includes('语音')
  const 类 = 是表情 ? ' 表情包' : (是语音 ? ' 语音' : '')
  const 标签 = 是表情 ? '表情包' : (是语音 ? '语音' : '文字')
  const 时 = 消息.shi_jian_chuo ? new Date(Number(消息.shi_jian_chuo)).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : ''
  return `<div class="行"><div class="头像">TA</div><div class="气泡${类}">${转义(内容)}<div class="元">${标签}${时 ? ' · ' + 转义(时) : ''}</div></div></div>`
}

function 渲染一轮(轮) {
  const 序 = 轮.轮次
  const 时间 = 轮.发送开始时间 ? new Date(轮.发送开始时间).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
  const 耗时 = 轮.耗时毫秒 != null ? `${轮.耗时毫秒} 毫秒` : '未记录'
  const 回显一致 = 轮.回显一致 === true ||
    (轮.发送响应?.数据?.shu_ju?.nei_rong === 轮.发送内容 &&
      Number(轮.发送响应?.数据?.shu_ju?.ke_hu_duan_xu_hao) === Number(轮.发送回显?.客户端序号))
  const 模型 = (轮.模型名列表 || []).map((m) => `<span>${转义(m)}</span>`).join('') || '<span class="无">未记录</span>'
  const trace = (轮.traceId列表 || []).join('\n') || '未记录'

  const 阶段 = 取数据(轮, '好感度.数据.shu_ju.jie_duan') || ''
  const 心情 = 取数据(轮, '好感度.数据.shu_ju.xin_qing') || ''
  const 累 = 取数据(轮, '累计变化.数据.shu_ju') || {}
  const 变化项 = [
    ['信任度', 累.xin_ren_du_bian_hua],
    ['亲密度', 累.qin_mi_du_bian_hua],
    ['趣味度', 累.qu_wei_du_bian_hua],
    ['关怀度', 累.guan_huai_du_bian_hua],
    ['总分累计', 累.zong_fen_bian_hua]
  ].filter(([, v]) => v != null)
  const 好感块 = 变化项.length
    ? `<div class="好感">${变化项.map(([k, v]) => `<div>${k} <b>${Number(v) > 0 ? '+' : ''}${转义(v)}</b></div>`).join('')}${阶段 ? `<div>阶段 <b>${转义(阶段)}</b></div>` : ''}${心情 ? `<div>心情 <b>${转义(心情)}</b></div>` : ''}</div>`
    : '<div class="无">本轮未记录好感变化</div>'

  const 日志列表 = (轮.日志片段 || []).map(渲染日志).join('') || '<div class="无">本轮无日志片段</div>'
  const 等待 = 轮.等待结果 || {}
  const 等待摘要 = [等待.来源, 等待.结束原因, 等待.超时 ? '超时' : '未超时', 等待.无回复 ? '无回复' : '', 等待.耗时毫秒 != null ? `等待耗时 ${等待.耗时毫秒} 毫秒` : ''].filter(Boolean).join(' · ')
  const 异常 = 轮.异常 ? `<div class="异"><b>本轮异常：</b>${转义(美化(轮.异常))}</div>` : ''

  let 气泡 = `<div class="时间条">第 ${序} 轮 · ${转义(时间)}</div>`
  气泡 += `<div class="行 我"><div class="头像">我</div><div class="气泡">${转义(轮.发送内容 || '')}<div class="元">${回显一致 ? '✅ 已真实落库' : '⚠️ 回显不一致'} · ${转义(耗时)}</div></div></div>`
  for (const 消息 of (轮.AI回复 || [])) 气泡 += 渲染AI消息(消息)

  return `<div class="轮">
    ${气泡}
    <details class="展开"><summary>展开详细过程 · 第 ${序} 轮（${(轮.日志片段 || []).length} 条日志）</summary><div class="展身">
      <div class="块"><div class="块头">基本信息</div><div class="块身">
        <div><span class="键">耗时</span><span class="值">${转义(耗时)}</span></div>
        <div><span class="键">模型名列表</span></div><div class="行内">${模型}</div>
        <div><span class="键">traceId</span></div><pre class="码">${转义(trace)}</pre>
      </div></div>
      <div class="块"><div class="块头">好感度变化</div><div class="块身">${好感块}</div></div>
      <div class="块"><div class="块头">完整日志片段</div><div class="块身">${日志列表}</div></div>
      <div class="块"><div class="块头">发送响应</div><div class="块身">${折叠文本('发送响应', 美化(轮.发送响应))}</div></div>
      <div class="块"><div class="块头">等待结果</div><div class="块身"><div><span class="键">摘要</span><span class="值">${转义(等待摘要 || '未记录')}</span></div>${折叠文本('等待结果原文', 美化(轮.等待结果))}</div></div>
      ${异常}
    </div></details>
  </div>`
}

function 渲染问题(问题表) {
  if (!Array.isArray(问题表) || 问题表.length === 0) return '<div class="无">暂无问题清单</div>'
  return `<table class="问表"><thead><tr><th>编号</th><th>严重度</th><th>模块</th><th>问题</th><th>原报告位置</th><th>修复状态</th></tr></thead><tbody>
    ${问题表.map((p) => `<tr><td>${转义(p.编号)}</td><td>${转义(p.严重度)}</td><td>${转义(p.模块)}</td><td><b>${转义(p.标题)}</b><div class="签">${转义(p.证据 || '')}</div></td><td>${转义(p.原报告位置 || '')}</td><td>${转义(p.状态 || '')}</td></tr>`).join('')}
  </tbody></table>`
}

function 主流程() {
  const 数据 = 读JSON(数据来源)
  if (!数据) throw new Error('无法读取数据源：' + 数据来源)
  const 轮次 = 数据.轮次 || []
  const 日志总数 = 轮次.reduce((a, r) => a + (r.日志片段 || []).length, 0)
  const AI消息总数 = 轮次.reduce((a, r) => a + (r.AI回复 || []).length, 0)
  const 异常轮数 = 轮次.filter((r) => r.异常).length
  const 问题表 = 读JSON(path.join(数据目录, '问题清单.json')) || []
  const 完整日志原文 = fs.existsSync(日志来源) ? fs.readFileSync(日志来源, 'utf8') : ''
  const 调用块 = 完整日志原文
    .split(/【调用 \d+】/)
    .slice(1)
    .map((块) => 块.replace(/={5,}/g, '').trim())
    .filter((块) => 块.length > 0)
  const 完整日志HTML = 调用块.length === 0
    ? '<div class="无">未找到完整模型日志（请先运行 提取完整日志.cjs）</div>'
    : 调用块.map((块, 序) => {
        const 首行 = 块.split('\n').find((行) => 行.includes('模型类型')) || `调用 ${序 + 1}`
        const 标题 = 首行.replace(/^【调用 \d+】/, '').trim() || `调用 ${序 + 1}`
        const 长 = 块.length
        const 显示 = 长 > 8000 ? 块.slice(0, 8000) : 块
        return `<details class="展开"><summary>完整模型调用 ${序 + 1} · ${转义(标题)}（${长}字）</summary><div class="展身"><div class="块"><div class="块身"><pre class="码">${转义(显示)}</pre>${长 > 8000 ? '<div class="签">内容超过 8000 字已截断，完整版见同目录 -完整模型日志.txt</div>' : ''}</div></div></div></details>`
      }).join('')

  const 角色数据 = 取数据(数据, '角色.生成结果.数据.shu_ju') || {}
  const 标签 = (角色数据.biao_qian || []).join(' / ')
  const 性别 = 角色数据.xing_bie === 'nan' ? '男' : (角色数据.xing_bie === 'nv' ? '女' : (角色数据.xing_bie || ''))
  const 昵称 = 取数据(数据, '会话.结果.ni_cheng') || 角色数据.wei_xin_ming || ''
  const 结局 = 数据.当前状态 || '未记录'
  const 开始 = 数据.开始时间 ? new Date(数据.开始时间).toLocaleString('zh-CN', { hour12: false }) : ''
  const 结束 = 数据.结束时间 ? new Date(数据.结束时间).toLocaleString('zh-CN', { hour12: false }) : ''

  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>和我恋爱吧 · 真实对话报告</title><style>${样式}</style></head><body>
<div class="顶">
  <h1>和我恋爱吧 · 真实对话报告</h1>
  <span class="签">运行标识 ${转义(数据.运行标识 || '')}</span>
  <div class="sp"></div>
  <button class="按钮" onclick="全部展开(true)">展开全部</button>
  <button class="按钮" onclick="全部展开(false)">收起全部</button>
</div>
<div class="壳">
  <div class="头卡">
    <h2><span class="标">${转义(数据.标识 || '')}</span>${转义(数据.标签 || '')}</h2>
    <div class="子">MBTI ${转义(角色数据.mbti_lei_xing || '')} · 性别 ${转义(性别)} · 昵称 ${转义(昵称 || '未记录')} · ${转义(标签)}</div>
    <div class="子">开始 ${转义(开始)} · 结束 ${转义(结束)} · 服务 ${转义(数据.服务地址 || '')}</div>
    <div class="概">
      <div><b>${轮次.length}</b><span>对话轮次</span></div>
      <div><b>${AI消息总数}</b><span>AI 消息条数</span></div>
      <div><b>${日志总数}</b><span>日志片段</span></div>
      <div><b>${异常轮数}</b><span>异常轮次</span></div>
      <div><b>${转义(结局)}</b><span>结局</span></div>
    </div>
  </div>
  <div class="聊天">
    <div class="局头"><span class="标">${转义(数据.标识 || '')}</span>完整对话记录<span class="签">${转义(数据.标签 || '')} · 点击每轮「展开详细过程」看原始日志</span></div>
    ${轮次.map(渲染一轮).join('')}
  </div>
  <div class="聊天" style="margin-top:14px">
    <div class="局头"><span class="标">原始</span>完整模型输入输出<span class="签">共 ${调用块.length} 次模型调用 · 真实 prompt 与输出原文</span></div>
    ${完整日志HTML}
  </div>
  <div class="聊天" style="margin-top:14px">
    <div class="局头"><span class="标">审查</span>问题清单<span class="签">共 ${问题表.length} 条</span></div>
    ${渲染问题(问题表)}
  </div>
  <div class="脚">本报告为单文件自包含 · 所有动态内容已 HTML 转义 · 内容来自 ${转义(path.basename(数据来源))}</div>
</div>
<script>
function 全部展开(开){document.querySelectorAll('details.展开').forEach(function(d){d.open=开})}
</script>
</body></html>`

  fs.writeFileSync(报告路径, html, 'utf8')
  const kb = (Buffer.byteLength(html) / 1024).toFixed(1)
  console.log(`[真实对话报告] 轮次=${轮次.length} AI消息=${AI消息总数} 日志片段=${日志总数} 异常轮=${异常轮数}`)
  console.log(`[真实对话报告] 输出 ${报告路径}（${kb} KB）`)
}

主流程()
