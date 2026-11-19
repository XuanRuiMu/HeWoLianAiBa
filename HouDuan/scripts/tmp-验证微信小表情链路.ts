import fs from 'node:fs'
import path from 'node:path'
import { zhuanHuanYuanShengBiaoQing, qieFenTieZhi } from '../src/services/贴纸标记'
import { 按短名查 } from '../src/services/表情包库'

async function main(): Promise<void> {
  const jianXian = '==== '

  console.log(jianXian + '1) zhuanHuanYuanShengBiaoQing 转换 ==== ')
  const yuanWen = '好啊[呲牙]你这个提议真不错[爱心]'
  const zhuanHuanHou = zhuanHuanYuanShengBiaoQing(yuanWen)
  console.log('输入:', yuanWen)
  console.log('输出:', zhuanHuanHou)
  const qiWang = '好啊[贴纸:wx_呲牙]你这个提议真不错[贴纸:wx_爱心]'
  console.log('期望:', qiWang)
  console.log('通过:', zhuanHuanHou === qiWang)
  const weiJi = zhuanHuanYuanShengBiaoQing('好啊[高兴]你这个提议真不错[点赞]')
  console.log('码表外名字[高兴][点赞]输出:', weiJi, '(应保持原样)')
  const danDu = zhuanHuanYuanShengBiaoQing('[微笑]')
  console.log('单独[微笑]输出:', danDu)

  console.log(jianXian + '2) qieFenTieZhi 切分 ==== ')
  const pianDuan = qieFenTieZhi(zhuanHuanHou)
  console.log('片段:', JSON.stringify(pianDuan))
  const tupian = pianDuan.filter((x) => x.leiXing === 'tupian').map((x) => x.neiRong)
  console.log('tupian 短名:', JSON.stringify(tupian))
  console.log('tupian 期望 [wx_呲牙, wx_爱心]:', JSON.stringify(tupian) === JSON.stringify(['wx_呲牙', 'wx_爱心']))

  console.log(jianXian + '3) 按短名查 wx_ 原生表情 ==== ')
  for (const duanMing of ['wx_呲牙', 'wx_爱心', 'wx_微笑']) {
    const tiaoMu = await 按短名查(duanMing)
    if (!tiaoMu) {
      console.log(duanMing, '=> 未命中(FAIL)')
      continue
    }
    const cunZai = fs.existsSync(tiaoMu.wenJianLuJing)
    console.log(
      duanMing,
      '=> duanMing=' + tiaoMu.duanMing,
      'mime=' + tiaoMu.mime,
      'ziJieShu=' + tiaoMu.ziJieShu,
      'wenJianLuJing=' + tiaoMu.wenJianLuJing,
      '文件存在=' + cunZai,
      cunZai ? 'PASS' : 'FAIL',
    )
    const zaiQianDuan = path.resolve(tiaoMu.wenJianLuJing).includes(path.resolve('..', 'QianDuan', 'public', 'wechat-emojis'))
    console.log('  路径在 QianDuan/public/wechat-emojis 下:', zaiQianDuan)
  }

  console.log(jianXian + '验证结束 ==== ')
  process.exit(0)
}

void main().catch((cuoWu) => {
  console.error('验证脚本异常:', cuoWu)
  process.exit(1)
})
