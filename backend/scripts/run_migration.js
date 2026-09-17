/* eslint-disable no-console -- CLI脚本console为唯一输出通道 */
const { resolve } = require('path');
const { Pool } = require('pg');
const { readFileSync, readdirSync } = require('fs');
const { createHash } = require('crypto');

function 计算校验和(sql) {
  return createHash('sha256').update(sql.trim()).digest('hex');
}

async function main() {
  const 迁移目录 = process.argv[2] ? resolve(process.argv[2]) : resolve(__dirname, '../database/migrations');
  const 连接串 = process.env.DATABASE_URL;
  if (!连接串) {
    console.error('迁移失败: 缺少 DATABASE_URL');
    process.exit(1);
  }
  const 数据库 = new Pool({ connectionString: 连接串 });
  console.log('开始执行数据库迁移...');
  console.log('迁移目录: ' + 迁移目录);
  try {
    await 数据库.query('CREATE TABLE IF NOT EXISTS "schema_migrations" (version VARCHAR PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW(), checksum VARCHAR NOT NULL)');
    const 已执行 = new Map();
    const 记录 = await 数据库.query('SELECT version, checksum FROM "schema_migrations"');
    for (const 行 of 记录.rows) 已执行.set(行.version, 行.checksum);
    const 文件列表 = readdirSync(迁移目录).filter((f) => f.endsWith('.sql')).sort();
    let 已执行计数 = 0;
    let 已跳过计数 = 0;
    for (const 文件名 of 文件列表) {
      const 版本 = 文件名.split('_')[0];
      const sql = readFileSync(resolve(迁移目录, 文件名), 'utf-8');
      const 校验和 = 计算校验和(sql);
      const 旧 = 已执行.get(版本);
      if (旧) {
        if (旧 !== 校验和) throw new Error('迁移 ' + 版本 + ' 校验和不匹配');
        已跳过计数++;
        continue;
      }
      const 客户端 = await 数据库.connect();
      try {
        await 客户端.query('BEGIN');
        await 客户端.query('SELECT pg_advisory_xact_lock(987654321)');
        await 客户端.query(sql);
        await 客户端.query('INSERT INTO "schema_migrations" (version, checksum) VALUES ($1, $2)', [版本, 校验和]);
        await 客户端.query('COMMIT');
        已执行计数++;
      } catch (错误) {
        await 客户端.query('ROLLBACK');
        throw new Error('迁移 ' + 版本 + ' 执行失败: ' + (错误 instanceof Error ? 错误.message : String(错误)));
      } finally {
        客户端.release();
      }
    }
    console.log('迁移完成: 已执行 ' + 已执行计数 + ' 个, 已跳过 ' + 已跳过计数 + ' 个');
    await 数据库.end();
    process.exit(0);
  } catch (错误) {
    console.error('迁移失败:', 错误 instanceof Error ? 错误.message : String(错误));
    try { await 数据库.end(); } catch (_) { /* 忽略 */ }
    process.exit(1);
  }
}

main();
