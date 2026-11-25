-- 021 审核运营队列：举报/工单/公告/活动/实验最小闭环（YH-104）。
-- 根因：只能封禁不能治理，涉黄涉暴兜不住；对标 Discord/Roblox 一审二审+SLA+批量留痕。
-- 幂等写法，可重复执行；迁移器按版本顺序+校验和执行。
-- 状态机：dai_yi_shen（一审待审）→ dai_er_shen（二审待审）→ yi_tong_guo/bo_hui；批量仅同阶段同结果。
-- SLA：举报24小时/工单48小时/公告24小时/活动72小时/实验72小时，服务端算到期，超时由查询筛出。

CREATE TABLE IF NOT EXISTS "举报" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "举报人ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "被举报用户ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "被举报内容ID" TEXT NOT NULL DEFAULT '',
    "原因" TEXT NOT NULL DEFAULT '',
    "状态" VARCHAR(20) NOT NULL DEFAULT 'dai_yi_shen',
    "一审人ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "一审结果" VARCHAR(20) NOT NULL DEFAULT 'wu',
    "一审时间" TIMESTAMPTZ,
    "二审人ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "二审结果" VARCHAR(20) NOT NULL DEFAULT 'wu',
    "二审时间" TIMESTAMPTZ,
    "SLA到期" TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    "创建时间" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "更新时间" TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '举报' AND constraint_name = '举报_状态合法'
    ) THEN
        ALTER TABLE "举报" ADD CONSTRAINT "举报_状态合法"
            CHECK ("状态" IN ('dai_yi_shen', 'dai_er_shen', 'yi_tong_guo', 'bo_hui'));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '举报' AND constraint_name = '举报_一审结果合法'
    ) THEN
        ALTER TABLE "举报" ADD CONSTRAINT "举报_一审结果合法"
            CHECK ("一审结果" IN ('wu', 'tong_guo', 'bo_hui'));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '举报' AND constraint_name = '举报_二审结果合法'
    ) THEN
        ALTER TABLE "举报" ADD CONSTRAINT "举报_二审结果合法"
            CHECK ("二审结果" IN ('wu', 'tong_guo', 'bo_hui'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "工单" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "标题" TEXT NOT NULL DEFAULT '',
    "内容" TEXT NOT NULL DEFAULT '',
    "提交人ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "指派人ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "状态" VARCHAR(20) NOT NULL DEFAULT 'dai_yi_shen',
    "优先级" VARCHAR(20) NOT NULL DEFAULT 'zhong',
    "一审人ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "一审结果" VARCHAR(20) NOT NULL DEFAULT 'wu',
    "一审时间" TIMESTAMPTZ,
    "二审人ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "二审结果" VARCHAR(20) NOT NULL DEFAULT 'wu',
    "二审时间" TIMESTAMPTZ,
    "SLA到期" TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
    "创建时间" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "更新时间" TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '工单' AND constraint_name = '工单_状态合法'
    ) THEN
        ALTER TABLE "工单" ADD CONSTRAINT "工单_状态合法"
            CHECK ("状态" IN ('dai_yi_shen', 'dai_er_shen', 'yi_tong_guo', 'bo_hui', 'yi_guan_bi'));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '工单' AND constraint_name = '工单_优先级合法'
    ) THEN
        ALTER TABLE "工单" ADD CONSTRAINT "工单_优先级合法"
            CHECK ("优先级" IN ('di', 'zhong', 'gao', 'jin_ji'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "公告" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "标题" TEXT NOT NULL DEFAULT '',
    "内容" TEXT NOT NULL DEFAULT '',
    "发布人ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "状态" VARCHAR(20) NOT NULL DEFAULT 'dai_yi_shen',
    "一审人ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "一审结果" VARCHAR(20) NOT NULL DEFAULT 'wu',
    "一审时间" TIMESTAMPTZ,
    "二审人ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "二审结果" VARCHAR(20) NOT NULL DEFAULT 'wu',
    "二审时间" TIMESTAMPTZ,
    "定时发布" TIMESTAMPTZ,
    "SLA到期" TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    "创建时间" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "更新时间" TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '公告' AND constraint_name = '公告_状态合法'
    ) THEN
        ALTER TABLE "公告" ADD CONSTRAINT "公告_状态合法"
            CHECK ("状态" IN ('dai_yi_shen', 'dai_er_shen', 'yi_tong_guo', 'bo_hui', 'yi_fa_bu', 'yi_xia_xian'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "活动" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "名称" TEXT NOT NULL DEFAULT '',
    "描述" TEXT NOT NULL DEFAULT '',
    "开始时间" TIMESTAMPTZ,
    "结束时间" TIMESTAMPTZ,
    "状态" VARCHAR(20) NOT NULL DEFAULT 'dai_yi_shen',
    "一审人ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "一审结果" VARCHAR(20) NOT NULL DEFAULT 'wu',
    "一审时间" TIMESTAMPTZ,
    "二审人ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "二审结果" VARCHAR(20) NOT NULL DEFAULT 'wu',
    "二审时间" TIMESTAMPTZ,
    "SLA到期" TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
    "创建时间" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "更新时间" TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '活动' AND constraint_name = '活动_状态合法'
    ) THEN
        ALTER TABLE "活动" ADD CONSTRAINT "活动_状态合法"
            CHECK ("状态" IN ('dai_yi_shen', 'dai_er_shen', 'yi_tong_guo', 'bo_hui', 'jin_xing_zhong', 'yi_jie_shu'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "实验" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "名称" TEXT NOT NULL DEFAULT '',
    "描述" TEXT NOT NULL DEFAULT '',
    "分桶比例" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "互斥组" TEXT NOT NULL DEFAULT '',
    "指标回传" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "状态" VARCHAR(20) NOT NULL DEFAULT 'dai_yi_shen',
    "一审人ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "一审结果" VARCHAR(20) NOT NULL DEFAULT 'wu',
    "一审时间" TIMESTAMPTZ,
    "二审人ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "二审结果" VARCHAR(20) NOT NULL DEFAULT 'wu',
    "二审时间" TIMESTAMPTZ,
    "SLA到期" TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
    "创建时间" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "更新时间" TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '实验' AND constraint_name = '实验_状态合法'
    ) THEN
        ALTER TABLE "实验" ADD CONSTRAINT "实验_状态合法"
            CHECK ("状态" IN ('dai_yi_shen', 'dai_er_shen', 'yi_tong_guo', 'bo_hui', 'yun_xing_zhong', 'yi_jie_shu'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "审核留痕" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "目标类型" VARCHAR(20) NOT NULL,
    "目标ID" UUID NOT NULL,
    "动作" VARCHAR(20) NOT NULL,
    "操作人ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "结果" VARCHAR(20) NOT NULL DEFAULT '',
    "备注" TEXT NOT NULL DEFAULT '',
    "创建时间" TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '审核留痕' AND constraint_name = '审核留痕_目标类型合法'
    ) THEN
        ALTER TABLE "审核留痕" ADD CONSTRAINT "审核留痕_目标类型合法"
            CHECK ("目标类型" IN ('ju_bao', 'gong_dan', 'gong_gao', 'huo_dong', 'shi_yan'));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '审核留痕' AND constraint_name = '审核留痕_动作合法'
    ) THEN
        ALTER TABLE "审核留痕" ADD CONSTRAINT "审核留痕_动作合法"
            CHECK ("动作" IN ('chuang_jian', 'yi_shen', 'er_shen', 'pi_liang'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_举报_状态_SLA ON "举报" ("状态", "SLA到期");
CREATE INDEX IF NOT EXISTS idx_举报_创建时间 ON "举报" ("创建时间" DESC);
CREATE INDEX IF NOT EXISTS idx_工单_状态_SLA ON "工单" ("状态", "SLA到期");
CREATE INDEX IF NOT EXISTS idx_工单_创建时间 ON "工单" ("创建时间" DESC);
CREATE INDEX IF NOT EXISTS idx_公告_状态 ON "公告" ("状态", "创建时间" DESC);
CREATE INDEX IF NOT EXISTS idx_活动_状态 ON "活动" ("状态", "创建时间" DESC);
CREATE INDEX IF NOT EXISTS idx_实验_状态 ON "实验" ("状态", "创建时间" DESC);
CREATE INDEX IF NOT EXISTS idx_审核留痕_目标 ON "审核留痕" ("目标类型", "目标ID", "创建时间" DESC);
