ALTER TABLE "战绩分类" ADD COLUMN IF NOT EXISTS "排序" INTEGER;

WITH xiangHouDengXu AS (
    SELECT "ID",
           row_number() OVER (
               PARTITION BY "用户ID"
               ORDER BY "是否默认" DESC, "创建时间", "ID"
           ) - 1 AS "xuHou"
    FROM "战绩分类"
)
UPDATE "战绩分类" c
SET "排序" = x."xuHou"
FROM xiangHouDengXu x
WHERE c."ID" = x."ID" AND c."排序" IS NULL;

ALTER TABLE "战绩分类" ALTER COLUMN "排序" SET DEFAULT 0;
ALTER TABLE "战绩分类" ALTER COLUMN "排序" SET NOT NULL;

DO $zhanJi$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = '战绩分类_排序非负' AND conrelid = '"战绩分类"'::regclass
    ) THEN
        ALTER TABLE "战绩分类"
            ADD CONSTRAINT "战绩分类_排序非负" CHECK ("排序" >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = '战绩分类_用户排序唯一' AND conrelid = '"战绩分类"'::regclass
    ) THEN
        ALTER TABLE "战绩分类"
            ADD CONSTRAINT "战绩分类_用户排序唯一" UNIQUE ("用户ID", "排序") DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END
$zhanJi$;

CREATE INDEX IF NOT EXISTS "idx_战绩分类_用户ID_排序"
    ON "战绩分类" ("用户ID", "排序", "ID");
