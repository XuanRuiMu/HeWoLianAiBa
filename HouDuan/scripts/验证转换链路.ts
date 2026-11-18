import { zhuanHuanYuanShengBiaoQing } from '../src/services/贴纸标记'
import { 按短名查 } from '../src/services/表情包库'
import { yuanShengBiaoQingLuJing, 构建原生表情条目 } from '../src/services/原生表情库'
import { statSync } from 'fs'

async function main() {
  const out = zhuanHuanYuanShengBiaoQing('哈哈 [微笑] 测试')
  console.log('converted: ' + out)
  const lu = yuanShengBiaoQingLuJing('微笑')
  console.log('path: ' + lu)
  try { console.log('stat size: ' + statSync(lu!).size) } catch (e) { console.log('stat err: ' + e) }
  const tiaoMu = 构建原生表情条目('微笑')
  console.log('tiaoMu: ' + JSON.stringify(tiaoMu))
  const one = await 按短名查('wx_微笑')
  console.log('lookup: ' + JSON.stringify(one && one.duanMing))
  process.exit(0)
}

void main()
