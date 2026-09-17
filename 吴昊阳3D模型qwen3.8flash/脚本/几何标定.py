# -*- coding: utf-8 -*-
# FP-01 几何标定：确定模型朝向、沿体轴横截面宽度分布，用于放置解剖关节。
import bpy
import math
import os
import numpy as np

DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EV = os.path.join(DIR, "证据")
LOG = []


def log(s):
    LOG.append(str(s))
    print("[GEO] " + str(s), flush=True)


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.open_mainfile(filepath=os.path.join(DIR, "吴昊阳模型v2.blend"))
scene = bpy.context.scene
ob = next(o for o in scene.objects if o.type == 'MESH')
me = ob.data
n = len(me.vertices)
arr = np.empty(n * 3, dtype=np.float32)
me.vertices.foreach_get("co", arr)
V = arr.reshape(-1, 3).astype(np.float64)
log(f"obj={ob.name} loc={tuple(round(v,4) for v in ob.location)} scale={tuple(round(v,4) for v in ob.scale)} rot={tuple(round(v,4) for v in ob.rotation_euler)}")
log(f"verts={n} x=[{V[:,0].min():+.4f},{V[:,0].max():+.4f}] y=[{V[:,1].min():+.4f},{V[:,1].max():+.4f}] z=[{V[:,2].min():+.4f},{V[:,2].max():+.4f}]")

# 水平切片：每层质心 / 极值 / 面积代理
zs = np.arange(0.0, 1.14, 0.02)
log("--- horizontal slices (z: count, xc, yc, xrng, yrng) ---")
for zi in zs:
    m = (V[:, 2] >= zi) & (V[:, 2] < zi + 0.02)
    c = int(m.sum())
    if c < 30:
        continue
    p = V[m]
    log(f"z={zi:5.2f} n={c:6d} xc={p[:,0].mean():+.4f} yc={p[:,1].mean():+.4f} "
        f"x=[{p[:,0].min():+.3f},{p[:,0].max():+.3f}] w={np.ptp(p[:,0]):.3f} "
        f"y=[{p[:,1].min():+.3f},{p[:,1].max():+.3f}] d={np.ptp(p[:,1]):.3f}")

# 竖直切片（沿 Y）：找左右手/腿的 X 分布
log("--- vertical columns by |x| bands over z ---")
for lo, hi in [(-0.21, -0.15), (-0.15, -0.10), (0.10, 0.15), (0.15, 0.21)]:
    m = (V[:, 0] >= lo) & (V[:, 0] < hi)
    if m.sum() < 50:
        continue
    p = V[m]
    hist, edges = np.histogram(p[:, 2], bins=19, range=(0, 1.14))
    prof = " ".join(f"{h//100:3d}" for h in hist)
    log(f"x[{lo:+.2f},{hi:+.2f}) n={m.sum():6d} yc={p[:,1].mean():+.3f} zprof(0..1.14 step .06)= {prof}")

# 顶部（头）与底部（脚）定位
log("--- extremum clusters ---")
for tag, sel in [("top z>1.02", V[:, 2] > 1.02), ("z 0.90-1.00", (V[:, 2] > 0.90) & (V[:, 2] < 1.00)),
                 ("feet z<0.03", V[:, 2] < 0.03), ("mid z 0.55-0.70", (V[:, 2] > 0.55) & (V[:, 2] < 0.70))]:
    p = V[sel]
    if len(p) == 0:
        continue
    log(f"{tag}: n={len(p)} cx={p[:,0].mean():+.3f} cy={p[:,1].mean():+.3f} "
        f"x=[{p[:,0].min():+.3f},{p[:,0].max():+.3f}] y=[{p[:,1].min():+.3f},{p[:,1].max():+.3f}]")

with open(os.path.join(EV, "FP-01-几何.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(LOG))
log("DONE")

