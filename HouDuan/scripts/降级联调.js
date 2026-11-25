process.env.XU_KE_ZHEN_SHI_WAI_HU = 'true'
process.env.NODE_ENV = 'development'
process.env.MO_XING_LU_YOU_GONG_JU = 'nex-kilo'
process.env.ZHU_MO_XING_JI_CHU_URL = 'https://api.mosi.cn'
process.env.ZHU_MO_XING_API_KEY = 'sk-gu-yi-cuo-wu'
process.env.ZHU_MO_XING_NAME = 'nex-n2.6'
process.env.DEEPSEEK_FALLBACK_BASE_URL = 'https://api.kilo.ai/api/gateway/v1'
process.env.DEEPSEEK_FALLBACK_API_KEY = (require('fs').readFileSync('../HouDuan/.env', 'utf8').match(/DEEPSEEK_FALLBACK_API_KEY=(.*)/) || [])[1]?.trim() || ''

const { chuShiHuaMoXingLuYou } = require('../dist/services/模型路由')
const { 按配置调用 } = require('../dist/utils/通用模型调用')

;(async () => {
  chuShiHuaMoXingLuYou()
  const jieGuo = await 按配置调用('DaoYan', [{ jiaoSe: 'user', neiRong: '只回复两个字：收到' }])
  console.log('降级后回复:', jieGuo.neiRong)
  process.exit(0)
})().catch((e) => { console.error('ERR', String(e).slice(0, 400)); process.exit(1) })
