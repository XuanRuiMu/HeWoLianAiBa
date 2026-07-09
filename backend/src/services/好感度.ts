import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { HAO_GAN_DU_PEI_ZHI, HaoGanDuJieDuanYingShe } from '../config/好感度配置'
import { xieRuJiYi } from './记忆'
import { jiLuHaoGanDuBianHua } from '../utils/debug日志'
import type { HaoGanDuXinXi, GongKaiHaoGanDuXinXi, WanZhengHaoGanDuXinXi } from '../types'

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
  const shuaiJianXiShu = Math.max(1 - qieGeFen / HAO_GAN_DU_PEI_ZHI.fanWei.zuiGaoFen, HAO_GAN_DU_PEI_ZHI.shuaiJian.zuiDiBaoLiu)
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

async function xieRuJieDuanBianGengJiYi(
  yong_hu_id: string,
  jiao_se_id: string,
  jiuJieDuan: string,
  xinJieDuan: string,
  zongFen: number,
): Promise<void> {
  const shiShengJi =
    Object.keys(HAO_GAN_DU_PEI_ZHI.jieDuan).indexOf(
      Object.entries(HAO_GAN_DU_PEI_ZHI.jieDuan).find(([, v]) => v.jieDuanMing === xinJieDuan)?.[0] || '',
    ) >=
    Object.keys(HAO_GAN_DU_PEI_ZHI.jieDuan).indexOf(
      Object.entries(HAO_GAN_DU_PEI_ZHI.jieDuan).find(([, v]) => v.jieDuanMing === jiuJieDuan)?.[0] || '',
    )

  await xieRuJiYi({
    yong_hu_id,
    jiao_se_id,
    zhai_yao: `关系阶段从「${jiuJieDuan}」变为「${xinJieDuan}」，当前好感度总分 ${zongFen}`,
    zhong_yao_du: shiShengJi
      ? HAO_GAN_DU_PEI_ZHI.jiYi.shengJiZhongYaoDu
      : HAO_GAN_DU_PEI_ZHI.jiYi.jiangJiZhongYaoDu,
    guan_jian_ci: ['好感度阶段变化', jiuJieDuan, xinJieDuan],
    shi_jian_lei_xing: '好感度阶段变化',
  })
}

export async function gengXinHaoGanDu(
  yong_hu_id: string,
  jiao_se_id: string,
  bianHua: HaoGanDuSiWeiBianHua,
): Promise<HaoGanDuGengXinJieGuo> {
  try {
    const jiuHaoGanDu = await huoQuWanZhengHaoGanDu(yong_hu_id, jiao_se_id)
    if (!jiuHaoGanDu) {
      return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai'), zhuang_tai_ma: 404 }
    }

    const xinZongFen = jiSuanSiWeiBianHuaHouDeZongFen(jiuHaoGanDu.zong_fen, bianHua)
    const xinSiWei = fenJieSiWei(xinZongFen)
    const xinJieDuanMing = huoQuJieDuanMing(xinZongFen)

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
        xinZongFen,
        xinJieDuanMing,
        yong_hu_id,
        jiao_se_id,
      ],
    )

    const jiuJieDuanMing = huoQuJieDuanMing(jiuHaoGanDu.zong_fen)
    if (jiuJieDuanMing !== xinJieDuanMing) {
      await xieRuJieDuanBianGengJiYi(yong_hu_id, jiao_se_id, jiuJieDuanMing, xinJieDuanMing, xinZongFen)
    }

    jiLuHaoGanDuBianHua(yong_hu_id, jiao_se_id, { ...bianHua }, xinZongFen)

    return {
      cheng_gong: true,
      hao_gan_du: {
        ...xinSiWei,
        guan_xi_jie_duan: xinJieDuanMing,
      },
    }
  } catch (cuoWu) {
    console.error('更新好感度失败', cuoWu)
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
    await xieRuJieDuanBianGengJiYi(yong_hu_id, jiao_se_id, jiuJieDuanMing, xinJieDuanMing, muBiaoFen)
  }

  jiLuHaoGanDuBianHua(yong_hu_id, jiao_se_id, {
    xin_ren_du_bian_hua: xinSiWei.xin_ren_du - jiuHaoGanDu.xin_ren_du,
    qin_mi_du_bian_hua: xinSiWei.qin_mi_du - jiuHaoGanDu.qin_mi_du,
    qu_wei_du_bian_hua: xinSiWei.qu_wei_du - jiuHaoGanDu.qu_wei_du,
    guan_huai_du_bian_hua: xinSiWei.guan_huai_du - jiuHaoGanDu.guan_huai_du,
  }, muBiaoFen)

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
