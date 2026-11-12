ALTER TABLE "角色" ADD COLUMN IF NOT EXISTS "头像描述" TEXT;
ALTER TABLE "角色" ADD COLUMN IF NOT EXISTS "情绪基调" VARCHAR(20);

COMMENT ON COLUMN "角色"."头像描述" IS 'AI对象头像的精简文字描述，常驻注入提示词供角色自我认知与演化后同步更新';
COMMENT ON COLUMN "角色"."情绪基调" IS '头像演化使用的当前情绪基调档位：阴郁/平静/明朗，空值表示尚未演化评估';
