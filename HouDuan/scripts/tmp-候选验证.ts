import fs from 'node:fs'
import path from 'node:path'
import { 候选系统表情, 按短名查, 初始化表情包库 } from '../src/services/表情包库'

async function main() {
  const muLu = path.resolve('..', '表情包')
  console.log('表情包目录存在:', fs.existsSync(muLu), muLu)
  const tiaoMuShu = await 初始化表情包库()
  console.log('索引条目数:', tiaoMuShu)
  const list = await 候选系统表情('好笑', 8)
  console.log('候选数:', list.length, list.map((x) => x.duanMing).join(','))
  for (const duanMing of ['wx_微笑', 'wx_爱心']) {
    const t = await 按短名查(duanMing)
    console.log(duanMing, '=>', t ? t.wenJianLuJing + ' exists=' + fs.existsSync(t.wenJianLuJing) : 'null')
  }
  process.exit(0)
}
void main()
