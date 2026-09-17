# FP-07 候选基础模型选型报告

> 日期：2026-09-17 ｜ 执行：Headless Worker（FP-07，替换 FP-01 的 RiggedFigure 简陋基础模型）
> 所有结论基于 Blender 5.3.0 Alpha headless 导入统计 + Workbench 渲染图（正/侧/俯三视角，`candidates\renders\`）的实际查看比对，对照 `视觉基线.md` 体型规格。

## 视觉基线关键规格（摘录）

- 约 7.6 头身；肩宽 ≈ 头宽 2.1–2.4 倍（宽肩）；运动员体型（三角肌/大腿/小腿有肌肉刻画）
- 需能承载贴身改装（球衣分区上色、文字贴图 YOUNG/3/G.O.T.A、黑发、细框眼镜、护臂）
- 骨架需完整（手、脚、指关节、颈），拓扑需够细（便于服装分区/贴图）

## 候选清单与数据

| 候选 | 来源/授权 | 顶点 | 三角面 | 骨骼 | 体量 |
| --- | --- | --- | --- | --- | --- |
| Xbot.glb | three.js 官方示例（源自 Adobe Mixamo，免版税；仓库无独立 LICENSE，授权以 Mixamo 条款为准） | 28,374（素体 Beta_Surface 15,901 + 关节球 Beta_Joints 12,473） | 49,112 | 67（Mixamo 全套：颈/头/双眼/双手 15 指×2/双足+趾尖） | 2.93MB |
| Soldier.glb | three.js 官方示例（Mixamo "Vanguard"，授权同上） | 7,434 | 11,376 | 49（手指仅 3 节，无 Toe_End/HeadTop_End） | 2.16MB |
| Michelle.glb | three.js 官方示例（Mixamo，授权同上） | 16,340 | 28,106 | 65（全套手指/趾） | 3.28MB |
| CesiumMan.glb | Khronos glTF-Sample-Assets，CC-BY 4.0 | 3,273 | 4,672 | 19（无手指/脚趾/头骨） | 438KB |
| RPM_Brunette.glb（补测） | github.com/met4citizen/TalkingHead avatars/brunette.glb（Ready Player Me 参考素体，非 CC0） | 8,026（Body 1,182 / Outfit 三件 2,812 / Hair 932 / Glasses 614 / Head 2,162 / 眼齿 324） | 13,317 | 67（RPM 骨架，含全手指） | 4.72MB |

> 注：各候选均另含一个 Blender 5.3 Alpha glTF 导入器注入的 "Icosphere" 杂项对象（42 顶点，不在 GLB 文件内，已从统计剔除并在脚本中删除）。

## 逐候选视觉评价（基于三视角渲染图实测）

### Xbot（✅ 选定）
- 优点：拓扑密度全场最高（素体 15.9k 顶点，光滑连续）；67 骨最完整（含指节 4 节、趾尖、双眼骨）；**无贴图纯素体**，单材质分区上色/文字贴图最干净；标准 Mixamo 骨架（后续摆趴姿、Mixamo 动作重定向都方便）；男性体型，T-pose 标准。
- 缺陷（如实记录）：① 关节球风格——Beta_Joints 的球状关节在胸/髋/肩部隆起，删除该 12.5k 子网格后关节处**可能留洞**，FP-02 改造前需补面或保留遮蔽；② 偏瘦、**无肌肉刻画**，与「宽肩 2.2 倍头宽、三角肌/腿部肌肉」规格有差距，需在 FP-02/03 用 lattice/sculpt 加宽肩部、强化腿部；③ 头部为无五官光滑壳（发/镜本来就是附件，影响小）。

### Soldier（❌）
- 优点：唯一「壮硕男性」体型，接近运动员体格。
- 缺陷：盔甲+腰带挂包+靴子**全部焊死在单一网格**，无法拆成球衣；头盔带护目棱、无脖颈曲线；手指 3 节、无趾尖骨。改造成篮球服工作量远大于收益。

### Michelle（❌）
- 卡通女性、气球双发髻、裙裤一体，与「男性球员」目标相去最远；28k 三角但形体stylized。直接排除。

### CesiumMan（❌）
- 最简陋：桶状头、锥形无指手、19 骨；与 FP-01 的 RiggedFigure 同级水准，正是本任务要替换掉的对象。

### RPM_Brunette（❌ 未选，备选）
- 优点：**最接近真人的素体**，分件干净（Body/上衣/裤/鞋/发/眼镜独立网格——自带的眼镜、头发恰是需求件），骨架完整。
- 未选原因：① 授权为 Ready Player Me 服务条款，**非 CC0/宽松开源**，与 PROGRESS.md 已确认的「CC0 联网下载路线」用户裁决冲突；② 女性体型（肩窄髋宽）， masculinize 改造量不小；③ Body 素体仅 1,182 顶点，拓扑密度反而低于 Xbot。
- 备用条件：如用户明确接受 RPM 授权，可改选此模型替换 Xbot。

## 选定结果

- **选定：Xbot.glb**（授权宽松、骨架最全、拓扑最细、无贴图最适合整体换装）
- 已复制为：`base_model\base_model_v2.glb`（2,930,032 字节；原 `base_model.glb` 未覆盖）
- Blender 导入验证：见 `prone_work\base_model_v2_verify.json`（Armature×1 / 67骨、Mesh×2，exit 0）

## 与视觉基线的差距清单（移交 FP-02/FP-03 处理）

1. 关节球删除后的补面（胸/肩/髋）
2. 肩宽需拉宽至 ≈2.2 倍头宽，腿部需肌肉感（lattice/sculpt）
3. 头身比：Xbot ≈ 8.2 头身（素体高 1.81m），基线 7.6 头身 → 头部可微放大
4. 黑发、细框眼镜、护臂等均为附件，按 FP-03/FP-04 计划添加
