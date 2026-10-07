-- FP-14（账号设置聊天预览接入真实聊天背景）数据层前置：`用户设置` 聊天背景拆成浅色/深色两槽
--
-- 旧口径：`聊天背景` 单列，浅色/深色模式共用同一背景，设置页无法分别配置。
-- 新口径：新增 `聊天背景浅色`、`聊天背景深色` 两列；两列缺失时由应用层回落 `聊天背景`。
-- 两新列纯增量 ADD COLUMN IF NOT EXISTS，幂等；backfill 只在新列为空串时回填旧列值，重复执行零变更。
-- 保留旧列 `聊天背景` 不删：旧客户端 PUT 仅写两槽等值、GET 仍返回旧字段作兼容回落，与 017 气泡两列同族处理。

ALTER TABLE "用户设置" ADD COLUMN IF NOT EXISTS "聊天背景浅色" TEXT NOT NULL DEFAULT '';
ALTER TABLE "用户设置" ADD COLUMN IF NOT EXISTS "聊天背景深色" TEXT NOT NULL DEFAULT '';

UPDATE "用户设置"
SET "聊天背景浅色" = CASE WHEN "聊天背景浅色" = '' THEN "聊天背景" ELSE "聊天背景浅色" END,
    "聊天背景深色" = CASE WHEN "聊天背景深色" = '' THEN "聊天背景" ELSE "聊天背景深色" END
WHERE "聊天背景浅色" = '' OR "聊天背景深色" = '';

COMMENT ON COLUMN "用户设置"."聊天背景浅色" IS '浅色主题下的聊天背景（预设键 或 自定义媒体引用），空串回落聊天背景';
COMMENT ON COLUMN "用户设置"."聊天背景深色" IS '深色主题下的聊天背景（预设键 或 自定义媒体引用），空串回落聊天背景';
