import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import { v4 as uuidV4 } from 'uuid'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { MEI_TI_PEI_ZHI } from '../config/媒体配置'
import {
  sheZhiMockTiaoYong,
  chongZhiDeepSeekKeHuDuan,
  yuSuanBaoHu,
  type TiaoYongCanShu,
  type TiaoYongJieGuo,
  type DuiHuaXiaoXi,
  type DuiHuaKuai,
} from '../utils/DeepSeek客户端'
import { huoQuZuiJinDuiHuaLiShi } from '../services/AI输入准备'
import { shengChengWriterHuiFu } from '../services/Writer'
import { shengChengDirectorCeLue } from '../services/Director'
import { jianCeYongHuXiaoXi } from '../services/胜利失败条件'
import { shengChengJunShiZhiDao } from '../services/军师求助'
import { shengChengFuPan } from '../services/复盘'
import { JUN_SHI_PEI_ZHI_MO_REN } from '../config/军师配置'
import { sheZhiKaiChangBaiMock } from '../services/开场白生成'
import type {
  AIJiaoSeXinXi,
  AIYinQingShuRu,
  DuiHuaLiShiXiang,
  HaoGanDuXinXi,
} from '../types'

function suiJiShouJiHao(): string {
  return `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

async function qingLiCeShiYongHu(shouJiHao: string): Promise<void> {
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  await redis.del(`yan_zheng_ma:${shouJiHao}`)
  await redis.del(`fa_song_jian_ge:${shouJiHao}`)
}

async function chuangJianCeShiYongHu(): Promise<{ shouJiHao: string; lingPai: string; yongHuId: string }> {
  const shouJiHao = suiJiShouJiHao()
  await qingLiCeShiYongHu(shouJiHao)

  await request(yingYong).post('/api/认证/发送码').send({ shouJiHao }).expect(200)

  const zhuCeXiangYing = await request(yingYong)
    .post('/api/认证/注册')
    .send({
      shouJiHao,
      yanZhengMa: '123456',
      yongHuMing: `测试用户${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      miMa: 'testPassword123',
      tongYiXieYi: true,
    })
    .expect(200)

  const yongHu = await 数据库.query(`SELECT "ID" FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  return {
    shouJiHao,
    lingPai: zhuCeXiangYing.body.shu_ju.令牌,
    yongHuId: String(yongHu.rows[0].ID),
  }
}

const jiaoSeHuanCun = new Map<string, string>()
const yiChuanSha256JiHe = new Set<string>()

async function huoQuCeShiJiaoSeId(lingPai: string): Promise<string> {
  const yiYou = jiaoSeHuanCun.get(lingPai)
  if (yiYou) return yiYou

  const shengChengXiangYing = await request(yingYong)
    .post('/api/生成角色/MBTI生成')
    .set('Authorization', `Bearer ${lingPai}`)
    .send({ 性别: 'nv', mbti类型: 'INFP' })
    .expect(200)

  const jiaoSe = shengChengXiangYing.body.shu_ju
  const queRenXiangYing = await request(yingYong)
    .post('/api/生成角色/确认')
    .set('Authorization', `Bearer ${lingPai}`)
    .send({ xuanZhongJiaoSe: jiaoSe })
    .expect(200)

  const jiaoSeId = String(queRenXiangYing.body.shu_ju.id)
  jiaoSeHuanCun.set(lingPai, jiaoSeId)
  return jiaoSeId
}

interface ShangChuanJieGuo {
  mediaId: string
  sha256: string
}

async function shangChuanMeiTi(
  lingPai: string,
  jiaoSeId: string,
  leiBie: string,
  neiRong: string,
  wenJianMing: string,
  mime: string,
): Promise<ShangChuanJieGuo> {
  const xiangYing = await request(yingYong)
    .post(`/api/聊天/会话/${jiaoSeId}/媒体`)
    .query({ leiBie })
    .set('Authorization', `Bearer ${lingPai}`)
    .attach('file', Buffer.from(neiRong), { filename: wenJianMing, contentType: mime })
    .expect(200)

  const shuJu = xiangYing.body.shu_ju
  yiChuanSha256JiHe.add(String(shuJu.sha256))
  return { mediaId: String(shuJu.mediaId), sha256: String(shuJu.sha256) }
}

async function faSongMeiTiXiaoXi(
  lingPai: string,
  jiaoSeId: string,
  leiXing: string,
  meiTiId: string,
): Promise<string> {
  const xiangYing = await request(yingYong)
    .post(`/api/聊天/会话/${jiaoSeId}/消息`)
    .set('Authorization', `Bearer ${lingPai}`)
    .send({ leiXing, meiTiId })
    .expect(200)
  return String(xiangYing.body.shu_ju.id)
}

function chuangJianAIJiaoSe(): AIJiaoSeXinXi {
  return {
    id: 'jiao-se-id',
    ming_zi: '小雨',
    wei_xin_ming: '雨夜的猫',
    xing_bie: 'nv',
    mbti_lei_xing: 'INFP',
    ie_lei_xing: 'I',
    re_shen_lei_xing: '快热',
    nian_ling: 20,
    shen_fen: '大学生',
    wai_mao: '清秀，长发，喜欢穿浅色毛衣',
    xing_ge: '温柔敏感，想象力丰富',
    bei_jing_gu_shi: '来自江南小城，现居杭州读大学',
    xi_hao: ['画画'],
    yan_yu_feng_ge: '轻柔含蓄',
    xing_wei_te_dian: '害羞但真诚',
    tou_xiang: 'artist',
    xi_huan_de_lei_xing: '温柔体贴、有耐心的人',
    jia_ting_bei_jing: '普通家庭，父母开明',
    qing_gan_jing_li: '有过一段青涩暗恋',
    shi_fou_zha_xing: false,
    shi_jie_xin_xi: {},
    ba_da_mo_kuai: {
      ji_ben_xin_xi: '小雨，女，20岁，大学生',
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

function chuangJianHaoGanDu(): HaoGanDuXinXi {
  return {
    xin_ren_du: 175,
    qin_mi_du: 125,
    qu_wei_du: 100,
    guan_huai_du: 100,
    zong_fen: 500,
    guan_xi_jie_duan: 'pengYou',
  }
}

function chuangJianAIShuRu(liShi: DuiHuaLiShiXiang[]): AIYinQingShuRu {
  return {
    yong_hu_id: 'yong-hu-id',
    jiao_se_id: 'jiao-se-id',
    jiao_se: chuangJianAIJiaoSe(),
    hao_gan_du: chuangJianHaoGanDu(),
    dui_hua_li_shi: liShi,
    yong_hu_xin_xiao_xi:
      liShi.filter((x) => x.fa_song_zhe_lei_xing === 'yonghu').slice(-1)[0]?.nei_rong || '',
    shi_fou_di_yi_lun: false,
  }
}

function huoQuUserWenBen(canShu: TiaoYongCanShu): string {
  const neiRong = canShu.xiaoXi[canShu.xiaoXi.length - 1]?.neiRong
  if (typeof neiRong === 'string') return neiRong
  if (Array.isArray(neiRong)) {
    return neiRong
      .map((kuai) => (kuai.type === 'input_text' ? kuai.text : ''))
      .join('\n')
  }
  return ''
}

function shiHanTuXiangKuai(neiRong: unknown): neiRong is DuiHuaKuai[] {
  return Array.isArray(neiRong)
}

function shouJiTouXiangKuaiShu(xiaoXiLieBiao: DuiHuaXiaoXi[]): number {
  let shu = 0
  for (const xiaoXi of xiaoXiLieBiao) {
    if (!shiHanTuXiangKuai(xiaoXi.neiRong)) continue
    for (const kuai of xiaoXi.neiRong) {
      if (kuai.type === 'input_image') shu += 1
    }
  }
  return shu
}

describe('FP-04 AI视觉管道', () => {
  let ceShiYongHu: { shouJiHao: string; lingPai: string; yongHuId: string }
  let jiaoSeId = ''

  beforeAll(async () => {
    ceShiYongHu = await chuangJianCeShiYongHu()
    sheZhiMockTiaoYong(async () => ({
      neiRong: JSON.stringify({ 违规: false, 确信度: 0.1 }),
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {} as never,
    }))
    jiaoSeId = await huoQuCeShiJiaoSeId(ceShiYongHu.lingPai)
    sheZhiMockTiaoYong(null)
  })

  beforeEach(async () => {
    chongZhiDeepSeekKeHuDuan()
    sheZhiKaiChangBaiMock(() => ({ xiao_xi_lie_biao: [] }))
    await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [ceShiYongHu.yongHuId])
    // 默认安全兜底 mock：拦截路由侧触发的安全审核等 AI 调用，避免依赖真实 API；
    // 各测试用例随后可用自定义 sheZhiMockTiaoYong 覆盖
    sheZhiMockTiaoYong(async () => ({
      neiRong: JSON.stringify({ 违规: false, 确信度: 0.1 }),
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {} as never,
    }))
  })

  afterEach(() => {
    sheZhiMockTiaoYong(null)
    sheZhiKaiChangBaiMock(null)
  })

  afterAll(async () => {
    await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [ceShiYongHu.yongHuId])
    await 数据库.query(`DELETE FROM "游戏档案" WHERE "用户ID" = $1`, [ceShiYongHu.yongHuId])
    await 数据库.query(`DELETE FROM "游戏结局" WHERE "用户ID" = $1`, [ceShiYongHu.yongHuId])
    await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [ceShiYongHu.yongHuId])
    await 数据库.query(`DELETE FROM "记忆" WHERE "用户ID" = $1`, [ceShiYongHu.yongHuId])
    await 数据库.query(`DELETE FROM "媒体文件" WHERE "上传者ID" = $1`, [ceShiYongHu.yongHuId])
    await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [ceShiYongHu.yongHuId])
    await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [ceShiYongHu.yongHuId])
    jiaoSeHuanCun.clear()

    for (const sha256 of yiChuanSha256JiHe) {
      const muLu = path.join(MEI_TI_PEI_ZHI.cunChuGenMuLu, sha256.slice(0, 2))
      await fs.promises.rm(path.join(muLu, sha256), { force: true }).catch(() => {})
      await fs.promises.rmdir(muLu).catch(() => {})
    }
    await fs.promises.rm(path.join(MEI_TI_PEI_ZHI.cunChuGenMuLu, 'tmp'), {
      recursive: true,
      force: true,
    }).catch(() => {})

    await redis.quit()
    await 数据库.end()
  })

  it('Writer链路：历史含未撤回用户图片 → 最后一条user内容为数组且含data:image开头的input_image（detail=low）', async () => {
    const tuPian = await shangChuanMeiTi(
      ceShiYongHu.lingPai,
      jiaoSeId,
      'tupian',
      `shijue-writer-tupian-${Date.now()}`,
      'shijue.png',
      'image/png',
    )
    await faSongMeiTiXiaoXi(ceShiYongHu.lingPai, jiaoSeId, 'tuPian', tuPian.mediaId)

    const liShi = await huoQuZuiJinDuiHuaLiShi(ceShiYongHu.yongHuId, jiaoSeId)
    const tuPianXiang = liShi.find((x) => x.meiTiLeiBie === 'tupian')
    expect(tuPianXiang?.meiTiSha256).toBe(tuPian.sha256.toLowerCase())
    expect(tuPianXiang?.meiTiMIME).toBe('image/png')

    const jiLu: TiaoYongCanShu[] = []
    sheZhiMockTiaoYong(async (canShu) => {
      jiLu.push(canShu)
      return {
        neiRong: '收到啦，我看看这张图～\n拍得不错呀',
        xinXi: { role: 'assistant', content: 'writer' },
        yuanShuJu: {} as never,
      }
    })

    await shengChengWriterHuiFu(chuangJianAIShuRu(liShi))

    expect(jiLu.length).toBe(1)
    const writerCall = jiLu[0]
    expect(writerCall.xiaoXi).toHaveLength(2)
    expect(writerCall.xiaoXi[0].jiaoSe).toBe('system')
    expect(typeof writerCall.xiaoXi[0].neiRong).toBe('string')

    const userXiaoXi = writerCall.xiaoXi[1]
    expect(userXiaoXi.jiaoSe).toBe('user')
    expect(shiHanTuXiangKuai(userXiaoXi.neiRong)).toBe(true)
    const kuai = userXiaoXi.neiRong as DuiHuaKuai[]
    expect(kuai[0].type).toBe('input_text')
    const promptWenBen = kuai[0].type === 'input_text' ? kuai[0].text : ''
    expect(promptWenBen).toContain('【先记住这些】')
    expect(promptWenBen).toContain('[图片]')

    const tuXiangKuai = kuai.find((k) => k.type === 'input_image')
    expect(tuXiangKuai).toBeDefined()
    if (tuXiangKuai?.type === 'input_image') {
      expect((tuXiangKuai.image_url as string).startsWith('data:image/png;base64,')).toBe(true)
      expect(tuXiangKuai.detail).toBe('low')
    }
    expect(kuai.some((k) => k.type === 'input_text' && k.text.includes('[用户发来一张图片]'))).toBe(true)
  })

  it('Director链路同样注入图像块；system与assistant消息永不出现input_image', async () => {
    const tuPian = await shangChuanMeiTi(
      ceShiYongHu.lingPai,
      jiaoSeId,
      'tupian',
      `shijue-director-tupian-${Date.now()}`,
      'director.png',
      'image/png',
    )
    await faSongMeiTiXiaoXi(ceShiYongHu.lingPai, jiaoSeId, 'tuPian', tuPian.mediaId)

    const liShi = await huoQuZuiJinDuiHuaLiShi(ceShiYongHu.yongHuId, jiaoSeId)

    const jiLu: TiaoYongCanShu[] = []
    sheZhiMockTiaoYong(async (canShu) => {
      jiLu.push(canShu)
      return {
        neiRong: JSON.stringify({
          用户意图: '继续聊天',
          情感分析: '中性',
          回复策略: '自然回复',
          是否回复: true,
          回复条数: 1,
          时间情绪: '轻松',
          是否撤回: false,
          是否主动表白: false,
        }),
        xinXi: { role: 'assistant', content: 'director' },
        yuanShuJu: {} as never,
      }
    })

    const jieGuo = await shengChengDirectorCeLue(chuangJianAIShuRu(liShi))
    expect(jieGuo.cheng_gong).toBe(true)

    expect(jiLu.length).toBeGreaterThanOrEqual(1)
    for (const canShu of jiLu) {
      for (const xiaoXi of canShu.xiaoXi) {
        if (xiaoXi.jiaoSe !== 'user') {
          expect(typeof xiaoXi.neiRong).toBe('string')
        }
      }
    }
    const directorCall = jiLu[0]
    const userNeiRong = directorCall.xiaoXi[1].neiRong
    expect(shiHanTuXiangKuai(userNeiRong)).toBe(true)
    expect((userNeiRong as DuiHuaKuai[]).some((k) => k.type === 'input_image')).toBe(true)
  })

  it('已撤回图片 → 纯文本[用户撤回了一张图片]且无任何图像块', async () => {
    const tuPian = await shangChuanMeiTi(
      ceShiYongHu.lingPai,
      jiaoSeId,
      'tupian',
      `shijue-chehui-tupian-${Date.now()}`,
      'chehui.png',
      'image/png',
    )
    const xiaoXiId = await faSongMeiTiXiaoXi(ceShiYongHu.lingPai, jiaoSeId, 'tuPian', tuPian.mediaId)
    await request(yingYong)
      .put(`/api/聊天/会话/${jiaoSeId}/消息/${xiaoXiId}/撤回`)
      .set('Authorization', `Bearer ${ceShiYongHu.lingPai}`)
      .expect(200)

    const liShi = await huoQuZuiJinDuiHuaLiShi(ceShiYongHu.yongHuId, jiaoSeId)
    expect(liShi.some((x) => x.meiTiLeiBie === 'tupian' && x.yi_che_hui)).toBe(true)

    const jiLu: TiaoYongCanShu[] = []
    sheZhiMockTiaoYong(async (canShu) => {
      jiLu.push(canShu)
      return {
        neiRong: '好的呀',
        xinXi: { role: 'assistant', content: 'writer' },
        yuanShuJu: {} as never,
      }
    })

    await shengChengWriterHuiFu(chuangJianAIShuRu(liShi))

    const writerCall = jiLu[0]
    expect(shouJiTouXiangKuaiShu(writerCall.xiaoXi)).toBe(0)
    const quanBuWenBen = writerCall.xiaoXi
      .map((x) => (typeof x.neiRong === 'string' ? x.neiRong : ''))
      .join('\n')
    expect(quanBuWenBen).toContain('[用户撤回了一张图片]')
  })

  it('yuYin与wenJian文本化：[语音(12秒)]与[文件:testfile.pdf]，且不产生图像块', async () => {
    const yuYin = await shangChuanMeiTi(
      ceShiYongHu.lingPai,
      jiaoSeId,
      'yuyin',
      `shijue-yuyin-${Date.now()}`,
      'yuyin.wav',
      'audio/wav',
    )
    await faSongMeiTiXiaoXi(ceShiYongHu.lingPai, jiaoSeId, 'yuYin', yuYin.mediaId)
    await 数据库.query(`UPDATE "媒体文件" SET "时长毫秒" = 12300 WHERE "SHA256" = $1`, [yuYin.sha256])

    const wenJian = await shangChuanMeiTi(
      ceShiYongHu.lingPai,
      jiaoSeId,
      'wenjian',
      `shijue-wenjian-${Date.now()}`,
      'testfile.pdf',
      'application/pdf',
    )
    await faSongMeiTiXiaoXi(ceShiYongHu.lingPai, jiaoSeId, 'wenJian', wenJian.mediaId)

    const liShi = await huoQuZuiJinDuiHuaLiShi(ceShiYongHu.yongHuId, jiaoSeId)
    const yuYinXiang = liShi.find((x) => x.meiTiLeiBie === 'yuyin')
    const wenJianXiang = liShi.find((x) => x.meiTiLeiBie === 'wenjian')
    expect(yuYinXiang?.meiTiSha256).toBeUndefined()
    expect(yuYinXiang?.meiTiMIME).toBeUndefined()
    expect(yuYinXiang?.meiTiShiChangHaoMiao).toBe(12300)
    expect(wenJianXiang?.yuanShiWenJianMing).toBe('testfile.pdf')

    const jiLu: TiaoYongCanShu[] = []
    sheZhiMockTiaoYong(async (canShu) => {
      jiLu.push(canShu)
      return {
        neiRong: '嗯嗯',
        xinXi: { role: 'assistant', content: 'writer' },
        yuanShuJu: {} as never,
      }
    })

    await shengChengWriterHuiFu(chuangJianAIShuRu(liShi))

    const writerCall = jiLu[0]
    expect(shouJiTouXiangKuaiShu(writerCall.xiaoXi)).toBe(0)
    const userNeiRong = writerCall.xiaoXi[1].neiRong
    expect(typeof userNeiRong).toBe('string')
    const promptWenBen = String(userNeiRong)
    expect(promptWenBen).toContain('[语音(12秒)]')
    expect(promptWenBen).toContain('[文件:testfile.pdf]')
  })

  it('检测类调用：最新用户消息为未撤回图片 → 四类检测输入均附input_image且文本兜底为[图片]', async () => {
    const tuPian = await shangChuanMeiTi(
      ceShiYongHu.lingPai,
      jiaoSeId,
      'tupian',
      `shijue-jiance-tupian-${Date.now()}`,
      'jiance.png',
      'image/png',
    )
    await faSongMeiTiXiaoXi(ceShiYongHu.lingPai, jiaoSeId, 'tuPian', tuPian.mediaId)

    const liShi = await huoQuZuiJinDuiHuaLiShi(ceShiYongHu.yongHuId, jiaoSeId)

    const jiLu: TiaoYongCanShu[] = []
    sheZhiMockTiaoYong(async (canShu) => {
      jiLu.push(canShu)
      const xiTongWenBen = String(canShu.xiaoXi[0]?.neiRong ?? '')
      let neiRong = '{}'
      if (xiTongWenBen.includes('表白')) {
        neiRong = JSON.stringify({ 是否表白: false, 表白类型: '非表白', 确信度: 0.1, 理由: '' })
      } else if (xiTongWenBen.includes('互删')) {
        neiRong = JSON.stringify({ 是否互删: false, 确信度: 0.1, 理由: '' })
      } else if (xiTongWenBen.includes('识破')) {
        neiRong = JSON.stringify({ 是否识破: false, 确信度: 0.1, 理由: '' })
      } else if (xiTongWenBen.includes('神经病') || xiTongWenBen.includes('莫名其妙')) {
        neiRong = JSON.stringify({ 是否神经病: false, 人设能接受: true, 确信度: 0.1, 理由: '' })
      }
      return {
        neiRong,
        xinXi: { role: 'assistant', content: neiRong },
        yuanShuJu: {} as never,
      }
    })

    const jieGuo = await jianCeYongHuXiaoXi('', liShi, chuangJianAIJiaoSe())

    expect(jieGuo.biao_bai.shi_fou_biao_bai).toBe(false)
    expect(jiLu.length).toBeGreaterThanOrEqual(4)
    const jianCeYaoQiu: Record<string, string> = {
      表白: '消息内容：[图片]',
      互删: '消息内容：[图片]',
      识破: '消息内容：[图片]',
      莫名其妙: '用户消息：[图片]',
    }
    for (const [guanJianCi_, biaoJi] of Object.entries(jianCeYaoQiu)) {
      const muBiao = jiLu.find(
        (c) => String(c.xiaoXi[0]?.neiRong ?? '').includes(guanJianCi_),
      )
      expect(muBiao).toBeDefined()
      const userNeiRong = muBiao!.xiaoXi[1].neiRong
      expect(shiHanTuXiangKuai(userNeiRong)).toBe(true)
      const kuai = userNeiRong as DuiHuaKuai[]
      expect(kuai.some((k) => k.type === 'input_image' && (k.image_url as string).startsWith('data:image/png;base64,'))).toBe(true)
      expect(kuai.some((k) => k.type === 'input_text' && k.text.includes(biaoJi))).toBe(true)
    }
  })

  it('军师Prompt对非文本消息文本化描述且不注入图像数据', async () => {
    const tuPian = await shangChuanMeiTi(
      ceShiYongHu.lingPai,
      jiaoSeId,
      'tupian',
      `shijue-junshi-tupian-${Date.now()}`,
      'junshi.png',
      'image/png',
    )
    const biaoQing = await shangChuanMeiTi(
      ceShiYongHu.lingPai,
      jiaoSeId,
      'biaoqingshu',
      `shijue-junshi-biaoqing-${Date.now()}`,
      'junshi.png',
      'image/png',
    )
    await faSongMeiTiXiaoXi(ceShiYongHu.lingPai, jiaoSeId, 'tuPian', tuPian.mediaId)
    await faSongMeiTiXiaoXi(ceShiYongHu.lingPai, jiaoSeId, 'biaoQingBao', biaoQing.mediaId)

    const liShi = await huoQuZuiJinDuiHuaLiShi(ceShiYongHu.yongHuId, jiaoSeId)

    const jiLu: TiaoYongCanShu[] = []
    sheZhiMockTiaoYong(async (canShu) => {
      jiLu.push(canShu)
      return {
        neiRong: '先损你两句，然后给建议。',
        xinXi: { role: 'assistant', content: 'junshi' },
        yuanShuJu: {} as never,
      }
    })

    await shengChengJunShiZhiDao({
      yong_hu_id: ceShiYongHu.yongHuId,
      jiao_se_id: jiaoSeId,
      jiao_se_ming: '雨夜的猫',
      dui_hua_li_shi: liShi,
      hao_gan_du: chuangJianHaoGanDu(),
      jun_shi_pei_zhi: {
        id: JUN_SHI_PEI_ZHI_MO_REN.id,
        mingCheng: JUN_SHI_PEI_ZHI_MO_REN.mingCheng,
        xiTongTiShi: JUN_SHI_PEI_ZHI_MO_REN.xiTongTiShi,
      },
    })

    const junShiTiaoYong = jiLu.find((ji) => ji.zuiDaTokens === 64000)
    expect(junShiTiaoYong).toBeDefined()
    expect(shouJiTouXiangKuaiShu(junShiTiaoYong!.xiaoXi)).toBe(0)
    const junShiPrompt = huoQuUserWenBen(junShiTiaoYong!)
    expect(junShiPrompt).toContain('[图片]')
    expect(junShiPrompt).toContain('[表情包]')
  })

  it('复盘Prompt对非文本消息文本化描述（编号消息列表出现[图片]）', async () => {
    await 数据库.query(
      `DELETE FROM "游戏档案" WHERE "用户ID" = $1 AND "角色ID" = $2`,
      [ceShiYongHu.yongHuId, jiaoSeId],
    )
    const dangAnId = uuidV4()
    await 数据库.query(
      `INSERT INTO "游戏档案" (
        "ID", "用户ID", "角色ID", "角色名字", "是否渣型", "结果类型",
        "是否封存", "好感度总分", "关系阶段", "聊天天数", "消息总数"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        dangAnId,
        ceShiYongHu.yongHuId,
        jiaoSeId,
        '小雨',
        false,
        'sheng_li_ai_qing',
        true,
        850,
        'reLian',
        3,
        6,
      ],
    )

    await request(yingYong)
      .post(`/api/聊天/会话/${jiaoSeId}/消息`)
      .set('Authorization', `Bearer ${ceShiYongHu.lingPai}`)
      .send({ neiRong: '先说句话' })
      .expect(200)
    const tuPian = await shangChuanMeiTi(
      ceShiYongHu.lingPai,
      jiaoSeId,
      'tupian',
      `shijue-fupan-tupian-${Date.now()}`,
      'fupan.png',
      'image/png',
    )
    await faSongMeiTiXiaoXi(ceShiYongHu.lingPai, jiaoSeId, 'tuPian', tuPian.mediaId)

    const jiLu: TiaoYongCanShu[] = []
    sheZhiMockTiaoYong(async (canShu) => {
      jiLu.push(canShu)
      const wenBen = huoQuUserWenBen(canShu)
      const neiRong = wenBen.includes('【角色基本信息】')
        ? JSON.stringify({
            pi_zhu: [{ xu_hao: 2, pi_zhu_nei_rong: '这张图发得挺自然。', qing_gan: '积极' }],
            zong_jie: {
              dui_xiang_lei_xing: '正常',
              yong_hu_biao_xian: '表现自然',
              guan_jian_zhuan_zhe_dian: '发了图片拉近距离',
              gai_jin_jian_yi: '继续保持',
            },
          })
        : '[]'
      return {
        neiRong,
        xinXi: { role: 'assistant', content: neiRong },
        yuanShuJu: {} as never,
      }
    })

    await shengChengFuPan(ceShiYongHu.yongHuId, jiaoSeId, dangAnId)

    const fuPanCall = jiLu.find((c) => huoQuUserWenBen(c).includes('【完整聊天记录'))
    expect(fuPanCall).toBeDefined()
    const fuPanPrompt = huoQuUserWenBen(fuPanCall!)
    expect(fuPanPrompt).toContain('[图片]')
    expect(shouJiTouXiangKuaiShu(fuPanCall!.xiaoXi)).toBe(0)
  })

  describe('token预算保护', () => {
    it('图像内容块按384计入：预算891不裁剪、预算890裁剪最旧文本而保留图片', () => {
      const xiTong: DuiHuaXiaoXi = { jiaoSe: 'system', neiRong: 'sys' }
      const jiuWenBen: DuiHuaXiaoXi = { jiaoSe: 'user', neiRong: 'a'.repeat(1000) }
      const tuPianXiaoXi: DuiHuaXiaoXi = {
        jiaoSe: 'user',
        neiRong: [{ type: 'input_image', image_url: 'data:image/png;base64,x' }],
      }
      const xinWenBen: DuiHuaXiaoXi = { jiaoSe: 'user', neiRong: 'b'.repeat(10) }

      const weiChao = yuSuanBaoHu([xiTong, jiuWenBen, tuPianXiaoXi, xinWenBen], 891)
      expect(weiChao).toHaveLength(4)

      const yiChao = yuSuanBaoHu([xiTong, jiuWenBen, tuPianXiaoXi, xinWenBen], 890)
      expect(yiChao).toHaveLength(3)
      expect(yiChao[0]).toBe(xiTong)
      expect(yiChao).not.toContain(jiuWenBen)
      expect(yiChao).toContain(tuPianXiaoXi)
      expect(yiChao[yiChao.length - 1]).toBe(xinWenBen)

      const chunWenBenZong = yuSuanBaoHu([xiTong, jiuWenBen, xinWenBen], 890)
      expect(chunWenBenZong).toHaveLength(3)
    })
  })
})
