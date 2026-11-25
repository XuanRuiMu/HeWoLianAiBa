-- 048：角色与用户对外公开编号（内部 UUID 不再出后端）
--
-- 背景：FP-08 载入页把角色内部 UUID 前 8 位当 UID 展示，/zai-ru/:jiaoSeId 又把 UUID 直接放进
--       URL。内部 UUID 是主键与全部外键的锚点，一旦对外就等于把主键交给玩家，可读、可枚举、
--       可伪造。
--
-- 方案：新增「公开编号」列作为唯一对外标识，UUID 只在服务端出现。编号带实体域前缀
--       （角色 JS / 用户 YH）+ 16 位十六进制，长度 18。存量行按 ID 派生（同一 ID 恒得同一编号，
--       重复执行不会换号），新行由列默认值生成。
--
-- 幂等：ADD COLUMN IF NOT EXISTS + 只回填空值 + CREATE UNIQUE INDEX IF NOT EXISTS。
--       不改任何历史迁移。
--
-- 回退方法：
--       ALTER TABLE "角色" DROP COLUMN IF EXISTS "公开编号";
--       ALTER TABLE "用户" DROP COLUMN IF EXISTS "公开编号";
--       回退前须先把应用退回使用 UUID 的版本，否则查询按公开编号定位会 42703/空集。

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '角色' AND column_name = '公开编号'
    ) THEN
        ALTER TABLE "角色" ADD COLUMN "公开编号" VARCHAR(18);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '用户' AND column_name = '公开编号'
    ) THEN
        ALTER TABLE "用户" ADD COLUMN "公开编号" VARCHAR(18);
    END IF;
END $$;

UPDATE "角色" SET "公开编号" = 'JS' || upper(substr(md5("ID"::text), 1, 16)) WHERE "公开编号" IS NULL;

UPDATE "用户" SET "公开编号" = 'YH' || upper(substr(md5("ID"::text), 1, 16)) WHERE "公开编号" IS NULL;

ALTER TABLE "角色" ALTER COLUMN "公开编号" SET DEFAULT ('JS' || upper(substr(md5(gen_random_uuid()::text), 1, 16)));

ALTER TABLE "用户" ALTER COLUMN "公开编号" SET DEFAULT ('YH' || upper(substr(md5(gen_random_uuid()::text), 1, 16)));

ALTER TABLE "角色" ALTER COLUMN "公开编号" SET NOT NULL;

ALTER TABLE "用户" ALTER COLUMN "公开编号" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uk_角色_公开编号" ON "角色"("公开编号");

CREATE UNIQUE INDEX IF NOT EXISTS "uk_用户_公开编号" ON "用户"("公开编号");
