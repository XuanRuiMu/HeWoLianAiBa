import fs from 'node:fs'
import { 按短名查, 短名转UUID } from '../src/services/表情包库'
import { qieFenTieZhi } from '../src/services/贴纸标记'

async function main() {
  const yuan = '好啊[微笑]你这个提议真不错[爱心]'
  console.log('用户原文:', yuan)
  for (const duan of qieFenTieZhi(yuan)) {
    console.log('段:', duan.leiXing, JSON.stringify(duan.neiRong))
    if (duan.leiXing === 'tupian') {
      const t = await 按短名查(duan.neiRong)
      console.log('  查库:', t ? ('duanMing=' + t.duanMing + ' exists=' + fs.existsSync(t.wenJianLuJing) + ' uuid=' + 短名转UUID(t.duanMing)) : 'null')
    }
  }
  process.exit(0)
}
void main()
