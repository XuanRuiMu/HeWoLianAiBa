'use strict'

const fs = require('node:fs')
const path = require('node:path')

const 后端根 = path.resolve(__dirname, '..')
const 项目根 = path.resolve(后端根, '..')
const 数据目录 = path.join(项目根, '测试报告', '真实用户模拟')
const 链路目录 = path.join(项目根, '测试报告', '对话链路')
const 报告路径 = path.join(数据目录, '测试报告.html')

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

function 选运行标识() {
  if (process.env.报告时间) return process.env.报告时间
  const 总 = 读JSON(path.join(数据目录, '总数据.json'))
  if (!总?.运行标识) return null
  if (!总.结束时间) {
    const 历史 = fs.readdirSync(数据目录)
      .filter((名) => /^\d{8}-\d{6}-E局\.json$/.test(名))
      .sort()
      .reverse()
    for (const 名 of 历史) {
      const 候选 = 名.slice(0, 15)
      const 会话 = 读JSON(path.join(数据目录, 名))
      const 链 = 读JSON(path.join(链路目录, `完整链路-${候选}-E局.json`))
      if ((会话?.轮次?.length || 0) > 0 && 链) return 候选
    }
  }
  return 总.运行标识
}

function 汇总有效性(会话) {
  const 轮次 = 会话?.轮次 || []
  let 回显一致 = 0
  let 历史非空 = 0
  let 异常 = 0
  for (const 轮 of 轮次) {
    if (轮.回显一致 === true || (轮.发送响应?.数据?.shu_ju?.nei_rong === 轮.发送内容 && Number(轮.发送响应?.数据?.shu_ju?.ke_hu_duan_xu_hao) === 轮.轮次)) 回显一致 += 1
    if (轮.异常) 异常 += 1
  }
  return { 名义轮次: 轮次.length, 回显一致轮次: 回显一致, 异常轮次: 异常 }
}

const 样式 = `
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --wx-bg:#EDEDED;--wx-panel:#F7F7F7;--wx-green:#95EC69;--wx-white:#FFFFFF;
  --wx-text:#191919;--wx-muted:#7A7A7A;--wx-line:#DCDCDC;--wx-blue:#07C160;
  --card:#fff;--ink:#1a1a1a;--sub:#667;--accent:#07C160;--warn:#E64340;--amber:#E6A23C;
  --code-bg:#1e1e1e;--code-ink:#d4d4d4;
}
html,body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  color:var(--ink);background:var(--wx-bg);font-size:14px;line-height:1.6}
body{padding-bottom:40px}
.顶{position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid var(--wx-line);
  padding:10px 18px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;box-shadow:0 1px 4px rgba(0,0,0,.04)}
.顶 h1{font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px}
.顶 h1::before{content:"";width:9px;height:9px;border-radius:50%;background:var(--accent)}
.顶 .sp{margin-left:auto}
.按钮{border:1px solid var(--wx-line);background:#fff;border-radius:6px;padding:5px 12px;cursor:pointer;color:var(--ink);font-size:12px}
.按钮:hover{background:var(--wx-panel)}
.按钮.主{background:var(--accent);color:#fff;border-color:var(--accent)}
.搜索{border:1px solid var(--wx-line);border-radius:6px;padding:6px 10px;font-size:12px;width:170px;outline:none}
.壳{max-width:1180px;margin:0 auto;padding:16px}
.横幅{border-radius:10px;padding:14px 18px;margin-bottom:16px;line-height:1.7;font-size:13px}
.横幅.红{background:#fff1f0;border:1px solid #ffccc7;color:#a8071a}
.横幅.绿{background:#f6ffed;border:1px solid #b7eb8f;color:#135200}
.横幅 b{font-size:14px}
.概览{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px}
.概{background:#fff;border:1px solid var(--wx-line);border-radius:10px;padding:12px;text-align:center}
.概 b{display:block;font-size:20px;font-weight:750;color:var(--accent)}
.概 span{font-size:11px;color:var(--sub)}
.布{display:flex;gap:16px;align-items:flex-start}
.侧{width:250px;flex-shrink:0;background:#fff;border:1px solid var(--wx-line);border-radius:10px;overflow:hidden;position:sticky;top:64px}
.侧 .题{padding:11px 14px;font-weight:700;border-bottom:1px solid var(--wx-line);background:var(--wx-panel);font-size:13px}
.局项{padding:10px 14px;border-bottom:1px solid #f0f0f0;cursor:pointer;font-size:12.5px}
.局项:hover{background:var(--wx-panel)}
.局项.选{background:#e8f8ee;border-left:3px solid var(--accent)}
.局项 b{display:block;font-size:13px;margin-bottom:2px}
.局项 span{color:var(--sub)}
.主{flex:1;min-width:0}
.聊天{background:#fff;border:1px solid var(--wx-line);border-radius:10px;padding:18px;min-height:400px}
.局头{font-size:15px;font-weight:700;padding-bottom:12px;border-bottom:1px solid var(--wx-line);margin-bottom:16px;display:flex;align-items:center;gap:10px}
.局头 .标{background:var(--accent);color:#fff;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:500}
.时间条{text-align:center;color:#fff;background:#C9C9C9;border-radius:4px;display:inline-block;padding:1px 8px;font-size:11px;margin:14px auto}
.轮{margin-bottom:18px}
.行{display:flex;gap:8px;margin-bottom:8px;align-items:flex-start}
.行.我{flex-direction:row-reverse}
.头像{width:36px;height:36px;border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#7bc0ff,#4a90e2);color:#fff;font-weight:700;font-size:14px}
.行.我 .头像{background:linear-gradient(135deg,#ffb36b,#f27a3b)}
.气泡{max-width:min(70%,560px);background:var(--wx-white);border-radius:6px;padding:9px 13px;line-height:1.55;position:relative;box-shadow:0 1px 2px rgba(0,0,0,.06);word-break:break-word;font-size:14px}
.行.我 .气泡{background:var(--wx-green)}
.气泡 .元{font-size:10.5px;color:var(--wx-muted);margin-top:4px}
.行.我 .气泡 .元{color:#5a7a4a}
.气泡.表情包{background:var(--wx-panel);border:1px dashed var(--wx-line)}
.气泡.语音{background:var(--wx-panel)}
.轮标{text-align:center;margin:6px 0;color:#999;font-size:11px;cursor:pointer}
.轮标:hover{color:var(--accent)}
.链路{margin:6px 0 4px;border:1px solid var(--wx-line);border-radius:8px;overflow:hidden;background:var(--wx-panel)}
.链路 summary{padding:9px 13px;cursor:pointer;font-size:12.5px;font-weight:600;color:#333;user-select:none;list-style:none;display:flex;align-items:center;gap:8px}
.链路 summary::-webkit-details-marker{display:none}
.链路 summary::before{content:"▸";color:var(--accent);transition:transform .2s}
.链路[open] summary::before{transform:rotate(90deg)}
.链路 summary:hover{background:#eef7f0}
.链身{padding:4px 13px 13px;border-top:1px solid var(--wx-line)}
.步{border:1px solid var(--wx-line);border-radius:7px;margin-top:10px;background:#fff;overflow:hidden}
.步头{padding:7px 11px;background:#fafafa;border-bottom:1px solid var(--wx-line);font-size:12px;font-weight:600;display:flex;gap:8px;align-items:center}
.步号{background:var(--accent);color:#fff;border-radius:50%;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:10px}
.签{font-size:10px;color:var(--sub);font-weight:400}
.步身{padding:9px 11px;font-size:12px;line-height:1.65}
.请求{background:var(--code-bg);color:var(--code-ink);border-radius:5px;padding:9px 11px;font:11.5px/1.55 Consolas,Monaco,"Courier New",monospace;white-space:pre-wrap;word-break:break-all;max-height:260px;overflow:auto}
.请求details{margin-top:6px}
.请求summary{cursor:pointer;color:var(--accent);font-size:11.5px}
.结果{background:#f1f8f3;border-left:3px solid var(--accent);border-radius:4px;padding:8px 10px;margin-top:6px;white-space:pre-wrap;word-break:break-word;font-size:12px;max-height:200px;overflow:auto}
.键{color:var(--sub);font-size:11px;margin-right:6px}
.维{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.维 div{background:#f6ffed;border:1px solid #b7eb8f;border-radius:5px;padding:3px 8px;font-size:11px}
.维 b{color:var(--accent)}
.维.负 div{background:#fff1f0;border-color:#ffccc7}
.维.负 b{color:var(--warn)}
.无{color:#aaa;font-style:italic;font-size:11.5px}
.模型条{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.模型条 span{background:#eef4ff;border:1px solid #d6e4ff;border-radius:4px;padding:2px 7px;font-size:10.5px;color:#2b5fa8}
.问题表{width:100%;border-collapse:collapse;font-size:12px;background:#fff}
.问题表 th,.问题表 td{border:1px solid var(--wx-line);padding:8px 10px;text-align:left;vertical-align:top}
.问题表 th{background:var(--wx-panel);font-weight:600}
.严{display:inline-block;border-radius:4px;padding:1px 6px;font-size:10px;color:#fff}
.严.致命{background:var(--warn)}
.严.高{background:#fa8c16}
.严.中{background:#faad14;color:#000}
.严.低{background:#bfbfbf}
.链{color:var(--accent);cursor:pointer}
.链:hover{text-decoration:underline}
.脚{text-align:center;color:#999;font-size:11px;margin-top:20px}
@media(max-width:760px){.布{display:block}.侧{width:100%;position:static;margin-bottom:12px}.气泡{max-width:82%}.壳{padding:8px}}
`

function 折叠请求(标题, 内容, 标识) {
  if (!内容 || !String(内容).trim()) return `<div class="无">${转义(标题)}：未记录</div>`
  const 长度 = String(内容).length
  return `<details class="请求details"><summary>${转义(标题)}（${长度}字，点击展开）</summary><pre class="请求">${转义(内容)}</pre></details>`
}

function 结果块(标题, 内容) {
  if (!内容 || !String(内容).trim()) return `<div class="无">${转义(标题)}：未记录</div>`
  return `<div class="键">${转义(标题)}</div><div class="结果">${转义(内容)}</div>`
}

function 渲染一轮(轮, 局标识, 会话, 索引) {
  const 我方 = 轮.我方消息 || (会话?.轮次?.[索引]?.发送内容) || ''
  const ai列表 = 轮.AI实际发送 || []
  const 状态 = 会话?.轮次?.[索引] || {}
  const 回显一致 = 状态.回显一致 === true || (状态.发送响应?.数据?.shu_ju?.nei_rong === 我方 && Number(状态.发送响应?.数据?.shu_ju?.ke_hu_duan_xu_hao) === 轮.轮次)
  const 策略 = 轮.导演策略 || {}
  const 好感 = 轮.好感度评判 || {}
  const trace = (轮.traceId列表 || []).join(', ')
  const 耗时 = 轮.耗时秒 != null ? `${轮.耗时秒}秒` : '未记录'

  let 气泡组 = ''
  const 时间 = 状态.发送开始时间 ? new Date(状态.发送开始时间).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''
  气泡组 += `<div class="时间条">第 ${轮.轮次} 轮 · ${转义(时间)}</div>`
  气泡组 += `<div class="行 我"><div class="头像">我</div><div class="气泡">${转义(我方)}<div class="元">${回显一致 ? '✅ 已真实落库' : '⚠️ 服务端回显不一致或未验证'} · ${转义(耗时)}</div></div></div>`
  for (const 消息 of ai列表) {
    const 类型 = 消息.类型 || 'wenben'
    const 内容 = String(消息.内容 || '')
    const 是表情包 = 类型.includes('biaoqingbao') || /^\[表情包:/.test(内容)
    const 是语音 = 类型.includes('yuyin')
    const 类 = 是表情包 ? ' 表情包' : (是语音 ? ' 语音' : '')
    气泡组 += `<div class="行"><div class="头像">TA</div><div class="气泡${类}">${转义(内容)}<div class="元">${是表情包 ? '表情包' : (是语音 ? '语音' : '文字')}</div></div></div>`
  }

  const 模型调用 = 轮.模型调用 || []
  const 模型条 = 模型调用.length
    ? `<div class="模型条">${模型调用.map((m) => `<span>${转义(m.用途 || m.模型 || '未知')} · ${转义(m.模型 || '')} · ${m.耗时毫秒 ?? '?'}ms</span>`).join('')}</div>`
    : '<div class="无">模型调用：未记录</div>'

  const 好感维 = (['信任度变化', '亲密度变化', '趣味度变化', '关怀度变化']).filter((k) => 好感[k] != null)
  const 有负值 = 好感维.some((k) => Number(好感[k]) < 0)
  const 好感块 = 好感维.length
    ? `<div class="维${有负值 ? ' 负' : ''}">${好感维.map((k) => `<div>${k.replace('度变化', '')} <b>${Number(好感[k]) > 0 ? '+' : ''}${转义(好感[k])}</b></div>`).join('')}</div>${结果块('评判理由', 好感.理由)}`
    : '<div class="无">好感度评判：未记录</div>'

  const 链steps = [
    { n: 1, t: '安全审核', req: 折叠请求('发给安全审核 AI 的完整提示词', 轮.安全提示词), res: 结果块('AI 返回', 轮.安全输出) },
    { n: 2, t: '四鉴判定（表白/互删/识破/神经病/想删你）', req: 折叠请求('发给四鉴 AI 的完整提示词', (会话 ? '' : '')), res: 结果块('AI 返回', 轮.四鉴输出) },
    { n: 3, t: '导演（决定这次怎么回）', req: 折叠请求('发给导演 AI 的完整提示词', 轮.导演提示词), res: 结果块('导演策略 JSON', typeof 策略 === 'string' ? 策略 : JSON.stringify(策略, null, 2)) },
    { n: 4, t: '写手（把回复写出来）', req: 折叠请求('发给写手 AI 的完整提示词', 轮.写手提示词), res: 结果块('AI 原始输出', 轮.写手输出) },
    { n: 5, t: '好感度评判', req: 折叠请求('发给好感评判 AI 的完整提示词', 轮.好感提示词), res: 好感块 },
  ]

  return `<div class="轮" id="${转义(局标识)}-r${轮.轮次}">
    ${气泡组}
    <div class="轮标" onclick="var d=document.getElementById('chain-${转义(局标识)}-${轮.轮次}');d.open=!d.open">展开/收起本轮完整思考链路 ▾</div>
    <details class="链路" id="chain-${转义(局标识)}-${轮.轮次}" data-轮次="${轮.轮次}">
      <summary>完整思考链路 · trace: ${转义(trace || '未记录')}</summary>
      <div class="链身">
        ${链steps.map((s) => `<div class="步"><div class="步头"><span class="步号">${s.n}</span>${转义(s.t)}<span class="签">请求在上 · 结果在下</span></div><div class="步身">${s.req}${s.res}</div></div>`).join('')}
        <div class="步"><div class="步头"><span class="步号">6</span>落库与模型调用</div><div class="步身">${模型条}${状态.异常 ? 结果块('本轮异常', 状态.异常) : ''}</div></div>
      </div>
    </details>
  </div>`
}

function 渲染局(标识, 会话, 链路) {
  const 标签 = 会话?.标签 || 链路?.标签 || 标识
  const 有效 = 汇总有效性(会话)
  const 无效 = 有效.回显一致轮次 < 有效.名义轮次
  const 轮次 = (链路?.轮次明细 || []).map((轮, i) => 渲染一轮(轮, 标识, 会话, i)).join('')
  return `<div class="聊天" id="局-${转义(标识)}">
    <div class="局头"><span class="标">${转义(标识)}</span>${转义(标签)}<span class="签">名义 ${有效.名义轮次} 轮 · 回显一致 ${有效.回显一致轮次} 轮</span></div>
    ${无效 ? `<div class="横幅 红"><b>本局数据无效：</b>${有效.名义轮次 - 有效.回显一致轮次} 轮的用户消息因幂等键缺陷未真正落库，AI 实际在反复回应第一条消息。下方气泡仅供查看原始记录，不能用于判断对话自然度、好感增长或结局。</div>` : ''}
    ${轮次 || '<div class="无">该局暂无链路数据</div>'}
  </div>`
}

function 渲染问题(问题表) {
  if (!问题表.length) return '<div class="无">暂无问题清单</div>'
  return `<table class="问题表"><thead><tr><th>编号</th><th>严重度</th><th>模块</th><th>问题</th><th>原报告位置</th><th>修复状态</th></tr></thead><tbody>
    ${问题表.map((p) => `<tr><td>${转义(p.编号)}</td><td><span class="严 ${转义(p.严重度)}">${转义(p.严重度)}</span></td><td>${转义(p.模块)}</td><td><b>${转义(p.标题)}</b><div class="签">${转义(p.证据 || '')}</div></td><td>${转义(p.原报告位置 || '')}</td><td>${转义(p.状态 || '')}</td></tr>`).join('')}
  </tbody></table>`
}

function 主流程() {
  const 运行标识 = 选运行标识() || ''
  const 局列表 = ['E局', 'I局']
  const 数据 = {}
  for (const 局 of 局列表) {
    const 会话 = 读JSON(path.join(数据目录, `${运行标识}-${局}.json`))
    const 链路 = 读JSON(path.join(链路目录, `完整链路-${运行标识}-${局}.json`))
    if (!会话 && !链路) continue
    数据[局] = { 会话, 链路 }
  }
  const 问题表 = 读JSON(path.join(数据目录, '问题清单.json')) || []

  const 全局统计 = Object.values(数据).reduce((acc, d) => {
    const e = 汇总有效性(d.会话)
    return { 名义: acc.名义 + e.名义轮次, 一致: acc.一致 + e.回显一致轮次, 异常: acc.异常 + e.异常轮次 }
  }, { 名义: 0, 一致: 0, 异常: 0 })
  const 全无效 = 全局统计.一致 < 全局统计.名义

  const 局导航 = 局列表.filter((j) => 数据[j]).map((j) => {
    const e = 汇总有效性(数据[j].会话)
    return `<div class="局项 选" onclick="document.getElementById('局-${j}').scrollIntoView({behavior:'smooth'})"><b>${j}</b><span>${e.回显一致轮次}/${e.名义轮次} 轮有效</span></div>`
  }).join('')

  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>和我恋爱吧 · 对话链路报告</title><style>${样式}</style></head><body>
<div class="顶">
  <h1>和我恋爱吧 · 对话链路报告</h1>
  <span class="签">运行标识 ${转义(运行标识 || '未知')}</span>
  <div class="sp"></div>
  <input class="搜索" id="搜索" placeholder="搜索轮次/内容" oninput="筛选()">
  <button class="按钮" onclick="全部展开(true)">展开全部链路</button>
  <button class="按钮" onclick="全部展开(false)">收起全部</button>
</div>
<div class="壳">
  <div class="概览">
    <div class="概"><b>${全局统计.名义}</b><span>名义轮次</span></div>
    <div class="概"><b style="color:${全无效 ? 'var(--warn)' : 'var(--accent)'}">${全局统计.一致}</b><span>回显一致（真实落库）</span></div>
    <div class="概"><b style="color:var(--warn)">${全局统计.异常}</b><span>异常轮次</span></div>
    <div class="概"><b>${问题表.length}</b><span>已发现问题</span></div>
  </div>
  ${全无效 ? `<div class="横幅 红"><b>重要：这份旧报告的数据无效。</b>测试脚本的幂等键缺陷导致绝大多数用户消息未真正发送到后端，AI 反复回应第一条开场白。报告中的对话、好感、自然度结论均不能采信。根因已修复，需要重新跑一遍真实对话后重新生成本报告。</div>` : `<div class="横幅 绿"><b>数据有效：</b>所有轮次的用户消息均已真实落库并可追溯。</div>`}
  <div class="布">
    <div class="侧"><div class="题">对局列表</div>${局导航 || '<div class="局项">无对局数据</div>'}</div>
    <div class="主">${局列表.filter((j) => 数据[j]).map((j) => 渲染局(j, 数据[j].会话, 数据[j].链路)).join('')}
      <div class="聊天" id="问题" style="margin-top:16px">
        <div class="局头"><span class="标">审查</span>发现的问题与修复状态<span class="签">共 ${问题表.length} 条</span></div>
        ${渲染问题(问题表)}
      </div>
    </div>
  </div>
  <div class="脚">本报告为单文件自包含 · 请求在上结果在下 · 点击每轮可展开完整链路 · trace_id 可复制</div>
</div>
<script>
function 全部展开(开){document.querySelectorAll('details.链路').forEach(function(d){d.open=开})}
function 筛选(){
  var kw=document.getElementById('搜索').value.trim();
  document.querySelectorAll('.轮').forEach(function(el){
    el.style.display = !kw || el.textContent.indexOf(kw)>=0 ? '' : 'none';
  });
}
function 复制(值,el){if(navigator.clipboard)navigator.clipboard.writeText(值);el.textContent='已复制';setTimeout(function(){el.textContent=值},1200)}
</script>
</body></html>`
  fs.writeFileSync(报告路径, html, 'utf8')
  console.log(`[聊天报告] 运行标识=${运行标识} 名义轮次=${全局统计.名义} 回显一致=${全局统计.一致} 问题=${问题表.length}`)
  console.log(`[聊天报告] 输出 ${报告路径}（${(Buffer.byteLength(html) / 1024).toFixed(0)} KB）`)
}

主流程()
