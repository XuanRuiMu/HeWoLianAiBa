import { 候选系统表情 } from '../src/services/表情包库'

async function main() {
  const list = await 候选系统表情('无语', 100)
  const wx = list.filter((x) => x.duanMing.startsWith('wx_'))
  console.log('total=' + list.length + ' wx=' + wx.length)
  console.log(list.slice(0, 5).map((x) => x.duanMing).join(', '))
  console.log(wx.slice(0, 8).map((x) => x.duanMing + ':' + x.qingXuBiaoQian).join(', '))
  process.exit(0)
}

void main()

