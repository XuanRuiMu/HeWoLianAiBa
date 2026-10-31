-- 018 思考记录：AI思考链持久化（D01A）。
-- 根因：AI深度思考/构建过程仅经Socket实时推送，不落库，管理端无历史回放。
-- 本表为唯一事实源，管理端思考记录分页/详情只读本表。
-- 事件白名单：guan-li-yuan-shen-du-si-kao（深度思考，来源Director/Writer，单条截断1500存原文长度备查）
--   / guan-li-yuan-gou-jian-guo-cheng（构建过程） / guan-li-yuan-yin-cang-xin-xi（隐藏信息）
--   / guan-li-yuan-hao-gan-du-bian-hua（好感度变化）。
-- 幂等写法，已有表/列/约束/索引时为无副作用空操作；迁移器按版本顺序+校验和执行。

CREATE TABLE IF NOT EXISTS "思考记录" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "角色ID" UUID NOT NULL REFERENCES "角色"("ID") ON DELETE CASCADE,
    "事件" VARCHAR(50) NOT NULL,
    "来源" VARCHAR(20) NOT NULL DEFAULT '',
    "阶段" VARCHAR(50) NOT NULL DEFAULT '',
    "类型" VARCHAR(50) NOT NULL DEFAULT '',
    "内容" TEXT NOT NULL DEFAULT '',
    "原文长度" INTEGER NOT NULL DEFAULT 0,
    "轮次" BIGINT NOT NULL DEFAULT 0,
    "创建时间" TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '思考记录' AND constraint_name = '思考记录_事件合法'
    ) THEN
        ALTER TABLE "思考记录" ADD CONSTRAINT "思考记录_事件合法"
            CHECK ("事件" IN ('guan-li-yuan-shen-du-si-kao', 'guan-li-yuan-gou-jian-guo-cheng', 'guan-li-yuan-yin-cang-xin-xi', 'guan-li-yuan-hao-gan-du-bian-hua'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_思考记录_用户ID_角色ID_创建时间 ON "思考记录" ("用户ID", "角色ID", "创建时间" DESC);
CREATE INDEX IF NOT EXISTS idx_思考记录_事件_创建时间 ON "思考记录" ("事件", "创建时间" DESC);
