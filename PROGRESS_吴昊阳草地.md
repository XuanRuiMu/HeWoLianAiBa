# PROGRESS — 吴昊阳草地融入（交接文档）

> 更新：2026-09-23（FP-13 伪 3D 深化：风动抑制 / 前景草带 / 底边渐隐 / 压伏淡入 / 中心对准）。
> 本文件供断点续跑，务必先读完再动手。已推送：0a6758b（FP-11/12）、FP-13 待推送。

## 根本目的（用户原话精炼）

主页背景是一片草地，草地上趴着 2D 人物「吴昊阳」。要求：
1. **初始视角贴合参考图**：`备用资源（重要，勿删）\最终效果图.png`（构图锚，非逐像素指标）
2. 镜头随鼠标晃动时，2D 图**模拟真 3D**，看不出破绽
3. 从底层代码上彻底融入背景
4. 【用户裁定·最高优先】**角色时时刻刻保持原 2D 图比例，禁止任何比例改动**
5. 【用户裁定】深度图/位移/视差等 shader 形变路线整体放弃（LI_TI.qiYong 写死 false）
6. 本次工作只针对吴昊阳草地背景，其他 FP 缺陷一律不碰；项目内另有 AI AGENT 做
   非草地背景的功能改动——互不碰文件，修改前先确认文件归属。

## 当前状态（本次会话结束时）

- **FP-11 比例保真 billboard 已交付**：角色平面法线每帧对准镜头（绕铰链点旋转），
  投影=纯等比缩放，**比例与源图逐像素一致且在任意相机运动下零变化**。
  旧"俯卧贴地固定朝向"（θ=10°）是压扁根因——平面近乎躺平、低机位掠射角观测，
  屏上高度只剩约 15%~25%，任何标定都救不了；已降级为镜头未就绪时的一次性兜底。
- 前端测试基线：草地相关两个文件 **64 全绿**（wuHaoYangLiTiHua + grassBgJingTai）；
  版本 `yingYongBanBen = 1.1.3`。⚠️ 全量跑会有 20+ 失败来自另一个 Agent 的
  聊天/管理员/战绩等在途改动（backend 与 frontend 数十个文件），与草地无关，勿碰勿修。
- 交付态 = FP-11 billboard + 贴图 flipY=true + 水平镜像 repeat.x=-1/offset.x=1
  + 既有 3D 融合层（铰链贴地/接触阴影/压草轮廓场/草地接触 AO）
- **FP-12（本次）**：缩小 1/5 治"腿部悬空"、锚点左移；地面层（阴影片/压草场）改按
  billboard 实时姿态推导；并复活了**一直静默失效的压弯注入**（详见关键结论 7）
- **终验截图**：`临时日志\FP11-终验截图.jpg`（FP-11）、`临时日志\FP12-终验截图.jpg`（FP-12）

## FP-12 定案参数（grass-bg.html）

- `PEI_ZHI.weiZhi = { x: 4.48, y: -0.0133, z: 3.63 }`（共享块与 T3 兜底两处已同值）：
  锚点=铰链=贴图底边（flipY 后为**头/手机侧**）中点。由来：取相机右向量水平分量
  [0.65,-0.76] × 40px/190px每单位 解析算出，实测角色中心 x=578/960（参考图头部≈610）
- `CAN_SHU.chiCunBeiShu = 0.32`：等比缩放口（scale=1.275×0.32=0.408，卡边长 0.816）。
  0.40→0.32 是"缩 1/5"，治腿部悬空；实测屏上卡宽 186px≈屏宽 19%，与参考图人物宽 20.4% 吻合
- 地面层（阴影片 + 压草场）**每帧**按 billboard 实时姿态推导：
  投影长 = 卡宽 × sin(后仰角)（实测 0.422），投影轴 = billboard yaw（实测 37.8°，指向
  远离镜头=身体正下方）。旧俯卧 cos θ 公式会把压伏/阴影甩到角色前方一大片，已废弃
- 终验量测：方形平面投影边长比 **1.112**（旧俯卧≈6.7，即压扁 85%），剩余为卡片自身
  后仰的正常透视（脚端更远略小），与画面人物本来的透视方向一致
- `CAN_SHU.qingJiao=10 / pianHang=240`：**不再是角色朝向**，仅作地面层参数
  （阴影片地面投影 cosθ 修正、压草场身体轴 uCharYaw/uCharChang）
- `TIE_TU_FLIP_Y = true`：flipY 后铰链边=图像底行=头侧（画面下方），压伏 mask 同签自洽
- `TIE_TU_JING_XIANG = true`：repeat.x=-1+offset.x=1，贴合效果图"头右下"构图，像素零改动
- 调试 URL：`?wuFlip=0`（关翻转）`?wuJingXiang=0`（关镜像）`?wuX/wuZ/wuScale/wuTheta/wuYaw/wuY`

## 已取证的关键结论（勿重复排查）

1. **压扁根因**：俯卧贴地姿态（θ=10°）+ 低机位（相机≈pos[5.75,1.34,5.27] 俯角~18°）
   = 掠射角观测，平面法线与视线夹角 ~82°，屏上纵向只剩 sin 的零头。**几何性无解，
   唯一正解=平面⟂视线（billboard）**。旧 FP-01"最小二乘标定长宽比 1.408"在此姿态下不可能成立。
2. **billboard 数学**（mianXiangJingTou，YXZ 序 world=Ry·Rx·local，绕铰链旋转）：
   `rotation.y = atan2(dx, dz)`；`rotation.x = -atan2(dy, √(dx²+dz²))`；镜头位取
   `cam.matrixWorld.elements[12..14]`（含父级组偏移）。实测初始位姿 [-18°, 50.5°]。
3. **每帧写入点**：mianXiangJingTou 在 tongBu 内每帧调用（唯一 rotation 写入点）；
   y 仍走 FP-06 唯一写入点（草根实测，新锚点实测 y≈0.102）；GANG_TI 仍写死停用。
4. **水平镜像构图**：billboard 正面朝镜头显示原图（头在左），效果图构图是头在右
   （旧俯卧 240° 天然镜像）；用纹理 repeat 镜像实现，不动 PNG、不改比例。
   曾有人用 quaternion.copy(cam) 整块拷相机四元数致镜像失控——测试已钉死禁复活。
5. **压伏 mask 自洽**：mask 与 map 同签 flipY=true，v=0=图像底行=头侧=铰链端；
   轮廓场梯度在重映射空间内采样，方向自洽，草着色器公式无需改动。
6. 深度浮雕退役结论不变（wuhaoyang-3d.png 亮度当深度必毁容，勿复活）；
   App.vue 仍预载双图（测试钉死），无运行时影响。
7. **压弯注入曾静默失效（FP-12 修复）**：`zhuRuYaWan()` 开头强依赖
   `window.__fuZhenSanWei.qu()` 反构出的 `THREE.Vector2`——该出口在部分环境永不解析
   （独立页面实测返回 null），于是 return false，草**一次都没被压过**，而日志仍打印
   "压伏 mask 已克隆接入"，极易误判为已生效。现已改为 vec2 普通对象 `{x,y}`
   （three 的 vec2 uniform 直读 .x/.y），注入只依赖场景与草材质。修复后实测：
   94 个草材质注入成功，uCharChang=0.422 / uCharYaw=37.8° 与 billboard 同步。
8. **作用域陷阱（别再犯）**：每帧调用的函数（gengXinYinYing 之类）必须定义在 T3 IIFE
   顶层。我一度把它定义在 `chuangJian()` 内，tongBu 里抛 ReferenceError，
   每帧循环后半段（阴影片、压弯驱动、注入检查）被整条静默掐断——只有靠
   `window.__errors` 才发现（页面自带错误收集，验证时务必读它）。

## FP-13 伪 3D 深化（本次交付，四项全做）

引擎草顶点着色器执行序（务必记住，所有注入都依赖它）：
`terrainAdjustedNormal（无风自然朝向） → 风 → 【本注入段】 → 压弯(bendingIntensity/Direction) → 定位`

- **① 身下草风动抑制**：注入段正好在风之后、压弯之前，故按"被压度 wuYa"把
  `finalGrassInclination` 用 `inclineVectorTowardSlerp` 拉回 `terrainAdjustedNormal`，
  即抵消风的倾斜——真被压在身下的草不动。`YA_WAN.fengYiZhi = 1.0`（0 关闭）
- **② 前景草带（草微微遮住角色）**：卡片前方（wuZhou<0，即靠近镜头侧）窄带内把草朝
  +wuZhou（朝身体）弯折，越过卡片下缘盖住角色边缘。带宽 `qianJingChang=0.28`（世界单位，
  自铰链向镜头方向）、强度 `qianJingQiang=0.6`；带首尾与两侧 smoothstep 淡出防整齐带界
- **③ 底边渐隐**：卡片底边（贴地/铰链边）做 `vMapUv.y` 的窄带 alpha 衰减
  （`DI_BIAN.jianYin = 0.035`），消除硬切边悬浮感；只改 alpha，不动几何。
  ⚠️ 与已退役的 FP-10 立体化注入**合并进同一个 onBeforeCompile**（两者都改 fragmentShader，
  拆两个会互相覆盖），cacheKey 按 LI_TI.qiYong 二选一
- **④ 压伏随揭示淡入**：`uCharStrength` 与 `uWuCaoAODu` 都乘 reveal 进度 `bu`，
  草是"逐渐被趴下去"的，与人物/阴影片同一节奏
- **⑤ billboard 对准基准点改卡片中心**：中心=铰链 + s·卡片 up（局部 +Y 世界向量），
  迭代两轮收敛。梯形从 1.112 降到 **1.073**（比例更接近原图）。副作用：卡片更直立
  （俯仰 −31.1°→−21.4°），顶端抬高约 0.06 单位、地面投影长 0.42→0.30——若观感上觉得
  "更站起来了"，把⑤回退即可（边长比会回到 1.11）
- **验证**：着色器编译零报错（页面 `__errors` 会过滤 `THREE.WebGLProgram`，
  必须用 playwright 的 console 监听直抓）；新 uniform 全部到位；草地测试 65 项全绿

## 下一个 AI 的可选优化方向（均不动比例，动前先问用户）

- A. 压草轮廓场/阴影片的地面故事与 billboard 屏幕朝向解耦后未逐帧校验——若有
  "草压错位"观感，调 YA_WAN/YIN_YING 或把 uCharYaw 每帧改跟 billboard 实际 yaw。
- B. 光照融合（给角色叠草地同源 tint，只改色彩不动几何），需用户确认不毁原色。
- C. 深度系统死代码清理（LI_TI shader 段/细分几何路径），纯减法，测试有钉先解钉。
- ⚠ 任何改动先做静态帧截图对比 + 用户视觉验收；比例问题是 P0 事故。

## 关键文件

- 场景：`frontend/public/grass-bg/grass-bg.html`（共享块 PEI_ZHI≈1079、T3 块 CAN_SHU≈1634、
  mianXiangJingTou≈1810、创建兜底≈2260、每帧调用搜「mianXiangJingTou(mesh); // FP-11」）
- 测试：`frontend/src/__tests__/wuHaoYangLiTiHua.test.ts`（FP-11 钉死块）、
  `grassBgJingTai.test.ts`（FP-02 参数集中/朝向解算块已更新为 FP-11 契约）
- 组合：`frontend/src/App.vue`（iframe+双图预载）、`frontend/src/utils/caoDiBeiJing.ts`、
  `frontend/src/config/站点配置.ts`（版本 1.1.2）
- 参考图：`备用资源（重要，勿删）\最终效果图.png`（1920×1080）

## 环境备注（本机沙箱实测，比上一版补充）

- Bash 工具不可用（exit 127）；文本处理一律 Python；PowerShell 输出会吞——
  **一律落盘再 Read**。注意：PS5.1 的 `>` 重定向= UTF-16LE，Read 会当二进制，
  需 `Get-Content -Encoding Unicode | Out-File -Encoding utf8` 转一道。
- `npx` 在沙箱不可用：vitest 直接跑
  `& <受管node> node_modules\vitest\vitest.mjs run`（**别加 --reporter=basic**，
  会当自定义 reporter 加载失败）；受管 node：`C:\Users\xuanr\.workbuddy\binaries\node\versions\22.22.2-3\node.exe`
- `agent-browser` CLI 不在沙箱 PATH；浏览器验证走 playwright 脚本（node 直跑）：
  `chromium.launch({args:['--no-proxy-server']})` + 页面内自带 http 服务
  （后台进程跨工具调用会被回收，别用 Start-Process python http.server 方案）。
  Playwright 浏览器缓存 `C:\Users\xuanr\AppData\Local\ms-playwright`（chromium-1228/1243 可用）。
- 截图等待：reveal 门控下限 8s + 7.5s 爬坡，**waitForTimeout 25s** 再截。
  偶发引擎渲染坏帧（无后处理/无描边，一帧假象），重跑一次即可。
