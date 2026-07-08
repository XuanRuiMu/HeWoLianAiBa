import { huoQuFanYi } from '../config/translations'
import { shengChengDirectorCeLue } from './Director'
import { shengChengWriterHuiFu } from './Writer'
import { shenHeNeiRongAnQuan } from './安全审核'
import type {
  AIYinQingShuRu,
  AIYinQingShuChu,
  DirectorCeLue,
} from '../types'

export * from './Director'
export * from './Writer'
export * from './情感分析'
export * from './好感度评判'
export * from './记忆摘要'
export * from './安全审核'
export * from './军师求助'
export * from './关键事件提取'

function xiuZhengTiaoShu(tiaoShu: number): number {
  return Math.max(0, Math.min(5, tiaoShu))
}

function qieGeXiaoXi(xiaoXiLieBiao: string[], tiaoShu: number): string[] {
  return xiaoXiLieBiao.slice(0, xiuZhengTiaoShu(tiaoShu))
}

export async function yunXingAIYinQing(
  shuRu: AIYinQingShuRu,
): Promise<AIYinQingShuChu> {
  // 检查点1：Director前 - 输入校验
  if (!shuRu.yong_hu_xin_xiao_xi?.trim()) {
    return {
      xiao_xi_lie_biao: [],
      shi_fou_hui_fu: false,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
    }
  }

  // 安全审核
  const anQuanJieGuo = await shenHeNeiRongAnQuan(shuRu.yong_hu_xin_xiao_xi)
  if (anQuanJieGuo.wei_gui) {
    return {
      xiao_xi_lie_biao: [],
      shi_fou_hui_fu: false,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
      cuo_wu_xin_xi: huoQuFanYi('AI', 'ShenHeWeiGui'),
    }
  }

  let ceLue: DirectorCeLue | undefined
  let jiang_ji_mo_shi = false
  let cuoWuXinXi: string | undefined

  // Director调用
  const directorJieGuo = await shengChengDirectorCeLue(shuRu)
  if (directorJieGuo.cheng_gong) {
    ceLue = directorJieGuo.ce_lue
  } else {
    // Director失败降级为单代理模式
    jiang_ji_mo_shi = true
    cuoWuXinXi = huoQuFanYi('AI', 'DirectorDiaoYongShiBai')
    console.error('Director调用失败，降级为单代理模式', directorJieGuo.cuo_wu)
  }

  // 检查点2：Writer前
  if (ceLue && !ceLue.shi_fou_hui_fu) {
    return {
      xiao_xi_lie_biao: [],
      shi_fou_hui_fu: false,
      shi_fou_che_hui: ceLue.shi_fou_che_hui,
      jiang_ji_mo_shi,
    }
  }

  try {
    // Writer调用（Director失败时降级为单代理，ceLue为undefined）
    const writerJieGuo = await shengChengWriterHuiFu(shuRu, ceLue)

    // 检查点3：Writer后
    const zuiZhongTiaoShu = ceLue
      ? xiuZhengTiaoShu(ceLue.hui_fu_tiao_shu)
      : writerJieGuo.xiao_xi_lie_biao.length
    const xiaoXiLieBiao = qieGeXiaoXi(writerJieGuo.xiao_xi_lie_biao, zuiZhongTiaoShu)

    // 检查点4：保存前
    return {
      xiao_xi_lie_biao: xiaoXiLieBiao,
      shi_fou_hui_fu: xiaoXiLieBiao.length > 0,
      shi_fou_che_hui: ceLue?.shi_fou_che_hui || false,
      jiang_ji_mo_shi,
      cuo_wu_xin_xi: cuoWuXinXi,
    }
  } catch (cuoWu) {
    const writerCuoWu = cuoWu instanceof Error ? cuoWu.message : String(cuoWu)
    console.error('Writer调用失败', writerCuoWu)
    return {
      xiao_xi_lie_biao: [],
      shi_fou_hui_fu: false,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: true,
      cuo_wu_xin_xi: huoQuFanYi('AI', 'WriterDiaoYongShiBai'),
    }
  }
}
