import { panChuFaLei, chouYuTai, quYuTaiZhiLing } from '../src/services/语态控制器'

const 样 = ['嗯嗯', '好滴！', '下次约', '有道理', '行啊', '对哈哈哈', '谢谢！！！', '吼', '还拉肚子吗',
  '啊 桐宇你说的是法国的活动吗', '或者五点的时候？不知道是不是你的饭点呀', '刚没在办公室看到你',
  '其实在会前我有提醒他，这是他熬夜到3点弄的功能']
for (const s of 样) console.log(panChuFaLei(s).padEnd(12), s)

const 计: Record<string, number> = {}
const N = 20000
for (let i = 0; i < N; i++) { const t = chouYuTai('刚没在办公室看到你'); 计[t] = (计[t] || 0) + 1 }
console.log('\n【fenXiang 抽样 N=' + N + '】', Object.entries(计).map(([k, v]) => k + ' ' + (100 * v / N).toFixed(1) + '%').join('  '))
const 计2: Record<string, number> = {}
for (let i = 0; i < N; i++) { const t = chouYuTai('嗯嗯'); 计2[t] = (计2[t] || 0) + 1 }
console.log('【chunYingDa 抽样】', Object.entries(计2).map(([k, v]) => k + ' ' + (100 * v / N).toFixed(1) + '%').join('  '))
console.log('\n指令样例：\n  ' + quYuTaiZhiLing('lingQi') + '\n  ' + quYuTaiZhiLing('jiDuan'))
