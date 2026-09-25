import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import type { Request, Response, NextFunction } from 'express'
import { peiZhi } from '../config'
import { huoQuFanYi, type FanYiFenLei } from '../config/translations'
import { shiBaiXiangYing } from '../utils/xiangying'
import { huoQuZhenShiIP } from '../utils/真实IP'
import { redis } from '../redis'
import { CUO_WU_DAI_MA } from '../config/错误码注册表'

// M3：限流计数统一存 Redis，多实例共享且重启不丢失
function chuangJianRedisStore(): RedisStore {
  return new RedisStore({
    sendCommand: (...canShu: string[]) => (redis as any).call(...canShu),
  } as never)
}

// A2：限流键一律由真实来源 IP 派生（可信代理链路推导），客户端伪造 XFF 无法漂移计数
export function shengChengXianLiuJian(qingQiu: Request): string {
  return ipKeyGenerator(huoQuZhenShiIP(qingQiu))
}

function huoQuQingQiuIP(req: Request): string {
  try {
    return ipKeyGenerator(huoQuZhenShiIP(req))
  } catch {
    return 'unknown'
  }
}

function huoQuYongHuId(req: Request): string | undefined {
  return (req as Request & { yong_hu?: { yongHuId: string } }).yong_hu?.yongHuId
}

function tongYongXianLiu(
  windowsMs: number,
  max: number,
  cuoWuTiShi: string,
  keyGenerator?: (req: Request) => string,
  fanYiFenLei: FanYiFenLei = 'renZheng',
) {
  return rateLimit({
    windowMs: windowsMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    // M3：生产环境限流计数存 Redis（多实例共享、重启不丢）；
    // vitest 下内存store按进程隔离：同一进程内顺序跑多文件仍共享计数，
    // F-02 单测减负：角色生成纯本地计算不计入常规限流，禁大文件单测互相误限
    skip: process.env.VITEST === 'true'
      ? (req) => {
          const luJing = `${(req as Request).baseUrl || ''}${(req as Request).path || ''}` || '/'
          return luJing.startsWith('/api/生成角色')
        }
      : undefined,
    // passOnStoreError：Redis 抖动/启动竞态下 store 初始化失败时，express-rate-limit 默认把
    // 那条被缓存的 rejection 在之后的每个请求上重抛 → 全站（含落库前的聊天发送）恒 500。
    // 限流是保护层，不得成为故障源：store 出错时放行，错误由库的 logger 打到控制台、
    // Redis 侧的故障另有 utils/redis 的 error 监听与熔断计数记录。
    ...(process.env.VITEST === 'true' ? {} : { store: chuangJianRedisStore(), passOnStoreError: true }),
    // 默认键：真实来源 IP 派生；各限流器可传入自己的键函数
    keyGenerator: keyGenerator
      ? (req) => keyGenerator(req as Request)
      : (req) => huoQuQingQiuIP(req as Request),
    handler: (req, res) => {
      shiBaiXiangYing(
        res,
        429,
        (huoQuFanYi as (fenLei: FanYiFenLei, jian: string) => string)(fanYiFenLei, cuoWuTiShi),
        CUO_WU_DAI_MA.RATE_LIMITED,
      )
    },
  })
}

function huoQuLuJingFenDang(req: Request): string {
  const luJing = `${req.baseUrl || ''}${req.path || ''}` || '/'
  // YH-026 常规键去路径分两档：禁全路径限流键膨胀，认证面与业务面两档隔离
  if (luJing.startsWith('/api/认证') || luJing.startsWith('/api/资料') || luJing.startsWith('/api/用户设置')) return 'ren_zheng_mian'
  return 'ye_wu_mian'
}

export const changGuiXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.changGui.chuangKou,
  peiZhi.xianLiu.changGui.zuiDa,
  'dengLuShiBaiPinFan',
  (req) => `${huoQuQingQiuIP(req)}:${huoQuLuJingFenDang(req)}`,
)

function huoQuShouJiHao(req: Request): string | undefined {
  const body = req.body as { shou_ji_hao?: string; shouJiHao?: string }
  return body?.shou_ji_hao || body?.shouJiHao
}

// 登录/发码为未认证端点：双层限流防「锁号 DoS」——
// 账号维度（宽松窗口，正常用户不受影响）与 IP 维度（收紧窗口，限制攻击者爆破）
export const dengLuXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.dengLu.chuangKou * 12,
  peiZhi.xianLiu.dengLu.zuiDa * 4,
  'dengLuShiBaiPinFan',
  (req) => {
    const zhangHao = huoQuShouJiHao(req)
    return zhangHao ? `zhanghao:${zhangHao}` : huoQuQingQiuIP(req)
  },
)

export const dengLuIPLianLiu = tongYongXianLiu(
  peiZhi.xianLiu.dengLu.chuangKou,
  peiZhi.xianLiu.dengLu.zuiDa,
  'dengLuShiBaiPinFan',
  (req) => huoQuQingQiuIP(req),
)

export const faSongMaXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.faSongMa.chuangKou,
  peiZhi.xianLiu.faSongMa.zuiDa,
  'faSongYanZhengMaPinFan',
  (req) => {
    const zhangHao = huoQuShouJiHao(req)
    return zhangHao ? `zhanghao:${zhangHao}` : huoQuQingQiuIP(req)
  },
)

// 认证后端点以用户为主键（跨 IP 生效），未认证回退真实 IP
export const liaoTianXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.liaoTian.chuangKou,
  peiZhi.xianLiu.liaoTian.zuiDa,
  'dengLuShiBaiPinFan',
  (req) => huoQuYongHuId(req) || huoQuQingQiuIP(req),
)

export const aiQingQiuXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.aiQingQiu.chuangKou,
  peiZhi.xianLiu.aiQingQiu.zuiDa,
  'dengLuShiBaiPinFan',
  (req) => huoQuYongHuId(req) || huoQuQingQiuIP(req),
)

export const guanLiCaoZuoXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.guanLi.chuangKou,
  peiZhi.xianLiu.guanLi.zuiDa,
  'caoZuoPinFan',
  (req) => huoQuYongHuId(req) || huoQuQingQiuIP(req),
  'tongYong',
)

// A8：/api/logs 匿名端点独立严限流（默认 10 次/分/IP，配置化），防止刷量绕过常规限流
export const riZhiJieShouXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.riZhiJieShou.chuangKou,
  peiZhi.xianLiu.riZhiJieShou.zuiDa,
  'caoZuoPinFan',
  (req) => huoQuQingQiuIP(req),
  'tongYong',
)

// P2-2：/api/认证/检查手机 匿名端点独立严限流（IP 维度），抑制手机号注册状态枚举探测
export const jianChaShouJiXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.jianChaShouJi.chuangKou,
  peiZhi.xianLiu.jianChaShouJi.zuiDa,
  'caoZuoPinFan',
  (req) => huoQuQingQiuIP(req),
  'tongYong',
)

// YH-011 注册独立严限流（IP 维度）+发码配额联动在路由层按手机号二次核验
// vitest 下默认上限5会导致既有注册用例被误限；测试环境放宽到1000，生产/联调走配置
export const zhuCeXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.zhuCe.chuangKou,
  process.env.VITEST === 'true' ? 1000 : peiZhi.xianLiu.zhuCe.zuiDa,
  'zhuCePinFan',
  (req) => huoQuQingQiuIP(req),
  'renZheng',
)

// A7 短信日配额中间件：每手机号/每IP 每日发送上限。
// vitest 下跳过（与限流 Redis store 同策略），避免跨测试文件共享 Redis 计数误伤；
// 配额核心逻辑由 services/短信.ts duanXinRiPeiEYunXu 单独覆盖测试。
export async function duanXinRiPeiEZhuJi(
  qingQiu: Request,
  xiangYing: Response,
  xiaYiBu: NextFunction,
): Promise<void> {
  if (process.env.VITEST === 'true') {
    xiaYiBu()
    return
  }
  try {
    const { duanXinRiPeiEYunXu } = await import('../services/短信')
    const shouJiHao = (qingQiu.body as { shou_ji_hao?: string; shouJiHao?: string })
      ?.shou_ji_hao || (qingQiu.body as { shouJiHao?: string })?.shouJiHao
    if (!shouJiHao) {
      xiaYiBu()
      return
    }
    const jieGuo = await duanXinRiPeiEYunXu(shouJiHao, huoQuZhenShiIP(qingQiu))
    if (!jieGuo.yun_xu) {
      shiBaiXiangYing(xiangYing, 429, jieGuo.ti_shi || huoQuFanYi('renZheng', 'duanXinRiPeiEYongJin'), CUO_WU_DAI_MA.AUTH_SMS_RATE_LIMITED)
      return
    }
    xiaYiBu()
  } catch (cuoWu) {
    // YH-020 告警降级：中间件兜底放行同样发告警，不再静默
    try {
      const { faSongGaoJing } = await import('../utils/邮件告警')
      await faSongGaoJing('xian_liu_zhong_jian_jian_jiang_ji', '限流中间件降级放行', `短信配额中间件异常已兜底放行：${String(cuoWu).slice(0, 300)}`)
    } catch {
      return xiaYiBu()
    }
    xiaYiBu()
  }
}
