import { describe, expect, test } from 'vitest'
import { shengChengWriterHuiFu } from '../Writer'
import { jianChaAiWei } from '../../config/去AI味配置'
import { peiZhi } from '../../config'
import type { AIJiaoSeXinXi, AIYinQingShuRu, DuiHuaLiShiXiang } from '../../types'
import * as fs from 'node:fs'

/**
 * 联调专用（非 CI 用例）：男大学生人设 + 圈内语境，验证「圈子用语指令」能否让 AI
 * 发出真实口头禅（哎呦我/兄弟/素的/妈呀等）。仅当 XU_KE_ZHEN_SHI_WAI_HU=true 时运行。
 * 优化前/优化后共用本文件与同一份输入，唯一变量是 Prompt构建器 的提示词文本。
 */

const 人设: AIJiaoSeXinXi = {
  id: 'jiao-se-ce-shi-nan',
  ming_zi: '陈嘉树',
  wei_xin_ming: '嘉树不加班',
  xing_bie: 'nan',
  mbti_lei_xing: 'ESTP',
  ie_lei_xing: 'E',
  re_shen_lei_xing: '快热',
  nian_ling: 20,
  shen_fen: '大二学生，体育教育专业',
  wai_mao: '寸头，爱穿篮球背心，个子高',
  xing_ge: '外向话多，爱开玩笑，嘴硬心软',
  bei_jing_gu_shi: '北方城市出来的大二学生，体育生，宿舍四个人天天开黑',
  xi_hao: ['打球', '开黑', '健身', '奶茶全糖'],
  yan_yu_feng_ge: '口头禅多，"哎呦我""兄弟"不离口，爱用夸张语气，说话大声',
  xing_wei_te_dian: '上课坐后排，睡前刷短视频，已读乱回',
  tou_xiang: '篮球',
  xi_huan_de_lei_xing: '可爱、会撒娇的',
  jia_ting_bei_jing: '家里开餐馆',
  qing_gan_jing_li: '谈过一段，分了',
  shi_fou_zha_xing: false,
  shi_jie_xin_xi: { },
  ba_da_mo_kuai: {
    ji_ben_xin_xi: '陈嘉树，20岁，大二体育教育',
    wai_mao: '寸头，爱穿篮球背心',
    xing_ge: '外向话多，爱开玩笑，嘴硬心软',
    bei_jing: '北方城市出来的，家里开餐馆',
    yan_yu: '口头禅多，哎呦我兄弟不离口，夸张语气',
    xing_wei: '上课坐后排，睡前刷短视频',
    guan_xi: '和用户聊了一阵，关系比较近，偶尔带点暧昧',
    xi_tong_ti_shi: '',
  },
}

const 历史消息: DuiHuaLiShiXiang[] = [
  { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '兄弟 在吗', shi_jian: '21:02' },
  { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '嘉树不加班', nei_rong: '嗯 怎么', shi_jian: '21:02' },
  { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '昨天那个局 有感觉吗 那个学弟', shi_jian: '21:03' },
  { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '嘉树不加班', nei_rong: '妈呀大姐吓死我了 别提了', shi_jian: '21:03' },
  { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '你0就直说呗', shi_jian: '21:04' },
  { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '嘉树不加班', nei_rong: '滚 我是1', shi_jian: '21:04' },
  { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '行行行 1哥', shi_jian: '21:05' },
  { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '在干嘛呢', shi_jian: '21:05' },
]

function 构造输入(): AIYinQingShuRu {
  return {
    yong_hu_id: 'yong-hu-quanzi',
    jiao_se_id: 'jiao-se-ce-shi-nan',
    jiao_se: 人设,
    hao_gan_du: { xin_ren_du: 118, qin_mi_du: 106, qu_wei_du: 99, guan_huai_du: 92, zong_fen: 415, guan_xi_jie_duan: 'haoYou' },
    dui_hua_li_shi: 历史消息,
    yong_hu_xin_xiao_xi: '在干嘛呢',
    shi_fou_di_yi_lun: false,
    shi_jian_chang_jing: '晚上九点，各自在宿舍，都在刷手机',
    tu_pian_shou_quan: false,
  }
}

const KOU_TOU_CHAN = ['哎呦我', '哎哟我', '兄弟', '哥们', '有感觉吗', '妈呀', '素的', '绷不住', '啊对对对', '急了', '笑死', '蚌埠住', '6到飞起', '绝了']

function tongJi(lieBiao: string[]) {
  const quanWen = lieBiao.join('\n')
  const mingZhong = KOU_TOU_CHAN.filter((ci) => quanWen.includes(ci))
  const aiWei = jianChaAiWei(quanWen)
  return {
    xiaoXiLieBiao: lieBiao,
    tiaoShu: lieBiao.length,
    kouTouChanMingZhong: mingZhong,
    kouTouChanShu: mingZhong.length,
    aiWeiMingZhong: aiWei.mingZhong,
  }
}

describe.skipIf(process.env.XU_KE_ZHEN_SHI_WAI_HU !== 'true')('联调：圈子用语对比', () => {
  test('同一输入跑 N 轮真实 Writer 并落盘指标', { timeout: 600000 }, async () => {
    const lunShu = Number(process.env.DUIBI_LUN_SHU || '5')
    const luJing = process.env.DUIBI_JIE_GUO_LU_JING || ''
    const biaoQian = process.env.DUIBI_BIAO_QIAN || '未命名'
    expect(luJing, '必须通过 DUIBI_JIE_GUO_LU_JING 指定结果落盘路径').toBeTruthy()

    const runs: ReturnType<typeof tongJi>[] = []
    for (let i = 0; i < lunShu; i++) {
      const jieGuo = await shengChengWriterHuiFu(构造输入())
      runs.push(tongJi(jieGuo.xiao_xi_lie_biao))
    }

    const huiZong = {
      biaoQian,
      lunShu,
      pingJunTiaoShu: Number((runs.reduce((a, r) => a + r.tiaoShu, 0) / Math.max(1, runs.length)).toFixed(2)),
      kouTouChanMingZhongZongShu: runs.reduce((a, r) => a + r.kouTouChanShu, 0),
      mingZhongGuoDeCi: [...new Set(runs.flatMap((r) => r.kouTouChanMingZhong))],
      aiWeiMingZhongZongShu: runs.reduce((a, r) => a + r.aiWeiMingZhong.length, 0),
    }

    const shuChu = {
      biaoQian,
      moXing: peiZhi.deepSeek.moXing,
      jiChuUrl: peiZhi.deepSeek.jiChuUrl,
      shuRu: { weiXinMing: 人设.wei_xin_ming, guanXiJieDuan: 'haoYou', jiaoDianXiaoXi: '在干嘛呢' },
      huiZong,
      runs,
    }
    fs.writeFileSync(luJing, JSON.stringify(shuChu, null, 2), 'utf8')
    expect(runs.length).toBe(lunShu)
  })
})
