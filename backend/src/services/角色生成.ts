import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { huoQuNiChengKu } from '../utils/昵称解析'
import {
  type MBTILeiXing,
  mbtiLieBiao,
  mbtiZhongWenMing,
  nanXingMingZiKu,
  nvXingMingZiKu,
  shenFenPeiZhi,
  nianJiPeiZhi,
  chengShiKu,
  gongZuoZhuangTaiKu,
  xianShangAiHaoKu,
  pengYouQuanXiGuanKu,
  sheJiaoQuanKu,
  weiXinXiGuanKu,
  zuoXiGuiLvKu,
  waiMaoYuanXing,
  zhiYeZhuanYe,
  aiHao,
  jiaXiang,
  xiHuanDeLeiXing,
  jiaTingBeiJing,
  qingGanJingLi,
  xingGeMiaoShu,
  yanYuFengGe,
  xingWeiTeDian,
  xiTongTiShi,
  touXiangEmoji,
  zhaXingBianTi,
  haoGanDuJiChuFanWei,
} from '../config/角色配置'
import { baoCunJiaoSeXiaoXi } from './AI输入准备'
import { shengChengKaiChangBai } from './开场白生成'

export interface ShengChengJiaoSeCanShu {
  yong_hu_id: string
  xing_bie: 'nan' | 'nv'
  mu_biao_xing_bie?: 'nan' | 'nv' | null
  mbti_lei_xing?: MBTILeiXing | null
  shi_fou_zha_xing?: boolean
  sui_ji_xing_ge?: boolean
}

export interface ShengChengJiaoSeJieGuo {
  id: string
  ming_zi: string
  xing_bie: 'nan' | 'nv'
  nian_ling: number
  shen_fen: string
  wai_mao: string
  xing_ge: string
  bei_jing_gu_shi: string
  xi_hao: string[]
  yan_yu_feng_ge: string
  xing_wei_te_dian: string
  tou_xiang: string
  biao_qian: string[]
  xi_huan_de_lei_xing: string
  jia_ting_bei_jing: string
  qing_gan_jing_li: string
  shi_fou_zha_xing: boolean
  zha_fa_miao_shu?: string
  hua_shu?: string[]
  bao_lu_fang_shi?: string
  shi_po_xian_suo?: string[]
  yu_she_lei_xing: MBTILeiXing
  mbti_lei_xing: MBTILeiXing
  ie_lei_xing: 'I' | 'E'
  re_shen_lei_xing: '慢热' | '快热'
  wei_xin_ming: string
  zhen_shi_ming: string
  shi_jie_xin_xi: Record<string, unknown>
  xi_tong_ti_shi: string
  ba_da_mo_kuai: {
    ji_ben_xin_xi: string
    wai_mao: string
    xing_ge: string
    bei_jing: string
    yan_yu: string
    xing_wei: string
    guan_xi: string
    xi_tong_ti_shi: string
  }
  hao_gan_du_zong_fen: number
}

function suiJiShu(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function suiJiXuanZe<T>(shuZu: T[]): T {
  return shuZu[Math.floor(Math.random() * shuZu.length)]
}

function anGaiLvXuanZeShenFen(): { leiXing: string; nianLingFanWei: [number, number] } {
  const suiJi = Math.random()
  let leiJi = 0
  for (const peiZhi of shenFenPeiZhi) {
    leiJi += peiZhi.gaiLv
    if (suiJi <= leiJi) {
      return { leiXing: peiZhi.leiXing, nianLingFanWei: peiZhi.nianLingFanWei }
    }
  }
  return { leiXing: shenFenPeiZhi[0].leiXing, nianLingFanWei: shenFenPeiZhi[0].nianLingFanWei }
}

function huoQuMbti(mbtiLeiXing?: MBTILeiXing | null): MBTILeiXing {
  if (mbtiLeiXing && mbtiLieBiao.includes(mbtiLeiXing)) {
    return mbtiLeiXing
  }
  return suiJiXuanZe(mbtiLieBiao)
}

function huoQuXingBie(
  xingBie?: 'nan' | 'nv' | null,
  muBiaoXingBie?: 'nan' | 'nv' | null,
): 'nan' | 'nv' {
  if (muBiaoXingBie === 'nan' || muBiaoXingBie === 'nv') return muBiaoXingBie
  if (xingBie === 'nan' || xingBie === 'nv') return xingBie
  return suiJiXuanZe(['nan', 'nv'])
}

function huoQuMingZi(xingBie: 'nan' | 'nv'): string {
  const ku = xingBie === 'nan' ? nanXingMingZiKu : nvXingMingZiKu
  return suiJiXuanZe(ku)
}

function huoQuWeiXinMing(xingBie: 'nan' | 'nv'): string {
  const niChengKu = huoQuNiChengKu()
  const ku = xingBie === 'nan' ? niChengKu.nan : niChengKu.nv
  if (ku.length === 0) return xingBie === 'nan' ? '未知男生' : '未知女生'
  return suiJiXuanZe(ku)
}

function anQuanZhongXuanZeWaiMao(mbti: MBTILeiXing): string {
  if (Math.random() < 0.7) {
    return suiJiXuanZe(waiMaoYuanXing[mbti])
  }
  const suoYou = Object.values(waiMaoYuanXing).flat()
  return suiJiXuanZe(suoYou)
}

function anQuanZhongXuanZeZhiYe(mbti: MBTILeiXing): string {
  if (Math.random() < 0.7) {
    return suiJiXuanZe(zhiYeZhuanYe[mbti])
  }
  return suiJiXuanZe(Object.values(zhiYeZhuanYe).flat())
}

function anQuanZhongXuanZeAiHao(mbti: MBTILeiXing): string[] {
  const mbtiAiHao = [...aiHao[mbti]]
  const qiTaAiHao = Object.values(aiHao)
    .flat()
    .filter((x) => !mbtiAiHao.includes(x))
  const jieGuo: string[] = []

  while (jieGuo.length < 3) {
    const gaiLv = Math.random()
    const houXuan =
      (gaiLv < 0.6 && mbtiAiHao.length > 0) || qiTaAiHao.length === 0
        ? mbtiAiHao
        : qiTaAiHao
    const xuanZhong = suiJiXuanZe(houXuan)
    if (!jieGuo.includes(xuanZhong)) {
      jieGuo.push(xuanZhong)
    }
    const suoYin = houXuan.indexOf(xuanZhong)
    if (suoYin > -1) houXuan.splice(suoYin, 1)
  }

  return jieGuo
}

function anQuanZhongXuanZeJiaXiang(mbti: MBTILeiXing): string {
  if (Math.random() < 0.6) {
    return suiJiXuanZe(jiaXiang[mbti])
  }
  return suiJiXuanZe(Object.values(jiaXiang).flat())
}

function huoQuReShenLeiXing(mbti: MBTILeiXing): '慢热' | '快热' {
  const moZiMu = mbti.charAt(3)
  if (moZiMu === 'J' || moZiMu === 'T') {
    return huoQuFanYi('jiaoSe', 'manRe') as '慢热' | '快热'
  }
  return huoQuFanYi('jiaoSe', 'kuaiRe') as '慢热' | '快热'
}

function huoQuIeLeiXing(mbti: MBTILeiXing): 'I' | 'E' {
  return mbti.charAt(0) as 'I' | 'E'
}

function shengChengShiJieXinXi(shenFen: string, _mbti: MBTILeiXing): Record<string, unknown> {
  return {
    cheng_shi: suiJiXuanZe(chengShiKu),
    gong_zuo_zhuang_tai: shenFen === '工作人' ? suiJiXuanZe(gongZuoZhuangTaiKu) : null,
    xian_shang_ai_hao: suiJiXuanZe(xianShangAiHaoKu),
    peng_you_quan_xi_guan: suiJiXuanZe(pengYouQuanXiGuanKu),
    she_jiao_quan: suiJiXuanZe(sheJiaoQuanKu),
    wei_xin_xi_guan: suiJiXuanZe(weiXinXiGuanKu),
    zuo_xi_gui_lv: suiJiXuanZe(zuoXiGuiLvKu),
    nian_ji: shenFen === '工作人' ? null : suiJiXuanZe(nianJiPeiZhi[shenFen]),
  }
}

function ziFuChuanHashZhuanShuZi(zhongZi: string): number {
  let hash = 5381
  for (let i = 0; i < zhongZi.length; i++) {
    hash = ((hash << 5) + hash) + zhongZi.charCodeAt(i)
    hash = hash >>> 0
  }
  return hash
}

function anZhongZiSuiJiShu(zhongZi: string, min: number, max: number): number {
  const hash = ziFuChuanHashZhuanShuZi(zhongZi)
  return min + (hash % (max - min + 1))
}

function shengChengHaoGanDuZongFen(
  mbti: MBTILeiXing,
  shiFouZhaXing: boolean,
  yongHuId?: string,
): number {
  const [jiChuMin, jiChuMax] = haoGanDuJiChuFanWei[mbti]
  const zhongZi = yongHuId ? `${yongHuId}_${mbti}` : `${mbti}_${Date.now()}_${Math.random()}`
  let zongFen = anZhongZiSuiJiShu(zhongZi, jiChuMin, jiChuMax)
  if (shiFouZhaXing) {
    const jiaFen = anZhongZiSuiJiShu(`${zhongZi}_zha_xing_jia_fen`, 200, 300)
    zongFen = Math.min(zongFen + jiaFen, 1000)
  }
  return zongFen
}

function huoQuGuanXiJieDuan(haoGanDu: number): string {
  if (haoGanDu <= 100) return 'lengDan'
  if (haoGanDu <= 200) return 'shuYuan'
  if (haoGanDu <= 300) return 'renShi'
  if (haoGanDu <= 400) return 'shuXi'
  if (haoGanDu <= 500) return 'pengYou'
  if (haoGanDu <= 600) return 'haoYou'
  if (haoGanDu <= 700) return 'aiMei'
  if (haoGanDu <= 800) return 'xinDong'
  if (haoGanDu <= 900) return 'reLian'
  return 'shenAi'
}

export function shengChengJiaoSe(canShu: ShengChengJiaoSeCanShu): ShengChengJiaoSeJieGuo {
  const mbti = huoQuMbti(canShu.mbti_lei_xing)
  const xingBie = huoQuXingBie(canShu.xing_bie, canShu.mu_biao_xing_bie)
  const shiFouZhaXing = canShu.shi_fou_zha_xing || false
  const mingZi = huoQuMingZi(xingBie)
  const shenFenJieGuo = anGaiLvXuanZeShenFen()
  const nianLing = suiJiShu(shenFenJieGuo.nianLingFanWei[0], shenFenJieGuo.nianLingFanWei[1])
  const zhiYe = anQuanZhongXuanZeZhiYe(mbti)
  const aiHaoLieBiao = anQuanZhongXuanZeAiHao(mbti)
  const jiaXiangDi = anQuanZhongXuanZeJiaXiang(mbti)
  const chengShi = suiJiXuanZe(chengShiKu)
  const shiJieXinXi = shengChengShiJieXinXi(shenFenJieGuo.leiXing, mbti)
  const xiHuanLeiXing = xiHuanDeLeiXing[mbti]
  const jiaTing = suiJiXuanZe(jiaTingBeiJing[mbti])
  const qingGan = suiJiXuanZe(qingGanJingLi[mbti])
  const waiMao = anQuanZhongXuanZeWaiMao(mbti)
  const xingGe = xingGeMiaoShu[mbti]
  const yanYu = yanYuFengGe[mbti]
  const xingWei = xingWeiTeDian[mbti]
  const ieLeiXing = huoQuIeLeiXing(mbti)
  const reShenLeiXing = huoQuReShenLeiXing(mbti)
  const xiTong = xiTongTiShi[mbti]
  const weiXinMing = huoQuWeiXinMing(xingBie)
  const touXiang = touXiangEmoji[mbti]
  const haoGanDuZongFen = shengChengHaoGanDuZongFen(mbti, shiFouZhaXing, canShu.yong_hu_id)

  const beiJingGuShi = `${mingZi}来自${jiaXiangDi}，现居${chengShi}。${shenFenJieGuo.leiXing === '工作人' ? `目前是一名${zhiYe}。` : `目前是一名${shenFenJieGuo.leiXing}${shenFenJieGuo.leiXing === '大学生' ? nianJiPeiZhi['大学生'][suiJiShu(0, 3)] : nianJiPeiZhi['大专生'][suiJiShu(0, 2)]}的学生，学习${zhiYe}。`}${qingGan}`

  const baDaMoKuai = {
    ji_ben_xin_xi: `姓名：${mingZi}，性别：${xingBie === 'nan' ? '男' : '女'}，年龄：${nianLing}岁，身份：${shenFenJieGuo.leiXing}，职业/专业：${zhiYe}，城市：${chengShi}`,
    wai_mao: waiMao,
    xing_ge: xingGe,
    bei_jing: `${jiaTing}。${beiJingGuShi}`,
    yan_yu: yanYu,
    xing_wei: xingWei,
    guan_xi: `喜欢的类型：${xiHuanLeiXing}`,
    xi_tong_ti_shi: xiTong,
  }

  const jieGuo: ShengChengJiaoSeJieGuo = {
    id: '',
    ming_zi: mingZi,
    xing_bie: xingBie,
    nian_ling: nianLing,
    shen_fen: shenFenJieGuo.leiXing,
    wai_mao: waiMao,
    xing_ge: xingGe,
    bei_jing_gu_shi: beiJingGuShi,
    xi_hao: aiHaoLieBiao,
    yan_yu_feng_ge: yanYu,
    xing_wei_te_dian: xingWei,
    tou_xiang: touXiang,
    biao_qian: [mbti, mbtiZhongWenMing[mbti], xingBie === 'nan' ? '男生' : '女生'],
    xi_huan_de_lei_xing: xiHuanLeiXing,
    jia_ting_bei_jing: jiaTing,
    qing_gan_jing_li: qingGan,
    shi_fou_zha_xing: shiFouZhaXing,
    yu_she_lei_xing: mbti,
    mbti_lei_xing: mbti,
    ie_lei_xing: ieLeiXing,
    re_shen_lei_xing: reShenLeiXing,
    wei_xin_ming: weiXinMing,
    zhen_shi_ming: mingZi,
    shi_jie_xin_xi: shiJieXinXi,
    xi_tong_ti_shi: xiTong,
    ba_da_mo_kuai: baDaMoKuai,
    hao_gan_du_zong_fen: haoGanDuZongFen,
  }

  if (shiFouZhaXing) {
    const zhaXing = zhaXingBianTi[mbti]
    jieGuo.zha_fa_miao_shu = zhaXing.zhaFaMiaoShu
    jieGuo.hua_shu = zhaXing.huaShu
    jieGuo.bao_lu_fang_shi = zhaXing.baoLuFangShi
    jieGuo.shi_po_xian_suo = zhaXing.shiPoXianSuo
  }

  return jieGuo
}

export async function baoCunJiaoSe(
  yongHuId: string,
  jiaoSe: ShengChengJiaoSeJieGuo,
): Promise<ShengChengJiaoSeJieGuo> {
  const chaRuJiaoSe = await 数据库.query(
    `INSERT INTO "角色" (
      "用户ID", "名字", "性别", "年龄", "外貌", "性格", "背景故事", "爱好",
      "言语风格", "头像", "标签", "喜欢的类型", "家庭背景", "情感经历",
      "是否渣型", "渣法描述", "话术", "暴露方式", "识破线索", "预设类型",
      "IE类型", "热身类型", "开场白", "MBTI", "微信昵称", "真实姓名", "世界信息"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
    RETURNING "ID"`,
    [
      yongHuId,
      jiaoSe.ming_zi,
      jiaoSe.xing_bie === 'nan' ? '男' : '女',
      jiaoSe.nian_ling,
      jiaoSe.wai_mao,
      jiaoSe.xing_ge,
      jiaoSe.bei_jing_gu_shi,
      jiaoSe.xi_hao,
      jiaoSe.yan_yu_feng_ge,
      jiaoSe.tou_xiang,
      jiaoSe.biao_qian,
      jiaoSe.xi_huan_de_lei_xing,
      jiaoSe.jia_ting_bei_jing,
      jiaoSe.qing_gan_jing_li,
      jiaoSe.shi_fou_zha_xing,
      jiaoSe.zha_fa_miao_shu || null,
      jiaoSe.hua_shu || [],
      jiaoSe.bao_lu_fang_shi || null,
      jiaoSe.shi_po_xian_suo || [],
      jiaoSe.yu_she_lei_xing,
      jiaoSe.ie_lei_xing,
      jiaoSe.re_shen_lei_xing,
      JSON.stringify([]),
      jiaoSe.yu_she_lei_xing,
      jiaoSe.wei_xin_ming,
      jiaoSe.zhen_shi_ming,
      JSON.stringify(jiaoSe.shi_jie_xin_xi),
    ],
  )

  const jiaoSeId = String(chaRuJiaoSe.rows[0].ID)
  jiaoSe.id = jiaoSeId

  await 数据库.query(
    `INSERT INTO "好感度" (
      "用户ID", "角色ID", "信任度", "亲密度", "趣味度", "关怀度", "总分", "关系阶段"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      yongHuId,
      jiaoSeId,
      Math.round(jiaoSe.hao_gan_du_zong_fen * 0.35),
      Math.round(jiaoSe.hao_gan_du_zong_fen * 0.25),
      Math.round(jiaoSe.hao_gan_du_zong_fen * 0.2),
      Math.round(jiaoSe.hao_gan_du_zong_fen * 0.2),
      jiaoSe.hao_gan_du_zong_fen,
      huoQuGuanXiJieDuan(jiaoSe.hao_gan_du_zong_fen),
    ],
  )

  const guanXiJieDuan = huoQuGuanXiJieDuan(jiaoSe.hao_gan_du_zong_fen)
  await 数据库.query(
    `INSERT INTO "游戏档案" (
      "用户ID", "角色ID", "角色名字", "是否渣型", "结果类型", "是否封存",
      "好感度总分", "关系阶段", "聊天天数", "消息总数"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT ("用户ID", "角色ID") DO UPDATE SET
      "角色名字" = EXCLUDED."角色名字",
      "是否渣型" = EXCLUDED."是否渣型",
      "结果类型" = EXCLUDED."结果类型",
      "是否封存" = EXCLUDED."是否封存",
      "好感度总分" = EXCLUDED."好感度总分",
      "关系阶段" = EXCLUDED."关系阶段"`,
    [
      yongHuId,
      jiaoSeId,
      jiaoSe.ming_zi,
      jiaoSe.shi_fou_zha_xing,
      '',
      false,
      jiaoSe.hao_gan_du_zong_fen,
      guanXiJieDuan,
      0,
      0,
    ],
  )

  await 数据库.query(
    `UPDATE "用户" SET "活跃角色ID" = $1, "目标性别" = $2, "性格选择" = $3, "渣男渣女变体" = $4 WHERE "ID" = $5`,
    [
      jiaoSeId,
      jiaoSe.xing_bie === 'nan' ? '男' : '女',
      jiaoSe.yu_she_lei_xing,
      jiaoSe.shi_fou_zha_xing,
      yongHuId,
    ],
  )

  // AI 开场白生成必须在返回前完成（同步 await）。
  // 修复"开始聊天后看不到消息只有复盘能看到"的严重 bug：
  // 原先用 void async 后台生成，用户进聊天页时消息可能尚未写入数据库，
  // 且后台保存不触发 socket 推送，导致聊天页拉取消息为空。
  // 现在同步等待生成+保存完成，/生成角色/确认 返回时消息已在数据库，
  // 添加微信过渡页 1.5s 后跳转聊天页，聊天页拉取消息时直接显示。
  // 前端 queRenJiaoSe 已配置 60s timeout，DeepSeek 客户端 timeout=120s，
  // shengChengKaiChangBai 内部 try/catch 失败会降级到 jiangJi 不会抛出。
  try {
    const kaiChangBai = await shengChengKaiChangBai({
      mbti_lei_xing: jiaoSe.mbti_lei_xing,
      ie_lei_xing: jiaoSe.ie_lei_xing,
      re_shen_lei_xing: jiaoSe.re_shen_lei_xing,
      shi_fou_zha_xing: jiaoSe.shi_fou_zha_xing,
      xing_ge: jiaoSe.xing_ge,
      yan_yu_feng_ge: jiaoSe.yan_yu_feng_ge,
      xi_huan_de_lei_xing: jiaoSe.xi_huan_de_lei_xing,
      xing_bie: jiaoSe.xing_bie,
      ming_zi: jiaoSe.ming_zi,
      bei_jing_gu_shi: jiaoSe.bei_jing_gu_shi,
      qing_gan_jing_li: jiaoSe.qing_gan_jing_li,
      jia_ting_bei_jing: jiaoSe.jia_ting_bei_jing,
      tou_xiang: jiaoSe.tou_xiang,
      biao_qian: jiaoSe.biao_qian,
    })
    for (const neiRong of kaiChangBai.xiao_xi_lie_biao.slice(0, 5)) {
      if (neiRong.trim()) {
        await baoCunJiaoSeXiaoXi({
          yong_hu_id: yongHuId,
          jiao_se_id: jiaoSeId,
          nei_rong: neiRong.trim(),
        })
      }
    }
  } catch (cuoWu) {
    console.error('生成开场白消息失败', cuoWu)
  }

  return jiaoSe
}

export async function anIdChaJiaoSeXiangQing(
  jiaoSeId: string,
): Promise<ShengChengJiaoSeJieGuo | null> {
  const jieGuo = await 数据库.query(`SELECT * FROM "角色" WHERE "ID" = $1 LIMIT 1`, [jiaoSeId])
  if (jieGuo.rows.length === 0) return null

  const row = jieGuo.rows[0]
  const shiJieXinXi = row.世界信息
    ? typeof row.世界信息 === 'object'
      ? row.世界信息
      : JSON.parse(String(row.世界信息))
    : {}

  return {
    id: String(row.ID),
    ming_zi: String(row.名字),
    xing_bie: row.性别 === '女' ? 'nv' : 'nan',
    nian_ling: Number(row.年龄),
    shen_fen: '',
    wai_mao: String(row.外貌 || ''),
    xing_ge: String(row.性格 || ''),
    bei_jing_gu_shi: String(row.背景故事 || ''),
    xi_hao: Array.isArray(row.爱好) ? row.爱好 : [],
    yan_yu_feng_ge: String(row.言语风格 || ''),
    xing_wei_te_dian: '',
    tou_xiang: String(row.头像 || ''),
    biao_qian: Array.isArray(row.标签) ? row.标签 : [],
    xi_huan_de_lei_xing: String(row.喜欢的类型 || ''),
    jia_ting_bei_jing: String(row.家庭背景 || ''),
    qing_gan_jing_li: String(row.情感经历 || ''),
    shi_fou_zha_xing: Boolean(row.是否渣型),
    zha_fa_miao_shu: row.渣法描述 ? String(row.渣法描述) : undefined,
    hua_shu: Array.isArray(row.话术) ? row.话术 : undefined,
    bao_lu_fang_shi: row.暴露方式 ? String(row.暴露方式) : undefined,
    shi_po_xian_suo: Array.isArray(row.识破线索) ? row.识破线索 : undefined,
    yu_she_lei_xing: String(row.预设类型 || row.MBTI || 'INTJ') as MBTILeiXing,
    mbti_lei_xing: String(row.MBTI || row.预设类型 || 'INTJ') as MBTILeiXing,
    ie_lei_xing: String(row.IE类型 || 'I') as 'I' | 'E',
    re_shen_lei_xing: String(row.热身类型 || '慢热') as '慢热' | '快热',
    wei_xin_ming: String(row.微信昵称 || row.名字 || ''),
    zhen_shi_ming: String(row.真实姓名 || row.名字 || ''),
    shi_jie_xin_xi: shiJieXinXi as Record<string, unknown>,
    xi_tong_ti_shi: '',
    ba_da_mo_kuai: {
      ji_ben_xin_xi: '',
      wai_mao: '',
      xing_ge: '',
      bei_jing: '',
      yan_yu: '',
      xing_wei: '',
      guan_xi: '',
      xi_tong_ti_shi: '',
    },
    hao_gan_du_zong_fen: 0,
  }
}
