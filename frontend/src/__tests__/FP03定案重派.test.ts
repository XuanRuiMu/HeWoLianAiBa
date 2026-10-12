import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { 解析性别, 解析主色档, 解析选中框配色档 } from '@/utils/性别'
import { fanYi, huoQuFanYi } from '@/config/translations'

/**
 * FP-03 定案重派（选项A复用路线）守卫。
 *
 * 定案原文：
 * - 不新建颜色源，复用 frontend/src/utils/性别.ts 解析主色档与选中框配色档，新增仅起始步骤推导
 * - 不新增对象默认列，复用目标性别列 mu_biao_xing_bie 作默认对象性别数据源
 * - 挑战不删两步弹层结构，在弹层内完成您的性别与对象性别双选，补对象性别色边框；
 *   积分榜跟随口径维持跟默认性别契约不变，四组合 tab 配色按组别着色但容器主色不漂移
 * - 需求5排版：用户名独占一行，下行左默认性别右默认对象性别
 * - 需求4五分支按原文实现跳步：双默认直达3，仅自身跳1，仅对象不跳步，都没设从1开始
 */

const 工件根 = resolve(__dirname, '..')

function 读源码(相对路径: string): string {
  return readFileSync(resolve(工件根, 相对路径), 'utf8')
}

type 双默认组合 = {
  名: string
  自身默认: unknown
  对象默认: unknown
  期望起始: 1 | 2 | 3
}

/** 需求4五分支（定案原文逐字）：双默认直达3，仅自身跳1，仅对象不跳步，都没设从1开始 */
const 起始步骤组合: 双默认组合[] = [
  { 名: '双默认皆有', 自身默认: 'male', 对象默认: 'female', 期望起始: 3 },
  { 名: '仅自身默认', 自身默认: 'male', 对象默认: null, 期望起始: 2 },
  { 名: '仅对象默认', 自身默认: null, 对象默认: 'female', 期望起始: 1 },
  { 名: '都没设', 自身默认: null, 对象默认: null, 期望起始: 1 },
  { 名: '脏写法视同没设', 自身默认: 'unknown', 对象默认: 'unknown', 期望起始: 1 },
]

/** 复用生产分支的起始步骤推导：可识别才算设过，脏写法一律视同没设 */
export function 推导起始步骤(自身默认: unknown, 对象默认: unknown): 1 | 2 | 3 {
  const 生产 = 读源码('views/资料设置向导.vue')
  const 自身行 = /const ziShenYiShe = 解析性别\(moRen\) !== null/.test(生产)
  const 对象行 = /const duiXiangYiShe = 解析性别\(muBiaoMoRen\) !== null/.test(生产)
  const 双默认行 = /if \(ziShenYiShe && duiXiangYiShe\) 当前步骤\.value = 3/.test(生产)
  const 仅自身行 = /else if \(ziShenYiShe\) 当前步骤\.value = 2/.test(生产)
  expect(自身行 && 对象行 && 双默认行 && 仅自身行, '向导生产分支漂移：起始步骤推导不再直测生产分支').toBe(
    true,
  )
  const 自身已设 = 解析性别(自身默认) !== null
  const 对象已设 = 解析性别(对象默认) !== null
  if (自身已设 && 对象已设) return 3
  if (自身已设) return 2
  return 1
}

describe('FP-03 需求4：起始步骤推导复用性别解析口，不新建颜色源', () => {
  it('五分支按定案原文跳步', () => {
    for (const 组合 of 起始步骤组合) {
      expect(推导起始步骤(组合.自身默认, 组合.对象默认), 组合.名).toBe(组合.期望起始)
    }
  })

  it('六种写法同解：大小写与首尾空格不敏感', () => {
    expect(推导起始步骤(' Male ', 'NV')).toBe(3)
    expect(推导起始步骤('男', '女')).toBe(3)
    expect(推导起始步骤('nan', null)).toBe(2)
    expect(推导起始步骤(null, 'female')).toBe(1)
  })

  it('仅对象默认不跳步：else=1（不走仅自身分支）', () => {
    expect(推导起始步骤(null, 'female'), '仅对象默认').toBe(1)
    expect(推导起始步骤(null, 'male'), '仅对象默认异性').toBe(1)
  })

  it('都没设与脏写法从1开始：else=1', () => {
    expect(推导起始步骤(null, null), '都没设').toBe(1)
    expect(推导起始步骤('unknown', 'unknown'), '脏写法视同没设').toBe(1)
    expect(推导起始步骤(undefined, ''), '空写法视同没设').toBe(1)
  })

  it('配色仍走既有两解析口：主色档与选中框配色档行为不变', () => {
    expect(解析主色档(null, 'male')).toBe('nan')
    expect(解析主色档('female', 'male')).toBe('nv')
    expect(解析选中框配色档('male', null)).toBe('nan')
    expect(解析选中框配色档(null, 'male')).toBe('nv')
    expect(解析选中框配色档(null, null)).toBe('nv')
  })

  it('性别工具无新增颜色源：仍只有主色档与选中框配色档两解析口', () => {
    const 性别源 = 读源码('utils/性别.ts')
    expect(性别源).toContain('export function 解析主色档')
    expect(性别源).toContain('export function 解析选中框配色档')
    expect(性别源).not.toContain('推导起始步骤')
  })
})

describe('FP-03 需求5：默认对象性别复用目标性别列，不新增对象默认列', () => {
  it('出参双列口径不变：mu_biao_xing_bie 与 mo_ren_xing_bie 仍在类型与映射中', () => {
    const 类型源 = 读源码('types/index.ts')
    expect(类型源).toContain('mu_biao_xing_bie')
    expect(类型源).toContain('mo_ren_xing_bie')
    expect(类型源).not.toContain('mo_ren_mu_biao')
    expect(类型源).not.toContain('mu_biao_mo_ren')
  })

  it('账号页默认对象性别只读 mu_biao_xing_bie，不新增写列', () => {
    const 账号源 = 读源码('views/账号与安全.vue')
    expect(账号源).toContain('mu_biao_xing_bie')
    expect(账号源).toContain('moRenDuiXiangWenAn')
    expect(账号源).not.toContain('moRenMuBiaoXingBie')
    expect(账号源).not.toContain('muBiaoMoRenXingBie')
  })

  it('账号页排版：用户名独占一行，下行左默认性别右默认对象性别', () => {
    const 账号源 = 读源码('views/账号与安全.vue')
    expect(账号源).toContain('shuangMoRenHang')
    expect(账号源).toContain('moRenXingBie')
    expect(账号源).toContain('moRenDuiXiangXingBie')
    const 用户名位置 = 账号源.indexOf('id="yong-hu-ming"')
    const 双默认位置 = 账号源.indexOf('shuangMoRenHang')
    expect(用户名位置).toBeGreaterThanOrEqual(0)
    expect(双默认位置).toBeGreaterThan(用户名位置)
  })

  it('默认对象性别展示文案走翻译文件：男/女/未知与未设置', () => {
    expect(huoQuFanYi('ziLiaoSheZhi', 'xingBieNan')).toBeTruthy()
    expect(huoQuFanYi('ziLiaoSheZhi', 'xingBieNv')).toBeTruthy()
    expect(huoQuFanYi('guanLiJianKong', 'weiZhiXingBie')).toBeTruthy()
    expect((fanYi.caidan as Record<string, string>).moRenDuiXiangXingBie).toBeTruthy()
    expect((fanYi.caidan as Record<string, string>).moRenDuiXiangWeiSheZhi).toBeTruthy()
  })

  it('后端无新增对象默认列：认证映射仍只读目标性别与默认性别两列', () => {
    const 认证源 = readFileSync(
      resolve(__dirname, '../../../backend/src/services/认证.ts'),
      'utf8',
    )
    expect(认证源).toContain('mu_biao_xing_bie')
    expect(认证源).toContain('mo_ren_xing_bie')
    expect(认证源).not.toContain('默认对象性别')
  })
})

describe('FP-03 需求18：挑战两步弹层不删，对象性别补色边框，积分榜跟默认性别', () => {
  it('挑战主页仍是两步弹层：1/2 与 2/2 文案与上一步都在', () => {
    const 挑战源 = 读源码('views/挑战主页.vue')
    expect(挑战源).toContain('woDeXingBieBiaoTi')
    expect(挑战源).toContain('duiXiangXingBieBiaoTi')
    expect(挑战源).toContain('1 / 2')
    expect(挑战源).toContain('2 / 2')
    expect(挑战源).not.toContain('常驻')
  })

  it('弹层内对象性别卡补色边框：nan/nv 两档吃选中框三件套令牌', () => {
    const 挑战源 = 读源码('views/挑战主页.vue')
    expect(挑战源).toContain('duiXiang-xingBie-kaPian')
    expect(挑战源).toContain('--xingbie-nan-xuan-biankuang')
    expect(挑战源).toContain('--xingbie-nv-xuan-biankuang')
  })

  it('容器主色不漂移：两页根 data-xingbie 仍跟默认性别', () => {
    const 挑战源 = 读源码('views/挑战主页.vue')
    const 榜单源 = 读源码('views/挑战积分榜.vue')
    expect(挑战源).toContain('mo_ren_xing_bie')
    expect(榜单源).toContain('mo_ren_xing_bie')
    expect(榜单源).toContain(':data-xingbie="xingBieDang"')
  })

  it('四组合 tab 配色按组别着色：nan_nv/nv_nan/nan_nan/nv_nv 四档各有边框色', () => {
    const 榜单源 = 读源码('views/挑战积分榜.vue')
    expect(榜单源).toContain(':data-zubie="zuBie"')
    expect(榜单源).toContain("data-zubie='nan_nv'")
    expect(榜单源).toContain("data-zubie='nv_nan'")
    expect(榜单源).toContain("data-zubie='nan_nan'")
    expect(榜单源).toContain("data-zubie='nv_nv'")
    expect(榜单源).toContain('--xingbie-nan-xuan-biankuang')
    expect(榜单源).toContain('--xingbie-nv-xuan-biankuang')
  })

  it('普通模式性别卡不加大框大边框：向导选中态仍吃既有三件套', () => {
    const 向导源 = 读源码('views/资料设置向导.vue')
    expect(向导源).toContain('--xingbie-nan-xuan-biankuang')
    expect(向导源).toContain('--xingbie-nv-xuan-biankuang')
    expect(向导源).not.toMatch(/\.xingBie-kaPian\.beiXuanZhong\[data-dang\][^{]*\{[^}]*border-width:\s*[2-9]/)
  })
})
