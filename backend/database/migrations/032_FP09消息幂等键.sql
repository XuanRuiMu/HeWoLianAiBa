-- FP-09 缺陷8 根因修复：消息幂等键与「服务端权威序号」契约
-- 旧口径：UNIQUE("用户ID","角色ID","客户端序号") 同时充当 ①会话内排序键 ②发送幂等判据。
--         序号由前端自增上报、角色侧由服务端 MAX+1 分配，两个生产者共用同一命名空间 ⇒
--         用户插入消息与刚落库的角色消息撞号，ON CONFLICT DO NOTHING 后按序号回查又不区分
--         发送者，用户文本被当成重复直接吞掉（缺陷8「吞消息」主因）。
-- 新口径：幂等判据搬到客户端稳定 UUID（"幂等键"），"客户端序号" 退化为纯排序/游标键，
--         一律由服务端事务内 pg_advisory_xact_lock 串行权威分配，前端不再自增。
-- 保留 UNIQUE("用户ID","角色ID","客户端序号")：它是排序键的唯一性不变式，且
--         services/通话.ts 的系统消息去重仍依赖该约束（本功能点不动通话链路）。
-- 支持幂等执行。

-- 1. 幂等键列（客户端为每条待发用户消息生成的稳定 UUID；服务端自产消息为 NULL）
ALTER TABLE "消息" ADD COLUMN IF NOT EXISTS "幂等键" UUID;

-- 2. 幂等唯一约束：同会话同幂等键只允许一行；NULL（服务端消息/存量行）不参与去重，
--    故存量数据一行都不受影响，历史 NULL 行可任意多条。
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '消息' AND constraint_type = 'UNIQUE'
        AND constraint_name = '消息_用户ID_角色ID_幂等键_key'
    ) THEN
        ALTER TABLE "消息" ADD CONSTRAINT "消息_用户ID_角色ID_幂等键_key" UNIQUE ("用户ID", "角色ID", "幂等键");
    END IF;
END $$;

-- 3. 语义标注：列名沿用「客户端序号」以免波及 keyset 游标与全部既有读取路径，
--    自本迁移起其真值来源只有服务端。
COMMENT ON COLUMN "消息"."客户端序号" IS '会话内单调序号（排序键/keyset 游标）：自 FP-09 起由服务端事务内权威分配，不再采信客户端上报值，且不再作为幂等判据';
COMMENT ON COLUMN "消息"."幂等键" IS '客户端为待发用户消息生成的稳定 UUID，重复提交时幂等返回首行；服务端自产消息为 NULL';
