-- 摘要增量游标升级：只靠「素材锚点时间」会在同一毫秒多条消息处漏取。
-- 新增可空「素材锚点消息ID」，与时间组成复合游标；旧数据该列为 NULL，仍按纯时间兼容读取。
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '对话摘要' AND column_name = '素材锚点消息ID'
    ) THEN
        ALTER TABLE "对话摘要" ADD COLUMN "素材锚点消息ID" UUID NULL REFERENCES "消息"("ID") ON DELETE SET NULL;
    END IF;
END $$;
