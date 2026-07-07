require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('数据库已连接');
    await client.query('BEGIN');
    const sql = fs.readFileSync(path.join(__dirname, 'database', 'init.sql'), 'utf-8');
    await client.query(sql);
    await client.query('ROLLBACK');
    console.log('init.sql 语法验证通过（已回滚，未修改数据）');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('init.sql 执行失败:', err.message || err);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
