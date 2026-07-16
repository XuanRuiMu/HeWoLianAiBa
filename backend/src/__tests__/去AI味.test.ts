import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve } from 'path'
import { fanYi } from '../config/translations'
import {
  gouJianWriterPrompt,
  gouJianDirectorPrompt,
  gouJianQingGanFenXiPrompt,
  gouJianHaoGanDuPingPanPrompt,
  gouJianJiYiZhaiYaoPrompt,
  gouJianAnQuanShenHePrompt,
  gouJianJunShiQiuZhuPrompt,
  gouJianGuanJianShiJianPrompt,
} from '../services/Prompt构建器'
import type { AIYinQingShuRu, AIJiaoSeXinXi, HaoGanDuXinXi } from '../types'

const jinYongCi = [
  '作为 AI',
  '作为AI',
  '作为人工智能',
  '我会',
  '我会',
  '请注意',
  '注意：',
  '总结',
  '根据以上',
  '根据设定',
  '元话语',
]

function tiQuSuoYouZiFuChuan(obj: unknown): string[] {
  const jieGuo: string[] = []
  function bianLi(v: unknown) {
    if (typeof v === 'string') jieGuo.push(v)
    else if (Array.isArray(v)) v.forEach(bianLi)
    else if (v && typeof v === 'object') Object.values(v).forEach(bianLi)
  }
  bianLi(obj)
  return jieGuo
}

function jianChaJinYongCi(wenBen: string, laiYuan: string) {
  for (const ci of jinYongCi) {
    if (wenBen.includes(ci)) {
      expect.fail(`发现 AI 味禁用词 "${ci}" 出现在 ${laiYuan}`)
    }
  }
}

function tiQuWenJianZiFuChuan(wenJianLuJing: string): string[] {
  const neiRong = readFileSync(wenJianLuJing, 'utf8')
  const jieGuo: string[] = []
  const regex = /'([^']*)'|"([^"]*)"|`([^`]*)`/g
  let piPei: RegExpExecArray | null
  while ((piPei = regex.exec(neiRong)) !== null) {
    jieGuo.push(piPei[1] ?? piPei[2] ?? piPei[3] ?? '')
  }
  return jieGuo
}

function bianLiMuLu(muLu: string, huiDiao: (wenJianLuJing: string) => void) {
  const xiangMu = readdirSync(muLu)
  for (const ming of xiangMu) {
    const luJing = resolve(muLu, ming)
    const xinXi = statSync(luJing)
    if (xinXi.isDirectory()) {
      bianLiMuLu(luJing, huiDiao)
    } else if (luJing.endsWith('.ts')) {
      huiDiao(luJing)
    }
  }
}

function chuangJianCeShiJiaoSe(): AIJiaoSeXinXi {
  return {
    id: 'j1',
    ming_zi: '小雨',
    wei_xin_ming: '雨夜的猫',
    xing_bie: 'nv',
    mbti_lei_xing: 'INFP',
    ie_lei_xing: 'I',
    re_shen_lei_xing: '慢热',
    nian_ling: 20,
    shen_fen: '大学生',
    wai_mao: '清秀，长发',
    xing_ge: '温柔敏感',
    bei_jing_gu_shi: '来自江南小城',
    xi_hao: ['画画'],
    yan_yu_feng_ge: '轻柔含蓄',
    xing_wei_te_dian: '害羞但真诚',
    tou_xiang: 'artist',
    xi_huan_de_lei_xing: '温柔体贴',
    jia_ting_bei_jing: '普通家庭',
    qing_gan_jing_li: '有过一段青涩暗恋',
    shi_fou_zha_xing: false,
    shi_jie_xin_xi: {},
    ba_da_mo_kuai: {
      ji_ben_xin_xi: '小雨，女，20岁',
      wai_mao: '清秀，长发',
      xing_ge: '温柔敏感',
      bei_jing: '江南小城',
      yan_yu: '轻柔含蓄',
      xing_wei: '害羞但真诚',
      guan_xi: '喜欢温柔体贴的人',
      xi_tong_ti_shi: 'INFP性格',
    },
  }
}

function chuangJianShuRu(): AIYinQingShuRu {
  return {
    yong_hu_id: 'u1',
    jiao_se_id: 'j1',
    jiao_se: chuangJianCeShiJiaoSe(),
    hao_gan_du: {
      xin_ren_du: 100,
      qin_mi_du: 100,
      qu_wei_du: 100,
      guan_huai_du: 100,
      zong_fen: 400,
      guan_xi_jie_duan: 'shuXi',
    },
    dui_hua_li_shi: [
      {
        fa_song_zhe_lei_xing: 'yonghu',
        fa_song_zhe_ming: '对方',
        nei_rong: '在干嘛',
        shi_jian: '14:30',
      },
      {
        fa_song_zhe_lei_xing: 'jiaose',
        fa_song_zhe_ming: '雨夜的猫',
        nei_rong: '刚下课',
        shi_jian: '14:32',
      },
    ],
    yong_hu_xin_xiao_xi: '今天累不累',
    shi_fou_di_yi_lun: false,
  }
}

describe('FP-16 去 AI 味', () => {
  it('后端翻译文件不含 AI 味关键词', () => {
    const wenBenLieBiao = tiQuSuoYouZiFuChuan(fanYi)
    for (const wenBen of wenBenLieBiao) {
      jianChaJinYongCi(wenBen, 'backend/src/config/translations.ts')
    }
  })

  it('AI services 源码字符串不含 AI 味关键词', () => {
    const servicesMuLu = resolve(__dirname, '../services')
    bianLiMuLu(servicesMuLu, (wenJianLuJing) => {
      const ziFuChuanLieBiao = tiQuWenJianZiFuChuan(wenJianLuJing)
      for (const ziFuChuan of ziFuChuanLieBiao) {
        jianChaJinYongCi(ziFuChuan, wenJianLuJing)
      }
    })
  })

  it('Writer prompt 不含 AI 味关键词', () => {
    const prompt = gouJianWriterPrompt(chuangJianShuRu())
    jianChaJinYongCi(prompt, 'Prompt构建器.gouJianWriterPrompt')
  })

  it('Director prompt 不含 AI 味关键词', () => {
    const prompt = gouJianDirectorPrompt(chuangJianShuRu())
    jianChaJinYongCi(prompt, 'Prompt构建器.gouJianDirectorPrompt')
  })

  it('情感分析 prompt 不含 AI 味关键词', () => {
    const prompt = gouJianQingGanFenXiPrompt('你好', '雨夜的猫')
    jianChaJinYongCi(prompt, 'Prompt构建器.gouJianQingGanFenXiPrompt')
  })

  it('好感度评判 prompt 不含 AI 味关键词', () => {
    const prompt = gouJianHaoGanDuPingPanPrompt('在干嘛', '刚下课', '雨夜的猫')
    jianChaJinYongCi(prompt, 'Prompt构建器.gouJianHaoGanDuPingPanPrompt')
  })

  it('记忆摘要 prompt 不含 AI 味关键词', () => {
    const prompt = gouJianJiYiZhaiYaoPrompt('用户：在干嘛\n角色：刚下课', '雨夜的猫')
    jianChaJinYongCi(prompt, 'Prompt构建器.gouJianJiYiZhaiYaoPrompt')
  })

  it('安全审核 prompt 不含 AI 味关键词', () => {
    const prompt = gouJianAnQuanShenHePrompt('测试消息')
    jianChaJinYongCi(prompt, 'Prompt构建器.gouJianAnQuanShenHePrompt')
  })

  it('军师求助 prompt 不含 AI 味关键词', () => {
    const haoGanDu: HaoGanDuXinXi = {
      xin_ren_du: 100,
      qin_mi_du: 100,
      qu_wei_du: 100,
      guan_huai_du: 100,
      zong_fen: 400,
      guan_xi_jie_duan: 'shuXi',
    }
    const prompt = gouJianJunShiQiuZhuPrompt(
      '[14:30] 对方：在干嘛\n[14:32] 雨夜的猫：刚下课',
      '雨夜的猫',
      haoGanDu,
      ['条目1'],
    )
    jianChaJinYongCi(prompt, 'Prompt构建器.gouJianJunShiQiuZhuPrompt')
  })

  it('关键事件提取 prompt 不含 AI 味关键词', () => {
    const prompt = gouJianGuanJianShiJianPrompt('[14:30] 对方：在干嘛', '雨夜的猫')
    jianChaJinYongCi(prompt, 'Prompt构建器.gouJianGuanJianShiJianPrompt')
  })
})
