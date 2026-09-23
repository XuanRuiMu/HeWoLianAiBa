import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  XIAO_XI_KUAI_LEI_XING,
  guiYiKuaiLeiXing,
  guiYiXiaoXiLeiXing,
  shiTuXiangMeiTiLeiBie,
  guiYiKuaiLieBiao,
  fanGouKuaiCongXiaoXi,
  huoQuXianShiKuai,
  shiXuYaoKuaiXuanRan,
  kuaiDaoZhengWen,
  kuaiDaoXiaoXiLeiXing,
  keTiJiaoKuai,
  panDingKuaiChaoXian,
  kuaiYuLanDiZhi,
  type KuaiChaoXianQingKuang,
} from '@/utils/消息内容块'
import { XIAO_XI_KUAI_PEI_ZHI, XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import type { XiaoXiKuai, XiaoXiKuaiChuCan, 消息 } from '@/types'

/**
 * FP-10b（缺陷9「QQ 式图文混排」）前端侧的**守门测试**。
 *
 * `utils/消息内容块.ts:8` 与 `config/消息配置.ts:19` 两处注释都把本文件点名为唯一守门人，
 * 此前该文件并不存在（PROGRESS 根因 R6「被声明为守门人的 FP10b 测试不存在」）。本文件钉住：
 *  ① 模块的导出清单一个都不许少（清单里的 13 个运行时出口 + `KuaiChaoXianQingKuang` 类型出口；
 *     FP-24a 又加了 `shiBiaoQingBaoMeiTiLeiBie` / `shiBiaoQingBaoKuai` 两个呈现侧类别出口、
 *     FP-10a 又加了 `BIAO_QING_BAO_MEI_TI_LEI_BIE` 一个生产侧取值，合计 16 个运行时出口，
 *     那三个的行为口径与「不许出现第二份判定」由 `__tests__/FP24a表情包块渲染.test.ts` 把守）；
 *  ② 消息内容块.ts 头部自述的三条前端不变式（顺序保真 / 反构等价 + 含图片块即按块渲染 / 脏数据不崩）；
 *  ③ 与后端 services/消息内容块.ts、config/消息配置.ts、services/AI视觉辅助.ts 的同源关系
 *     （直读后端源文件断言，改一侧必红灯）；
 *  ④ 全库只有一份内容块判定。**FP-21（后端半区）已把好友侧从「不得出现」反转为「只准出现一处来源」**
 *     —— 详见 `FP-21 已反转` 那段注释与本文件末组的三条判据。
 */

const MEI_TI_ID = '11111111-1111-4111-8111-111111111111'
const MEI_TI_ID_B = '22222222-2222-4222-8222-222222222222'
const QIAN_MING_URL = '/api/媒体/' + 'a'.repeat(64) + '?e=1&u=2&t=3&s=4'

/** 只变尾段的合法 UUID：给「N 张图」的用例造互不相同的媒体 ID */
function diZhiUuid(xuHao: number): string {
  return `11111111-1111-4111-8111-${String(xuHao).padStart(12, '0')}`
}

function zaoXiaoXi(geGai: Partial<消息> = {}): 消息 {
  return {
    id: 'x-1',
    hui_hua_id: 'h-1',
    fa_song_zhe_id: 'u-1',
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '',
    lei_xing: 'wenben',
    shi_jian_chuo: 1,
    yi_du: false,
    ...geGai,
  } as 消息
}

function wenZiKuai(neiRong: string): XiaoXiKuai {
  return { lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: neiRong }
}

function tuKuai(meiTiId: string, extra: Record<string, unknown> = {}): XiaoXiKuaiChuCan {
  return { lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian, mei_ti_id: meiTiId, ...extra } as XiaoXiKuaiChuCan
}

describe('FP-10b 守门：导出清单一个都不许少', () => {
  const YUN_XING_DIU_GUO = [
    'XIAO_XI_KUAI_LEI_XING',
    'guiYiKuaiLeiXing',
    'guiYiXiaoXiLeiXing',
    'shiTuXiangMeiTiLeiBie',
    'guiYiKuaiLieBiao',
    'fanGouKuaiCongXiaoXi',
    'huoQuXianShiKuai',
    'shiXuYaoKuaiXuanRan',
    'kuaiDaoZhengWen',
    'kuaiDaoXiaoXiLeiXing',
    'keTiJiaoKuai',
    'panDingKuaiChaoXian',
    'kuaiYuLanDiZhi',
  ] as const

  it('13 个运行时导出恒在（第 14 个 KuaiChaoXianQingKuang 是类型出口，由下面的类型用例把守）', async () => {
    const moKuai = await import('@/utils/消息内容块')
    const queShao = YUN_XING_DIU_GUO.filter((ming) => !(ming in moKuai))
    expect(queShao).toEqual([])
  })

  it('KuaiChaoXianQingKuang 的形状是 {chaoXian, yuanYin}，yuanYin 只允许四个取值', () => {
    // 类型出口：改字段名或改 yuanYin 值域都会在这里编译期失败（vue-tsc 门禁）
    const weiChaoXian: KuaiChaoXianQingKuang = { chaoXian: false, yuanYin: '' }
    const yuanYinZhi: KuaiChaoXianQingKuang['yuanYin'][] = ['kuaishu', 'tupianshu', 'zishu', '']
    expect(weiChaoXian).toEqual({ chaoXian: false, yuanYin: '' })
    expect(Object.keys(weiChaoXian).sort()).toEqual(['chaoXian', 'yuanYin'])
    expect(yuanYinZhi).toHaveLength(4)
  })
})

describe('FP-10b 块值域与边界归一', () => {
  it('XIAO_XI_KUAI_LEI_XING 只有 wenzi / tupian 两个权威值（块值域是第三个命名空间）', () => {
    expect(XIAO_XI_KUAI_LEI_XING).toEqual({ wenZi: 'wenzi', tuPian: 'tupian' })
  })

  it('guiYiKuaiLeiXing：大小写与首尾空白容忍，消息类型的 wenben 在读取边界归到 wenzi', () => {
    expect(guiYiKuaiLeiXing('wenzi')).toBe(XIAO_XI_KUAI_LEI_XING.wenZi)
    expect(guiYiKuaiLeiXing('  WENZI  ')).toBe(XIAO_XI_KUAI_LEI_XING.wenZi)
    expect(guiYiKuaiLeiXing('wenben')).toBe(XIAO_XI_KUAI_LEI_XING.wenZi)
    expect(guiYiKuaiLeiXing('tupian')).toBe(XIAO_XI_KUAI_LEI_XING.tuPian)
    // 'tuPian'（消息类型形态的误写）同样归一，这是拼写债的读取边界
    expect(guiYiKuaiLeiXing('tuPian')).toBe(XIAO_XI_KUAI_LEI_XING.tuPian)
  })

  it('guiYiKuaiLeiXing：认不出的返回 null 交由调用方丢弃该块，绝不猜成文字块', () => {
    for (const wuRen of ['yuyin', 'wenjian', 'biaoqingshu', '', '   ', '图片']) {
      expect(guiYiKuaiLeiXing(wuRen)).toBeNull()
    }
    for (const feiZiFu of [null, undefined, 123, true, {}, []] as unknown[]) {
      expect(guiYiKuaiLeiXing(feiZiFu)).toBeNull()
    }
  })

  it('guiYiXiaoXiLeiXing：把误写进消息值域的媒体类别收回权威消息类型，其余原样', () => {
    expect(guiYiXiaoXiLeiXing('tupian')).toBe('tuPian')
    expect(guiYiXiaoXiLeiXing(' biaoqingbao ')).toBe('biaoQingBao')
    expect(guiYiXiaoXiLeiXing('yuyin')).toBe('yuYin')
    expect(guiYiXiaoXiLeiXing('WENJIAN')).toBe('wenJian')
    // 已经合法的与原样返回（含历史类型 neiXinHuoDong），归一不做二次改写
    expect(guiYiXiaoXiLeiXing('tuPian')).toBe('tuPian')
    expect(guiYiXiaoXiLeiXing('wenben')).toBe('wenben')
    expect(guiYiXiaoXiLeiXing('neiXinHuoDong')).toBe('neiXinHuoDong')
    expect(guiYiXiaoXiLeiXing('')).toBe('')
  })

  it('guiYiXiaoXiLeiXing：非字符串（脏数据/缺字段）落回文本码，读取侧因此永不拿到 undefined', () => {
    for (const feiZiFu of [null, undefined, 42, {}, []] as unknown[]) {
      expect(guiYiXiaoXiLeiXing(feiZiFu)).toBe('wenben')
    }
  })

  it('shiTuXiangMeiTiLeiBie：只有图像类媒体能进图片块，语音/文件不算', () => {
    expect(shiTuXiangMeiTiLeiBie('tupian')).toBe(true)
    expect(shiTuXiangMeiTiLeiBie('biaoqingshu')).toBe(true)
    expect(shiTuXiangMeiTiLeiBie('yuyin')).toBe(false)
    expect(shiTuXiangMeiTiLeiBie('wenjian')).toBe(false)
    expect(shiTuXiangMeiTiLeiBie('')).toBe(false)
    expect(shiTuXiangMeiTiLeiBie(null)).toBe(false)
    expect(shiTuXiangMeiTiLeiBie(undefined)).toBe(false)
    expect(shiTuXiangMeiTiLeiBie(7 as unknown)).toBe(false)
  })
})

describe('FP-10b 不变式③：出参块归一对脏数据只降级不抛', () => {
  it('合法数组逐块归一并保序；图片块只留合法 UUID，文字块原文不 trim', () => {
    const jieGuo = guiYiKuaiLieBiao([
      tuKuai(MEI_TI_ID, { mei_ti_url: QIAN_MING_URL, mei_ti_lei_bie: 'tupian' }),
      { lei_xing: 'wenzi', nei_rong: '  前后有空格  ' },
    ])
    expect(jieGuo).not.toBeNull()
    expect(jieGuo).toHaveLength(2)
    expect(jieGuo?.[0]).toEqual({
      lei_xing: 'tupian',
      mei_ti_id: MEI_TI_ID,
      mei_ti_url: QIAN_MING_URL,
      mei_ti_lei_bie: 'tupian',
    })
    expect(jieGuo?.[1]).toEqual({ lei_xing: 'wenzi', nei_rong: '  前后有空格  ' })
  })

  it('服务端没签地址时图片块不带 mei_ti_url 键（前端不自行拼 URL）', () => {
    expect(guiYiKuaiLieBiao([tuKuai(MEI_TI_ID)])?.[0]).toEqual({
      lei_xing: 'tupian',
      mei_ti_id: MEI_TI_ID,
    })
  })

  it('JSON 字符串（老序列化器双重编码）照样解析；空串与坏 JSON 按「没有块」返回 null', () => {
    expect(guiYiKuaiLieBiao(JSON.stringify([wenZiKuai('早')]))).toEqual([
      { lei_xing: 'wenzi', nei_rong: '早' },
    ])
    expect(guiYiKuaiLieBiao('')).toBeNull()
    expect(guiYiKuaiLieBiao('   ')).toBeNull()
    expect(guiYiKuaiLieBiao('{坏 JSON')).toBeNull()
    expect(guiYiKuaiLieBiao('{"lei_xing":"wenzi"}')).toBeNull()
  })

  it('非数组 / 空数组 / 全是不认识的块 ⇒ null，由调用方回退反构', () => {
    expect(guiYiKuaiLieBiao(null)).toBeNull()
    expect(guiYiKuaiLieBiao(undefined)).toBeNull()
    expect(guiYiKuaiLieBiao(7)).toBeNull()
    expect(guiYiKuaiLieBiao([])).toBeNull()
    expect(guiYiKuaiLieBiao([{ lei_xing: 'yuyin' }, '不是对象', null, 3])).toBeNull()
  })

  it('脏块逐块丢弃、其余保留：单个坏块绝不把整条消息打成空', () => {
    const jieGuo = guiYiKuaiLieBiao([
      '不是对象',
      { lei_xing: 'unknown_v2', nei_rong: '未来版本的块' },
      { lei_xing: 'tupian', mei_ti_id: 'bu-shi-uuid' },
      tuKuai(MEI_TI_ID_B),
      wenZiKuai('留着这句话'),
    ])
    expect(jieGuo).toHaveLength(2)
    expect(jieGuo?.[0]?.mei_ti_id).toBe(MEI_TI_ID_B)
    expect(jieGuo?.[1]).toEqual({ lei_xing: 'wenzi', nei_rong: '留着这句话' })
  })
})

describe('FP-10b 不变式②：历史行反构逐字不变', () => {
  it('旧的单图行反构出**恰好一个**图片块（内容里的 [图片] 是这张图自身的投影，不是文字）', () => {
    const kuai = fanGouKuaiCongXiaoXi(
      zaoXiaoXi({ lei_xing: 'tuPian', nei_rong: XIAO_XI_KUAI_PEI_ZHI.tuPianZhanWei, mei_ti_id: MEI_TI_ID }),
    )
    expect(kuai).toHaveLength(1)
    expect(kuai[0]).toEqual({ lei_xing: 'tupian', mei_ti_id: MEI_TI_ID })
  })

  it('旧的单表情包行同样只出一个图片块，并带上媒体类别供派生投影选占位符', () => {
    const kuai = fanGouKuaiCongXiaoXi(
      zaoXiaoXi({
        lei_xing: 'biaoQingBao',
        nei_rong: XIAO_XI_KUAI_PEI_ZHI.biaoQingBaoZhanWei,
        mei_ti_id: MEI_TI_ID,
        mei_ti_lei_bie: 'biaoqingshu',
      }),
    )
    expect(kuai).toHaveLength(1)
    expect(kuai[0]).toEqual({
      lei_xing: 'tupian',
      mei_ti_id: MEI_TI_ID,
      mei_ti_lei_bie: 'biaoqingshu',
    })
  })

  it('纯文本行反构为一个文字块且**逐字**（不 trim、不折叠空白），出参正文因此不变', () => {
    expect(fanGouKuaiCongXiaoXi(zaoXiaoXi({ nei_rong: '  两头的空格都得留着  ' }))).toEqual([
      { lei_xing: 'wenzi', nei_rong: '  两头的空格都得留着  ' },
    ])
  })

  it('图像行带真实随附文字 ⇒ 载体块在前、文字在后（旧模型本就没有顺序信息）', () => {
    const kuai = fanGouKuaiCongXiaoXi(
      zaoXiaoXi({ lei_xing: 'tuPian', nei_rong: '看这张', mei_ti_id: MEI_TI_ID }),
    )
    expect(kuai.map((xiang) => xiang.lei_xing)).toEqual(['tupian', 'wenzi'])
    expect(kuai[1]?.nei_rong).toBe('看这张')
  })

  it('语音/文件行不造图片块（硬造会把语音渲染成图），只留文字块', () => {
    const yuYin = fanGouKuaiCongXiaoXi(
      zaoXiaoXi({ lei_xing: 'yuYin', nei_rong: '[语音(3秒)]', mei_ti_id: MEI_TI_ID, mei_ti_lei_bie: 'yuyin' }),
    )
    expect(yuYin).toEqual([{ lei_xing: 'wenzi', nei_rong: '[语音(3秒)]' }])
    const wenJian = fanGouKuaiCongXiaoXi(
      zaoXiaoXi({ lei_xing: 'wenJian', nei_rong: '[文件:笔记.pdf]', mei_ti_id: MEI_TI_ID, mei_ti_lei_bie: 'wenjian' }),
    )
    expect(wenJian).toEqual([{ lei_xing: 'wenzi', nei_rong: '[文件:笔记.pdf]' }])
  })

  it('形状怪异的行（全空）反构出一个空文字块而非空数组 ⇒ 渲染侧不会画出空气泡', () => {
    expect(fanGouKuaiCongXiaoXi(zaoXiaoXi({ nei_rong: '' }))).toEqual([
      { lei_xing: 'wenzi', nei_rong: '' },
    ])
    expect(fanGouKuaiCongXiaoXi(zaoXiaoXi({ lei_xing: 'tuPian', mei_ti_id: null }))).toEqual([
      { lei_xing: 'wenzi', nei_rong: '' },
    ])
  })

  it('消息类型以媒体类别形态（tupian 误写）落库的历史行，同样按图片行反构', () => {
    const kuai = fanGouKuaiCongXiaoXi(
      zaoXiaoXi({
        lei_xing: 'tupian' as unknown as 消息['lei_xing'],
        nei_rong: '',
        mei_ti_id: MEI_TI_ID,
      }),
    )
    expect(kuai).toEqual([tuKuai(MEI_TI_ID)])
  })
})

describe('FP-10b 渲染口径：服务端给了就采信，没给才反构', () => {
  it('huoQuXianShiKuai 优先采信出参块数组（含块级签名地址）', () => {
    const xiaoXi = zaoXiaoXi({
      lei_xing: 'tuPian',
      nei_rong: '[图片]',
      mei_ti_id: MEI_TI_ID,
      nei_rong_kuai: [tuKuai(MEI_TI_ID, { mei_ti_url: QIAN_MING_URL })],
    })
    expect(huoQuXianShiKuai(xiaoXi)).toEqual([
      { lei_xing: 'tupian', mei_ti_id: MEI_TI_ID, mei_ti_url: QIAN_MING_URL },
    ])
  })

  it('出参块不可用（缺失/空数组/坏值）时逐字回退到反构，绝不因缺字段渲染成空', () => {
    const queShiLieBiao: unknown[] = [undefined, null, [], '不是数组', '{坏 JSON']
    for (const queShi of queShiLieBiao) {
      const xiaoXi = zaoXiaoXi({
        lei_xing: 'tuPian',
        nei_rong: XIAO_XI_KUAI_PEI_ZHI.tuPianZhanWei,
        mei_ti_id: MEI_TI_ID,
        nei_rong_kuai: queShi as 消息['nei_rong_kuai'],
      })
      expect(huoQuXianShiKuai(xiaoXi)).toEqual([tuKuai(MEI_TI_ID)])
    }
  })

  it('shiXuYaoKuaiXuanRan 终态判据（FP-10a 反转，需求 #6 图文同区收口）：含图片块即走块渲染', () => {
    // 纯图 / 纯表情包单块行：反转前被判 false 留在媒体分支，反转后与图文混排行同走块渲染
    expect(
      shiXuYaoKuaiXuanRan(
        zaoXiaoXi({ lei_xing: 'tuPian', nei_rong: '[图片]', mei_ti_id: MEI_TI_ID }),
      ),
    ).toBe(true)
    // 纯文本仍判 false（块渲染只管有图的行）
    expect(shiXuYaoKuaiXuanRan(zaoXiaoXi({ nei_rong: '纯文本一句话' }))).toBe(false)
    // 图文同条（反转前后都判 true，这条是"≥2 从来只挡纯图行"的实测锚）
    expect(
      shiXuYaoKuaiXuanRan(
        zaoXiaoXi({ lei_xing: 'tuPian', nei_rong: '看这张', mei_ti_id: MEI_TI_ID }),
      ),
    ).toBe(true)
    // 两块但都不是图片（历史脏数据里的双文字块）⇒ false，块渲染只管图文
    expect(
      shiXuYaoKuaiXuanRan(zaoXiaoXi({ nei_rong_kuai: [wenZiKuai('甲'), wenZiKuai('乙')] })),
    ).toBe(false)
    // 服务端回读的两块（图 + 文）⇒ true，且顺序就是出参顺序
    expect(
      shiXuYaoKuaiXuanRan(
        zaoXiaoXi({ lei_xing: 'wenben', nei_rong: '图后字', nei_rong_kuai: [tuKuai(MEI_TI_ID), wenZiKuai('图后字')] }),
      ),
    ).toBe(true)
    // 图像类型但媒体 ID 丢了（旧行/脏行）⇒ 反构不出图片块 ⇒ false，落到页面侧的媒体分支兜底
    expect(
      shiXuYaoKuaiXuanRan(zaoXiaoXi({ lei_xing: 'tuPian', nei_rong: '[图片]', mei_ti_id: null })),
    ).toBe(false)
    // 出参块里的图片块媒体 ID 非法 ⇒ guiYiKuaiLieBiao 逐块丢弃后只剩文字块 ⇒ 同上兜底
    expect(
      shiXuYaoKuaiXuanRan(
        zaoXiaoXi({
          lei_xing: 'tuPian',
          nei_rong: '[图片]',
          mei_ti_id: MEI_TI_ID,
          nei_rong_kuai: [
            { lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian, mei_ti_id: '不是 UUID' } as unknown as XiaoXiKuaiChuCan,
            wenZiKuai('[图片]'),
          ],
        }),
      ),
    ).toBe(false)
  })
})

describe('FP-10a 终态判据登记：shiXuYaoKuaiXuanRan 只剩「含图片块」', () => {
  /**
   * 【为什么单独立一组】这条判据被登记过两次：FP-22f 用它拦"谁偷改"，FP-10a 执行反转。
   * 反转落地后本组换成拦**反向漂移** —— 把 `>= 2` 加回来、或把判据换成"图文混排才按块画"，
   * 下面那张形态表立刻红。契约旧→新 = 「含图片块**且**块数 ≥ 2」→「含图片块」
   * （PROGRESS_技术问题.md『待处理功能点』FP-10a 行①；反转当天连 FP-22f 那两组用例一起改判
   * 是规定动作，不是回归）。
   *
   * 【反转的实际影响面（FP-22f 逐形态实测，非推测）】
   *  「≥2」唯一挡住的形态是「块数恰为 1」：纯图 / 纯表情包且无随附文字；「单图 + 随附文字」
   *  在反转前就判 true。⇒ 影响面落在页面侧 `views/聊天页面.vue` 的图片 :102 / 表情包 :122
   *  两条媒体分支：新服务端回读的正常行不再命中它们，它们只剩「反构不出图片块」那类脏行的
   *  兜底职责（可达性实测由 `__tests__/FP10a判据反转与贴纸待发.test.ts` 钉住）。
   * 【两端为何不同口径（FP-10a 裁定，非"默默不同"）】后端 `services/消息内容块.ts::shiTuWenHunPaiKuai`
   *  的 `kuai.length < 2` 是「同时含文字块与图片块」的**定义式前置**（单个块不可能同时含两类），
   *  不是过渡判据；纯图行的 `内容` 投影本来就是 `[图片]`，后端按单占位符渲染、前端按块渲染，
   *  两端说的是同一件事 ⇒ 前端反转不造成两端口径分叉，后端 `length < 2` 原样保留，
   *  由 `backend/src/services/__tests__/FP10消息内容块清洗.test.ts:429` 那组用例把守。
   */
  it('影响面取证：只有「块数恰为 1 且是图片块」被翻成 true，无图形态仍一律 false', () => {
    // 纯图 / 纯表情包（无随附文字）⇒ 反构 1 块 ⇒ 反转前被 ≥2 挡住（这就是待拆的那半），现在判 true
    expect(
      shiXuYaoKuaiXuanRan(
        zaoXiaoXi({
          lei_xing: 'biaoQingBao',
          nei_rong: XIAO_XI_KUAI_PEI_ZHI.biaoQingBaoZhanWei,
          mei_ti_id: MEI_TI_ID,
          mei_ti_lei_bie: 'biaoqingshu',
        }),
      ),
    ).toBe(true)
    expect(
      shiXuYaoKuaiXuanRan(
        zaoXiaoXi({ lei_xing: 'wenben', nei_rong: '', nei_rong_kuai: [tuKuai(MEI_TI_ID)] }),
      ),
    ).toBe(true)
    // 单块 + 空文字块仍是 2 块 ⇒ 反转前后同判 true：这条钉住「≥2 从来不看有没有真的打字」
    expect(
      shiXuYaoKuaiXuanRan(
        zaoXiaoXi({
          lei_xing: 'tuPian',
          nei_rong: XIAO_XI_KUAI_PEI_ZHI.tuPianZhanWei,
          mei_ti_id: MEI_TI_ID,
          nei_rong_kuai: [tuKuai(MEI_TI_ID), wenZiKuai('')],
        }),
      ),
    ).toBe(true)
  })

  /**
   * 判据的**形态表**：每行是一种块数组形态 + 终态口径（含图片块）下的真值。
   * 前两行是 FP-10a 反转的落点（FP-22f 时代它们是 false）。这一组锁输入-输出而不是源码文本
   * （审计 B10）：把 `>= 2` 加回来、判据换成"含图且含字"、或只看块数，都会让向量与真实实现不符。
   */
  const XING_TAI_BIAO: Array<[string, XiaoXiKuaiChuCan[], boolean]> = [
    ['1 个图片块（纯图历史行 · 反转落点）', [tuKuai(MEI_TI_ID)], true],
    [
      '1 个表情包块（纯贴纸历史行 · 反转落点）',
      [tuKuai(MEI_TI_ID, { mei_ti_lei_bie: 'biaoqingshu' })],
      true,
    ],
    ['1 个文字块（纯文本行）', [wenZiKuai('只有一句话')], false],
    ['2 个文字块（历史脏数据，无图）', [wenZiKuai('甲'), wenZiKuai('乙')], false],
    ['3 个文字块（无图）', [wenZiKuai('甲'), wenZiKuai('乙'), wenZiKuai('丙')], false],
    ['1 图 + 1 字', [tuKuai(MEI_TI_ID), wenZiKuai('看这张')], true],
    ['1 图 + 1 空文字块', [tuKuai(MEI_TI_ID), wenZiKuai('')], true],
    ['2 图', [tuKuai(MEI_TI_ID), tuKuai(MEI_TI_ID_B)], true],
    [
      '图字交错 5 块',
      [tuKuai(MEI_TI_ID), wenZiKuai('中'), tuKuai(MEI_TI_ID_B), wenZiKuai('后'), wenZiKuai('再后')],
      true,
    ],
    [
      '4 图',
      [tuKuai(diZhiUuid(1)), tuKuai(diZhiUuid(2)), tuKuai(diZhiUuid(3)), tuKuai(diZhiUuid(4))],
      true,
    ],
  ]

  const hanTuPianKuai = (kuai: XiaoXiKuaiChuCan[]): boolean =>
    kuai.some((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian)

  /**
   * 五种邻近写法：这张表必须把它们两两分辨开，否则"判据只剩含图片块"就是句空话。
   * 第一条是 FP-10a 落地后的终态口径，第二条是反转前的过渡口径（回归它就等于把需求 #6 撤回）。
   * （`kuai.length >= 1 && 含图` 与 `只看含图` 是**逻辑等价**的两种写法，不单列，
   *  列了会让"两两可分辨"这条断言假红——等价性本身就是审计给的反例。）
   */
  const HOU_XUAN_PAN_JU: Array<[string, (kuai: XiaoXiKuaiChuCan[]) => boolean]> = [
    ['FP-10a 终态：只看含图', (kuai) => hanTuPianKuai(kuai)],
    ['FP-10a 反转前（过渡口径）：≥2 且含图', (kuai) => kuai.length >= 2 && hanTuPianKuai(kuai)],
    ['更严：≥3 且含图', (kuai) => kuai.length >= 3 && hanTuPianKuai(kuai)],
    ['恰好 ==2 且含图', (kuai) => kuai.length === 2 && hanTuPianKuai(kuai)],
    ['只看得出数：≥2', (kuai) => kuai.length >= 2],
    ['图文混排（含图且含字）才按块画', (kuai) => hanTuPianKuai(kuai) && kuai.some((x) => x.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi)],
  ]

  function 判据向量(判据: (kuai: XiaoXiKuaiChuCan[]) => boolean): string {
    return XING_TAI_BIAO.map(([, kuai, 期望]) => (判据(kuai) === 期望 ? '1' : '0')).join('')
  }

  function 实际判据(kuai: XiaoXiKuaiChuCan[]): boolean {
    return shiXuYaoKuaiXuanRan(zaoXiaoXi({ nei_rong: '', nei_rong_kuai: kuai }))
  }

  it('在位守卫（行为层）：判据恒为「含图片块」，六种邻近写法（含反转前的 ≥2）两两可分辨', () => {
    const 偏差: string[] = []
    for (const [名, kuai, 期望] of XING_TAI_BIAO) {
      const 实得 = 实际判据(kuai)
      if (实得 !== 期望) 偏差.push(`${名}：期望 ${期望}，实得 ${实得}`)
    }
    expect(偏差, '判据与 FP-10a 终态口径（含图片块）不符 ⇒ 反转被改回去了').toEqual([])
    // 形态表对六种邻近写法两两可分辨 ⇒ 钉死的确实是「含图片块」这一条，不是碰巧命中
    const 向量 = HOU_XUAN_PAN_JU.map(([名, 判据]) => [名, 判据向量(判据)] as const)
    expect(new Set(向量.map(([, x]) => x)).size).toBe(HOU_XUAN_PAN_JU.length)
    expect(判据向量(实际判据)).toBe(向量[0][1])
    for (const [名, x] of 向量.slice(1)) expect(判据向量(实际判据), 名).not.toBe(x)
  })

  /**
   * 反证（FP-10a 规定的两项之一）：判据回退成 `>= 2` 时新用例必红。
   * 这里用**本地夹具源码**而不是 `utils/消息内容块.ts` 的真实文本来演示"锁文本为何不算守卫"——
   * 审计 B10 的教训是：一旦断言读的是模块源串的某段文本，模块换措辞就假红、真实回归却可能假绿；
   * 上面那条行为层守卫与文本无关，所以它既不会被措辞伤到，也一定会被回归伤到。
   */
  it('反证：判据退回「≥2 且含图」必红；锁源码文本的老写法对同一回归反而不红', () => {
    const GUO_DU_KOU_JING = /kuai\.length >= 2 && youTuPianKuai\(kuai\)/
    const GUO_DU_ZHU_SHI = '【过渡口径 · 归 FP-10】'
    // ① 反转前真实存在于模块里的两行（判据 + 登记注释）：文本锁当时"看起来"钉得住
    const GUO_DU_YUAN = [
      '  return kuai.length >= 2 && youTuPianKuai(kuai)',
      ` * ${GUO_DU_ZHU_SHI}`,
    ].join('\n')
    expect(GUO_DU_KOU_JING.test(GUO_DU_YUAN)).toBe(true)
    expect(GUO_DU_YUAN).toContain(GUO_DU_ZHU_SHI)

    // ② 行为等价的合法改写（格式化 + 注释换措辞）⇒ 两条文本锁同时灭（假红），行为一分未变
    const DENG_JIA_GAI_XIE = [
      '  return kuai.length>=2 && youTuPianKuai(kuai)',
      ' * 【边界待改 · 由 FP-10 处理】',
    ].join('\n')
    expect(GUO_DU_KOU_JING.test(DENG_JIA_GAI_XIE)).toBe(false)
    expect(DENG_JIA_GAI_XIE).not.toContain(GUO_DU_ZHU_SHI)

    // ③ 真实回归（`>= 2` 被换成 `>= 1`，注释原样留着）⇒ 注释锁不红（假绿），而判据文本锁才红
    const HUI_GUI_YUAN = [
      '  return kuai.length >= 1 && youTuPianKuai(kuai)',
      ` * ${GUO_DU_ZHU_SHI}`,
    ].join('\n')
    expect(HUI_GUI_YUAN).toContain(GUO_DU_ZHU_SHI)
    expect(GUO_DU_KOU_JING.test(HUI_GUI_YUAN)).toBe(false)

    // ④ 本文件用的形态表把 ③ 那种回归也钉住：把过渡口径套回终态形态表 ⇒ 恰好两行不匹配
    const 过渡口径 = (kuai: XiaoXiKuaiChuCan[]): boolean =>
      kuai.length >= 2 && hanTuPianKuai(kuai)
    expect(判据向量(过渡口径)).not.toBe(判据向量(实际判据))
    expect(
      XING_TAI_BIAO.filter(([, kuai, 期望]) => 过渡口径(kuai) !== 期望).map(([名]) => 名),
    ).toEqual([
      '1 个图片块（纯图历史行 · 反转落点）',
      '1 个表情包块（纯贴纸历史行 · 反转落点）',
    ])
  })
})

describe('FP-10b 不变式①：顺序即用户排的顺序', () => {
  it('kuaiDaoZhengWen 按原序内联占位符，同一张图连排两次不会被去重成一次', () => {
    const zhengWen = kuaiDaoZhengWen([
      wenZiKuai('前面'),
      tuKuai(MEI_TI_ID),
      wenZiKuai('中间'),
      tuKuai(MEI_TI_ID),
      wenZiKuai('后面'),
    ])
    expect(zhengWen).toBe('前面[图片]中间[图片]后面')
  })

  it('表情包块按 biaoqingshu 类别取 [表情包] 占位符，其余图像类取 [图片]', () => {
    const zhengWen = kuaiDaoZhengWen(
      [tuKuai(MEI_TI_ID), tuKuai(MEI_TI_ID_B), wenZiKuai('收尾')],
      { leiBieOf: (meiTiId) => (meiTiId === MEI_TI_ID_B ? 'biaoqingshu' : 'tupian') },
    )
    expect(zhengWen).toBe('[图片][表情包]收尾')
  })

  it('空块序列投影为空串；纯文字块序列逐字拼接（不加任何分隔符）', () => {
    expect(kuaiDaoZhengWen([])).toBe('')
    expect(kuaiDaoZhengWen([wenZiKuai('甲'), wenZiKuai('乙')])).toBe('甲乙')
  })

  it('kuaiDaoXiaoXiLeiXing：纯图 ⇒ 图片码，表情包图 ⇒ 表情包码，掺了文字 ⇒ wenben', () => {
    expect(kuaiDaoXiaoXiLeiXing([tuKuai(MEI_TI_ID)])).toBe('tuPian')
    expect(kuaiDaoXiaoXiLeiXing([tuKuai(MEI_TI_ID, { mei_ti_lei_bie: 'biaoqingshu' })])).toBe(
      'biaoQingBao',
    )
    expect(kuaiDaoXiaoXiLeiXing([tuKuai(MEI_TI_ID), wenZiKuai('带字')])).toBe('wenben')
    expect(kuaiDaoXiaoXiLeiXing([wenZiKuai('只有字')])).toBe('wenben')
    expect(kuaiDaoXiaoXiLeiXing([])).toBe('wenben')
    // 派生只认「有没有文字块正文」，不做 trim：提交侧的空块由 keTiJiaoKuai 先丢掉，
    // 因此到服务端/到这里时剩下的文字块都是用户真打过的字
    expect(kuaiDaoXiaoXiLeiXing([tuKuai(MEI_TI_ID), wenZiKuai('   ')])).toBe('wenben')
    // 陌生块类型既不贡献文字也不算图片，只按可认块派生
    expect(kuaiDaoXiaoXiLeiXing([{ lei_xing: 'yuyin' }, tuKuai(MEI_TI_ID)])).toBe('tuPian')
  })
})

describe('FP-10b 提交形态与上限预检', () => {
  it('keTiJiaoKuai 剥掉服务端签发的地址/类别，值域归回权威块类型，顺序与重复都保真', () => {
    const tiJiao = keTiJiaoKuai([
      { lei_xing: 'tuPian', mei_ti_id: ` ${MEI_TI_ID} `, mei_ti_url: QIAN_MING_URL, mei_ti_lei_bie: 'tupian' },
      { lei_xing: 'wenben', nei_rong: ' 打错成消息类型的块 ' },
      tuKuai(MEI_TI_ID),
    ] as unknown as XiaoXiKuaiChuCan[])
    expect(tiJiao).toEqual([
      { lei_xing: 'tupian', mei_ti_id: MEI_TI_ID, mei_ti_lei_bie: 'tupian' },
      { lei_xing: 'wenzi', nei_rong: '打错成消息类型的块' },
      { lei_xing: 'tupian', mei_ti_id: MEI_TI_ID },
    ])
    expect(tiJiao[0]).not.toHaveProperty('mei_ti_url')
  })

  it('keTiJiaoKuai 丢弃空文字块与非 UUID 媒体 ID（与后端 yanZhengUUID 同口径），但绝不去重', () => {
    const di = diZhiUuid(1)
    const tiJiao = keTiJiaoKuai([
      wenZiKuai(''),
      wenZiKuai('   '),
      { lei_xing: 'tupian', mei_ti_id: 'm1' },
      { lei_xing: 'tupian' },
      tuKuai(di),
      tuKuai(di),
    ])
    expect(tiJiao).toEqual([
      { lei_xing: 'tupian', mei_ti_id: di },
      { lei_xing: 'tupian', mei_ti_id: di },
    ])
  })

  it('panDingKuaiChaoXian 的上限全部来自配置：块数 → 图片数 → 字数，按此优先级报因', () => {
    const buMan = [tuKuai(MEI_TI_ID), wenZiKuai('短句')]
    const wuChaoXian: KuaiChaoXianQingKuang = { chaoXian: false, yuanYin: '' }
    expect(panDingKuaiChaoXian(buMan)).toEqual(wuChaoXian)

    const chaoTu: XiaoXiKuai[] = Array.from(
      { length: XIAO_XI_KUAI_PEI_ZHI.zuiDaTuPianShu + 1 },
      (_w, i) => tuKuai(diZhiUuid(i)),
    )
    expect(panDingKuaiChaoXian(chaoTu)).toEqual({ chaoXian: true, yuanYin: 'tupianshu' })

    const chaoKuai: XiaoXiKuai[] = Array.from(
      { length: XIAO_XI_KUAI_PEI_ZHI.zuiDaKuaiShu + 1 },
      () => wenZiKuai('字'),
    )
    expect(panDingKuaiChaoXian(chaoKuai)).toEqual({ chaoXian: true, yuanYin: 'kuaishu' })

    const chaoZi: XiaoXiKuai[] = [wenZiKuai('字'.repeat(XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu + 1))]
    expect(panDingKuaiChaoXian(chaoZi)).toEqual({ chaoXian: true, yuanYin: 'zishu' })

    // 块数与图片数同时超 ⇒ 先报块数（判序即优先级）
    expect(panDingKuaiChaoXian([...chaoKuai, ...chaoTu])).toEqual({ chaoXian: true, yuanYin: 'kuaishu' })
  })

  it('上限口径是「不得超过」：恰好等于上限的块数/图片数/字数都不报超（与后端一致）', () => {
    const gangGang: XiaoXiKuai[] = [
      ...Array.from({ length: XIAO_XI_KUAI_PEI_ZHI.zuiDaTuPianShu }, (_w, i) => tuKuai(diZhiUuid(i))),
      wenZiKuai('字'.repeat(XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu)),
    ]
    expect(gangGang.length).toBe(XIAO_XI_KUAI_PEI_ZHI.zuiDaTuPianShu + 1)
    expect(gangGang.length).toBeLessThanOrEqual(XIAO_XI_KUAI_PEI_ZHI.zuiDaKuaiShu)
    expect(panDingKuaiChaoXian(gangGang)).toEqual({ chaoXian: false, yuanYin: '' })

    const qiaGangKuaiShu: XiaoXiKuai[] = Array.from(
      { length: XIAO_XI_KUAI_PEI_ZHI.zuiDaKuaiShu },
      () => wenZiKuai('字'),
    )
    expect(panDingKuaiChaoXian(qiaGangKuaiShu).chaoXian).toBe(false)
  })

  it('字数只量用户自己的文字：图片块的 [图片] 占位符不占字数预算', () => {
    const manMan: XiaoXiKuai[] = [
      ...Array.from({ length: 8 }, () => tuKuai(MEI_TI_ID)),
      wenZiKuai('字'.repeat(XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu)),
    ]
    expect(kuaiDaoZhengWen(manMan).length).toBeGreaterThan(XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu)
    expect(panDingKuaiChaoXian(manMan).chaoXian).toBe(false)
  })

  it('kuaiYuLanDiZhi 只挑出本地 blob 预览地址，服务端签名地址与缺字段都不该被回收', () => {
    expect(
      kuaiYuLanDiZhi([
        { mei_ti_url: 'blob:yu-lan' },
        { mei_ti_url: QIAN_MING_URL },
        { mei_ti_url: null },
        {},
        { mei_ti_url: undefined },
      ]),
    ).toEqual(['blob:yu-lan'])
    expect(kuaiYuLanDiZhi([])).toEqual([])
  })
})

describe('FP-10b 与后端同源（直读后端源文件把守，改一侧必红灯）', () => {
  const 后端块源 = readFileSync(
    resolve(__dirname, '../../../backend/src/services/消息内容块.ts'),
    'utf-8',
  )
  const 后端配置源 = readFileSync(
    resolve(__dirname, '../../../backend/src/config/消息配置.ts'),
    'utf-8',
  )
  const 后端视觉源 = readFileSync(
    resolve(__dirname, '../../../backend/src/services/AI视觉辅助.ts'),
    'utf-8',
  )

  it('块值域两端同值：后端 XIAO_XI_KUAI_LEI_XING 的写法变更需同步本用例', () => {
    const 命中 = /export const XIAO_XI_KUAI_LEI_XING = \{([^}]+)\}/.exec(后端块源)
    expect(命中, '后端消息内容块找不到块值域').toBeTruthy()
    const 后端值 = Object.fromEntries(
      [...命中![1].matchAll(/(\w+):\s*'([^']+)'/g)].map((pi) => [pi[1], pi[2]]),
    )
    expect(后端值).toEqual({ wenZi: 'wenzi', tuPian: 'tupian' })
    expect(后端值).toEqual({ ...XIAO_XI_KUAI_LEI_XING })
  })

  it('块数与图片数上限与后端 neiRongKuai* 同值（后端仍是唯一裁定方）', () => {
    const kuaiShu = /neiRongKuaiZuiDaKuaiShu:\s*(\d+)/.exec(后端配置源)
    const tupianShu = /neiRongKuaiZuiDaTuPianShu:\s*(\d+)/.exec(后端配置源)
    expect(kuaiShu, '后端找不到 neiRongKuaiZuiDaKuaiShu').toBeTruthy()
    expect(tupianShu, '后端找不到 neiRongKuaiZuiDaTuPianShu').toBeTruthy()
    expect(XIAO_XI_KUAI_PEI_ZHI.zuiDaKuaiShu).toBe(Number(kuaiShu![1]))
    expect(XIAO_XI_KUAI_PEI_ZHI.zuiDaTuPianShu).toBe(Number(tupianShu![1]))
  })

  it('载体占位符与后端 meiTiZhanShiWenBen 的 tupian / biaoqingshu 两行同字', () => {
    const tuPian = /case 'tupian':\s*\n\s*return yiCheHui \? '[^']+' : '([^']+)'/.exec(后端视觉源)
    const biaoQing = /case 'biaoqingshu':\s*\n\s*return yiCheHui \? '[^']+' : '([^']+)'/.exec(后端视觉源)
    expect(tuPian, '后端 tupian 占位符写法变更，需同步本用例').toBeTruthy()
    expect(biaoQing, '后端 biaoqingshu 占位符写法变更，需同步本用例').toBeTruthy()
    expect(XIAO_XI_KUAI_PEI_ZHI.tuPianZhanWei).toBe(tuPian![1])
    expect(XIAO_XI_KUAI_PEI_ZHI.biaoQingBaoZhanWei).toBe(biaoQing![1])
  })

  it('图像类媒体集合与后端 TU_XIANG_LEI_BIE 同集合（不建第二份对应表）', () => {
    const 命中 = /const TU_XIANG_LEI_BIE = new Set\(\[([^\]]+)\]\)/.exec(后端视觉源)
    expect(命中, '后端找不到 TU_XIANG_LEI_BIE').toBeTruthy()
    const 后端 = [...命中![1].matchAll(/'([^']+)'/g)].map((pi) => pi[1]).sort()
    const qianDuan = ['tupian', 'biaoqingshu']
      .filter((leiBie) => shiTuXiangMeiTiLeiBie(leiBie))
      .sort()
    expect(qianDuan).toEqual(后端)
  })

  it('文字块长度上限与后端 zuiDaXiaoXiChangDu 同值（前端预检不吃第二套数值）', () => {
    const 命中 = /zuiDaXiaoXiChangDu:\s*(\d+)/.exec(后端配置源)
    expect(命中, '后端找不到 zuiDaXiaoXiChangDu').toBeTruthy()
    expect(XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu).toBe(Number(命中![1]))
  })
})

/**
 * 【FP-21 已反转（后端半区 · 2026-09-23）· 旧契约与其前提一并作废】
 *
 * 旧契约（FP-18 钉）：好友页**不得出现**内容块判定（`guiYiXiaoXiLeiXing` / `kuaiDaoZhengWen` /
 * `guiYiKuaiLeiXing` 命中数恒为 0）。它的前提是「`好友消息` 表没有 内容块 列」——
 * 该前提已被实测推翻，且推翻它的正是本仓自己那两条建库路径：
 *  · `backend/database/migrations/036_好友消息内容与引用.sql` 补 `内容块` + `被引用消息ID`；
 *  · 空卷 initdb 的 `database/001_haoyou_yu_shezhi.sql` 同形态建这两列（含同名 FK/CHECK/索引）；
 *  · `backend/src/routes/好友.ts` 的 INSERT 列清单与出参白名单都已带上两列/两键
 *    （`nei_rong_kuai` 恒非空、`bei_yong_xiao_xi_id` 恒在为 null 而非缺键）。
 * ⇒ 「好友页即使投影出块数组也无处落库、刷新读不回」这条理由不再成立，"命中数恒为 0"
 *   于是从**保护**变成了**障碍**：它挡不住第二份实现（下面两条判据才挡得住），
 *   却会在好友页接线当天把合法形态判成红灯。故本轮放开。
 *
 * 新契约（正向）：好友页**必须与 AI 聊天页共用同一份** `@/utils/消息内容块` 真源。本 describe 因此钉三件事：
 *  ① 三个出口在好友页只允许**一种**绑定来源：`import { ... } from '@/utils/消息内容块'`；
 *     本地同名声明、从别处再导一份、自带等价实现一律红（旧契约的「0 次」只是这条规则的一个特例）。
 *  ② 好友页不得出现手写 `tupian ↔ tuPian` 归一配对 —— 原样保留（下面第一条用例）。
 *  ③ 好友页不得出现自定义 `guiYi*Kuai*` 判定 —— 原样保留。
 * ①是**单调**判据：今天好友页 0 次引用 ⇒ 绿；接线工把 import 加上 ⇒ 仍然绿；
 *   任何人绕过真源 ⇒ 红。它把「反转」拆成"来源唯一"而不是"出现次数 ≥1"，理由见下面用例的注释。
 *
 * 【为什么 ① 不写成「出现次数 ≥1」】本单被明令禁改 `frontend/src/views/**`（好友页前端接线归后续单，
 * 另有工人在跑 Playwright）。把正向"必须出现"钉进本文件，交付出来就是一条**必红且我无权修**的门禁；
 * 那不是加强契约，那是把红灯留给别人。"必须接线"这一半由后续单落地时同批改判，
 * 改动面已在 FP-21 交付摘要里逐点列明（`api/社交.ts` 的 HaoYouXiaoXi 两键 → 好友页 import 真源 →
 * 本判据升级为 ≥1）。
 *
 * 同批遗留（不在本单允许改动的文件范围内）：上一组「FP-10b 与后端同源」目前只有 AI 页侧条目，
 * 好友侧条目（`routes/好友.ts` 的出参键与 036 的两列）由 `FP22f` 的 好友消息 整节 +
 * `backend/src/routes/__tests__/FP21好友引用与内容块.test.ts` ⑤ 组把守，本文件不重复钉。
 */

/** 好友页允许出现的**唯一**块真源模块（①的判据就是这个字符串） */
const KUAI_ZHEN_YUAN_MO_KUAI = '@/utils/消息内容块'

/** 三个块出口：旧契约要求"0 次"，新契约要求"只准来自真源" */
const KUAI_ZHEN_YUAN_CHU_KOU = ['guiYiXiaoXiLeiXing', 'kuaiDaoZhengWen', 'guiYiKuaiLeiXing'] as const

/** 取源文件里所有 import 语句（含多行形式），用于判"这三个出口是从哪儿绑定的" */
function 导入语句(源: string): string[] {
  return [...源.matchAll(/import\s+(?:type\s+)?[\s\S]*?from\s*['"]([^'"]+)['"]/g)].map(
    (项) => 项[0] as string,
  )
}

/** 单个 import 语句的模块路径 */
function 导入自(项: string): string {
  return /from\s*['"]([^'"]+)['"]/.exec(项)?.[1] ?? ''
}

/** 剥掉全部 import 语句，只留本体代码（本地声明判据不看 import，避免把合法接线误读成声明） */
function 去导入(源: string): string {
  return 源.replace(/import\s+(?:type\s+)?[\s\S]*?from\s*['"][^'"]+['"];?/g, '')
}

/** 手写等价归一所链接的两个拼写：媒体类别的小写形态 ↔ 消息类型的驼峰值 */
const SHOU_XIE_GUI_YI_ZHI = new Set(['tupian', 'tuPian'])

/** 单个字符串字面量（单/双引号皆可，不跨行），只捕获值本体；配对关系由外层结构决定 */
const ZI_MIAN_LIANG = `["']([^"'\\n]+)["']`

/**
 * 「把媒体类别的小写形态就地改回消息类型驼峰值」的**配对结构**（集合判定：
 * 与书写顺序、引号种类无关；旧写法只认 `'tupian','tuPian'` 的正序，反序即漏判）。
 * 只认闭合的配对结构，不认实参列表里相邻的两个实参 ——
 * `views/好友聊天.vue:368-375` 的 `faSongHaoYouMeiTiXiaoXi('tuPian', 'tupian', 文件, 名, 幂等键, 预览)`
 * 正是反序相邻的位置实参，它是调用而不是映射表，判成命中就是假阳性。
 * 已知不覆盖：`switch` 的 `case 'tupian': return 'tuPian'` 两语句形态（反转后由「必须 import 真源」
 * 的正向断言收口，留 FP-21）。
 */
const GUI_YI_PEI_DUI_XING_TAI: ReadonlyArray<readonly [string, RegExp]> = [
  ['闭合二元数组/Map 条目', new RegExp(`\\[\\s*${ZI_MIAN_LIANG}\\s*,\\s*${ZI_MIAN_LIANG}\\s*\\]`, 'g')],
  ['对象/Map 字面量条目', new RegExp(`${ZI_MIAN_LIANG}\\s*:\\s*${ZI_MIAN_LIANG}`, 'g')],
  ['同一表达式内的三元改写', new RegExp(`${ZI_MIAN_LIANG}[^;\\n]{0,30}\\?\\s*${ZI_MIAN_LIANG}`, 'g')],
  ['同一表达式内的 return 改写', new RegExp(`${ZI_MIAN_LIANG}[^;\\n]{0,30}return\\s+${ZI_MIAN_LIANG}`, 'g')],
]

/** `guiYi*Kuai*` 形状的自定义判定的**全部定义形态**（旧写法只认函数声明，箭头与对象方法都绕得过） */
const DING_YI_XING_TAI: ReadonlyArray<readonly [string, RegExp]> = [
  ['函数声明', new RegExp(`(?:^|[\\s;}])function\\s+guiYi\\w*Kuai\\w*\\s*[<(]`, 'gm')],
  ['具名赋值（含箭头函数）', new RegExp(`(?:const|let|var)\\s+guiYi\\w*Kuai\\w*\\s*=`, 'g')],
  ['对象/类方法简写', new RegExp(`(?:^|[\\s,{])guiYi\\w*Kuai\\w*\\s*\\([^)]*\\)\\s*\\{`, 'gm')],
  ['属性: 函数值', new RegExp(`guiYi\\w*Kuai\\w*\\s*:\\s*(?:async\\s+)?(?:function\\s*\\(|[^\\n]*=>)`, 'g')],
]

/** 返回源内所有「tupian ↔ tuPian 手写归一映射」，元素带形态名，便于红灯时直接读出漏网点 */
function 找出手写归一映射(源: string): string[] {
  const 命中: string[] = []
  for (const [形态, 模式] of GUI_YI_PEI_DUI_XING_TAI) {
    for (const 项 of 源.matchAll(模式)) {
      const 两端 = [项[1], 项[2]]
      if (new Set(两端).size === 2 && 两端.every((zhi) => SHOU_XIE_GUI_YI_ZHI.has(zhi))) {
        命中.push(`${形态} -> ${项[0]}`)
      }
    }
  }
  return 命中
}

/** 返回源内所有自定义块判定的定义点（四种形态一视同仁；import 后的调用点不在内） */
function 找出手写归一定义(源: string): string[] {
  const 命中: string[] = []
  for (const [形态, 模式] of DING_YI_XING_TAI) {
    for (const 项 of 源.matchAll(模式)) 命中.push(`${形态} -> ${项[0].trim()}`)
  }
  return 命中
}

describe('FP-10b 唯一实现：内容块判定全库只有一份', () => {
  const 前端源目录 = resolve(__dirname, '..')
  function 遍历(目录: string): string[] {
    const 结果: string[] = []
    for (const 项 of readdirSync(目录, { withFileTypes: true })) {
      if (项.name === '__tests__' || 项.name === 'node_modules') continue
      const 完整 = resolve(目录, 项.name)
      if (项.isDirectory()) 结果.push(...遍历(完整))
      else if (/\.(ts|vue)$/.test(项.name)) 结果.push(完整)
    }
    return 结果
  }

  it('块判定的每个出口在前端 src 内只有一处定义，其余一律是 import 后调用', () => {
    const 定义点: Record<string, string[]> = {}
    for (const ming of [
      'guiYiKuaiLeiXing',
      'guiYiXiaoXiLeiXing',
      'shiTuXiangMeiTiLeiBie',
      'guiYiKuaiLieBiao',
      'fanGouKuaiCongXiaoXi',
      'huoQuXianShiKuai',
      'shiXuYaoKuaiXuanRan',
      'kuaiDaoZhengWen',
      'kuaiDaoXiaoXiLeiXing',
      'keTiJiaoKuai',
      'panDingKuaiChaoXian',
      'kuaiYuLanDiZhi',
      // FP-24a：呈现侧的贴纸类别判定也属"全库只准一份"的那一族，纳入同一张定义点清单
      'shiBiaoQingBaoMeiTiLeiBie',
      'shiBiaoQingBaoKuai',
    ]) {
      定义点[ming] = 遍历(前端源目录)
        .filter((luJing) =>
          new RegExp(`^(export )?function ${ming}\\b`, 'm').test(
            readFileSync(luJing, 'utf-8'),
          ),
        )
        .map((luJing) => luJing.replace(/\\/g, '/').split('/src/')[1])
    }
    const 第二份 = Object.entries(定义点).filter(([_ming, luJing]) => luJing.length !== 1)
    expect(第二份).toEqual([])
  })

  it('好友页只准从 utils/消息内容块 那一份真源取块判定（FP-21 反转后的正向契约）', () => {
    const 好友页 = readFileSync(resolve(前端源目录, 'views/好友聊天.vue'), 'utf-8')
    // ① 来源唯一：三个出口若被 import，其模块路径必须逐字是 '@/utils/消息内容块'。
    //    旧契约在这里判「出现次数恒为 0」，前提（好友消息表没有内容块列）已被 迁移 036 推翻。
    const 非法来源 = 导入语句(好友页)
      .filter((项) => KUAI_ZHEN_YUAN_CHU_KOU.some((名) => new RegExp(`\\b${名}\\b`).test(项)))
      .filter((项) => 导入自(项) !== KUAI_ZHEN_YUAN_MO_KUAI)
      .map((项) => 导入自(项))
    expect(非法来源, '好友页的块出口从第二处绑定 ⇒ 两页必然漂移').toEqual([])
    // ①之三：FP-21 接线后升级为 ≥1 次真源绑定（旧的「来源唯一但 0 次」在接线落地后不再够用）
    const 真源绑定 = 导入语句(好友页).filter(
      (项) => KUAI_ZHEN_YUAN_CHU_KOU.some((名) => new RegExp(`\\b${名}\\b`).test(项)) && 导入自(项) === KUAI_ZHEN_YUAN_MO_KUAI,
    )
    expect(真源绑定.length, '好友页必须至少一次从 @/utils/消息内容块 绑定块出口').toBeGreaterThanOrEqual(1)
    // ①之二：这三个名字不得在好友页里被**本地声明**（函数/变量/对象方法/解构赋值一律算）
    const 本地声明 = 去导入(好友页).match(
      /(?:^|\s)(?:const|let|var|function)\s+(?:guiYiXiaoXiLeiXing|kuaiDaoZhengWen|guiYiKuaiLeiXing)\b/g,
    )
    expect(本地声明 ?? [], '好友页自带了第二份块判定实现').toEqual([])

    // ②③ 旧契约里**仍然成立**的两半：手写等价归一（把媒体类别的小写形态就地改回消息类型驼峰值）
    // 与自定义 `guiYi*Kuai*` 判定一律拦。这里是**配对/集合判定**：与书写顺序、引号种类无关。
    // 旧写法 /['"]tupian['"]\s*,\s*['"]tuPian['"]/ 只端正序相邻，反序 `'tuPian','tupian'` 当场漏判。
    expect(找出手写归一映射(好友页)).toEqual([])
    // 旧写法 /function guiYi\w*Kuai\w*\(/ 只端函数声明，`const guiYiKuai = (...) =>` 与对象方法简写都绕得过。
    expect(找出手写归一定义(好友页)).toEqual([])
  })

  /**
   * 反转的**反证**：把新契约退回旧契约（"命中数恒为 0"）会怎样？
   * 答案：接线工人在好友页写下 `import { guiYiKuaiLeiXing } from '@/utils/消息内容块'` 那一刻，
   * 旧判据直接红 —— 这就是"旧契约从保护变成障碍"的具体形态。本用例把这一件事钉成事实，
   * 而不是留一句注释让下一个人自己想象。
   */
  it('反证：旧契约「命中数恒为 0」会把合法接线判成红灯；新契约放过它并仍拦住第二份实现', () => {
    // 合法接线形态（FP-21 反转后唯一允许的样子）
    const JIE_XIAN_YUAN = [
      `import { guiYiKuaiLeiXing, kuaiDaoZhengWen } from '${KUAI_ZHEN_YUAN_MO_KUAI}'`,
      'const zhengWen = kuaiDaoZhengWen(kuai)',
      'const leiXing = guiYiKuaiLeiXing(xiang.lei_xing)',
    ].join('\n')
    // ① 旧判据对它是红灯（出现次数 != 0）
    const 旧判据命中数 = KUAI_ZHEN_YUAN_CHU_KOU.reduce(
      (总, 名) => 总 + (JIE_XIAN_YUAN.match(new RegExp(名, 'g')) ?? []).length,
      0,
    )
    expect(旧判据命中数, '夹具没造出"接线后必红"的形态 ⇒ 本反证是空判').toBeGreaterThan(0)
    // ② 新判据三条一律放过
    const 非法来源 = 导入语句(JIE_XIAN_YUAN)
      .filter((项) => KUAI_ZHEN_YUAN_CHU_KOU.some((名) => new RegExp(`\\b${名}\\b`).test(项)))
      .filter((项) => 导入自(项) !== KUAI_ZHEN_YUAN_MO_KUAI)
    expect(非法来源).toEqual([])
    expect(找出手写归一映射(JIE_XIAN_YUAN)).toEqual([])
    expect(找出手写归一定义(JIE_XIAN_YUAN)).toEqual([])

    // ③ 但新判据照样抓住三种真违规（否则①②那条绿只是"什么都拦不住"）
    const WEI_GUI: Array<[string, string]> = [
      [
        '从别的模块再导一份同名出口',
        `import { guiYiKuaiLeiXing } from '@/utils/消息内容块副本'\nconst z = guiYiKuaiLeiXing(x)`,
      ],
      [
        '本地函数声明',
        `function kuaiDaoZhengWen(kuai: unknown[]): string { return String(kuai) }`,
      ],
      ['本地箭头赋值', `const guiYiXiaoXiLeiXing = (zhi: string) => zhi`],
    ]
    for (const [名, 源] of WEI_GUI) {
      const 红 =
        导入语句(源)
          .filter((项) => KUAI_ZHEN_YUAN_CHU_KOU.some((ming) => new RegExp(`\\b${ming}\\b`).test(项)))
          .filter((项) => 导入自(项) !== KUAI_ZHEN_YUAN_MO_KUAI).length > 0 ||
        /(?:^|\s)(?:const|let|var|function)\s+(?:guiYiXiaoXiLeiXing|kuaiDaoZhengWen|guiYiKuaiLeiXing)\b/.test(
          去导入(源),
        )
      expect(红, `${名} 必须被新契约拦下 ⇒ 判据空判`).toBe(true)
    }
  })

  it('上述两条判定的加固有效：旧断言的漏判先被夹具证伪，再被新判定抓住且不误判', () => {
    // ① 先证伪：旧断言真的放过这些形态（不是推测，是逐条实测）
    const JIU_PEI_DUI = /['"]tupian['"]\s*,\s*['"]tuPian['"]/
    const JIU_DING_YI = /function guiYi\w*Kuai\w*\(/
    expect(JIU_PEI_DUI.test(`const BIAO = [['tuPian', 'tupian']]`)).toBe(false)
    expect(JIU_PEI_DUI.test(`const BIAO = { "tuPian": "tupian" }`)).toBe(false)
    expect(JIU_DING_YI.test(`const guiYiKuai = (zhi: unknown) => zhi`)).toBe(false)
    expect(JIU_DING_YI.test(`const ZH = { guiYiKuaiLeiXing(zhi: string) { return zhi } }`)).toBe(false)
    expect(JIU_DING_YI.test(`const ZH = { guiYiKuaiLeiXing: (zhi: string) => zhi }`)).toBe(false)

    // ② 新判定的配对侧：两种顺序、两种引号、四种配对结构全部抓住
    const PEI_DUI_JU_JIA: Array<[string, string]> = [
      ['反序闭合数组', `const BIAO = [['tuPian', 'tupian']]`],
      ['正序闭合数组', `const BIAO = [['tupian', 'tuPian']]`],
      ['反序对象条目（双引号）', `const BIAO = { "tuPian": "tupian" }`],
      ['正序对象条目（单引号）', `const BIAO = { 'tupian': 'tuPian' }`],
      ['比较后三元改写', `const BIAO = (x: string) => (x === 'tupian' ? 'tuPian' : x)`],
      ['字面量在左的三元改写', `const BIAO = (x: string) => ('tupian' === x ? 'tuPian' : x)`],
      ['比较后 return 改写', `function biao(x: string) { if (x === 'tuPian') return 'tupian'; return x }`],
    ]
    for (const [biaoQian, yuan] of PEI_DUI_JU_JIA) {
      expect(找出手写归一映射(yuan), biaoQian).not.toHaveLength(0)
    }

    // ③ 新判定的定义侧：四种定义形态全部抓住
    const DING_YI_JU_JIA: Array<[string, string]> = [
      ['export function 声明', `export function guiYiKuaiLeiXing(zhi: unknown) { return zhi }`],
      ['箭头函数（具名赋值）', `const guiYiKuai = (zhi: unknown) => zhi`],
      ['对象方法简写', `const ZH = { guiYiKuaiLeiXing(zhi: string) { return zhi } }`],
      ['属性: 箭头函数值', `const ZH = { guiYiKuaiLeiXing: (zhi: string) => zhi }`],
    ]
    for (const [biaoQian, yuan] of DING_YI_JU_JIA) {
      expect(找出手写归一定义(yuan), biaoQian).not.toHaveLength(0)
    }

    // ④ 不误判：位置实参列表不是映射表（好友聊天.vue:368-375 的真实形状），
    //    且 FP-21 反转后「import 真源 + 调用」的合法形态必须零命中，否则反转当天就自缚
    const BU_WU_PAN: Array<[string, string]> = [
      [
        '反序相邻的位置实参',
        `await faSongHaoYouMeiTiXiaoXi(\n  'tuPian',\n  'tupian',\n  wenJian,\n  ming,\n)`,
      ],
      [
        'import 真源后调用',
        `import { guiYiKuaiLeiXing, kuaiDaoZhengWen } from '@/utils/消息内容块'\n` +
          `const zhi = guiYiKuaiLeiXing(xiang.lei_xing)\n` +
          `if (guiYiKuaiLeiXing(zhi)) { zhengWen = kuaiDaoZhengWen(kuai) }`,
      ],
    ]
    for (const [biaoQian, yuan] of BU_WU_PAN) {
      expect(找出手写归一映射(yuan), biaoQian).toEqual([])
      expect(找出手写归一定义(yuan), biaoQian).toEqual([])
    }
  })
})
