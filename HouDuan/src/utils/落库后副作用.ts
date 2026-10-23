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
