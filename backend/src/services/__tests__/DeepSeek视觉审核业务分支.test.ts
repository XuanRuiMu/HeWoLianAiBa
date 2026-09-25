import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SHEN_HE_WEI_GUI_LEI_BIE } from '../../config/媒体配置'

const 假 = vi.hoisted(() => ({ db: { query: vi.fn() }, ai: vi.fn(), debug: { error: vi.fn() } }))
vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../utils/DeepSeek客户端', () => ({ genJuPeiZhiTiaoYong: 假.ai }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import { shenHeTuPianAnQuan } from '../DeepSeek视觉审核'

const leiBie = SHEN_HE_WEI_GUI_LEI_BIE[0]

beforeEach(() => {
  vi.clearAllMocks()
  假.db.query.mockResolvedValue({ rows: [] })
  假.ai.mockResolvedValue({ neiRong: JSON.stringify({ 违规: true, 确信度: 0.95, 类型: leiBie, 严重程度: '严重', 理由: '命中' }) })
})

describe('DeepSeek视觉审核业务分支', () => {
  it('缓存命中直接返回，文件失败和缓存故障均安全降级', async () => {
    假.db.query.mockResolvedValueOnce({ rows: [{ wei_gui: true, lei_xing: leiBie, li_you: '缓存', yan_zhong_cheng_du: 'yan_zhong' }] })
    await expect(shenHeTuPianAnQuan(__filename)).resolves.toMatchObject({ wei_gui: true, li_you: '缓存' })
    await expect(shenHeTuPianAnQuan('不存在.png')).resolves.toMatchObject({ wei_gui: true, lei_xing: '系统错误' })
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await expect(shenHeTuPianAnQuan(__filename)).resolves.toMatchObject({ wei_gui: true, lei_xing: leiBie })
  })

  it('AI JSON、嵌入JSON、非法严重度和调用异常覆盖解析与写缓存', async () => {
    await expect(shenHeTuPianAnQuan(__filename)).resolves.toMatchObject({ wei_gui: true, yan_zhong_cheng_du: 'yan_zhong' })
    假.ai.mockResolvedValueOnce({ neiRong: '前缀 {"违规":false,"确信度":0.2,"类型":"","严重程度":"轻微"} 后缀' })
    await expect(shenHeTuPianAnQuan(__filename)).resolves.toMatchObject({ wei_gui: false, yan_zhong_cheng_du: 'qing_wei' })
    假.ai.mockResolvedValueOnce({ neiRong: '没有JSON' })
    await expect(shenHeTuPianAnQuan(__filename)).resolves.toMatchObject({ wei_gui: false })
    假.db.query.mockRejectedValueOnce(new Error('写缓存失败'))
    假.ai.mockRejectedValueOnce(new Error('模型失败'))
    await expect(shenHeTuPianAnQuan(__filename)).resolves.toMatchObject({ wei_gui: true, lei_xing: '审核服务不可用' })
  })
})
