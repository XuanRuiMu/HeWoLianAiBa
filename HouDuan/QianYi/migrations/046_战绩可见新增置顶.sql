ALTER TABLE "游戏档案" DROP CONSTRAINT IF EXISTS "游戏档案_分类内排序唯一";
ALTER TABLE "游戏档案"
    ADD CONSTRAINT "游戏档案_分类内排序唯一"
    UNIQUE ("分类ID", "排序") DEFERRABLE INITIALLY DEFERRED;

WITH xuHou AS (
    SELECT "ID",
           row_number() OVER (
               PARTITION BY "分类ID"
               ORDER BY
                   CASE WHEN NOT ("模式" = 'tiaozhan' AND COALESCE("结果类型", '') = '') THEN 0 ELSE 1 END,
                   "排序",
                   "ID"
           ) - 1 AS "新排序"
    FROM "游戏档案"
)
UPDATE "游戏档案" d
SET "排序" = x."新排序"
FROM xuHou x
WHERE d."ID" = x."ID";

DROP TRIGGER IF EXISTS trg_游戏档案_新增可见置顶 ON "游戏档案";
DROP TRIGGER IF EXISTS trg_游戏档案_可见性变更 ON "游戏档案";
DROP TRIGGER IF EXISTS trg_游戏档案_删除后收敛 ON "游戏档案";
DROP TRIGGER IF EXISTS trg_游戏档案_确认默认分类 ON "游戏档案";
DROP FUNCTION IF EXISTS zhanJi_xinZengKeJianZhiDing();
DROP FUNCTION IF EXISTS zhanJi_keJianXingBianGeng();
DROP FUNCTION IF EXISTS zhanJi_shanChuHouShouLian();
DROP FUNCTION IF EXISTS zhanJi_queRenMoRenFenLei();

CREATE OR REPLACE FUNCTION zhanJi_chongPaiFenLei(fenLeiID UUID)
RETURNS void AS $$
UPDATE "游戏档案" d
SET "排序" = x."新排序"
FROM (
    SELECT "ID",
           row_number() OVER (
               PARTITION BY "分类ID"
               ORDER BY
                   CASE WHEN NOT ("模式" = 'tiaozhan' AND COALESCE("结果类型", '') = '') THEN 0 ELSE 1 END,
                   "排序",
                   "ID"
           ) - 1 AS "新排序"
    FROM "游戏档案"
    WHERE "分类ID" = fenLeiID
) x
WHERE d."ID" = x."ID";
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION zhanJi_zhunBeiPaiXu()
RETURNS trigger AS $$
DECLARE
    fenLeiID UUID;
    xiaXu INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM pg_advisory_xact_lock(hashtextextended('zhanJiPaiXu', 0));
        INSERT INTO "战绩分类" ("用户ID", "名称", "是否默认")
        VALUES (NEW."用户ID", '', TRUE)
        ON CONFLICT ("用户ID") WHERE "是否默认" = TRUE DO NOTHING;
        IF NEW."分类ID" IS NULL THEN
            SELECT "ID" INTO fenLeiID
            FROM "战绩分类"
            WHERE "用户ID" = NEW."用户ID" AND "是否默认" = TRUE
            LIMIT 1;
            NEW."分类ID" := fenLeiID;
        END IF;
        IF NEW."排序" IS NULL THEN
            SELECT COALESCE(MAX("排序"), -1) + 1 INTO xiaXu
            FROM "游戏档案"
            WHERE "分类ID" = NEW."分类ID";
            NEW."排序" := xiaXu;
        END IF;
        RETURN NEW;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('zhanJiPaiXu', 0));
    IF TG_OP = 'UPDATE' AND NEW."用户ID" IS DISTINCT FROM OLD."用户ID" THEN
        PERFORM pg_advisory_xact_lock(hashtextextended('zhanJiPaiXu', 0));
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION zhanJi_suoDingPaiXu()
RETURNS trigger AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended('zhanJiPaiXu', 0));
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_游戏档案_锁定变更 ON "游戏档案";
CREATE TRIGGER trg_游戏档案_锁定变更
BEFORE UPDATE OR DELETE ON "游戏档案"
FOR EACH STATEMENT
EXECUTE FUNCTION zhanJi_suoDingPaiXu();

DROP TRIGGER IF EXISTS trg_游戏档案_准备排序 ON "游戏档案";
DROP TRIGGER IF EXISTS trg_游戏档案_准备新增 ON "游戏档案";
DROP TRIGGER IF EXISTS trg_游戏档案_准备变更 ON "游戏档案";
DROP TRIGGER IF EXISTS trg_游戏档案_准备删除 ON "游戏档案";
CREATE TRIGGER trg_游戏档案_准备新增
BEFORE INSERT ON "游戏档案"
FOR EACH ROW
EXECUTE FUNCTION zhanJi_zhunBeiPaiXu();
CREATE TRIGGER trg_游戏档案_准备变更
BEFORE UPDATE OF "分类ID", "模式", "结果类型" ON "游戏档案"
FOR EACH ROW
EXECUTE FUNCTION zhanJi_zhunBeiPaiXu();
CREATE TRIGGER trg_游戏档案_准备删除
BEFORE DELETE ON "游戏档案"
FOR EACH ROW
EXECUTE FUNCTION zhanJi_zhunBeiPaiXu();

CREATE OR REPLACE FUNCTION zhanJi_chongPaiXinZeng()
RETURNS trigger AS $$
BEGIN
    WITH xuHou AS (
        SELECT d."ID",
               row_number() OVER (
                   PARTITION BY d."分类ID"
                   ORDER BY
                       CASE
                           WHEN NOT (d."模式" = 'tiaozhan' AND COALESCE(d."结果类型", '') = '') THEN
                               CASE WHEN n."ID" IS NOT NULL THEN 0 ELSE 1 END
                           ELSE 2
                       END,
                       d."排序",
                       d."ID"
               ) - 1 AS "新排序"
        FROM "游戏档案" d
        JOIN (SELECT DISTINCT "分类ID" FROM new_table) y ON y."分类ID" = d."分类ID"
        LEFT JOIN new_table n ON n."ID" = d."ID"
    )
    UPDATE "游戏档案" d
    SET "排序" = x."新排序"
    FROM xuHou x
    WHERE d."ID" = x."ID";
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION zhanJi_chongPaiBianGeng()
RETURNS trigger AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NULL;
    END IF;
    WITH bianDong AS (
        SELECT o."ID",
               o."分类ID" AS "旧分类",
               NOT (o."模式" = 'tiaozhan' AND COALESCE(o."结果类型", '') = '') AS "旧可见",
               n."分类ID" AS "新分类",
               NOT (n."模式" = 'tiaozhan' AND COALESCE(n."结果类型", '') = '') AS "新可见"
        FROM old_table o
        JOIN new_table n ON n."ID" = o."ID"
        WHERE o."分类ID" IS DISTINCT FROM n."分类ID"
           OR NOT (o."模式" = 'tiaozhan' AND COALESCE(o."结果类型", '') = '')
                 IS DISTINCT FROM NOT (n."模式" = 'tiaozhan' AND COALESCE(n."结果类型", '') = '')
    ), yingXiang AS (
        SELECT "旧分类" AS "分类ID" FROM bianDong
        UNION
        SELECT "新分类" FROM bianDong
    ), xuHou AS (
        SELECT d."ID",
               row_number() OVER (
                   PARTITION BY d."分类ID"
                   ORDER BY
                       CASE
                           WHEN (d."模式" = 'tiaozhan' AND COALESCE(d."结果类型", '') = '') THEN 3
                           WHEN b."旧可见" IS NOT NULL AND NOT b."旧可见" AND b."新可见" THEN 0
                           WHEN b."旧分类" IS DISTINCT FROM b."新分类" THEN 2
                           ELSE 1
                       END,
                       d."排序",
                       d."ID"
               ) - 1 AS "新排序"
        FROM "游戏档案" d
        JOIN yingXiang y ON y."分类ID" = d."分类ID"
        LEFT JOIN bianDong b ON b."ID" = d."ID"
    )
    UPDATE "游戏档案" d
    SET "排序" = x."新排序"
    FROM xuHou x
    WHERE d."ID" = x."ID";
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION zhanJi_chongPaiShanChu()
RETURNS trigger AS $$
BEGIN
    WITH yingXiang AS (
        SELECT DISTINCT "分类ID" FROM old_table
    ), xuHou AS (
        SELECT d."ID",
               row_number() OVER (
                   PARTITION BY d."分类ID"
                   ORDER BY
                       CASE WHEN NOT (d."模式" = 'tiaozhan' AND COALESCE(d."结果类型", '') = '') THEN 0 ELSE 1 END,
                       d."排序",
                       d."ID"
               ) - 1 AS "新排序"
        FROM "游戏档案" d
        JOIN yingXiang y ON y."分类ID" = d."分类ID"
    )
    UPDATE "游戏档案" d
    SET "排序" = x."新排序"
    FROM xuHou x
    WHERE d."ID" = x."ID";
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_游戏档案_整组重排 ON "游戏档案";
DROP TRIGGER IF EXISTS trg_游戏档案_新增整组重排 ON "游戏档案";
DROP TRIGGER IF EXISTS trg_游戏档案_更新整组重排 ON "游戏档案";
DROP TRIGGER IF EXISTS trg_游戏档案_删除整组重排 ON "游戏档案";
CREATE TRIGGER trg_游戏档案_新增整组重排
AFTER INSERT ON "游戏档案"
REFERENCING NEW TABLE AS new_table
FOR EACH STATEMENT
EXECUTE FUNCTION zhanJi_chongPaiXinZeng();
CREATE TRIGGER trg_游戏档案_更新整组重排
AFTER UPDATE ON "游戏档案"
REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
FOR EACH STATEMENT
EXECUTE FUNCTION zhanJi_chongPaiBianGeng();
CREATE TRIGGER trg_游戏档案_删除整组重排
AFTER DELETE ON "游戏档案"
REFERENCING OLD TABLE AS old_table
FOR EACH STATEMENT
EXECUTE FUNCTION zhanJi_chongPaiShanChu();
