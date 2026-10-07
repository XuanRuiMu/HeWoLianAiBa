/**
 * 生成生产用的开场采样表（入库文件）——**2 字 token 版（v1）**。
 *
 * 为什么不用整句（v2 已实测证伪）：
 *  D+E1 生产探路（8 轮 × 2 臂，生产 Writer prompt）：
 *    2 字 prefix  6/8 语法崩坏（"我刚我也刚洗完" / "你怎怎么突然说这个"）
 *    整句 prefix  7/8 通顺
 *  但 v2 整句表实测只得到 **80 条**合格样本，内容是 "tr150粉色多少钱" / "神tm上街揣块砖"
 *  —— LCCC 是**微博评论区**而非 IM 私聊，2 字的边缘字符统计对领域不敏感所以能用，
 *  完整句子则暴露领域错配。详见 PROGRESS-模拟真人聊天.md §8.2。
 *
 * 口径：说话人 A（数组偶数下标）全部发言，取前 2 字（去分词空格），去重后按频次降序取 TOP200。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { zhengXi } from './语域口径.ts'

const N = 200
const ZI_SHU = 2

const hang = gunzipSync(readFileSync(new URL('./LCCC/lccc_base_valid.jsonl.gz', import.meta.url)))
  .toString('utf8').split('\n').filter((x) => x.trim().length > 0)

const ciShu = new Map<string, number>()
let faYanShu = 0
let heCha = 0
for (const x of hang) {
  const d = JSON.parse(x)
  if (!Array.isArray(d)) continue
  for (let i = 0; i < d.length; i += 2) {
    faYanShu += 1
    const yuanWen = zhengXi(String(d[i] || '').trim())
    if (yuanWen.length < ZI_SHU) continue
    const k = yuanWen.slice(0, ZI_SHU)
    // 前 2 字必须有汉字或字母：纯标点不得入选（prefix 会把它强制成首字）
    if (!/[\p{Script=Han}a-zA-Z]/u.test(k)) continue
    heCha += 1
    ciShu.set(k, (ciShu.get(k) || 0) + 1)
  }
}

const paiXu = [...ciShu.entries()].sort((a, b) => b[1] - a[1])
const biao = paiXu.slice(0, N)
const biaoZhong = biao.reduce((a, x) => a + x[1], 0)

// 权重归一化到万分比，误差补到最大项，确保合计精确 10000
const quanZhong = biao.map((x) => Math.round((x[1] / biaoZhong) * 10000))
const cha = 10000 - quanZhong.reduce((a, b) => a + b, 0)
if (cha !== 0) {
  let zuiDa = 0
  for (let i = 1; i < quanZhong.length; i++) if (quanZhong[i] > quanZhong[zuiDa]) zuiDa = i
  quanZhong[zuiDa] += cha
  if (quanZhong[zuiDa] <= 0) throw new Error('权重归一化后出现非正权重：「' + biao[zuiDa][0] + '」')
}
if (quanZhong.reduce((a, b) => a + b, 0) !== 10000) throw new Error('权重合计不等于 10000')

const biaoTi = {
  _banBen: 1,
  _shuoMing: '开场采样权重表（2 字 token 版）。供机制 D「候选开场」按真人经验分布采样，用作 Writer user 消息尾部附带的候选清单。',
  _laiYuan: 'LCCC-base-valid（thu-coai/CDial-GPT，silver/lccc）20,000 段微博真实对话的说话人 A（数组偶数下标）全部发言。',
  _tongJiFangFa: `取每条发言的前 ${ZI_SHU} 字（去分词空格后），排除前两字为纯标点的，按频次降序取 TOP${N}，权重归一化为万分比整数。`,
  _weiShenMeBuYongZhenJu: '整句 opener（v2）实测更通顺，但 LCCC 是微博评论区，整句表只有 80 条合格且内容是 "tr150粉色多少钱" 这类商品讨论，领域错配不可用。2 字的边缘字符统计对领域不敏感，故仍用 2 字。',
  _guanJiDangQianWenBen: '⚠️ 机制 B「assistant prefix 强制首字」已于 PROGRESS §10.1.1 实测证伪并作废（2 字 prefix 语义崩坏 6/8）。本表的现役用途是「候选开场」。',
  _xianZhe: 'LCCC 数据授权未在数据集卡片中表态（许可栏为 [Needs More Information]），此处只入库统计量、不入库原文。',
  _jiShu: { faYanShu, heCha, kuaiShu: ciShu.size },
  _shouYong: N,
  _fuHanLv: +((biaoZhong / heCha) * 100).toFixed(2),
  kaiChang: biao.map((x) => x[0]),
  quanZhong,
}

const out = JSON.stringify(biaoTi)
writeFileSync(new URL('../backend/src/config/开场采样表.json', import.meta.url), out, 'utf8')
console.log('已生成 backend/src/config/开场采样表.json（2 字版 v1）')
console.log('  ' + (out.length / 1024).toFixed(1) + ' KB | 发声 ' + faYanShu + ' → 合格 ' + heCha + ' → 去重 ' + ciShu.size + ' 种')
console.log('  TOP' + N + ' 覆盖 ' + biaoTi._fuHanLv + '% | 权重合计 ' + quanZhong.reduce((a, b) => a + b, 0))
console.log('  TOP30：' + biao.slice(0, 30).map((x) => x[0]).join(' '))