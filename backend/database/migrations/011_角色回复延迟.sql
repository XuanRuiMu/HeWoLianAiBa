-- 和我恋爱吧 - 数据库迁移 011
-- 角色回复延迟：AI 回复等待时长由人物画像在生成角色时计算并固定落库（8~12 秒区间）

ALTER TABLE "角色" ADD COLUMN IF NOT EXISTS "回复延迟毫秒" INTEGER NOT NULL DEFAULT 10000;
