-- 027 好友消息媒体列形态统一（FP-21，消解遗留 L-19）。
--
-- 根因：同一张 "好友消息" 存在两份 DDL，谁先跑谁胜出（CREATE TABLE IF NOT EXISTS）——
--   路径A（000_baseline.sql + backend/database/migrations，现网库即此形态）：
--         "媒体ID" TEXT，无外键、无类型 CHECK；
--   路径B（000_baseline.sql + database/001_haoyou_yu_shezhi.sql，compose 干净卷）：
--         "媒体ID" UUID REFERENCES "媒体文件"("ID") ON DELETE SET NULL
--         + CONSTRAINT "好友消息_类型合法" CHECK ("类型" IN ('wenben','tuPian','yuYin','wenJian','biaoQingBao'))。
--   两条路径的同一列形态互斥 ⇒ 同一份代码在干净卷与现网库行为不同（往 UUID 列写非 UUID 文本是
--   22P02；反之 TEXT 列不会拦伪标识，也不会随媒体行回收）。本迁移把两条路径收敛到同一形态。
--
-- 取哪一份：取路径B（UUID + 外键）。依据三条，全部可从源码取得——
--   1) "媒体文件"."ID" 是主键（000_baseline.sql），同库的 "消息"."媒体ID" 与 "用户表情"."媒体ID"
--      都已是 UUID 外键（000_baseline.sql:389、023），好友列用 TEXT 是这套模型里唯一的例外；
--   2) 后端发送前已强制 yanZhengUUID(meiTiId)（src/routes/好友.ts），非 UUID 根本进不了 INSERT，
--      故 TEXT 形态并未承载任何 UUID 形态承载不了的数据；
--   3) 内容寻址与媒体回收（媒体行被删除时好友消息不应挂着死引用）只能靠外键表达。
--
-- 数据安全："媒体ID" 只做类型改写，不丢行、不改值语义。改写前逐行校验非空值必须是合法 UUID 文本，
--   不满足即 RAISE EXCEPTION 中止（宁可迁移失败，绝不静默把脏标识置 NULL 丢数据）。
--   迁移链中 016 在本文件之前，建表与改列不会交叉；本文件幂等，重复执行为无副作用空操作。
--
-- 回滚（显式运维动作，不由应用启动路径执行）：
--   ALTER TABLE "好友消息" DROP CONSTRAINT IF EXISTS "好友消息_媒体ID_fkey";
--   ALTER TABLE "好友消息" DROP CONSTRAINT IF EXISTS "好友消息_类型合法";
--   ALTER TABLE "好友消息" ALTER COLUMN "媒体ID" TYPE TEXT USING "媒体ID"::text;
--   DELETE FROM "schema_migrations" WHERE "version" = '027';

DO $$
BEGIN
  -- 1) 形态归一：text（路径A/现网）→ uuid（路径B/干净卷）；已是 uuid 时整个分支不执行。
  --    用 pg_attribute + to_regclass 而非 information_schema.columns：后者按表名跨 schema 匹配，
  --    会被同名他 schema 表干扰，且与下面两个分支的解析口径（regclass 走 search_path）不一致。
  IF EXISTS (
       SELECT 1 FROM pg_attribute
        WHERE attrelid = to_regclass('好友消息')
          AND attname = '媒体ID'
          AND format_type(atttypid, atttypmod) = 'text'
     ) THEN
    IF EXISTS (
         SELECT 1 FROM "好友消息"
          WHERE "媒体ID" IS NOT NULL
            AND "媒体ID" <> ''   -- 空串不承载任何引用，与 USING 里的 NULLIF 同一口径归 NULL，不算脏值
            AND "媒体ID" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       ) THEN
      RAISE EXCEPTION '好友消息.媒体ID 存在非 UUID 形态的存量值，迁移 027 拒绝自动改写（不静默丢数据）';
    END IF;
    ALTER TABLE "好友消息"
      ALTER COLUMN "媒体ID" TYPE UUID USING NULLIF("媒体ID", '')::uuid;
  END IF;

  -- 2) 悬空引用先清成空：媒体行可以被 "回收媒体行"（src/routes/表情.ts::BIAO_QING_YU_JU.回收媒体行）
  --    在 TEXT 形态下删掉而留下死引用，这种行既取不到内容也不该再签名，置 NULL 与
  --    "消息"."媒体ID" 的 ON DELETE SET NULL 同一终态。数量以 WARNING 落迁移日志，不静默改写。
  --    反例不做这种事："类型" 的非法值不可能由应用层产生（src/routes/好友.ts 先过白名单），
  --    一旦命中即说明有人绕过应用直写库，故下面的 CHECK 选择报错中止而不是清洗。
  IF NOT EXISTS (
       SELECT 1 FROM pg_constraint
        WHERE conname = '好友消息_媒体ID_fkey'
          AND conrelid = to_regclass('好友消息')
     ) THEN
    UPDATE "好友消息" SET "媒体ID" = NULL
     WHERE "媒体ID" IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM "媒体文件" mf WHERE mf."ID" = "好友消息"."媒体ID"::uuid);
    IF FOUND THEN
      RAISE WARNING '迁移 027：好友消息 的 媒体ID 存在悬空引用（媒体行已不存在），已置为 NULL 并继续';
    END IF;
    ALTER TABLE "好友消息"
      ADD CONSTRAINT "好友消息_媒体ID_fkey"
      FOREIGN KEY ("媒体ID") REFERENCES "媒体文件"("ID") ON DELETE SET NULL;
  END IF;

  -- 3) 类型值域：与 backend/src/config/媒体配置.ts::YUN_XU_XIAO_XI_LEI_XING 同源
  --    （清单一致性由 backend/scripts/__tests__/迁移027好友媒体列.test.ts 直读源文件把守）
  IF NOT EXISTS (
       SELECT 1 FROM pg_constraint
        WHERE conname = '好友消息_类型合法'
          AND conrelid = to_regclass('好友消息')
     ) THEN
    ALTER TABLE "好友消息"
      ADD CONSTRAINT "好友消息_类型合法"
      CHECK ("类型" IN ('wenben', 'tuPian', 'yuYin', 'wenJian', 'biaoQingBao'));
  END IF;
END $$;
