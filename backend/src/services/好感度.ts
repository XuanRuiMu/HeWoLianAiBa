import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { HAO_GAN_DU_PEI_ZHI, HaoGanDuJieDuanYingShe } from '../config/好感度配置'
import { chuLiYouXiJieShu } from './胜利失败条件'
import { debug日志, jiLuHaoGanDuBianHua } from '../utils/debug日志'
import type { HaoGanDuXinXi, GongKaiHaoGanDuXinXi, WanZhengHaoGanDuXinXi } from '../types'
import { jiLuZengLiang } from './好感度缓存'

export interface HaoGanDuSiWeiBianHua {
  xin_ren_du_bian_hua: number
  qin_mi_du_bian_hua: number
  qu_wei_du_bian_hua: number
  guan_huai_du_bian_hua: number
}

export interface HaoGanDuGengXinJieGuo {
  cheng_gong: boolean
  hao_gan_du?: HaoGanDuXinXi
  ti_shi?: string
  zhuang_tai_ma?: number
  shuaiJianHouZengLiang?: number
}

function qieGeFanWei(zhi: number, zuiDi: number, zuiGao: number): number {
  return Math.max(zuiDi, Math.min(zuiGao, zhi))
}

export function jiSuanZongFen(siWei: { xin_ren_du: number; qin_mi_du: number; qu_wei_du: number; guan_huai_du: number }): number {
  const { quanZhong } = HAO_GAN_DU_PEI_ZHI
  const fenShu =
    siWei.xin_ren_du * quanZhong.xinRenDu +
    siWei.qin_mi_du * quanZhong.qinMiDu +
    siWei.qu_wei_du * quanZhong.quWeiDu +
    siWei.guan_huai_du * quanZhong.guanHuaiDu

  return Math.round(qieGeFanWei(fenShu, HAO_GAN_DU_PEI_ZHI.fanWei.zuiDiFen, HAO_GAN_DU_PEI_ZHI.fanWei.zuiGaoFen))
}

export function jiSuanShuaiJianBianHua(dangQianFen: number, bianHua: number): number {
  const qieGeFen = qieGeFanWei(dangQianFen, HAO_GAN_DU_PEI_ZHI.fanWei.zuiDiFen, HAO_GAN_DU_PEI_ZHI.fanWei.zuiGaoFen)
  const shuaiJianXiShu = Math.max(
    1 - qieGeFen / HAO_GAN_DU_PEI_ZHI.fanWei.zuiGaoFen,
    HAO_GAN_DU_PEI_ZHI.shuaiJian.zuiDiBaoLiu,
  )
  return bianHua * shuaiJianXiShu
}

export function fenJieSiWei(zongFen: number): Omit<HaoGanDuXinXi, 'guan_xi_jie_duan'> {
  const qieGeFen = qieGeFanWei(zongFen, HAO_GAN_DU_PEI_ZHI.fanWei.zuiDiFen, HAO_GAN_DU_PEI_ZHI.fanWei.zuiGaoFen)
  const { quanZhong } = HAO_GAN_DU_PEI_ZHI

  return {
    xin_ren_du: Math.round(qieGeFen * quanZhong.xinRenDu),
    qin_mi_du: Math.round(qieGeFen * quanZhong.qinMiDu),
    qu_wei_du: Math.round(qieGeFen * quanZhong.quWeiDu),
    guan_huai_du: Math.round(qieGeFen * quanZhong.guanHuaiDu),
    zong_fen: qieGeFen,
  }
}

export function huoQuJieDuanXinXi(zongFen: number): HaoGanDuJieDuanYingShe {
  const qieGeFen = qieGeFanWei(zongFen, HAO_GAN_DU_PEI_ZHI.fanWei.zuiDiFen, HAO_GAN_DU_PEI_ZHI.fanWei.zuiGaoFen)

  const jieDuanLieBiao = Object.values(HAO_GAN_DU_PEI_ZHI.jieDuan)
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

export function huoQuLiuCengJiMingCheng(zongFen: number): string {
  const qieGeFen = qieGeFanWei(zongFen, HAO_GAN_DU_PEI_ZHI.fanWei.zuiDiFen, HAO_GAN_DU_PEI_ZHI.fanWei.zuiGaoFen)

  const cengJiLieBiao = Object.values(HAO_GAN_DU_PEI_ZHI.liuCengJi)
  for (const cengJi of cengJiLieBiao) {
    if (qieGeFen >= cengJi.xiaXian && qieGeFen <= cengJi.shangXian) {
      return cengJi.mingCheng
    }
  }

  return cengJiLieBiao[0].mingCheng
}

export function jiSuanSiWeiBianHuaHouDeZongFen(
  dangQianFen: number,
  bianHua: HaoGanDuSiWeiBianHua,
): number {
  const { quanZhong } = HAO_GAN_DU_PEI_ZHI
  const yuanShiBianHua =
    bianHua.xin_ren_du_bian_hua * quanZhong.xinRenDu +
    bianHua.qin_mi_du_bian_hua * quanZhong.qinMiDu +
    bianHua.qu_wei_du_bian_hua * quanZhong.quWeiDu +
    bianHua.guan_huai_du_bian_hua * quanZhong.guanHuaiDu

  const shiJiBianHua = jiSuanShuaiJianBianHua(dangQianFen, yuanShiBianHua)
  return qieGeFanWei(Math.round(dangQianFen + shiJiBianHua), HAO_GAN_DU_PEI_ZHI.fanWei.zuiDiFen, HAO_GAN_DU_PEI_ZHI.fanWei.zuiGaoFen)
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

  const row = jieGuo.rows[0]
  return {
    yong_hu_id,
    jiao_se_id,
    xin_ren_du: Number(row.信任度 || 0),
    qin_mi_du: Number(row.亲密度 || 0),
    qu_wei_du: Number(row.趣味度 || 0),
    guan_huai_du: Number(row.关怀度 || 0),
    zong_fen: Number(row.总分 || 0),
    guan_xi_jie_duan: String(row.关系阶段 || huoQuJieDuanMing(Number(row.总分 || 0))),
  }
}

export async function huoQuGongKaiHaoGanDuXinXi(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<GongKaiHaoGanDuXinXi | null> {
  const haoGanDu = await huoQuWanZhengHaoGanDu(yong_hu_id, jiao_se_id)
  if (!haoGanDu) return null

  const jieDuanXinXi = huoQuJieDuanXinXi(haoGanDu.zong_fen)
  return {
    jie_duan: jieDuanXinXi.jieDuanMing,
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
    const { quanZhong } = HAO_GAN_DU_PEI_ZHI
    const yuanShiBianHua =
      bianHua.xin_ren_du_bian_hua * quanZhong.xinRenDu +
      bianHua.qin_mi_du_bian_hua * quanZhong.qinMiDu +
      bianHua.qu_wei_du_bian_hua * quanZhong.quWeiDu +
      bianHua.guan_huai_du_bian_hua * quanZhong.guanHuaiDu

    // 先读取旧总分，用于计算衰减后增量
    const jiuHaoGanDu = await huoQuWanZhengHaoGanDu(yong_hu_id, jiao_se_id)
    if (!jiuHaoGanDu) {
      return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai'), zhuang_tai_ma: 404 }
    }
    const jiuZongFen = jiuHaoGanDu.zong_fen

    // R2 单语句原子更新：加权、衰减、截断全部在 SQL 内基于当前行值完成，
    // 并发更新不再发生"读-改-写"丢失覆盖
    const gengXinJieGuo = await 数据库.query(
      `UPDATE "好感度" SET
         "总分" = GREATEST($1, LEAST($2, ROUND(
           "总分" + ($3::numeric) * GREATEST(1 - "总分"::numeric / $2::numeric, $4::numeric)
         ))),
         "互动次数" = "互动次数" + 1,
         "最后互动时间" = NOW()
       WHERE "用户ID" = $5 AND "角色ID" = $6
       RETURNING "总分"`,
      [
        HAO_GAN_DU_PEI_ZHI.fanWei.zuiDiFen,
        HAO_GAN_DU_PEI_ZHI.fanWei.zuiGaoFen,
        yuanShiBianHua,
        HAO_GAN_DU_PEI_ZHI.shuaiJian.zuiDiBaoLiu,
        yong_hu_id,
        jiao_se_id,
      ],
    )

    if ((gengXinJieGuo.rowCount ?? 0) === 0) {
      return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai'), zhuang_tai_ma: 404 }
    }

    const xinZongFen = Number(gengXinJieGuo.rows[0].总分)
    const shuaiJianHouZengLiang = xinZongFen - jiuZongFen
    const xinSiWei = fenJieSiWei(xinZongFen)
    const xinJieDuanMing = huoQuJieDuanMing(xinZongFen)

    // 四维与关系阶段是总分的派生展示数据，基于原子更新后的返回值回写
    await 数据库.query(
      `UPDATE "好感度" SET
        "信任度" = $1,
        "亲密度" = $2,
        "趣味度" = $3,
        "关怀度" = $4,
        "关系阶段" = $5
       WHERE "用户ID" = $6 AND "角色ID" = $7`,
      [
        xinSiWei.xin_ren_du,
        xinSiWei.qin_mi_du,
        xinSiWei.qu_wei_du,
        xinSiWei.guan_huai_du,
        xinJieDuanMing,
        yong_hu_id,
        jiao_se_id,
      ],
    )

    jiLuHaoGanDuBianHua(yong_hu_id, jiao_se_id, { ...bianHua }, xinZongFen)

    // 记录增量到 Redis + PG 统计表（用于隐形保底曲线判定）
    const xiShuYingYong = xiShu ?? 1
    const muBiao = muBiaoQuXian ?? 0
    const lianXu = lianXuWeiDaBiao ?? 0
    await jiLuZengLiang(yong_hu_id, jiao_se_id, yuanShiBianHua, shuaiJianHouZengLiang, xiShuYingYong, muBiao, lianXu)

    return {
      cheng_gong: true,
      hao_gan_du: {
        ...xinSiWei,
        guan_xi_jie_duan: xinJieDuanMing,
      },
      shuaiJianHouZengLiang,
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
  if (mi_ling !== HAO_GAN_DU_PEI_ZHI.miJi.miLing) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'weiShouQuan'), zhuang_tai_ma: 401 }
  }

  const jiuHaoGanDu = await huoQuWanZhengHaoGanDu(yong_hu_id, jiao_se_id)
  if (!jiuHaoGanDu) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai'), zhuang_tai_ma: 404 }
  }

  // 查询角色是否为渣型，决定秘籍通关对应的胜利分支；同时校验对局模式
  const jiaoSeJieGuo = await 数据库.query(
    `SELECT "是否渣型", "对局模式" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [jiao_se_id],
  )
  const shiFouZhaXing = Boolean(jiaoSeJieGuo.rows[0]?.是否渣型)

  // 排位赛同样允许秘籍（用户口径优先）：挑战与普通对局一致生效
  void String(jiaoSeJieGuo.rows[0]?.对局模式 || 'putong')

  // 快照秘籍使用前的真实好感度总分，并标记本局为秘籍通关
  const miJiQianZongFen = jiuHaoGanDu.zong_fen
  await 数据库.query(
    `INSERT INTO "游戏档案" ("用户ID", "角色ID", "是否秘籍通关", "秘籍前好感度")
     VALUES ($1, $2, TRUE, $3)
     ON CONFLICT ("用户ID", "角色ID") DO UPDATE SET
       "是否秘籍通关" = TRUE,
       "秘籍前好感度" = EXCLUDED."秘籍前好感度"`,
    [yong_hu_id, jiao_se_id, miJiQianZongFen],
  )

  const muBiaoFen = HAO_GAN_DU_PEI_ZHI.miJi.muBiaoFen
  const xinSiWei = fenJieSiWei(muBiaoFen)
  const xinJieDuanMing = huoQuJieDuanMing(muBiaoFen)

  await 数据库.query(
    `UPDATE "好感度" SET
      "信任度" = $1,
      "亲密度" = $2,
      "趣味度" = $3,
      "关怀度" = $4,
      "总分" = $5,
      "关系阶段" = $6,
      "互动次数" = "互动次数" + 1,
      "最后互动时间" = NOW()
     WHERE "用户ID" = $7 AND "角色ID" = $8`,
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

const jiuJieDuanMing = huoQuJieDuanMing(jiuHaoGanDu.zong_fen)
    if (jiuJieDuanMing !== xinJieDuanMing) {
    }

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
  const qieGeFen = qieGeFanWei(zong_fen, HAO_GAN_DU_PEI_ZHI.fanWei.zuiDiFen, HAO_GAN_DU_PEI_ZHI.fanWei.zuiGaoFen)
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
