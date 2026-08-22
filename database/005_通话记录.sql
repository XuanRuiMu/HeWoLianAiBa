-- 和我恋爱吧 - 语音视频通话记录迁移脚本（FP-21）
-- PostgreSQL 16
-- 所有表名/字段名使用中文标识符，SQL 中用双引号包裹
-- 本脚本幂等，可重复执行

-- 1. 通话记录表
CREATE TABLE IF NOT EXISTS "通话记录" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "角色ID" UUID NOT NULL REFERENCES "角色"("ID") ON DELETE CASCADE,
    "类型" VARCHAR(10) NOT NULL CHECK ("类型" IN ('yuYin', 'shiPin')),
    "状态" VARCHAR(20) NOT NULL CHECK ("状态" IN ('yiJieTong', 'yiQuXiao', 'yiJuJie', 'yiChaoShi')),
    "接通时间" TIMESTAMPTZ,
    "结束时间" TIMESTAMPTZ,
    "时长秒" INTEGER DEFAULT 0,
    "创建时间" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 索引
CREATE INDEX IF NOT EXISTS idx_通话记录_用户ID ON "通话记录"("用户ID");
CREATE INDEX IF NOT EXISTS idx_通话记录_用户ID_角色ID ON "通话记录"("用户ID", "角色ID");
