CREATE TABLE IF NOT EXISTS "系统表情" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "短名" VARCHAR(30) NOT NULL UNIQUE,
    "描述" VARCHAR(120) NOT NULL DEFAULT '',
    "情绪标签" VARCHAR(20) NOT NULL DEFAULT '待打标',
    "适用场景" VARCHAR(120) NOT NULL DEFAULT '',
    "SHA256" CHAR(64) NOT NULL,
    "MIME" VARCHAR(100) NOT NULL,
    "来源" VARCHAR(120) NOT NULL DEFAULT '',
    "启用" BOOLEAN NOT NULL DEFAULT TRUE,
    "创建时间" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS 系统表情_情绪标签_idx ON "系统表情" ("情绪标签") WHERE "启用" = TRUE;

COMMENT ON TABLE "系统表情" IS 'AI可发送的联网收集表情包库：短名用于贴纸指令与候选列表，描述与情绪标签供模型按元数据选图（不注入图片本体）';
