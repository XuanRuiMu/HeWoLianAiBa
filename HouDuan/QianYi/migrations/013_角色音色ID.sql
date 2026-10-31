-- 添加角色音色ID字段用于TTS语音合成
ALTER TABLE "角色" ADD COLUMN IF NOT EXISTS "音色ID" VARCHAR(100);

-- 为现有角色设置默认音色（基于MBTI和性别）
UPDATE "角色" SET "音色ID" = 
  CASE 
    WHEN "MBTI" = 'ISTJ' AND "性别" = '男' THEN 'male-qn-qingse'
    WHEN "MBTI" = 'ISTJ' AND "性别" = '女' THEN 'female-shaonv'
    WHEN "MBTI" = 'ISFJ' AND "性别" = '男' THEN 'male-qn-qingse'
    WHEN "MBTI" = 'ISFJ' AND "性别" = '女' THEN 'female-shaonv'
    WHEN "MBTI" = 'INFJ' AND "性别" = '男' THEN 'male-qn-chenqing'
    WHEN "MBTI" = 'INFJ' AND "性别" = '女' THEN 'female-chengshu'
    WHEN "MBTI" = 'INTJ' AND "性别" = '男' THEN 'male-qn-chenqing'
    WHEN "MBTI" = 'INTJ' AND "性别" = '女' THEN 'female-chengshu'
    WHEN "MBTI" = 'ISTP' AND "性别" = '男' THEN 'male-qn-qingse'
    WHEN "MBTI" = 'ISTP' AND "性别" = '女' THEN 'female-shaonv'
    WHEN "MBTI" = 'ISFP' AND "性别" = '男' THEN 'male-qn-qingse'
    WHEN "MBTI" = 'ISFP' AND "性别" = '女' THEN 'female-loli'
    WHEN "MBTI" = 'INFP' AND "性别" = '男' THEN 'male-qn-qingse'
    WHEN "MBTI" = 'INFP' AND "性别" = '女' THEN 'female-loli'
    WHEN "MBTI" = 'INTP' AND "性别" = '男' THEN 'male-qn-qingse'
    WHEN "MBTI" = 'INTP' AND "性别" = '女' THEN 'female-shaonv'
    WHEN "MBTI" = 'ESTP' AND "性别" = '男' THEN 'male-qn-chenqing'
    WHEN "MBTI" = 'ESTP' AND "性别" = '女' THEN 'female-chengshu'
    WHEN "MBTI" = 'ESFP' AND "性别" = '男' THEN 'male-qn-chenqing'
    WHEN "MBTI" = 'ESFP' AND "性别" = '女' THEN 'female-chengshu'
    WHEN "MBTI" = 'ENFP' AND "性别" = '男' THEN 'male-qn-chenqing'
    WHEN "MBTI" = 'ENFP' AND "性别" = '女' THEN 'female-chengshu'
    WHEN "MBTI" = 'ENFJ' AND "性别" = '男' THEN 'male-qn-chenqing'
    WHEN "MBTI" = 'ENFJ' AND "性别" = '女' THEN 'female-chengshu'
    WHEN "MBTI" = 'ENTJ' AND "性别" = '男' THEN 'male-qn-chenqing'
    WHEN "MBTI" = 'ENTJ' AND "性别" = '女' THEN 'female-chengshu'
    WHEN "MBTI" = 'ESTJ' AND "性别" = '男' THEN 'male-qn-chenqing'
    WHEN "MBTI" = 'ESTJ' AND "性别" = '女' THEN 'female-chengshu'
    WHEN "MBTI" = 'ESFJ' AND "性别" = '男' THEN 'male-qn-chenqing'
    WHEN "MBTI" = 'ESFJ' AND "性别" = '女' THEN 'female-chengshu'
    WHEN "MBTI" = 'ENTP' AND "性别" = '男' THEN 'male-qn-chenqing'
    WHEN "MBTI" = 'ENTP' AND "性别" = '女' THEN 'female-chengshu'
    ELSE CASE WHEN "性别" = '女' THEN 'female-shaonv' ELSE 'male-qn-qingse' END
  END
WHERE "音色ID" IS NULL;