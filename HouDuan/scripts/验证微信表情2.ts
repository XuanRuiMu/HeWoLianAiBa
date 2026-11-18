import { 候选系统表情 } from '../src/services/表情包库'

async function main() {
  const guoLv = { yunXuFengGe: ['黄脸', '祝福', '日常', '梗图'], guanXiJieDuanXuHao: 3 }
  for (const qingXu of ['无语', '好笑', '撒娇']) {
    const list = await 候选系统表情(qingXu, 8, guoLv)
    const wx = list.filter((x) => x.duanMing.startsWith('wx_'))
    console.log(`情绪=${qingXu} n=${list.length} wx=${wx.length} : ${wx.map((x) => x.duanMing).join(', ')}`)
  }
  process.exit(0)
}

void main()
