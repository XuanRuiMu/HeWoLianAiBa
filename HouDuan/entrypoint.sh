#!/bin/sh

set -e

if [ ! -f scripts/run_migration.js ]; then
  echo "[entrypoint] DOCKER_STARTUP_MIGRATION_SCRIPT_MISSING: 镜像内缺少数据库迁移执行文件，启动中止" >&2
  exit 1
fi

echo "[entrypoint] 开始执行数据库迁移..."
if ! node scripts/run_migration.js QianYi/migrations; then
  echo "[entrypoint] DOCKER_STARTUP_MIGRATION_FAILED: 数据库迁移未成功完成，应用启动已中止（见上一条迁移失败原因）。" >&2
  echo "[entrypoint] 若报「校验和不匹配」，说明已应用的迁移文件被改过：先核对内容，" >&2
  echo "[entrypoint] 确认可信后由运维显式执行 node scripts/run_migration.js QianYi/migrations --rebaseline --apply。" >&2
  exit 1
fi

echo "[entrypoint] 迁移完成，启动应用..."
exec "$@"
