-- 好感度增量统计表：记录每轮评判的原始增量、衰减后增量、系数应用情况
CREATE TABLE IF NOT EXISTS "好感度增量统计" (
    "ID" BIGSERIAL PRIMARY KEY,
    "用户ID" VARCHAR(64) NOT NULL,
    "角色ID" VARCHAR(64) NOT NULL,
    "轮次序号" INTEGER NOT NULL,
    "原始增量" NUMERIC(10,2) NOT NULL DEFAULT 0,
    "衰减后增量" NUMERIC(10,2) NOT NULL DEFAULT 0,
    "是否应用系数" BOOLEAN NOT NULL DEFAULT FALSE,
    "系数值" NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    "目标曲线值" NUMERIC(10,2) NOT NULL DEFAULT 0,
    "创建时间" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_好感度增量统计_用户角色_时间"
    ON "好感度增量统计" ("用户ID", "角色ID", "创建时间" DESC);

-- 30天自动清理策略（通过 pg_cron 或定期任务，此处仅建表）