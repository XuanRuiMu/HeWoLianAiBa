-- 和我恋爱吧 - 好友与用户设置表结构
-- 说明：后端测试（好友与设置.test.ts）在 beforeAll 中执行本文件；
-- 正式建库真源是 database/000_baseline.sql：docker-compose.yml:22 把 ./database 挂成 docker-entrypoint-initdb.d，
-- 空卷首启按文件名顺序跑 000_baseline.sql 与 database/001_haoyou_yu_shezhi.sql（与本文件同源）；新表与
-- migrations/016_好友与设置表.sql 同源（幂等可重入）。backend/database/init.sql 不建 "媒体文件" 表，顺序跑
-- 008/023/027 会硬报错，不是建库路径（L-07 已由用户裁定＝退役该自述、内容不重生成；FP-15a 已把这条
-- 事实写进该文件自己的头部注释，并新增 init.sql 不得再自称生产建库路径的守卫用例）。
-- G-08 落点：好友申请单表、用户设置表、好友消息表。

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
    "聊天背景" VARCHAR(50) NOT NULL DEFAULT 'moRen',
    "公开账号" BOOLEAN NOT NULL DEFAULT TRUE,
    "公开手机号" BOOLEAN NOT NULL DEFAULT FALSE,
    "公开邮箱" BOOLEAN NOT NULL DEFAULT FALSE,
    "绑定邮箱" TEXT NOT NULL DEFAULT '',
    "清空排位时间" TIMESTAMPTZ,
    "创建时间" TIMESTAMPTZ DEFAULT NOW(),
    "更新时间" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_好友申请_接收者状态" ON "好友申请" ("接收者ID", "状态");
CREATE INDEX IF NOT EXISTS "idx_好友申请_申请者状态" ON "好友申请" ("申请者ID", "状态");
CREATE INDEX IF NOT EXISTS "idx_好友消息_双方时间" ON "好友消息" ("发送者ID", "接收者ID", "创建时间" DESC);
