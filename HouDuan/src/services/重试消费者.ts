import { redis } from '../redis'
import { debug日志 } from '../utils/debug日志'
import { 数据库 } from '../数据库'

const DuiLieJianQianZhui = 'ai_zhong_shi_dui_lie:'
const MeiCiChuLiTiaoShu = 5
const XiaoHaoJianGeHaoMiao = 60000

function huoQuDuiLieJian(): string {
  return `${DuiLieJianQianZhui}${new Date().toISOString().slice(0, 10)}`
}

async function chuLiYiXiang(xiang: { leiXing: string; yuanYin: string }): Promise<void> {
  if (xiang.leiXing !== '头像生成') return
  try {
    const m = await import('./头像生成')
    const fn = m as unknown as Record<string, (c: Record<string, unknown>) => Promise<boolean>>
    const kaishiHaoMiao = Date.now()
    await fn['尝试头像演化']({
      用户ID: xiang.yuanYin,
      jiaoSeId: xiang.yuanYin,
      laiYuan: 'zhongShiDuiLie',
    })
    debug日志.info('重试队列', '头像补生成完成', { xiang_qing: { jiao_se_id: xiang.yuanYin, hao_miao: Date.now() - kaishiHaoMiao } })
  } catch (e) {
    debug日志.warn('重试队列', '头像补生成失败', { xiang_qing: { cuo_wu: String(e) } })
  }
}



let consumerTimer: NodeJS.Timeout | null = null

export function startRetryConsumer(): void {
  if (consumerTimer) return
  consumerTimer = setInterval(() => {
    void runRetryLoop()
  }, XiaoHaoJianGeHaoMiao)
}

export function stopRetryConsumer(): void {
  if (consumerTimer) {
    clearInterval(consumerTimer)
    consumerTimer = null
  }
}

async function runRetryLoop(): Promise<void> {
  try {
    const yuReiJian = `ri_cheng_yu_rei:${new Date().toISOString().slice(0, 10)}`
    const shouCi = await redis.set(yuReiJian, '1', 'EX', 86400, 'NX')
    if (shouCi === 'OK') {
      const jieGuo = await 数据库.query(`SELECT "ID" FROM "角色" ORDER BY "创建时间" DESC LIMIT 1`)
      const jiaoSeId = String(jieGuo.rows[0]?.ID || '')
      if (jiaoSeId !== '') {
        const { huoQuAIJiaoSeXinXi } = await import('./AI输入准备')
        const riCheng = await import('./Prompt构建器')
        const jiaoSe = await huoQuAIJiaoSeXinXi(jiaoSeId)
        if (jiaoSe) {
          await riCheng.zhunBeiRiCheng(jiaoSeId, {
            ming_zi: jiaoSe.ming_zi,
            shen_fen: jiaoSe.shen_fen,
            zhi_ye: String(jiaoSe.shi_jie_xin_xi?.zhi_ye ?? ''),
            nian_ling: jiaoSe.nian_ling,
            xi_hao: jiaoSe.xi_hao,
            cheng_shi: String(jiaoSe.shi_jie_xin_xi?.cheng_shi ?? ''),
          }, 'Asia/Shanghai')
          debug日志.info('重试队列', '跨天日程预热完成', { xiang_qing: { jiao_se_id: jiaoSeId } })
        }
      }
    }
  } catch (e) {
    debug日志.warn('重试队列', '日程预热失败，不影响消费', { xiang_qing: { cuo_wu: String(e) } })
  }
  try {
    const jian = huoQuDuiLieJian()
    for (let i = 0; i < MeiCiChuLiTiaoShu; i += 1) {
      const raw = await redis.rpop(jian)
      if (!raw) break
      try {
        const item = JSON.parse(raw) as { leiXing?: string; yuanYin?: string }
        await chuLiYiXiang({ leiXing: String(item.leiXing || ''), yuanYin: String(item.yuanYin || '') })
      } catch (e) {
        debug日志.warn('重试队列', '重试项处理失败，丢弃', { xiang_qing: { cuo_wu: String(e) } })
      }
    }
  } catch (e) {
    debug日志.warn('重试队列', '消费循环异常', { xiang_qing: { cuo_wu: String(e) } })
  }
}
