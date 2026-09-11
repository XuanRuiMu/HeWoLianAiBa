import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 数据库 } from '../数据库'
import {
  jiSuanShuaiJianBianHua,
  jiSuanSiWeiBianHuaHouDeZongFen,
  fenJieSiWei,
  gengXinHaoGanDu,
  type HaoGanDuSiWeiBianHua,
} from '../services/好感度'
import { pingPanHaoGanDuBianHua } from '../services/好感度评判'
import { HAO_GAN_DU_PEI_ZHI } from '../config/好感度配置'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'

vi.mock('../数据库')
vi.mock('../redis')
vi.mock('../socket/io')
vi.mock('../utils/DeepSeek客户端', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/DeepSeek客户端')>()),
  genJuPeiZhiTiaoYong: vi.fn(),
}))

function quanSiWeiBianHua(zhi: number): HaoGanDuSiWeiBianHua {
  return {
    xin_ren_du_bian_hua: zhi,
    qin_mi_du_bian_hua: zhi,
    qu_wei_du_bian_hua: zhi,
    guan_huai_du_bian_hua: zhi,
  }
}

describe('P1-13 好感度衰减边界矩阵', () => {
  beforeEach(() => {
    vi.mocked(genJuPeiZhiTiaoYong).mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('jiSuanShuaiJianBianHua 衰减系数矩阵（正向）', () => {
    it.each([
      { dangQian: 0, bianHua: 100, yuQi: 100, shuoMing: '0分起步系数=1，无衰减' },
      { dangQian: 300, bianHua: 100, yuQi: 70, shuoMing: '低档300 → 系数=0.7' },
      { dangQian: 500, bianHua: 100, yuQi: 50, shuoMing: '中档500 → 系数=0.5' },
      { dangQian: 900, bianHua: 100, yuQi: 10, shuoMing: '900处线性值1-0.9恰等于兜底0.1' },
      { dangQian: 950, bianHua: 100, yuQi: 10, shuoMing: '950线性值0.05<0.1 → 兜底下限生效' },
      { dangQian: 1000, bianHua: 100, yuQi: 10, shuoMing: '满分处仍保留0.1倍' },
      { dangQian: 1200, bianHua: 100, yuQi: 10, shuoMing: '超上限输入先钳到1000再算系数' },
      { dangQian: -50, bianHua: 100, yuQi: 100, shuoMing: '负分输入钳到0后系数=1' },
    ])('$shuoMing：当前$dangQian + $bianHua → 实际变化 $yuQi', ({ dangQian, bianHua, yuQi }) => {
      expect(jiSuanShuaiJianBianHua(dangQian, bianHua)).toBeCloseTo(yuQi, 10)
    })
  })

  describe('jiSuanShuaiJianBianHua 衰减系数矩阵（负向）', () => {
    it.each([
      { dangQian: 500, bianHua: -200, yuQi: -100, shuoMing: '中档500扣分同样乘0.5' },
      { dangQian: 50, bianHua: -1000, yuQi: -950, shuoMing: '低分位扣分几乎全额（0.95）' },
      { dangQian: 1000, bianHua: -50, yuQi: -5, shuoMing: '高位扣分被兜底限制为0.1倍' },
    ])('$shuoMing：当前$dangQian $bianHua → 实际变化 $yuQi', ({ dangQian, bianHua, yuQi }) => {
      expect(jiSuanShuaiJianBianHua(dangQian, bianHua)).toBeCloseTo(yuQi, 10)
    })

    it('负向大额变化不跌破0下限：当前50 四维各-200 → 钳到0', () => {
      const xinFen = jiSuanSiWeiBianHuaHouDeZongFen(50, quanSiWeiBianHua(-200))
      expect(xinFen).toBe(0)
    })

    it('当前0继续扣分 → 维持0不变', () => {
      const xinFen = jiSuanSiWeiBianHuaHouDeZongFen(0, quanSiWeiBianHua(-60))
      expect(xinFen).toBe(0)
    })
  })

  describe('jiSuanSiWeiBianHuaHouDeZongFen 总分变化矩阵（初始300/500起步与压线截断）', () => {
    it.each([
      { qiBu: 300, danWei: 20, yuQi: 314, shuoMing: '300起步全维+20：+20*0.7=+14 → 314' },
      { qiBu: 500, danWei: 20, yuQi: 510, shuoMing: '500起步全维+20：+20*0.5=+10 → 510' },
      { qiBu: 900, danWei: 20, yuQi: 902, shuoMing: '900起步全维+20：兜底0.1*20=+2 → 902' },
      { qiBu: 995, danWei: 60, yuQi: 1000, shuoMing: '995起步全维+60：+6越线 → 截断在1000' },
      { qiBu: 999, danWei: 60, yuQi: 1000, shuoMing: '999起步全维+60：+6 → 恰好压线上限1000' },
      { qiBu: 1000, danWei: 60, yuQi: 1000, shuoMing: '满分再加仍维持1000' },
    ])('$shuoMing', ({ qiBu, danWei, yuQi }) => {
      expect(jiSuanSiWeiBianHuaHouDeZongFen(qiBu, quanSiWeiBianHua(danWei))).toBe(yuQi)
    })

    it('保底系数保证收敛：从300连加四维各+60 最终恰好停在1000且不越界', () => {
      let dangQian = 300
      for (let ci = 0; ci < 500 && dangQian < HAO_GAN_DU_PEI_ZHI.fanWei.zuiGaoFen; ci++) {
        const yiQian = dangQian
        dangQian = jiSuanSiWeiBianHuaHouDeZongFen(dangQian, quanSiWeiBianHua(60))
        expect(dangQian).toBeGreaterThan(yiQian)
        expect(dangQian).toBeLessThanOrEqual(HAO_GAN_DU_PEI_ZHI.fanWei.zuiGaoFen)
      }
      expect(dangQian).toBe(HAO_GAN_DU_PEI_ZHI.fanWei.zuiGaoFen)
    })

    it('fenJieSiWei 与总分互逆：分解后的加权还原等于原总分', () => {
      const siWei = fenJieSiWei(500)
      expect(siWei.xin_ren_du).toBe(175)
      expect(siWei.qin_mi_du).toBe(125)
      expect(siWei.qu_wei_du).toBe(100)
      expect(siWei.guan_huai_du).toBe(100)
    })
  })

  describe('gengXinHaoGanDu 原子更新 SQL 参数契约（mock 数据库）', () => {
    function sheZhiGengXinFanHui(xinZongFen: number, jiuZongFen = 500): void {
      vi.mocked(数据库.query)
        .mockResolvedValueOnce({
          rows: [{
            信任度: 175,
            亲密度: 125,
            趣味度: 100,
            关怀度: 100,
            总分: String(jiuZongFen),
            关系阶段: '朋友',
          }],
          command: 'SELECT',
          rowCount: 1,
        } as never)
        .mockResolvedValueOnce({
          rows: [{ 总分: String(xinZongFen) }],
          command: 'UPDATE',
          rowCount: 1,
        } as never)
        .mockResolvedValueOnce({ rows: [], command: 'UPDATE', rowCount: 0 } as never)
    }

    it('SQL 参数：[zuiDiFen, zuiGaoFen, 加权原始变化, zuiDiBaoLiu=0.1, 用户ID, 角色ID]', async () => {
      sheZhiGengXinFanHui(314)

      const jieGuo = await gengXinHaoGanDu('yong-hu-id', 'jiao-se-id', quanSiWeiBianHua(20))

      expect(jieGuo.cheng_gong).toBe(true)
      // 第0次调用为预读旧总分的 SELECT，原子更新为第1次调用
      const [, yuanZiGengXinCanShu] = vi.mocked(数据库.query).mock.calls as unknown as [string, unknown[]][]
      expect(yuanZiGengXinCanShu[1]).toEqual([
        HAO_GAN_DU_PEI_ZHI.fanWei.zuiDiFen,
        HAO_GAN_DU_PEI_ZHI.fanWei.zuiGaoFen,
        20,
        HAO_GAN_DU_PEI_ZHI.shuaiJian.zuiDiBaoLiu,
        'yong-hu-id',
        'jiao-se-id',
      ])
    })

    it('混合四维变化按权重合成原始变化：10*0.35 + 20*0.25 + (-10)*0.2 + 0*0.2 = 6.5', async () => {
      sheZhiGengXinFanHui(506)

      await gengXinHaoGanDu('yong-hu-id', 'jiao-se-id', {
        xin_ren_du_bian_hua: 10,
        qin_mi_du_bian_hua: 20,
        qu_wei_du_bian_hua: -10,
        guan_huai_du_bian_hua: 0,
      })

      const [, yuanZiGengXinCanShu] = vi.mocked(数据库.query).mock.calls as unknown as [
        string,
        unknown[],
      ][]
      expect((yuanZiGengXinCanShu[1] as number[])[2]).toBeCloseTo(6.5, 10)
    })

    it('原子更新成功后按返回总分回写派生四维与关系阶段', async () => {
      sheZhiGengXinFanHui(314)

      await gengXinHaoGanDu('yong-hu-id', 'jiao-se-id', quanSiWeiBianHua(20))

      const [, , huiXieCanShu] = vi.mocked(数据库.query).mock.calls as unknown as [
        string,
        unknown[],
      ][]
      expect(huiXieCanShu[1]).toEqual([110, 79, 63, 63, '熟悉', 'yong-hu-id', 'jiao-se-id'])
    })

    it('行不存在（rowCount=0）→ cheng_gong=false 且状态码404', async () => {
      vi.mocked(数据库.query).mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
      } as never)

      const jieGuo = await gengXinHaoGanDu('yong-hu-id', 'jiao-se-id', quanSiWeiBianHua(20))

      expect(jieGuo.cheng_gong).toBe(false)
      expect(jieGuo.zhuang_tai_ma).toBe(404)
    })

    it('数据库异常 → 不抛出：cheng_gong=false 且状态码500', async () => {
      vi.mocked(数据库.query).mockRejectedValueOnce(new Error('数据库不可用'))

      const jieGuo = await gengXinHaoGanDu('yong-hu-id', 'jiao-se-id', quanSiWeiBianHua(20))

      expect(jieGuo.cheng_gong).toBe(false)
      expect(jieGuo.zhuang_tai_ma).toBe(500)
    })
  })

  describe('单次评判 ±60 截断边界（AI_PEI_ZHI.haoGanDu.zuiDaBianHua / zuiXiaoBianHua）', () => {
    async function moNiPingPan(siWeiZhi: number | string): Promise<void> {
      vi.mocked(genJuPeiZhiTiaoYong).mockResolvedValue({
        neiRong: JSON.stringify({
          信任度变化: siWeiZhi,
          亲密度变化: siWeiZhi,
          趣味度变化: siWeiZhi,
          关怀度变化: siWeiZhi,
          理由: '',
        }),
        xinXi: { role: 'assistant', content: '' },
        yuanShuJu: {},
      })
    }

    it.each([
      { shuRu: 61, yuQi: 60 },
      { shuRu: 60, yuQi: 60 },
      { shuRu: 1000, yuQi: 60 },
      { shuRu: -61, yuQi: -60 },
      { shuRu: -60, yuQi: -60 },
      { shuRu: -1000, yuQi: -60 },
    ])('LLM 单维给 $shuRu → 输出夹到 $yuQi', async ({ shuRu, yuQi }) => {
      await moNiPingPan(shuRu)

      const jieGuo = await pingPanHaoGanDuBianHua('用户消息', '角色回复', '小雨')

      expect(jieGuo.xin_ren_du_bian_hua).toBe(yuQi)
      expect(jieGuo.qin_mi_du_bian_hua).toBe(yuQi)
      expect(jieGuo.qu_wei_du_bian_hua).toBe(yuQi)
      expect(jieGuo.guan_huai_du_bian_hua).toBe(yuQi)
    })

    it('非数值变化 → 归零而非崩溃或透传NaN', async () => {
      await moNiPingPan('abc')

      const jieGuo = await pingPanHaoGanDuBianHua('用户消息', '角色回复', '小雨')

      expect(jieGuo.xin_ren_du_bian_hua).toBe(0)
      expect(jieGuo.guan_huai_du_bian_hua).toBe(0)
    })
  })
})
