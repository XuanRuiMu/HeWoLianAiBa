import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { fanYi, huoQuFanYi } from '../../config/translations'
import { SHEN_HE_WEI_GUI_LEI_BIE } from '../../config/媒体配置'

/**
 * 媒体上传失败出参的**逐站点**契约矩阵。
 *
 * 五个站点（AI 聊天图片 / 聊天背景 / 用户表情 / 好友媒体 / 头像）历史上各抄一份类别数组，
 * 于是同一个 MeiTiCunChuCuoWu 在不同站点落到不同翻译段。本文件把两件事实钉成改前=改后：
 *  ① HTTP 状态码；② 是否记账号违规 —— 两者逐站点逐键与下方「改前口径」表完全一致；
 *  ③ 出参 ti_shi 必须是非空且不含未替换占位符的整句（这一条钉的就是被修掉的两个缺陷：
 *     '系统错误' 落到 liaoTian 取不到键 ⇒ undefined 外泄；违规类别只回裸类别名）。
 *
 * 这里刻意 mock 掉 services/媒体存储：被测对象是**路由对存储层错误的映射**，
 * 而 fanYiJian 的取值集合（六大类别 / 审核服务不可用 / 系统错误 / 媒体校验键 / 空串 / 未知键）
 * 只有直接抛 MeiTiCunChuCuoWu 才能穷尽；存储管线本身由 好友媒体.test.ts 用真实实现覆盖，两者不重叠。
 */

const 用户甲 = '11111111-1111-4111-8111-111111111111'
const 用户乙 = '22222222-2222-4222-8222-222222222222'
const 角色ID = '33333333-3333-4333-8333-333333333333'

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string) => {
      if (文本.includes('FROM "好友申请"')) return { rows: [{ '?column?': 1 }], rowCount: 1 }
      throw new Error(`媒体审核出参矩阵用例不该发这条语句：${文本}`)
    },
    connect: async () => {
      throw new Error('媒体审核出参矩阵用例不该开事务连接')
    },
  },
}))

vi.mock('../../redis', () => ({
  redis: { get: async () => null, set: async () => 'OK', del: async () => 1 },
}))

vi.mock('../../utils/debug日志', () => ({
  debug日志: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../middleware/限流', () => ({
  liaoTianXianLiu: (_q: unknown, _r: unknown, 下一项: () => void) => 下一项(),
  aiQingQiuXianLiu: (_q: unknown, _r: unknown, 下一项: () => void) => 下一项(),
}))

vi.mock('../../middleware/输入验证', () => ({
  聊天内容验证中间件: (_q: unknown, _r: unknown, 下一项: () => void) => 下一项(),
}))

vi.mock('../../middleware/管理员', () => ({
  guanLiGaoWeiMenKong: (_q: unknown, _r: unknown, 下一项: () => void) => 下一项(),
  guanLiZhiDuMenKong: (_q: unknown, _r: unknown, 下一项: () => void) => 下一项(),
  anYongHuIdJuBeiNengLi: vi.fn(async () => false),
}))

vi.mock('../../services/账号封禁', () => ({
  chaXunZhangHaoFengJin: vi.fn(async () => ({ beiFengJin: false })),
  jiLuZhangHaoWeiGui: vi.fn(async () => ({ ciShu: 1, jiBie: 'feng_jin_1_fen', jieFengShiJian: null })),
  tiJiaoShenSu: vi.fn(async () => ({ cheng_gong: true })),
  shenHeShenSu: vi.fn(async () => undefined),
  jieChuZhangHaoFengJin: vi.fn(async () => undefined),
  cheHuiWeiGuiXiaoXi: vi.fn(async () => false),
  lieChuFengJinShenSu: vi.fn(async () => []),
  fengJinTongZhiZhengWen: vi.fn(() => ''),
  jiSuanZhangHaoFengJinShiChang: vi.fn(() => undefined),
  chaXunZhangHaoFengJinZhuangTai: vi.fn(async () => undefined),
}))

vi.mock('../../services/IP封禁', () => ({
  获取IP: () => '127.0.0.1',
  记录违规: vi.fn(() => ({ 已封禁: false })),
}))

vi.mock('../../services/安全审核', () => ({
  shenHeNeiRongAnQuan: vi.fn(async () => ({ wei_gui: false, lei_xing: '', li_you: '' })),
  jianCeWeiJiXinHao: vi.fn(() => null),
}))

vi.mock('../../services/通知', () => ({
  chuangJianTongZhi: vi.fn(async () => undefined),
}))

vi.mock('../../services/媒体存储', () => {
  class JiaMeiTiCunChuCuoWu extends Error {
    readonly fanYiJian: string
    constructor(jian: string) {
      super(jian)
      this.name = 'MeiTiCunChuCuoWu'
      this.fanYiJian = jian
    }
  }
  return {
    MeiTiCunChuCuoWu: JiaMeiTiCunChuCuoWu,
    liuShiBaoCunMeiTi: vi.fn(async () => ({
      mediaId: 'mei-1',
      sha256: 'c'.repeat(64),
      mime: 'image/png',
      daXiao: 12,
      leiBie: 'tupian',
      yuanShiWenJianMing: 'x.png',
    })),
    shengChengQianMingURL: vi.fn((sha: string) => `/api/媒体/${sha}`),
    shengChengMeiTiYinYong: vi.fn((sha: string) => `/api/媒体/${sha}`),
    zhongXinQianMingMeiTiURL: vi.fn((zhi: string) => zhi),
    cheXiaoYongHuMeiTiQianMing: vi.fn(async () => undefined),
    huoQuMeiTiQianMingMiYao: vi.fn(() => 'x'.repeat(40)),
    yanZhengQianMing: vi.fn(async () => true),
    huoQuBenDiLuJing: vi.fn(() => null),
    tiQuMeiTiSha: vi.fn(() => null),
    zhiXingBingDuSaoMiao: vi.fn(async () => undefined),
    yanZhengMeiTiKeDu: vi.fn(async () => true),
    MEI_TI_KE_DU_YU_JU: 'SELECT 1',
  }
})

// routes/消息.ts 的其余协作者：本文件只打它的上传口，其余逐个桩掉以免无关模块图被拖进来
vi.mock('../../services/消息', () => ({
  huoQuXiaoXiLieBiao: vi.fn(async () => ({ lie_biao: [], zong_shu: 0, hai_you_geng_duo: false })),
  chuangJianYongHuXiaoXi: vi.fn(async () => ({ cheng_gong: true, xiao_xi: null })),
  cheHuiYongHuXiaoXi: vi.fn(async () => ({ cheng_gong: true })),
  biaoJiSuoYouWeiDu: vi.fn(async () => undefined),
  huoQuJiaoSeSuoYouZhe: vi.fn(async () => null),
}))
vi.mock('../../services/消息出参收口', () => ({
  shouKouXiaoXiYunYingZiDuan: vi.fn((xiaoXi: unknown) => xiaoXi),
  shouKouXiaoXiLieBiaoYunYingZiDuan: vi.fn((lieBiao: unknown[]) => lieBiao),
}))
vi.mock('../../services/AI输入准备', () => ({ baoCunJiaoSeXiaoXi: vi.fn(async () => ({ id: '900' })) }))
vi.mock('../../services/审计日志', () => ({ jiLuShenJiRiZhi: vi.fn(async () => undefined) }))
vi.mock('../../services/思考记录', () => ({ jiLuSiKao: vi.fn(async () => undefined) }))
vi.mock('../../services/军师缓存', () => ({ shanChuJunShiZhiDaoZhuangTai: vi.fn(async () => undefined) }))
vi.mock('../../services/军师', () => ({
  huoQuJunShiLieBiao: vi.fn(async () => ({ junShiLieBiao: [] })),
  qingQiuJunShiZhiDao: vi.fn(),
  huoQuJunShiJiLu: vi.fn(async () => []),
  huoQuJunShiZhiDaoZhuangTaiXinXi: vi.fn(async () => null),
}))
vi.mock('../../services/好感度', () => ({ sheZhiMiJiHaoGanDu: vi.fn(async () => ({ cheng_gong: true })) }))
vi.mock('../../services/翻译', () => ({ fanYiWenBen: vi.fn(async () => ({ cheng_gong: false })) }))
vi.mock('../../services/语音转写', () => ({ mianFeiZhuanXieYuYin: vi.fn(async () => null) }))
vi.mock('../../services/语音理解', () => ({ gouJianYuYinKeDuWenBen: vi.fn(async () => '') }))
vi.mock('../../services/视频多模态', () => ({ gouJianShiPinKeDuWenBen: vi.fn(async () => '') }))
vi.mock('../../socket/聊天', () => ({
  chongZhiJiaoSeTiaoDuQi: vi.fn(),
  luoKuChuFaJiaoSeTiaoDuQi: vi.fn(),
}))
vi.mock('../../socket/io', () => ({ huoQuIo: vi.fn(() => undefined) }))
vi.mock('../../socket/管理通道', () => ({ 管理监控房间名: vi.fn(() => 'admin') }))

import 聊天图片路由 from '../消息'
import 用户设置路由 from '../用户设置'
import 表情路由 from '../表情'
import 资料路由 from '../资料'
import 好友路由 from '../好友'
import { jiLuZhangHaoWeiGui } from '../../services/账号封禁'
import { liuShiBaoCunMeiTi, MeiTiCunChuCuoWu } from '../../services/媒体存储'

const 应用 = express()
应用.use(express.json())
应用.use((qingQiu, _xiangYing, xiaYiBu) => {
  qingQiu.url = decodeURI(qingQiu.url)
  xiaYiBu()
})
应用.use((qingQiu, _xiangYing, 下一项) => {
  ;(qingQiu as unknown as { yong_hu: { yongHuId: string } }).yong_hu = { yongHuId: 用户甲 }
  下一项()
})
应用.use('/api/聊天', 聊天图片路由)
应用.use('/api/用户设置', 用户设置路由)
应用.use('/api/表情', 表情路由)
应用.use('/api/资料', 资料路由)
应用.use('/api/好友', 好友路由)

interface ZhanDian {
  名: string
  记账类别: string
  上传: (文件名: string) => Promise<{ status: number; body: { ti_shi?: unknown } }>
}

function 传文件(路径: string, 文件名: string) {
  return request(应用)
    .post(encodeURI(路径))
    .attach('file', Buffer.from('png-bytes'), { filename: 文件名, contentType: 'image/png' })
}

const 站点清单: readonly ZhanDian[] = [
  {
    名: 'AI聊天图片',
    记账类别: 'AI聊天图片',
    上传: (文件名) => 传文件(`/api/聊天/会话/${角色ID}/媒体?leiBie=tupian`, 文件名),
  },
  {
    名: '聊天背景',
    记账类别: '聊天背景',
    上传: (文件名) => 传文件('/api/用户设置/聊天背景/上传', 文件名),
  },
  {
    名: '用户表情',
    记账类别: '用户表情',
    上传: (文件名) => 传文件('/api/表情/我的', 文件名),
  },
  {
    名: '好友媒体',
    记账类别: '好友媒体',
    上传: (文件名) =>
      request(应用)
        .post(encodeURI('/api/好友/媒体'))
        .query({ jieShouZheId: 用户乙, leiBie: 'tupian' })
        .attach('file', Buffer.from('png-bytes'), { filename: 文件名, contentType: 'image/png' }),
  },
  {
    名: '头像',
    记账类别: '头像',
    上传: (文件名) => 传文件('/api/资料/头像', 文件名),
  },
]

/** 六个真违规类别键（唯一真源派生自翻译段；改前那段还挂着 审核服务不可用 哨兵键，先滤掉再钉数） */
const 违规类别键 = SHEN_HE_WEI_GUI_LEI_BIE.filter((jian) => jian !== '审核服务不可用')

const 键清单 = [
  ...违规类别键,
  '审核服务不可用',
  '系统错误',
  'tuPianWeiGui',
  'meiTiMIMEBuZhiChi',
  'bingDuSaoMiaoShiBai',
  '',
  '根本不存在的外来键',
]

/**
 * 改前口径（逐站点读改造前的 routes 源码抄下来的事实，不是推测）：
 * - 四个 liaoTian 站点：tuPianWeiGui 或键在「六大类别 + 审核服务不可用」数组里 ⇒ 403，其余 400；
 *   记违规 = 403 且键不是 审核服务不可用。
 * - 头像站点：任何 MeiTiCunChuCuoWu 一律 403；记违规 = 键在「六大类别 + tuPianWeiGui」集合里。
 */
function 改前口径(站点名: string, jian: string): { ma: number; ji: boolean } {
  const jiWeiGui = 违规类别键.includes(jian)
  if (站点名 === '头像') {
    return { ma: 403, ji: jiWeiGui || jian === 'tuPianWeiGui' }
  }
  const siFou403 = jiWeiGui || jian === '审核服务不可用' || jian === 'tuPianWeiGui'
  return { ma: siFou403 ? 403 : 400, ji: siFou403 && jian !== '审核服务不可用' }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('媒体审核出参逐站点：状态码与是否记违规改前后完全一致', () => {
  for (const 站点 of 站点清单) {
    for (const jian of 键清单) {
      it(`${站点.名} 抛「${jian || '空串'}」→ 状态码与记违规同改前口径`, async () => {
        const 期望 = 改前口径(站点.名, jian)
        vi.mocked(liuShiBaoCunMeiTi).mockRejectedValueOnce(new MeiTiCunChuCuoWu(jian))

        const 响应 = await 站点.上传('x.png')

        expect(响应.status, `状态码漂移：${站点.名}/${jian}`).toBe(期望.ma)
        expect(jiLuZhangHaoWeiGui).toHaveBeenCalledTimes(期望.ji ? 1 : 0)
        if (期望.ji) {
          expect(jiLuZhangHaoWeiGui).toHaveBeenCalledWith(
            expect.objectContaining({ yongHuId: 用户甲, leiXing: 站点.记账类别, yuanYin: jian }),
          )
        }
      })
    }
  }
})

describe('媒体审核出参逐站点：出参文案必为非空整句（undefined / 裸类别名 / 占位符都算红灯）', () => {
  for (const 站点 of 站点清单) {
    for (const jian of 键清单) {
      it(`${站点.名} 抛「${jian || '空串'}」→ ti_shi 非空且无未替换占位符`, async () => {
        vi.mocked(liuShiBaoCunMeiTi).mockRejectedValueOnce(new MeiTiCunChuCuoWu(jian))

        const 响应 = await 站点.上传('x.png')
        const tiShi = 响应.body.ti_shi

        expect(typeof tiShi, `文案 undefined：${站点.名}/${jian}`).toBe('string')
        expect((tiShi as string).length, `空文案：${站点.名}/${jian}`).toBeGreaterThan(0)
        expect(tiShi as string).not.toContain('{')
        expect(tiShi as string).not.toContain('}')
      })
    }
  }
})

describe('媒体审核出参逐站点：违规类别回整句、系统错误回审核失败、未知键不外泄键名', () => {
  /**
   * 期望文案表 = 改后口径。头像站点改前就把「一切存储错误」说成 ziLiao 段的两句自有文案，
   * 逐站点保持不变的要求下这个口径原样保留（详见报告里列明的站点冲突）。
   */
  function 期望文案(站点名: string, jian: string): string {
    const liaoTian = fanYi.liaoTian as Record<string, string>
    const shenHeLeiBie = fanYi.shenHeLeiBie as Record<string, string>
    if (站点名 === '头像') {
      return 违规类别键.includes(jian) || jian === 'tuPianWeiGui'
        ? huoQuFanYi('ziLiao', 'touXiangHanWeiGui')
        : huoQuFanYi('ziLiao', 'touXiangShangChuanShiBai')
    }
    if (违规类别键.includes(jian)) {
      return liaoTian.tuPianWeiGui.replace('{leiBie}', shenHeLeiBie[jian])
    }
    if (jian === '审核服务不可用') return shenHeLeiBie['审核服务不可用']
    if (jian === 'tuPianWeiGui') return liaoTian.tuPianWeiGuiTongYong
    if (jian === '系统错误' || jian === '' || jian === '根本不存在的外来键') {
      return liaoTian.tuPianShenHeShiBai
    }
    return liaoTian[jian]
  }

  it('违规类别清单唯一真源就是翻译段派生的六项', () => {
    expect([...违规类别键].sort()).toEqual(
      ['涉政有害', '淫秽色情', '暴力恐怖', '邪教', '赌博诈骗', '侵害未成年人'].sort(),
    )
  })

  for (const 站点 of 站点清单) {
    for (const jian of 键清单) {
      it(`${站点.名} 的「${jian || '空串'}」回 ${站点.名 === '头像' ? 'ziLiao' : 'liaoTian'} 段整句`, async () => {
        vi.mocked(liuShiBaoCunMeiTi).mockRejectedValueOnce(new MeiTiCunChuCuoWu(jian))
        const 响应 = await 站点.上传('x.png')

        expect(响应.body.ti_shi).toBe(期望文案(站点.名, jian))
      })
    }
  }
})
