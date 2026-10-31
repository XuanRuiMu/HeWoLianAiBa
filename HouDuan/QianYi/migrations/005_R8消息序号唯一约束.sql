-- FP-19 R8 消息序号唯一约束
-- 为消息表添加 (用户ID, 角色ID, 客户端序号) 唯一约束
-- 支持幂等执行

-- 1. 添加唯一约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '消息' AND constraint_type = 'UNIQUE'
        AND constraint_name = '消息_用户ID_角色ID_客户端序号_key'
    ) THEN
        ALTER TABLE "消息" ADD CONSTRAINT "消息_用户ID_角色ID_客户端序号_key" UNIQUE ("用户ID", "角色ID", "客户端序号");
    END IF;
END $$;

-- 2. 为序号查询和排序添加复合索引
CREATE INDEX IF NOT EXISTS idx_消息_用户ID_角色ID_客户端序号 ON "消息"("用户ID", "角色ID", "客户端序号" DESC);

-- 3. 确保现有数据不违反约束（将 NULL 客户端序号设为 0 以便约束生效）
-- 注意：唯一约束允许多个 NULL 值，但为了确保序号分配逻辑正确，这里不修改现有 NULL 值
-- 应用层逻辑已保证新插入数据都有序号