import * as fs from 'fs/promises'
import * as path from 'path'
import { debug日志 } from '../utils/debug日志'

export interface CiKuCiTiao {
  leiBie: string
  ciTiao: string[]
  ceShiYangBen: string[]
}

export interface CiKuLeiBie {
  miaoShu: string
  ciTiao: string[]
  ceShiYangBen: string[]
}

export interface CiKuBanBen {
  banBen: string
  gengXinShiJian: string
  leiBie: Record<string, CiKuLeiBie>
}

let huanCunCiKu: CiKuBanBen | null = null
let huanCunShiJian = 0
const HUAN_CUN_GENG_XIN_JIAN_GE = 60 * 1000

const CI_KU_MU_LU = path.resolve(__dirname, '../config/审核词库')

export async function jiaZaiZuiXinCiKu(qiangZhiShuaXin = false): Promise<CiKuBanBen> {
  const xianZai = Date.now()
  if (!qiangZhiShuaXin && huanCunCiKu && xianZai - huanCunShiJian < HUAN_CUN_GENG_XIN_JIAN_GE) {
    return huanCunCiKu
  }

  try {
    const wenJianLieBiao = await fs.readdir(CI_KU_MU_LU)
    const banBenWenJian = wenJianLieBiao
      .filter((wenJian) => wenJian.endsWith('.json') && wenJian.startsWith('v'))
      .sort((a, b) => {
        const banBenA = parseInt(a.replace('v', '').replace('.json', ''), 10)
        const banBenB = parseInt(b.replace('v', '').replace('.json', ''), 10)
        return banBenB - banBenA
      })

    if (banBenWenJian.length === 0) {
      throw new Error('未找到任何版本化词库文件')
    }

    const zuiXinWenJian = banBenWenJian[0]
    const wenJingLuJing = path.join(CI_KU_MU_LU, zuiXinWenJian)
    const wenJianNeiRong = await fs.readFile(wenJingLuJing, 'utf-8')
    const ciKu = JSON.parse(wenJianNeiRong) as CiKuBanBen

    huanCunCiKu = ciKu
    huanCunShiJian = xianZai

    debug日志.info('审核词库', '已加载最新版本词库', { xiang_qing: { ban_ben: ciKu.banBen, wen_jian: zuiXinWenJian } })
    return ciKu
  } catch (cuoWu) {
    debug日志.error('审核词库', '加载词库失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    throw cuoWu
  }
}

export function huoQuSuoYouLeiBie(ciKu: CiKuBanBen): string[] {
  return Object.keys(ciKu.leiBie)
}

export function huoQuLeiBieCiTiao(ciKu: CiKuBanBen, leiBie: string): string[] {
  return ciKu.leiBie[leiBie]?.ciTiao || []
}

export function huoQuSuoYouCiTiao(ciKu: CiKuBanBen): string[] {
  const suoYouCiTiao: string[] = []
  for (const leiBie of Object.values(ciKu.leiBie)) {
    suoYouCiTiao.push(...leiBie.ciTiao)
  }
  return suoYouCiTiao
}

export function saoMiaoNeiRong(neiRong: string, ciKu: CiKuBanBen): { weiGui: boolean; leiBie?: string; mingZhongCi?: string } {
  const xiaoXieNeiRong = neiRong.toLowerCase()

  for (const [leiBie, leiBieShuJu] of Object.entries(ciKu.leiBie)) {
    for (const ci of leiBieShuJu.ciTiao) {
      if (ci.length > 0 && xiaoXieNeiRong.includes(ci.toLowerCase())) {
        return { weiGui: true, leiBie, mingZhongCi: ci }
      }
    }
  }

  return { weiGui: false }
}

export function huoQuCeShiYangBen(ciKu: CiKuBanBen, leiBie: string): string[] {
  return ciKu.leiBie[leiBie]?.ceShiYangBen || []
}

export function yiZhengCeShiYangBen(ciKu: CiKuBanBen): Array<{ leiBie: string; yangBen: string }> {
  const jieGuo: Array<{ leiBie: string; yangBen: string }> = []
  for (const [leiBie, leiBieShuJu] of Object.entries(ciKu.leiBie)) {
    for (const yangBen of leiBieShuJu.ceShiYangBen) {
      jieGuo.push({ leiBie, yangBen })
    }
  }
  return jieGuo
}

export async function yanZhengCeShiYangBen(): Promise<{ tongGuo: boolean; xiangQing: Array<{ leiBie: string; yangBen: string; tongGuo: boolean; mingZhongCi?: string }> }> {
  const ciKu = await jiaZaiZuiXinCiKu()
  const yangBenLieBiao = yiZhengCeShiYangBen(ciKu)
  const xiangQing: Array<{ leiBie: string; yangBen: string; tongGuo: boolean; mingZhongCi?: string }> = []

  for (const { leiBie, yangBen } of yangBenLieBiao) {
    const saoMiaoJieGuo = saoMiaoNeiRong(yangBen, ciKu)
    xiangQing.push({
      leiBie,
      yangBen,
      tongGuo: saoMiaoJieGuo.weiGui,
      mingZhongCi: saoMiaoJieGuo.mingZhongCi,
    })
  }

  const tongGuo = xiangQing.every((x) => x.tongGuo)
  return { tongGuo, xiangQing }
}

function qingChuHuanCunNeiBu(): void {
  huanCunCiKu = null
  huanCunShiJian = 0
}

export { qingChuHuanCunNeiBu as qingChuHuanCun, qingChuHuanCunNeiBu as chongZhiCiKuHuanCun }