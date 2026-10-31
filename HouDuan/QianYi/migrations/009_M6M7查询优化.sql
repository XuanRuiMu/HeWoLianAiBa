-- M6 消息分页排序索引：NULLS LAST 语义与 COALESCE(序号,0) 等价，
-- 使分页排序可走索引而非全表表达式计算
CREATE INDEX IF NOT EXISTS idx_消息_会话_序号_时间
    ON "消息" ("用户ID", "角色ID", "客户端序号" DESC NULLS LAST, "创建时间" DESC);

-- M7 战绩列表优化：游戏档案冗余「最后消息时间」列 + 触发器自动维护，
-- 列表查询消掉每行一次的 MAX(创建时间) 相关子查询
ALTER TABLE "游戏档案" ADD COLUMN IF NOT EXISTS "最后消息时间" TIMESTAMPTZ;

UPDATE "游戏档案" d
   SET "最后消息时间" = zuixin.zui_da
  FROM (
    SELECT "用户ID", "角色ID", MAX("创建时间") AS zui_da
      FROM "消息"
     GROUP BY "用户ID", "角色ID"
  ) zuixin
 WHERE d."用户ID" = zuixin."用户ID"
   AND d."角色ID" = zuixin."角色ID";

CREATE OR REPLACE FUNCTION hanShu_gengXinZuiHouXiaoXiShiJian()
RETURNS trigger AS $$
BEGIN
    UPDATE "游戏档案"
       SET "最后消息时间" = NEW."创建时间"
     WHERE "用户ID" = NEW."用户ID"
       AND "角色ID" = NEW."角色ID";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_消息_更新最后消息时间 ON "消息";
CREATE TRIGGER trg_消息_更新最后消息时间
AFTER INSERT ON "消息"
FOR EACH ROW
EXECUTE FUNCTION hanShu_gengXinZuiHouXiaoXiShiJian();
