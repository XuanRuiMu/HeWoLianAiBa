-- 用户时区：决定 AI 对象使用哪种语言、以及「当地时间」怎么算。
-- 注册时由前端上报浏览器时区（Intl.DateTimeFormat().resolvedOptions().timeZone），
-- 例如 Asia/Shanghai、America/New_York。空值表示尚未采集，按 UTC+8 兜底。
ALTER TABLE "用户" ADD COLUMN IF NOT EXISTS "时区" VARCHAR(64);

COMMENT ON COLUMN "用户"."时区" IS '浏览器 IANA 时区名（如 Asia/Shanghai），注册时快照；空值按 UTC+8 兜底';