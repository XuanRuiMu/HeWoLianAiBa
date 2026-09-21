import { redis } from '../redis'
import { 数据库 } from '../数据库'
import { HAO_GAN_DU_PEI_ZHI } from '../config/好感度配置'
import { debug日志 } from '../utils/debug日志'
import type { HaoGanDuPingPanJieGuo } from '../types'

const ZENG_LIANG_KEY_QIAN_ZHUI = 'hao_gan_du_zeng_liang:'
const ZENG_LIANG_TTL = 3 * 60 * 60 * 1000
const ZENG_LIANG_MAX_LEN = 10

export interface ZengLiangJiLu {
    lunXu: number
    yuanShiZengLiang: number
    shuaiJianHouZengLiang: number
    xiShu: number
    shiJianCuo: number
    lianXu?: number
}

export interface XiShuJiSuanJieGuo {
    xiShu: number
    lianXuWeiDaBiao: number
    muBiaoQuXian: number
    pingJunShuaiJianHou: number
}

function huoQuKey(yongHuId: string, jiaoSeId: string): string {
    return `${ZENG_LIANG_KEY_QIAN_ZHUI}${yongHuId}:${jiaoSeId}`
}

export function jiSuanMuBiaoQuXian(dangQianFen: number, huDongCiShu: number): number {
    const shengYuLun = Math.max(1, 35 - huDongCiShu)
    const muBiaoFen = Math.min(800, dangQianFen + 100)
    return (muBiaoFen - dangQianFen) / shengYuLun
}

export async function jiLuZengLiang(
    yongHuId: string,
    jiaoSeId: string,
    yuanShiZengLiang: number,
    shuaiJianHouZengLiang: number,
    xiShu: number,
    muBiaoQuXian: number,
    lianXuWeiDaBiao: number = 0,
): Promise<void> {
    const key = huoQuKey(yongHuId, jiaoSeId)
    const jiLu: ZengLiangJiLu = {
        lunXu: 0,
        yuanShiZengLiang,
        shuaiJianHouZengLiang,
        xiShu,
        shiJianCuo: Date.now(),
        lianXu: lianXuWeiDaBiao,
    }

    try {
        await redis.lpush(key, JSON.stringify(jiLu))
        await redis.ltrim(key, 0, ZENG_LIANG_MAX_LEN - 1)
        await redis.pexpire(key, ZENG_LIANG_TTL)
    } catch (cuoWu) {
        debug日志.error('好感度缓存', '增量缓存写入失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    }

    try {
        await 数据库.query(
            `INSERT INTO "好感度增量统计" 
                ("用户ID", "角色ID", "轮次序号", "原始增量", "衰减后增量", "是否应用系数", "系数值", "目标曲线值")
             VALUES ($1, $2, 
                (SELECT COALESCE(MAX("轮次序号"), 0) + 1 FROM "好感度增量统计" WHERE "用户ID" = $1 AND "角色ID" = $2),
                $3, $4, $5, $6, $7)`,
            [yongHuId, jiaoSeId, yuanShiZengLiang, shuaiJianHouZengLiang, xiShu !== 1, xiShu, muBiaoQuXian],
        )
    } catch (cuoWu) {
        debug日志.error('好感度缓存', 'PG统计表写入失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    }
}

export async function jiSuanXiShu(
    yongHuId: string,
    jiaoSeId: string,
    dangQianFen: number,
    huDongCiShu: number,
): Promise<XiShuJiSuanJieGuo> {
    const key = huoQuKey(yongHuId, jiaoSeId)
    let lieBiao: string[] = []
    try {
        lieBiao = await redis.lrange(key, 0, 7)
    } catch (cuoWu) {
        debug日志.error('好感度缓存', '增量缓存读取失败，按无增量降级', { xiang_qing: { cuo_wu: String(cuoWu) } })
        lieBiao = []
    }

    if (lieBiao.length === 0) {
        const muBiao = jiSuanMuBiaoQuXian(dangQianFen, huDongCiShu)
        return { xiShu: 1, lianXuWeiDaBiao: 0, muBiaoQuXian: muBiao, pingJunShuaiJianHou: 0 }
    }

    let zongShuaiJianHou = 0
    for (const jiLuStr of lieBiao) {
        try {
            const jiLu = JSON.parse(jiLuStr) as ZengLiangJiLu
            zongShuaiJianHou += jiLu.shuaiJianHouZengLiang
        } catch {
            continue
        }
    }
    const pingJun = zongShuaiJianHou / lieBiao.length
    const muBiao = jiSuanMuBiaoQuXian(dangQianFen, huDongCiShu)
    const daBiaoXian = muBiao * 0.5

    let xiShu = 1
    let lianXuWeiDaBiao = 0

    if (pingJun < daBiaoXian) {
        const zuiJinJiLuStr = lieBiao[0]
        try {
            const zuiJinJiLu = JSON.parse(zuiJinJiLuStr) as ZengLiangJiLu
            lianXuWeiDaBiao = zuiJinJiLu.lianXu ?? 0
            xiShu = Math.min(1.3 + lianXuWeiDaBiao * 0.2, 2.5)
        } catch {
            xiShu = 1.3
            lianXuWeiDaBiao = 0
        }
    } else {
        xiShu = 1
        lianXuWeiDaBiao = 0
    }

    return { xiShu, lianXuWeiDaBiao: xiShu > 1 ? lianXuWeiDaBiao + 1 : 0, muBiaoQuXian: muBiao, pingJunShuaiJianHou: pingJun }
}

const BAO_DI_KEY_QIAN_ZHUI = 'hao_gan_du_bao_di:'

export async function yingYongHuiHuaBaoDi(
    huiHuaJian: string,
    jieGuo: HaoGanDuPingPanJieGuo,
): Promise<HaoGanDuPingPanJieGuo> {
    const baoDi = HAO_GAN_DU_PEI_ZHI.pingPanBaoDi
    const key = `${BAO_DI_KEY_QIAN_ZHUI}${huiHuaJian}`
    try {
        const zongFen =
            jieGuo.xin_ren_du_bian_hua +
            jieGuo.qin_mi_du_bian_hua +
            jieGuo.qu_wei_du_bian_hua +
            jieGuo.guan_huai_du_bian_hua
        const yiLeiJi = Number((await redis.get(key)) || 0)
        if (yiLeiJi >= baoDi.chuFaLunShu) {
            await redis.set(key, '0', 'PX', baoDi.guoQiHaoMiao)
            const cheng = (v: number): number => Math.round(v * baoDi.xiShu)
            return {
                xin_ren_du_bian_hua: cheng(jieGuo.xin_ren_du_bian_hua),
                qin_mi_du_bian_hua: cheng(jieGuo.qin_mi_du_bian_hua),
                qu_wei_du_bian_hua: cheng(jieGuo.qu_wei_du_bian_hua),
                guan_huai_du_bian_hua: cheng(jieGuo.guan_huai_du_bian_hua),
                li_you: jieGuo.li_you,
            }
        }
        if (zongFen > baoDi.leiJiTiShengXian) {
            await redis.set(key, '0', 'PX', baoDi.guoQiHaoMiao)
            return jieGuo
        }
        const xinJiShu = await redis.incr(key)
        if (xinJiShu === 1) {
            await redis.pexpire(key, baoDi.guoQiHaoMiao)
        }
        return jieGuo
    } catch {
        return jieGuo
    }
}

export async function huoQuZengLiangQuXian(
    yongHuId: string,
    jiaoSeId: string,
    dangQianFen: number,
    huDongCiShu: number,
): Promise<{
    lieBiao: ZengLiangJiLu[]
    muBiaoQuXian: number
    dangQianXiShu: number
    lianXuWeiDaBiao: number
    pingJunShuaiJianHou: number
}> {
    const key = huoQuKey(yongHuId, jiaoSeId)
    const lieBiaoStr = await redis.lrange(key, 0, 9)
    const lieBiao: ZengLiangJiLu[] = []
    for (const s of lieBiaoStr) {
        try {
            lieBiao.push(JSON.parse(s))
        } catch {
            continue
        }
    }

    const xiShuJieGuo = await jiSuanXiShu(yongHuId, jiaoSeId, dangQianFen, huDongCiShu)

    return {
        lieBiao,
        muBiaoQuXian: xiShuJieGuo.muBiaoQuXian,
        dangQianXiShu: xiShuJieGuo.xiShu,
        lianXuWeiDaBiao: xiShuJieGuo.lianXuWeiDaBiao,
        pingJunShuaiJianHou: xiShuJieGuo.pingJunShuaiJianHou,
    }
}