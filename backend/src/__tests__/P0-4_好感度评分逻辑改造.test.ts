import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  sheZhiMockTiaoYong,
  chongZhiDeepSeekKeHuDuan,
} from '../utils/DeepSeek客户端'
import type { TiaoYongCanShu, TiaoYongJieGuo } from '../utils/DeepSeek客户端'
import {
  pingPanHaoGanDuBianHua,
  pingPanHaoGanDuPiLiang,
} from '../services/好感度评判'
import { gouJianHaoGanDuPingPanPrompt } from '../services/Prompt构建器'
import { redis } from '../redis'

function mockFanHui(siWei: [number, number, number, number]) {
  return async (_canShu: TiaoYongCanShu): Promise<TiaoYongJieGuo> => {
    const neiRong = JSON.stringify({
      信任度变化: siWei[0],
      亲密度变化: siWei[1],
      趣味度变化: siWei[2],
      关怀度变化: siWei[3],
      理由: '测试',
    })
    return { neiRong, xinXi: { role: 'assistant', content: neiRong }, yuanShuJu: {} as never }
  }
}

describe('P0-4 好感度评分逻辑改造', () => {
  beforeEach(async () => {
    chongZhiDeepSeekKeHuDuan()
    // 保底计数存于共享 Redis（2小时 TTL）：先清本文件所用的保底键，
    // 否则上一轮残留会在本轮循环中途提前触发并清零，导致第6轮断言偶发失败
    try {
      const keys = await redis.keys('hao_gan_du_bao_di:*')
      if (keys.length) await redis.del(...keys)
    } catch {
      // Redis 不可用时交由用例自身断言，不在此掩盖
    }
  })

  afterEach(() => {
    sheZhiMockTiaoYong(null)
  })

  describe('Prompt 契约', () => {
    const tiShi = gouJianHaoGanDuPingPanPrompt('你好呀', '嗯', '小柔')

    it('以用户消息贡献为主 → 包含关键指令文本', () => {
      expect(tiShi).toContain('评分以【用户消息的贡献】为主')
      expect(tiShi).toContain('诚意、情绪价值、话题经营')
      expect(tiShi).toContain('人设的了解程度')
    })

    it('AI 敷衍回复不拖累评分 → 包含明确豁免指令', () => {
      expect(tiShi).toContain('不得拖累评分')
      expect(tiShi).toContain('只回一个字')
      expect(tiShi).toContain('不影响你给用户的这条消息打分')
    })

    it('仅用户消息自身有问题才给低分负分 → 包含空洞与冒犯判定', () => {
      expect(tiShi).toContain('只有当用户消息本身有问题时才给低分或负分')
      expect(tiShi).toContain('冒犯人设')
      expect(tiShi).toContain('纯“哦”“嗯”')
      expect(tiShi).toContain('刷屏无关内容')
    })

    it('锚点措辞已更新 → 描述对象改为这条消息及用心程度，移除一来一往', () => {
      expect(tiShi).toContain('锚点描述对象是用户的这条消息及 TA 的用心程度')
      expect(tiShi).not.toContain('一来一往')
      expect(tiShi).not.toContain('正常聊天校准锚点')
      expect(tiShi).toContain('-5~+5')
      expect(tiShi).toContain('+26~37')
      expect(tiShi).toContain('+50~60')
      expect(tiShi).toContain('四维各顶格 +60')
      expect(tiShi).toContain('-40~-60')
    })

    it('JSON 输出格式保留 → 四维变化与理由字段完整', () => {
      expect(tiShi).toContain('"信任度变化"')
      expect(tiShi).toContain('"亲密度变化"')
      expect(tiShi).toContain('"趣味度变化"')
      expect(tiShi).toContain('"关怀度变化"')
      expect(tiShi).toContain('"理由"')
      expect(tiShi).toContain('只输出 JSON')
    })

    it('慢热提示保留 → 慢热人设注入基础分加成，非慢热不注入', () => {
      const manReTiShi = gouJianHaoGanDuPingPanPrompt('你好呀', '嗯', '小柔', {
        jiaoSe: { re_shen_lei_xing: '慢热' },
      })
      const kuaiReTiShi = gouJianHaoGanDuPingPanPrompt('你好呀', '嗯', '小柔', {
        jiaoSe: { re_shen_lei_xing: '快热' },
      })
      expect(manReTiShi).toContain('+25~35')
      expect(kuaiReTiShi).not.toContain('+25~35')
    })
  })

  describe('AI 极简回复场景', () => {
    it('AI只回单字但用户真诚长消息 → LLM按新规则给正常档，管道透传不降档', async () => {
      const changXiaoXi = '今天路过你上次说的那家书店，突然就想起你推荐的那本书了，站在书架前翻了半天，感觉每一页都好像能听到你说话的语气，就买下来慢慢看了。'
      let buoHuoTiShi = ''
      sheZhiMockTiaoYong(async (canShu) => {
        const shouTiaoUser = canShu.xiaoXi.find((x) => x.jiaoSe === 'user')
        buoHuoTiShi = typeof shouTiaoUser?.neiRong === 'string' ? shouTiaoUser.neiRong : ''
        return mockFanHui([30, 28, 22, 20])(canShu)
      })

      const jieGuo = await pingPanHaoGanDuBianHua(changXiaoXi, '嗯', '小柔')

      expect(buoHuoTiShi).toContain('评分以【用户消息的贡献】为主')
      expect(buoHuoTiShi).toContain('不得拖累评分')
      expect(buoHuoTiShi).toContain(changXiaoXi)
      const zongFen =
        jieGuo.xin_ren_du_bian_hua +
        jieGuo.qin_mi_du_bian_hua +
        jieGuo.qu_wei_du_bian_hua +
        jieGuo.guan_huai_du_bian_hua
      expect(zongFen).toBeGreaterThanOrEqual(20)
      expect(jieGuo.xin_ren_du_bian_hua).toBe(30)
      expect(jieGuo.qin_mi_du_bian_hua).toBe(28)
      expect(jieGuo.qu_wei_du_bian_hua).toBe(22)
      expect(jieGuo.guan_huai_du_bian_hua).toBe(20)
    })
  })

  describe('保底补偿机制', () => {
    it('连续5轮总分≤+10后，第6轮四维各×1.3并清零计数', async () => {
      const jian = 'u1:r1'
      for (let lun = 0; lun < 5; lun++) {
        sheZhiMockTiaoYong(mockFanHui([2, 2, 3, 1]))
        await pingPanHaoGanDuBianHua('在吗', '嗯', '小柔', undefined, jian)
      }

      sheZhiMockTiaoYong(mockFanHui([10, 10, 10, 10]))
      const chuFaLun = await pingPanHaoGanDuBianHua('今天真的好开心', '哦', '小柔', undefined, jian)

      expect(chuFaLun.xin_ren_du_bian_hua).toBe(13)
      expect(chuFaLun.qin_mi_du_bian_hua).toBe(13)
      expect(chuFaLun.qu_wei_du_bian_hua).toBe(13)
      expect(chuFaLun.guan_huai_du_bian_hua).toBe(13)

      sheZhiMockTiaoYong(mockFanHui([2, 2, 3, 1]))
      const chuZhiHou = await pingPanHaoGanDuBianHua('在吗', '嗯', '小柔', undefined, jian)
      expect(chuZhiHou.xin_ren_du_bian_hua).toBe(2)
      expect(chuZhiHou.qu_wei_du_bian_hua).toBe(3)
    })

    it('连续4轮低增益未达阈值 → 第5轮不乘系数', async () => {
      const jian = 'u2:r2'
      for (let lun = 0; lun < 4; lun++) {
        sheZhiMockTiaoYong(mockFanHui([2, 2, 3, 1]))
        await pingPanHaoGanDuBianHua('在吗', '嗯', '小柔', undefined, jian)
      }

      sheZhiMockTiaoYong(mockFanHui([10, 10, 10, 10]))
      const jieGuo = await pingPanHaoGanDuBianHua('今天真的好开心', '哦', '小柔', undefined, jian)

      expect(jieGuo.xin_ren_du_bian_hua).toBe(10)
      expect(jieGuo.qin_mi_du_bian_hua).toBe(10)
      expect(jieGuo.qu_wei_du_bian_hua).toBe(10)
      expect(jieGuo.guan_huai_du_bian_hua).toBe(10)
    })

    it('中途出现一轮总分>+10 → 计数归零，后续重新累计', async () => {
      const jian = 'u3:r3'
      for (let lun = 0; lun < 4; lun++) {
        sheZhiMockTiaoYong(mockFanHui([2, 2, 3, 1]))
        await pingPanHaoGanDuBianHua('在吗', '嗯', '小柔', undefined, jian)
      }

      sheZhiMockTiaoYong(mockFanHui([8, 8, 8, 8]))
      await pingPanHaoGanDuBianHua('聊得不错', '哈哈', '小柔', undefined, jian)

      sheZhiMockTiaoYong(mockFanHui([2, 2, 3, 1]))
      for (let lun = 0; lun < 4; lun++) {
        await pingPanHaoGanDuBianHua('在吗', '嗯', '小柔', undefined, jian)
      }

      sheZhiMockTiaoYong(mockFanHui([10, 10, 10, 10]))
      const jieGuo = await pingPanHaoGanDuBianHua('今天真的好开心', '哦', '小柔', undefined, jian)
      expect(jieGuo.xin_ren_du_bian_hua).toBe(10)
    })

    it('批量评判路径同样触发保底 → 多条回复第6轮×1.3', async () => {
      const jian = 'u4:r4'
      for (let lun = 0; lun < 5; lun++) {
        sheZhiMockTiaoYong(mockFanHui([2, 2, 3, 1]))
        await pingPanHaoGanDuPiLiang('在吗', ['抱抱', '辛苦了'], '小柔', undefined, jian)
      }

      sheZhiMockTiaoYong(mockFanHui([20, 20, 20, 20]))
      const jieGuo = await pingPanHaoGanDuPiLiang('认真聊了一晚上', ['嗯'], '小柔', undefined, jian)

      expect(jieGuo.xin_ren_du_bian_hua).toBe(26)
      expect(jieGuo.qin_mi_du_bian_hua).toBe(26)
      expect(jieGuo.qu_wei_du_bian_hua).toBe(26)
      expect(jieGuo.guan_huai_du_bian_hua).toBe(26)
    })

    it('不同会话键互不影响 → 各自独立累计', async () => {
      const jianA = 'u5:r5'
      const jianB = 'u6:r6'
      for (let lun = 0; lun < 5; lun++) {
        sheZhiMockTiaoYong(mockFanHui([2, 2, 3, 1]))
        await pingPanHaoGanDuBianHua('在吗', '嗯', '小柔', undefined, jianA)
      }
      sheZhiMockTiaoYong(mockFanHui([2, 2, 3, 1]))
      await pingPanHaoGanDuBianHua('在吗', '嗯', '小柔', undefined, jianB)

      sheZhiMockTiaoYong(mockFanHui([10, 10, 10, 10]))
      const jieGuoA = await pingPanHaoGanDuBianHua('开心', '哦', '小柔', undefined, jianA)
      const jieGuoB = await pingPanHaoGanDuBianHua('开心', '哦', '小柔', undefined, jianB)

      expect(jieGuoA.xin_ren_du_bian_hua).toBe(13)
      expect(jieGuoB.xin_ren_du_bian_hua).toBe(10)
    })
  })

  describe('向后兼容（不传 huiHuaJian）', () => {
    it('单条评判连续多轮低增益 → 永远不触发补偿，数值与原值一致', async () => {
      for (let lun = 0; lun < 6; lun++) {
        sheZhiMockTiaoYong(mockFanHui([2, 2, 3, 1]))
        const jieGuo = await pingPanHaoGanDuBianHua('在吗', '嗯', '小柔')
        expect(jieGuo.xin_ren_du_bian_hua).toBe(2)
        expect(jieGuo.qin_mi_du_bian_hua).toBe(2)
        expect(jieGuo.qu_wei_du_bian_hua).toBe(3)
        expect(jieGuo.guan_huai_du_bian_hua).toBe(1)
      }

      sheZhiMockTiaoYong(mockFanHui([10, 10, 10, 10]))
      const jieGuo = await pingPanHaoGanDuBianHua('开心', '哦', '小柔')
      expect(jieGuo.xin_ren_du_bian_hua).toBe(10)
    })

    it('批量评判不传 huiHuaJian → 行为与旧版一致', async () => {
      for (let lun = 0; lun < 6; lun++) {
        sheZhiMockTiaoYong(mockFanHui([2, 2, 3, 1]))
        const jieGuo = await pingPanHaoGanDuPiLiang('在吗', ['抱抱', '辛苦了'], '小柔')
        expect(jieGuo.xin_ren_du_bian_hua).toBe(2)
        expect(jieGuo.qu_wei_du_bian_hua).toBe(3)
      }

      sheZhiMockTiaoYong(mockFanHui([10, 10, 10, 10]))
      const jieGuo = await pingPanHaoGanDuPiLiang('开心', ['哦'], '小柔')
      expect(jieGuo.xin_ren_du_bian_hua).toBe(10)
      expect(jieGuo.li_you).toBe('测试')
    })
  })
})
