/* eslint-disable no-console -- CLI脚本console为唯一输出通道 */
// 镜像内唯一迁移入口：生产镜像只 COPY 本文件（见 backend/Dockerfile），故保持零依赖。
// 台账校验和口径与 scripts/迁移器.ts 的 计算迁移校验和 必须逐字符一致，
// 由 scripts/__tests__/迁移台账校验和.test.ts 的 parity 用例把守。
const { resolve } = require('path');
const { Pool } = require('pg');
const { readFileSync, readdirSync } = require('fs');
const { createHash } = require('crypto');

function 计算校验和(sql) {
  // 行尾归一为 LF 后 trim：同一内容在 Windows/Linux/镜像检出下算出同一个值
  return createHash('sha256').update(sql.replace(/\r\n?/g, '\n').trim()).digest('hex');
}

// 另一种行尾形态下按字节直算（旧口径），仅用于区分「仅行尾」与「内容变更」
function 字节校验和(sql) {
  return createHash('sha256').update(sql.trim()).digest('hex');
}

function 行尾变体校验和(sql) {
  const 另一种行尾 = /\r/.test(sql) ? sql.replace(/\r\n?/g, '\n') : sql.replace(/\n/g, '\r\n');
  return 字节校验和(另一种行尾);
}

function 读取迁移文件(迁移目录) {
  return readdirSync(迁移目录).filter((f) => f.endsWith('.sql')).sort().map((文件名) => ({
    版本: 文件名.split('_')[0],
    文件名,
    sql: readFileSync(resolve(迁移目录, 文件名), 'utf-8'),
  }));
}

function 比对台账(文件清单, 已执行) {
  return 文件清单.map((文件) => {
    const 当前校验和 = 计算校验和(文件.sql);
    const 台账校验和 = 已执行.has(文件.版本) ? 已执行.get(文件.版本) : null;
    let 差异;
    if (台账校验和 === null) 差异 = '未登记';
    else if (台账校验和 === 当前校验和) 差异 = '一致';
    else if (台账校验和 === 行尾变体校验和(文件.sql)) 差异 = '仅行尾';
    else 差异 = '内容变更';
    return { 版本: 文件.版本, 文件名: 文件.文件名, 台账校验和, 当前校验和, 差异 };
  });
}

async function 取台账(数据库) {
  const 记录 = await 数据库.query('SELECT version, checksum FROM "schema_migrations"');
  const 已执行 = new Map();
  for (const 行 of 记录.rows) 已执行.set(行.version, 行.checksum);
  return 已执行;
}

async function 确保版本表存在(数据库) {
  await 数据库.query('CREATE TABLE IF NOT EXISTS "schema_migrations" (version VARCHAR PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW(), checksum VARCHAR NOT NULL)');
}

function 打印台账差异(条目) {
  const 变动 = 条目.filter((项) => 项.差异 !== '一致');
  if (变动.length === 0) {
    console.log(`台账与文件逐条一致（${条目.length} 个版本），无需 re-baseline`);
    return;
  }
  console.log(`存在 ${变动.length} 个不一致版本（共 ${条目.length} 个）：`);
  for (const 项 of 变动) {
    console.log(`  [${项.差异}] ${项.版本} ${项.文件名}`);
    console.log(`      台账: ${项.台账校验和 === null ? '(未登记)' : 项.台账校验和}`);
    console.log(`      文件: ${项.当前校验和}`);
  }
  const 未登记 = 变动.filter((项) => 项.差异 === '未登记');
  if (未登记.length > 0) {
    console.log(`注意：${未登记.map((项) => 项.版本).join(', ')} 未在台账中，re-baseline 不会登记它们——必须由迁移真跑一遍。`);
  }
}

// 一次性 re-baseline：只 UPDATE 已登记版本的 checksum，绝不 INSERT（否则就成了跳过迁移的后门）；
// 写入包在单事务 + advisory 锁里，要么全改要么全不改。与 迁移器.ts::重新登记校验和 同语义。
async function 重新登记校验和(数据库, 迁移目录, 应用) {
  await 确保版本表存在(数据库);
  const 条目 = 比对台账(读取迁移文件(迁移目录), await 取台账(数据库));
  if (!应用) return { 条目, 已更新: 0 };
  const 待更新 = 条目.filter((项) => 项.台账校验和 !== null && 项.差异 !== '一致');
  if (待更新.length === 0) return { 条目, 已更新: 0 };
  const 客户端 = await 数据库.connect();
  try {
    await 客户端.query('BEGIN');
    await 客户端.query('SELECT pg_advisory_xact_lock(987654321)');
    for (const 项 of 待更新) {
      await 客户端.query('UPDATE "schema_migrations" SET checksum = $1 WHERE version = $2', [项.当前校验和, 项.版本]);
    }
    await 客户端.query('COMMIT');
  } catch (错误) {
    await 客户端.query('ROLLBACK');
    throw new Error('re-baseline 写入失败（台账未变更）: ' + (错误 instanceof Error ? 错误.message : String(错误)));
  } finally {
    客户端.release();
  }
  return { 条目, 已更新: 待更新.length };
}

async function 执行迁移(数据库, 迁移目录) {
  await 确保版本表存在(数据库);
  const 已执行 = await 取台账(数据库);
  let 已执行计数 = 0;
  let 已跳过计数 = 0;
  for (const 文件 of 读取迁移文件(迁移目录)) {
    const 版本 = 文件.版本;
    const 校验和 = 计算校验和(文件.sql);
    const 旧 = 已执行.get(版本);
    if (旧 !== undefined) {
      if (旧 !== 校验和) {
        throw new Error('迁移 ' + 版本 + ' 校验和不匹配：数据库记录 ' + 旧 + '，文件当前 ' + 校验和 + '。已应用的迁移内容被改动过；确认无误后才可由运维显式执行 run_migration --rebaseline --apply 重新登记');
      }
      已跳过计数++;
      continue;
    }
    const 客户端 = await 数据库.connect();
    try {
      await 客户端.query('BEGIN');
      await 客户端.query('SELECT pg_advisory_xact_lock(987654321)');
      await 客户端.query(文件.sql);
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
  return { 已执行: 已执行计数, 已跳过: 已跳过计数 };
}

async function main() {
  const 参数 = process.argv.slice(2);
  const 位置参数 = 参数.find((项) => !项.startsWith('--'));
  const 迁移目录 = 位置参数 ? resolve(位置参数) : resolve(__dirname, '../database/migrations');
  const 连接串 = process.env.DATABASE_URL;
  if (!连接串) {
    console.error('迁移失败: 缺少 DATABASE_URL');
    process.exitCode = 1;
    return;
  }
  const 数据库 = new Pool({ connectionString: 连接串 });
  const 重新登记 = 参数.includes('--rebaseline');
  console.log('迁移目录: ' + 迁移目录);
  try {
    if (重新登记) {
      const 应用 = 参数.includes('--apply');
      console.log(应用 ? 're-baseline（写入台账）...' : 're-baseline 预演（dry-run，不写库）...');
      const 结果 = await 重新登记校验和(数据库, 迁移目录, 应用);
      打印台账差异(结果.条目);
      console.log(应用 ? `re-baseline 完成: 已重新登记 ${结果.已更新} 个版本的校验和` : '未写库。确认 diff 无误后加 --apply 才会更新台账');
      process.exitCode = 0;
    } else {
      console.log('开始执行数据库迁移...');
      const 结果 = await 执行迁移(数据库, 迁移目录);
      console.log(`迁移完成: 已执行 ${结果.已执行} 个, 已跳过 ${结果.已跳过} 个`);
      process.exitCode = 0;
    }
  } catch (错误) {
    console.error('迁移失败:', 错误 instanceof Error ? 错误.message : String(错误));
    process.exitCode = 1;
  } finally {
    // 用 exitCode + 自然退出替代 process.exit()：后者在管道（docker logs / entrypoint）下
    // 会截断尚未 flush 的 diff 输出。
    try { await 数据库.end(); } catch (_) { /* 忽略：不得覆盖原始失败原因 */ }
  }
}

module.exports = { 计算校验和, 字节校验和, 读取迁移文件, 比对台账, 执行迁移, 重新登记校验和 };

if (require.main === module) {
  main();
}
