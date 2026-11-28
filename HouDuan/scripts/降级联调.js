process.env.XU_KE_ZHEN_SHI_WAI_HU = 'true'
process.env.NODE_ENV = 'development'
process.env.MAGPIE_MO_XING_CHI_JI_CHU = 'http://127.0.0.1:3425'
process.env.MAGPIE_MO_XING_CHI_MI_YAO = 'sk-magpie'
process.env.MAGPIE_MO_XING_CHI = 'group/magpie-3|1'

const { chuShiHuaMoXingLuYou } = require('../dist/services/模型路由')
const { 按配置调用 } = require('../dist/utils/通用模型调用')

;(async () => {
  chuShiHuaMoXingLuYou()
  const jieGuo = await 按配置调用('DaoYan', [{ jiaoSe: 'user', neiRong: '只回复两个字：收到' }])
  console.log('降级后回复:', jieGuo.neiRong)
  process.exit(0)
})().catch((e) => { console.error('ERR', String(e).slice(0, 400)); process.exit(1) })
