import { shiYunYingZiDuanXiaoXiLeiXing } from '../config/消息配置'
import { anYongHuIdJuBeiNengLi } from '../middleware/管理员'
import { debug日志 } from '../utils/debug日志'
import type { XiaoXiXinXi } from './消息'

/**
 * FP-22（消解 L-39）HTTP 出参运营侧字段的**唯一收口点**，与 FP-19 的
 * `socket/管理通道.ts`（socket 面收口）同族对称：运营侧数据只随「运营读取能力」下发。
 *
 * 收口的运营侧字段：
 * - `yuan_shi_nei_rong`：撤回前原文。`services/消息` 的撤回写口把 `原始内容 = 内容` 保留下来，
 *   AI 自撤回（`管理员_隐藏信息` 的「隐藏的内心修正」）也走同一写口，故原文一旦随普通用户的
 *   读接口下发，等于把 AI 刻意隐藏的推理原文交回当事人客户端；
 * - `lei_xing ∈ YUN_YING_ZI_DUAN_XIAO_XI_LEI_XING` 的整行：存量「AI 隐藏内心活动」消息行
 *   （现码已无生产者，前端只做视觉隐藏并喂管理员监控的深度思考列表）。
 *
 * 口径：普通用户读自己的会话时该键**根本不出现在响应里**（不是置空、不是置 null），
 * 运营侧整行也不下发；具备 cha_kan 运营读取能力者（超管/运营/审核员）照旧全量下发。
 * 能力判定唯一走 FP-18/FP-19 同源入口 `anYongHuIdJuBeiNengLi`（查库 + 30s 缓存 + 跨实例失效广播），
 * 本模块不再自写第二套判定；能力未知、入参缺失、查库异常一律按无权限处理（fail-closed）。
 *
 * 只在**路由出参**处调用：`huoQuXiaoXiLieBiao` 等取数口保持原样，因为本模块的职责是「按读取方
 * 能力决定下不下发」，而不是数据源。FP-26 更新事实：模型装配面（`services/对话渲染`、
 * `services/AI输入准备`、`军师`、`复盘`）**已不再读取撤回原文**（撤回语义＝原文不进语料），
 * 故本入口的运营读取面只剩人侧（管理路由 / 有 cha_kan 能力的用户读会话）两处消费者。
 */

async function yunYingZiDuanKeDu(duFangYongHuId: string): Promise<boolean> {
  if (!duFangYongHuId) return false
  try {
    return await anYongHuIdJuBeiNengLi(duFangYongHuId, 'cha_kan')
  } catch (cuoWu) {
    debug日志.error('消息出参收口', '运营字段读取能力判定失败，按无权限处理', {
      xiang_qing: { cuo_wu: String(cuoWu) },
    })
    return false
  }
}

function mianYunYingZiDuan(xiao_xi: XiaoXiXinXi): XiaoXiXinXi {
  if (xiao_xi.yuan_shi_nei_rong === undefined) return xiao_xi
  const shouXie: XiaoXiXinXi = { ...xiao_xi }
  delete shouXie.yuan_shi_nei_rong
  return shouXie
}

/** 单条消息的 HTTP 出参收口：发送/撤回等把落库结果回显给调用方的站点使用 */
export async function shouKouXiaoXiYunYingZiDuan(
  xiao_xi: XiaoXiXinXi | undefined,
  duFangYongHuId: string,
): Promise<XiaoXiXinXi | undefined> {
  if (!xiao_xi) return xiao_xi
  if (await yunYingZiDuanKeDu(duFangYongHuId)) return xiao_xi
  return mianYunYingZiDuan(xiao_xi)
}

/** 消息列表的 HTTP 出参收口：除单条字段外，无运营读取能力者整行拿不到运营侧类型 */
export async function shouKouXiaoXiLieBiaoYunYingZiDuan(
  xiao_xi_lie_biao: XiaoXiXinXi[],
  duFangYongHuId: string,
): Promise<XiaoXiXinXi[]> {
  const keDu = await yunYingZiDuanKeDu(duFangYongHuId)
  return xiao_xi_lie_biao
    .filter((xiao_xi) => keDu || !shiYunYingZiDuanXiaoXiLeiXing(xiao_xi.lei_xing))
    .map((xiao_xi) => (keDu ? xiao_xi : mianYunYingZiDuan(xiao_xi)))
}
