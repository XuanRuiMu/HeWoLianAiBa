import { describe, it, expect, vi } from 'vitest'
import { shenHeNeiRongAnQuan } from '../安全审核'
import { jiaZaiZuiXinCiKu } from '../审核词库'

/**
 * 修复口径守卫：词库缺失（即本次 500 的根因场景）时，内容审核入口必须抛错，
 * 由路由按异常处理回可读错误——不得为了「让聊天能用」而静默跳过本地词库扫描。
 * 真修法是把资源随产物打包（见 scripts/__tests__/构建资源打包.test.ts）。
 */

vi.mock('../审核词库', () => ({
  jiaZaiZuiXinCiKu: vi.fn(async () => {
    throw new Error('ENOENT: no such file or directory, scandir dist/config/审核词库')
  }),
  saoMiaoNeiRong: vi.fn(() => ({ weiGui: false })),
  huoQuCiKuMuLu: vi.fn(() => 'dist/config/审核词库'),
}))

describe('内容审核在词库不可用时 fail-closed', () => {
  it('词库加载抛错时审核入口继续抛出，不返回「无违规」', async () => {
    await expect(shenHeNeiRongAnQuan('今天天气不错')).rejects.toThrow(/ENOENT/)
    expect(jiaZaiZuiXinCiKu).toHaveBeenCalled()
  })
})
