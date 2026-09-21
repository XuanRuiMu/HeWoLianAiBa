-- 022 用户RBAC运营/审核员旗标列：补齐 YH-108 三角色落地所需的 schema（#17）。
-- 根因：管理端「取管理角色」按 管理员/运营/审核员 三列查询，库中只有 管理员，
-- Postgres 42703 undefined_column 被门禁 catch 吞成通用 500，登录后每个管理接口全挂。
-- 幂等写法，可重复执行；迁移器按版本顺序+校验和执行。

ALTER TABLE "用户"
ADD COLUMN IF NOT EXISTS "运营" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "用户"
ADD COLUMN IF NOT EXISTS "审核员" BOOLEAN NOT NULL DEFAULT FALSE;

-- 授权应用用户操作该表（仅当角色存在时执行，避免在缺少该角色的环境中失败）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lovewithme') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "用户" TO lovewithme;
  END IF;
END $$;
