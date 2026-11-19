import crypto from 'node:crypto'
import { 短名转UUID } from '../src/services/表情包库'

function mingChengHash(mingCheng: string): string {
  return crypto.createHash('sha256').update('weixin-native:' + mingCheng, 'utf8').digest('hex')
}
for (const ming of ['微笑', '爱心', '呲牙']) {
  const sha = mingChengHash(ming)
  const uuid = 短名转UUID('wx_' + ming)
  console.log(ming, 'sha256=' + sha, 'mei_ti_id(uuid)=' + uuid)
}
process.exit(0)
