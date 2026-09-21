-- 和我恋爱吧 - 数据库迁移 002
-- 为生产环境旧版初始化脚本补充 "用户"."测试" 字段

ALTER TABLE "用户"
ADD COLUMN IF NOT EXISTS "测试" BOOLEAN DEFAULT FALSE;

-- 授权应用用户操作该表（仅当角色存在时执行，避免在缺少该角色的环境中失败）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lovewithme') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "用户" TO lovewithme;
  END IF;
END $$;
