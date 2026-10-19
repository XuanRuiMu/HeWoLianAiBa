-- 任务2方案C：个人头像与签名 + 可见性“类”体系
-- 可见性五值（前后端同源）：gong_kai 公开 / jin_hao_you 仅好友可见 /
-- jin_bu_fen_ren 仅部分人可见 / bu_ke_jian 不可见 / jin_zi_ji 只对自己开放。
-- 本迁移只落“签名”一处使用；后续空间/朋友圈/战绩等复用同一套逻辑时，
-- 各表新增“<内容>可见性 + <内容>白名单”两列并复用 services/可见性.ts 判定。
-- 幂等可重入（DO $$ + IF NOT EXISTS），与 001_add_game_state_columns.sql 同风格。

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '用户' AND column_name = '签名可见性'
    ) THEN
        ALTER TABLE "用户" ADD COLUMN "签名可见性" VARCHAR(20) NOT NULL DEFAULT 'gong_kai';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '用户' AND column_name = '签名白名单'
    ) THEN
        ALTER TABLE "用户" ADD COLUMN "签名白名单" UUID[] NOT NULL DEFAULT '{}';
    END IF;
END $$;
