#!/bin/sh
# YH-123 entrypoint先迁移再启动加锁：新部署缺表全500根因为迁移不在镜像
# 收敛为镜像内迁移+advisory锁串行，多副本up不打架
# FP-15：迁移失败一律中止启动（旧版 `|| echo 跳过` 把校验和不匹配/连接失败
# 吞成"跳过（开发模式）"，坏基线静默上线）。本脚本是镜像 ENTRYPOINT，
# 先于 CMD(node dist/server.js) 同步执行：迁移不通就不 exec，容器退出并由
# restart: unless-stopped 反复重启，compose healthcheck 恒不为 healthy。
set -e

if [ ! -f scripts/run_migration.js ]; then
  echo "[entrypoint] DOCKER_STARTUP_MIGRATION_SCRIPT_MISSING: 镜像内缺少数据库迁移执行文件，启动中止" >&2
  exit 1
fi

echo "[entrypoint] 开始执行数据库迁移..."
if ! node scripts/run_migration.js database/migrations; then
  echo "[entrypoint] DOCKER_STARTUP_MIGRATION_FAILED: 数据库迁移未成功完成，应用启动已中止（见上一条迁移失败原因）。" >&2
  echo "[entrypoint] 若报「校验和不匹配」，说明已应用的迁移文件被改过：先核对内容，" >&2
  echo "[entrypoint] 确认可信后由运维显式执行 node scripts/run_migration.js database/migrations --rebaseline --apply。" >&2
  exit 1
fi

echo "[entrypoint] 迁移完成，启动应用..."
exec "$@"
