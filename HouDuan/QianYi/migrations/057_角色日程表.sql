-- 生活节律日程表：每个角色每天一张 8-12 段的日程表。
-- 建角色时生成首次，之后由 cron 每天 00:30 生成次日；查询时纯规则按分钟取「≤现在的最后一条」。
CREATE TABLE IF NOT EXISTS "角色日程" (
  "ID" BIGSERIAL PRIMARY KEY,
  "角色ID" VARCHAR(64) NOT NULL,
  "日期" DATE NOT NULL,
  "星期" SMALLINT NOT NULL,
  "内容" JSONB NOT NULL,
  "创建时间" TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "角色日程_角色_日期"
  ON "角色日程" ("角色ID", "日期");

COMMENT ON TABLE "角色日程" IS '每个角色每天一张生活日程表，content 为 [{时间:"HH:MM",活动:"..."}]';
COMMENT ON COLUMN "角色日程"."星期" IS '1=周一，7=周日，按角色所在时区的当地日期算';
COMMENT ON COLUMN "角色日程"."内容" IS '日程段数组，每项含 时间(HH:MM) 与 活动 两个键';