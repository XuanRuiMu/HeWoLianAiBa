'use strict'

const fs = require('node:fs')
const path = require('node:path')

const 后端根 = path.resolve(__dirname, '..')
const 项目根 = path.resolve(后端根, '..')
const 数据目录 = path.join(项目根, '测试报告', '真实用户模拟')
const 链路目录 = path.join(项目根, '测试报告', '对话链路')
const 测速目录 = path.join(项目根, '测试报告', '模型测速')
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

function 选定运行标识() {
  if (process.env.报告时间) return process.env.报告时间
  const 总 = 读JSON(path.join(数据目录, '总数据.json'))
  return 总?.运行标识 || null
}

function 找最新测速() {
  if (!fs.existsSync(测速目录)) return null
  const 列表 = fs.readdirSync(测速目录).filter((名) => 名.endsWith('.json')).sort()
  return 列表.length ? 读JSON(path.join(测速目录, 列表[列表.length - 1])) : null
}

const 样式 = `
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0d14;--panel:#121824;--panel2:#182131;--line:#232e40;--line2:#2d3a50;
  --txt:#e6edf7;--muted:#8fa1bd;--dim:#5f748f;
  --cyan:#38d9d0;--violet:#9089f0;--pink:#f472b6;--amber:#fbbf24;--green:#4ade80;--red:#f87171;
}
body{background:linear-gradient(165deg,#0a0d14,#0c1119 45%,#0a0d14);color:var(--txt);
  font:14.5px/1.68 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  min-height:100vh;padding-bottom:60px;-webkit-font-smoothing:antialiased}
.顶{position:sticky;top:0;z-index:50;background:rgba(10,13,20,.94);backdrop-filter:blur(14px);
  border-bottom:1px solid var(--line);padding:12px 24px;display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.顶 b{font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px}
.顶 b::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 10px var(--cyan)}
.顶 nav{display:flex;gap:3px;margin-left:auto;flex-wrap:wrap}
.顶 a{padding:5px 11px;border-radius:6px;font-size:12.5px;color:var(--muted);transition:.16s;text-decoration:none}
.顶 a:hover{color:var(--txt);background:rgba(255,255,255,.06)}
.身{max-width:1180px;margin:0 auto;padding:0 20px}
.头{padding:40px 0 26px;text-align:center}
.头 h1{font-size:30px;font-weight:800;letter-spacing:-.02em;margin-bottom:11px;
  background:linear-gradient(115deg,var(--txt),var(--cyan) 55%,var(--violet));
  -webkit-background-clip:text;background-clip:text;color:transparent}
.头 p{color:var(--muted);font-size:13.5px;max-width:720px;margin:0 auto;line-height:1.75}
.导读{margin:24px auto 0;max-width:900px;text-align:left;background:linear-gradient(135deg,rgba(56,217,208,.06),rgba(144,137,240,.06));
  border:1px solid rgba(56,217,208,.2);border-radius:12px;padding:15px 18px}
.导读 h3{font-size:12px;color:var(--cyan);letter-spacing:.05em;margin-bottom:8px;font-weight:700}
.导读 p{font-size:12.8px;line-height:1.78;color:var(--muted);text-align:left;max-width:none;margin:0}
.导读 p + p{margin-top:7px}
.导读 b{color:var(--txt)}
.概览{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:11px;margin:22px 0 4px}
.概览 > div{background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);
  border-radius:11px;padding:14px 12px;text-align:center;position:relative;overflow:hidden}
.概览 > div::after{content:"";position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,var(--cyan),var(--violet),transparent)}
.概览 b{display:block;font-size:22px;font-weight:800;letter-spacing:-.02em;margin-bottom:2px}
.概览 span{font-size:11.5px;color:var(--muted)}
.节{margin:46px 0}
.节头{display:flex;align-items:baseline;gap:12px;padding-bottom:12px;border-bottom:1px solid var(--line);margin-bottom:8px}
.节头 h2{font-size:19px;font-weight:750;letter-spacing:-.01em}
.节头 .右{font-size:12px;color:var(--dim);margin-left:auto}
.说明{color:var(--muted);font-size:13px;margin-bottom:18px;line-height:1.7}
.人设{background:linear-gradient(135deg,rgba(56,217,208,.055),rgba(144,137,240,.055));
  border:1px solid rgba(56,217,208,.2);border-radius:12px;padding:16px 18px;margin-bottom:16px}
.人设 h3{font-size:11.5px;color:var(--cyan);letter-spacing:.06em;margin-bottom:9px;font-weight:700}
.人设 pre{font:inherit;color:var(--txt);font-size:13px;line-height:1.75;white-space:pre-wrap;margin:0;word-break:break-word}
.属性{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}
.签{padding:2px 9px;border-radius:999px;font-size:11px;border:1px solid var(--line);
  background:rgba(255,255,255,.03);color:var(--muted);white-space:nowrap}
.卡{display:block;background:var(--panel);border:1px solid var(--line);border-radius:12px;margin-bottom:12px;overflow:hidden}
.卡 > summary{display:flex;align-items:center;gap:11px;padding:13px 17px;cursor:pointer;list-style:none;
  background:linear-gradient(90deg,rgba(56,217,208,.045),transparent);transition:.16s}
.卡 > summary::-webkit-details-marker{display:none}
.卡 > summary:hover{background:linear-gradient(90deg,rgba(56,217,208,.09),transparent)}
.卡[open] > summary{border-bottom:1px solid var(--line)}
.号{width:29px;height:29px;flex:none;border-radius:8px;display:grid;place-items:center;
  background:linear-gradient(135deg,var(--cyan),var(--violet));color:#0a0d14;font-weight:800;font-size:12.5px}
.摘{margin-left:auto;font-size:12px;color:var(--dim);max-width:420px;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.轮态{padding:2px 9px;border-radius:999px;font-size:10.5px;font-weight:700;white-space:nowrap;
  border:1px solid var(--line);color:var(--dim);background:rgba(255,255,255,.03)}
.轮态.有{border-color:rgba(74,222,128,.3);color:var(--green);background:rgba(74,222,128,.08)}
.轮态.缺{border-color:rgba(251,191,36,.3);color:var(--amber);background:rgba(251,191,36,.08)}
.卡身{padding:17px}
.轮trace{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-bottom:16px;padding:9px 12px;
  background:rgba(0,0,0,.2);border-radius:8px;border:1px solid var(--line)}
.轮trace .h{font-size:10.5px;color:var(--dim);letter-spacing:.03em;margin-right:3px}
.trace{font:11px/1.5 Consolas,Monaco,monospace;color:var(--violet);background:rgba(144,137,240,.1);
  border:1px solid rgba(144,137,240,.22);border-radius:5px;padding:2px 7px;cursor:pointer;
  transition:.15s;user-select:all;white-space:nowrap}
.trace:hover{background:rgba(144,137,240,.22);color:var(--txt)}
.trace.已复制{background:rgba(74,222,128,.2);border-color:rgba(74,222,128,.4);color:var(--green)}
.未记{color:var(--dim);font-size:11.5px;font-style:italic}
.步{border:1px solid var(--line);border-radius:11px;margin-bottom:12px;overflow:hidden;position:relative}
.步::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--line2)}
.步.s2::before{background:var(--violet)}.步.s3::before{background:var(--cyan)}
.步.s4::before{background:var(--green)}.步.s5::before{background:var(--amber)}
.步头{display:flex;align-items:center;gap:9px;padding:10px 14px;background:rgba(255,255,255,.022);
  border-bottom:1px solid var(--line);flex-wrap:wrap}
.步号{width:22px;height:22px;flex:none;border-radius:6px;display:grid;place-items:center;
  font-size:11px;font-weight:800;background:var(--panel2);color:var(--muted);border:1px solid var(--line)}
.步.s2 .步号{color:var(--violet);border-color:rgba(144,137,240,.35)}
.步.s3 .步号{color:var(--cyan);border-color:rgba(56,217,208,.35)}
.步.s4 .步号{color:var(--green);border-color:rgba(74,222,128,.35)}
.步.s5 .步号{color:var(--amber);border-color:rgba(251,191,36,.35)}
.步头 b{font-size:13px;font-weight:700;color:var(--txt)}
.步头 .步注{font-size:11px;color:var(--dim);margin-left:2px}
.步头 .trace{margin-left:auto}
.步段{padding:11px 14px}
.步段 + .步段{border-top:1px dashed var(--line)}
.段标{font-size:10.5px;font-weight:700;letter-spacing:.06em;color:var(--dim);margin-bottom:7px;display:flex;align-items:center;gap:6px}
.段标::before{content:"↳";font-size:12px;color:var(--line2)}
.段标.结果标{color:var(--muted)}
.段标.结果标::before{content:"✓";color:var(--green)}
.请折{background:rgba(0,0,0,.22);border:1px solid var(--line);border-radius:8px;overflow:hidden}
.请折 > summary{padding:9px 13px;cursor:pointer;font-size:12px;color:var(--violet);list-style:none;
  display:flex;align-items:center;gap:8px;flex-wrap:wrap;transition:.15s}
.请折 > summary::-webkit-details-marker{display:none}
.请折 > summary:hover{background:rgba(144,137,240,.06)}
.请折 > summary::before{content:"▸";font-size:10px;transition:.2s;color:var(--violet)}
.请折[open] > summary::before{transform:rotate(90deg)}
.请折 .展开提示{margin-left:auto;font-size:10.5px;color:var(--dim);border:1px solid var(--line);border-radius:5px;padding:0 6px}
.请折[open] .展开提示{display:none}
.请身{padding:0 13px 13px}
.原文{font:12px/1.72 Consolas,Monaco,"Courier New",monospace;color:#a8b8d0;
  white-space:pre-wrap;word-break:break-word;max-height:520px;overflow-y:auto;
  background:rgba(0,0,0,.3);border-radius:7px;padding:12px;margin:0}
.原文::-webkit-scrollbar{width:8px}
.原文::-webkit-scrollbar-thumb{background:rgba(144,137,240,.28);border-radius:6px}
.结果{font-size:13px;line-height:1.72;color:var(--muted)}
.泡{padding:10px 14px;border-radius:9px;font-size:13.5px;line-height:1.7;white-space:pre-wrap;word-break:break-word}
.泡.我的{background:rgba(251,191,36,.075);border-left:3px solid var(--amber)}
.泡.他的{background:rgba(56,217,208,.065);border-left:3px solid var(--cyan);margin-bottom:6px}
.泡.他的:last-child{margin-bottom:0}
.泡.表情{background:rgba(144,137,240,.09);border-left-color:var(--violet);color:var(--muted);font-style:italic}
.泡.语音{background:rgba(74,222,128,.07);border-left-color:var(--green)}
.脑{display:block;background:rgba(144,137,240,.04);border:1px solid rgba(144,137,240,.15);
  border-radius:10px;padding:13px 15px}
.脑行{display:grid;grid-template-columns:96px 1fr;gap:9px;padding:5px 0;
  border-top:1px dashed rgba(144,137,240,.1);font-size:13px}
.脑行:first-of-type{border-top:none;padding-top:0}
.脑行 dt{color:var(--dim);font-size:12px}
.脑行 dd{color:var(--muted);line-height:1.62;word-break:break-word}
.签行{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px;padding-top:10px;
  border-top:1px dashed rgba(144,137,240,.1)}
.签.心{border-color:rgba(244,114,182,.32);color:var(--pink)}
.签.关{border-color:rgba(74,222,128,.32);color:var(--green)}
.签.意{border-color:rgba(251,191,36,.26);color:var(--amber)}
.好感{background:rgba(74,222,128,.035);border:1px solid rgba(74,222,128,.16);
  border-radius:10px;padding:13px 15px}
.维{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:9px}
.维 > div{background:rgba(255,255,255,.028);border-radius:6px;padding:6px 8px;text-align:center}
.维 b{display:block;font-size:15px;font-weight:750;color:var(--green);font-variant-numeric:tabular-nums}
.维 span{font-size:10px;color:var(--dim)}
.理{font-size:12.5px;color:var(--muted);line-height:1.7;padding-top:8px;
  border-top:1px dashed rgba(74,222,128,.12)}
.短原文{font:12px/1.7 Consolas,Monaco,monospace;color:var(--muted);white-space:pre-wrap;
  word-break:break-word;max-height:220px;overflow-y:auto;background:rgba(0,0,0,.22);
  border-radius:7px;padding:10px 12px;margin:0}
.调用表{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:7px}
.调用项{background:rgba(255,255,255,.025);border:1px solid var(--line);border-radius:7px;
  padding:7px 10px;font-size:11.5px;display:flex;justify-content:space-between;gap:8px;align-items:center}
.调用项 b{color:var(--cyan);font-weight:600;font-family:Consolas,Monaco,monospace}
.调用项 span{color:var(--dim);font-variant-numeric:tabular-nums;white-space:nowrap}
.壳{overflow-x:auto;border:1px solid var(--line);border-radius:11px}
table{border-collapse:collapse;width:100%;font-size:12.5px}
table th{text-align:left;padding:10px 12px;background:var(--panel2);color:var(--muted);
  font-weight:650;font-size:11.5px;white-space:nowrap;border-bottom:1px solid var(--line)}
table td{padding:9px 12px;border-bottom:1px solid rgba(35,46,64,.6);vertical-align:top}
table tr:last-child td{border-bottom:none}
table tr:hover td{background:rgba(255,255,255,.012)}
.等宽{font-family:Consolas,Monaco,monospace;font-size:11.5px;color:var(--muted)}
.态{display:inline-block;padding:1px 7px;border-radius:999px;font-size:10.5px;font-weight:600;white-space:nowrap}
.态.好{background:rgba(74,222,128,.13);color:var(--green);border:1px solid rgba(74,222,128,.26)}
.态.中{background:rgba(251,191,36,.13);color:var(--amber);border:1px solid rgba(251,191,36,.26)}
.态.差{background:rgba(248,113,113,.11);color:var(--red);border:1px solid rgba(248,113,113,.26)}
.提醒{background:rgba(251,191,36,.055);border:1px solid rgba(251,191,36,.18);
  border-left:3px solid var(--amber);border-radius:8px;padding:12px 16px;
  color:var(--muted);font-size:12.5px;line-height:1.72;margin-top:12px}
.折{display:block;background:var(--panel);border:1px solid var(--line);border-radius:10px;margin-bottom:9px;overflow:hidden}
.折 > summary{padding:11px 16px;cursor:pointer;font-size:13px;font-weight:600;color:var(--muted);list-style:none}
.折 > summary::-webkit-details-marker{display:none}
.折 > summary:hover{color:var(--txt);background:rgba(255,255,255,.02)}
.折 .内{padding:0 16px 15px;font-size:12.5px;color:var(--muted);line-height:1.78;white-space:pre-wrap}
.模型卡{background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:15px 17px;margin-bottom:11px}
.模型头{display:flex;align-items:center;gap:10px;margin-bottom:9px;flex-wrap:wrap}
.模型名{font-family:Consolas,Monaco,monospace;font-size:13.5px;font-weight:700;color:var(--cyan)}
.头像区{display:grid;grid-template-columns:200px 1fr;gap:18px;align-items:start;
  background:linear-gradient(135deg,rgba(251,191,36,.05),rgba(56,217,208,.05));
  border:1px solid rgba(251,191,36,.18);border-radius:12px;padding:16px;margin-bottom:16px}
.头像左{position:relative}
.头像图{width:200px;height:200px;object-fit:cover;border-radius:12px;display:block;
  border:1px solid rgba(251,191,36,.28);box-shadow:0 6px 20px rgba(0,0,0,.36)}
.头像缺{width:200px;height:200px;display:grid;place-items:center;border-radius:12px;
  border:1px dashed var(--line);color:var(--dim);font-size:12px}
.头像右 h4{font-size:14px;font-weight:700;color:var(--amber);margin-bottom:9px}
.头像右 .脑行{border-top-color:rgba(251,191,36,.1)}
.脚{margin-top:52px;padding:22px 0;border-top:1px solid var(--line);text-align:center;
  color:var(--dim);font-size:12px;line-height:1.85}
@media(max-width:760px){
  .身{padding:0 13px}.头 h1{font-size:22px}
  .脑行{grid-template-columns:1fr;gap:1px}.维{grid-template-columns:repeat(2,1fr)}
  .摘{display:none}.顶 nav{width:100%;margin-left:0}.卡身{padding:14px}
  .头像区{grid-template-columns:1fr}.步头 .trace{margin-left:0}
}
@media print{
  body{background:#fff;color:#111;padding:0}
  .顶{display:none}.身{max-width:none;padding:0}
  .头 h1{-webkit-text-fill-color:#111;color:#111}
  .卡,.步,.请折,.人设,.导读,.概览 > div{break-inside:avoid;page-break-inside:avoid}
  .节{break-before:page;page-break-before:always}
  .原文,.短原文{max-height:none;overflow:visible;background:#f6f6f6;color:#222}
  .trace{border:1px solid #999;color:#333;background:#eee}
}
`

function 态类(成功率) {
  if (成功率 >= 0.8) return '好'
  if (成功率 >= 0.4) return '中'
  return '差'
}

function 找trace(轮, 用途) {
  const 项 = (轮.模型调用 || []).find((x) => x.用途 === 用途 && x.traceId)
  return 项?.traceId || ''
}

function trace标签(trace, 短) {
  if (!trace) return '<span class="未记">未记录</span>'
  const 显示 = 短 ? String(trace).slice(0, 8) : trace
  return `<code class="trace" data-trace="${转义(trace)}" title="点击复制完整 trace_id：${转义(trace)}">${转义(显示)}</code>`
}

function 请求折叠(标题, 内容, trace) {
  const 字数 = 内容 ? ` · ${内容.length} 字` : ''
  return `<details class="请折"><summary><span>${转义(标题)}${字数}</span>${trace标签(trace, true)}<span class="展开提示">展开原文</span></summary>
    <div class="请身"><pre class="原文">${转义(内容 || '（这一步的请求原文未记录）')}</pre></div></details>`
}

function 生成步骤(序号, 名称, 注, trace, 请求, 结果) {
  return `<div class="步 s${序号}">
    <div class="步头"><span class="步号">${序号}</span><b>${转义(名称)}</b>${注 ? `<span class="步注">${转义(注)}</span>` : ''}${trace标签(trace, true)}</div>
    ${请求 ? `<div class="步段"><div class="段标">请求 · 发给 AI 的完整内容</div>${请求}</div>` : ''}
    <div class="步段"><div class="段标 结果标">结果 · AI 返回并实际生效的内容</div><div class="结果">${结果 || '<span class="未记">这一步没有记录结果</span>'}</div></div>
  </div>`
}

function 导演结果(策略) {
  if (!策略) return '<span class="未记">导演没有产出可解析的策略（本轮可能走了降级链路）</span>'
  const 行 = [
    ['看穿你的意图', 策略.yong_hu_yi_tu],
    ['情绪判断', 策略.qing_gan_fen_xi],
    ['要接住', 策略.yao_jie_zhu_de_dian],
    ['打算这样回', 策略.hui_fu_ce_lue],
    ['心情由来', 策略.xin_qing_li_you],
    ['不回的理由', 策略.bu_hui_li_you],
  ]
    .filter(([, 值]) => 值)
    .map(([名, 值]) => `<dl class="脑行"><dt>${名}</dt><dd>${转义(值)}</dd></dl>`)
    .join('')
  const 签 = [
    策略.xin_qing ? `<span class="签 心">心情 ${转义(策略.xin_qing)}${策略.xin_qing_qiang_du != null ? ' ' + 转义(策略.xin_qing_qiang_du) + '%' : ''}</span>` : '',
    策略.guan_xi_bian_hua ? `<span class="签 关">关系 ${转义(策略.guan_xi_bian_hua)}</span>` : '',
    策略.qing_gan_nong_du != null ? `<span class="签">情感浓度 ${转义(策略.qing_gan_nong_du)}%</span>` : '',
    策略.biao_qing_yi_tu ? `<span class="签 意">表情意图 ${转义(策略.biao_qing_yi_tu)}</span>` : '',
    策略.shi_jian_qing_xu ? `<span class="签">时间 ${转义(策略.shi_jian_qing_xu)}</span>` : '',
    策略.hui_fu_tiao_shu != null ? `<span class="签">打算发 ${转义(策略.hui_fu_tiao_shu)} 条</span>` : '',
    策略.shi_fou_zhu_dong_biao_bai ? '<span class="签 意">主动表白</span>' : '',
    策略.shi_fou_che_hui ? '<span class="签 意">想撤回</span>' : '',
  ].filter(Boolean).join('')
  return `<div class="脑">${行 || '<span class="未记">策略字段均为空</span>'}${签 ? `<div class="签行">${签}</div>` : ''}</div>`
}

function 好感结果(好感) {
  if (!好感) return '<span class="未记">这一轮没有可解析的好感度评判结果</span>'
  const 值 = (名, 键) => `<div><b>${好感[键] != null ? (好感[键] > 0 ? '+' : '') + 转义(好感[键]) : '—'}</b><span>${名}</span></div>`
  return `<div class="好感"><div class="维">
    ${值('信任', '信任度变化')}${值('亲密', '亲密度变化')}${值('趣味', '趣味度变化')}${值('关怀', '关怀度变化')}
  </div>${好感.理由 ? `<div class="理">${转义(好感.理由)}</div>` : ''}</div>`
}

function 生成轮卡(轮, 序号) {
  const traces = (轮.traceId列表 || []).filter(Boolean)
  const 导演trace = 找trace(轮, 'DaoYan')
  const 写手trace = 找trace(轮, 'XieShou')
  const 好感trace = 找trace(轮, 'HaoGanDuPingPan')
  const 安全trace = 找trace(轮, 'AnQuanShenHe')
  const 四鉴trace = 找trace(轮, 'SiLianJian')

  const 气泡 = (轮.AI实际发送 || [])
    .map((项) => {
      const 类 = 项.类型 === 'biaoQingBao' ? '表情' : 项.类型 === 'yuYin' ? '语音' : ''
      const 前缀 = 项.类型 === 'biaoQingBao' ? '［表情包］' : 项.类型 === 'yuYin' ? '［语音］' : ''
      return `<div class="泡 他的 ${类}">${转义(前缀 + 项.内容)}</div>`
    })
    .join('')

  const 写手结果 = `${气泡 || '<div class="泡 他的">（这轮没有发送任何消息）</div>'}
    ${轮.写手输出 ? `<pre class="短原文" style="margin-top:9px">${转义(轮.写手输出)}</pre>` : '<div class="未记" style="margin-top:7px">写手原始输出未单独记录，上方气泡即最终发出内容</div>'}`

  const 安全结果 = `${轮.安全输出 ? `<pre class="短原文">${转义(轮.安全输出)}</pre>` : '<span class="未记">安全审核结果未记录</span>'}
    ${轮.四鉴输出 ? `<div style="margin-top:8px"><div class="段标">四鉴判定（表白 / 互删 / 识破 / 神经病）</div><pre class="短原文">${转义(轮.四鉴输出)}</pre></div>` : ''}`

  const 安全请求 = `${请求折叠('发给安全审核 AI 的完整请求', 轮.安全提示词, 安全trace)}
    <div class="未记" style="margin-top:6px">四鉴判定单独调用，请求原文未随数据落盘；结果见下方。</div>`

  const 调用表 = 轮.模型调用?.length
    ? `<div class="调用表">${轮.模型调用
        .map((项) => `<div class="调用项"><b>${转义(项.用途 || '未记录用途')}</b><span>${转义(项.模型 || '')} ${项.耗时毫秒 != null ? 项.耗时毫秒 + 'ms' : ''}</span></div>`)
        .join('')}</div>`
    : '<span class="未记">本轮没有记录模型调用明细</span>'

  const 完整度 = 轮.导演策略 && 轮.写手提示词 && 轮.好感度评判 ? 2 : 1

  return `<details class="卡" ${序号 === 0 ? 'open' : ''}>
    <summary>
      <span class="号">${轮.轮次}</span>
      <span>第 ${轮.轮次} 轮</span>
      <span class="轮态 ${完整度 === 2 ? '有' : '缺'}">${完整度 === 2 ? '链路完整' : '部分缺失'}</span>
      <span class="摘">${转义(轮.我方消息)}</span>
    </summary>
    <div class="卡身">
      <div class="轮trace"><span class="h">本轮 trace_id（点击复制）</span>${traces.length ? traces.map((t) => trace标签(t)).join('') : '<span class="未记">未记录</span>'}</div>
      ${生成步骤(1, '你发出去的消息', '用户操作', '', '', `<div class="泡 我的">${转义(轮.我方消息)}</div>`)}
      ${生成步骤(2, '导演 Director', '先想清楚怎么回', 导演trace, 请求折叠('发给导演 AI 的完整请求', 轮.导演提示词, 导演trace), 导演结果(轮.导演策略))}
      ${生成步骤(3, '写手 Writer', '再把回复写出来', 写手trace, 请求折叠('发给写手 AI 的完整请求（按原始小节分段，拼起来即全文）', 轮.写手提示词, 写手trace), 写手结果)}
      ${生成步骤(4, '好感度评判', '给这条消息打分', 好感trace, 请求折叠('发给好感评判 AI 的完整请求', 轮.好感提示词, 好感trace), 好感结果(轮.好感度评判))}
      ${生成步骤(5, '安全审核 / 四鉴', '判定违规与关系事件', 安全trace || 四鉴trace, 安全请求, 安全结果)}
      <div class="步" style="--x:0">
        <div class="步头"><span class="步号">∑</span><b>本轮模型调用明细</b><span class="步注">用途 · 实际模型 · 耗时</span></div>
        <div class="步段">${调用表}</div>
      </div>
      ${轮.耗时秒 ? `<div class="签" style="margin-top:10px">本轮来回 ${转义(轮.耗时秒)} 秒</div>` : ''}
    </div>
  </details>`
}

function 生成角色创建区(创建) {
  if (!创建?.创建阶段?.length) return ''
  const 参数 = 创建.角色参数
  const 参数块 = 参数
    ? `<div class="人设"><h3>你填给系统的角色设定（用户可设置的内容）</h3><pre>${转义(
        [
          参数.微信昵称 || 参数.wei_xin_ming ? `微信昵称：${参数.微信昵称 || 参数.wei_xin_ming}` : '',
          参数.真实姓名 || 参数.zhen_shi_ming ? `真实姓名：${参数.真实姓名 || 参数.zhen_shi_ming}` : '',
          参数.年龄 || 参数.nian_ling ? `年龄：${参数.年龄 || 参数.nian_ling}` : '',
          参数.补充描述 || 参数.tong_yong_ti_shi_ci ? `补充描述：${参数.补充描述 || 参数.tong_yong_ti_shi_ci}` : '',
          参数.MBTI || 参数.mbti ? `MBTI：${参数.MBTI || 参数.mbti}` : '',
          参数.性别 || 参数.xing_bie ? `角色性别：${参数.性别 || 参数.xing_bie}` : '',
          参数.渣型 !== undefined && 参数.渣型 !== null ? `渣型：${参数.渣型 ? '是' : '否'}` : '',
        ].filter(Boolean).join('\n'),
      )}</pre></div>`
    : ''

  const 阶段卡 = 创建.创建阶段
    .map(
      (项) => `<details class="卡">
      <summary><span class="号">◆</span><span>${转义(项.阶段名)}</span><span class="轮态 有">${项.耗时毫秒 != null ? 项.耗时毫秒 + 'ms' : '耗时未记录'}</span><span class="摘">模型 ${转义(项.模型 || '未记录')}${项.trace ? ' · ' + 转义(String(项.trace).slice(0, 8)) : ''}</span></summary>
      <div class="卡身">
        ${项.trace ? `<div class="轮trace"><span class="h">trace_id（点击复制）</span>${trace标签(项.trace)}</div>` : ''}
        <div class="步 s3">
          <div class="步头"><span class="步号">1</span><b>请求 · 发给 AI 的完整提示词</b>${项.提示词 ? `<span class="步注">${项.提示词.length} 字</span>` : ''}</div>
          <div class="步段">${项.提示词 ? `<pre class="原文">${转义(项.提示词)}</pre>` : '<span class="未记">请求原文未记录</span>'}</div>
        </div>
        <div class="步 s4">
          <div class="步头"><span class="步号">2</span><b>结果 · AI 返回</b></div>
          <div class="步段">${项.输出 ? `<pre class="短原文" style="max-height:none">${转义(项.输出)}</pre>` : '<span class="未记">结果未记录</span>'}</div>
        </div>
      </div>
    </details>`,
    )
    .join('')

  return `<div style="margin-bottom:4px">
    <div class="标 发" style="font-size:13px;margin:22px 0 10px">角色创建时的完整 AI 链路</div>
    <p class="说明" style="margin-bottom:14px">你填完人设后，系统依次调用 AI：先审核人设能不能成立 → 判断角色会不会主动开口 → 生成开场白 → 写一段第一人称自我介绍。每一步都是「请求在上、结果在下」。</p>
    <div class="导读" style="margin:0 0 14px;max-width:none">
      <p><b>关于模型名：</b>提示词参数里写的是路由别名（如 nex-n2.6），卡片上标的是这次实际落到的大模型（如 amd/DeepSeek-V4.1-Flash）。同一个别名每次可能路由到不同成员，所以名字对不上是正常的。</p>
      <p><b>关于耗时：</b>能从日志取到真实耗时的显示毫秒数，取不到就标「耗时未记录」，不会补假数字。</p>
    </div>
    ${参数块}
    ${阶段卡}
  </div>`
}

const 媒体目录 = path.join(后端根, 'uploads', 'media')

function 读头像base64(哈希) {
  if (!哈希) return null
  const 文件 = path.join(媒体目录, 哈希.slice(0, 2), 哈希)
  if (!fs.existsSync(文件)) return null
  try {
    const 字节 = fs.readFileSync(文件)
    return { 数据: 字节.toString('base64'), 大小KB: Math.round(字节.length / 1024) }
  } catch {
    return null
  }
}

function 提取哈希(路径值) {
  const 匹配 = String(路径值 || '').match(/([0-9a-f]{64})/)
  return 匹配 ? 匹配[1] : null
}

function 生成头像区(库) {
  if (!库) return ''
  const 哈希 = 提取哈希(库.头像)
  const 图 = 读头像base64(哈希)
  const 描述 = 库.头像描述 || ''
  const 基调 = 库.情绪基调 || '—'
  const 版本 = 库.头像版本
  const 变更时间 = 库.头像变更时间
  const 图块 = 图
    ? `<img class="头像图" src="data:image/png;base64,${图.数据}" alt="${转义(库.角色名)} 的头像">`
    : `<div class="头像缺">头像文件未找到</div>`
  return `<div class="头像区">
    <div class="头像左">${图块}</div>
    <div class="头像右">
      <h4>${转义(库.角色名 || '')} 的 AI 头像</h4>
      <dl class="脑行"><dt>头像描述</dt><dd>${转义(描述 || '待补充')}</dd></dl>
      <dl class="脑行"><dt>情绪基调</dt><dd>${转义(基调)}</dd></dl>
      <dl class="脑行"><dt>演化版本</dt><dd>第 ${转义(版本 ?? '—')} 版${变更时间 ? '（最后变动 ' + 转义(String(变更时间).slice(11, 19)) + '）' : ''}</dd></dl>
      <dl class="脑行"><dt>图片规格</dt><dd>${图 ? 转义(图.大小KB) + ' KB 原图，非 emoji' : '待补充'}</dd></dl>
      <dl class="脑行"><dt>生成方式</dt><dd>风格库匹配画风 + 年龄气质转译成提示词 → 文生图模型出图 → 按心情基调演化换图</dd></dl>
    </div>
  </div>`
}

function 生成模型职责区() {
  const 模型 = [
    {
      名称: 'BAAI/bge-m3',
      类别: '文本向量化（嵌入）',
      作用: '把一句中文变成一串数字（向量），用距离判断两句话意思像不像。',
      用在哪: '表情包语义检索',
      细节: '用户发「笑死我了」，系统把这句话转成向量，再去 4094 张表情包的向量里按余弦距离找最贴近的那几张，而不是靠关键词硬匹配。项目当前实际加载的是更小的 bge-small-zh-v1.5（512 维，存本地 .models 目录，离线跑），bge-m3 是同门更大的版本。',
    },
    {
      名称: 'FunAudioLLM/CosyVoice2-0.5B',
      类别: '语音合成（TTS）',
      作用: '把文字回复杂成真人语音发出去。',
      用在哪: '角色发语音条',
      细节: '按角色的 voice_id（如 male-qn-chenqing）选音色。是否转语音由好感阶段和策略共同决定，走的是「首段出口判定一次」的链路。',
    },
    {
      名称: 'Kwai-Kolors/Kolors',
      类别: '文生图',
      作用: '按文字描述画出一张图。',
      用在哪: '角色头像生成与演化',
      细节: '头像风格库按年龄/气质/爱好匹配画风，再拼成提示词交给 Kolors 出图，存成 1024×1024 级 PNG。角色心情变化时会重新生成（头像演化），每局最多演化 2 次。',
    },
  ]
  const 行 = 模型
    .map(
      (项) => `<div class="模型卡">
      <div class="模型头"><span class="模型名">${转义(项.名称)}</span><span class="签">${转义(项.类别)}</span></div>
      <dl class="脑行"><dt>干什么的</dt><dd>${转义(项.作用)}</dd></dl>
      <dl class="脑行"><dt>用在哪</dt><dd>${转义(项.用在哪)}</dd></dl>
      <dl class="脑行"><dt>细节</dt><dd>${转义(项.细节)}</dd></dl>
    </div>`,
    )
    .join('')
  return `<section class="节" id="模型职责">
    <div class="节头"><h2>三个辅助模型各自在干什么</h2><span class="右">头像 / 语音 / 表情检索</span></div>
    <p class="说明">除了写对话的大语言模型，项目还用了三个专用模型。它们不是聊天的，各管一件事。</p>
    ${行}
  </section>`
}

function 生成局(链路, 序号, 库, 创建) {
  const 明细 = 链路?.轮次明细 || []
  if (!明细.length) return ''
  const 标题 = 链路.局 === 'E局' ? 'E 局 · 男生追男生（外向型）' : 'I 局 · 女生遇到渣男型男生（内向型）'
  const 属性 = [
    库?.角色名 ? `角色 ${库.角色名}` : '',
    库?.MBTI || '',
    库?.是否渣型 ? '渣男型' : '认真型',
    库?.性别 === 'nan' ? '男' : 库?.性别 === 'nv' ? '女' : '',
    库?.好感度当前?.关系阶段 ? `阶段 ${库.好感度当前.关系阶段}` : '',
    库?.好感度当前?.总分 != null ? `好感 ${库.好感度当前.总分}` : '',
  ].filter(Boolean)
  const 关系卡 = 链路.人设自述
    ? `<div class="人设"><h3>TA 眼里你们俩是什么关系</h3><pre>${转义(链路.人设自述)}</pre></div>`
    : ''
  return `<section class="节" id="${序号}">
    <div class="节头"><h2>${转义(标题)}</h2><span class="右">${转义(链路.标签 || '')} · ${明细.length} 轮</span></div>
    <p class="说明">每一轮严格按真实调用顺序展开：<b style="color:var(--amber)">①你发的话</b> → <b style="color:var(--violet)">②导演想清楚怎么回</b> → <b style="color:var(--cyan)">③写手把回复写出来</b> → <b style="color:var(--green)">④好感度打分</b> → <b style="color:var(--amber)">⑤安全审核与四鉴</b>。每一步都是「发给 AI 的请求在上（可展开看原文）、AI 的结果在下（直接显示）」。</p>
    <div class="属性">${属性.map((项) => `<span class="签">${转义(项)}</span>`).join('')}</div>
    ${生成头像区(库)}
    ${关系卡}
    ${生成角色创建区(创建)}
    <div class="标 发" style="font-size:13px;margin:26px 0 10px">${明细.length} 轮对话的完整链路</div>
    ${明细.map((轮, 序) => 生成轮卡(轮, 序)).join('')}
  </section>`
}

function 生成测速(测速) {
  if (!测速?.排名?.length) return ''
  const 行 = 测速.排名
    .map((项) => {
      const 百分比 = Math.round((Number(项.成功率) || 0) * 100)
      const 平均 = 项.平均耗时毫秒 == null ? '不可用' : 项.平均耗时毫秒 + ' ms'
      return `<tr><td>${项.名次}</td><td class="等宽">${转义(项.模型)}</td>
        <td>${转义(平均)}</td><td>${项.请求次数}</td><td>${百分比}%</td>
        <td><span class="态 ${态类(Number(项.成功率) || 0)}">${百分比 >= 80 ? '稳定' : 百分比 >= 40 ? '波动' : '不可用'}</span></td></tr>`
    })
    .join('')
  const 稳定 = 测速.排名.filter((项) => (Number(项.成功率) || 0) >= 0.8).length
  const 最快 = 测速.排名.find((项) => 项.平均耗时毫秒 != null)
  return `<section class="节" id="模型速度">
    <div class="节头"><h2>模型响应速度实测</h2><span class="右">每个模型测 ${测速.每模型请求次数} 次，共 ${测速.模型总数} 个</span></div>
    <p class="说明">对 magpie「玄锐暮-Magpie和我恋爱吧模型路由组」全部 20 个成员，每个都发同样次数的真实请求，记录每次耗时。下表就是「谁快用谁」的判断依据。</p>
    <div class="概览" style="margin:0 0 16px">
      <div><b>${稳定}</b><span>成功率 ≥80%</span></div>
      <div><b>${测速.模型总数}</b><span>参测模型</span></div>
      <div><b>${转义(最快?.平均耗时毫秒 ?? '—')}</b><span>最快平均耗时（毫秒）</span></div>
    </div>
    <div class="壳"><table>
      <tr><th>名次</th><th>模型</th><th>平均耗时</th><th>请求次数</th><th>成功率</th><th>判定</th></tr>
      ${行}
    </table></div>
    <div class="提醒">成功率低于 40% 的模型会让回复变慢甚至卡住。建议把竞速池收敛到成功率 80% 以上的模型，减少用户等待。</div>
  </section>`
}

function 生成缺陷(缺陷) {
  const 卡 = 缺陷
    .map(
      (项) => `<div class="折"><details>
      <summary>${转义(项.编号 + '：' + 项.标题)}　<span style="color:var(--dim);font-weight:400">［${转义(项.性质)}］</span></summary>
      <div class="内">现象
${转义(项.现象)}

日志证据
${转义(项.证据)}

根因
${转义(项.根因)}

怎么修的
${转义(项.修复)}</div>
    </details></div>`,
    )
    .join('')
  return `<section class="节" id="问题">
    <div class="节头"><h2>发现的问题与根因</h2><span class="右">产品缺陷 ${缺陷.filter((项) => 项.性质 === '产品缺陷').length} 个</span></div>
    <p class="说明">每条都带日志原文当证据。产品缺陷修的是根因不是表面症状；脚本和环境的问题单独标注，不算产品回归。</p>
    ${卡}
  </section>`
}

const 交互脚本 = `
function 复制文本(值, 元素){
  var 完成=function(){元素.classList.add('已复制');var 旧=元素.textContent;元素.textContent='已复制';setTimeout(function(){元素.classList.remove('已复制');元素.textContent=旧},1100)};
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(值).then(完成).catch(function(){回退()})}else{回退()}
  function 回退(){var t=document.createElement('textarea');t.value=值;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');完成()}catch(e){}document.body.removeChild(t)}
}
document.addEventListener('click',function(e){
  var t=e.target.closest?e.target.closest('.trace'):null;
  if(t){e.preventDefault();e.stopPropagation();复制文本(t.getAttribute('data-trace')||t.textContent,t)}
});
var 打印前状态=[];
window.addEventListener('beforeprint',function(){打印前状态=[];document.querySelectorAll('details').forEach(function(d,i){打印前状态[i]=d.open;d.open=true})});
window.addEventListener('afterprint',function(){document.querySelectorAll('details').forEach(function(d,i){if(!打印前状态[i])d.open=false})});
`

function 主流程() {
  const 运行标识 = 选定运行标识()
  const E链 = 读JSON(path.join(链路目录, `完整链路-${运行标识}-E局.json`))
  const I链 = 读JSON(path.join(链路目录, `完整链路-${运行标识}-I局.json`))
  const E创建 = 读JSON(path.join(链路目录, `角色创建-${运行标识}-E局.json`))
  const I创建 = 读JSON(path.join(链路目录, `角色创建-${运行标识}-I局.json`))
  const 测速 = 找最新测速()
  const 库 = 读JSON(path.join(数据目录, `数据库补齐-${运行标识}.json`))
  const E库 = 库?.局?.E局 || null
  const I库 = 库?.局?.I局 || null

  const 缺陷 = [
    {
      编号: '缺陷 1',
      标题: '审核模型把键名拼错，整个角色创建被判失败',
      现象: '创建角色时偶尔返回「资料未通过检查」，同样的资料再提交一次又通过了。',
      证据: '日志里审核模型的原始输出把 zong_pan_ding 写成了 zong_pan_duing（多了个 u）。代码按正确键名去读，读不到，就当成审核不通过。',
      根因: '解析审核结果太死板：模型只要拼错一个字母，即使意思明确是通过，整份结果也作废。',
      修复: '解析阶段把键名里的 duing 统一纠正成 ding（只改键名不改内容），补了 10 个测试，先复现失败再验证通过。',
      性质: '产品缺陷',
    },
    {
      编号: '缺陷 2',
      标题: '同一句话先发文字，10 秒后又发一遍语音',
      现象: '对话框里同一句话冒出两次，看起来像 AI 复读。',
      证据: '两条消息 ID 不同但来自同一轮：一条是文字（07:26:12），一条是语音（07:26:22），内容一字不差。',
      根因: '语音是独立分支：文字全部发完后，又拿第一条回复合成语音再推一遍，同一内容走了两个出口；语音分支还没走送达去重。',
      修复: '删掉「文字发完再补语音」；语音只在第一条出口判定一次并纳入送达去重；语音任一步失败回落成文字。补了 7 个测试。修复后重跑验证局，同角色重复内容组数为 0。',
      性质: '产品缺陷',
    },
    {
      编号: '问题 1',
      标题: '境外测试号注册被拒',
      现象: '用 +447700900xxx 注册返回「只认大陆手机号」。',
      证据: 'libphonenumber-js 判定这个号无效——07700 900xxx 是英国专门给影视剧用的虚构号段。',
      根因: '测试脚本选错了号段，产品对境外号的放行逻辑本身是对的。',
      修复: '换成真实有效的 +447400000xxx，实测 1000 个尾号全部有效。',
      性质: '脚本问题',
    },
    {
      编号: '问题 2',
      标题: '连续十几轮被限流挡回',
      现象: 'I 局从第 3 轮起连续返回「操作过于频繁」。',
      证据: '聊天限流是 60 秒内最多 30 次请求；脚本每轮要发消息+轮询+读好感度共 5 次以上，失败后不等待，很快超了。',
      根因: '脚本请求太密，不像真人节奏，触发限流是产品该有的保护。',
      修复: '给脚本加了 700 毫秒请求间隔和 429 退避重试，之后没再触发。',
      性质: '脚本问题',
    },
    {
      编号: '问题 3',
      标题: '刚回复完就读好感度，读到的是 0',
      现象: '每轮发完消息立刻读好感度变化，经常全是 0。',
      证据: '数据库里好感度记录是完整的，只是评估在 AI 回复之后异步写入，脚本读早了。',
      根因: '读取时机不对，不是数据丢了。',
      修复: '新增了直接从数据库取真实数据的脚本，报告数字都以数据库为准。',
      性质: '脚本问题',
    },
  ]

  const 概览 = `<div class="概览">
    <div><b>${(E链?.总轮次 || 0) + (I链?.总轮次 || 0)}</b><span>总对话轮次</span></div>
    <div><b>${转义(E库?.好感度当前?.总分 ?? '—')}</b><span>E 局最终好感</span></div>
    <div><b>${转义(I库?.好感度当前?.总分 ?? '—')}</b><span>I 局最终好感</span></div>
    <div><b>${(E库?.表情消息条数 || 0) + (I库?.表情消息条数 || 0)}</b><span>表情包使用</span></div>
    <div><b>${缺陷.filter((项) => 项.性质 === '产品缺陷').length}</b><span>修掉的产品缺陷</span></div>
  </div>`

  const 页 = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>和我恋爱吧 · 真实对话测试报告</title>
<style>${样式}</style></head>
<body>
<div class="顶">
  <b>和我恋爱吧 · 真实对话测试</b>
  <nav>
    <a href="#概览">概览</a><a href="#E局">E 局</a><a href="#I局">I 局</a>
    <a href="#模型速度">模型速度</a><a href="#模型职责">辅助模型</a><a href="#问题">问题与修复</a>
  </nav>
</div>
<div class="身">
  <header class="头" id="概览">
    <h1>两个真实用户的 ${(E链?.总轮次 || 0) + (I链?.总轮次 || 0)} 轮聊天</h1>
    <p>真实注册、真实建角色、真实发消息，全程走本地接口，模型统一走本地 magpie 快组（20 个模型谁先返回用谁）。每一轮按真实调用顺序展开，先看发给 AI 的完整请求，再看 AI 返回的结果。</p>
    <div class="导读" style="border-color:rgba(251,191,36,.28)">
      <h3>本轮测试范围说明</h3>
      <p>E 局（外向男男）跑满 <b>${E链?.总轮次 || 0} 轮</b>；I 局（渣男）跑到第 <b>${I链?.总轮次 || 0} 轮</b> 时按你的要求中途停止，因此 I 局不是满 20 轮的完整数据，结局未触发。两局数据均为真实接口调用与数据库落库结果，无人工改分、无伪造。</p>
    </div>
    <div class="导读">
      <h3>先看这里 · 好感度初始值是怎么回事</h3>
      <p>角色创建时，系统<b>已经按人设给好感度设了非零初始值</b>：外向型 450~500、内向型 300~370，渣型再额外 +200~300。这个初始值玩家看不到，也不会显示在聊天界面里。</p>
      <p>你在报告里看到的四维数字，是<b>从 0 开始记的本局聊天增量</b>——每轮由 AI 评一次、累加起来的「这一局聊下来加了多少」，不是角色心里的绝对好感总分。早期测试里读到「初始分全是 0」，是因为 AI 回复后好感评分是异步写入的，脚本读得太早；现在报告里的数字都取自数据库落库结果，以数据库为准。</p>
    </div>
    ${概览}
  </header>
  ${生成局(E链, 'E局', E库, E创建)}
  ${生成局(I链, 'I局', I库, I创建)}
  ${生成测速(测速)}
  ${生成模型职责区()}
  ${生成缺陷(缺陷)}
  <footer class="脚">
    数据来自本地真实接口调用与数据库落库结果 · trace_id 可点击复制 · 打印时会自动展开全部请求原文<br>
    全程本地运行，不访问服务器；模型调用属于项目本身行为
  </footer>
</div>
<script>${交互脚本}</script>
</body></html>`

  fs.mkdirSync(数据目录, { recursive: true })
  fs.writeFileSync(报告路径, 页, 'utf8')
  console.log(`[报告] ${报告路径}（${(fs.statSync(报告路径).size / 1024 / 1024).toFixed(2)} MB）`)
  console.log(`[报告] E局 ${E链?.总轮次 || 0} 轮，I局 ${I链?.总轮次 || 0} 轮`)
}

主流程()
