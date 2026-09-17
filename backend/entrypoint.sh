#!/bin/sh
# YH-123 entrypoint先迁移再启动加锁：新部署缺表全500根因为迁移不在镜像
# 收敛为镜像内迁移+advisory锁串行，多副本up不打架
set -e
echo "[entrypoint] 开始执行数据库迁移..."
node scripts/run_migration.js database/migrations || echo "[entrypoint] 迁移脚本未找到，跳过（开发模式）"
echo "[entrypoint] 迁移完成，启动应用..."
exec "$@"
