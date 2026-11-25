-- 063 关系冲突弧。
--
-- 用途：把「冷战 / 回避 / 已读不回」三级冲突档位挂到「好感度」维度上，
--       由 Director 判定严重冒犯触发升档（wu→lengZhan→huiBi→yiDuBuHui，只升不降），
--       只由用户聊天中的修复动作（真诚道歉 / 哄 / 幽默化解 / 直接谈开，按人设判定）化解。
-- 铁律：冲突状态的变化只由事件驱动，系统里不存在任何时间化解因素——
--       状态机不读任何时间列、不算间隔、不做衰减兜底，冲突挂多久都维持原状直到化解。
-- 幂等：information_schema / pg_constraint 守卫，重复执行为无副作用空操作。

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '好感度' AND column_name = '冲突状态'
    ) THEN
        ALTER TABLE "好感度" ADD COLUMN "冲突状态" TEXT NOT NULL DEFAULT 'wu';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '好感度' AND column_name = '冲突事由'
    ) THEN
        ALTER TABLE "好感度" ADD COLUMN "冲突事由" TEXT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '好感度' AND column_name = '冲突升级计数'
    ) THEN
        ALTER TABLE "好感度" ADD COLUMN "冲突升级计数" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = '好感度_冲突状态取值'
    ) THEN
        ALTER TABLE "好感度" ADD CONSTRAINT "好感度_冲突状态取值"
            CHECK ("冲突状态" IN ('wu', 'lengZhan', 'huiBi', 'yiDuBuHui'));
    END IF;
END $$;

COMMENT ON COLUMN "好感度"."冲突状态" IS '关系冲突弧档位：wu=无冲突，lengZhan=冷战，huiBi=回避，yiDuBuHui=已读不回；只由冒犯事件升档、用户聊天修复化解，无任何时间化解因素';
COMMENT ON COLUMN "好感度"."冲突事由" IS '触发当前冲突的事由简述（≤200字），供 Director/Writer 按人设提及；化解时清空';
COMMENT ON COLUMN "好感度"."冲突升级计数" IS '同一场冲突内敷衍修复的累计次数；计数越高后续敷衍的化解判定越严；化解时清零';
