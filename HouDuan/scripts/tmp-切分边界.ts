import { qieFenTieZhi } from '../src/services/贴纸标记'
const cases = [
  '好啊[贴纸:wx_微笑]你这个提议真不错[贴纸:wx_爱心]',
  '[贴纸:wx_微笑]',
  '[贴纸:wx_微笑][贴纸:wx_爱心]',
  '[微笑]你好[贴纸:狗头]',
]
for (const c of cases) console.log(JSON.stringify(c), '=>', JSON.stringify(qieFenTieZhi(c)))
process.exit(0)
