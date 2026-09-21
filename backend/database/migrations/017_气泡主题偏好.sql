-- 017 气泡主题偏好：用户设置表新增「气泡自己」「气泡AI」两列。
-- FP-03 根因治理：气泡样式由前端硬编码收敛为「预设单源 + 云端偏好」。
-- 白名单：weiXinLv（微信绿，默认自己）/ tianKongLan（天空蓝）/ yingFen（樱粉）
--   / anYe（暗夜）/ ningMengHuang（柠檬黄）/ yunBai（云白，默认AI）。
-- 幂等写法，已有列时为无副作用空操作。

ALTER TABLE "用户设置" ADD COLUMN IF NOT EXISTS "气泡自己" VARCHAR(30) NOT NULL DEFAULT 'weiXinLv';
ALTER TABLE "用户设置" ADD COLUMN IF NOT EXISTS "气泡AI" VARCHAR(30) NOT NULL DEFAULT 'yunBai';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = '用户设置' AND constraint_name = '用户设置_气泡自己合法'
  ) THEN
    ALTER TABLE "用户设置" ADD CONSTRAINT "用户设置_气泡自己合法"
      CHECK ("气泡自己" IN ('weiXinLv', 'tianKongLan', 'yingFen', 'anYe', 'ningMengHuang', 'yunBai'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = '用户设置' AND constraint_name = '用户设置_气泡AI合法'
  ) THEN
    ALTER TABLE "用户设置" ADD CONSTRAINT "用户设置_气泡AI合法"
      CHECK ("气泡AI" IN ('weiXinLv', 'tianKongLan', 'yingFen', 'anYe', 'ningMengHuang', 'yunBai'));
  END IF;
END $$;
