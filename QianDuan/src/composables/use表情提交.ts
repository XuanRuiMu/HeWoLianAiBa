import { huoQuFanYi, type FanYiZiJian } from '@/config/翻译表'
import { BIAO_QING_TIAN_JIA_PEI_ZHI } from '@/config/表情配置'
import { panDingTuPianJuJue, type TuPianJuJueYuanYin } from '@/composables/use粘贴图片'
import { 使用表情仓库 } from '@/stores/表情'

export type TianJiaJieGuo = 'xinZeng' | 'yiCunZai' | 'buTiShi'

interface Use表情提交依赖 {
  queRenTuPianShouQuan: () => Promise<boolean>
  sheZhiCuoWu: (xinXi: string) => void
}

const JU_JUE_FAN_YI_JIAN: Record<TuPianJuJueYuanYin, FanYiZiJian<'duoMeiTi'>> = {
  leiXing: 'biaoQingMIMEBuZhiChi',
  weiKong: 'biaoQingTuPianWeiKong',
  guoDa: 'biaoQingTuPianGuoDa',
}

export function use表情提交(yiLai: Use表情提交依赖) {
  const 表情仓库 = 使用表情仓库()

  async function tiJiaoBiaoQingWenJian(wenJian: File): Promise<TianJiaJieGuo> {
    const juJue = panDingTuPianJuJue(wenJian, BIAO_QING_TIAN_JIA_PEI_ZHI)
    if (juJue) {
      yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', JU_JUE_FAN_YI_JIAN[juJue]))
      return 'buTiShi'
    }
    const yunXu = await yiLai.queRenTuPianShouQuan()
    if (!yunXu) {
      yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'shouQuanWeiKaiQiTiShi'))
      return 'buTiShi'
    }
    const jieGuo = await 表情仓库.tianJia(wenJian, wenJian.name)
    if (!jieGuo) {
      if (表情仓库.cuoWuXinXi) yiLai.sheZhiCuoWu(表情仓库.cuoWuXinXi)
      return 'buTiShi'
    }
    return jieGuo.yiCunZai ? 'yiCunZai' : 'xinZeng'
  }

  return { tiJiaoBiaoQingWenJian }
}
