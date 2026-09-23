import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fanYi, huoQuFanYi } from '@/config/translations'
import { BIAO_QING_TIAN_JIA_PEI_ZHI } from '@/config/表情配置'
import {
  baoCunBiaoQingPaiXu,
  huoQuWoDeBiaoQing,
  shanChuBiaoQing,
  tianJiaBiaoQing,
  type BiaoQingXiang,
} from '@/api/表情'
import { 使用表情仓库 } from '@/stores/表情'
import { 声明块清单, 按档解析全部 } from './主题令牌真源'

const httpGetMock = vi.fn()
const httpPostMock = vi.fn()
const httpPutMock = vi.fn()
const httpDeleteMock = vi.fn()

vi.mock('@/api/请求', async () => {
  const shiJi = await vi.importActual<typeof import('@/api/请求')>('@/api/请求')
  return {
    ...shiJi,
    default: {
      get: (...canShu: unknown[]) => httpGetMock(...canShu),
      post: (...canShu: unknown[]) => httpPostMock(...canShu),
      put: (...canShu: unknown[]) => httpPutMock(...canShu),
      delete: (...canShu: unknown[]) => httpDeleteMock(...canShu),
    },
  }
})

function zaoXiang(id: string, paiXu: number): BiaoQingXiang {
  return {
    id,
    mei_ti_id: `mei-ti-${id}`,
    sha256: id.padEnd(64, '0').slice(0, 64),
    mime: 'image/png',
    duan_ming: `表情${id}`,
    pai_xu: paiXu,
    chuang_jian_shi_jian: '2026-09-20T00:00:00.000Z',
    mei_ti_url: `/api/媒体/${id}?e=1&s=x`,
  }
}

function 响应(...xiang: BiaoQingXiang[]) {
  return { data: { cheng_gong: true, shu_ju: { lie_biao: xiang, zong_shu: xiang.length } } }
}

function 添加响应(xiang: BiaoQingXiang) {
  return { data: { cheng_gong: true, shu_ju: { biao_qing: xiang } } }
}

describe('FP-06b 表情仓库：按账号拉取与跨端一致', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('首次打开按账号拉取，同账号重复打开不重复请求', async () => {
    httpGetMock.mockResolvedValue(响应(zaoXiang('a1', 0)))
    const cang = 使用表情仓库()
    await cang.jiaZai('u-jia')
    await cang.jiaZai('u-jia')
    expect(httpGetMock).toHaveBeenCalledTimes(1)
    expect(cang.woDeBiaoQing.map((x) => x.id)).toEqual(['a1'])
    expect(cang.dangQianYongHuId).toBe('u-jia')
  })

  it('换账号先清空上一账号列表再拉取（甲的表情不得出现在乙的面板）', async () => {
    httpGetMock.mockResolvedValueOnce(响应(zaoXiang('jia-1', 0)))
    const cang = 使用表情仓库()
    await cang.jiaZai('u-jia')
    expect(cang.woDeBiaoQing).toHaveLength(1)

    let jieSuo: ((z: unknown) => void) | null = null
    httpGetMock.mockImplementationOnce(
      () =>
        new Promise((jieJue) => {
          jieSuo = jieJue
        }),
    )
    const qingQiu = cang.jiaZai('u-yi')
    expect(cang.woDeBiaoQing).toHaveLength(0)
    expect(cang.dangQianYongHuId).toBeNull()
    jieSuo!(响应(zaoXiang('yi-1', 0)))
    await qingQiu
    expect(cang.woDeBiaoQing.map((x) => x.id)).toEqual(['yi-1'])
    expect(cang.dangQianYongHuId).toBe('u-yi')
  })

  it('签名 URL 过期时的强制重拉绕过去重', async () => {
    httpGetMock.mockResolvedValue(响应(zaoXiang('a1', 0)))
    const cang = 使用表情仓库()
    await cang.jiaZai('u-jia')
    await cang.chongXinJiaZai()
    expect(httpGetMock).toHaveBeenCalledTimes(2)
  })

  it('列表与排序只存在服务端：全程不写 localStorage（换设备/换端一致的前提）', async () => {
    httpGetMock.mockResolvedValue(响应(zaoXiang('a1', 0), zaoXiang('a2', 1)))
    httpPostMock.mockResolvedValue(添加响应(zaoXiang('a3', 2)))
    httpDeleteMock.mockResolvedValue(响应())
    httpPutMock.mockResolvedValue(响应(zaoXiang('a2', 0), zaoXiang('a1', 1), zaoXiang('a3', 2)))
    const cang = 使用表情仓库()
    await cang.jiaZai('u-jia')
    await cang.tianJia(new File(['x'], 'a.png', { type: 'image/png' }))
    await cang.yiDong('qian', 'a1')
    await cang.shanChu('a3')
    await cang.chongXinJiaZai()
    expect(localStorage.length).toBe(0)
  })

  it('拉取失败：不抛错、列表保持空态且提示走翻译键', async () => {
    httpGetMock.mockRejectedValue(new Error('net'))
    const cang = 使用表情仓库()
    await expect(cang.jiaZai('u-jia')).resolves.toBeUndefined()
    expect(cang.woDeBiaoQing).toEqual([])
    expect(cang.cuoWuXinXi).toBe(huoQuFanYi('duoMeiTi', 'biaoQingJiaZaiShiBai'))
    expect(cang.dangQianYongHuId).toBeNull()
  })
})

describe('FP-06b 表情仓库：增删排序', () => {
  let cang: ReturnType<typeof 使用表情仓库>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    cang = 使用表情仓库()
    cang.woDeBiaoQing = [zaoXiang('a1', 0), zaoXiang('a2', 1), zaoXiang('a3', 2)]
    cang.dangQianYongHuId = 'u-jia'
  })

  it('添加成功追加一条，服务端回同一 id 两次也不产生第二条', async () => {
    httpPostMock.mockResolvedValue(添加响应(zaoXiang('a4', 3)))
    await cang.tianJia(new File(['x'], 'a4.png', { type: 'image/png' }), 'a4.png')
    await cang.tianJia(new File(['x'], 'a4.png', { type: 'image/png' }), 'a4.png')
    expect(cang.woDeBiaoQing.map((x) => x.id)).toEqual(['a1', 'a2', 'a3', 'a4'])
    expect(httpPostMock).toHaveBeenCalledTimes(2)
  })

  it('添加失败：列表不变，优先用后端 ti_shi 文案', async () => {
    httpPostMock.mockRejectedValue({ response: { data: { ti_shi: '表情数量已满' } } })
    const jieGuo = await cang.tianJia(new File(['x'], 'a.png', { type: 'image/png' }))
    expect(jieGuo).toBeNull()
    expect(cang.cuoWuXinXi).toBe('表情数量已满')
    expect(cang.woDeBiaoQing).toHaveLength(3)
  })

  it('添加始终带文件名（后端据此落 短名）', async () => {
    httpPostMock.mockResolvedValue(添加响应(zaoXiang('a4', 3)))
    await cang.tianJia(new File(['x'], '我的狗头.png', { type: 'image/png' }), '我的狗头.png')
    const formData = httpPostMock.mock.calls[0][1] as FormData
    expect((formData.get('file') as File).name).toBe('我的狗头.png')
  })

  it('删除成功移除，失败保留原条目并提示', async () => {
    httpDeleteMock.mockResolvedValueOnce(响应())
    await expect(cang.shanChu('a1')).resolves.toBe(true)
    expect(cang.woDeBiaoQing.map((x) => x.id)).toEqual(['a2', 'a3'])
    expect(httpDeleteMock.mock.calls[0][0]).toBe('/表情/我的/a1')

    httpDeleteMock.mockRejectedValueOnce(new Error('boom'))
    await expect(cang.shanChu('a2')).resolves.toBe(false)
    expect(cang.woDeBiaoQing.map((x) => x.id)).toEqual(['a2', 'a3'])
    expect(cang.cuoWuXinXi).toBe(huoQuFanYi('duoMeiTi', 'biaoQingShanChuShiBai'))
  })

  it('后移把完整顺序提交服务端并以服务端回包为准', async () => {
    httpPutMock.mockResolvedValue(响应(zaoXiang('a2', 0), zaoXiang('a1', 1), zaoXiang('a3', 2)))
    await cang.yiDong('hou', 'a1')
    expect(httpPutMock.mock.calls[0][1]).toEqual({ shunXu: ['a2', 'a1', 'a3'] })
    expect(cang.woDeBiaoQing.map((x) => x.id)).toEqual(['a2', 'a1', 'a3'])
  })

  it('前移首条与后移末条不提交（零请求）', async () => {
    await cang.yiDong('qian', 'a1')
    await cang.yiDong('hou', 'a3')
    expect(httpPutMock).not.toHaveBeenCalled()
    expect(cang.woDeBiaoQing.map((x) => x.id)).toEqual(['a1', 'a2', 'a3'])
  })

  it('排序失败重拉服务端真序，不把本地错序留在面板', async () => {
    httpPutMock.mockRejectedValue(new Error('boom'))
    httpGetMock.mockResolvedValue(响应(zaoXiang('a1', 0), zaoXiang('a2', 1), zaoXiang('a3', 2)))
    await cang.yiDong('hou', 'a1')
    expect(cang.woDeBiaoQing.map((x) => x.id)).toEqual(['a1', 'a2', 'a3'])
    expect(cang.cuoWuXinXi).toBe(huoQuFanYi('duoMeiTi', 'biaoQingPaiXuShiBai'))
    expect(httpGetMock).toHaveBeenCalledTimes(1)
  })

  it('登出清空：账号上下文与列表一并归零', async () => {
    cang.qingKong()
    expect(cang.woDeBiaoQing).toEqual([])
    expect(cang.dangQianYongHuId).toBeNull()
    expect(cang.tianJiaZhong).toBe(false)
  })
})

describe('FP-06b 表情 API 契约', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('四条请求都打在 /表情/我的 下且不自行拼 /api 前缀', async () => {
    httpGetMock.mockResolvedValue(响应())
    httpPostMock.mockResolvedValue(添加响应(zaoXiang('a1', 0)))
    httpPutMock.mockResolvedValue(响应())
    httpDeleteMock.mockResolvedValue(响应())

    await huoQuWoDeBiaoQing()
    await tianJiaBiaoQing(new File(['x'], 'a.png', { type: 'image/png' }))
    await baoCunBiaoQingPaiXu(['a1'])
    await shanChuBiaoQing('a1')

    expect(httpGetMock.mock.calls[0][0]).toBe('/表情/我的')
    expect(httpPostMock.mock.calls[0][0]).toBe('/表情/我的')
    expect(httpPutMock.mock.calls[0][0]).toBe('/表情/我的/排序')
    expect(httpDeleteMock.mock.calls[0][0]).toBe('/表情/我的/a1')
    expect(httpPutMock.mock.calls[0][1]).toEqual({ shunXu: ['a1'] })
  })

  it('添加用 multipart 表单且文件名缺省兜底，超时取配置', async () => {
    httpPostMock.mockResolvedValue(添加响应(zaoXiang('a1', 0)))
    await tianJiaBiaoQing(new Blob(['x'], { type: 'image/png' }))
    const [, formData, options] = httpPostMock.mock.calls[0] as [
      string,
      FormData,
      { headers: Record<string, string>; timeout: number },
    ]
    expect(formData).toBeInstanceOf(FormData)
    expect((formData.get('file') as File).name).toBe('biaoqing.png')
    expect(options.headers['Content-Type']).toBe('multipart/form-data')
    expect(options.timeout).toBe(BIAO_QING_TIAN_JIA_PEI_ZHI.chaoShiHaoMiao)
  })

  it('响应缺 shu_ju 时回空列表而非抛错', async () => {
    httpGetMock.mockResolvedValue({ data: {} })
    await expect(huoQuWoDeBiaoQing()).resolves.toEqual({ lie_biao: [], zong_shu: 0 })
  })
})

describe('FP-06b 客户端与后端 biaoqingshu 边界同源（读后端源文件把守）', () => {
  const 后端配置 = readFileSync(
    resolve(__dirname, '../../../backend/src/config/媒体配置.ts'),
    'utf-8',
  )

  function 取白名单(键: string): string[] {
    const 段起始 = 后端配置.indexOf('mimeBaiMingDan')
    expect(段起始, '后端媒体配置缺少 mimeBaiMingDan 段').toBeGreaterThan(-1)
    const 键起始 = 后端配置.indexOf(`${键}:`, 段起始)
    expect(键起始, `后端媒体配置缺少 mimeBaiMingDan.${键}`).toBeGreaterThan(-1)
    const 起始 = 后端配置.indexOf('[', 键起始)
    const 结束 = 后端配置.indexOf(']', 起始)
    return 后端配置
      .slice(起始 + 1, 结束)
      .split(',')
      .map((项) => 项.trim().replace(/^'|'$/g, ''))
      .filter((项) => 项 !== '')
  }

  it('MIME 白名单与后端 biaoqingshu 逐项一致（顺序不敏感）', () => {
    expect([...BIAO_QING_TIAN_JIA_PEI_ZHI.yunXuMIME].sort()).toEqual(取白名单('biaoqingshu').sort())
  })

  it('白名单非空且全为 image/*（空数组会让本用例恒真）', () => {
    const 后端 = 取白名单('biaoqingshu')
    expect(后端.length).toBeGreaterThanOrEqual(3)
    for (const xiang of 后端) expect(xiang.startsWith('image/')).toBe(true)
  })

  it('大小上限与后端 biaoqingshu 数值一致', () => {
    const 上限段 = 后端配置.slice(
      后端配置.indexOf('daXiaoShangXianZiJie'),
      后端配置.indexOf('mimeBaiMingDan'),
    )
    const 匹配 = /biaoqingshu:\s*(\d+)\s*\*\s*ZI_JIE\s*\*\s*ZI_JIE/.exec(上限段)
    expect(匹配, '后端 biaoqingshu 大小上限写法变更，需同步本用例').toBeTruthy()
    expect(BIAO_QING_TIAN_JIA_PEI_ZHI.zuiDaZiJieZiJie).toBe(Number(匹配![1]) * 1024 * 1024)
  })

  it('文件输入 accept 串与 MIME 白名单同源', () => {
    expect(BIAO_QING_TIAN_JIA_PEI_ZHI.wenJianJieShou.split(',')).toEqual([
      ...BIAO_QING_TIAN_JIA_PEI_ZHI.yunXuMIME,
    ])
  })

  it('类别码恒为 biaoqingshu（存量拼写即如此），023 迁移无 biaoqingbao 漂移', () => {
    expect(后端配置).toContain("BIAO_QING_SHU_LEI_BIE: MeiTiLeiBie = 'biaoqingshu'")
    const 迁移 = readFileSync(
      resolve(__dirname, '../../../backend/database/migrations/023_用户表情表.sql'),
      'utf-8',
    )
    expect(迁移).toContain('biaoqingshu')
    expect(迁移).not.toContain('biaoqingbao')
  })
})

describe('FP-06b 判定口径与唯一实现（源码扫描）', () => {
  const 聊天页 = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf-8')
  const 表情提交页 = readFileSync(resolve(__dirname, '../composables/use表情提交.ts'), 'utf-8')
  const 表情配置 = readFileSync(resolve(__dirname, '../config/表情配置.ts'), 'utf-8')

  it('「从本地添加」只走表情仓库一条写入路径，且复用 use粘贴图片 的唯一图片判定', () => {
    // 提交口已从页内私有升为 use表情提交（两个聊天页共用），判定与写入的唯一实现跟着钉到新位置
    expect(表情提交页.match(/表情仓库\.tianJia\(/g)).toHaveLength(1)
    expect(表情提交页.match(/panDingTuPianJuJue\(/g)).toHaveLength(1)
    expect(表情提交页).toContain("from '@/composables/use粘贴图片'")
    expect(聊天页).not.toContain('panDingTuPianJuJue(')
    expect(聊天页).toContain("from '@/composables/use表情提交'")
    expect(聊天页).not.toContain('clipboardData')
  })

  it('主动添加的本地图按 biaoQingBao 复用已有媒体发送（不二次上传），相册/粘贴仍走压缩后按 tupian 发', () => {
    // FP-08d（需求 #5）把「带引用 + 成功必清」收进页面侧唯一出口 faSongMeiTiZhiFa，
    // 旧的直调形态（页面各处各自调 store）会让四条入口漏接引用态 ⇒ 出口内只剩一处 store 调用点。
    expect(聊天页).toMatch(/faSongMeiTiZhiFa\(\s*'biaoQingBao',\s*null,\s*{[^}]*yiYouMeiTi/s)
    const 页面直调点 = readdirSync(resolve(__dirname, '../views'))
      .filter((名) => 名.endsWith('.vue'))
      .flatMap(
        (名) =>
          readFileSync(resolve(__dirname, '../views', 名), 'utf-8').match(
            /聊天仓库\.faSongMeiTiXiaoXi\(/g,
          ) ?? [],
      )
    expect(页面直调点, '媒体直发的 store 调用点必须只剩出口内那一处').toHaveLength(1)
    // FP-10b：压缩后发图的那唯一一处入口已从 faSongYaSuoTuPian 改名为 jiaruDaiFaTuPian
    // （粘贴/相册先进待发区、点发送才压缩上传），扫描仍钉住「页面只有这一处入口」
    expect(聊天页).toContain('jiaruDaiFaTuPian')
    expect(表情提交页.match(/表情仓库\.tianJia\(/g)).toHaveLength(1)
  })

  it('面板按当前账号拉取，打开即拉、关闭退出管理模式', () => {
    expect(聊天页).toContain('表情仓库.jiaZai(yongHuId)')
    expect(聊天页.match(/watch\(emojiMianBanZhanKai/g)).toHaveLength(1)
    expect(聊天页).toContain('用户仓库.dangQianYongHu?.id')
  })

  it('内置贴纸清单只有一份真源（14 条 canvas 现渲染的声明式清单，无第二套列表）', () => {
    const 源目录 = resolve(__dirname, '..')
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
    const 命中 = 遍历(源目录)
      .filter((文件) => readFileSync(文件, 'utf-8').includes("emoji: '"))
      .map((文件) => relative(源目录, 文件).replace(/\\/g, '/'))
    expect(命中).toEqual(['utils/表情包库.ts'])
  })

  it('客户端添加约束注释指向的测试文件真实存在（防契约说明漂移）', () => {
    expect(表情配置).toContain('我的表情.test.ts')
    expect(readFileSync(resolve(__dirname, '我的表情.test.ts'), 'utf-8')).toContain(
      'FP-06b 客户端与后端 biaoqingshu 边界同源',
    )
  })

  it('表情文案全部来自翻译文件且无占位残留', () => {
    const 键 = [
      'woDeBiaoQing',
      'neiZhiBiaoQing',
      'congBenDiTianJia',
      'guanLiBiaoQing',
      'wanChengGuanLi',
      'shanChuBiaoQing',
      'qianYiBiaoQing',
      'houYiBiaoQing',
      'biaoQingZhengZaiTianJia',
      'biaoQingMIMEBuZhiChi',
      'biaoQingTuPianGuoDa',
      'biaoQingTuPianWeiKong',
      'biaoQingJiaZaiShiBai',
      'biaoQingTianJiaShiBai',
      'biaoQingShanChuShiBai',
      'biaoQingPaiXuShiBai',
    ] as const
    expect(键.length).toBeGreaterThanOrEqual(16)
    for (const jian of 键) {
      const zhi = fanYi.duoMeiTi[jian as keyof typeof fanYi.duoMeiTi]
      expect(typeof zhi, `duoMeiTi.${jian} 缺失`).toBe('string')
      expect(String(zhi).trim()).not.toBe('')
      expect(String(zhi)).not.toMatch(/\{|\}|TODO|待补充/)
    }
  })

  it('新增表情文案无中英数字混排空格（沿用 FP-05 无空格门禁口径）', () => {
    const 新增键 = Object.keys(fanYi.duoMeiTi).filter((jian) => /iaoQing|BiaoQing/.test(jian))
    expect(新增键.length).toBeGreaterThanOrEqual(10)
    for (const jian of 新增键) {
      const zhi = fanYi.duoMeiTi[jian as keyof typeof fanYi.duoMeiTi]
      expect(String(zhi)).not.toMatch(/[一-龥]\s+[A-Za-z0-9]|[A-Za-z0-9]\s+[一-龥]/)
    }
  })
})

describe('FP-06b 表情写入路径唯一', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('只有「添加到表情」这一条写入路径打 /表情/我的', async () => {
    const cang = 使用表情仓库()
    cang.woDeBiaoQing = [zaoXiang('a1', 0)]
    httpPostMock.mockResolvedValue(添加响应(zaoXiang('a2', 1)))
    await cang.tianJia(new File(['x'], 'a2.png', { type: 'image/png' }))
    expect(httpPostMock).toHaveBeenCalledTimes(1)
    expect(httpPostMock.mock.calls[0][0]).toBe('/表情/我的')
    expect(cang.woDeBiaoQing.map((x) => x.id)).toEqual(['a1', 'a2'])
  })
})

describe('FP-06 表情面板深色档着色（缺陷10 零规则元素根治 + 重新设计UI）', () => {
  // F25：仓库 core.autocrlf=true ⇒ Windows 检出为 CRLF，源码正则一律先归一化行尾再匹配
  const 聊天页 = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf-8').replace(/\r\n/g, '\n')
  const 板起 = 聊天页.indexOf('.biaoqingbao-wangge {')
  const 板止 = 聊天页.indexOf('/* ─── "+" 更多面板')
  const 面板样式 = 聊天页.slice(板起, 板止)
  const 面板样式净 = 面板样式.replace(/\/\*[\s\S]*?\*\//g, '')
  const 滚动条起 = 聊天页.indexOf('.emoji-mianban {')
  const 滚动条止 = 聊天页.indexOf('.emoji-xiangmu {', 滚动条起)
  const 滚动条区 = 聊天页
    .slice(滚动条起, 滚动条止 > 滚动条起 ? 滚动条止 : undefined)
    .replace(/\/\*[\s\S]*?\*\//g, '')

  const 块们 = 声明块清单()
  const 浅解析 = 按档解析全部('light', 块们)
  const 深解析 = 按档解析全部('dark', 块们)

  it('表情面板样式区切得出内容（区间标记被挪走即红，防后续断言静默空跑）', () => {
    expect(板起).toBeGreaterThan(0)
    expect(板止).toBeGreaterThan(板起)
    expect(面板样式.length).toBeGreaterThan(1200)
  })

  it('改前零 CSS 规则的面板类名全部补上规则（含管理态角标容器与添加徽章）', () => {
    for (const 类 of [
      'biaoqingbao-quyu',
      'biaoqingbao-fenqu',
      'fenqu-biaoti-hang',
      'fenqu-biaoti',
      'fenqu-guanli',
      'biaoqingbao-ge',
      'biaoqingbao-tupian',
      'ge-caoZuo-zu',
      'ge-caoZuo',
      'tian-jia-jia',
    ]) {
      expect(new RegExp(`\\.${类}\\s*\\{`).test(面板样式净), `.${类} 又回到零规则`).toBe(true)
    }
  })

  it('「添加到表情」状态条样式仍在共享真源，页内不复制第二套（单源契约，FP-06 复核过）', () => {
    const 共享 = readFileSync(resolve(__dirname, '../styles/liao-tian-qi-pao.css'), 'utf-8')
    expect(共享).toContain('.biaoqing-tishi {')
    expect(聊天页).not.toContain('.biaoqing-tishi {')
    expect(聊天页).not.toContain('.shuru-fu-zhu {')
  })

  it('面板区内不出现任何硬编码色值（一律走 variables.css 既有令牌）', () => {
    expect(面板样式净).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    expect(面板样式净).not.toMatch(/rgba?\(\s*[\d.]/)
    expect(面板样式净).not.toMatch(/hsla?\(/)
  })

  it('面板区用到的令牌深浅两档都有定义（F23 同族：单侧声明会在另一档塌陷）', () => {
    const 用到 = [...面板样式净.matchAll(/var\(\s*(--[a-z0-9-]+)\s*[,)]/g)].map((m) => m[1])
    expect(用到.length).toBeGreaterThan(20)
    for (const 令牌 of new Set(用到)) {
      const 浅 = 浅解析.get(令牌)
      const 深 = 深解析.get(令牌)
      expect(深, `${令牌} 深色档未定义（会塌陷）`).toBeDefined()
      expect(浅, `${令牌} 浅色档未定义`).toBeDefined()
    }
  })

  it('添加按钮是"设计过的空位"：虚线边界 + 圆形 ＋ 徽章 + 主文字色', () => {
    expect(面板样式净).toMatch(
      /\.biaoqingbao-xiangmu\.tian-jia\s*\{[^}]*border-style:\s*dashed[^}]*\}/,
    )
    expect(面板样式净).toMatch(/\.biaoqingbao-xiangmu\.tian-jia\s*\{[^}]*color:\s*var\(--wenben-zhuse\)/)
    expect(面板样式净).toMatch(/\.tian-jia-jia\s*\{[^}]*border:\s*1px solid var\(--biankuang-zhongjian\)/)
    expect(面板样式净).toMatch(/\.tian-jia-jia\s*\{[^}]*background:\s*var\(--beijing-kaopian\)/)
    expect(面板样式净).toMatch(/\.tian-jia-jia\s*\{[^}]*color:\s*var\(--wenben-zhuse\)/)
  })

  it('管理态角标从"4.67×16px 裸文本"变成 28×28 圆形控件，且禁用不吃 opacity', () => {
    expect(面板样式净).toMatch(/\.ge-caoZuo\s*\{[^}]*width:\s*28px/)
    expect(面板样式净).toMatch(/\.ge-caoZuo\s*\{[^}]*height:\s*28px/)
    expect(面板样式净).toMatch(/\.ge-caoZuo\s*\{[^}]*border-radius:\s*50%/)
    expect(面板样式净).toMatch(/\.ge-caoZuo:disabled\s*\{[^}]*cursor:\s*not-allowed/)
    expect(面板样式净).not.toMatch(/opacity:/)
  })

  it('悬停反馈收进 @media (hover: hover)，面板区内不再有裸 :hover 顶层规则', () => {
    expect((面板样式净.match(/@media \(hover: hover\)/g) || []).length).toBeGreaterThanOrEqual(4)
    expect(面板样式净).not.toMatch(/^\S[^{}]*:hover[^{}]*\{/m)
  })

  it('触屏按下反馈齐备：格子上按有底色，添加槽的 :active 单独给（否则被更晚的静态 .tian-jia 盖掉）', () => {
    expect(面板样式净).toMatch(/\.biaoqingbao-xiangmu:active\s*\{[^}]*background:\s*var\(--caidan-active\)/)
    expect(面板样式净).toMatch(
      /\.biaoqingbao-xiangmu\.tian-jia:active:not\(:disabled\)\s*\{[^}]*background:\s*var\(--caidan-active\)/,
    )
    expect(面板样式净).toMatch(/\.fenqu-guanli:active\s*\{[^}]*background:\s*var\(--caidan-active\)/)
    expect(面板样式净).toMatch(
      /\.ge-caoZuo:active:not\(:disabled\)\s*\{[^}]*background:\s*var\(--caidan-active\)/,
    )
    // 顺序契约：添加槽的静态底色在前、按下态在后，否则 :active 被静态规则吃掉
    expect(面板样式净.indexOf('.biaoqingbao-xiangmu.tian-jia {')).toBeLessThan(
      面板样式净.indexOf('.biaoqingbao-xiangmu.tian-jia:active:not(:disabled) {'),
    )
  })

  it('面板区内不写 :root[data-theme=...] 主题覆写（F24 特异性坑按 FP-03 口径从构造上绕开）', () => {
    expect(面板样式净).not.toMatch(/data-theme/)
  })

  it('表情格图钉成等高格子，贴纸名用主文字色（卡面上次级灰不到 AA）', () => {
    expect(面板样式净).toMatch(/\.biaoqingbao-tupian\s*\{[^}]*height:\s*56px/)
    expect(面板样式净).toMatch(/\.biaoqingbao-tupian\s*\{[^}]*object-fit:\s*contain/)
    expect(面板样式净).toMatch(/\.biaoqingbao-wenzi\s*\{[^}]*color:\s*var\(--wenben-zhuse\)/)
    expect(面板样式净).toMatch(
      /\.biaoqingbao-xiangmu\s*\{[^}]*border:\s*1px solid var\(--biankuang-yanse\)/,
    )
  })

  it('表情面板滚动条私有 rgba 字面量已迁到 --gundong-tiao-* 真源（保留被单测钉住的局部量名）', () => {
    expect(聊天页).toMatch(/--emoji-mianban-gundong-tiao:\s*var\(--gundong-tiao-huakuai\)/)
    expect(聊天页).toMatch(/--emoji-mianban-gundong-tiao-hover:\s*var\(--gundong-tiao-huakuai-hover\)/)
    expect(滚动条区).not.toMatch(/--emoji-mianban-gundong-tiao[^:]*:\s*rgba/)
    expect(聊天页).toMatch(/\.emoji-mianban::-webkit-scrollbar-thumb\s*\{\s*background:\s*var\(--emoji-mianban-gundong-tiao\)/)
  })

  it('模板：管理态角标成组，格子宽度按管理模式放宽（同排三枚 28px 目标不再挤压）', () => {
    expect(聊天页).toMatch(/:class="\{\s*guanli:\s*biaoQingGuanLiMoShi\s*\}"/)
    expect(聊天页).toMatch(/class="ge-caoZuo-zu"/)
    expect(面板样式净).toMatch(
      /\.biaoqingbao-wangge\.guanli\s*\{[^}]*repeat\(auto-fill,\s*minmax\(104px,\s*1fr\)\)/,
    )
    expect(聊天页.match(/<template v-if="biaoQingGuanLiMoShi">/g) || []).toHaveLength(0)
  })
})
