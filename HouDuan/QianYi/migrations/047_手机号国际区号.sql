ALTER TABLE "用户" ALTER COLUMN "手机号" TYPE VARCHAR(32);

UPDATE "用户"
SET "手机号" = '+86' || "手机号"
WHERE "手机号" NOT LIKE '+%' AND "手机号" ~ '^[0-9]{6,}$';

ALTER TABLE "用户" ADD CONSTRAINT "用户_手机号_格式" CHECK ("手机号" ~ '^\+[0-9]{4,16}$' OR "手机号" LIKE '注销\_%');

CREATE INDEX IF NOT EXISTS "用户_国际区号_索引" ON "用户" (substring("手机号" from '^\+[0-9]{1,4}'));
