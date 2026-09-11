import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { sheZhiKaiChangBaiMock } from '../services/开场白生成'
import { sheZhiMockTiaoYong, chongZhiDeepSeekKeHuDuan } from '../utils/DeepSeek客户端'

function suiJiShouJiHao(): string {
  return `136${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

async function qingLiCeShiYongHu(shouJiHao: string): Promise<void> {
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  await redis.del(`yan_zheng_ma:${shouJiHao}`)
  await redis.del(`fa_song_jian_ge:${shouJiHao}`)
}

describe('M6 消息分页keyset化', () => {
  let lingPai = ''
  let yongHuId = ''
  let jiaoSeId = ''
  const shouJiHao = suiJiShouJiHao()

  beforeAll(async () => {
    // 阻止开场白生成器写入额外消息，保证序号可控
    sheZhiKaiChangBaiMock(() => ({ xiao_xi_lie_biao: [] }))
    await qingLiCeShiYongHu(shouJiHao)
    await request(yingYong).post('/api/认证/发送码').send({ shouJiHao }).expect(200)
    const zhuCeXiangYing = await request(yingYong)
      .post('/api/认证/注册')
      .send({
        shouJiHao,
        yanZhengMa: '123456',
        yongHuMing: `分页测试${Date.now()}`,
        miMa: 'testPassword123',
        tongYiXieYi: true,
        chuShengRiQi: '2000-01-01',
      })
      .expect(200)
    lingPai = zhuCeXiangYing.body.shu_ju.令牌

    const shengChengXiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'INFP' })
      .expect(200)
    const queRenXiangYing = await request(yingYong)
      .post('/api/生成角色/确认')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ xuanZhongJiaoSe: shengChengXiangYing.body.shu_ju })
      .expect(200)
    jiaoSeId = String(queRenXiangYing.body.shu_ju.id)

    const yongHu = await 数据库.query(`SELECT "ID" FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
    yongHuId = String(yongHu.rows[0].ID)

    // 直接写入 25 条带序号消息 + 2 条 NULL 序号消息（NULLS LAST 落在末尾）
    const qiShiJieGuo = await 数据库.query(
      `SELECT COALESCE(MAX("客户端序号"), 0) as zui_da FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
      [yongHuId, jiaoSeId],
    )
    const qiShiXuHao = Number(qiShiJieGuo.rows[0].zui_da)
    for (let i = 1; i <= 25; i++) {
      await 数据库.query(
        `INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读", "客户端序号")
         VALUES ($1, $2, $3, 'yonghu', 'wenben', true, $4)`,
        [yongHuId, jiaoSeId, `消息${i}`, qiShiXuHao + i],
      )
    }
    await 数据库.query(
      `INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读")
       VALUES ($1, $2, '无序号A', 'jiaose', 'wenben', true)`,
      [yongHuId, jiaoSeId],
    )
    await 数据库.query(
      `INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读")
       VALUES ($1, $2, '无序号B', 'jiaose', 'wenben', true)`,
      [yongHuId, jiaoSeId],
    )
  })

  beforeEach(() => {
    sheZhiKaiChangBaiMock(() => ({ xiao_xi_lie_biao: [] }))
    chongZhiDeepSeekKeHuDuan()
    sheZhiMockTiaoYong(async () => ({
      neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {} as never,
    }))
  })

  afterAll(async () => {
    sheZhiKaiChangBaiMock(null)
    await 数据库.query(`DELETE FROM "记忆" WHERE "用户ID" = $1`, [yongHuId])
    await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [yongHuId])
    await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [yongHuId])
    await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [yongHuId])
    await 数据库.query(`DELETE FROM "游戏档案" WHERE "用户ID" = $1`, [yongHuId])
    await qingLiCeShiYongHu(shouJiHao)
    await 数据库.end()
    await redis.quit()
  })

  function lieBiaoXuHao(lieBiao: Array<{ ke_hu_duan_xu_hao?: number | null }>): Array<number | null> {
    return lieBiao.map((m) => (m.ke_hu_duan_xu_hao ?? null))
  }

  it('首页返回最新一页并标记还有更多，zong_shu 正确', async () => {
    const xiangYing = await request(yingYong)
      .get(`/api/聊天/会话/${jiaoSeId}/消息?ye_ma=1&mei_ye_tiao_shu=10`)
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)
    const shuJu = xiangYing.body.shu_ju
    expect(shuJu.zong_shu).toBe(27)
    expect(shuJu.hai_you_geng_duo).toBe(true)
    expect(lieBiaoXuHao(shuJu.lie_biao)).toEqual([25, 24, 23, 22, 21, 20, 19, 18, 17, 16])
  })

  it('携带游标请求下一页不使用OFFSET且结果无缝衔接', async () => {
    const diYiYe = await request(yingYong)
      .get(`/api/聊天/会话/${jiaoSeId}/消息?ye_ma=1&mei_ye_tiao_shu=10`)
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)
    const moTiao = diYiYe.body.shu_ju.lie_biao[diYiYe.body.shu_ju.lie_biao.length - 1]

    const diErYe = await request(yingYong)
      .get(
        `/api/聊天/会话/${jiaoSeId}/消息?mei_ye_tiao_shu=10` +
          `&you_biao_xu_hao=${moTiao.ke_hu_duan_xu_hao}` +
          `&you_biao_shi_jian_chuo=${moTiao.shi_jian_chuo}` +
          `&you_biao_id=${moTiao.id}`,
      )
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)

    const xuHao = lieBiaoXuHao(diErYe.body.shu_ju.lie_biao)
    expect(xuHao.slice(0, 5)).toEqual([15, 14, 13, 12, 11])
    // 第二页与第一页无重叠
    const diYiYeXuHao = lieBiaoXuHao(diYiYe.body.shu_ju.lie_biao)
    for (const x of xuHao) {
      expect(diYiYeXuHao).not.toContain(x)
    }
  })

  it('翻到最后一页时 NULL 序号消息落在末尾且 hai_you_geng_duo 为 false', async () => {
    const diYiYe = await request(yingYong)
      .get(`/api/聊天/会话/${jiaoSeId}/消息?ye_ma=1&mei_ye_tiao_shu=10`)
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)
    let moTiao = diYiYe.body.shu_ju.lie_biao[diYiYe.body.shu_ju.lie_biao.length - 1]
    const leiJiaZai: Array<number | null> = []
    let haiYouGengDuo = true
    for (let lun = 0; lun < 5 && haiYouGengDuo; lun++) {
      const canShu = new URLSearchParams({ mei_ye_tiao_shu: '10' })
      if (moTiao.ke_hu_duan_xu_hao != null) {
        canShu.set('you_biao_xu_hao', String(moTiao.ke_hu_duan_xu_hao))
      }
      canShu.set('you_biao_shi_jian_chuo', String(moTiao.shi_jian_chuo))
      canShu.set('you_biao_id', moTiao.id)
      const ye = await request(yingYong)
        .get(`/api/聊天/会话/${jiaoSeId}/消息?${canShu.toString()}`)
        .set('Authorization', `Bearer ${lingPai}`)
        .expect(200)
      const shuJu = ye.body.shu_ju
      leiJiaZai.push(...lieBiaoXuHao(shuJu.lie_biao))
      haiYouGengDuo = Boolean(shuJu.hai_you_geng_duo)
      if (shuJu.lie_biao.length > 0) {
        moTiao = shuJu.lie_biao[shuJu.lie_biao.length - 1]
      }
    }
    // 全量遍历：首页10条 + 游标续页17条 = 27条；末尾两条为 NULL 序号
    expect(leiJiaZai.length).toBe(17)
    expect(haiYouGengDuo).toBe(false)
    expect(leiJiaZai[leiJiaZai.length - 2]).toBeNull()
    expect(leiJiaZai[leiJiaZai.length - 1]).toBeNull()
  }, 30000)

  it('写入新消息后总数缓存失效且 zong_shu 更新', async () => {
    const huanCunJian = `xiao_xi_zong_shu:${yongHuId}:${jiaoSeId}`
    await request(yingYong)
      .get(`/api/聊天/会话/${jiaoSeId}/消息?ye_ma=1&mei_ye_tiao_shu=1`)
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)
    expect(await redis.get(huanCunJian)).toBe('27')

    await request(yingYong)
      .post(`/api/聊天/会话/${jiaoSeId}/消息`)
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ neiRong: '缓存失效测试', leiXing: 'wenben' })
      .expect(200)

    expect(await redis.get(huanCunJian)).toBeNull()
    const xiangYing = await request(yingYong)
      .get(`/api/聊天/会话/${jiaoSeId}/消息?ye_ma=1&mei_ye_tiao_shu=1`)
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)
    expect(xiangYing.body.shu_ju.zong_shu).toBe(28)
  })
})
