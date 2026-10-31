import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { huoQuFanYi } from '@/config/翻译表'

const dangQianMuLu = __dirname

function du(relativePath: string): string {
  return readFileSync(resolve(dangQianMuLu, relativePath), 'utf8')
}

function 翻译表源码(): string {
  return du('../config/翻译表.ts')
}

describe('FP06 账号设置：文本清理', () => {
  it('需求9：默认对象性别描述不再含"可在此修改"', () => {
    const miaoShu = huoQuFanYi('caidan', 'moRenDuiXiangMiaoShu')
    expect(miaoShu).not.toContain('可在此修改')
    expect(miaoShu).toBe('普通模式第二步将默认选中该性别')
  })

  it('需求12：搜索行与名片的冗余文本及翻译键已删除', () => {
    const 账号页 = du('../views/账号与安全.vue')
    expect(账号页).not.toContain('souSuoBiaoTi')
    expect(账号页).not.toContain('mingPianGuanMing')
    expect(账号页).not.toContain('guan-ming')
    expect(账号页).not.toContain('搜索设置</')
    expect(翻译表源码()).not.toContain("souSuoBiaoTi: '搜索设置'")
    expect(翻译表源码()).not.toContain("mingPianGuanMing: '植物园访客名片'")
  })

  it('需求12：用户名描述不再含"修改后即时生效"', () => {
    const miaoShu = huoQuFanYi('sheZhi', 'yongHuMingMiaoShu')
    expect(miaoShu).not.toContain('即时生效')
    expect(miaoShu).toBe('用户名1-30个字符')
  })

  it('需求14：签名可见性下拉外标签保留、菜单内标题与虚线入口移除', () => {
    const 账号页 = du('../views/账号与安全.vue')
    expect(账号页).toContain("<span>{{ huoQuFanYi('sheZhi', 'keJianXingBiaoTi') }}</span>")
    expect(账号页).toContain(`:aria-biao-qian="huoQuFanYi('sheZhi', 'keJianXingBiaoTi')"`)
    expect(账号页).not.toContain(`:biao-qian="huoQuFanYi('sheZhi', 'keJianXingBiaoTi')"`)
  })
})

describe('FP06 账号设置：离页静默保存', () => {
  const 账号页 = du('../views/账号与安全.vue')

  it('需求10：性别卡确定按钮与保存函数全部删除', () => {
    expect(账号页).not.toContain('xingbie-baocun')
    expect(账号页).not.toContain('baoCunMoRenXingBie')
    expect(账号页).not.toContain('baoCunMoRenDuiXiangXingBie')
    expect(账号页).not.toContain('moRenXingBieBaoCunZhong')
    expect(账号页).not.toContain('moRenDuiXiangBaoCunZhong')
    expect(账号页).not.toContain('fenQuanCuoWu.moRenXingBie')
  })

  it('需求10：点击卡片即更新本地状态，无任何提交动作', () => {
    expect(账号页.match(/@click="moRenXingBieXuanZhong = 'male'"/g)?.length).toBe(1)
    expect(账号页.match(/@click="moRenDuiXiangXuanZhong = 'female'"/g)?.length).toBe(1)
  })

  it('需求10：以服务端快照做脏标记，未变更不发请求', () => {
    expect(账号页).toContain('const xingBieFuWuQiKuaiZhao')
    expect(账号页).toContain('function xingBieYouWeiBaoCun')
    expect(账号页).toContain('if (!gengXingBie && !gengDuiXiang) return')
  })

  it('需求10：路由离开与卸载双钩静默保存且防重入', () => {
    const 离开段 = 账号页.slice(
      账号页.indexOf('onBeforeUnmount(() => {'),
      账号页.indexOf('const fengJinZhuangTai'),
    )
    expect(离开段).toContain('void jingMoBaoCunXingBie()')
    expect(账号页.match(/void jingMoBaoCunXingBie\(\)/g)?.length).toBe(2)
    expect(账号页).toContain('if (xingBieJingMoBaoCunZhong) return')
  })

  it('需求10：保存成功后仅同步用户仓库，无强制刷新', () => {
    const 保存段 = 账号页.slice(
      账号页.indexOf('async function jingMoBaoCunXingBie'),
      账号页.indexOf('const keYiBaoCunMiMa'),
    )
    expect(保存段).toContain('用户仓库.tongBuZiLiao({ mo_ren_xing_bie: xinXi.mo_ren_xing_bie })')
    expect(保存段).toContain('用户仓库.tongBuZiLiao({ mu_biao_xing_bie: xinXi.mu_biao_xing_bie })')
    expect(保存段).not.toContain('jiaZaiYongHu')
    expect(账号页).not.toContain('location.reload')
    expect(账号页).not.toContain('router.go(0)')
  })

  it('需求10：保存失败走静默错误通道，不伪报成功', () => {
    const 保存段 = 账号页.slice(
      账号页.indexOf('async function jingMoBaoCunXingBie'),
      账号页.indexOf('const keYiBaoCunMiMa'),
    )
    expect(保存段).toContain('console.error')
    expect(保存段).not.toContain("baoCunChengGong")
  })

  it('需求10：挂载时记录快照并显示服务端最新值', () => {
    const 挂载段 = 账号页.slice(账号页.indexOf('onMounted(() => {'), 账号页.indexOf('onBeforeUnmount(() => {'))
    expect(挂载段).toContain("moRenXingBieXuanZhong.value = 用户形态(用户仓库.dangQianYongHu?.mo_ren_xing_bie)")
    expect(挂载段).toContain('xingBieFuWuQiKuaiZhao.moRenXingBie = moRenXingBieXuanZhong.value')
    expect(挂载段).toContain('xingBieFuWuQiKuaiZhao.moRenDuiXiang = moRenDuiXiangXuanZhong.value')
  })

  it('需求10：用户仓库支持性别字段同步', () => {
    const 用户仓库 = du('../stores/用户.ts')
    expect(用户仓库).toContain('mo_ren_xing_bie?: 用户[\'mo_ren_xing_bie\']')
    expect(用户仓库).toContain('mu_biao_xing_bie?: 用户[\'mu_biao_xing_bie\']')
  })
})

describe('FP06 账号设置：进入页不自动下拉', () => {
  it('需求11：锚点滚动逻辑全部移除', () => {
    const 账号页 = du('../views/账号与安全.vue')
    expect(账号页).not.toContain('gunDongDaoMaoDian')
    expect(账号页).not.toContain('scrollIntoView')
    expect(账号页).not.toContain('锚点到标签')
    expect(账号页).not.toContain('route.hash')
  })
})

describe('FP06 账号设置：头像形状统一为聊天页圆角方形', () => {
  const 账号页 = du('../views/账号与安全.vue')

  it('需求15：名片头像与我的头像预览均为 6px 圆角方形', () => {
    const blob段 = 账号页.slice(账号页.indexOf('.blob-tou {'), 账号页.indexOf('.ming-pian-wen'))
    expect(blob段).toContain('border-radius: 6px')
    expect(blob段).not.toContain('42%')
    const yulan段 = 账号页.slice(账号页.indexOf('.yulan-wei {'), 账号页.indexOf('.ti-shi-wen'))
    expect(yulan段).toContain('border-radius: 6px')
    expect(yulan段).not.toContain('42%')
  })

  it('需求15：形状与聊天页消息头像基准一致', () => {
    const 消息行 = du('../components/聊天/消息行.vue')
    const 基准段 = 消息行.slice(
      消息行.indexOf('.xiaoxi-wei {'),
      消息行.indexOf('.yonghu-xiaoxi .xiaoxi-wei'),
    )
    expect(基准段).toContain('border-radius: 6px')
    expect(基准段).toContain('overflow: hidden')
  })
})
