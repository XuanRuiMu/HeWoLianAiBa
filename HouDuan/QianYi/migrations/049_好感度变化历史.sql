CREATE TABLE IF NOT EXISTS "好感度变化历史" (
    "ID" BIGSERIAL PRIMARY KEY,
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "角色ID" UUID NOT NULL REFERENCES "角色"("ID") ON DELETE CASCADE,
    "信任度变化" INTEGER NOT NULL,
    "亲密度变化" INTEGER NOT NULL,
    "趣味度变化" INTEGER NOT NULL,
    "关怀度变化" INTEGER NOT NULL,
    "总分变化" INTEGER NOT NULL,
    "变化后信任度" INTEGER NOT NULL,
    "变化后亲密度" INTEGER NOT NULL,
    "变化后趣味度" INTEGER NOT NULL,
    "变化后关怀度" INTEGER NOT NULL,
    "变化后总分" INTEGER NOT NULL,
    "创建时间" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_好感度变化历史_用户角色时间"
    ON "好感度变化历史" ("用户ID", "角色ID", "创建时间" DESC, "ID" DESC);

CREATE OR REPLACE FUNCTION "记录好感度变化"()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW."信任度" IS NOT DISTINCT FROM OLD."信任度"
       AND NEW."亲密度" IS NOT DISTINCT FROM OLD."亲密度"
       AND NEW."趣味度" IS NOT DISTINCT FROM OLD."趣味度"
       AND NEW."关怀度" IS NOT DISTINCT FROM OLD."关怀度"
       AND NEW."总分" IS NOT DISTINCT FROM OLD."总分" THEN
        RETURN NEW;
    END IF;

    INSERT INTO "好感度变化历史" (
        "用户ID",
        "角色ID",
        "信任度变化",
        "亲密度变化",
        "趣味度变化",
        "关怀度变化",
        "总分变化",
        "变化后信任度",
        "变化后亲密度",
        "变化后趣味度",
        "变化后关怀度",
        "变化后总分"
    ) VALUES (
        NEW."用户ID",
        NEW."角色ID",
        COALESCE(NEW."信任度", 0) - COALESCE(OLD."信任度", 0),
        COALESCE(NEW."亲密度", 0) - COALESCE(OLD."亲密度", 0),
        COALESCE(NEW."趣味度", 0) - COALESCE(OLD."趣味度", 0),
        COALESCE(NEW."关怀度", 0) - COALESCE(OLD."关怀度", 0),
        COALESCE(NEW."总分", 0) - COALESCE(OLD."总分", 0),
        COALESCE(NEW."信任度", 0),
        COALESCE(NEW."亲密度", 0),
        COALESCE(NEW."趣味度", 0),
        COALESCE(NEW."关怀度", 0),
        COALESCE(NEW."总分", 0)
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "好感度写入变化历史" ON "好感度";

CREATE TRIGGER "好感度写入变化历史"
AFTER UPDATE OF "信任度", "亲密度", "趣味度", "关怀度", "总分"
ON "好感度"
FOR EACH ROW
EXECUTE FUNCTION "记录好感度变化"();
