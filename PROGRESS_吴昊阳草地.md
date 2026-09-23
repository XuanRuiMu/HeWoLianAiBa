# PROGRESS — 吴昊阳草地融入（交接文档）

> 精简版 · 2026-09-23 · 供下一位接手。**先读完再动手。**
> 已推送：`0a6758b`（FP-11/12）、`c22447b`（FP-13），版本 `1.1.4`。
> **FP-14（本段，版本 `1.1.5`）已落地未推送**——按项目规则走「总控制台」推送，禁手动 `git push`。
> 前后对比截图：`临时日志/FP11-终验截图.jpg`（修复前→比例已正）、`FP12`（缩小左移）、`FP13`（伪3D深化）、`测试截图/FP-14-物理深化-*.png`。

## 一、用户的根本目的（原文精炼 + 历次裁定）

1. 主页背景是草地，草地上趴着 2D 人物「吴昊阳」；参考构图 `备用资源（重要，勿删）\最终效果图.png`。
2. 【**最高裁定·一票否决**】**吴昊阳的比例时时刻刻与 2D 原图（`wuhaoyang-2d.png`）逐像素一致，禁止任何比例改动**。为它服务时，构图/体量/位置都可以让路。
3. 【裁定】深度图/顶点位移/视差/重光照等 shader 形变路线**整体废弃**（曾把角色毁成"不是人"），`LI_TI.qiYong` 写死 false。
4. 镜头随鼠标晃动时，2D 图要**像真 3D**，看不出破绽。
5. 次级目标（FP-12/13）：真正"趴在草地上"——身下草被压、有草微微遮住角色、身下草不参与交互。
6. **视觉上最稳妥优先**：不接受"修好一处又冒出另一处一眼可见的硬伤"（再悬空、再比例不对）。
7. 只做吴昊阳草地这一条链路；项目里另有 AI AGENT 做功能类与非草地背景改动，**互不碰文件，改前确认归属**。

## 二、当前定案（grass-bg.html）

| 项 | 值 | 说明 |
|---|---|---|
| 朝向 | **billboard**，法线每帧对准镜头、绕铰链旋转 | 投影无掠射压缩 |
| 对准基准 | 卡片中心（=铰链 + s·卡片 up，迭代 2 轮） | 梯形 1.073（对准铰链是 1.112） |
| 锚点 | `PEI_ZHI.weiZhi (4.48, 3.63)` | 共享块与 T3 兜底两处必须同值 |
| 尺寸 | `chiCunBeiShu 0.32`（scale 0.408） | 屏上卡宽≈19%，与参考图人物宽 20.4% 吻合 |
| 贴图 | `flipY=true` + `repeat.x=-1/offset.x=1` | 头右下/脚左上贴合参考构图 |
| 地面层 | 阴影片+压草场按 billboard 实时姿态：投影长=卡宽×sin(后仰角)、轴=远离镜头侧 | 压在身体正下方 |
| 伪3D | `fengYiZhi=1.0`（身下草不随风）、`qianJingChang=0.28`/`qianJingQiang=0.6`（前景草遮角色）、`DI_BIAN.jianYin=0.035`（底边渐隐）、压伏与 AO 乘 `bu` 淡入 | 见"执行序" |
| FP-14 物理深化 | **原则：一切效果服从现实物理**（压在身下的草被体重钉死不动）。`yaSui=0.06`（体重压塌草高至 6%）、身下 `bendingIntensity` 归零（切断鼠标弯折贴图）、`chuanTou=0.85`/哈希稀疏（边缘长草受重力倒伏回盖角色）、`zaSheng=0.45`（倒伏带自然起伏）、阴影=人物剪影软接触痕（非圆斑）、`WEI_CHEN.biLi=0.018`（体重微沉卡高 1.8%，只改 y） | 比例零改动 |

**比例自证方法**（看不到图也能验）：浏览器内把平面四角投影到屏幕，量"底边/侧边"长度比。
旧俯卧≈**6.7**（压扁 85%）→ FP-13 **1.073** → FP-14 屏幕像素距 **0.99**（方卡正视应≈1.0）。
**这条线只能更接近 1.0，不许回退。** ⚠️ 量 NDC 距离必须乘宽高比，否则会误报 0.62。

## 三、踩过的坑（务必别重犯）

**着色器/几何类**
1. **压扁的真正根因**：俯卧贴地（θ=10°）被低机位掠射观测 ⇒ 屏上高度只剩 15~25%，几何性无解，**任何标定都救不了**。唯一正解是平面⟂视线（billboard）。旧 FP-01"最小二乘标定长宽比"在此姿态下不可能成立。
2. **引擎草顶点着色器执行序**（所有注入都依赖它）：
   `terrainAdjustedNormal → 风 →【本注入段】→ 压弯 → 定位`。
   ① 风抑制正是靠"注入段在风之后"把朝向 slerp 回 `terrainAdjustedNormal` 实现的。
3. **改 `v` 映射要同时看 mask 的 flipY**：mask 与 map 同签；flip 变了，"铰链端=图像哪一行"就变了，轮廓场会压错半身（历史坑：v 曾多 +0.5）。
4. **镜像/翻转别用 `quaternion.copy(cam)`**（旧病：整块拷相机四元数致镜像失控），用 rotation 分量解算：`ry=atan2(dx,dz)`、`rx=-atan2(dy,√(dx²+dz²))`，YXZ 序。
5. **两处都改 `fragmentShader` 的注入必须合并进同一个 `onBeforeCompile`**，拆两个会互相覆盖（底边渐隐 vs FP-10 立体化）。

**JS/工程类（最致命）**
6. **每帧调用的函数必须定义在 T3 IIFE 顶层**。我一度把 `gengXinYinYing` 定义在 `chuangJian()` 里 ⇒ tongBu 抛 `ReferenceError`，**每帧后半段（阴影片/压弯驱动/注入检查）被整条静默掐断**，而日志仍报"mask 已接入"，极易误判已生效。
7. **压弯注入曾因 `__fuZhenSanWei.qu()` 永不解析而静默失效**：它强依赖反构出的 `THREE.Vector2`，该出口在部分环境返回 null ⇒ `zhuRuYaWan` 直接 return false，**草一次都没被压过**。vec2 uniform 用普通对象 `{x,y}` 即可（three 直读 .x/.y），已去掉该依赖。
7b. **但纯 `{x,y}` 还不够**：three 的 vec2 上传会调 `value.toArray()`，缺了会**每帧抛 `TypeError`** 并打断后续 uniform（压弯强度变 NaN、面板报 0/0）。必须补 `toArray`（FP-14 已修，测试有钉）。
8. **PEI_ZHI 有两份默认值**（共享块 + T3 兜底），改一处不生效——必须两处逐字同值。

**验证类**
9. **页面 `__errors` 会过滤 `THREE.WebGLProgram` 噪声** ⇒ 着色器编译错误看不见。**必须用 playwright 的 console 监听直抓**；`window.__errors` 则当每帧健康自检。
10. **我看不到图像**（本会话图片读取被过滤）：所有观感结论必须由用户目视；我能给的是数值证据（边长比、包围盒、uniform、`__errors`、console）。**不要自称"已看清"**。

## 四、关键文件与调参口

- 场景：`frontend/public/grass-bg/grass-bg.html`
  - 共享块 `PEI_ZHI`（≈1079）、`YA_WAN`、`zhuRuYaWan` 注入段（≈1300-1400）
  - T3 块：`CAN_SHU`（≈1634）、`DI_BIAN`、`TIE_TU_FLIP_Y/JING_XIANG`、`mianXiangJingTou`（≈1813）、`gengXinYinYing`、`tongBu` 每帧链（≈2360-2500）
- 测试：`src/__tests__/wuHaoYangLiTiHua.test.ts`、`src/__tests__/grassBgJingTai.test.ts`（钉子很多，改代码先跑这两个，当前 65 项全绿）
- 版本：`src/config/站点配置.ts`（**改 grass-bg.html 必升版本**，否则 iframe 缓存不刷新）
- 调参 URL：`?wuX/wuZ/wuScale/wuTheta/wuYaw/wuFlip=0/wuJingXiang=0/wuDiBian=0.05/wuYinYing=0/debug=1`
- 运行时调参：控制台 `__yaWanTiao = { strength, huxi, shuBiaoJia, r0, r1, neiQiangDu, wenLiBu, aoDu, fengYiZhi, qianJingChang, qianJingQiang, yaSui, chuanTou, zaSheng }`

## 五、未做 / 下一步可选（都要先问用户）

- **⑤ 的取舍**：中心对准让比例更准（1.073），但卡片更直立（俯仰 −21.4° vs −31.1°）、"趴"的感觉略回退。若用户觉得"又站起来了"，**回退⑤一行即可**（改回对准铰链，梯形回 1.11）。
- 呼吸微动（y 平移 ±0.003，不缩放）：更"活物压在草上"，但与"身下草钉死"的物理原则冲突（活物会带动身下草），需用户定夺。
- 光照染色融合（让角色吃草地环境紫光）：融入度更高，但有毁原色风险。**用户本轮未选 G**。
- 死代码清理：`wuhaoyang-3d.png` 预载 + LI_TI shader 段（测试有钉，需先解钉）。
- FP-14 调参口：`__yaWanTiao` 新增 `yaSui / chuanTou / zaSheng`；URL 新增 `?wuChen=`（微沉比例）。

## 六、环境备注（本机沙箱实测）

- Bash 工具不可用（exit 127，无 coreutils）；文本处理用 Python；PowerShell stdout 会吞 ⇒ **一律落盘再 Read**。
- PS5.1 的 `>`/`Out-File` 是 UTF-16LE（Read 会当二进制），需 `Get-Content -Encoding Unicode | Out-File -Encoding utf8` 转一道；且**偶发不覆盖同名文件**，排查时换文件名。
- `npx` 沙箱不可用：vitest 直跑 `& <受管node> node_modules\vitest\vitest.mjs run`（**禁 `--reporter=basic`**，会被当自定义 reporter 加载失败）。
- 受管 node：`C:\Users\xuanr\.workbuddy\binaries\node\versions\22.22.2-3\node.exe`
- 浏览器验证：`agent-browser` CLI 不在 PATH，用 node 直跑 playwright（`--no-proxy-server` + 页面进程内自带 http server；**后台起的进程跨工具调用会被回收**）。reveal 需等 **25s** 再截图。引擎偶发坏帧（无后处理无描边），重跑即好。
- **独立页面里引擎不填充 `window.__grassMats`**（压弯注入前置条件），验证时用探针把场景里带 `uBendingTexture` 的材质合成一份塞进去。
- **工作区有自动清理任务**：`frontend/` 下的临时脚本会被删，验证产物写到 `临时日志/` 并尽快拷走。
- **推送**：走 GCM 凭据，`HTTP_PROXY=127.0.0.1:55554` 对 github 间歇 502 ⇒ 用 `git -c http.proxy= -c https.proxy= push` 直连即可成功。
- **提交必须按文件精确 `git add`，禁止 `git add -A`**：工作区有另一位 Agent 的数十个在途改动（backend/聊天/战绩，含 20+ 失败测试）。
