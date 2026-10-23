import { describe, it, expect, vi } from 'vitest'
import { shenHeNeiRongAnQuan } from '../安全审核'
import { jiaZaiZuiXinCiKu } from '../审核词库'


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
