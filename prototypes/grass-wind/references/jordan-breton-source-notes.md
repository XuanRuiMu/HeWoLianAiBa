# Jordan Breton 网站源码获取笔记

## 获取结果

已从 `https://jordan-breton.com` 成功拉取主页源码与关键资源，用于「和我恋爱吧」3D 浮岛草地场景参考。

| 类别 | 文件 | 大小 | 说明 |
|---|---|---|---|
| 主页 HTML | `jordan-breton-home.html` | 13 KB | 完整首页 DOM，包含 canvas、昼夜切换 UI、加载页 |
| 主打包 JS | `-assets-index-G3tB3Owe.js` | 2.6 MB | Vite 打包的完整 Three.js 应用源码（混淆但字符串可读） |
| 样式 | `-assets-index-DF8svE4a.css` | 35 KB | 首页 CSS |
| Service Worker | `-registerSW.js` | 134 B | PWA 注册脚本 |
| 着色器集合 | `jordan-breton-shaders/*.glsl` | 96 个文件 | 从 JS 中提取的内联 GLSL 字符串 |
| 草模型 | `models-grass-grass.glb` | 4.2 KB | 单根草叶几何 |
| 草模型 | `models-grass-pampa-grass.glb` | 11 KB | 另一种草叶几何 |
| 岛屿模型 | `models-islands-islands-2.glb` | 1.0 MB | 浮岛/岛屿组合模型 |
| 位移纹理 | `textures-grass-displacement_map2.webp` | 18.5 KB | 草地地形高度/位移贴图 |
| 风场纹理 | `textures-grass-wind.webp` | 2.3 KB | 草叶风动噪声纹理 |
| 区域纹理 | `textures-main-island-zones.png` | 220 KB | 主岛屿功能区域遮罩 |
| 顶部纹理 | `textures-top-island.png` | 230 KB | 岛屿顶部纹理 |

## 关键技术发现

### 1. 草地渲染方案

Jordan Breton 使用 **InstancedMesh + 自定义 ShaderMaterial + GLTF 草模型** 实现大面积草地：

- 草模型来源：`​/models/grass/grass.glb` 和 `​/models/grass/pampa-grass.glb`
- 使用 `instanceMatrix` 在顶点着色器中读取每根草的世界位置、缩放、旋转
- 每根草根据地形 `displacementMap` 采样高度，贴合起伏地面
- 风动基于 `wind.webp` 纹理滚动 + Perlin/Simplex 噪声函数

### 2. 可挪用的顶点着色器逻辑（shader-069/071/074）

核心函数与流程：

```glsl
// 从 instanceMatrix 获取草的根部位置和旋转
vec3 grassOrigin = instanceMatrix[3].xyz;
vec3 grassScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
mat3 instanceRotation = mat3(
    instanceMatrix[0].xyz / grassScale.x,
    instanceMatrix[1].xyz / grassScale.y,
    instanceMatrix[2].xyz / grassScale.z
);

// 1. 地形高度采样
float elevation = getElevation(grassOrigin.xz, uDisplacementMap);
vec3 virtualyDisplacedGrassPosition = grassOrigin + vec3(0.0, elevation, 0.0);

// 2. 根据邻近采样点重建地形法线
vec3 positionA = grassOrigin + vec3(virtualTerrainSampling, 0.0, 0.0);
vec3 positionB = grassOrigin + vec3(0.0, 0.0, virtualTerrainSampling);
positionA.y += getElevation(positionA.xz, uDisplacementMap);
positionB.y += getElevation(positionB.xz, uDisplacementMap);
vec3 virtualTerrainNormal = normalize(cross(normalize(positionB - virtualyDisplacedGrassPosition), normalize(positionA - virtualyDisplacedGrassPosition)));

// 3. 将草叶法线向地形法线倾斜
vec3 terrainAdjustedNormal = inclineVectorTowardSlerp(grassNormal, virtualTerrainNormal, terrainInfluence);

// 4. 风动：采样 windTexture + 世界风向
float windNoise = getWindStrength(grassOrigin.xz, uWindTexture, uTime);
vec3 worldWindDirection = normalize(vec3(-1.0, 0.0, 0.5));
vec3 localWindDirection = instanceRotationInverse * worldWindDirection;
float windStrength = 0.4 * windNoise;
finalGrassInclination = inclineVectorTowardSlerp(finalGrassInclination, normalize(localWindDirection), windStrength);

// 5. 弯曲贴图（可用于鼠标/触摸交互）
vec4 bendData = texture(uBendingTexture, bendUv).rgba;
float bendingIntensity = bendData.r * uBendingFactor;
vec3 bendingDirection = -(bendData.gba * 2.0 - 1.0);
vec3 localBendingDirection = instanceRotationInverse * bendingDirection;
finalGrassInclination = inclineVectorTowardSlerp(finalGrassInclination, normalize(localBendingDirection), bendingIntensity);

// 6. 应用倾斜矩阵与 Y 轴随机旋转
mat3 alignmentMatrix = createAlignmentMatrix(grassNormal, normalize(finalGrassInclination));
mat4 yRotation = getYRotationMatrix(aRandomYRotation);
vec3 randomlyRotatedPosition = (yRotation * vec4(position, 1.0)).xyz;
vec3 alignedPosition = alignmentMatrix * randomlyRotatedPosition;
vec3 rotatedPosition = instanceRotation * alignedPosition;
vec3 scaledPosition = rotatedPosition * grassScale;
vec3 myWorldPosition = scaledPosition + grassOrigin;
```

### 3. 鼠标/触摸交互函数

```glsl
vec2 displaceGrassInRadius(vec3 worldPos, vec2 mousePosition, float radius) {
    vec2 dir = worldPos.xz - mousePosition;
    float dist = length(dir);
    vec2 normalizedDir = normalize(dir);
    float influence = 1.0 - smoothstep(0.0, radius, dist);
    return normalizedDir * influence;
}
```

说明：该函数已存在于源码中，可直接作为 GPU 端鼠标推开草叶的参考实现。当前 `index-v4.html` 的持久尾迹方案可与此结合：把鼠标位置/方向写入 `uBendingTexture`（R=强度，GBA=方向），在顶点着色器中采样即可。

### 4. 光照与阴影

- 使用 `#include <lights_pars_begin>` 和 `<shadowmap_pars_vertex>` 接入 Three.js 标准光照
- 支持平行光阴影（PCF）
- 草叶颜色函数 `getGrassColor`：混合深浅绿 + 阴影色 + 风动暗化 + 方向光

### 5. 噪声函数库

提取的着色器包含完整的噪声函数集合：

- `Perlin2D/3D/4D`
- `SimplexPerlin2D/3D`
- `Cellular2D/3D`
- `Value2D/3D/4D`
- `FBM` 变体
- `Hermite2D/3D`
- 完整导数版本 `*_Deriv`

文件位置：`jordan-breton-shaders/shader-061-noise-73e171.glsl`、`shader-064-noise-66fe64.glsl`、`shader-085-noise-4c6854.glsl` 等。

## 与本项目集成的建议

1. **草叶几何**：可直接加载 `models-grass-grass.glb` 替代当前 `PlaneGeometry`，获得更自然的草叶截面。
2. **地形贴合**：参考 `getElevation` + 邻近点法线重建，使当前浮岛上的草随地形起伏（若后续加入高度图）。
3. **风动改进**：参考 `getWindStrength` 使用滚动 `wind.webp` 纹理 + Perlin 噪声，替换当前简单的正弦风。
4. **鼠标交互改进**：将当前 CPU 维护的鼠标位置/方向渲染到 `uBendingTexture`，在顶点着色器中按 `displaceGrassInRadius` 逻辑弯曲草叶，可实现更自然的持久尾迹。
5. **岛屿模型**：`models-islands-islands-2.glb` 可作为浮岛几何参考，但需注意版权，建议仅作结构学习或替换为程序化生成。

## 注意事项

- 所有下载资源版权归 Jordan Breton 所有，仅用于学习参考，不得直接商用。
- 主打包 JS 经过 Vite 混淆，类名为随机短标识，不建议直接复制业务逻辑。
- GLSL 着色器字符串为模板字符串提取，保留了 `#include <...>` 等 Three.js 着色器 chunk，可直接用于 `ShaderMaterial`。
