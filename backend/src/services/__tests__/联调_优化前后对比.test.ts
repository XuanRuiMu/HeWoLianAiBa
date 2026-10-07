import { describe, expect, test } from 'vitest'
import { shengChengWriterHuiFu } from '../Writer'
import { jianChaAiWei } from '../../config/去AI味配置'
import { peiZhi } from '../../config'
import type { AIJiaoSeXinXi, AIYinQingShuRu, DuiHuaLiShiXiang } from '../../types'
import * as fs from 'node:fs'

/**
 * 联调专用（非 CI 用例）：本项目的真实 Writer 链路跑「优化前 vs 优化后」对比。
 * 仅当 XU_KE_ZHEN_SHI_WAI_HU=true 时运行（真实 DeepSeek 外呼），其余环境一律跳过。
 * 同一份输入跑 DUIBI_LUN_SHU 轮，指标写入 DUIBI_JIE_GUO_LU_JING 指定的 JSON 文件。
 * 优化前/优化后两次运行共用本文件与同一份输入，唯一变量是 Prompt构建器 的提示词文本。
 */

const 人设: AIJiaoSeXinXi = {
  id: 'jiao-se-ce-shi',
  ming_zi: '林小鹿',
  wei_xin_ming: '小鹿乱撞',
  xing_bie: 'nv',
  mbti_lei_xing: 'ISFP',
  ie_lei_xing: 'I',
  re_shen_lei_xing: '慢热',
  nian_ling: 20,
  shen_fen: '大二学生，视觉传达专业',
  wai_mao: '齐肩发，爱穿宽大卫衣，个子不高',
  xing_ge: '慢热，熟了之后话多，有点小傲娇，吃软不吃硬',
  bei_jing_gu_shi: '南方小城出来的大二学生，学视觉传达，平时窝在宿舍画图，舍友养了只猫她天天蹭',
  xi_hao: ['画图', '睡前刷手机', '奶茶三分糖', '猫'],
  yan_yu_feng_ge: '短句多，爱用省略号和"哈哈哈"，偶尔发语音，不熟的时候话很少',
  xing_wei_te_dian: '上课爱坐后排，睡前刷手机到很晚，已读不回是常态',
  tou_xiang: '猫',
  xi_huan_de_lei_xing: '有趣、不刻意讨好的人',
  jia_ting_bei_jing: '独生女，爸妈开小超市',
  qing_gan_jing_li: '高中暗恋过同桌没说出口，没正式谈过恋爱',
  shi_fou_zha_xing: false,
  shi_jie_xin_xi: { },
  ba_da_mo_kuai: {
    ji_ben_xin_xi: '林小鹿，20岁，大二视觉传达',
    wai_mao: '齐肩发，爱穿宽大卫衣',
    xing_ge: '慢热，熟了话多，小傲娇',
    bei_jing: '南方小城出来的，爸妈开小超市',
    yan_yu: '短句多，爱用省略号和哈哈哈',
    xing_wei: '上课坐后排，睡前刷手机到很晚',
    guan_xi: '和用户聊了一阵，关系比较近，偶尔带点暧昧',
    xi_tong_ti_shi: '',
  },
}

const 历史消息: DuiHuaLiShiXiang[] = [
  { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '在吗', shi_jian: '20:31' },
  { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '小鹿乱撞', nei_rong: '嗯？怎么了', shi_jian: '20:31' },
  { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '今天差点迟到 笑死 闹钟没响', shi_jian: '20:33' },
  { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '小鹿乱撞', nei_rong: '哈哈哈哈 惨', shi_jian: '20:33' },
  { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '小鹿乱撞', nei_rong: '跑着去的？', shi_jian: '20:34' },
  { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '对 教授已经开始讲了 我从后门溜进去的', shi_jian: '20:35' },
  { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '小鹿乱撞', nei_rong: '哈哈哈哈 后门侠', shi_jian: '20:35' },
  { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '你呢 在干嘛', shi_jian: '20:36' },
]

function 构造输入(): AIYinQingShuRu {
  return {
    yong_hu_id: 'yong-hu-dui-bi',
    jiao_se_id: 'jiao-se-ce-shi',
    jiao_se: 人设,
    hao_gan_du: { xin_ren_du: 118, qin_mi_du: 106, qu_wei_du: 99, guan_huai_du: 92, zong_fen: 415, guan_xi_jie_duan: 'haoYou' },
    dui_hua_li_shi: 历史消息,
    yong_hu_xin_xiao_xi: '你呢 在干嘛',
    shi_fou_di_yi_lun: false,
    shi_jian_chang_jing: '晚上八点半，各自在宿舍，都在刷手机',
    tu_pian_shou_quan: false,
  }
}

const YU_QI_CI = ['嗯', '啊', '哈', '呢', '吧', '噢', '哦', '诶', '唔', '嘛', '啦']

interface JuZiZhiBiao {
  juZiShu: number
  pingJunJuChang: number
  biaoZhunCha: number
  juChangCV: number
  duanJuBiLi: number
}

function juZiZhiBiao(wenBen: string): JuZiZhiBiao {
  const juZi = wenBen.split(/[，。！？…～,!?~\n]+/).map((j) => j.trim()).filter((j) => j.length > 0)
  const chang = juZi.map((j) => j.length)
  if (chang.length === 0) return { juZiShu: 0, pingJunJuChang: 0, biaoZhunCha: 0, juChangCV: 0, duanJuBiLi: 0 }
  const pingJun = chang.reduce((a, b) => a + b, 0) / chang.length
  const fangCha = chang.reduce((a, b) => a + (b - pingJun) ** 2, 0) / chang.length
  const biaoZhunCha = Math.sqrt(fangCha)
  const duanJu = chang.filter((c) => c < 8).length
  return {
    juZiShu: chang.length,
    pingJunJuChang: Number(pingJun.toFixed(2)),
    biaoZhunCha: Number(biaoZhunCha.toFixed(2)),
    juChangCV: pingJun > 0 ? Number((biaoZhunCha / pingJun).toFixed(3)) : 0,
    duanJuBiLi: Number((duanJu / chang.length).toFixed(3)),
  }
}

function shuYiBiao(lieBiao: string[]) {
  const quanWen = lieBiao.join('\n')
  const meiTiaoZiShu = lieBiao.map((t) => t.length)
  const juZi = juZiZhiBiao(quanWen)
  const yuQiCiShu = YU_QI_CI.reduce((zong, ci) => zong + quanWen.split(ci).length - 1, 0)
  const emojiShu = (quanWen.match(/\p{Extended_Pictographic}/gu) || []).length
  const aiWei = jianChaAiWei(quanWen)
  return {
    xiaoXiLieBiao: lieBiao,
    tiaoShu: lieBiao.length,
    meiTiaoZiShu,
    pingJunTiaoZiShu: meiTiaoZiShu.length ? Number((meiTiaoZiShu.reduce((a, b) => a + b, 0) / meiTiaoZiShu.length).toFixed(1)) : 0,
    zuiChangTiaoZiShu: meiTiaoZiShu.length ? Math.max(...meiTiaoZiShu) : 0,
    juZi,
    yuQiCiShu,
    emojiShu,
    aiWeiMingZhong: aiWei.mingZhong,
  }
}

describe.skipIf(process.env.XU_KE_ZHEN_SHI_WAI_HU !== 'true')('联调：真实链路优化前后对比', () => {
  test('同一输入跑 N 轮真实 Writer 并落盘指标', { timeout: 600000 }, async () => {
    const lunShu = Number(process.env.DUIBI_LUN_SHU || '5')
    const luJing = process.env.DUIBI_JIE_GUO_LU_JING || ''
    const biaoQian = process.env.DUIBI_BIAO_QIAN || '未命名'
    expect(luJing, '必须通过 DUIBI_JIE_GUO_LU_JING 指定结果落盘路径').toBeTruthy()

    const runs: ReturnType<typeof shuYiBiao>[] = []
    for (let i = 0; i < lunShu; i++) {
      const jieGuo = await shengChengWriterHuiFu(构造输入())
      runs.push(shuYiBiao(jieGuo.xiao_xi_lie_biao))
    }

    const youXiao = runs.filter((r) => r.tiaoShu > 0)
    const huiZong = {
      biaoQian,
      lunShu,
      kongHuiLunShu: runs.length - youXiao.length,
      pingJunTiaoShu: Number((youXiao.reduce((a, r) => a + r.tiaoShu, 0) / Math.max(1, youXiao.length)).toFixed(2)),
      pingJunMeiTiaoZiShu: Number((youXiao.reduce((a, r) => a + r.pingJunTiaoZiShu, 0) / Math.max(1, youXiao.length)).toFixed(1)),
      zuiChangTiaoZiShu: Math.max(0, ...runs.map((r) => r.zuiChangTiaoZiShu)),
      pingJunJuChangCV: Number((youXiao.reduce((a, r) => a + r.juZi.juChangCV, 0) / Math.max(1, youXiao.length)).toFixed(3)),
      pingJunDuanJuBiLi: Number((youXiao.reduce((a, r) => a + r.juZi.duanJuBiLi, 0) / Math.max(1, youXiao.length)).toFixed(3)),
      yuQiCiZongShu: runs.reduce((a, r) => a + r.yuQiCiShu, 0),
      emojiZongShu: runs.reduce((a, r) => a + r.emojiShu, 0),
      aiWeiMingZhongZongShu: runs.reduce((a, r) => a + r.aiWeiMingZhong.length, 0),
    }

    const shuChu = {
      biaoQian,
      moXing: peiZhi.deepSeek.moXing,
      jiChuUrl: peiZhi.deepSeek.jiChuUrl,
      shuRu: { weiXinMing: 人设.wei_xin_ming, guanXiJieDuan: 'haoYou', jiaoDianXiaoXi: '你呢 在干嘛' },
      huiZong,
      runs,
    }
    fs.writeFileSync(luJing, JSON.stringify(shuChu, null, 2), 'utf8')
    expect(runs.length).toBe(lunShu)
  })
})
