-- FP-11 胜利失败条件：为已存在的角色表补充游戏状态字段
-- 如果列已存在则跳过，支持幂等执行

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '角色' AND column_name = '封存'
    ) THEN
        ALTER TABLE "角色" ADD COLUMN "封存" BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '角色' AND column_name = '可继续聊天'
    ) THEN
        ALTER TABLE "角色" ADD COLUMN "可继续聊天" BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '角色' AND column_name = '结局状态'
    ) THEN
        ALTER TABLE "角色" ADD COLUMN "结局状态" VARCHAR(50) DEFAULT '';
    END IF;
END $$;
