ALTER TABLE "角色" ADD COLUMN IF NOT EXISTS "自述卡" TEXT;

COMMENT ON COLUMN "角色"."自述卡" IS '人设字段一次性生成的第一人称自述卡，Writer层以自述替代字段清单，Director层保留结构化字段';
