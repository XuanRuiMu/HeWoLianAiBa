SELECT count(*) FILTER (WHERE "向量" IS NOT NULL) AS 有向量, count(*) AS 总数 FROM "系统表情";
SELECT count(*) AS 用户数 FROM "用户";
SELECT count(*) AS 角色数 FROM "角色";
SELECT count(*) AS 消息数 FROM "消息";
SELECT count(*) AS 结局数 FROM "游戏结局";
SELECT count(*) AS 好感度数 FROM "好感度";
