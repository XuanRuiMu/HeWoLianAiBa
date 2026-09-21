import { huoQuFanYi, type FanYiZiJian } from '@/config/translations'
import { BIAO_QING_TIAN_JIA_PEI_ZHI } from '@/config/表情配置'
import { panDingTuPianJuJue, type TuPianJuJueYuanYin } from '@/composables/use粘贴图片'
import { 使用表情仓库 } from '@/stores/表情'

/** 提交结果：'buTiShi' 表示页面侧（判定/授权/仓库）已经给过提示，调用方不再补一条 */
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

/**
 * 全库唯一的「一张图 → 我的表情」提交口：本地判定 → C4 授权门 → 表情仓库上传（上传实现仍只有
 * stores/表情 一处）。页面侧只保留自己的错误横幅出口 `sheZhiCuoWu`，好友页的失败不会串到聊天页的横幅。
 * 「从本地添加」与两个聊天页的图片气泡长按共用这一处，不得再出现第二份取图→上传实现。
 */
export function use表情提交(yiLai: Use表情提交依赖) {
  const 表情仓库 = 使用表情仓库()

  async function tiJiaoBiaoQingWenJian(wenJian: File): Promise<TianJiaJieGuo> {
    const juJue = panDingTuPianJuJue(wenJian, BIAO_QING_TIAN_JIA_PEI_ZHI)
    if (juJue) {
      yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', JU_JUE_FAN_YI_JIAN[juJue]))
      return 'buTiShi'
    }
    // 添加表情会把图交给服务端视觉审核（与发送图片同一外发链路），未授权一律不外发
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
