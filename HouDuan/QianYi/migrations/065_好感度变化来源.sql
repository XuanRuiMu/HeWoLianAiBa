ALTER TABLE "好感度变化历史"
  ADD COLUMN IF NOT EXISTS "来源" TEXT NOT NULL DEFAULT 'liaotian';

CREATE INDEX IF NOT EXISTS "idx_好感度变化历史_来源"
  ON "好感度变化历史" ("用户ID", "角色ID", "来源");

CREATE OR REPLACE FUNCTION "记录好感度变化"()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    lai_yuan TEXT := COALESCE(NULLIF(current_setting('app.hao_gan_du_lai_yuan', true), ''), 'liaotian');
BEGIN
    IF NEW."信任度" IS NOT DISTINCT FROM OLD."信任度"
       AND NEW."亲密度" IS NOT DISTINCT FROM OLD."亲密度"
       AND NEW."趣味度" IS NOT DISTINCT FROM OLD."趣味度"
       AND NEW."关怀度" IS NOT DISTINCT FROM OLD."关怀度"
       AND NEW."总分" IS NOT DISTINCT FROM OLD."总分" THEN
        RETURN NEW;
    END IF;

    INSERT INTO "好感度变化历史" (
        "用户ID", "角色ID", "信任度变化", "亲密度变化", "趣味度变化", "关怀度变化", "总分变化",
        "变化后信任度", "变化后亲密度", "变化后趣味度", "变化后关怀度", "变化后总分", "来源"
    ) VALUES (
        NEW."用户ID", NEW."角色ID",
        COALESCE(NEW."信任度", 0) - COALESCE(OLD."信任度", 0),
        COALESCE(NEW."亲密度", 0) - COALESCE(OLD."亲密度", 0),
        COALESCE(NEW."趣味度", 0) - COALESCE(OLD."趣味度", 0),
        COALESCE(NEW."关怀度", 0) - COALESCE(OLD."关怀度", 0),
        COALESCE(NEW."总分", 0) - COALESCE(OLD."总分", 0),
        COALESCE(NEW."信任度", 0), COALESCE(NEW."亲密度", 0), COALESCE(NEW."趣味度", 0),
        COALESCE(NEW."关怀度", 0), COALESCE(NEW."总分", 0), lai_yuan
    );
    RETURN NEW;
END;
$$;
