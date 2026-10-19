import { debug日志 } from './debug日志'

export interface LuoHouFuZuoYong上下文 {
  yong_hu_id?: string
  jiao_se_id?: string
}

function jiLuShiBai(
  biaoshi: string,
  cuoWu: unknown,
  shangXiaWen?: LuoHouFuZuoYong上下文,
): void {
  const cuoWuWenBen = cuoWu instanceof Error ? `${cuoWu.name}: ${cuoWu.message}` : String(cuoWu)
  const zhan = cuoWu instanceof Error && cuoWu.stack ? cuoWu.stack : cuoWuWenBen
  debug日志.error('落库后副作用', `副作用失败，已成功写入的结果保持不变：${biaoshi}`, {
    yong_hu_id: shangXiaWen?.yong_hu_id,
    jiao_se_id: shangXiaWen?.jiao_se_id,
    xiang_qing: { ming_cheng: biaoshi, cuo_wu: cuoWuWenBen, zhan },
  })
}

/**
 * 落库后副作用唯一入口：写库已经成功的请求，其后续副作用（AI 触发、调度器重置/中断、
 * socket 推送、审计与思考记录、缓存失效）无论同步抛错还是 Promise reject，都不得把已经
 * 成功的用户请求改写成 500——用户此时看到的必须是「已发送」。失败一律落服务端日志（含栈），
 * 响应体与状态码保持原样。同步抛错路径同样被吞，因此调用方不需要再写 void 或 catch。
 */
export function 执行落库后副作用(
  biaoshi: string,
  dongZuo: () => unknown,
  shangXiaWen?: LuoHouFuZuoYong上下文,
): void {
  let jieGuo: unknown
  try {
    jieGuo = dongZuo()
  } catch (cuoWu) {
    jiLuShiBai(biaoshi, cuoWu, shangXiaWen)
    return
  }
  if (jieGuo instanceof Promise) {
    jieGuo.then(undefined, (cuoWu: unknown) => jiLuShiBai(biaoshi, cuoWu, shangXiaWen))
  }
}
