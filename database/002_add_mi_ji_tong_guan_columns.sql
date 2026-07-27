-- 和我恋爱吧 - 迁移 002：游戏档案新增秘籍通关相关字段
-- PostgreSQL 16
-- 中文标识符用双引号包裹
-- 用途（对应需求12 / 需求11）：
--   1. 秘籍（whosyourdaddy）通关时，需要把游戏档案标记为「是否秘籍通关」，
--      并快照秘籍使用前的真实好感度总分（秘籍前好感度），供复盘仅评秘籍前表现。
--   2. 该迁移仅针对已存在数据库；全新初始化请直接使用 001_init.sql（已含下列两列）。

ALTER TABLE "游戏档案" ADD COLUMN IF NOT EXISTS "是否秘籍通关" BOOLEAN DEFAULT FALSE;
ALTER TABLE "游戏档案" ADD COLUMN IF NOT EXISTS "秘籍前好感度" INTEGER;

CREATE INDEX IF NOT EXISTS idx_游戏档案_是否秘籍通关 ON "游戏档案" ("是否秘籍通关");
