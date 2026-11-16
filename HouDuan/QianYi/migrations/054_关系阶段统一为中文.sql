-- 统一关系阶段的存储格式为中文档名。
-- 历史上写入过拼音键（lengDan/shuYuan/renShi/shuXi/pengYou/haoYou/aiMei/xinDong/reLian/shenAi），
-- 读取侧已兼容两种格式；本迁移把存量数据一次性归一为中文，之后代码只写中文。
UPDATE "好感度"
SET "关系阶段" = CASE "关系阶段"
  WHEN 'lengDan' THEN '冷淡'
  WHEN 'shuYuan' THEN '疏远'
  WHEN 'renShi'  THEN '认识'
  WHEN 'shuXi'   THEN '熟悉'
  WHEN 'pengYou' THEN '朋友'
  WHEN 'haoYou'  THEN '好友'
  WHEN 'aiMei'   THEN '暧昧'
  WHEN 'xinDong' THEN '心动'
  WHEN 'reLian'  THEN '热恋'
  WHEN 'shenAi'  THEN '深爱'
  ELSE "关系阶段"
END
WHERE "关系阶段" IN ('lengDan','shuYuan','renShi','shuXi','pengYou','haoYou','aiMei','xinDong','reLian','shenAi');

UPDATE "游戏档案"
SET "关系阶段" = CASE "关系阶段"
  WHEN 'lengDan' THEN '冷淡'
  WHEN 'shuYuan' THEN '疏远'
  WHEN 'renShi'  THEN '认识'
  WHEN 'shuXi'   THEN '熟悉'
  WHEN 'pengYou' THEN '朋友'
  WHEN 'haoYou'  THEN '好友'
  WHEN 'aiMei'   THEN '暧昧'
  WHEN 'xinDong' THEN '心动'
  WHEN 'reLian'  THEN '热恋'
  WHEN 'shenAi'  THEN '深爱'
  ELSE "关系阶段"
END
WHERE "关系阶段" IN ('lengDan','shuYuan','renShi','shuXi','pengYou','haoYou','aiMei','xinDong','reLian','shenAi');
