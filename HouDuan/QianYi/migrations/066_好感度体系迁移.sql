CREATE TABLE IF NOT EXISTS "好感度_备份_20261127" AS
SELECT * FROM "好感度";

ALTER TABLE "好感度" DISABLE TRIGGER "好感度写入变化历史";

UPDATE "好感度" g
SET "总分" = GREATEST(5, LEAST(1000, ROUND((g."总分"::numeric - 310) / 160.0 * 220 + 30)))
FROM "角色" r
WHERE r."ID" = g."角色ID"
  AND r."封存" = FALSE
  AND r."结局状态" = '';

UPDATE "好感度" t
SET
  "信任度" = b."信任",
  "亲密度" = b."亲密",
  "趣味度" = b."趣味",
  "关怀度" = b."关怀"
FROM (
  SELECT
    g."用户ID",
    g."角色ID",
    x."信任",
    x."亲密",
    x."趣味",
    x."关怀" + (g."总分" - (x."信任" + x."亲密" + x."趣味" + x."关怀")) AS "关怀"
  FROM "好感度" g
  CROSS JOIN LATERAL (
    SELECT
      FLOOR(g."总分" * 0.35)::integer AS "信任",
      FLOOR(g."总分" * 0.25)::integer AS "亲密",
      FLOOR(g."总分" * 0.20)::integer AS "趣味",
      FLOOR(g."总分" * 0.20)::integer AS "关怀"
  ) x
) b
WHERE t."用户ID" = b."用户ID" AND t."角色ID" = b."角色ID";

UPDATE "好感度"
SET "关系阶段" = CASE
    WHEN "总分" <= 100 THEN '冷淡'
    WHEN "总分" <= 200 THEN '疏远'
    WHEN "总分" <= 300 THEN '认识'
    WHEN "总分" <= 400 THEN '熟悉'
    WHEN "总分" <= 500 THEN '朋友'
    WHEN "总分" <= 600 THEN '好友'
    WHEN "总分" <= 700 THEN '暧昧'
    WHEN "总分" <= 800 THEN '心动'
    WHEN "总分" <= 900 THEN '热恋'
    ELSE '深爱'
END;

ALTER TABLE "好感度" ENABLE TRIGGER "好感度写入变化历史";

DO $jiancha$
DECLARE
    bu_he_ge integer;
    yue_jie integer;
BEGIN
    SELECT COUNT(*) INTO bu_he_ge
    FROM "好感度" g
    JOIN "角色" r ON r."ID" = g."角色ID" AND r."封存" = FALSE AND r."结局状态" = ''
    WHERE g."信任度" + g."亲密度" + g."趣味度" + g."关怀度" <> g."总分";

    IF bu_he_ge > 0 THEN
        RAISE EXCEPTION '迁移失败：四维和与总分不一致的记录数 = %', bu_he_ge;
    END IF;

    SELECT COUNT(*) INTO yue_jie
    FROM "好感度" g
    JOIN "角色" r ON r."ID" = g."角色ID" AND r."封存" = FALSE AND r."结局状态" = ''
    WHERE g."总分" < 5 OR g."总分" > 1000
       OR g."信任度" < 0 OR g."亲密度" < 0 OR g."趣味度" < 0 OR g."关怀度" < 0;

    IF yue_jie > 0 THEN
        RAISE EXCEPTION '迁移失败：存在越界记录 % 条', yue_jie;
    END IF;

    RAISE NOTICE '迁移校验通过：四维和 = 总分，全部在测记录一致';
END
$jiancha$;
