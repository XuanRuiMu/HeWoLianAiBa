import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  db: { query: vi.fn(), connect: vi.fn() },
  client: { query: vi.fn(), release: vi.fn() },
  message: { huiHuaXiaoXiSuoJian: vi.fn(() => '锁键'), shiXiaoXiaoXiZongShuHuanCun: vi.fn(async () => undefined) },
  block: { qingLiLuoKuKuai: vi.fn(() => []), shiTuWenHunPaiKuai: vi.fn(() => false) },
  document: { buQiWenJianTiQuWenBen: vi.fn(async (rows: unknown[]) => rows) },
  debug: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../消息', () => ({ huiHuaXiaoXiSuoJian: 假.message.huiHuaXiaoXiSuoJian, shiXiaoXiaoXiZongShuHuanCun: 假.message.shiXiaoXiaoXiZongShuHuanCun }))
vi.mock('../消息内容块', () => ({ qingLiLuoKuKuai: 假.block.qingLiLuoKuKuai, shiTuWenHunPaiKuai: 假.block.shiTuWenHunPaiKuai }))
vi.mock('../文档文本提取', () => ({ buQiWenJianTiQuWenBen: 假.document.buQiWenJianTiQuWenBen }))
vi.mock('../../utils/debug日志', () => ({ jiLuXiaoXiCaoZuo: vi.fn(), debug日志: 假.debug }))

import { baoCunJiaoSeXiaoXi, huoQuAIJiaoSeXinXi, huoQuJiaoSeHuiFuYanChiHaoMiao, huoQuJiaoSeIELeiXing, huoQuZuiJinDuiHuaLiShi } from '../AI输入准备'

beforeEach(() => {
  vi.clearAllMocks()
  假.db.query.mockResolvedValue({ rows: [] })
  假.db.connect.mockResolvedValue(假.client)
  假.client.query.mockResolvedValue({ rows: [] })
  假.client.release.mockReturnValue(undefined)
  假.message.shiXiaoXiaoXiZongShuHuanCun.mockResolvedValue(undefined)
  假.block.qingLiLuoKuKuai.mockReturnValue([])
  假.block.shiTuWenHunPaiKuai.mockReturnValue(false)
  假.document.buQiWenJianTiQuWenBen.mockImplementation(async (rows: unknown[]) => rows)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AI输入准备业务分支', () => {
  it('角色查询覆盖缺失、默认值、JSON 世界信息和媒体字段', async () => {
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(huoQuJiaoSeIELeiXing('角色')).resolves.toBeNull()
    假.db.query.mockResolvedValueOnce({ rows: [{ IE类型: 'E' }] })
    await expect(huoQuJiaoSeIELeiXing('角色')).resolves.toBe('E')
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(huoQuJiaoSeHuiFuYanChiHaoMiao('角色')).resolves.toBeGreaterThan(0)
    假.db.query.mockResolvedValueOnce({ rows: [{ 回复延迟毫秒: 0 }] })
    await expect(huoQuJiaoSeHuiFuYanChiHaoMiao('角色')).resolves.toBeGreaterThan(0)
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(huoQuAIJiaoSeXinXi('角色')).resolves.toBeNull()
    假.db.query.mockResolvedValueOnce({ rows: [{ 名字: '名字', 性别: 'nv', 世界信息: '{"地点":"北京"}', MBTI: 'ENFP', IE类型: 'E', 热身类型: '快热', 年龄: 'bad', 是否渣型: true, 话术: ['话术'], 媒体: '' }] })
    const 角色 = await huoQuAIJiaoSeXinXi('角色')
    expect(角色).toMatchObject({ ming_zi: '名字', xing_bie: 'nv', mbti_lei_xing: 'ENFP', nian_ling: 20, shi_jie_xin_xi: { 地点: '北京' }, zha_fa_miao_shu: '' })
  })

  it('历史读取覆盖发送者、媒体类型、视频文件、引用和文档补全', async () => {
    假.db.query.mockResolvedValueOnce({ rows: [
      { ID: '2', 发送者: 'jiaose', 角色名: '角色', 内容: '回复', 创建时间: '2024-01-01T10:01:00Z', 媒体类别: 'tupian', 媒体SHA256: 'ABC', 媒体MIME: 'image/png', 媒体时长毫秒: 1000, 媒体原始文件名: 'a.png', 媒体ID: '媒体', 对话总条数: 2, 被引用消息ID: '1' },
      { ID: '1', 发送者: 'yonghu', 内容: '你好', 创建时间: '2024-01-01T10:00:00Z' },
    ] })
    假.block.qingLiLuoKuKuai.mockReturnValueOnce([{ type: 'input_text', text: '文字' }])
    假.block.shiTuWenHunPaiKuai.mockReturnValue(true)
    const 历史 = await huoQuZuiJinDuiHuaLiShi('用户', '角色', 2)
    expect(历史[0]).toMatchObject({ id: '1', fa_song_zhe_lei_xing: 'yonghu', nei_rong: '你好' })
    expect(历史[1]).toMatchObject({ id: '2', fa_song_zhe_lei_xing: 'jiaose', meiTiSha256: 'abc', beiYongXiaoXiId: '1', tuWenHunPai: true })
    假.db.query.mockResolvedValueOnce({ rows: [{ ID: '3', 发送者: 'xitong', 内容: '文件', 创建时间: '2024-01-01T10:02:00Z', 媒体类别: 'wenjian', 媒体MIME: 'video/mp4', 媒体原始文件名: 'a.mp4' }] })
    await expect(huoQuZuiJinDuiHuaLiShi('用户', '角色')).resolves.toHaveLength(1)
    expect(假.document.buQiWenJianTiQuWenBen).toHaveBeenCalled()
  })

  it('保存角色消息覆盖事务成功、回滚重试、冲突和最终失败', async () => {
    假.client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT COALESCE')) return { rows: [{ zui_da: 1 }] }
      if (sql.includes('INSERT INTO "消息"')) return { rows: [{ ID: '消息', 内容: '内容', 类型: 'wenben', 创建时间: '2024-01-01T00:00:00Z', 已读: true, 客户端序号: 2 }] }
      return { rows: [] }
    })
    await expect(baoCunJiaoSeXiaoXi({ yong_hu_id: '用户', jiao_se_id: '角色', nei_rong: '内容' })).resolves.toMatchObject({ id: '消息', fa_song_zhe_lei_xing: 'jiaose' })
    假.client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT pg_advisory')) return { rows: [] }
      if (sql.includes('SELECT COALESCE')) return { rows: [{ zui_da: 1 }] }
      if (sql.includes('INSERT INTO "消息"')) throw Object.assign(new Error('冲突'), { code: '23505', constraint: '客户端序号' })
      return { rows: [] }
    })
    vi.useFakeTimers()
    const 保存 = baoCunJiaoSeXiaoXi({ yong_hu_id: '用户', jiao_se_id: '角色', nei_rong: '内容' })
    const 断言 = expect(保存).rejects.toThrow('冲突')
    await vi.runAllTimersAsync()
    await 断言
    vi.useRealTimers()
  })
})
