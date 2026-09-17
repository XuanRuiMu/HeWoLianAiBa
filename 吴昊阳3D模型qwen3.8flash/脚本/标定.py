# -*- coding: utf-8 -*-
# FP-01 关节标定：从站姿网格按解剖约束测量关节坐标，输出 JMEAS.json + 标定验证渲染
import bpy
import json
import math
import os
import sys

import numpy as np

DIR = os.environ.get("FP01_DIR", "")
EV = os.path.join(DIR, "证据")
LOG = []


def log(s):
    LOG.append(str(s))
    print("[CAL] " + str(s), flush=True)


scene = bpy.context.scene
for o in list(scene.objects):
    if o.type != 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)
for m in list(bpy.data.meshes):
    if m.users == 0:
        bpy.data.meshes.remove(m)
bpy.ops.import_scene.gltf(filepath=os.path.join(DIR, "吴昊阳模型v2.glb"))
ob = next(o for o in scene.objects if o.type == 'MESH')
me = ob.data
nv = len(me.vertices)
arr = np.empty(nv * 3, dtype=np.float32)
me.vertices.foreach_get("co", arr)
src = arr.reshape(nv, 3).astype(np.float64)
mw = np.array(ob.matrix_world, dtype=np.float64)
P = (np.hstack([src, np.ones((nv, 1))]) @ mw.T)[:, :3]
SC0 = 1.70
P = P * SC0
zmin = P[:, 2].min()
P[:, 2] -= zmin
H = P[:, 2].max()
log(f"height={H:.4f} x=[{P[:,0].min():.3f},{P[:,0].max():.3f}] y=[{P[:,1].min():.3f},{P[:,1].max():.3f}]")

X, Y, Z = P[:, 0], P[:, 1], P[:, 2]


def band(lo, hi, xlo=-9, xhi=9, ylo=-9, yhi=9):
    m = (Z >= lo) & (Z <= hi) & (X >= xlo) & (X <= xhi) & (Y >= ylo) & (Y <= yhi)
    return m


def stats(name, m):
    if m.sum() == 0:
        log(f"{name}: EMPTY")
        return None
    s = P[m]
    log(f"{name}: n={m.sum()} x=[{s[:,0].min():+.3f},{s[:,0].max():+.3f}] "
        f"y=[{s[:,1].min():+.3f},{s[:,1].max():+.3f}] z=[{s[:,2].min():+.3f},{s[:,2].max():+.3f}] "
        f"cen=({s[:,0].mean():+.3f},{s[:,1].mean():+.3f},{s[:,2].mean():+.3f})")
    return s


# 逐层宽度剖面（找肩、腰、髋）
log("--- profile per 4cm ---")
step = 0.04
prof = []
z = 0.0
while z < H:
    m = (Z >= z) & (Z < z + step)
    if m.sum() > 0:
        s = P[m]
        w = s[:, 0].max() - s[:, 0].min()
        d = s[:, 1].max() - s[:, 1].min()
        prof.append((z, w, d, m.sum()))
        log(f"z[{z:.2f},{z+step:.2f}) w={w:.3f} d={d:.3f} n={m.sum()} xext=({s[:,0].min():+.3f},{s[:,0].max():+.3f})")
    z += step

# 手臂：x 超出躯干的点
shoulder_z = max(prof, key=lambda p: p[1] * (p[0] > 0.5))[0]
log(f"widest at z={shoulder_z:.3f}")

# 找手腕/手：低 z 且 |x| 大
stats("arm_far_L(z<1.0, x<-0.28)", band(0.60, 1.05, xhi=-0.28))
stats("arm_far_R(z<1.0, x>0.28)", band(0.60, 1.05, xlo=0.28))
stats("hand_low_L", band(0.55, 0.95, xhi=-0.26))
stats("hand_low_R", band(0.55, 0.95, xlo=0.26))

# 头：最高处
stats("head", band(H - 0.26, H))
stats("chin", band(H - 0.34, H - 0.24))
# 颈最细处
log("--- neck thin search ---")
best = None
zz = H - 0.34
while zz < H - 0.18:
    m = (Z >= zz) & (Z < zz + 0.03)
    if m.sum() > 0:
        s = P[m]
        w = s[:, 0].max() - s[:, 0].min()
        log(f"  z={zz:.3f} w={w:.3f}")
        if best is None or w < best[1]:
            best = (zz, w)
    zz += 0.02
log(f"thinnest neck z={best[0]:.3f} w={best[1]:.3f}")

# 面部朝向：头部区域 y 的正负哪侧凸出更多
hm = band(H - 0.26, H)
s = P[hm]
log(f"head y mean={s[:,1].mean():+.4f} front(+y?) pct_y>0.06={(s[:,1]>0.06).mean():.3f} pct_y<-0.02={(s[:,1]<-0.02).mean():.3f}")

# 脚底
stats("feet", band(0.0, 0.10))
stats("foot_L", band(0.0, 0.12, xhi=0.0))
stats("foot_R", band(0.0, 0.12, xlo=0.0))
# 小腿最细（踝）
log("--- ankle search (z 0.10~0.25, per side) ---")
for side, sel in (("L", X < 0), ("R", X > 0)):
    bb = None
    zz = 0.08
    while zz < 0.30:
        m = (Z >= zz) & (Z < zz + 0.03) & sel
        if m.sum() > 0:
            s = P[m]
            wd = s[:, 0].max() - s[:, 0].min()
            log(f"  {side} z={zz:.3f} w={wd:.3f} y=[{s[:,1].min():+.3f},{s[:,1].max():+.3f}]")
            if bb is None or wd < bb[1]:
                bb = (zz, wd)
        zz += 0.02
    log(f"  {side} thinnest z={bb[0]:.3f} w={bb[1]:.3f}")

# 膝：腿段最宽变化处 / 髌骨前突
log("--- knee search ---")
for side, sel in (("L", (X < -0.02)), ("R", (X > 0.02))):
    bb = None
    zz = 0.40
    while zz < 0.66:
        m = (Z >= zz) & (Z < zz + 0.04) & sel
        if m.sum() > 0:
            s = P[m]
            dd = s[:, 1].max() - s[:, 1].min()
            yfront = s[:, 1].max()
            log(f"  {side} z={zz:.3f} depth={dd:.3f} yfront={yfront:+.3f}")
            if bb is None or yfront > bb[1]:
                bb = (zz, yfront)
        zz += 0.02
    log(f"  {side} knee-front z={bb[0]:.3f} y={bb[1]:+.3f}")

with open(os.path.join(EV, "FP-01-标定.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(LOG))
