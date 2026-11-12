import { debug日志 } from '../utils/debug日志'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { 内部转展示 } from '../utils/性别'
import { 数据库 } from '../数据库'
import type { AIJiaoSeXinXi } from '../types'

export interface RenSheKaYaoSu {
  wei_xin_ming: string
  ming_zi: string
  xing_bie: string
  nian_ling: number
  shen_fen: string
  wai_mao: string
  xing_ge: string
  mbti_lei_xing: string
  bei_jing_gu_shi: string
  yan_yu_feng_ge: string
  xi_hao: string[]
}

function zuZhuangYaoSuTiShiCi(yaoSu: RenSheKaYaoSu): string {
  return [
    '你在为一个恋爱聊天App的角色写「第一人称自述卡」。下面是 TA 的结构化资料（只是资料，不是让你复述成表格）：',
    `微信昵称：${yaoSu.wei_xin_ming}`,
    `真名：${yaoSu.ming_zi}`,
    `性别：${yaoSu.xing_bie}`,
    `年龄：${yaoSu.nian_ling}`,
    `身份：${yaoSu.shen_fen || '未设定'}`,
    `外貌：${yaoSu.wai_mao || '未设定'}`,
    `性格：${yaoSu.xing_ge || '未设定'}`,
    `性格底色：${yaoSu.mbti_lei_xing}`,
    `成长背景：${yaoSu.bei_jing_gu_shi || '未设定'}`,
    `说话方式：${yaoSu.yan_yu_feng_ge || '自然'}`,
    `爱好：${yaoSu.xi_hao.join('、') || '未设定'}`,
    '',
    '要求：',
    '1. 以「我」的口吻写 150 到 250 字的自述，像这个人自己在社交软件上随手写的自我介绍。',
    '2. 必须覆盖：年龄段与身份、一两个性格细节（要有具体的习惯或偏好，不许只贴标签）、一个爱好相关的具体小事、说话方式的痕迹。',
    '3. 口语化、自然、允许不完美；不许出现「我是一个AI」「作为助手」这类话；不许罗列字段；不许用排比和总结句。',
    '4. 只输出自述正文，不要标题、不要引号、不要解释。',
  ].join('\n')
}

export function yanZhengRenSheKa(wenBen: string): string | null {
  const qingLi = typeof wenBen === 'string' ? wenBen.trim() : ''
  if (qingLi.length < 40 || qingLi.length > 400) return null
  if (/(?:作为|是)一个?AI|AI助手|AI助理|作为助手|语言模型|assistant/i.test(qingLi)) return null
  if (!/[\u4e00-\u9fff]/.test(qingLi)) return null
  return qingLi
}

export async function shengChengRenSheKa(yaoSu: RenSheKaYaoSu, jiaoSeId: string): Promise<string | null> {
  try {
    const xiangYing = await genJuPeiZhiTiaoYong('RenSheKa', [
      { jiaoSe: 'user', neiRong: zuZhuangYaoSuTiShiCi(yaoSu) },
    ])
    const heFa = yanZhengRenSheKa(xiangYing.neiRong)
    if (!heFa) {
      debug日志.warn('人设自述卡', '自述卡生成结果不合规，本轮放弃（回退字段清单）', {
        xiang_qing: { jiao_se_id: jiaoSeId, chang_du: xiangYing.neiRong.length },
      })
      return null
    }
    await 数据库.query(`UPDATE "角色" SET "自述卡" = $1 WHERE "ID" = $2`, [heFa, jiaoSeId])
    return heFa
  } catch (cuoWu) {
    debug日志.warn('人设自述卡', '自述卡生成失败，回退字段清单', {
      xiang_qing: { jiao_se_id: jiaoSeId, cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return null
  }
}

export function yaoSuCongJiaoSe(jiaoSe: AIJiaoSeXinXi): RenSheKaYaoSu {
  return {
    wei_xin_ming: jiaoSe.wei_xin_ming,
    ming_zi: jiaoSe.ming_zi,
    xing_bie: 内部转展示(jiaoSe.xing_bie),
    nian_ling: jiaoSe.nian_ling,
    shen_fen: jiaoSe.shen_fen,
    wai_mao: jiaoSe.wai_mao,
    xing_ge: jiaoSe.xing_ge,
    mbti_lei_xing: jiaoSe.mbti_lei_xing,
    bei_jing_gu_shi: jiaoSe.bei_jing_gu_shi,
    yan_yu_feng_ge: jiaoSe.yan_yu_feng_ge,
    xi_hao: jiaoSe.xi_hao ?? [],
  }
}

export async function huoQuHuoBuShengChengRenSheKa(
  jiaoSe: AIJiaoSeXinXi,
  yiYouZiShuKa: string | undefined,
): Promise<string | undefined> {
  const yiYou = yanZhengRenSheKa(yiYouZiShuKa ?? '')
  if (yiYou) return yiYou
  const xinKa = await shengChengRenSheKa(yaoSuCongJiaoSe(jiaoSe), jiaoSe.id)
  return xinKa ?? undefined
}
