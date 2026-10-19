import { describe, it, expect, vi, afterEach } from 'vitest'
import path from 'path'
import { zipSync, strToU8 } from 'fflate'
import { tiQuWenDangWenBen } from '../文档文本提取'
import { WEN_DANG_TI_QU_PEI_ZHI } from '../../config/媒体配置'
import { debug日志 } from '../../utils/debug日志'

/**
 * 第四波 BlindSpot M-5 守卫：OOXML 解压的体积门禁**不得读 zip 自述字段**。
 *
 * 改前的 filter 用 `xie.originalSize <= danTiaoMuJieYaZiJieShangXian` 决定要不要解压，
 * 而 originalSize 是打包者自己写进本地头/中央目录的声明值 ⇒ 谎报 10 字节就能放行任意膨胀，
 * 外层只有「压缩后 10 MiB」这道闸门，解压产物没有任何字节复核。
 * 现在钉三道实测上限：单条目字节、总产物字节、条目数；且在**流式解压途中**中止——
 * 判别式是「正文塞在超限尾段之后」与「合法小条目排在炸弹之前」：
 * 只要读完再判（哪怕事后丢弃），这两条都会解出正文从而用例变红。
 * 既有口径不动：归档永不解析、单文件 10 MiB、提取文本 20000 码点、畸形只回 null 绝不抛。
 *
 * 数据库红线：本文件不连真库、不跑 psql、不落任何迁移；字节全部直接喂 tiQuWenDangWenBen。
 */

vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  jiLuYouXiJieJu: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuJunShiQiuZhu: vi.fn(),
}))
vi.mock('../../数据库', () => ({
  数据库: { query: async () => ({ rows: [] }) },
}))
vi.mock('../媒体存储', () => ({
  huoQuBenDiLuJing: (sha: string) =>
    /^[0-9a-f]{64}$/.test(sha) ? path.join('___测试不落盘___', sha.slice(0, 2), sha) : null,
}))

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const MI = 1024 * 1024

function 降级分类(): string[] {
  return 降级调用().map(
    (tiao) =>
      ((tiao[2] as { xiang_qing?: { cuo_wu_fen_lei?: string } })?.xiang_qing ?? {})
        .cuo_wu_fen_lei ?? '',
  )
}

function 降级调用(): unknown[][] {
  return vi.mocked(debug日志.warn).mock.calls
}

/** 把本地头（+22）与中央目录（+24）里的「解压后体积」32 位字段一律改写成给定值 */
function 改自述体积(zip: Buffer, 声明解压后字节: number): Buffer {
  const chu = Buffer.from(zip)
  for (let yi = 0; yi + 4 <= chu.length; yi++) {
    const xia = chu.readUInt32LE(yi)
    if (xia === 0x04034b50) chu.writeUInt32LE(声明解压后字节, yi + 22)
    else if (xia === 0x02014b50) chu.writeUInt32LE(声明解压后字节, yi + 24)
  }
  return chu
}

function 打包(条目: Record<string, Uint8Array>): Buffer {
  return Buffer.from(zipSync(条目))
}

const 填充 = (字节数: number) => 'x'.repeat(字节数)

/** 正文一律排在填充尾段之后：只有把整条解到底才可能看见它 ⇒ 「解不出来」＝中途就停了 */
function docx正文(填充字节数: number, 正文 = '尾段正文'): Uint8Array {
  return strToU8(
    '<w:document xmlns:w="w"><w:body><w:p><w:r><w:t xml:space="preserve">' +
      填充(填充字节数) +
      正文 +
      '</w:t></w:r></w:p></w:body></w:document>',
  )
}

function xlsx工作表(填充字节数: number, 正文: string): Uint8Array {
  // 炸弹体塞进 XML 注释：合法行只有一小段 ⇒ 上限被摘掉时用例是「秒级变红」而不是把 MiB 级
  // 正文喂给解析器（那会让反证跑成十分钟级别的挂死）
  return strToU8(
    '<!--' +
      填充(填充字节数) +
      '--><worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>' +
      正文 +
      '</t></is></c></row></sheetData></worksheet>',
  )
}

function 提文档(ziJie: Buffer, ming = 'a.docx', mime = DOCX_MIME) {
  return tiQuWenDangWenBen({ mime, yuanShiWenJianMing: ming, ziJie })
}

afterEach(() => {
  vi.mocked(debug日志.warn).mockClear()
})

describe('M-5 OOXML 解压按实测产物设硬上限，且超限即在流式途中中止', () => {
  it('自述体积谎报 10 字节、实测膨胀超单条目上限的 docx：不抛、不 500、返回占位（null）', async () => {
    const 膨胀字节数 = WEN_DANG_TI_QU_PEI_ZHI.danTiaoMuJieYaZiJieShangXian + 4 * MI
    const zip = 打包({ 'word/document.xml': docx正文(膨胀字节数) })
    expect(zip.length).toBeLessThan(MI) // 炸弹本体极小：旧门禁只看自述值，正是被骗的那一处
    const 结果 = await 提文档(改自述体积(zip, 10))
    expect(结果).toBeNull()
    expect(降级分类()).toContain('解压产物或条目数超过实测硬上限')
  })

  it('每条都低于单条目上限、总产物超总上限：合法小条目也不交出正文（中止是整次解压级别）', async () => {
    const danTiao = WEN_DANG_TI_QU_PEI_ZHI.danTiaoMuJieYaZiJieShangXian
    const 每片 = danTiao / 2
    const 片数 = Math.ceil(WEN_DANG_TI_QU_PEI_ZHI.jieYaZongZiJieShangXian / 每片) + 1
    const ru: Record<string, Uint8Array> = { 'xl/sharedStrings.xml': strToU8('<sst/>') }
    for (let xu = 1; xu <= 片数; xu++) {
      ru[`xl/worksheets/sheet${xu}.xml`] = xlsx工作表(xu === 1 ? 0 : 每片, xu === 1 ? '首段正文' : '尾段正文')
    }
    const 结果 = await 提文档(打包(ru), 'a.xlsx', XLSX_MIME)
    expect(结果).toBeNull() // 读完再判（或逐条丢弃）会留下 sheet1 的「首段正文」⇒ 必红
    expect(降级分类()).toContain('解压产物或条目数超过实测硬上限')
  })

  it('条目数洪流：超过实测条目上限后连后面的合法正文都不再解', async () => {
    const ru: Record<string, Uint8Array> = {}
    for (let xu = 0; xu <= WEN_DANG_TI_QU_PEI_ZHI.jieYaTiaoMuShuShangXian; xu++) {
      ru[`qita/${xu}.bin`] = strToU8('x')
    }
    ru['word/document.xml'] = docx正文(0, '洪流后的正文')
    const 结果 = await 提文档(打包(ru))
    expect(结果).toBeNull()
    expect(降级分类()).toContain('解压产物或条目数超过实测硬上限')
  })

  it('反方向也成立：自述体积谎报 1 GiB 的真实合法 docx 仍照常提取（自述值两头都不作判据）', async () => {
    const zip = 打包({ 'word/document.xml': docx正文(0) })
    const 结果 = await 提文档(改自述体积(zip, 1024 * MI))
    expect(结果).not.toBeNull()
    expect(结果?.wenBen).toBe('尾段正文')
  })

  it('既有口径不回归：普通 zip 伪装成 docx 仍因缺必需条目而 null', async () => {
    const zip = 打包({ 'secret/note.txt': strToU8('不该被读出来的内容') })
    expect(await 提文档(zip)).toBeNull()
  })
})
