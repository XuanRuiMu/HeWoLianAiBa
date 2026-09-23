CREATE TABLE IF NOT EXISTS "好友申请" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "申请者ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "接收者ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "状态" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "创建时间" TIMESTAMPTZ DEFAULT NOW(),
    "更新时间" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT "好友申请_双方不同" CHECK ("申请者ID" <> "接收者ID"),
    CONSTRAINT "好友申请_状态合法" CHECK ("状态" IN ('pending', 'accepted', 'rejected')),
    CONSTRAINT "好友申请_双方唯一" UNIQUE ("申请者ID", "接收者ID")
);
CREATE INDEX IF NOT EXISTS "idx_好友申请_接收者状态" ON "好友申请" ("接收者ID", "状态");
CREATE INDEX IF NOT EXISTS "idx_好友申请_申请者状态" ON "好友申请" ("申请者ID", "状态");

CREATE TABLE IF NOT EXISTS "用户设置" (
    "用户ID" UUID PRIMARY KEY REFERENCES "用户"("ID") ON DELETE CASCADE,
    "聊天背景" TEXT NOT NULL DEFAULT '',
    "气泡自己" VARCHAR(30) NOT NULL DEFAULT 'weiXinLv',
    "气泡AI" VARCHAR(30) NOT NULL DEFAULT 'yunBai',
    "公开账号" BOOLEAN NOT NULL DEFAULT TRUE,
    "公开手机号" BOOLEAN NOT NULL DEFAULT FALSE,
    "公开邮箱" BOOLEAN NOT NULL DEFAULT FALSE,
    "绑定邮箱" TEXT NOT NULL DEFAULT '',
    "清空排位时间" TIMESTAMPTZ,
    "创建时间" TIMESTAMPTZ DEFAULT NOW(),
    "更新时间" TIMESTAMPTZ DEFAULT NOW()
);

-- FP-21（迁移 036 同形态）：内容块 与 被引用消息ID 两列与 "消息" 表同构（033/035），
-- 内联 REFERENCES 的自动约束名 = 好友消息_被引用消息ID_fkey，与 036 的 DO 分支同名 ⇒ 两条建库路径收敛。
CREATE TABLE IF NOT EXISTS "好友消息" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "发送者ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "接收者ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "内容" TEXT NOT NULL DEFAULT '',
    "类型" VARCHAR(20) NOT NULL DEFAULT 'wenben',
    "媒体ID" UUID REFERENCES "媒体文件"("ID") ON DELETE SET NULL,
    "已读" BOOLEAN NOT NULL DEFAULT FALSE,
    "撤回" BOOLEAN NOT NULL DEFAULT FALSE,
    "内容块" JSONB,
    "被引用消息ID" UUID REFERENCES "好友消息"("ID") ON DELETE SET NULL,
    "创建时间" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT "好友消息_类型合法" CHECK ("类型" IN ('wenben', 'tuPian', 'yuYin', 'wenJian', 'biaoQingBao')),
    CONSTRAINT "好友消息_不得自引用" CHECK ("ID" <> "被引用消息ID")
);
CREATE INDEX IF NOT EXISTS "idx_好友消息_双方时间" ON "好友消息" ("发送者ID", "接收者ID", "创建时间");
CREATE INDEX IF NOT EXISTS "idx_好友消息_接收者已读" ON "好友消息" ("接收者ID", "已读");
-- 外键侧索引：删行时 Postgres 按 被引用消息ID 反查引用方，无索引则批量删除退化成逐行全表扫（同 036 的理由）
CREATE INDEX IF NOT EXISTS "好友消息_被引用消息ID_索引" ON "好友消息" ("被引用消息ID");

-- FP-03 气泡主题偏好：老库（表已存在时 CREATE IF NOT EXISTS 不生效）幂等补列
ALTER TABLE "用户设置" ADD COLUMN IF NOT EXISTS "气泡自己" VARCHAR(30) NOT NULL DEFAULT 'weiXinLv';
ALTER TABLE "用户设置" ADD COLUMN IF NOT EXISTS "气泡AI" VARCHAR(30) NOT NULL DEFAULT 'yunBai';
