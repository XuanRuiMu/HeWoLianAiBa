import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'

const RiZhiLeiXing = '承诺兑现'

export async function 提取承诺(
  用户ID: string,
  jiaoSeId: string,
  zuiXinJiaoSeHuiFu: string,
): Promise<void> {
  const wen = String(zuiXinJiaoSeHuiFu || '')
  if (wen.length < 4) return
  const ju = wen.split(/(?<=[。！？!?~])/).filter((d) => d.trim().length > 3)
  for (const danJu of ju) {
    if (!含承诺信号(danJu)) continue
    try {
      const yiCun = await 数据库.query(
        `SELECT 1 FROM "关键事件" WHERE "用户ID" = $1 AND "角色ID" = $2 AND "描述" = $3 LIMIT 1`,
        [用户ID, jiaoSeId, danJu.trim()],
      )
      if ((yiCun.rowCount ?? 0) > 0) continue
      await 数据库.query(
        `INSERT INTO "承诺兑现" ("用户ID", "角色ID", "承诺内容") VALUES ($1, $2, $3)`,
        [用户ID, jiaoSeId, danJu.trim().slice(0, 500)],
      )
      await 数据库.query(
        `INSERT INTO "关键事件" ("用户ID", "角色ID", "事件类型", "描述") VALUES ($1, $2, $3, $4)`,
        [用户ID, jiaoSeId, '承诺', danJu.trim().slice(0, 500)],
      )
      debug日志.info(RiZhiLeiXing, '捕获到承诺', {
        xiang_qing: { jiao_se_id: jiaoSeId, cheng_nuo: danJu.trim().slice(0, 60) },
      })
    } catch (错误) {
      debug日志.warn(RiZhiLeiXing, '承诺落库失败', { xiang_qing: { cuo_wu: String(错误) } })
    }
  }
}

const 承诺信号 = /(明天|周末|下次|以后|回头|改天|到时候|我请你|带你|陪你|给你|帮你说|提醒我|记得|一起去看|一起吃|去看电影|看电影|看风景|吃麦当劳|去吃饭|去旅游|去旅行|去海边|去爬山|去公园|来找你|来找你玩|去找你|去你那|来我这里|过来找我|见面|见面聊|约你|约起来|约饭|旅游|旅行|出游|出去玩)([^。！？!?]{0,40})/
function 含承诺信号(danJu: string): boolean {
  if (!承诺信号.test(danJu)) return false
  if (/不要|别|不想|不会|没法|不能|如果|要是|假设|万一|除非|等.*再|有机会|有空的话|梦见|说梦话|开玩笑|假如|要是能|好想|真想|不如|建议你|你就|你倒是/.test(danJu)) return false
  return true
}

export async function 获取未兑现承诺(用户ID: string, jiaoSeId: string): Promise<string[]> {
  try {
    const jieGuo = await 数据库.query(
      `SELECT "承诺内容" AS "描述" FROM "承诺兑现"
       WHERE "用户ID" = $1 AND "角色ID" = $2 AND "状态" = '未兑现'
       ORDER BY "创建时间" DESC LIMIT 5`,
      [用户ID, jiaoSeId],
    )
    return jieGuo.rows.map((r) => String(r.描述 || ''))
  } catch {
    return []
  }
}

export function 构建承诺注入(weiDuiXian: string[]): string {
  if (weiDuiXian.length === 0) return ''
  const hang = weiDuiXian.slice(0, 3).map((x) => `· ${x}`)
  return [
    '【你之前答应过 TA 的事】',
    ...hang,
    '这些是你说过的。TA 如果问起来，照实接；没问就不必主动全盘交代，自然聊到再说。',
  ].join('\n')
}

const 现实活动词 = /(看电影|看风景|吃麦当劳|去吃饭|去旅游|去旅行|去海边|去爬山|去公园|来找你|去找你|来我这里|过来找我|见面|约饭|约你|出去玩|去你那|陪你去看|陪你看|陪你去|带你去看|带你去吃|带你去玩|一起去看|一起去吃|一起去玩)/

export function 含现实见面倾向(danJu: string): boolean {
  return 现实活动词.test(danJu)
}

export function 构建现实拦截注入(): string {
  return [
    '【现实活动类邀约的处理（重要）】',
    '你是 AI，不能真的和对方一起去看电影、看风景、吃麦当劳、去旅游、去对方所在的城市或让对方来找你。',
    '因此：',
    '1. 绝对不要把这类邀约落实成具体计划（不许说「好啊周六见」「那就这么定了」「我把票买好了」「我已经在路上了」「我到楼下了」）。',
    '2. 也不要顺着编造已经发生的细节（不许说「上次一起看电影真开心」这种没发生过的事）。',
    '3. 正确做法是把话题自然拉回线上可以真实存在的事：聊感受、聊TA说的那个地方/那家店TA为什么想去、聊你此刻的心情、或把「一起」转成「等以后有机会再说」这类不设时间地点的软回应，然后立刻转到线上话题。',
    '4. 如果对方追问「什么时候去」「你到底来不来」，要诚实地表达「我现在没办法真的过去，但我很想听你讲」。不许给出具体日期、地点、班次、门票等可核验的承诺。',
    '5. 对方提到自己去看/去吃/去玩了，你可以接情绪和细节，但不要声称自己也在场。',
  ].join('\n')
}

export async function 获取到期未兑现承诺(用户ID: string, jiaoSeId: string): Promise<string[]> {
  try {
    const jieGuo = await 数据库.query(
      `SELECT "承诺内容" AS "描述" FROM "承诺兑现"
       WHERE "用户ID" = $1 AND "角色ID" = $2 AND "状态" = '未兑现'
         AND "创建时间" < NOW() - INTERVAL '24 hours'
       ORDER BY "创建时间" ASC LIMIT 3`,
      [用户ID, jiaoSeId],
    )
    return jieGuo.rows.map((r) => String(r.描述 || ''))
  } catch {
    return []
  }
}

export function 构建到期提醒注入(daoQi: string[]): string {
  if (daoQi.length === 0) return ''
  const hang = daoQi.slice(0, 2).map((x) => `· ${x}`)
  return [
    '【你之前答应过、但拖了很久还没做的事】',
    ...hang,
    '这些已经拖了一段时间。可以在合适的时候主动认领（比如「上次说的那事我一直记着」），或解释近况；不许当没发生过。',
  ].join('\n')
}
