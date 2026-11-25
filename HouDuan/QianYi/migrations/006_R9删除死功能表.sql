-- R9 彻底删除死功能：记忆、对话摘要、复盘条目相关表
-- 这些表从未被真实填充/使用，Prompt 第 3/6 层恒为占位文案

DROP TABLE IF EXISTS "记忆" CASCADE;
DROP TABLE IF EXISTS "对话摘要" CASCADE;

-- 复盘条目存储在 Redis 中，无需删除 PostgreSQL 表
-- 军师指导记录、哈希、状态也存储在 Redis 中

-- 删除相关索引（随表自动删除，显式列出以便审计）
DROP INDEX IF EXISTS idx_记忆_用户ID_角色ID;
DROP INDEX IF EXISTS idx_记忆_过期时间;
DROP INDEX IF EXISTS idx_对话摘要_用户ID_角色ID;