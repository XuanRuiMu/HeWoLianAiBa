import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  BiaoQingKuTanCeHuanCunHuanJingBianLiang,
  BiaoQingKuZuiDuanBiDuiJianGeHuanJingBianLiang,
  BiaoQingKuZuiDuanBiDuiJianGeMoRenHaoMiao,
  BiaoQingKuZuiDuanBiDuiJianGeZuiDaHaoMiao,
  BiaoQingKuZuiDuanBiDuiJianGeZuiXiaoHaoMiao,
  chaAnDuanMing,
  chaAnSha256,
  chongZhiTanCeHuanCun,
  dangQianMuLuLuJing,
  heFaDuanMing,
  quHouXuan,
  quQuanBuQiYong,
  quZuiDuanBiDuiJianGeHaoMiao,
  queBaoZuiXin,
  zhongXinSaoMiao,
} from '../表情包库'
import { BiaoQingZuiDaWenJianZiJie } from '../../config/表情包配置'

const YuanMuLuHuanJing = process.env['BIAO_QING_BAO_MU_LU']

const YuanJianGeHuanJing = process.env[BiaoQingKuZuiDuanBiDuiJianGeHuanJingBianLiang]

const YuanTanCeHuanCunHuanJing = process.env[BiaoQingKuTanCeHuanCunHuanJingBianLiang]

const linShiMuLuLieBiao: string[] = []

function chuangJianMuLu(): string {
  const muLu = fs.mkdtempSync(path.join(os.tmpdir(), 'biaoqing-ku-'))
  linShiMuLuLieBiao.push(muLu)
  process.env['BIAO_QING_BAO_MU_LU'] = muLu
  return muLu
}

function sheZhiBiDuiJianGe(zhi: string): void {
  process.env[BiaoQingKuZuiDuanBiDuiJianGeHuanJingBianLiang] = zhi
}

function shanChuBiDuiJianGe(): void {
  delete process.env[BiaoQingKuZuiDuanBiDuiJianGeHuanJingBianLiang]
}

function xieTuPian(muLu: string, wenJianMing: string, neiRong: string): Buffer {
  const huanChong = Buffer.from(neiRong)
  fs.writeFileSync(path.join(muLu, wenJianMing), huanChong)
  return huanChong
}

function xieBiaoZhu(muLu: string, zhuMing: string, neiRong: unknown): void {
  fs.writeFileSync(path.join(muLu, `${zhuMing}.json`), JSON.stringify(neiRong))
}

function guDingMuLuShiJian(muLu: string, shiJian: Date): void {
  fs.utimesSync(muLu, shiJian, shiJian)
}

function guDingWenJianShiJian(wenJianLuJing: string, shiJian: Date): void {
  fs.utimesSync(wenJianLuJing, shiJian, shiJian)
}

afterEach(() => {
  for (const muLu of linShiMuLuLieBiao.splice(0)) {
    fs.rmSync(muLu, { recursive: true, force: true })
  }
  if (YuanMuLuHuanJing === undefined) {
    delete process.env['BIAO_QING_BAO_MU_LU']
  } else {
    process.env['BIAO_QING_BAO_MU_LU'] = YuanMuLuHuanJing
  }
  if (YuanJianGeHuanJing === undefined) {
    shanChuBiDuiJianGe()
  } else {
    process.env[BiaoQingKuZuiDuanBiDuiJianGeHuanJingBianLiang] = YuanJianGeHuanJing
  }
  if (YuanTanCeHuanCunHuanJing === undefined) {
    delete process.env[BiaoQingKuTanCeHuanCunHuanJingBianLiang]
  } else {
    process.env[BiaoQingKuTanCeHuanCunHuanJingBianLiang] = YuanTanCeHuanCunHuanJing
  }
  chongZhiTanCeHuanCun()
  vi.restoreAllMocks()
})

describe('最短比对间隔', () => {
  it('未配置时用默认值，非法与越界都被夹取', () => {
    shanChuBiDuiJianGe()
    expect(quZuiDuanBiDuiJianGeHaoMiao()).toBe(BiaoQingKuZuiDuanBiDuiJianGeMoRenHaoMiao)
    sheZhiBiDuiJianGe('   ')
    expect(quZuiDuanBiDuiJianGeHaoMiao()).toBe(BiaoQingKuZuiDuanBiDuiJianGeMoRenHaoMiao)
    sheZhiBiDuiJianGe('不好读')
    expect(quZuiDuanBiDuiJianGeHaoMiao()).toBe(BiaoQingKuZuiDuanBiDuiJianGeMoRenHaoMiao)
    sheZhiBiDuiJianGe('-5')
    expect(quZuiDuanBiDuiJianGeHaoMiao()).toBe(BiaoQingKuZuiDuanBiDuiJianGeZuiXiaoHaoMiao)
    sheZhiBiDuiJianGe('999999999')
    expect(quZuiDuanBiDuiJianGeHaoMiao()).toBe(BiaoQingKuZuiDuanBiDuiJianGeZuiDaHaoMiao)
    sheZhiBiDuiJianGe('0')
    expect(quZuiDuanBiDuiJianGeHaoMiao()).toBe(0)
  })

  it('短名白名单放行正常短名，屏蔽方括号冒号与控制字符', () => {
    expect(heFaDuanMing('笑哭')).toBe(true)
    expect(heFaDuanMing('wu-biao-zhu')).toBe(true)
    expect(heFaDuanMing('')).toBe(false)
    expect(heFaDuanMing('   ')).toBe(false)
    expect(heFaDuanMing('笑]哭')).toBe(false)
    expect(heFaDuanMing('【笑哭】')).toBe(false)
    expect(heFaDuanMing('笑:哭')).toBe(false)
    expect(heFaDuanMing('笑：哭')).toBe(false)
    expect(heFaDuanMing('笑\n哭')).toBe(false)
    expect(heFaDuanMing('笑\t哭')).toBe(false)
  })
})

describe('扫描与索引', () => {
  it('图片配完整标注时索引字段齐全', async () => {
    const muLu = chuangJianMuLu()
    const huanChong = xieTuPian(muLu, 'haha.png', 'zheng-chang-tu')
    xieBiaoZhu(muLu, 'haha', {
      短名: '笑哭',
      描述: '眯眼大笑',
      情绪标签: '好笑',
      适用场景: '接住好笑的事',
      启用: true,
    })
    expect(await zhongXinSaoMiao()).toBe(1)
    const tiaoMu = await chaAnDuanMing('笑哭')
    expect(tiaoMu).toMatchObject({
      duanMing: '笑哭',
      miaoShu: '眯眼大笑',
      qingXuBiaoQian: '好笑',
      shiYongChangJing: '接住好笑的事',
      qiYong: true,
      mime: 'image/png',
      ziJieShu: huanChong.length,
      wenJianMing: 'haha.png',
      wenJianLuJing: path.join(muLu, 'haha.png'),
    })
    expect(tiaoMu?.sha256).toBe(createHash('sha256').update(huanChong).digest('hex'))
  })

  it('缺标注文件时用文件名当短名并归为待打标', async () => {
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'wu-biao-zhu.gif', 'mei-you-json')
    expect(await zhongXinSaoMiao()).toBe(1)
    const tiaoMu = await chaAnDuanMing('wu-biao-zhu')
    expect(tiaoMu).toMatchObject({
      duanMing: 'wu-biao-zhu',
      miaoShu: '',
      qingXuBiaoQian: '待打标',
      shiYongChangJing: '',
      qiYong: true,
      mime: 'image/gif',
    })
  })

  it('标注类型错、超长、标签非法都兜底且不崩', async () => {
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'cuo.webp', 'zi-duan-cuo')
    xieBiaoZhu(muLu, 'cuo', {
      短名: 12345,
      描述: '描'.repeat(200),
      情绪标签: '乱写的标签',
      适用场景: 42,
      启用: 'yes',
    })
    xieTuPian(muLu, 'huai.jpg', 'json-huai')
    fs.writeFileSync(path.join(muLu, 'huai.json'), '{这不是合法json')
    xieTuPian(muLu, 'chao-chang.jpeg', 'duan-ming-chao-chang')
    xieBiaoZhu(muLu, 'chao-chang', { 短名: '名'.repeat(40), 情绪标签: '撒娇' })
    xieTuPian(muLu, 'chang-miao-shu.png', 'chang-miao-shu')
    xieBiaoZhu(muLu, 'chang-miao-shu', {
      短名: '长描述',
      描述: '描'.repeat(200),
      情绪标签: '乱写的标签',
      适用场景: 42,
      启用: 'yes',
    })

    expect(await zhongXinSaoMiao()).toBe(3)

    expect(await chaAnDuanMing('cuo')).toBeNull()

    const changMiaoShu = await chaAnDuanMing('长描述')
    expect(changMiaoShu?.miaoShu.length).toBe(120)
    expect(changMiaoShu?.qingXuBiaoQian).toBe('待打标')
    expect(changMiaoShu?.shiYongChangJing).toBe('')
    expect(changMiaoShu?.qiYong).toBe(true)

    expect(await chaAnDuanMing('huai')).toMatchObject({ qingXuBiaoQian: '待打标', mime: 'image/jpeg' })

    const chaoChangTiaoMu = await chaAnDuanMing('名'.repeat(30))
    expect(chaoChangTiaoMu).not.toBeNull()
    expect(chaoChangTiaoMu?.duanMing.length).toBe(30)
    expect(chaoChangTiaoMu?.qingXuBiaoQian).toBe('撒娇')
  })

  it('短名含方括号冒号换行或为空时该条目被跳过', async () => {
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'kuo-hao.png', 'tu-kuo-hao')
    xieBiaoZhu(muLu, 'kuo-hao', { 短名: '笑]哭', 情绪标签: '好笑' })
    xieTuPian(muLu, 'quan-jiao.png', 'tu-quan-jiao')
    xieBiaoZhu(muLu, 'quan-jiao', { 短名: '【笑哭】', 情绪标签: '好笑' })
    xieTuPian(muLu, 'mao-hao.png', 'tu-mao-hao')
    xieBiaoZhu(muLu, 'mao-hao', { 短名: '笑:哭', 情绪标签: '好笑' })
    xieTuPian(muLu, 'huan-hang.png', 'tu-huan-hang')
    xieBiaoZhu(muLu, 'huan-hang', { 短名: '笑\n哭', 情绪标签: '好笑' })
    xieTuPian(muLu, 'kong.png', 'tu-kong')
    xieBiaoZhu(muLu, 'kong', { 短名: '   ', 情绪标签: '好笑' })
    xieTuPian(muLu, 'zheng-chang.png', 'tu-zheng-chang')
    xieBiaoZhu(muLu, 'zheng-chang', { 短名: '正常脸', 情绪标签: '好笑' })

    expect(await zhongXinSaoMiao()).toBe(1)
    expect((await quQuanBuQiYong()).map((tiaoMu) => tiaoMu.duanMing)).toEqual(['正常脸'])
    expect(await chaAnDuanMing('笑]哭')).toBeNull()
    expect(await chaAnDuanMing('【笑哭】')).toBeNull()
    expect(await chaAnDuanMing('笑:哭')).toBeNull()
    expect(await chaAnDuanMing('笑\n哭')).toBeNull()
    expect(await chaAnDuanMing('kuo-hao')).toBeNull()
    expect(await chaAnDuanMing('kong')).toBeNull()
  })

  it('描述与适用场景里的换行压成一个空格', async () => {
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'ya-ping.png', 'tu-ya-ping')
    xieBiaoZhu(muLu, 'ya-ping', {
      短名: '压平',
      描述: '第一行\n第二行\t  第三行',
      适用场景: '接住\n  好笑的事\r\n再补一句',
      情绪标签: '好笑',
    })
    expect(await zhongXinSaoMiao()).toBe(1)
    const tiaoMu = await chaAnDuanMing('压平')
    expect(tiaoMu?.miaoShu).toBe('第一行 第二行 第三行')
    expect(tiaoMu?.shiYongChangJing).toBe('接住 好笑的事 再补一句')
    expect(tiaoMu?.miaoShu.includes('\n')).toBe(false)
  })

  it('两个文件同名短名时都不入索引', async () => {
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'a.png', 'di-yi-zhang')
    xieBiaoZhu(muLu, 'a', { 短名: '同一个', 情绪标签: '好笑' })
    xieTuPian(muLu, 'b.png', 'di-er-zhang')
    xieBiaoZhu(muLu, 'b', { 短名: '同一个', 情绪标签: '无语' })
    xieTuPian(muLu, 'c.png', 'di-san-zhang')
    xieBiaoZhu(muLu, 'c', { 短名: '独一份', 情绪标签: '撒娇' })

    expect(await zhongXinSaoMiao()).toBe(1)
    expect(await chaAnDuanMing('同一个')).toBeNull()
    expect(await chaAnSha256(createHash('sha256').update(Buffer.from('di-yi-zhang')).digest('hex'))).toBeNull()
    expect(await chaAnSha256(createHash('sha256').update(Buffer.from('di-er-zhang')).digest('hex'))).toBeNull()
    expect((await chaAnDuanMing('独一份'))?.wenJianMing).toBe('c.png')
  })

  it('超过大小上限的文件被跳过且其余照常索引', async () => {
    expect(BiaoQingZuiDaWenJianZiJie).toBe(6 * 1024 * 1024)
    const muLu = chuangJianMuLu()
    fs.writeFileSync(path.join(muLu, 'tai-da.png'), Buffer.alloc(BiaoQingZuiDaWenJianZiJie + 1))
    xieTuPian(muLu, 'zheng-chang.png', 'xiao-tu')
    expect(await zhongXinSaoMiao()).toBe(1)
    expect(await chaAnDuanMing('tai-da')).toBeNull()
    expect(await chaAnDuanMing('zheng-chang')).not.toBeNull()
  })

  it('目录不存在时返回空库且不抛错', async () => {
    const muLu = chuangJianMuLu()
    process.env['BIAO_QING_BAO_MU_LU'] = path.join(muLu, 'bu-cun-zai')
    await expect(zhongXinSaoMiao()).resolves.toBe(0)
    await expect(quHouXuan('好笑', 8)).resolves.toEqual([])
    await expect(quQuanBuQiYong()).resolves.toEqual([])
    await expect(chaAnDuanMing('笑哭')).resolves.toBeNull()
    await expect(chaAnSha256('a'.repeat(64))).resolves.toBeNull()
  })

  it('未配置目录变量时从工作目录逐层向上自动探测', () => {
    delete process.env['BIAO_QING_BAO_MU_LU']
    chongZhiTanCeHuanCun()
    const muLu = dangQianMuLuLuJing()
    expect(path.basename(muLu)).toBe('表情包')
    expect(fs.statSync(muLu).isDirectory()).toBe(true)
  })

  it('探测结果在 TTL 内复用，不再触发 statSync', () => {
    delete process.env['BIAO_QING_BAO_MU_LU']
    process.env[BiaoQingKuTanCeHuanCunHuanJingBianLiang] = '60000'
    chongZhiTanCeHuanCun()
    const zhi = vi.spyOn(fs, 'statSync')
    const diYiCi = dangQianMuLuLuJing()
    expect(zhi).toHaveBeenCalled()
    const jiLu = zhi.mock.calls.length
    const diErCi = dangQianMuLuLuJing()
    const diSanCi = dangQianMuLuLuJing()
    expect(diErCi).toBe(diYiCi)
    expect(diSanCi).toBe(diYiCi)
    expect(zhi.mock.calls.length).toBe(jiLu)
  })

  it('TTL 设为零时每次调用都重新探测', () => {
    delete process.env['BIAO_QING_BAO_MU_LU']
    process.env[BiaoQingKuTanCeHuanCunHuanJingBianLiang] = '0'
    chongZhiTanCeHuanCun()
    const zhi = vi.spyOn(fs, 'statSync')
    dangQianMuLuLuJing()
    const jiLu = zhi.mock.calls.length
    expect(jiLu).toBeGreaterThan(0)
    dangQianMuLuLuJing()
    expect(zhi.mock.calls.length).toBeGreaterThan(jiLu)
  })

  it('目录探测失败时不写缓存，恢复后仍能被找到', () => {
    delete process.env['BIAO_QING_BAO_MU_LU']
    process.env[BiaoQingKuTanCeHuanCunHuanJingBianLiang] = '60000'
    chongZhiTanCeHuanCun()
    const yuanGongNeng = process.env['BIAO_QING_BAO_MU_LU']
    process.env['BIAO_QING_BAO_MU_LU'] = path.join(os.tmpdir(), 'bu-cun-zai-de-mu-lu-404')
    expect(dangQianMuLuLuJing()).toBe(path.join(os.tmpdir(), 'bu-cun-zai-de-mu-lu-404'))
    const muLu = chuangJianMuLu()
    process.env['BIAO_QING_BAO_MU_LU'] = muLu
    expect(dangQianMuLuLuJing()).toBe(muLu)
    if (yuanGongNeng === undefined) delete process.env['BIAO_QING_BAO_MU_LU']
    else process.env['BIAO_QING_BAO_MU_LU'] = yuanGongNeng
    chongZhiTanCeHuanCun()
  })
})

describe('候选与查询', () => {
  async function zhunBeiSiZhang(): Promise<string> {
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'xiao-ku.png', 'xiao-ku')
    xieBiaoZhu(muLu, 'xiao-ku', { 短名: '笑哭', 情绪标签: '好笑' })
    xieTuPian(muLu, 'gou-tou.png', 'gou-tou')
    xieBiaoZhu(muLu, 'gou-tou', { 短名: '狗头', 情绪标签: '好笑' })
    xieTuPian(muLu, 'mao-mao.png', 'mao-mao')
    xieBiaoZhu(muLu, 'mao-mao', { 短名: '猫猫', 情绪标签: '撒娇', 适用场景: '接不住好笑的时候垫场' })
    xieTuPian(muLu, 'wu-yu-mao.png', 'wu-yu-mao')
    xieBiaoZhu(muLu, 'wu-yu-mao', { 短名: '无语猫', 情绪标签: '无语' })
    xieTuPian(muLu, 'ku-ku.png', 'ku-ku')
    xieBiaoZhu(muLu, 'ku-ku', { 短名: '哭哭', 情绪标签: '好笑', 启用: false })
    await zhongXinSaoMiao()
    return muLu
  }

  it('按情绪标签相等或适用场景包含过滤', async () => {
    await zhunBeiSiZhang()
    const haoXiao = await quHouXuan('好笑', 8)
    expect(haoXiao.map((tiaoMu) => tiaoMu.duanMing).sort()).toEqual(['狗头', '猫猫', '笑哭'].sort())
    const wuYu = await quHouXuan('无语', 8)
    expect(wuYu.map((tiaoMu) => tiaoMu.duanMing)).toEqual(['无语猫'])
    const wuMingZhong = await quHouXuan('庆祝', 8)
    expect(wuMingZhong).toEqual([])
  })

  it('标签为空时从全部启用条目取，禁用条目不出现在候选中', async () => {
    await zhunBeiSiZhang()
    const quanBu = await quHouXuan(null, 20)
    expect(quanBu).toHaveLength(4)
    expect(quanBu.map((tiaoMu) => tiaoMu.duanMing)).not.toContain('哭哭')
    expect((await quQuanBuQiYong()).map((tiaoMu) => tiaoMu.duanMing).sort()).toEqual(
      ['笑哭', '狗头', '猫猫', '无语猫'].sort(),
    )
  })

  it('数量上限生效，非法数量返回空', async () => {
    await zhunBeiSiZhang()
    expect(await quHouXuan('好笑', 2)).toHaveLength(2)
    expect(await quHouXuan('好笑', 100)).toHaveLength(3)
    expect(await quHouXuan('好笑', 0)).toEqual([])
    expect(await quHouXuan('好笑', -3)).toEqual([])
    expect(await quHouXuan('好笑', Number.NaN)).toEqual([])
  })

  it('随机抽取不越界且不重复', async () => {
    await zhunBeiSiZhang()
    const yunXu = new Set(['笑哭', '狗头', '猫猫'])
    for (let ciShu = 0; ciShu < 30; ciShu += 1) {
      const jieGuo = await quHouXuan('好笑', 5)
      expect(jieGuo.length).toBeGreaterThan(0)
      expect(jieGuo.length).toBeLessThanOrEqual(3)
      expect(new Set(jieGuo.map((tiaoMu) => tiaoMu.duanMing)).size).toBe(jieGuo.length)
      for (const tiaoMu of jieGuo) expect(yunXu.has(tiaoMu.duanMing)).toBe(true)
    }
  })

  it('按短名与 sha256 精确查询', async () => {
    const muLu = await zhunBeiSiZhang()
    const huanChong = fs.readFileSync(path.join(muLu, 'gou-tou.png'))
    const sha256 = createHash('sha256').update(huanChong).digest('hex')
    expect((await chaAnDuanMing('狗头'))?.sha256).toBe(sha256)
    expect((await chaAnSha256(sha256))?.duanMing).toBe('狗头')
    expect((await chaAnSha256(sha256.toUpperCase()))?.duanMing).toBe('狗头')
    expect(await chaAnDuanMing('不存在')).toBeNull()
    expect(await chaAnDuanMing('   ')).toBeNull()
    expect(await chaAnSha256('')).toBeNull()
    expect((await chaAnDuanMing('哭哭'))?.qiYong).toBe(false)
  })
})

describe('确保最新', () => {
  it('目录 mtime 变化后重扫，新增图片让条目数加一', async () => {
    sheZhiBiDuiJianGe('0')
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'yi.png', 'di-yi-zhang')
    expect(await zhongXinSaoMiao()).toBe(1)
    expect(await queBaoZuiXin()).toBe(1)
    xieTuPian(muLu, 'er.png', 'di-er-zhang')
    const weiLai = new Date(Date.now() + 60_000)
    guDingMuLuShiJian(muLu, weiLai)
    expect(await queBaoZuiXin()).toBe(2)
    expect((await quQuanBuQiYong()).map((tiaoMu) => tiaoMu.wenJianMing).sort()).toEqual(['er.png', 'yi.png'])
  })

  it('只改同名标注文件时重扫并反映新值，目录 mtime 不变也生效', async () => {
    sheZhiBiDuiJianGe('0')
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'haha.png', 'tu-bu-bian')
    xieBiaoZhu(muLu, 'haha', { 短名: '笑哭', 情绪标签: '好笑', 启用: true })
    const muLuShiJian = new Date('2024-01-01T00:00:00.000Z')
    guDingMuLuShiJian(muLu, muLuShiJian)
    expect(await zhongXinSaoMiao()).toBe(1)
    expect((await chaAnDuanMing('笑哭'))?.qingXuBiaoQian).toBe('好笑')
    expect((await chaAnDuanMing('笑哭'))?.qiYong).toBe(true)
    const shiJianCuo = fs.statSync(muLu).mtimeMs

    xieBiaoZhu(muLu, 'haha', { 短名: '笑哭', 情绪标签: '无语', 启用: false })
    guDingWenJianShiJian(path.join(muLu, 'haha.json'), new Date(Date.now() + 120_000))
    guDingMuLuShiJian(muLu, muLuShiJian)
    expect(fs.statSync(muLu).mtimeMs).toBe(shiJianCuo)

    expect(await queBaoZuiXin()).toBe(1)
    const tiaoMu = await chaAnDuanMing('笑哭')
    expect(tiaoMu?.qingXuBiaoQian).toBe('无语')
    expect(tiaoMu?.qiYong).toBe(false)
    expect(await quQuanBuQiYong()).toEqual([])
    expect(await quHouXuan('好笑', 8)).toEqual([])
  })

  it('原地替换图片内容后索引里的 sha256 跟着更新', async () => {
    sheZhiBiDuiJianGe('0')
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'huan.png', 'jiu-tu-pian-a')
    xieBiaoZhu(muLu, 'huan', { 短名: '换图', 情绪标签: '好笑' })
    const muLuShiJian = new Date('2024-01-01T00:00:00.000Z')
    guDingMuLuShiJian(muLu, muLuShiJian)
    expect(await zhongXinSaoMiao()).toBe(1)
    const jiuSha = (await chaAnDuanMing('换图'))?.sha256
    expect(jiuSha).toBe(createHash('sha256').update(Buffer.from('jiu-tu-pian-a')).digest('hex'))
    expect((await chaAnSha256(String(jiuSha)))?.duanMing).toBe('换图')
    const shiJianCuo = fs.statSync(muLu).mtimeMs

    fs.writeFileSync(path.join(muLu, 'huan.png'), Buffer.from('xin-tu-pian-b'))
    expect(fs.statSync(path.join(muLu, 'huan.png')).size).toBe(Buffer.from('jiu-tu-pian-a').length)
    guDingWenJianShiJian(path.join(muLu, 'huan.png'), new Date(Date.now() + 120_000))
    guDingMuLuShiJian(muLu, muLuShiJian)
    expect(fs.statSync(muLu).mtimeMs).toBe(shiJianCuo)

    expect(await queBaoZuiXin()).toBe(1)
    const xinSha = (await chaAnDuanMing('换图'))?.sha256
    expect(xinSha).toBe(createHash('sha256').update(Buffer.from('xin-tu-pian-b')).digest('hex'))
    expect(xinSha).not.toBe(jiuSha)
    expect((await chaAnSha256(String(xinSha)))?.duanMing).toBe('换图')
    expect(await chaAnSha256(String(jiuSha))).toBeNull()
  })

  it('最短比对间隔内不重复比对目录', async () => {
    sheZhiBiDuiJianGe('60000')
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'yi.png', 'di-yi-zhang')
    expect(await zhongXinSaoMiao()).toBe(1)
    const jianTing = vi.spyOn(fs.promises, 'readdir')
    await queBaoZuiXin()
    await queBaoZuiXin()
    expect(jianTing).not.toHaveBeenCalled()
  })

  it('间隔设为零时每次都重新比对，内容未变仍不重扫', async () => {
    sheZhiBiDuiJianGe('0')
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'yi.png', 'di-yi-zhang')
    expect(await zhongXinSaoMiao()).toBe(1)
    const muLuJianTing = vi.spyOn(fs.promises, 'readdir')
    const duWenJianJianTing = vi.spyOn(fs.promises, 'readFile')
    expect(await queBaoZuiXin()).toBe(1)
    expect(await queBaoZuiXin()).toBe(1)
    expect(muLuJianTing).toHaveBeenCalledTimes(2)
    expect(duWenJianJianTing).not.toHaveBeenCalled()
  })

  it('并发调用只扫一次', async () => {
    shanChuBiDuiJianGe()
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'yi.png', 'di-yi-zhang')
    xieTuPian(muLu, 'er.png', 'di-er-zhang')
    xieTuPian(muLu, 'san.png', 'di-san-zhang')
    const jianTing = vi.spyOn(fs.promises, 'readdir')
    const jieGuo = await Promise.all([queBaoZuiXin(), queBaoZuiXin(), queBaoZuiXin()])
    expect(jieGuo).toEqual([3, 3, 3])
    expect(jianTing).toHaveBeenCalledTimes(1)
  })
})

describe('按人设风格与关系阶段筛候选', () => {
  async function zhunBei(): Promise<void> {
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'huang-lian.png', 'huang-lian')
    xieBiaoZhu(muLu, 'huang-lian', { 短名: '黄脸笑', 情绪标签: '好笑', 风格: '黄脸' })
    xieTuPian(muLu, 'geng-tu.png', 'geng-tu')
    xieBiaoZhu(muLu, 'geng-tu', { 短名: '沙雕梗图', 情绪标签: '好笑', 风格: '梗图' })
    xieTuPian(muLu, 'zhuan-shu.png', 'zhuan-shu')
    xieBiaoZhu(muLu, 'zhuan-shu', {
      短名: '专属梗图',
      情绪标签: '撒娇',
      风格: '黄脸',
      关系阶段下限: '暧昧',
    })
    xieTuPian(muLu, 'mo-ren.png', 'mo-ren')
    xieBiaoZhu(muLu, 'mo-ren', { 短名: '没写风格', 情绪标签: '好笑' })
    xieTuPian(muLu, 'luan-xie.png', 'luan-xie')
    xieBiaoZhu(muLu, 'luan-xie', { 短名: '乱写风格', 情绪标签: '好笑', 风格: '不存在的风格' })
    await zhongXinSaoMiao()
  }

  it('缺风格与白名单外的风格都归默认日常', async () => {
    await zhunBei()
    const quanBu = await quQuanBuQiYong()
    expect(quanBu.find((xiang) => xiang.duanMing === '没写风格')?.fengGe).toBe('日常')
    expect(quanBu.find((xiang) => xiang.duanMing === '乱写风格')?.fengGe).toBe('日常')
  })

  it('长辈档过滤梗图但保留温和日常图', async () => {
    await zhunBei()
    const jieGuo = await quHouXuan(null, 20, {
      yunXuFengGe: ['黄脸', '祝福', '日常'],
      guanXiJieDuanXuHao: 2,
    })
    const mingDan = jieGuo.map((xiang) => xiang.duanMing)
    expect(mingDan).toContain('黄脸笑')
    expect(mingDan).toContain('没写风格')
    expect(mingDan).not.toContain('沙雕梗图')
    expect(mingDan).not.toContain('专属梗图')
  })

  it('关系没到专属梗图下限时该图不出现', async () => {
    await zhunBei()
    const jieGuo = await quHouXuan(null, 20, {
      yunXuFengGe: ['黄脸', '祝福', '日常', '梗图'],
      guanXiJieDuanXuHao: 2,
    })
    expect(jieGuo.map((xiang) => xiang.duanMing)).not.toContain('专属梗图')
  })

  it('关系到了下限后专属梗图出现', async () => {
    await zhunBei()
    const jieGuo = await quHouXuan(null, 20, {
      yunXuFengGe: ['黄脸', '祝福', '日常', '梗图'],
      guanXiJieDuanXuHao: 6,
    })
    expect(jieGuo.map((xiang) => xiang.duanMing)).toContain('专属梗图')
  })

  it('不传过滤时维持原有行为', async () => {
    await zhunBei()
    expect(await quHouXuan(null, 20)).toHaveLength(5)
  })

  it('关系阶段下限写错时按最严阶段处理，不提前解锁', async () => {
    const muLu = chuangJianMuLu()
    xieTuPian(muLu, 'cuo.png', 'cuo')
    xieBiaoZhu(muLu, 'cuo', {
      短名: '写错的专属图',
      情绪标签: '好笑',
      风格: '黄脸',
      关系阶段下限: '暧味',
    })
    await zhongXinSaoMiao()
    expect((await quQuanBuQiYong())[0]?.guanXiJieDuanXiaXian).toBe(9)
    expect(await quHouXuan(null, 20, { yunXuFengGe: ['黄脸'], guanXiJieDuanXuHao: 2 })).toEqual([])
    const shenAi = await quHouXuan(null, 20, { yunXuFengGe: ['黄脸'], guanXiJieDuanXuHao: 9 })
    expect(shenAi.map((xiang) => xiang.duanMing)).toContain('写错的专属图')
  })
})
