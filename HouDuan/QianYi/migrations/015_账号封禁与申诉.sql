-- 任务3方案A：账号维度三级封禁（1分钟→1天→永封）+ 申诉
-- 与既有 IP 封禁（services/IP封禁.ts + “封禁记录”表）并行：IP 维度防换号，
-- 账号维度记人。Redis 存计数与倒计时（进程重启不丢靠 DB 行），DB 行持久化。
-- 幂等可重入。

CREATE TABLE IF NOT EXISTS "账号封禁" (
    "用户ID" UUID PRIMARY KEY REFERENCES "用户"("ID") ON DELETE CASCADE,
    "违规次数" INTEGER NOT NULL DEFAULT 0,
    "级别" VARCHAR(20) NOT NULL DEFAULT 'zheng_chang',
    "解封时间" TIMESTAMPTZ,
    "最后原因" TEXT NOT NULL DEFAULT '',
    "申诉状态" VARCHAR(20) NOT NULL DEFAULT 'wu',
    "申诉理由" TEXT NOT NULL DEFAULT '',
    "更新时间" TIMESTAMPTZ DEFAULT NOW()
);
