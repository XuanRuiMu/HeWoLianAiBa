# GitHub 候选汇总 · 全屏页面过渡背景（三段斜切 / 依次错开 / 流动分界）

搜索时间：2026-11-12
搜索方式：GitHub Search API，75 组关键词（英文 + 中文），共 459 个去重仓库
原始数据：`github_search.jsonl` / `github_search2.jsonl` / `github_search3.jsonl`（本目录内）
完整去重清单：`候选汇总-精选.txt`（410 条，格式 `仓库|星数|语言|更新日期|简介`）

---

## 一、最直接命中「斜切 + 分片 + 依次出现」的（推荐优先看）

### 1. i-amraj/gsap-reveals —— 当前样品的上游
- 仓库：https://github.com/i-amraj/gsap-reveals
- 星 1 / MIT / 2026-09-10 更新
- **这个仓库自带一整层页面转场目录 `26_seamless_page_transitions/`，里面 8 个 demo 全是整屏转场**
- 其中 `03_diagonal_skew_slab_wipe`（斜切斜块擦除）**就是现在样品「三段背景」的原型**，代码已看过：
  - `styles.css`：`.slab-overlay` 固定满屏 + 三条 `.slab` 各 `width:140%; height:140%; transform: translateX(-100%) skewX(-14deg)`，颜色 `#1e1b4b / #0f172a / #080a10`
  - 这正是「斜线分割成三段」的最简实现，但它是**三条同方向斜块整体平移**，不是「依次错开」
- 同目录其他 7 个 demo（都可直接借）：
  - `01_grid_card_to_fullscreen_hero`
  - `02_circular_curtain_reveal`（圆形帘幕）
  - `03_diagonal_skew_slab_wipe` ← **斜切斜块**
  - `04_typographic_marquee_wipe`
  - `05_split_column_curtain_shift` ← **样品当前的来源（五条竖列上下交替）**
  - `06_liquid_distortion_page_swap`（液体扭曲换页）
  - `07_perspective_3d_room_flip`
  - `08_staggered_content_unfold`
- **另一个大目录 `13_curtain_split_preloader/` 有 22 个帘幕/分片变体，这才是真正的宝藏：**
  - `diagonal_slice_reveal`（斜切揭示）← **名字直接对应需求**
  - `alternating_column_split`、`multi_column_blinds_split`（多列百叶分片）
  - `multi_layer_curtain`（多层帘幕）、`basic_vertical_curtain_split`
  - `svg_curve_wipe`（SVG 曲线擦除）← **对应"分界不能是笔直斜线、要丝滑有流动感"**
  - `staggered_grid_uncover`（交错网格揭示）← **对应"依次错开出现"**
  - `checkerboard_split`、`random_pixel_dissolve`、`slice_and_slide_reveal`、`split_text_curtain`
  - `circular_iris_reveal`、`circular_multi_layer_iris`、`expanding_circle_reveal`、`concentric_rings_reveal`
  - `collapsing_diamond_reveal`、`four_quadrant_split`、`horizontal_sliding_doors`、`horizontal_venetian_blinds`
  - `three_d_door_fold`、`zoom_blur_portal`

**结论：这个仓库里 `13_curtain_split_preloader/diagonal_slice_reveal` + `svg_curve_wipe` + `staggered_grid_uncover` 三个 demo 合起来，几乎覆盖需求的全部技术点。这是最值得深挖的一个。**

---

### 2. codrops/RotatedRevealers —— 旋转覆盖层揭示（最像"斜"）
- 仓库：https://github.com/codrops/RotatedRevealers
- 星 156 / 2020-02-25 / 无开源许可证（Codrops 自有条款，可参考学习、商用需看条款）
- 在线演示：https://tympanus.net/Tutorials/RotatedRevealers/
- 文章：https://tympanus.net/codrops/?p=40167
- 文件：`index.html` ~ `index5.html`（5 个变体）、`css/`、`js/`、`img/`、`pater/`
- **技术：** 旋转覆盖层 + GSAP TweenMax 做页面转场。覆盖层本身是带 `rotate()` 的斜条，从斜向滑入遮住屏幕再退开
- 相关度：★★★★★（"斜"这个点做得比 gsap-reveals 更艺术，5 个变体可直接对照）
- 依赖：GSAP TweenMax（旧版）、imagesLoaded、Charming

---

### 3. codrops/UnrevealEffects —— 纯 CSS clip-path 揭示
- 仓库：https://github.com/codrops/UnrevealEffects
- 星 75 / **MIT 许可证** / 2023-02-23
- 在线演示：http://tympanus.net/Development/UnrevealEffects/
- 文章：https://tympanus.net/codrops/?p=65427
- 技术：**覆盖元素 + CSS clip-path**，`src/` 目录
- 相关度：★★★★★（MIT，clip-path 是"非笔直分界线"的正解，可直接改）
- 需 `npm install` + `npm start` 编译

---

### 4. codrops/LayersAnimation —— clip-path 分层快速转场
- 仓库：https://github.com/codrops/LayersAnimation
- 星 75 / **MIT** / 2023-10-31
- 文件：`index.html` ~ `index6.html`（6 个变体）、`css/`、`js/`、`img/`
- 相关度：★★★★☆（6 个 clip-path 分层变体，节奏感快，适合"错开"）

---

### 5. codrops/RapidLayersAnimation —— 图像层叠 splash/转场
- 仓库：https://github.com/codrops/RapidLayersAnimation
- 星 85 / **MIT** / 2020-04-07
- 文章 + 演示：https://tympanus.net/codrops/2020/04/07/rapid-image-layers-animation/
- 相关度：★★★★（层叠图像快速揭幕，节奏感是现成的）

---

### 6. vin-ni/PixelWave —— 像素波无缝转场
- 仓库：https://github.com/vin-ni/PixelWave
- 星 124 / 2020-12-08 / 无许可证
- 文件：`index.html`、`dev/`、`dist/`、`README.md`（有构建产物，可直接跑）
- 相关度：★★★（像素化波浪揭示，是"流动感"的另一种解法）

---

### 7. taimoorshahzada/Curtain-Effect-Page-Transition-using-GSAP-and-SVG-Morph
- 仓库：https://github.com/taimoorshahzada/Curtain-Effect-Page-Transition-using-GSAP-and-SVG-Morph
- 星 7 / 2022-08-06 / 无许可证
- 文件：`index.html`(882B) / `script.js`(724B) / `style.css`(1075B) —— **极小，三文件，最容易读懂改造**
- 相关度：★★★★★（**GSAP + SVG path morph 做帘幕**，正好是"分界不是直线、要丝滑流动"的最短路径）

---

### 8. Nischint007/barba-js-dual-stairs-04
- 仓库：https://github.com/Nischint007/barba-js-dual-stairs-04
- 星 3 / 2026-04-22
- 在线演示：https://barba-js-dual-stairs-04.vercel.app
- 相关度：★★★★（Barba.js + GSAP 双层阶梯转场，上下两片同步推入 —— **和"三段依次"的编排结构最像**）

---

### 9. qafaraz/MosaicLoadAnimation
- 仓库：https://github.com/qafaraz/MosaicLoadAnimation
- 星 3 / **MIT** / 2026-03-09
- 在线演示：https://mosaicloadanimation.netlify.app/
- 相关度：★★★★（纯 HTML/CSS，切片马赛克分步揭示 —— **分片错开的纯 CSS 写法**）

---

### 10. RealTayy/slice-revealer
- 仓库：https://github.com/RealTayy/slice-revealer
- 星 2 / **MIT** / 2019-03-07
- 相关度：★★★（零依赖 slice reveal 库，代码少）

---

### 11. DevrajDC/page-reveal-transitions
- 仓库：https://github.com/DevrajDC/page-reveal-transitions
- 星 10 / **GPL-3.0** / 2024-04-09
- 在线演示：https://dc-pagetransition-v3.netlify.app/
- 相关度：★★★★（GSAP + SVG path 动画做页面揭示）
- ⚠️ GPL-3.0：商用需评估，抄代码有传染性

---

## 二、大型"页面转场合集"类（一次看几十个效果）

### 12. codrops/PageTransitions —— 最经典的整屏转场合集
- 仓库：https://github.com/codrops/PageTransitions
- 星 **2315** / 2024-08-05 / 无开源许可证
- 在线演示：http://tympanus.net/Development/PageTransitions/
- 文章：http://tympanus.net/codrops/?p=15001
- 文件：`index.html`、`css/animations.css`(42KB)、`css/component.css`、`css/default.css`、`css/multilevelmenu.css`、`js/`
- **技术：** 纯 CSS3 `transform: translate3d()` + `rotate3d()` + `perspective`，用 `pt-page-*` 类切换
- 已实际读取过 `animations.css`，里面 ~150 个动画类，与需求相关的：
  - `pt-page-scaleUp` / `scaleDown` / `scaleUpDown` / `scaleDownUp` / `scaleUpCenter` / `scaleDownCenter`
  - `pt-page-moveToLeft/Right/Top/Bottom` + `moveFromLeft/Right/Top/Bottom`（8 向滑动）
  - `pt-page-moveToLeftFade` 等 8 个带淡出的方向位移
  - `pt-page-rotateSlideIn/Out`、`rotateSidesIn/Out`
  - `pt-page-rotateUnfoldLeft/Right/Top/Bottom`（展开折页）
  - `pt-page-rotateFoldLeft/Right/Top/Bottom`（折叠）
  - `pt-page-rotatePullLeft/Right/Top/Bottom`、`rotatePushLeft/Right/Top/Bottom`
  - `pt-page-flipInLeft/Right/Top/Bottom`、`flipOutLeft/Right/Top/Bottom`
  - `pt-page-rotateCubeLeft/Right/Top/BottomIn/Out`（立方体翻转，12 个）
  - `pt-page-rotateRoomLeft/Right/Top/BottomIn/Out`（房间推进，8 个）
  - `pt-page-rotateCarouselLeft/Right/Top/BottomIn/Out`（旋转木马，8 个）
  - `pt-page-rotateFall`、`rotateInNewspaper` / `rotateOutNewspaper`
  - `pt-page-delay100` ~ `pt-page-delay1000`（**已有的延迟/错开机制，正是"依次出现"需要的**）
- 相关度：★★★★★（**现成错开机制 + 150 个变体，纯 CSS 零依赖，最适合改造**）
- 注意：**无许可证**，商业项目使用前要确认 Codrops 条款

---

### 13. codrops/PageRevealEffects —— 多层页面转场
- 仓库：https://github.com/codrops/PageRevealEffects
- 星 138 / 2016-06-01 / 无开源许可证
- 相关度：★★★★（多层 = 分段，2016 年经典）

### 14. codrops/MorphingPageTransition —— SVG 路径变形转场
- 仓库：https://github.com/codrops/MorphingPageTransition
- 星 183 / 2017-08-08 / 无开源许可证
- 文章：https://tympanus.net/codrops/?p=31976
- 技术：**SVG path 变形 + 当前页上移** —— 分界线做非直线的直接答案
- 相关度：★★★★★

### 15. codrops/PixelTransition —— 像素转场
- 仓库：https://github.com/codrops/PixelTransition
- 星 96 / **MIT** / 2023-04-05
- 文章：https://tympanus.net/codrops/?p=71437
- 相关度：★★★

### 16. codrops/PageLoadingEffects —— SVG 揭示
- 仓库：https://github.com/codrops/PageLoadingEffects
- 星 640 / 2014-04-23 / 无开源许可证
- 技术：SVG 动画揭示新内容
- 相关度：★★★★

### 17. codrops/ShapesSlideshow
- 仓库：https://github.com/codrops/ShapesSlideshow
- 星 109 / **MIT** / 2021-03-10
- 技术：clip-path 做形状化幻灯片切换
- 相关度：★★★（形状分界参考）

---

## 三、通用页面转场库（成熟方案，可整体接入）

| 仓库 | 星 | 许可 | 更新 | 说明 |
|---|---|---|---|---|
| barbajs/barba | 12996 | MIT | 2024-12 | 页面转场框架，做「转场容器」调度最成熟 |
| swup/swup | 5252 | MIT | 2026-11 | 同类，插件生态更活跃 |
| shuding/next-view-transitions | 2381 | MIT | - | 原生 View Transitions API + Next.js |
| blivesta/animsition | 3775 | MIT | 2019-11 | jQuery 插件，CSS 动画整页转场 |
| argyleink/transition.css | 2018 | Apache-2.0 | 2025-06 | 纯 CSS 转场集合，transition.style |
| meursyphus/ssgoi | 1016 | - | 2026-11 | SSR 框架页面转场，兼容 Safari |
| Orlandster/vue-page-transition | 394 | - | 2022-12 | Vue 页面转场插件，轻量 |
| jaweii/Vueg | 1039 | - | 2021-02 | Vue 路由转场特效 |
| trungdq88/react-router-page-transition | 548 | - | 2020-11 | React Router 转场组件 |
| Steveeeie/react-page-transition | 447 | MIT | 2026-04 | 把 Codrops PageTransitions 移植成 React 组件 ← **省事路线** |
| johnpolacek/TweenPages | 197 | - | 2022-08 | GSAP + Next.js 复杂转场 |
| michalzalobny/threejs-page-transition | 216 | - | 2022-05 | Three.js WebGL 页面转场 |
| господ lordelogos/gleamy-creative | 2 | - | 2023-07 | GSAP + Barba 转场示例，演示站 https://gleamy-creative.netlify.app/ |

---

## 四、技术路线判断（针对「分界丝滑有流动感」）

需求原文：**"分界不能是笔直斜线，要丝滑、有流动感"**

| 路线 | 代表仓库 | 能做到 | 实现代价 |
|---|---|---|---|
| **A. CSS skew + 多条斜块** | i-amraj/gsap-reveals 03、05 | 斜直线分段，最简单 | 低（现有样品就是这条） |
| **B. SVG path morph** | taimoorshahzada 帘幕、codrops/MorphingPageTransition | **分界可任意曲线 + 流动变形** | 中（要画 path 或调锚点） |
| **C. clip-path polygon / path 动画** | codrops/UnrevealEffects、LayersAnimation | **可任意形状，浏览器原生支持** | 中（polygon 是直线；要曲线需用 `clip-path: path()`） |
| **D. SVG feTurbulence 位移贴图** | 需自建 | **真正的"流动/水波"感** | 高（要懂滤镜动画） |
| **E. WebGL shader** | michalzalobny/threejs-page-transition | **最丝滑，可作形变/溶解** | 高（要引入 WebGL） |
| **F. 多列百叶 + 时间错开** | gsap-reveals 13、qafaraz/MosaicLoadAnimation | 最贴"依次错开出现" | 低 |

**推荐组合（性价比最高）：**
1. 骨架沿用现在的 GSAP + 三条带子结构（已跑通、已本地化 GSAP）
2. 把 `skewX(-12deg)` 的直边换成 **SVG path 曲线分界**（路线 B）——这是"丝滑流动"的最小改动
3. 或整体换成 **clip-path path() + 时间轴错开**（路线 C + F）

---

## 五、数据说明

- 共执行 **75 组关键词搜索**，覆盖英文（page transition / curtain / diagonal / clip-path / stagger / mask / shader / WebGL / view-transition 等）和中文（页面过渡 / 转场动画）
- GitHub Search API 去重后得 **459 个仓库**，剔除明显噪声（iOS/Android 客户端转场、政治宣传库、书籍清单、语言 SDK、HTML 快照站等）后 **410 条有效**
- 每条都在 `候选汇总-精选.txt` 里，格式 `仓库|星数|语言|更新日期|简介`
- 三个子代理（斜切帘幕类 / 合集类 / 技术类）因进程崩溃未产出结果，本轮由主代理独立补完