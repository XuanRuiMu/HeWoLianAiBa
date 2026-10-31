ALTER TABLE "用户设置" ADD COLUMN IF NOT EXISTS "外观自定义" JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = '用户设置' AND constraint_name = '用户设置_外观自定义为对象'
  ) THEN
    ALTER TABLE "用户设置" ADD CONSTRAINT "用户设置_外观自定义为对象"
      CHECK (jsonb_typeof("外观自定义") = 'object');
  END IF;
END $$;

COMMENT ON COLUMN "用户设置"."外观自定义" IS '自定义背景与自定义气泡条目、预设背景名称与文字颜色覆盖、当前选中的自定义气泡';
