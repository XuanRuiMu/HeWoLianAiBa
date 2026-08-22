# PROGRESS

## 元信息
- 项目：D:\xuanr\Desktop\燃烧之陨我的世界服务端\和我恋爱吧
- 任务：AI 模型统一切换 deepseek-v4-flash-vision-exp + 多媒体聊天（图片/表情包/文件/语音条）+ 语音/视频通话 + 需求文档同步修订
- 循环计数：5 / 33（熔断上限）
- 单问题修复上限：5 次

## 目标与停止条件
- 停止条件（全部可机器验证）：后端 `npm run test` 全绿且 `npm run build` 成功；前端 `npm run test` 全绿且 `npm run build` 成功；lint 零报错；用户视角 E2E 截图验证通过；后端 log 无未预期错误；总控制台上传成功。

## 范围边界
- 做：FP-01~FP-10（见下表）
- 不做：挑战模式、朋友圈、多语言国际化、积分系统、管理员后台前端、TTS/STT/实时语音大模型接入、真实 WebRTC 媒体转发（通话仅信令+UI+记录）、AI 发送图片/表情包（仅用户可发多媒体，AI 借 vision 理解）
- 禁止触碰：.env 中现有密钥值（只改 DEEPSEEK_MODEL）、总控制台目录、其他项目目录

## 核心契约（所有子代理必须遵守）
1. 全部 AI 场景模型 = `deepseek-v4-flash-vision-exp`（AI配置.ts / config/index.ts / .env / backend/.env / backend/.env.example / 测试）
2. 媒体消息类型（消息."类型"，全小写）：`wenben`(默认) | `tuPian` | `biaoQingBao` | `yuYin` | `wenJian`
3. 内容寻址存储 CAS：磁盘 `backend/uploads/media/<sha256前2位>/<sha256>`；新表 `媒体文件`(ID UUID PK, "SHA256" CHAR(64) UNIQUE, "原始文件名" TEXT, "MIME" VARCHAR(100), "大小字节" BIGINT, "类别" VARCHAR(20), "宽" INTEGER NULL, "高" INTEGER NULL, "时长毫秒" INTEGER NULL, "上传者ID" UUID REFERENCES 用户(ID), "创建时间" TIMESTAMPTZ)；消息表加列 `"媒体ID" UUID NULL REFERENCES "媒体文件"("ID")`
4. 上传 API：`POST /api/聊天/会话/:huiHuaId/媒体`（multipart field=file，流式 busboy 边落盘边算 SHA256，禁止全量进内存）；下载 API：`GET /api/媒体/:sha256?e=<过期时间戳>&s=<HMAC签名>`，ETag=sha256、Cache-Control immutable、支持 Range（express sendFile 原生）；签名密钥复用 JWT_SECRET（HMAC-SHA256(sha256+e)，校验失败403）
5. 大小/MIME 白名单（常量可配置）：图片≤10MB(jpeg/png/gif/webp)、音频≤10MB(webm/ogg/mp3/wav/m4a/aac)、文件≤50MB(pdf/txt/doc/docx/xls/xlsx/ppt/pptx/zip/rar/7z/mp4/mov)；违规返回翻译文件错误
6. 后端不装原生模块（不用 sharp/multer，用 busboy@^1）；前端上传前 canvas 压缩图片（长边≤1280、质量0.8）
7. AI 视觉：DeepSeek客户端.ts 的 DuiHuaXiaoXi.neiRong 扩展为 string | 内容块[]；user 消息图片以 `{type:'input_image', image_url:{url:'data:<mime>;base64,...'}}` 内联（Responses API 官方格式）；system/assistant 禁止带图（官方限制）；token 预算每图按 384 计
8. 表情包库：前端内置 SVG→canvas 渲染 PNG(512×512) 贴纸集（emoji+文字标签，≥12个），点击经压缩上传通道发送，类型 biaoQingBao，气泡透明背景大图
9. 语音条：MediaRecorder audio/webm(opus)，按住说话/松开发送/上滑取消，上限60秒，气泡波形动画+时长+播放
10. 通话：新表 `通话记录`(ID, "用户ID", "角色ID", "类型" yuYin|shiPin, "状态" yiJieTong|yiQuXiao|yiJuJie|yiChaoShi, "接通时间", "结束时间", "时长秒", "创建时间")；Socket 事件（中文）：`通话邀请`/`通话取消`/`通话接受`/`通话拒绝`/`通话挂断`/`通话超时`；AI 模拟响铃 2~6 秒自动接听；硬上限 600 秒自动结束；结束后写通话记录并向聊天插入系统消息（如"[语音通话] 时长 MM:SS"/"已取消"）；视频形态本地 getUserMedia 回显+AI侧头像光效占位
11. 所有新增用户可见文本必须同时加入 frontend/src/config/translations.ts 与 backend/src/config/translations.ts 对应段落，禁止硬编码
12. 命名规范：新代码全中文标识符（不可时拼音驼峰）；API 路径中文
13. 复盘/军师/Prompt 对非文本消息文本化描述：`[图片]` `[表情包]` `[语音(12秒)]` `[文件:名.pdf]`；检测类调用（表白/互删/识破/神经病）输入含图片内容块（vision 统一）

## 功能点列表
| ID | 描述 | 依赖 | 状态 |
| --- | --- | --- | --- |
| FP-01 | 需求文档修订：7.1模型ID、2.2范围边界、新增FP-20多媒体消息、FP-21通话功能点及验收标准、非功能需求补充 | 无 | 已完成 |
| FP-02 | 模型统一切换 deepseek-v4-flash-vision-exp（配置/env/测试） | FP-01 | 已完成 |
| FP-03 | 后端媒体基础设施：迁移SQL(004_多媒体.sql)+CAS存储服务+busboy流式上传API+签名URL下载API+消息类型扩展 | FP-01 | 已完成 |
| FP-04 | AI 视觉管道：客户端content块+历史图片注入+预算适配+军师/复盘/检测文本化 | FP-02,FP-03 | 已完成 |
| FP-05 | 前端多媒体聊天 UI：+面板/表情包面板/canvas压缩/四类气泡渲染/预览下载/语音录制播放/翻译键/stores扩展 | FP-03 | 已完成 |
| FP-06 | 通话系统后端：迁移005_通话记录.sql+信令socket+状态机服务+AI模拟接听+系统消息 | FP-03 | 已完成 |
| FP-07 | 前端通话UI：全屏语音/视频界面+来电弹窗+铃声+计时器+挂断+记录展示 | FP-06 | 已完成 |
| FP-08 | 全量测试修复循环：前后端 test/build/lint 全绿+新增单测 | FP-04,FP-05,FP-06,FP-07 | 已完成 |
| FP-09 | 用户视角E2E验证：启动服务+Playwright截图各页面+log检查 | FP-08 | 已完成 |
| FP-10 | 总控制台GitHub上传+清理过程性文件+交付运行命令 | FP-09 | 进行中 |

## 当前决策
- 用户明确指令：直到完成目标才停止；最终统一用总控制台上传一次（不逐次推送）
- git 仓库 main 分支无历史提交，文件已 staged；总控制台.py 位于 D:\xuanr\Desktop\燃烧之陨我的世界服务端\总控制台\
- e2e 目录为空，E2E 用 Playwright 脚本临时编写于 Temp 目录执行，截图存 和我恋爱吧/测试截图/
- 服务运行方式：backend `npm run dev`、frontend `npm run dev`（5173）；PostgreSQL/Redis 依赖 docker-compose 或本机服务，FP-09 时现场确认

## 契约变更
- FP-03b(主代理补位1)：所有消息响应对象新增字段 `mei_ti_url?: string|null`（后端实时生成的签名下载URL，含 /api/媒体/<sha>?e=&s=）；上传响应同步新增该字段；消费者：FP-05 前端渲染媒体气泡一律使用 `mei_ti_url`，禁止前端自行拼接下载URL

## 已完成摘要
- FP-01：需求文档新增FP-20/FP-21两节+2.2范围修订+7.1模型更新+依赖表+性能表，21功能点编号连续
- FP-02：9文件30处统一切vision-exp；目标测试38/38全绿；残留检查0匹配；tsc零错误
- FP-03：迁移004已执行+CAS流式存储+签名URL下载+消息五类型+16新测试；后端369/369全绿+tsc零错误
- FP-03b(补位)：消息响应/上传响应追加mei_ti_url签名字段（前端无法自持HMAC密钥）；369/369保持全绿
- FP-04：DeepSeek客户端多模态块+最近8张图注入上限+384预算+军师/复盘/四类检测文本化；后端377/377全绿
- FP-05：前端压缩/表情包库14贴纸/上传API/乐观发送/+面板/双Tab表情/录音覆盖层/四类气泡/23翻译键；前端461全绿+build成功
- FP-06：迁移005已执行+通话状态机+信令socket(ack)+AI 2~6s接听+600s上限+xitong系统消息复用角色回复通道；后端389全绿
- FP-07：通话Pinia仓库+WebAudio铃声+通话界面组件(语音/视频双形态+可拖动本地回显)+xitong居中渲染；前端477全绿+build成功
- FP-08：后端389全绿+tsc零错误+lint 0error；前端477全绿+build成功+lint(src) 0error
- FP-09：E2E用户视角24张截图全部验证通过（登录/主页/向导/过渡页/聊天页/AI真实回复'哇，你这十几条连发是认真的吗…'/图片/表情包14贴纸/文件/语音条/语音通话振铃→接通00:17→系统消息'[语音通话] 时长 00:17'/视频通话本地回显）。过程中根因修复4项：①token预算重标定(8K/12K/16K→32K/64K，effort=max思维链吃满旧上限导致可见输出为空)②调度器获取最新用户消息对媒体消息返回空串致AI短路(接入meiTiZhanShiWenBen统一文本化)③Responses API的input_image.image_url形状错误({url}对象→官方要求字符串)④busboy中文文件名Latin-1乱码(defParamCharset:utf8)；文档同步max_tokens数值；测试同步64000

## 元循环摘要
（待阶段4填写）
