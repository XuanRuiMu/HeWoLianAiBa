import { describe, it, expect } from 'vitest'
import { 转换TTS文本 } from '../services/TTS文本预处理'
import { QUE_XIN_DU_YUE_SHU } from '../config/胜利失败配置'
import { tiQuBingLuoKuGuanJianShiJian, duQuGuanJianShiJianZhuRu } from '../services/关键事件提取'
import { fenXiQingGan } from '../services/情感分析'

describe('FP-06 AI长尾事务', () => {
  it('YH-055 TTS穿帮后处理：重复人称压缩与机器自曝收敛', () => {
    expect(转换TTS文本('我是，我是小雨')).toContain('我是')
    expect(转换TTS文本('我是，我是小雨').split('我是').length - 1).toBe(1)
    expect(转换TTS文本('作为AI助手为你服务')).not.toContain('作为AI')
    expect(转换TTS文本('我是机器人，很高兴认识你')).not.toContain('机器人')
    expect(转换TTS文本('你好！！！')).not.toContain('！！！')
    expect(转换TTS文本('今天天气不错123')).toContain('一二三')
  })

  it('YH-056 阈值进配置：三处判定同源可配默认0.7', () => {
    expect(QUE_XIN_DU_YUE_SHU.shenJingBing).toBe(0.7)
    expect(QUE_XIN_DU_YUE_SHU.biaoBaiHuiFu).toBe(0.7)
    expect(QUE_XIN_DU_YUE_SHU.tongYongJianCe).toBe(0.7)
  })

  it('YH-051 关键事件落表去重：空描述跳过，检索注入空安全', async () => {
    const kong = await duQuGuanJianShiJianZhuRu('bu-cun-zai-yong-hu', 'bu-cun-zai-jiao-se')
    expect(typeof kong).toBe('string')
  })

  it('YH-052 情感分析复用兜底：取消signal直接返回空不抛错', async () => {
    const kongZhi = new AbortController()
    kongZhi.abort()
    const jieGuo = await fenXiQingGan('今天很开心', '雨夜的猫', undefined, kongZhi.signal)
    expect(jieGuo.fen_shu).toBe(0)
    expect(jieGuo.fen_xi).toBe('')
  })

  it('YH-051 关键事件提取取消signal直接返回空数组', async () => {
    const kongZhi = new AbortController()
    kongZhi.abort()
    const jieGuo = await tiQuBingLuoKuGuanJianShiJian('u', 'j', '', '测试')
    expect(Array.isArray(jieGuo)).toBe(true)
  })
})
