import { 语义候选 } from '../../src/services/语义表情检索'
import { 按短名查 } from '../../src/services/表情包库'

const 查询 = [
  '领导刚刚夸我了！我心情好到飞起',
  '我要睡了，晚安啦，明天见',
  '你这么懂我，抱抱你',
  '没什么可说的了，随便敷衍一下',
  '你真是个傻子',
  '听说周末要加班',
  '我想你了',
  '不要太难过，我现在也很难受',
  '这瓜保熟吗？',
  '给我发个奶龙的表情',
  '哈哈哈哈哈笑死我了',
  '被人骂了，好生气',
]
async function main(): Promise<void> {
  for (const query of 查询) {
    try {
      const rows = await 语义候选({ query, yunXuFengGe: ['黄脸','祝福','日常','梗图'], guanXiJieDuanXuHao: 6, renSheQiZhi: ['沙雕搞怪', '可爱萌系', '温柔治愈', '正经严肃'], shuLiang: 8, excludeDuanMing: [] })
      const records = await Promise.all(rows.slice(0, 8).map(async (x) => ({ name: x.duanMing, file: x.wenJianLuJing, exists: (await 按短名查(x.duanMing))?.duanMing === x.duanMing, emotion: x.qingXuBiaoQian })))
      console.log(JSON.stringify({ query, count: rows.length, records }))
    } catch (err) {
      console.log(JSON.stringify({ query, error: String(err) }))
    }
  }
  process.exit(0)
}
void main()
