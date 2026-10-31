CREATE TABLE IF NOT EXISTS "战绩分类" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "名称" VARCHAR(20) NOT NULL DEFAULT '',
    "是否默认" BOOLEAN NOT NULL DEFAULT FALSE,
    "版本" INTEGER NOT NULL DEFAULT 0,
    "创建时间" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "战绩分类_ID用户唯一" UNIQUE ("ID", "用户ID"),
    CONSTRAINT "战绩分类_版本非负" CHECK ("版本" >= 0),
    CONSTRAINT "战绩分类_名称合法" CHECK (
        char_length("名称") <= 20
        AND "名称" = btrim("名称", E' \t\r\n')
        AND ("是否默认" OR char_length(btrim("名称", E' \t\r\n')) > 0)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS "战绩分类_每用户默认唯一"
    ON "战绩分类" ("用户ID") WHERE "是否默认" = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS "战绩分类_用户名称唯一"
    ON "战绩分类" ("用户ID", lower(btrim("名称", E' \t\r\n')))
    WHERE btrim("名称", E' \t\r\n') <> '';

INSERT INTO "战绩分类" ("用户ID", "名称", "是否默认")
SELECT u."ID", '', TRUE
FROM "用户" u
ON CONFLICT ("用户ID") WHERE "是否默认" = TRUE DO NOTHING;

ALTER TABLE "游戏档案" ADD COLUMN IF NOT EXISTS "分类ID" UUID;
ALTER TABLE "游戏档案" ADD COLUMN IF NOT EXISTS "排序" INTEGER;

WITH moRenFenLei AS (
    SELECT "用户ID", "ID" AS "分类ID"
    FROM "战绩分类"
    WHERE "是否默认" = TRUE
), xuHouDengXu AS (
    SELECT d."ID", m."分类ID",
           row_number() OVER (
               PARTITION BY d."用户ID"
               ORDER BY d."创建时间" DESC, d."ID" DESC
           ) - 1 AS "排序"
    FROM "游戏档案" d
    JOIN moRenFenLei m ON m."用户ID" = d."用户ID"
    WHERE d."分类ID" IS NULL OR d."排序" IS NULL
)
UPDATE "游戏档案" d
SET "分类ID" = x."分类ID", "排序" = x."排序"
FROM xuHouDengXu x
WHERE d."ID" = x."ID";

ALTER TABLE "游戏档案" ALTER COLUMN "分类ID" SET NOT NULL;
ALTER TABLE "游戏档案" ALTER COLUMN "排序" SET NOT NULL;

DO $zhanJi$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = '游戏档案_分类内排序非负' AND conrelid = '"游戏档案"'::regclass
    ) THEN
        ALTER TABLE "游戏档案"
            ADD CONSTRAINT "游戏档案_分类内排序非负" CHECK ("排序" >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = '游戏档案_分类内排序唯一' AND conrelid = '"游戏档案"'::regclass
    ) THEN
        ALTER TABLE "游戏档案"
            ADD CONSTRAINT "游戏档案_分类内排序唯一"
            UNIQUE ("分类ID", "排序") DEFERRABLE INITIALLY IMMEDIATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = '游戏档案_分类用户归属' AND conrelid = '"游戏档案"'::regclass
    ) THEN
        ALTER TABLE "游戏档案"
            ADD CONSTRAINT "游戏档案_分类用户归属"
            FOREIGN KEY ("分类ID", "用户ID")
            REFERENCES "战绩分类" ("ID", "用户ID")
            ON DELETE RESTRICT
            NOT VALID;
    END IF;
END
$zhanJi$;

ALTER TABLE "游戏档案" VALIDATE CONSTRAINT "游戏档案_分类用户归属";

CREATE INDEX IF NOT EXISTS "idx_游戏档案_用户ID_分类ID_排序"
    ON "游戏档案" ("用户ID", "分类ID", "排序", "ID");

CREATE OR REPLACE FUNCTION zhanJi_queRenMoRenFenLei()
RETURNS trigger AS $$
DECLARE
    fenLeiID UUID;
    xiaXu INTEGER;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW."用户ID"::text, 0));

    INSERT INTO "战绩分类" ("用户ID", "名称", "是否默认")
    VALUES (NEW."用户ID", '', TRUE)
    ON CONFLICT ("用户ID") WHERE "是否默认" = TRUE DO NOTHING;

    IF NEW."分类ID" IS NULL THEN
        SELECT "ID" INTO fenLeiID
        FROM "战绩分类"
        WHERE "用户ID" = NEW."用户ID" AND "是否默认" = TRUE
        LIMIT 1;
        NEW."分类ID" := fenLeiID;
    ELSE
        fenLeiID := NEW."分类ID";
    END IF;

    IF NEW."排序" IS NULL THEN
        SELECT COALESCE(MAX("排序"), -1) + 1 INTO xiaXu
        FROM "游戏档案"
        WHERE "分类ID" = fenLeiID;
        NEW."排序" := xiaXu;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_游戏档案_确认默认分类 ON "游戏档案";
CREATE TRIGGER trg_游戏档案_确认默认分类
BEFORE INSERT ON "游戏档案"
FOR EACH ROW
EXECUTE FUNCTION zhanJi_queRenMoRenFenLei();
