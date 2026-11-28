import { randomUUID } from 'node:crypto'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuFanYi } from '../config/translations'
import { HaoGanDuPeiZhi, HaoGanDuJieDuanYingShe, GuiFanGuanXiJieDuanMing } from '../config/好感度配置'
import { chuLiYouXiJieShu } from './胜利失败条件'
import { debug日志, jiLuHaoGanDuBianHua } from '../utils/debug日志'
import type { HaoGanDuXinXi, GongKaiHaoGanDuXinXi, WanZhengHaoGanDuXinXi } from '../types'
import { jiLuZengLiang } from './好感度缓存'
import { 按权重分配整数, 归一四维 } from '../utils/整数分配'
import { 生成人设初始分 } from './初始好感度'

export interface HaoGanDuSiWeiBianHua {
  xin_ren_du_bian_hua: number
  qin_mi_du_bian_hua: number
  qu_wei_du_bian_hua: number
  guan_huai_du_bian_hua: number
}

export interface HaoGanDuZengLiangShiJian {
  shi_jian_id: string
  jiao_se_id: string
  xin_ren_du_bian_hua: number
  qin_mi_du_bian_hua: number
  qu_wei_du_bian_hua: number
  guan_huai_du_bian_hua: number
  zong_fen_bian_hua: number
}

export interface HaoGanDuGengXinJieGuo {
  cheng_gong: boolean
  hao_gan_du?: HaoGanDuXinXi
  ti_shi?: string
  zhuang_tai_ma?: number
  shuaiJianHouZengLiang?: number
  zeng_liang_shi_jian?: HaoGanDuZengLiangShiJian
}

export type 对局模式 = 'putong' | 'tiaozhan'

function qieGeFanWei(zhi: number, zuiDi: number, zuiGao: number): number {
  return Math.max(zuiDi, Math.min(zuiGao, zhi))
}

export function miJiKouLingPiPei(shuRu: string): boolean {
  const kouLing = HaoGanDuPeiZhi.miJi.miLing
  if (kouLing.length === 0) return false
  if (typeof shuRu !== 'string' || shuRu.length !== kouLing.length) return false
  let chaZhi = 0
  for (let xuHao = 0; xuHao < kouLing.length; xuHao += 1) {
    chaZhi |= kouLing.charCodeAt(xuHao) ^ shuRu.charCodeAt(xuHao)
  }
  return chaZhi === 0
}

export function jiSuanZongFen(siWei: {
  xin_ren_du: number
  qin_mi_du: number
  qu_wei_du: number
  guan_huai_du: number
}): number {
  const fenShu =
    (Number(siWei.xin_ren_du) || 0) +
    (Number(siWei.qin_mi_du) || 0) +
    (Number(siWei.qu_wei_du) || 0) +
    (Number(siWei.guan_huai_du) || 0)

  return Math.round(qieGeFanWei(fenShu, HaoGanDuPeiZhi.fanWei.zuiDiFen, HaoGanDuPeiZhi.fanWei.zuiGaoFen))
}

export function quMoShiBeiLv(moShi: 对局模式 | string | null | undefined): number {
  const guiFan = String(moShi ?? '').trim() === 'tiaozhan' ? 'tiaozhan' : 'putong'
  return HaoGanDuPeiZhi.moShiBeiLv[guiFan]
}

export async function huoQuDuiJuMoShi(jiao_se_id: string): Promise<对局模式> {
  try {
    const jieGuo = await 数据库.query(`SELECT "对局模式" FROM "角色" WHERE "ID" = $1 LIMIT 1`, [jiao_se_id])
    return String(jieGuo.rows[0]?.对局模式 ?? '') === 'tiaozhan' ? 'tiaozhan' : 'putong'
  } catch (cuoWu) {
    debug日志.warn('好感度服务', '对局模式读取失败，按普通模式处理', {
      xiang_qing: { jiao_se_id, cuo_wu: String(cuoWu) },
    })
    return 'putong'
  }
}

export function jiSuanShiJiZengLiang(
  jiuZongFen: number,
  yuanShiZengLiang: number,
  moShiBeiLv: number,
): number {
  const zuiGaoFen = HaoGanDuPeiZhi.fanWei.zuiGaoFen
  const zuiDiFen = HaoGanDuPeiZhi.fanWei.zuiDiFen
  const beiLv = Number.isFinite(moShiBeiLv) && moShiBeiLv > 0 ? moShiBeiLv : 1
  const 模式后增量 = Math.round(yuanShiZengLiang * beiLv)
  if (jiuZongFen >= zuiGaoFen && 模式后增量 > 0) return 0
  const 新总分 = qieGeFanWei(Math.round(jiuZongFen + 模式后增量), zuiDiFen, zuiGaoFen)
  return 新总分 - jiuZongFen
}

export function fenJieSiWei(zongFen: number): Omit<HaoGanDuXinXi, 'guan_xi_jie_duan'> {
  const qieGeFen = qieGeFanWei(Math.round(zongFen), HaoGanDuPeiZhi.fanWei.zuiDiFen, HaoGanDuPeiZhi.fanWei.zuiGaoFen)
  const { quanZhong } = HaoGanDuPeiZhi
  const 分配 = 按权重分配整数(qieGeFen, [quanZhong.xinRenDu, quanZhong.qinMiDu, quanZhong.quWeiDu, quanZhong.guanHuaiDu])

  return {
    xin_ren_du: 分配[0],
    qin_mi_du: 分配[1],
    qu_wei_du: 分配[2],
    guan_huai_du: 分配[3],
    zong_fen: qieGeFen,
  }
}

export function huoQuJieDuanXinXi(zongFen: number): HaoGanDuJieDuanYingShe {
  const qieGeFen = qieGeFanWei(Number(zongFen) || 0, HaoGanDuPeiZhi.fanWei.zuiDiFen, HaoGanDuPeiZhi.fanWei.zuiGaoFen)

  const jieDuanLieBiao = Object.values(HaoGanDuPeiZhi.jieDuan)
  for (const jieDuan of jieDuanLieBiao) {
    if (qieGeFen >= jieDuan.xiaXian && qieGeFen <= jieDuan.shangXian) {
      return jieDuan
    }
  }

  return jieDuanLieBiao[0]
}

export function huoQuJieDuanMing(zongFen: number): string {
  return huoQuJieDuanXinXi(zongFen).jieDuanMing
}

export function huoQuXinQing(zongFen: number): string {
  return huoQuJieDuanXinXi(zongFen).xinQing
}

function 取阶段序号(zongFen: number): number {
  const 名 = huoQuJieDuanMing(zongFen)
  const 序号 = Object.values(HaoGanDuPeiZhi.jieDuan).findIndex((段) => 段.jieDuanMing === 名)
  return 序号 >= 0 ? 序号 : 0
}

function 取阶段下界(zongFen: number): number {
  return huoQuJieDuanXinXi(zongFen).xiaXian
}

const 确认阶段键前缀 = 'que_ren_jie_duan:'
const 确认阶段有效期秒 = HaoGanDuPeiZhi.queRenJieDuanYouXiaoMiao

interface 确认阶段状态 {
  xia_xian: number
  lian_xu_jiang_dang: number
}

function 确认阶段键(yong_hu_id: string, jiao_se_id: string): string {
  return `${确认阶段键前缀}${yong_hu_id}:${jiao_se_id}`
}

async function 读确认阶段(yong_hu_id: string, jiao_se_id: string): Promise<确认阶段状态 | null> {
  try {
    const 原文 = await redis.get(确认阶段键(yong_hu_id, jiao_se_id))
    if (!原文) return null
    const 载荷 = JSON.parse(原文) as 确认阶段状态
    if (!载荷 || typeof 载荷.xia_xian !== 'number') return null
    return { xia_xian: 载荷.xia_xian, lian_xu_jiang_dang: Number(载荷.lian_xu_jiang_dang) || 0 }
  } catch (cuoWu) {
    debug日志.warn('好感度服务', '确认阶段读取失败，本轮按真实阶段', {
      xiang_qing: { yong_hu_id, jiao_se_id, cuo_wu: String(cuoWu) },
    })
    return null
  }
}

async function 写确认阶段(yong_hu_id: string, jiao_se_id: string, 状态: 确认阶段状态): Promise<void> {
  try {
    await redis.set(确认阶段键(yong_hu_id, jiao_se_id), JSON.stringify(状态), 'EX', 确认阶段有效期秒)
  } catch (cuoWu) {
    debug日志.warn('好感度服务', '确认阶段写入失败，下一轮降档缓冲重置', {
      xiang_qing: { yong_hu_id, jiao_se_id, cuo_wu: String(cuoWu) },
    })
  }
}

export async function 计算确认阶段(
  yong_hu_id: string,
  jiao_se_id: string,
  jiuZongFen: number,
  xinZongFen: number,
): Promise<string> {
  const 真实下界 = 取阶段下界(xinZongFen)
  const 记录 = await 读确认阶段(yong_hu_id, jiao_se_id)
  const 基准下界 = 记录 ? 记录.xia_xian : 取阶段下界(jiuZongFen)
  const 基准连续 = 记录 ? 记录.lian_xu_jiang_dang : 0

  if (真实下界 >= 基准下界) {
    await 写确认阶段(yong_hu_id, jiao_se_id, { xia_xian: 真实下界, lian_xu_jiang_dang: 0 })
    return huoQuJieDuanMing(xinZongFen)
  }

  const 新连续 = 基准连续 + 1
  if (新连续 >= HaoGanDuPeiZhi.jiangDangQueRenLunShu) {
    await 写确认阶段(yong_hu_id, jiao_se_id, { xia_xian: 真实下界, lian_xu_jiang_dang: 0 })
    return huoQuJieDuanMing(xinZongFen)
  }

  await 写确认阶段(yong_hu_id, jiao_se_id, { xia_xian: 基准下界, lian_xu_jiang_dang: 新连续 })
  debug日志.info('好感度服务', '降档缓冲生效，本轮仍显示原阶段', {
    xiang_qing: {
      yong_hu_id,
      jiao_se_id,
      真实阶段: huoQuJieDuanMing(xinZongFen),
      保持阶段下界: 基准下界,
      连续降档轮数: 新连续,
    },
  })
  return GuiFanGuanXiJieDuanMing(基准下界)
}

export async function huoQuWanZhengHaoGanDu(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<WanZhengHaoGanDuXinXi | null> {
  const jieGuo = await 数据库.query(
    `SELECT * FROM "好感度" WHERE "用户ID" = $1 AND "角色ID" = $2 LIMIT 1`,
    [yong_hu_id, jiao_se_id],
  )

  if (jieGuo.rows.length === 0) return null

  const shuJuHang = jieGuo.rows[0]
  return {
    yong_hu_id,
    jiao_se_id,
    xin_ren_du: Number(shuJuHang.信任度 || 0),
    qin_mi_du: Number(shuJuHang.亲密度 || 0),
    qu_wei_du: Number(shuJuHang.趣味度 || 0),
    guan_huai_du: Number(shuJuHang.关怀度 || 0),
    zong_fen: Number(shuJuHang.总分 || 0),
    guan_xi_jie_duan: GuiFanGuanXiJieDuanMing(shuJuHang.关系阶段 || Number(shuJuHang.总分 || 0)),
    互动次数: Number.isFinite(Number(shuJuHang.互动次数)) && Number(shuJuHang.互动次数) >= 0
      ? Math.floor(Number(shuJuHang.互动次数))
      : 0,
  }
}

export async function huoQuXianShiJieDuan(
  yong_hu_id: string,
  jiao_se_id: string,
  总分: number,
): Promise<string> {
  const 记录 = await 读确认阶段(yong_hu_id, jiao_se_id)
  if (!记录) return huoQuJieDuanMing(总分)
  const 真实下界 = 取阶段下界(总分)
  if (真实下界 >= 记录.xia_xian) return huoQuJieDuanMing(总分)
  return GuiFanGuanXiJieDuanMing(记录.xia_xian)
}

export async function huoQuGongKaiHaoGanDuXinXi(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<GongKaiHaoGanDuXinXi | null> {
  const haoGanDu = await huoQuWanZhengHaoGanDu(yong_hu_id, jiao_se_id)
  if (!haoGanDu) return null

  const xianShiJieDuan = await huoQuXianShiJieDuan(yong_hu_id, jiao_se_id, haoGanDu.zong_fen)
  const jieDuanXinXi = huoQuJieDuanXinXi(haoGanDu.zong_fen)
  return {
    jie_duan: xianShiJieDuan,
    xin_qing: jieDuanXinXi.xinQing,
  }
}

export async function gengXinHaoGanDu(
  yong_hu_id: string,
  jiao_se_id: string,
  bianHua: HaoGanDuSiWeiBianHua,
  xiShu?: number,
  muBiaoQuXian?: number,
  lianXuWeiDaBiao?: number,
): Promise<HaoGanDuGengXinJieGuo> {
  try {
    const { quanZhong } = HaoGanDuPeiZhi
    const zuiGaoFen = HaoGanDuPeiZhi.fanWei.zuiGaoFen
    const zuiDiFen = HaoGanDuPeiZhi.fanWei.zuiDiFen

    const jiuHaoGanDu = await huoQuWanZhengHaoGanDu(yong_hu_id, jiao_se_id)
    if (!jiuHaoGanDu) {
      return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai'), zhuang_tai_ma: 404 }
    }
    const jiuZongFen = jiuHaoGanDu.zong_fen
    const moShi = await huoQuDuiJuMoShi(jiao_se_id)

    const yuanShiBianHua =
      bianHua.xin_ren_du_bian_hua * quanZhong.xinRenDu +
      bianHua.qin_mi_du_bian_hua * quanZhong.qinMiDu +
      bianHua.qu_wei_du_bian_hua * quanZhong.quWeiDu +
      bianHua.guan_huai_du_bian_hua * quanZhong.guanHuaiDu

    const moShiBeiLv = quMoShiBeiLv(moShi)
    const shiJiZongBianHua = jiSuanShiJiZengLiang(jiuZongFen, yuanShiBianHua, moShiBeiLv)
    const biLi = Math.abs(yuanShiBianHua) < 1e-9 ? 0 : shiJiZongBianHua / yuanShiBianHua
    const siWeiBianHua = {
      xin_ren_du: Math.round(bianHua.xin_ren_du_bian_hua * biLi),
      qin_mi_du: Math.round(bianHua.qin_mi_du_bian_hua * biLi),
      qu_wei_du: Math.round(bianHua.qu_wei_du_bian_hua * biLi),
      guan_huai_du: Math.round(bianHua.guan_huai_du_bian_hua * biLi),
    }

    const 归一结果 = 归一四维(
      {
        xin_ren_du: jiuHaoGanDu.xin_ren_du + siWeiBianHua.xin_ren_du,
        qin_mi_du: jiuHaoGanDu.qin_mi_du + siWeiBianHua.qin_mi_du,
        qu_wei_du: jiuHaoGanDu.qu_wei_du + siWeiBianHua.qu_wei_du,
        guan_huai_du: jiuHaoGanDu.guan_huai_du + siWeiBianHua.guan_huai_du,
      },
      zuiDiFen,
      zuiGaoFen,
    )
    const xinZongFen = 归一结果.zong_fen
    const zhenShiJieDuanMing = huoQuJieDuanMing(xinZongFen)
    const shuaiJianHouZengLiang = xinZongFen - jiuZongFen

    const gengXinJieGuo = await 数据库.query(
      `UPDATE "好感度" SET
         "总分" = $1::integer,
         "信任度" = $2::integer,
         "亲密度" = $3::integer,
         "趣味度" = $4::integer,
         "关怀度" = $5::integer,
         "关系阶段" = $6,
         "互动次数" = "互动次数" + 1,
         "最后互动时间" = NOW()
       WHERE "用户ID" = $7 AND "角色ID" = $8
         AND "总分" = $9::integer
       RETURNING "总分", "信任度", "亲密度", "趣味度", "关怀度", "互动次数"`,
      [
        归一结果.zong_fen,
        归一结果.xin_ren_du,
        归一结果.qin_mi_du,
        归一结果.qu_wei_du,
        归一结果.guan_huai_du,
        zhenShiJieDuanMing,
        yong_hu_id,
        jiao_se_id,
        jiuZongFen,
      ],
    )

    if ((gengXinJieGuo.rowCount ?? 0) === 0) {
      debug日志.info('好感度服务', '好感度更新遇到并发写入，重试一次', {
        xiang_qing: { yong_hu_id, jiao_se_id },
      })
      return gengXinHaoGanDu(yong_hu_id, jiao_se_id, bianHua, xiShu, muBiaoQuXian, lianXuWeiDaBiao)
    }

    const hang = gengXinJieGuo.rows[0]
    const huiZongFen = Number(hang.总分)
    const zengLiangShiJian: HaoGanDuZengLiangShiJian = {
      shi_jian_id: randomUUID(),
      jiao_se_id,
      xin_ren_du_bian_hua: Number(hang.信任度) - jiuHaoGanDu.xin_ren_du,
      qin_mi_du_bian_hua: Number(hang.亲密度) - jiuHaoGanDu.qin_mi_du,
      qu_wei_du_bian_hua: Number(hang.趣味度) - jiuHaoGanDu.qu_wei_du,
      guan_huai_du_bian_hua: Number(hang.关怀度) - jiuHaoGanDu.guan_huai_du,
      zong_fen_bian_hua: huiZongFen - jiuZongFen,
    }
    const xinSiWei = {
      xin_ren_du: Number(hang.信任度),
      qin_mi_du: Number(hang.亲密度),
      qu_wei_du: Number(hang.趣味度),
      guan_huai_du: Number(hang.关怀度),
      zong_fen: huiZongFen,
    }

    jiLuHaoGanDuBianHua(yong_hu_id, jiao_se_id, { ...bianHua }, huiZongFen)

    const xianShiJieDuanMing = await 计算确认阶段(yong_hu_id, jiao_se_id, jiuZongFen, huiZongFen)

    const xiShuYingYong = xiShu ?? 1
    const muBiao = muBiaoQuXian ?? 0
    const lianXu = lianXuWeiDaBiao ?? 0
    await jiLuZengLiang(yong_hu_id, jiao_se_id, yuanShiBianHua, huiZongFen - jiuZongFen, xiShuYingYong, muBiao, lianXu)

    return {
      cheng_gong: true,
      hao_gan_du: {
        ...xinSiWei,
        guan_xi_jie_duan: xianShiJieDuanMing,
      },
      shuaiJianHouZengLiang: huiZongFen - jiuZongFen,
      zeng_liang_shi_jian: zengLiangShiJian,
    }
  } catch (cuoWu) {
    debug日志.error('好感度服务', '更新好感度失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'), zhuang_tai_ma: 500 }
  }
}

export async function sheZhiMiJiHaoGanDu(
  yong_hu_id: string,
  jiao_se_id: string,
  mi_ling: string,
): Promise<HaoGanDuGengXinJieGuo> {
  if (!miJiKouLingPiPei(mi_ling)) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'weiShouQuan'), zhuang_tai_ma: 401 }
  }

  const jiuHaoGanDu = await huoQuWanZhengHaoGanDu(yong_hu_id, jiao_se_id)
  if (!jiuHaoGanDu) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai'), zhuang_tai_ma: 404 }
  }

  const jiaoSeJieGuo = await 数据库.query(
    `SELECT "是否渣型", "对局模式" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [jiao_se_id],
  )
  const shiFouZhaXing = Boolean(jiaoSeJieGuo.rows[0]?.是否渣型)

  const miJiQianZongFen = jiuHaoGanDu.zong_fen
  await 数据库.query(
    `INSERT INTO "游戏档案" ("用户ID", "角色ID", "是否秘籍通关", "秘籍前好感度")
     VALUES ($1, $2, TRUE, $3)
     ON CONFLICT ("用户ID", "角色ID") DO UPDATE SET
       "是否秘籍通关" = TRUE,
       "秘籍前好感度" = EXCLUDED."秘籍前好感度"`,
    [yong_hu_id, jiao_se_id, miJiQianZongFen],
  )

  const muBiaoFen = HaoGanDuPeiZhi.miJi.muBiaoFen
  const xinSiWei = fenJieSiWei(muBiaoFen)
  const xinJieDuanMing = huoQuJieDuanMing(muBiaoFen)

  await 数据库.query(
    `WITH "标记来源" AS (
       SELECT set_config('app.hao_gan_du_lai_yuan', 'miji', true) AS "标记"
     )
     UPDATE "好感度" SET
      "信任度" = $1,
      "亲密度" = $2,
      "趣味度" = $3,
      "关怀度" = $4,
      "总分" = $5,
      "关系阶段" = $6,
      "互动次数" = "互动次数" + 1,
      "最后互动时间" = NOW()
     WHERE "用户ID" = $7 AND "角色ID" = $8
       AND (SELECT "标记" FROM "标记来源") IS NOT NULL`,
    [
      xinSiWei.xin_ren_du,
      xinSiWei.qin_mi_du,
      xinSiWei.qu_wei_du,
      xinSiWei.guan_huai_du,
      muBiaoFen,
      xinJieDuanMing,
      yong_hu_id,
      jiao_se_id,
    ],
  )

  jiLuHaoGanDuBianHua(yong_hu_id, jiao_se_id, {
    xin_ren_du_bian_hua: xinSiWei.xin_ren_du - jiuHaoGanDu.xin_ren_du,
    qin_mi_du_bian_hua: xinSiWei.qin_mi_du - jiuHaoGanDu.qin_mi_du,
    qu_wei_du_bian_hua: xinSiWei.qu_wei_du - jiuHaoGanDu.qu_wei_du,
    guan_huai_du_bian_hua: xinSiWei.guan_huai_du - jiuHaoGanDu.guan_huai_du,
  }, muBiaoFen)

  const miJiJieGuoLeiXing = 'sheng_li_ai_qing' as const
  await chuLiYouXiJieShu(yong_hu_id, jiao_se_id, miJiJieGuoLeiXing, {
    lei_xing: '秘籍通关',
    mi_ji: true,
    mi_ji_qian_hao_gan_du: miJiQianZongFen,
    shi_fou_zha_xing: shiFouZhaXing,
  })

  return {
    cheng_gong: true,
    hao_gan_du: {
      ...xinSiWei,
      guan_xi_jie_duan: xinJieDuanMing,
    },
  }
}

export async function chuShiHuaHaoGanDu(
  yong_hu_id: string,
  jiao_se_id: string,
  zong_fen: number,
): Promise<void> {
  const 目标分 = Number.isFinite(Number(zong_fen)) && Number(zong_fen) > 0
    ? Number(zong_fen)
    : await huoQuRenSheChuShiFen(jiao_se_id)
  const qieGeFen = qieGeFanWei(Math.round(目标分), HaoGanDuPeiZhi.fanWei.zuiDiFen, HaoGanDuPeiZhi.fanWei.zuiGaoFen)
  const siWei = fenJieSiWei(qieGeFen)
  const jieDuanMing = huoQuJieDuanMing(qieGeFen)

  await 数据库.query(
    `INSERT INTO "好感度" (
      "用户ID", "角色ID", "信任度", "亲密度", "趣味度", "关怀度", "总分", "关系阶段"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT ("用户ID", "角色ID") DO UPDATE SET
      "信任度" = EXCLUDED."信任度",
      "亲密度" = EXCLUDED."亲密度",
      "趣味度" = EXCLUDED."趣味度",
      "关怀度" = EXCLUDED."关怀度",
      "总分" = EXCLUDED."总分",
      "关系阶段" = EXCLUDED."关系阶段"`,
    [
      yong_hu_id,
      jiao_se_id,
      siWei.xin_ren_du,
      siWei.qin_mi_du,
      siWei.qu_wei_du,
      siWei.guan_huai_du,
      qieGeFen,
      jieDuanMing,
    ],
  )
}

async function huoQuRenSheChuShiFen(jiao_se_id: string): Promise<number> {
  try {
    const jieGuo = await 数据库.query(
      `SELECT "MBTI", "IE类型", "是否渣型" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
      [jiao_se_id],
    )
    const hang = jieGuo.rows[0]
    if (!hang) return HaoGanDuPeiZhi.fanWei.zuiDiFen
    return 生成人设初始分(String(hang.MBTI ?? ''), Boolean(hang.是否渣型), String(hang.IE类型 ?? ''))
  } catch (cuoWu) {
    debug日志.warn('好感度服务', '人设初始分回读失败，按最低分兜底', {
      xiang_qing: { jiao_se_id, cuo_wu: String(cuoWu) },
    })
    return HaoGanDuPeiZhi.fanWei.zuiDiFen
  }
}
