'use strict'

const path = require('node:path')
const fs = require('node:fs')

const 后端根 = path.resolve(__dirname, '..')
const 项目根 = path.resolve(后端根, '..')
require('dotenv').config({ path: path.join(后端根, '.env') })
const { Pool } = require('pg')

const 数据目录 = path.join(项目根, '测试报告', '真实用户模拟')
const 指定时间 = process.env.报告时间

async function main() {
  const 总数据 = JSON.parse(fs.readFileSync(path.join(数据目录, '总数据.json'), 'utf8'))
  const 运行标识 = 指定时间 || 总数据.运行标识
  const 池 = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 })
  const 结果 = { 运行标识, 局: {} }
  try {
    for (const 标识 of ['E局', 'I局']) {
      const 文件 = path.join(数据目录, `${运行标识}-${标识}.json`)
      if (!fs.existsSync(文件)) continue
      const 报告 = JSON.parse(fs.readFileSync(文件, 'utf8'))
      const 会话标识 = 报告.会话?.会话标识 || 报告.角色?.角色?.id
      if (!会话标识) {
        结果.局[标识] = { 错误: '找不到会话标识', 会话标识: null }
        continue
      }
      const 角色查询 = await 池.query(
        'SELECT "ID", "名字", "性别", "是否渣型", "MBTI", "封存", "可继续聊天", "结局状态", "结局文案", "创建时间", "头像", "头像描述", "头像版本", "头像变更时间", "情绪基调" FROM "角色" WHERE "公开编号" = $1 LIMIT 1',
        [会话标识],
      )
      if (角色查询.rows.length === 0) {
        结果.局[标识] = { 错误: '数据库无此角色', 会话标识 }
        continue
      }
      const 角色 = 角色查询.rows[0]
      const 历史 = await 池.query(
        `SELECT "信任度变化", "亲密度变化", "趣味度变化", "关怀度变化", "总分变化", "创建时间"
         FROM "好感度变化历史" WHERE "角色ID" = $1 ORDER BY "创建时间" ASC`,
        [角色.ID],
      )
      const 好感 = await 池.query(
        'SELECT "信任度", "亲密度", "趣味度", "关怀度", "总分", "关系阶段", "互动次数" FROM "好感度" WHERE "角色ID" = $1 LIMIT 1',
        [角色.ID],
      )
      const 消息统计 = await 池.query(
        `SELECT "发送者", count(*)::int AS 条数 FROM "消息" WHERE "角色ID" = $1 GROUP BY "发送者"`,
        [角色.ID],
      )
      const 表情消息 = await 池.query(
        `SELECT count(*)::int AS 条数 FROM "消息" WHERE "角色ID" = $1 AND "发送者" = 'jiaose' AND "类型" = 'biaoQingBao'`,
        [角色.ID],
      )
      const 结局 = await 池.query(
        'SELECT * FROM "游戏结局" WHERE "角色ID" = $1 LIMIT 1',
        [角色.ID],
      ).catch(() => ({ rows: [] }))
      const 档案 = await 池.query(
        'SELECT * FROM "游戏档案" WHERE "角色ID" = $1 LIMIT 1',
        [角色.ID],
      ).catch(() => ({ rows: [] }))
      let 累计 = { 信任度: 0, 亲密度: 0, 趣味度: 0, 关怀度: 0, 总分: 0 }
      for (const 行 of 历史.rows) {
        累计.信任度 += Number(行.信任度变化) || 0
        累计.亲密度 += Number(行.亲密度变化) || 0
        累计.趣味度 += Number(行.趣味度变化) || 0
        累计.关怀度 += Number(行.关怀度变化) || 0
        累计.总分 += Number(行.总分变化) || 0
      }
      结果.局[标识] = {
        会话标识,
        角色ID: 角色.ID,
        角色名: 角色.名字,
        性别: 角色.性别,
        是否渣型: 角色.是否渣型,
        MBTI: 角色.MBTI,
        封存: 角色.封存,
        可继续聊天: 角色.可继续聊天,
        结局状态: 角色.结局状态,
        结局文案: 角色.结局文案,
        头像: 角色.头像,
        头像描述: 角色.头像描述,
        头像版本: 角色.头像版本,
        头像变更时间: 角色.头像变更时间,
        情绪基调: 角色.情绪基调,
        好感度当前: 好感.rows[0] || null,
        变化历史条数: 历史.rows.length,
        累计变化: 累计,
        逐条变化: 历史.rows.map((行) => ({
          信任: Number(行.信任度变化) || 0,
          亲密: Number(行.亲密度变化) || 0,
          趣味: Number(行.趣味度变化) || 0,
          关怀: Number(行.关怀度变化) || 0,
          总分: Number(行.总分变化) || 0,
          时间: 行.创建时间,
        })),
        消息统计: 消息统计.rows,
        表情消息条数: 表情消息.rows[0]?.条数 ?? 0,
        结局记录: 结局.rows[0] || null,
        游戏档案: 档案.rows[0] || null,
      }
    }
  } finally {
    await 池.end()
  }
  const 输出 = path.join(数据目录, `数据库补齐-${运行标识}.json`)
  fs.writeFileSync(输出, JSON.stringify(结果, null, 2))
  console.log(JSON.stringify(结果, null, 2))
  console.log(`\n[已写入] ${输出}`)
}

main().catch((错误) => {
  console.error(String(错误))
  process.exitCode = 1
})
