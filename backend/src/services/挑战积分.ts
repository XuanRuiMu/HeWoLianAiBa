import { debug日志 } from '../utils/debug日志'
import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import {
  TIAO_ZHAN_PEI_ZHI,
  huoQuZuBie,
  huoQuDuanWeiMing,
  type ZuBie,
} from '../config/挑战配置'
import { shengChengJiaoSe, baoCunJiaoSe, type ShengChengJiaoSeJieGuo } from './角色生成'

export interface TiaoZhanDuiJuXinXi {
  id: string
  jiao_se_id: string
  wan_jia_xing_bie: '男' | '女'
  dui_xiang_xing_bie: '男' | '女'
  wei_xin_ming: string
  tou_xiang: string
  chuang_jian_shi_jian: string
}

export interface PaiHangXiangMu {
  pai_ming: number
  yong_hu_ming: string
  ji_fen: number
  duan_wei: string
  sheng_chang: number
  fu_chang: number
  qi_quan_chang: number
  zui_gao_lian_sheng: number
}

export interface ZuBieGaiKuang {
  zu_bie: ZuBie
  ji_fen: number | null
  duan_wei: string | null
  sheng_chang: number
  fu_chang: number
  qi_quan_chang: number
  lian_sheng: number
  pai_ming: number | null
}

function zuBieHeFa(zhi: unknown): zhi is ZuBie {
  return (
    zhi === 'nan_nv' || zhi === 'nv_nan' || zhi === 'nan_nan' || zhi === 'nv_nv'
  )
}

/**
 * 开始一局挑战：随机全部隐藏参数（MBTI 随机、渣型按配置概率随机），
 * 服务端直接保存角色（含开场白），并登记进行中对局。
 * 同一用户同时仅允许一局进行中（部分唯一索引 uk_挑战对局_用户_进行中 兜底）。
 */
export async function kaiShiTiaoZhan(
  yong_hu_id: string,
  wan_jia_xing_bie: '男' | '女',
  dui_xiang_xing_bie: '男' | '女',
): Promise<ShengChengJiaoSeJieGuo> {
  const jinXingZhong = await 数据库.query(
    `SELECT "ID" FROM "挑战对局" WHERE "用户ID" = $1 AND "状态" = '进行中' LIMIT 1`,
    [yong_hu_id],
  )
  if ((jinXingZhong.rowCount ?? 0) > 0) {
    const cuoWu = new Error(huoQuFanYi('tiaoZhan', 'yiYouJinXingZhongDuiJu')) as Error & {
      zhuang_tai_ma?: number
    }
    cuoWu.zhuang_tai_ma = 409
    throw cuoWu
  }

  // 挑战模式：MBTI 全随机、渣型按配置概率隐藏随机，其余系统随机
  const jiaoSe = shengChengJiaoSe({
    yong_hu_id,
    xing_bie: dui_xiang_xing_bie === '男' ? 'nan' : 'nv',
    mu_biao_xing_bie: dui_xiang_xing_bie === '男' ? 'nan' : 'nv',
    mbti_lei_xing: null,
    shi_fou_zha_xing: Math.random() < TIAO_ZHAN_PEI_ZHI.zhaXingGaiLv,
    sui_ji_xing_ge: false,
  })

  await baoCunJiaoSe(yong_hu_id, jiaoSe, 'tiaozhan')

  await 数据库.query(
    `INSERT INTO "挑战对局" ("用户ID", "角色ID", "玩家性别", "对象性别")
     VALUES ($1, $2, $3, $4)`,
    [yong_hu_id, jiaoSe.id, wan_jia_xing_bie, dui_xiang_xing_bie],
  )

  return jiaoSe
}

/** 用户当前进行中的挑战对局（无则 null） */
export async function huoQuDangQianDuiJu(
  yong_hu_id: string,
): Promise<TiaoZhanDuiJuXinXi | null> {
  const jieGuo = await 数据库.query(
    `SELECT d."ID", d."角色ID", d."玩家性别", d."对象性别", d."创建时间",
            r."微信昵称", r."头像"
       FROM "挑战对局" d
       LEFT JOIN "角色" r ON r."ID" = d."角色ID"
      WHERE d."用户ID" = $1 AND d."状态" = '进行中'
      ORDER BY d."创建时间" DESC
      LIMIT 1`,
    [yong_hu_id],
  )
  if (jieGuo.rows.length === 0) return null
  const row = jieGuo.rows[0]
  return {
    id: String(row.ID),
    jiao_se_id: String(row.角色ID),
    wan_jia_xing_bie: row.玩家性别 === '女' ? '女' : '男',
    dui_xiang_xing_bie: row.对象性别 === '女' ? '女' : '男',
    wei_xin_ming: String(row.微信昵称 || ''),
    tou_xiang: String(row.头像 || ''),
    chuang_jian_shi_jian: String(row.创建时间 || ''),
  }
}

/**
 * 游戏结束后的挑战结算钩子：
 * 仅当该角色属于挑战模式且存在进行中对局时生效（幂等）。
 * 胜利加分、失败扣分、主动放弃按弃权扣分；含连胜加成与定级保护。
 */
export async function jieSuanTiaoZhanDuiJu(
  yong_hu_id: string,
  jiao_se_id: string,
  jie_guo_lei_xing: string,
): Promise<void> {
  try {
    const duiJu = await 数据库.query(
      `UPDATE "挑战对局"
          SET "状态" = '已结束',
              "结果类型" = $2,
              "结束时间" = NOW()
        WHERE "角色ID" = $1 AND "状态" = '进行中'
        RETURNING "ID", "玩家性别", "对象性别"`,
      [jiao_se_id, jie_guo_lei_xing],
    )
    if ((duiJu.rowCount ?? 0) === 0) return

    const row = duiJu.rows[0]
    const zuBie = huoQuZuBie(
      row.玩家性别 === '女' ? '女' : '男',
      row.对象性别 === '女' ? '女' : '男',
    )

    const shiFangQi = jie_guo_lei_xing === 'shi_bai_fang_qi_tiao_zhan'
    const shiShengLi = jie_guo_lei_xing.startsWith('sheng_li_')
    let bianDong: number

    if (shiFangQi) {
      bianDong = -TIAO_ZHAN_PEI_ZHI.fangQiKouFen
      await yingYongJiFenBianDong(yong_hu_id, zuBie, bianDong, 'qi_quan')
    } else if (shiShengLi) {
      const lianShengXinXi = await 数据库.query(
        `SELECT "连胜" FROM "挑战积分" WHERE "用户ID" = $1 AND "组别" = $2 LIMIT 1`,
        [yong_hu_id, zuBie],
      )
      let jiaCheng = 0
      if (lianShengXinXi.rows.length > 0) {
        const dangQianLianSheng = Number(lianShengXinXi.rows[0].连胜 || 0)
        // 本局胜利后连胜数 = 原连胜 + 1；达到触发阈值起每场额外加成
        const xinLianSheng = dangQianLianSheng + 1
        if (xinLianSheng >= TIAO_ZHAN_PEI_ZHI.chuFaLianSheng) {
          jiaCheng =
            Math.min(
              xinLianSheng - TIAO_ZHAN_PEI_ZHI.chuFaLianSheng + 1,
              Math.floor(
                (TIAO_ZHAN_PEI_ZHI.jiaFenShangXian - TIAO_ZHAN_PEI_ZHI.shengLiJiaFen) /
                  TIAO_ZHAN_PEI_ZHI.lianShengJiaFen,
              ),
            ) * TIAO_ZHAN_PEI_ZHI.lianShengJiaFen
        }
      }
      bianDong = Math.min(
        TIAO_ZHAN_PEI_ZHI.shengLiJiaFen + jiaCheng,
        TIAO_ZHAN_PEI_ZHI.jiaFenShangXian,
      )
      await yingYongJiFenBianDong(yong_hu_id, zuBie, bianDong, 'sheng_li')
    } else {
      // 定级保护：前 N 圀失败不扣分
      const changCiXinXi = await 数据库.query(
        `SELECT "胜场", "负场", "弃权场" FROM "挑战积分" WHERE "用户ID" = $1 AND "组别" = $2 LIMIT 1`,
        [yong_hu_id, zuBie],
      )
      const zongChangCi =
        changCiXinXi.rows.length > 0
          ? Number(changCiXinXi.rows[0].胜场 || 0) +
            Number(changCiXinXi.rows[0].负场 || 0) +
            Number(changCiXinXi.rows[0].弃权场 || 0)
          : 0
      if (zongChangCi < TIAO_ZHAN_PEI_ZHI.dingJiBaoHuJuShu) {
        bianDong = 0
        await yingYongJiFenBianDong(yong_hu_id, zuBie, 0, 'shi_bai')
      } else {
        bianDong = -TIAO_ZHAN_PEI_ZHI.shiBaiKouFen
        await yingYongJiFenBianDong(yong_hu_id, zuBie, bianDong, 'shi_bai')
      }
    }

    await 数据库.query(
      `UPDATE "挑战对局" SET "积分变动" = $2 WHERE "角色ID" = $1 AND "状态" = '已结束' AND "积分变动" IS NULL`,
      [jiao_se_id, bianDong],
    )
  } catch (cuoWu) {
    debug日志.error('挑战积分', '挑战结算失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
  }
}

type JieGuoLeiXingJiFen = 'sheng_li' | 'shi_bai' | 'qi_quan'

/** 应用积分变动：无记录则创建初始行再变更；同步胜/负/弃计数、连胜与历史最高分 */
async function yingYongJiFenBianDong(
  yong_hu_id: string,
  zuBie: ZuBie,
  bianDong: number,
  jieGuoLeiXing: JieGuoLeiXingJiFen,
): Promise<void> {
  await 数据库.query(
    `INSERT INTO "挑战积分" ("用户ID", "组别") VALUES ($1, $2)
     ON CONFLICT ("用户ID", "组别") DO NOTHING`,
    [yong_hu_id, zuBie],
  )

  const shengChangBianDong = jieGuoLeiXing === 'sheng_li' ? 1 : 0
  const fuChangBianDong = jieGuoLeiXing === 'shi_bai' ? 1 : 0
  const qiQuanBianDong = jieGuoLeiXing === 'qi_quan' ? 1 : 0

  await 数据库.query(
    `UPDATE "挑战积分"
        SET "积分" = GREATEST(0, "积分" + $3),
            "胜场" = "胜场" + $4,
            "负场" = "负场" + $5,
            "弃权场" = "弃权场" + $6,
            "连胜" = CASE WHEN $7 THEN "连胜" + 1 ELSE 0 END,
            "最高连胜" = GREATEST("最高连胜", CASE WHEN $7 THEN "连胜" + 1 ELSE "连胜" END),
            "历史最高分" = GREATEST("历史最高分", GREATEST(0, "积分" + $3)),
            "更新时间" = NOW()
      WHERE "用户ID" = $1 AND "组别" = $2`,
    [
      yong_hu_id,
      zuBie,
      bianDong,
      shengChangBianDong,
      fuChangBianDong,
      qiQuanBianDong,
      jieGuoLeiXing === 'sheng_li',
    ],
  )
}

/** 公开排行榜：按组别返回前 N 名（积分降序，同分按更新时间升序） */
export async function huoQuPaiHangBang(zuBie: string): Promise<PaiHangXiangMu[]> {
  if (!zuBieHeFa(zuBie)) {
    const cuoWu = new Error(huoQuFanYi('tiaoZhan', 'zuBieBuHeFa')) as Error & {
      zhuang_tai_ma?: number
    }
    cuoWu.zhuang_tai_ma = 400
    throw cuoWu
  }

  const jieGuo = await 数据库.query(
    `SELECT j."积分", j."胜场", j."负场", j."弃权场", j."最高连胜", j."历史最高分",
            u."用户名", u."昵称"
       FROM "挑战积分" j
       INNER JOIN "用户" u ON u."ID" = j."用户ID"
      WHERE j."组别" = $1
      ORDER BY j."积分" DESC, j."更新时间" ASC
      LIMIT $2`,
    [zuBie, TIAO_ZHAN_PEI_ZHI.paiHangTiaoShu],
  )

  return jieGuo.rows.map((row, suoYin) => ({
    pai_ming: suoYin + 1,
    yong_hu_ming: String(row.昵称 || row.用户名 || ''),
    ji_fen: Number(row.积分 || 0),
    duan_wei: huoQuDuanWeiMing(Number(row.历史最高分 || 0)),
    sheng_chang: Number(row.胜场 || 0),
    fu_chang: Number(row.负场 || 0),
    qi_quan_chang: Number(row.弃权场 || 0),
    zui_gao_lian_sheng: Number(row.最高连胜 || 0),
  }))
}

/** 挑战主页：四组别各自的个人概况（未打过为 null 分） */
export async function huoQuWoDeGaiKuang(yong_hu_id: string): Promise<ZuBieGaiKuang[]> {
  const jieGuo = await 数据库.query(
    `SELECT "组别", "积分", "胜场", "负场", "弃权场", "连胜", "历史最高分"
       FROM "挑战积分" WHERE "用户ID" = $1`,
    [yong_hu_id],
  )
  const anZuBie = new Map<string, Record<string, unknown>>()
  for (const row of jieGuo.rows) {
    anZuBie.set(String(row.组别), row)
  }

  const zuBieQuanBu: ZuBie[] = ['nan_nv', 'nv_nan', 'nan_nan', 'nv_nv']
  const gaiKuang: ZuBieGaiKuang[] = []
  for (const zuBie of zuBieQuanBu) {
    const row = anZuBie.get(zuBie)
    if (!row) {
      gaiKuang.push({
        zu_bie: zuBie,
        ji_fen: null,
        duan_wei: null,
        sheng_chang: 0,
        fu_chang: 0,
        qi_quan_chang: 0,
        lian_sheng: 0,
        pai_ming: null,
      })
      continue
    }
    const paiMing = await 数据库.query(
      `SELECT COUNT(*) + 1 AS ming_ci FROM "挑战积分"
        WHERE "组别" = $1 AND ("积分" > $2 OR ("积分" = $2 AND "更新时间" < $3))`,
      [zuBie, Number(row.积分 || 0), row.更新时间],
    )
    gaiKuang.push({
      zu_bie: zuBie,
      ji_fen: Number(row.积分 || 0),
      duan_wei: huoQuDuanWeiMing(Number(row.历史最高分 || 0)),
      sheng_chang: Number(row.胜场 || 0),
      fu_chang: Number(row.负场 || 0),
      qi_quan_chang: Number(row.弃权场 || 0),
      lian_sheng: Number(row.连胜 || 0),
      pai_ming: Number(paiMing.rows[0]?.ming_ci || 1),
    })
  }
  return gaiKuang
}
