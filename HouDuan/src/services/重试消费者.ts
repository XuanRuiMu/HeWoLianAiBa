import { redis } from '../redis'
import { debug日志 } from '../utils/debug日志'
import { 数据库 } from '../数据库'
import { 读回性别, type 性别内部形态 } from '../utils/性别'
import type { MBTI类型 } from '../config/角色配置'

const DuiLieJianQianZhui = 'ai_zhong_shi_dui_lie:'
const MeiCiChuLiTiaoShu = 5
const XiaoHaoJianGeHaoMiao = 60000

function huoQuDuiLieJian(): string {
  return `${DuiLieJianQianZhui}${new Date().toISOString().slice(0, 10)}`
}

function guiYiXingBie(zhi: unknown): 性别内部形态 {
  const yuan = String(zhi ?? '').trim()
  return yuan === 'nan' || yuan === 'nv' ? yuan : 读回性别(yuan, '重试队列', '')
}

function guiYiMbti(zhi: unknown): MBTI类型 {
  const yuan = String(zhi ?? '').trim()
  const heFa: readonly string[] = [
    'ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP',
    'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
  ]
  return (heFa.includes(yuan) ? yuan : 'INTJ') as MBTI类型
}

async function buShengChengJiaoSeTouXiang(jiaoSeId: string): Promise<void> {
  const kaishiHaoMiao = Date.now()
  const jiaoSeHang = await 数据库.query(
    `SELECT "用户ID", "年龄", "性别", "MBTI", "性格", "预设类型", "外貌", "爱好" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [jiaoSeId],
  )
  const hang = jiaoSeHang.rows[0] as Record<string, unknown> | undefined
  if (!hang) {
    debug日志.warn('重试队列', '头像补生成跳过：角色不存在', { xiang_qing: { jiao_se_id: jiaoSeId } })
    return
  }
  const { 生成角色头像 } = await import('./头像生成')
  const jieGuo = await 生成角色头像({
    用户ID: String(hang['用户ID'] ?? ''),
    jiaoSeId,
    jiaoSe: {
      nian_ling: Number(hang['年龄']) || 20,
      xing_bie: guiYiXingBie(hang['性别']),
      mbti_lei_xing: guiYiMbti(hang['MBTI'] || hang['预设类型']),
      shen_fen: String(hang['预设类型'] || ''),
      wai_mao: String(hang['外貌'] || ''),
      xi_hao: Array.isArray(hang['爱好']) ? (hang['爱好'] as string[]) : [],
      xing_ge: String(hang['性格'] || ''),
    },
  })
  if (jieGuo.chengGong) {
    debug日志.info('重试队列', '头像补生成完成', { xiang_qing: { jiao_se_id: jiaoSeId, hao_miao: Date.now() - kaishiHaoMiao } })
  } else {
    debug日志.warn('重试队列', '头像补生成仍未成功，放弃本次补生成', { xiang_qing: { jiao_se_id: jiaoSeId, hao_miao: Date.now() - kaishiHaoMiao } })
  }
}

export async function chuLiYiXiang(xiang: { leiXing: string; yuanYin: string }): Promise<void> {
  if (xiang.leiXing === 'touXiangShengCheng') {
    await buShengChengJiaoSeTouXiang(xiang.yuanYin)
    return
  }
  debug日志.debug('重试队列', '重试项类型无补生成动作，仅记录', { xiang_qing: { lei_xing: xiang.leiXing, yuan_yin: xiang.yuanYin.slice(0, 120) } })
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
