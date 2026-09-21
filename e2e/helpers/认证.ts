import { Page, APIRequestContext } from '@playwright/test'
import { peiZhi } from './配置'

const houDuanJiChuUrl = peiZhi.houDuanJiChuUrl
const houDuanApiUrl = `${houDuanJiChuUrl}/api`
const lingPaiJian = peiZhi.lingPaiJian

export interface DengLuJieGuo {
  lingPai: string
  xinYongHu: boolean
  shouJiHao: string
  chuShiMiMa?: string
}

export async function zhuCeHuoDengLu(
  qingQiu: APIRequestContext,
  shouJiHao: string,
  miMa: string,
  yongHuMing: string,
): Promise<DengLuJieGuo> {
  // YH-028 之后 /认证/检查手机 对存在与不存在返回同一形态（枚举防护），已不能再当「是否已注册」的判据；
  // 夹具账号的建号判据只能是「登录是否成功」本身。
  const dengLuXiangYing = await qingQiu.post(`${houDuanApiUrl}/认证/登录`, {
    data: { shouJiHao, miMa },
  })
  const dengLuShuJu = await dengLuXiangYing.json()
  if (dengLuShuJu?.cheng_gong && dengLuShuJu?.shu_ju?.令牌) {
    return {
      lingPai: dengLuShuJu.shu_ju.令牌,
      xinYongHu: false,
      shouJiHao,
    }
  }

  await qingQiu.post(`${houDuanApiUrl}/认证/发送码`, {
    data: { shouJiHao },
  })

  const zhuCeXiangYing = await qingQiu.post(`${houDuanApiUrl}/认证/注册`, {
    data: {
      shouJiHao,
      yanZhengMa: peiZhi.kaiFaYanZhengMa,
      yongHuMing,
      miMa,
      tongYiXieYi: true,
      // C5：注册强制采集出生日期，E2E 固定使用成年人出生日期
      chuShengRiQi: '2000-01-01',
    },
  })
  const zhuCeShuJu = await zhuCeXiangYing.json()
  if (!zhuCeShuJu?.cheng_gong) {
    throw new Error(`注册失败: ${zhuCeShuJu?.ti_shi || '未知错误'}`)
  }
  return {
    lingPai: zhuCeShuJu.shu_ju.令牌,
    xinYongHu: true,
    shouJiHao,
  }
}

/**
 * 通过管理员接口创建临时测试用户（返回随机强密码），并登录获取 token
 * 需要调用者具有管理员权限（通过 ADMIN_PHONES 配置的手机号）
 */
export async function chuangJianCeShiYongHuHuQuLingPai(
  qingQiu: APIRequestContext,
  guanLiYuanShouJiHao: string,
  yongHuMingQianZhui: string = 'e2e_test',
): Promise<DengLuJieGuo> {
  const shouJiHao = `1${Date.now().toString().slice(-10)}`
  const yongHuMing = `${yongHuMingQianZhui}_${Date.now()}`

  // 先以管理员身份登录获取管理员 token
  const guanLiDengLu = await qingQiu.post(`${houDuanApiUrl}/认证/登录`, {
    data: { shouJiHao: guanLiYuanShouJiHao, miMa: peiZhi.kaiFaYanZhengMa },
  })
  const guanLiShuJu = await guanLiDengLu.json()
  if (!guanLiShuJu?.cheng_gong) {
    throw new Error(`管理员登录失败: ${guanLiShuJu?.ti_shi || '未知错误'}`)
  }
  const guanLiLingPai = guanLiShuJu.shu_ju.令牌

  // 调用管理员创建测试用户接口
  const chuangJianXiangYing = await qingQiu.post(`${houDuanApiUrl}/管理/测试用户`, {
    headers: { Authorization: `Bearer ${guanLiLingPai}` },
    data: { shouJiHao, yongHuMing },
  })
  const chuangJianShuJu = await chuangJianXiangYing.json()
  if (!chuangJianShuJu?.cheng_gong) {
    throw new Error(`创建测试用户失败: ${chuangJianShuJu?.ti_shi || '未知错误'}`)
  }

  const chuShiMiMa = chuangJianShuJu.shu_ju.chu_shi_mi_ma
  const xinYongHu = chuangJianShuJu.shu_ju.yong_hu

  // 使用返回的随机强密码登录获取 token
  const dengLuXiangYing = await qingQiu.post(`${houDuanApiUrl}/认证/登录`, {
    data: { shouJiHao, miMa: chuShiMiMa },
  })
  const dengLuShuJu = await dengLuXiangYing.json()
  if (!dengLuShuJu?.cheng_gong) {
    throw new Error(`测试用户登录失败: ${dengLuShuJu?.ti_shi || '未知错误'}`)
  }

  return {
    lingPai: dengLuShuJu.shu_ju.令牌,
    xinYongHu: true,
    shouJiHao,
    chuShiMiMa,
  }
}

export async function sheZhiQianDuanDengLuState(page: Page, lingPai: string): Promise<void> {
  await page.goto('/login')
  // 令牌真源是 sessionStorage（utils/令牌存储.ts 的 huiHuaCunChu）：写进 localStorage 路由守卫读不到，
  // 应用会判未登录并跳回登录页，用例随后报「元素找不到」而不是「夹具错了」
  await page.evaluate(
    ({ token, key }) => {
      sessionStorage.setItem(key, token)
    },
    { token: lingPai, key: lingPaiJian },
  )
}

export async function dengLuDaoShouYe(page: Page, lingPai: string): Promise<void> {
  await sheZhiQianDuanDengLuState(page, lingPai)
  await page.goto('/')
}