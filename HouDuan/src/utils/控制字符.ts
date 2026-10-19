/**
 * 输出安全真源：玩家可见文本的控制字符清洗。
 *
 * 为什么不能只依赖前端转义：
 *  1. 前端可被绕过——请求可改、旧版本客户端、第三方客户端直连接口，服务端才是唯一必经关口；
 *  2. 同一套数据库被管理端（恋爱吧管理中心）直读展示，任何写入口漏掉的控制字符都会
 *     在管理端被放大展示面，读出口再清洗只是兜底，不是替代写入口的理由；
 *  3. 控制字符的危害不止"难看"：NUL 截断许多解析器、ESC 序列可被终端/富文本渲染器
 *     解释为控制指令、\r 会覆盖日志行制造「日志伪造面」、U+FFFE/U+FFFF 是非字符
 *     （noncharacter），部分字体与序列化链路直接报 invalid Unicode。
 *
 * 口径说明（与 utils/xiangying.ts、routes/表情.ts、services/文档文本提取.ts 的既有清洗对齐）：
 *  - 保留 \t 与 \n：聊天消息、签名的换行与制表是合理排版，全剥会毁掉正常输入；
 *  - \r 一律剥离：换行只认 \n，杜绝"回车覆盖"式显示与日志行注入；
 *  - 剥离范围：C0 控制符（除 \t \n 外全部）+ DEL(U+007F) + 非字符 U+FFFE U+FFFF。
 */

/** 需剥离的控制字符：C0 去掉 \t(U+0009) 与 \n(U+000A)，含 \r(U+000D)、DEL、非字符 */
const KONG_ZHI_ZI_FU_MO_SHI = /[\u0000-\u0008\u000B-\u001F\u007F\uFFFE\uFFFF]/g

/**
 * 剥离控制字符（保留 \t 与 \n）。
 * 非字符串入参返回空串——调用方一律不得把 undefined/null 透到字符串方法上。
 */
export function 剥离控制字符(wenBen: string): string {
  if (typeof wenBen !== 'string') return ''
  return wenBen.replace(KONG_ZHI_ZI_FU_MO_SHI, '')
}

/**
 * 玩家文本统一清洗：先剥控制字符，再 trim，可选按码点截断。
 * 截断按码点（Array.from）而非 UTF-16 长度，emoji/代理对不会被劈成半截，
 * 与 routes/资料.ts 的签名码点计数、routes/表情.ts 的码点截断同一口径。
 */
export function 清洗玩家文本(wenBen: string, zuiDaChangDu?: number): string {
  const jieGuo = 剥离控制字符(wenBen).trim()
  if (zuiDaChangDu === undefined) return jieGuo
  return Array.from(jieGuo).slice(0, zuiDaChangDu).join('')
}
