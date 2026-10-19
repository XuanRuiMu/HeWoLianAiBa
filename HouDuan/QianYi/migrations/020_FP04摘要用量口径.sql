-- FP-04 YH-040 LLM用量持久化：Responses API usage 单点采集落库，按日按模型类型聚合。
-- 根因：旁路调用零上报且按字符估算，看板低估；usage 为唯一真实口径，Redis 聚合为热读，PG 为冷备。
-- 幂等写法，可重复执行。

CREATE TABLE IF NOT EXISTS "LLM用量" (
    "日期" VARCHAR(10) NOT NULL,
    "模型类型" VARCHAR(50) NOT NULL,
    "模型" VARCHAR(100) NOT NULL DEFAULT '',
    "次数" INTEGER NOT NULL DEFAULT 0,
    "输入Token" BIGINT NOT NULL DEFAULT 0,
    "输出Token" BIGINT NOT NULL DEFAULT 0,
    "总Token" BIGINT NOT NULL DEFAULT 0,
    "创建时间" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "更新时间" TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY ("日期", "模型类型", "模型")
);

-- FP-04 YH-033 对话摘要 A 方案：定时摘要全量落对话摘要表（init 口径）并注入上下文。
-- 根因：006 删表、007 存根字段漂移导致摘要零落表；本迁移以 init 口径为准重建生产字段。
-- 注意：007 存根校验和已固化不可改，本文件只做幂等补列，不重建表。

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '对话摘要' AND column_name = '摘要内容'
    ) THEN
        ALTER TABLE "对话摘要" ADD COLUMN "摘要内容" TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '对话摘要' AND column_name = '概括消息数'
    ) THEN
        ALTER TABLE "对话摘要" ADD COLUMN "概括消息数" INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '对话摘要' AND column_name = '更新时间'
    ) THEN
        ALTER TABLE "对话摘要" ADD COLUMN "更新时间" TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '对话摘要' AND constraint_name = '对话摘要_用户角色唯一'
    ) THEN
        ALTER TABLE "对话摘要" ADD CONSTRAINT "对话摘要_用户角色唯一" UNIQUE ("用户ID", "角色ID");
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_对话摘要_更新时间 ON "对话摘要" ("更新时间" DESC);
CREATE INDEX IF NOT EXISTS idx_LLM用量_日期 ON "LLM用量" ("日期" DESC);
