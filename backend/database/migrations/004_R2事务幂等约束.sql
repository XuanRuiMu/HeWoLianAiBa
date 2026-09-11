-- FP-16 R2 事务幂等：为游戏结局表添加唯一约束，为好感度表添加必要索引
-- 支持幂等执行

-- 1. 为游戏结局表添加 (用户ID, 角色ID) 唯一约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '游戏结局' AND constraint_type = 'UNIQUE'
        AND constraint_name = '游戏结局_用户ID_角色ID_key'
    ) THEN
        ALTER TABLE "游戏结局" ADD CONSTRAINT "游戏结局_用户ID_角色ID_key" UNIQUE ("用户ID", "角色ID");
    END IF;
END $$;

-- 2. 好感度表已有 (用户ID, 角色ID) 唯一约束，确保索引存在
CREATE INDEX IF NOT EXISTS idx_好感度_用户ID_角色ID_更新 ON "好感度"("用户ID", "角色ID");

-- 3. 为角色表的活跃角色查询添加部分索引（仅非封存、未删除）
CREATE INDEX IF NOT EXISTS idx_角色_用户ID_活跃 ON "角色"("用户ID") WHERE "封存" = FALSE AND "删除时间" IS NULL;

-- 4. 活跃角色唯一约束：同一用户同一时间只能有一个活跃角色（非封存、未删除）
CREATE UNIQUE INDEX IF NOT EXISTS uk_角色_用户ID_活跃 ON "角色"("用户ID") WHERE "封存" = FALSE AND "删除时间" IS NULL;