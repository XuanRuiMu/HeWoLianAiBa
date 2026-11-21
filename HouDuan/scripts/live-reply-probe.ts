import { yunXingAIYinQing } from '../src/services/AI引擎'
import { qieFenTieZhi } from '../src/services/贴纸标记'
import type { AIYinQingShuRu } from '../src/types'

const 角色 = {
  nian_ling: 24,
  ie_lei_xing: 'E',
  re_shen_lei_xing: '快热',
  mbti_lei_xing: 'ENTP',
  xing_ge: '外向、爱开玩笑、会接梗、有点欠揍',
  yan_yu_feng_ge: '调侃、轻松、自嘲',
  xing_wei_te_dian: '开心时喜欢连发表情，认真时收敛',
}
const 心晴 = { guan_xi_jie_duan: '暧昧', zong_fen: 500, xin_ren_du: 80, qin_mi_du: 80, qu_wei_du: 70, guan_huai_du: 80 }
const 样例 = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['哈哈哈哈哈']
async function main(): Promise<void> {
  for (const xiaoXi of 样例) {
    try {
      const shuRu = {
        yong_hu_id: 'probe-user',
        jiao_se_id: 'probe-角色',
        jiao_se: 角色,
        hao_gan_du: 心晴,
        dui_hua_li_shi: [],
        yong_hu_xin_xiao_xi: xiaoXi,
        shi_fou_di_yi_lun: false,
        tu_pian_shou_quan: false,
      } as unknown as AIYinQingShuRu
      const r = await yunXingAIYinQing(shuRu)
      process.stdout.write(JSON.stringify({
        input: xiaoXi,
        texts: r.xiao_xi_lie_biao,
        intent: r.ce_lue?.biao_qing_yi_tu,
        pieces: r.xiao_xi_lie_biao.map((x) => qieFenTieZhi(x)),
      }) + '\n')
    } catch (e) {
      process.stderr.write(JSON.stringify({ input: xiaoXi, error: String(e) }) + '\n')
    }
  }
  process.exit(0)
}
void main()
