import { 候选系统表情 } from '../src/services/表情包库'
import { shengChengDirectorCeLue } from '../src/services/Director'
import { panDuanBiaoQingZaiTi } from '../src/services/表情载体'
import { tuiDaoRenSheQiZhi } from '../src/services/人设气质'
import { debug日志 } from '../src/utils/debug日志'
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
const 样例 = [
  '哈哈哈哈哈',
  '早安呀，吃早饭了吗',
  '下班了吗？到家跟我说一声啊',
  '我今天被领导夸了！',
  '我好累啊',
  '你怎么这么懂我',
  '我想你了',
  '我饿了，陪我吃饭呗',
  '你怎么这么傻',
  '我好难过，今天真的很糟',
  '你到底是怎么做到的，太牛了',
  '睡不着怎么办',
]
const 心晴 = { guan_xi_jie_duan: '暧昧', zong_fen: 500, xin_ren_du: 80, qin_mi_du: 80, qu_wei_du: 70, guan_huai_du: 80 }
function zhaoShuRu(xiaoXi: string): AIYinQingShuRu {
  return {
    yong_hu_id: 'probe-user',
    jiao_se_id: 'probe-角色',
    jiao_se: 角色,
    hao_gan_du: 心晴,
    dui_hua_li_shi: [],
    yong_hu_xin_xiao_xi: xiaoXi,
    shi_fou_di_yi_lun: false,
    tu_pian_shou_quan: false,
  } as unknown as AIYinQingShuRu
}

async function main(): Promise<void> {
  const start = Math.max(1, Number(process.argv[2] || 1))
  const max = Math.min(样例.length, Number(process.argv[3] || 样例.length))
  debug日志.info('live-sticker-probe', '独立live探针（不读写生产消息，不写DB）')
  for (let i = start - 1; i < max; i += 1) {
    const xiaoXi = 样例[i]
    try {
      const shuRu = zhaoShuRu(xiaoXi)
      const dj = await shengChengDirectorCeLue(shuRu)
      const zhiCe = dj.ce_lue
      const zaiTi = panDuanBiaoQingZaiTi(shuRu, zhiCe)
      const guoLv = { yunXuFengGe: zaiTi.yunXuFengGe, guanXiJieDuanXuHao: zaiTi.guanXiJieDuanXuHao, renSheQiZhi: tuiDaoRenSheQiZhi(角色) }
      const li = zaiTi.geiHouXuan ? await 候选系统表情(zhiCe.biao_qing_yi_tu, 8, guoLv) : []
      const 带文案 = await (await import('../src/services/系统表情')).生成表情候选文本(zhiCe.biao_qing_yi_tu, zaiTi)
      debug日志.info('live-sticker-probe', '结果', {
        xiang_qing: {
          index: i + 1,
          input: xiaoXi,
          directorOk: dj.cheng_gong,
          emotionIntent: zhiCe.biao_qing_yi_tu,
          zaiTi: zaiTi.yuanYin,
          guanXuan: Boolean(带文案),
          candidateCount: li.length,
          firstTwo: li.slice(0, 2).map((x) => x.duanMing),
        },
      })
    } catch (e) {
      debug日志.error('live-sticker-probe', '执行失败', {
        xiang_qing: { index: i + 1, input: xiaoXi, error: String(e).slice(0, 200) },
      })
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  process.exit(0)
}
void main()
