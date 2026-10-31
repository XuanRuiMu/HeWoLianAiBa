-- FP-16 记忆摘要滚动取材：原实现取「最早 60 条」且不带游标，摘要素材永远停在会话开场，
-- 越聊越失真；本列作为增量取材锚点（已概括到的最后一条消息创建时间），摘要据此只摘「锚点之后」的新段落。
-- 幂等写法，可重复执行。

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '对话摘要' AND column_name = '素材锚点时间'
    ) THEN
        ALTER TABLE "对话摘要" ADD COLUMN "素材锚点时间" TIMESTAMPTZ NULL;
    END IF;
END $$;
