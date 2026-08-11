-- 和我恋爱吧 - 数据库中文初始化脚本
-- PostgreSQL 16
-- 所有表名/字段名使用中文标识符，SQL 中用双引号包裹

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 清理历史残留表
DROP TABLE IF EXISTS "积分变动";

-- 1. 用户表
CREATE TABLE IF NOT EXISTS "用户" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "手机号" VARCHAR(20) NOT NULL UNIQUE,
    "用户名" VARCHAR(50) UNIQUE,
    "密码哈希" VARCHAR(255),
    "昵称" VARCHAR(50),
    "性别" VARCHAR(10),
    "目标性别" VARCHAR(10),
    "默认性别" VARCHAR(10),
    "性格选择" VARCHAR(50),
    "人设标签" VARCHAR(50),
    "渣男渣女变体" BOOLEAN DEFAULT FALSE,
    "头像" TEXT,
    "生日" VARCHAR(20),
    "签名" TEXT,
    "管理员" BOOLEAN DEFAULT FALSE,
    "测试" BOOLEAN DEFAULT FALSE,
    "活跃角色ID" UUID,
    "创建时间" TIMESTAMPTZ DEFAULT NOW(),
    "更新时间" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 角色表
CREATE TABLE IF NOT EXISTS "角色" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "名字" VARCHAR(100) NOT NULL,
    "性别" VARCHAR(10) NOT NULL,
    "年龄" INTEGER,
    "外貌" TEXT,
    "性格" TEXT,
    "背景故事" TEXT,
    "爱好" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "言语风格" TEXT,
    "头像" TEXT,
    "背景图" TEXT,
    "标签" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "热度" INTEGER DEFAULT 0,
    "喜欢的类型" TEXT DEFAULT '',
    "家庭背景" TEXT DEFAULT '',
    "情感经历" TEXT DEFAULT '',
    "是否渣型" BOOLEAN DEFAULT FALSE,
    "渣法描述" TEXT,
    "话术" TEXT[],
    "暴露方式" TEXT,
    "识破线索" TEXT[],
    "预设类型" VARCHAR(10),
    "IE类型" VARCHAR(1),
    "热身类型" VARCHAR(10),
    "开场白" JSONB,
    "MBTI" VARCHAR(4),
    "微信昵称" VARCHAR(100),
    "真实姓名" VARCHAR(100),
    "世界信息" JSONB,
    "随机性格" BOOLEAN DEFAULT FALSE,
    "封存" BOOLEAN DEFAULT FALSE,
    "可继续聊天" BOOLEAN DEFAULT FALSE,
    "结局状态" VARCHAR(50) DEFAULT '',
    "删除时间" TIMESTAMPTZ,
    "创建时间" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 消息表
CREATE TABLE IF NOT EXISTS "消息" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "角色ID" UUID NOT NULL REFERENCES "角色"("ID") ON DELETE CASCADE,
    "内容" TEXT NOT NULL,
    "发送者" VARCHAR(20) NOT NULL,
    "类型" VARCHAR(20) DEFAULT 'wenBen',
    "已读" BOOLEAN DEFAULT FALSE,
    "已撤回" BOOLEAN DEFAULT FALSE,
    "撤回时间" TIMESTAMPTZ,
    "原始内容" TEXT,
    "客户端序号" BIGINT,
    "创建时间" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 好感度表
CREATE TABLE IF NOT EXISTS "好感度" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "角色ID" UUID NOT NULL REFERENCES "角色"("ID") ON DELETE CASCADE,
    "信任度" INTEGER DEFAULT 0,
    "亲密度" INTEGER DEFAULT 0,
    "趣味度" INTEGER DEFAULT 0,
    "关怀度" INTEGER DEFAULT 0,
    "总分" INTEGER DEFAULT 0,
    "关系阶段" VARCHAR(20) DEFAULT 'lengDan',
    "互动次数" INTEGER DEFAULT 0,
    "最后互动时间" TIMESTAMPTZ,
    "创建时间" TIMESTAMPTZ DEFAULT NOW(),
    "最后AI消息时间" TIMESTAMPTZ,
    "最后用户回复时间" TIMESTAMPTZ,
    "超时次数" INTEGER DEFAULT 0,
    UNIQUE ("用户ID", "角色ID")
);

-- 5. 记忆表
CREATE TABLE IF NOT EXISTS "记忆" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "角色ID" UUID NOT NULL REFERENCES "角色"("ID") ON DELETE CASCADE,
    "关键词" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "摘要" TEXT NOT NULL,
    "重要度" INTEGER DEFAULT 5,
    "创建时间" TIMESTAMPTZ DEFAULT NOW(),
    "过期时间" TIMESTAMPTZ,
    "事件类型" VARCHAR(50)
);

-- 6. 对话摘要表
CREATE TABLE IF NOT EXISTS "对话摘要" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "角色ID" UUID NOT NULL REFERENCES "角色"("ID") ON DELETE CASCADE,
    "摘要内容" TEXT NOT NULL,
    "概括消息数" INTEGER DEFAULT 0,
    "创建时间" TIMESTAMPTZ DEFAULT NOW(),
    "更新时间" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE ("用户ID", "角色ID")
);

-- 7. 审计日志表
CREATE TABLE IF NOT EXISTS "审计日志" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "IP" VARCHAR(45) NOT NULL,
    "事件类型" VARCHAR(100) NOT NULL,
    "详情" JSONB,
    "类型" VARCHAR(20) DEFAULT 'pu_tong',
    "创建时间" TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 封禁记录表
CREATE TABLE IF NOT EXISTS "封禁记录" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "IP" VARCHAR(45) NOT NULL,
    "原因" TEXT,
    "严重程度" VARCHAR(20),
    "解封时间" TIMESTAMPTZ,
    "创建时间" TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 通知表
CREATE TABLE IF NOT EXISTS "通知" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "发送者ID" UUID REFERENCES "用户"("ID") ON DELETE SET NULL,
    "接收者ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "标题" VARCHAR(255) NOT NULL,
    "内容" TEXT NOT NULL,
    "已读" BOOLEAN DEFAULT FALSE,
    "创建时间" TIMESTAMPTZ DEFAULT NOW(),
    "已读时间" TIMESTAMPTZ
);

-- 10. 游戏档案表
CREATE TABLE IF NOT EXISTS "游戏档案" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "角色ID" UUID NOT NULL REFERENCES "角色"("ID") ON DELETE CASCADE,
    "角色名字" VARCHAR(100),
    "是否渣型" BOOLEAN DEFAULT FALSE,
    "结果类型" VARCHAR(50) DEFAULT '',
    "是否封存" BOOLEAN DEFAULT FALSE,
    "好感度总分" INTEGER DEFAULT 0,
    "关系阶段" VARCHAR(20) DEFAULT 'lengDan',
    "聊天天数" INTEGER DEFAULT 0,
    "消息总数" INTEGER DEFAULT 0,
    "是否秘籍通关" BOOLEAN DEFAULT FALSE,
    "秘籍前好感度" INTEGER,
    "复盘数据" JSONB DEFAULT '[]'::jsonb,
    "复盘内容" TEXT,
    "创建时间" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE ("用户ID", "角色ID")
);

-- 11. 游戏结局表
CREATE TABLE IF NOT EXISTS "游戏结局" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "角色ID" UUID REFERENCES "角色"("ID") ON DELETE SET NULL,
    "结果状态" VARCHAR(50) NOT NULL,
    "摘要" JSONB,
    "创建时间" TIMESTAMPTZ DEFAULT NOW()
);

-- 12. 成就表
CREATE TABLE IF NOT EXISTS "成就" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "成就类型" VARCHAR(50) NOT NULL,
    "角色名字" VARCHAR(100),
    "创建时间" TIMESTAMPTZ DEFAULT NOW()
);

-- 13. 用户人设表
CREATE TABLE IF NOT EXISTS "用户人设" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "名称" VARCHAR(100) NOT NULL,
    "描述" TEXT,
    "特质" JSONB,
    "说话风格" TEXT,
    "背景故事" TEXT,
    "是否预设" BOOLEAN DEFAULT FALSE,
    "是否活跃" BOOLEAN DEFAULT FALSE,
    "创建时间" TIMESTAMPTZ DEFAULT NOW()
);

-- 14. 反馈表
CREATE TABLE IF NOT EXISTS "反馈" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "角色ID" UUID NOT NULL REFERENCES "角色"("ID") ON DELETE CASCADE,
    "起始消息ID" UUID REFERENCES "消息"("ID") ON DELETE SET NULL,
    "结束消息ID" UUID REFERENCES "消息"("ID") ON DELETE SET NULL,
    "反馈内容" TEXT NOT NULL,
    "类别" VARCHAR(50) NOT NULL,
    "AI分析" JSONB,
    "创建时间" TIMESTAMPTZ DEFAULT NOW()
);

-- 15. 评估表
CREATE TABLE IF NOT EXISTS "评估" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "角色ID" UUID NOT NULL REFERENCES "角色"("ID") ON DELETE CASCADE,
    "话题引导" JSONB,
    "情感共鸣" JSONB,
    "幽默感" JSONB,
    "体贴度" JSONB,
    "节奏把控" JSONB,
    "总体评价" TEXT,
    "改进建议" JSONB,
    "创建时间" TIMESTAMPTZ DEFAULT NOW()
);

-- 16. 夺舍日志表
CREATE TABLE IF NOT EXISTS "夺舍日志" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "管理员ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "角色ID" UUID NOT NULL REFERENCES "角色"("ID") ON DELETE CASCADE,
    "结束时间" TIMESTAMPTZ,
    "创建时间" TIMESTAMPTZ DEFAULT NOW()
);

-- 17. 关键事件表
CREATE TABLE IF NOT EXISTS "关键事件" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "角色ID" UUID NOT NULL REFERENCES "角色"("ID") ON DELETE CASCADE,
    "事件类型" VARCHAR(50),
    "描述" TEXT,
    "创建时间" TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_用户_手机号 ON "用户"("手机号");
CREATE INDEX IF NOT EXISTS idx_用户_用户名 ON "用户"("用户名");
CREATE INDEX IF NOT EXISTS idx_用户_活跃角色ID ON "用户"("活跃角色ID");

CREATE INDEX IF NOT EXISTS idx_角色_用户ID ON "角色"("用户ID");
CREATE INDEX IF NOT EXISTS idx_角色_删除时间 ON "角色"("删除时间");
CREATE INDEX IF NOT EXISTS idx_角色_热度 ON "角色"("热度" DESC);

CREATE INDEX IF NOT EXISTS idx_消息_用户ID_角色ID ON "消息"("用户ID", "角色ID");
CREATE INDEX IF NOT EXISTS idx_消息_角色ID_创建时间 ON "消息"("角色ID", "创建时间");
CREATE INDEX IF NOT EXISTS idx_消息_创建时间 ON "消息"("创建时间");

CREATE INDEX IF NOT EXISTS idx_好感度_用户ID_角色ID ON "好感度"("用户ID", "角色ID");
CREATE INDEX IF NOT EXISTS idx_好感度_最后AI消息时间 ON "好感度"("最后AI消息时间");

CREATE INDEX IF NOT EXISTS idx_记忆_用户ID_角色ID ON "记忆"("用户ID", "角色ID");
CREATE INDEX IF NOT EXISTS idx_记忆_过期时间 ON "记忆"("过期时间");

CREATE INDEX IF NOT EXISTS idx_对话摘要_用户ID_角色ID ON "对话摘要"("用户ID", "角色ID");

CREATE INDEX IF NOT EXISTS idx_审计日志_创建时间 ON "审计日志"("创建时间" DESC);
CREATE INDEX IF NOT EXISTS idx_审计日志_事件类型 ON "审计日志"("事件类型");

CREATE INDEX IF NOT EXISTS idx_封禁记录_IP ON "封禁记录"("IP");
CREATE INDEX IF NOT EXISTS idx_封禁记录_解封时间 ON "封禁记录"("解封时间");

CREATE INDEX IF NOT EXISTS idx_通知_接收者ID ON "通知"("接收者ID");
CREATE INDEX IF NOT EXISTS idx_通知_接收者ID_已读 ON "通知"("接收者ID", "已读");

CREATE INDEX IF NOT EXISTS idx_游戏档案_用户ID ON "游戏档案"("用户ID");
CREATE INDEX IF NOT EXISTS idx_游戏档案_用户ID_角色ID ON "游戏档案"("用户ID", "角色ID");
CREATE INDEX IF NOT EXISTS idx_游戏档案_是否秘籍通关 ON "游戏档案"("是否秘籍通关");

CREATE INDEX IF NOT EXISTS idx_游戏结局_用户ID ON "游戏结局"("用户ID");
CREATE INDEX IF NOT EXISTS idx_成就_用户ID ON "成就"("用户ID");

CREATE INDEX IF NOT EXISTS idx_用户人设_用户ID ON "用户人设"("用户ID");
CREATE INDEX IF NOT EXISTS idx_反馈_用户ID ON "反馈"("用户ID");
CREATE INDEX IF NOT EXISTS idx_评估_用户ID ON "评估"("用户ID");
CREATE INDEX IF NOT EXISTS idx_夺舍日志_管理员ID ON "夺舍日志"("管理员ID");
CREATE INDEX IF NOT EXISTS idx_夺舍日志_角色ID ON "夺舍日志"("角色ID");
CREATE INDEX IF NOT EXISTS idx_关键事件_用户ID_角色ID ON "关键事件"("用户ID", "角色ID");
