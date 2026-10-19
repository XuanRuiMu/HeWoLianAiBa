-- 001: 挑战模式（排位赛）
-- 挑战积分按「组别」分榜：nan_nv=男玩女 / nv_nan=女玩男 / nan_nan=男玩男 / nv_nv=女玩女
CREATE TABLE IF NOT EXISTS "挑战积分" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "组别" VARCHAR(10) NOT NULL,
    "积分" INTEGER NOT NULL DEFAULT 1000,
    "胜场" INTEGER NOT NULL DEFAULT 0,
    "负场" INTEGER NOT NULL DEFAULT 0,
    "弃权场" INTEGER NOT NULL DEFAULT 0,
    "连胜" INTEGER NOT NULL DEFAULT 0,
    "最高连胜" INTEGER NOT NULL DEFAULT 0,
    "历史最高分" INTEGER NOT NULL DEFAULT 1000,
    "创建时间" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "更新时间" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_挑战积分_用户_组别 UNIQUE ("用户ID", "组别"),
    CONSTRAINT ck_挑战积分_组别 CHECK ("组别" IN ('nan_nv', 'nv_nan', 'nan_nan', 'nv_nv'))
);

-- 挑战对局：同一用户同时仅允许一局进行中（部分唯一索引兜底）
CREATE TABLE IF NOT EXISTS "挑战对局" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "角色ID" UUID NOT NULL REFERENCES "角色"("ID") ON DELETE CASCADE,
    "玩家性别" VARCHAR(2) NOT NULL,
    "对象性别" VARCHAR(2) NOT NULL,
    "状态" VARCHAR(10) NOT NULL DEFAULT '进行中',
    "结果类型" VARCHAR(30),
    "积分变动" INTEGER,
    "创建时间" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "结束时间" TIMESTAMPTZ,
    CONSTRAINT ck_挑战对局_状态 CHECK ("状态" IN ('进行中', '已结束'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_挑战对局_用户_进行中
    ON "挑战对局"("用户ID") WHERE "状态" = '进行中';
CREATE INDEX IF NOT EXISTS idx_挑战对局_角色ID ON "挑战对局"("角色ID");
CREATE INDEX IF NOT EXISTS idx_挑战积分_组别_积分 ON "挑战积分"("组别", "积分" DESC);

-- 角色与游戏档案增加对局模式列：'putong' | 'tiaozhan'
ALTER TABLE "角色" ADD COLUMN IF NOT EXISTS "对局模式" VARCHAR(10) NOT NULL DEFAULT 'putong';
ALTER TABLE "游戏档案" ADD COLUMN IF NOT EXISTS "模式" VARCHAR(10) NOT NULL DEFAULT 'putong';

-- 原单列活跃唯一索引升级为「用户+模式」唯一：
-- 允许普通模式与挑战模式各同时存在一个活跃角色
DROP INDEX IF EXISTS uk_角色_用户ID_活跃;
CREATE UNIQUE INDEX IF NOT EXISTS uk_角色_用户ID_模式_活跃
    ON "角色"("用户ID", "对局模式") WHERE "封存" = FALSE AND "删除时间" IS NULL;
