import { gouJianWriterPrompt } from '../src/services/Prompt构建器'
import { shengChengJiaoSe } from '../src/services/角色生成'
import { gouJianJiaoSeShangXiaWen } from '../src/config/AI参数策略'

const jiaoSe = shengChengJiaoSe('renShi', 'ISFP')
const 世界 = gouJianJiaoSeShangXiaWen(jiaoSe)
const shuRu: Parameters<typeof gouJianWriterPrompt>[0] = { ...世界, jiao_se: jiaoSe, yong_hu_xin_xiao_xi: '嗯嗯', dui_hua_li_shi: [], hao_gan_du: 30, shi_fou_di_yi_lun: false }
process.env.ZS_YU_TAI = 'lingQi'
const p = gouJianWriterPrompt(shuRu)
const i = p.indexOf('【这一轮你就这样回】')
console.log('指令是否在最终提示里：', i >= 0)
if (i >= 0) console.log(p.slice(i, i + 120))
console.log('\n提示总长：', p.length)
