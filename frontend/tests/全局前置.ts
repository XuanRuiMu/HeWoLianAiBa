import { baoZhengCeShiZhangHao, daKaiJiaJuQingQiu } from './测试夹具'

const JI_CHU = process.env.PLAYWRIGHT_BASE_URL || process.env.E2E_FRONTEND_URL || 'http://localhost:5173'

/** 等 dev server 可应答：globalSetup 与 webServer 的先后顺序不由我们决定，不能赌 */
async function dengDaiYingDa(): Promise<void> {
  const dao = Date.now() + 90000
  let jiaGe = 500
  for (;;) {
    try {
      const xiangYing = await fetch(JI_CHU + '/', { method: 'GET' })
      if (xiangYing.ok) return
    } catch {
      /* 还没起来 */
    }
    if (Date.now() > dao) throw new Error(`e2e 前置：${JI_CHU} 在 90 秒内没有应答，dev server 未就绪`)
    await new Promise((jie) => setTimeout(jie, jiaGe))
    jiaGe = Math.min(jiaGe * 2, 4000)
  }
}

export default async function quanJuQianZhi(): Promise<void> {
  await dengDaiYingDa()
  const qingQiu = await daKaiJiaJuQingQiu()
  try {
    process.env.E2E_JIA_JU_SHEN_FEN = JSON.stringify(await baoZhengCeShiZhangHao(qingQiu))
  } finally {
    await qingQiu.dispose()
  }
}
