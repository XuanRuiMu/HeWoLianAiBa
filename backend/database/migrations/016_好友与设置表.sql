-- G-08 落点补齐：好友申请单表、用户设置表、好友消息表。
-- 说明：此前三表仅存在于测试夹具 database/001_haoyou_yu_shezhi.sql，
-- 生产库（init.sql + migrations）从未创建，导致好友与设置接口在生产库报错。
-- 本迁移与夹具 DDL 同源（幂等 IF NOT EXISTS），部署与测试双通道收敛。
-- 注意：新库首次建库请同步将本文件内容并入 init.sql（参考 001_add_game_state_columns 惯例）。

CREATE TABLE IF NOT EXISTS "好友申请" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "申请者ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "接收者ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "状态" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "创建时间" TIMESTAMPTZ DEFAULT NOW(),
    "更新时间" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE ("申请者ID", "接收者ID")
);

CREATE TABLE IF NOT EXISTS "好友消息" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "发送者ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "接收者ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "内容" TEXT NOT NULL DEFAULT '',
    "类型" VARCHAR(20) NOT NULL DEFAULT 'wenben',
    "媒体ID" TEXT,
    "已读" BOOLEAN NOT NULL DEFAULT FALSE,
    "撤回" BOOLEAN NOT NULL DEFAULT FALSE,
    "创建时间" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "用户设置" (
    "用户ID" UUID PRIMARY KEY REFERENCES "用户"("ID") ON DELETE CASCADE,
    "聊天背景" TEXT NOT NULL DEFAULT 'moRen',
    "公开账号" BOOLEAN NOT NULL DEFAULT TRUE,
    "公开手机号" BOOLEAN NOT NULL DEFAULT FALSE,
    "公开邮箱" BOOLEAN NOT NULL DEFAULT FALSE,
    "绑定邮箱" TEXT NOT NULL DEFAULT '',
    "清空排位时间" TIMESTAMPTZ,
    "创建时间" TIMESTAMPTZ DEFAULT NOW(),
    "更新时间" TIMESTAMPTZ DEFAULT NOW()
);

-- YH-014 聊天背景存无参引用（/api/媒体/<sha256>）：VARCHAR(50)装不下，扩TEXT；幂等
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '用户设置' AND column_name = '聊天背景' AND character_maximum_length IS NOT NULL AND character_maximum_length < 200) THEN
    ALTER TABLE "用户设置" ALTER COLUMN "聊天背景" TYPE TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_好友申请_接收者状态" ON "好友申请" ("接收者ID", "状态");
CREATE INDEX IF NOT EXISTS "idx_好友申请_申请者状态" ON "好友申请" ("申请者ID", "状态");
CREATE INDEX IF NOT EXISTS "idx_好友消息_双方时间" ON "好友消息" ("发送者ID", "接收者ID", "创建时间" DESC);
