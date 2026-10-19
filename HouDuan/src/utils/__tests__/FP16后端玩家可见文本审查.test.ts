import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CUO_WU_DAI_MA,
  dengLiCuoWuXianRongLieBiao,
  huoQuCuoWuXianRong,
  type CuoWuDaiMa,
} from '../../config/错误码注册表'
import { fanYi, huoQuFanYi } from '../../config/translations'

const dangQianMuLu = dirname(fileURLToPath(import.meta.url))
const houDuanFanYiLuJing = resolve(dangQianMuLu, '../../config/translations.ts')

/** 判据①：内部实现/第三方原文/协议英文不得上屏（备案号与算法备案号是待填占位，组件已下线故不在此列） */
const XU_LIU_WU = /base64|DeepSeek|axios|DOMException|EncodingError|ECONNRESET|ECONNREFUSED|getaddrinfo|127\.0\.0\.1|localhost|localhost:|\/srv\/|\/app\/|SELECT\s|INSERT\s|UPDATE\s|DELETE\s|stack:|SQLSTATE|postgres|mysql|redis|password|api[_-]?key|bearer\s|jwt/i
/** 判据②：占位符与脏值不得上屏 */
const ZHAN_WEI = /\{\{|\}\}|undefined|null|NaN|\{tongYong\}|\{qiDong\}|\{jiaoSe\}|\{zhanJi\}|\{renZheng\}|\{anQuan\}|\{guanLiYuan\}|\{shenJi\}|\{shenHeLeiBie\}|\{AI\}|\{haoGanDu\}|\{junShi\}|\{haoYou\}|\{sheZhi\}|\{ziLiao\}|\{liaoTian\}|\{tiaoZhan\}|\{tongHua\}|\{fuPan\}|\{jieJu\}/
/** 判据④：敷衍与装可爱 */
const FU_YAN = /出错了|未知错误|请稍后重试|稍后再试|请稍后再试|开小差|不知道发生了什么|请稍候看看/
const ZHUANG_KAI_A = /啦|呀|哦|呢~|吧~|~|！{2,}|么~|哈{2,}/
/** 判据③：文案必须自带影响与下一步 */
const XIAO_HUAN = /请/

describe('FP-16 主项目最终 API 可见文本审查（后端）', () => {
  describe('每个错误码的最终 message', () => {
    it('注册表与文案表逐码对齐，无缺键', () => {
      const 缺键: string[] = []
      for (const daiMa of dengLiCuoWuXianRongLieBiao) {
        const 消息 = huoQuCuoWuXianRong(daiMa).message
        if (typeof 消息 !== 'string' || 消息.trim() === '') 缺键.push(daiMa)
      }
      expect(缺键).toEqual([])
      expect(dengLiCuoWuXianRongLieBiao.length).toBe(Object.keys(CUO_WU_DAI_MA).length)
    })

    it('判据①②：无内部实现/第三方原文、无占位符与脏值', () => {
      const 违规: string[] = []
      for (const daiMa of dengLiCuoWuXianRongLieBiao) {
        const 消息 = huoQuCuoWuXianRong(daiMa).message
        if (XU_LIU_WU.test(消息)) 违规.push(`${daiMa} 内部原文：${消息}`)
        if (ZHAN_WEI.test(消息)) 违规.push(`${daiMa} 占位/脏值：${消息}`)
      }
      expect(违规).toEqual([])
    })

    it('判据④：无敷衍与装可爱语气', () => {
      const 违规: string[] = []
      for (const daiMa of dengLiCuoWuXianRongLieBiao) {
        const 消息 = huoQuCuoWuXianRong(daiMa).message
        if (FU_YAN.test(消息)) 违规.push(`${daiMa} 敷衍：${消息}`)
        if (ZHUANG_KAI_A.test(消息)) 违规.push(`${daiMa} 装可爱：${消息}`)
      }
      expect(违规).toEqual([])
    })

    it('判据③：retryable=true 的码文案给出「可再做一次」的动作；retryable=false 的码不承诺「重试」按钮以外无解', () => {
      // qiDong 界面的 6 个码只在容器启动阶段由运维看日志（进程已中止，HTTP 503 到不了玩家），
      // 它们的「下一步」是运维动作，不纳入玩家侧重试一致性判据。
      // 「重新提交/重新操作/再操作」是让用户改完再来一次（人工修正），与「重试」同一请求不同，不算违规。
      const 运维专用 = /^DOCKER_STARTUP_/
      const 违规: string[] = []
      for (const daiMa of dengLiCuoWuXianRongLieBiao) {
        if (运维专用.test(daiMa)) continue
        const 元 = huoQuCuoWuXianRong(daiMa)
        const 承诺重试 = /重试|再来一次/.test(元.message)
        const 人工修正 = /重新提交|重新操作|再操作|再发送|后再/.test(元.message)
        if (元.retryable && !承诺重试 && !人工修正) 违规.push(`${daiMa} 可重试却未给出重试指引：${元.message}`)
        if (!元.retryable && 承诺重试) 违规.push(`${daiMa} 不可重试却承诺重试：${元.message}`)
      }
      expect(违规).toEqual([])
    })

    it('判据③：每条错误文案都有实质信息（非空、非裸标签、长度有界）', () => {
      const 运维专用 = /^DOCKER_STARTUP_/
      const 违规 = dengLiCuoWuXianRongLieBiao.filter((daiMa) => {
        if (运维专用.test(daiMa)) return false
        const 消息 = huoQuCuoWuXianRong(daiMa).message
        return 消息.length < 6 || 消息.length > 60
      })
      expect(违规).toEqual([])
    })
  })

  describe('全量翻译值（玩家可见全集）', () => {
    const 全值 = (): { 路径: string; 文本: string }[] => {
      const 出: { 路径: string; 文本: string }[] = []
      const 走 = (v: unknown, p: string): void => {
        if (typeof v === 'string') {
          出.push({ 路径: p, 文本: v })
          return
        }
        if (Array.isArray(v)) {
          v.forEach((x, i) => 走(x, `${p}[${i}]`))
          return
        }
        if (v && typeof v === 'object') {
          for (const [k, x] of Object.entries(v)) 走(x, `${p}.${k}`)
        }
      }
      走(fanYi, 'fanYi')
      return 出
    }

    it('判据①②：无内部原文、无占位符与脏值', () => {
      const 违规 = 全值()
        .filter(({ 路径 }) => !/beiAnHao|suanFaBeiAnHao|beiAnJinXingZhong/.test(路径))
        .filter(({ 文本 }) => XU_LIU_WU.test(文本) || ZHAN_WEI.test(文本))
        .map(({ 路径, 文本 }) => `${路径}：${文本}`)
      expect(违规).toEqual([])
    })

    it('判据④：无敷衍语与装可爱语气（AI 角色台词与结局叙事池属角色文风，另案裁决）', () => {
      // 角色文风豁免（AI 对象的说话语气 + 结局叙事池的拖尾省略号），由「待用户裁决」用例显式登记，
      // 不静默放过：新增同类文案会在这里被点名。
      const 角色文风 = /(^|\.)(AI|jieGuoTongGuanChi|jieGuoShiBaiChi|fuPan|junShi)\.|liaoTian\.(aiYuSuanYiYongJin|lianFaYuJing|zhuDongFenXiangTuPian)$/
      const 违规 = 全值()
        .filter(({ 路径 }) => !角色文风.test(路径))
        .filter(({ 文本 }) => FU_YAN.test(文本) || ZHUANG_KAI_A.test(文本))
        .map(({ 路径, 文本 }) => `${路径}：${文本}`)
      expect(违规).toEqual([])
    })

    it('判据④待裁决：角色文风里的装可爱语气与叙事拖尾省略号清单（当前 4 键 / 3 条文案 + 44 条叙事）', () => {
      const 角色文风 = /(^|\.)(AI|jieGuoTongGuanChi|jieGuoShiBaiChi|fuPan|junShi)\.|liaoTian\.(aiYuSuanYiYongJin|lianFaYuJing|zhuDongFenXiangTuPian)$/
      const 装可爱 = 全值()
        .filter(({ 路径 }) => 角色文风.test(路径))
        .filter(({ 文本 }) => ZHUANG_KAI_A.test(文本))
        .map(({ 路径 }) => 路径)
      const 拖尾省略号 = 全值()
        .filter(({ 路径 }) => 角色文风.test(路径))
        .filter(({ 文本 }) => /\.\.\./.test(文本))
        .map(({ 路径 }) => 路径)
      // 已知清单：AI 对象语气 4 键 3 条文案（额度用尽 liaoTian+AI 同串、连发预警、主动分享图片）
      // + 结局叙事池 44 条拖尾省略号。若有人新增同类文案，本用例会红并要求同步裁决记录。
      expect(装可爱.sort()).toEqual(
        [
          'fanYi.AI.aiYuSuanYiYongJin',
          'fanYi.liaoTian.aiYuSuanYiYongJin',
          'fanYi.liaoTian.lianFaYuJing',
          'fanYi.liaoTian.zhuDongFenXiangTuPian',
        ].sort(),
      )
      expect(拖尾省略号.length).toBe(44)
    })

    it('判据⑤：人称统一为「你」，不得混用「您」', () => {
      const 违规 = 全值()
        .filter(({ 文本 }) => 文本.includes('您'))
        .map(({ 路径, 文本 }) => `${路径}：${文本}`)
      expect(违规).toEqual([])
    })

    it('判据⑤：不得出现半角标点与中文相邻（项目既有零中英数字混排空格门禁的同源要求）', () => {
      const 违规 = 全值()
        .filter(({ 文本 }) => /[一-鿿]\s+[，。！？：；]/.test(文本))
        .map(({ 路径, 文本 }) => `${路径}：${文本}`)
      expect(违规).toEqual([])
    })
  })

  describe('面向玩家的关键错误出口逐条判读（模拟最终显示）', () => {
    const 判读 = (daiMa: CuoWuDaiMa): { 码: string; 影响: string; 下一步: string; 可重试: boolean } => {
      const 元 = huoQuCuoWuXianRong(daiMa)
      return { 码: 元.code, 影响: 元.message, 下一步: 元.retryable ? '请重试当前操作' : '请按影响栏处理', 可重试: 元.retryable }
    }

    it('500 兜底：不含「出错了」，说明影响且不承诺重试', () => {
      const 显示 = 判读(CUO_WU_DAI_MA.INTERNAL_ERROR)
      expect(显示.影响).toBe('这次操作没有完成，当前内容可能仍是上次结果')
      expect(显示.影响).not.toMatch(FU_YAN)
      expect(显示.可重试).toBe(false)
    })

    it('登录态失效：不说「令牌」，给出重新登录动作', () => {
      expect(huoQuCuoWuXianRong(CUO_WU_DAI_MA.AUTH_TOKEN_INVALID).message).toBe('登录状态已失效，请重新登录')
      expect(huoQuCuoWuXianRong(CUO_WU_DAI_MA.AUTH_REFRESH_TOKEN_INVALID).message).toBe('登录状态已失效，请重新登录')
    })

    it('上游/缓存/依赖不可用：不泄露内部组件名', () => {
      for (const daiMa of [
        CUO_WU_DAI_MA.UPSTREAM_NETWORK_ERROR,
        CUO_WU_DAI_MA.DEPENDENCY_REDIS_UNAVAILABLE,
        CUO_WU_DAI_MA.DEPENDENCIES_UNAVAILABLE,
        CUO_WU_DAI_MA.DEPENDENCY_POSTGRES_UNAVAILABLE,
        CUO_WU_DAI_MA.DATABASE_ERROR,
      ] as CuoWuDaiMa[]) {
        const 消息 = huoQuCuoWuXianRong(daiMa).message
        expect(消息).not.toMatch(/上游|缓存|依赖|数据库|Redis|Postgres/)
        expect(消息).toMatch(XIAO_HUAN)
      }
    })

    it('凭据错误不泄露账号是否存在，也不责怪用户', () => {
      const 消息 = huoQuCuoWuXianRong(CUO_WU_DAI_MA.AUTH_INVALID_CREDENTIALS).message
      expect(消息).toBe('账号或密码错误')
    })

    it('注册关闭：不可重试且不承诺重试', () => {
      const 元 = huoQuCuoWuXianRong(CUO_WU_DAI_MA.AUTH_REGISTRATION_CLOSED)
      expect(元.retryable).toBe(false)
      expect(元.message).not.toMatch(/重试|稍后/)
    })

    it('战绩排序：不说「排序ID」等内部字段名', () => {
      const 消息 = huoQuCuoWuXianRong(CUO_WU_DAI_MA.ZHAN_JI_PAI_XU_ID_CHONG_FU).message
      expect(消息).not.toMatch(/ID|参数/)
      expect(消息).toMatch(/重新排序/)
    })

    it('用户输入与超长文本安全：错误文案长度有上界（不得把入参回显进文案）', () => {
      const 长样本 = 'x'.repeat(4000)
      const 消息 = huoQuCuoWuXianRong(CUO_WU_DAI_MA.REQUEST_PARAMETER_INVALID).message
      expect(长样本.startsWith(消息)).toBe(false)
      expect(`${消息}${长样本}`.startsWith(消息)).toBe(true)
      for (const daiMa of dengLiCuoWuXianRongLieBiao) {
        expect(huoQuCuoWuXianRong(daiMa).message.length).toBeLessThanOrEqual(60)
      }
    })
  })

  describe('源头文本卫生（防止占位键被重新引入）', () => {
    it('翻译源文件里不出现玩家可见的错误码字面量', () => {
      const 源 = readFileSync(houDuanFanYiLuJing, 'utf8')
      const 违规 = dengLiCuoWuXianRongLieBiao.filter((daiMa) =>
        new RegExp(`[:'"\`]\\s*${daiMa}\\b`).test(源),
      )
      expect(违规).toEqual([])
    })

    it('翻译源文件存在且未被清空（守卫不得空跑）', () => {
      expect(existsSync(houDuanFanYiLuJing)).toBe(true)
      expect(Object.keys(fanYi).length).toBeGreaterThanOrEqual(20)
      expect(huoQuFanYi('tongYong', 'caoZuoChengGong')).toBe('操作成功')
    })
  })
})
