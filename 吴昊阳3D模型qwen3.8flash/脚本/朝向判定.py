# -*- coding: utf-8 -*-
# FP-01 朝向判定：用横截面质心偏移方向判断模型正面（胸/腹突出）与背面。
import bpy
import os
import numpy as np

DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EV = os.path.join(DIR, "证据")
LOG = []


def log(s):
    LOG.append(str(s))
    print("[FACE] " + str(s), flush=True)


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.open_mainfile(filepath=os.path.join(DIR, "吴昊阳模型v2.blend"))
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
me = ob.data
n = len(me.vertices)
a = np.empty(n * 3, dtype=np.float32)
me.vertices.foreach_get("co", a)
V = a.reshape(-1, 3).astype(np.float64)

log("躯干段 z 0.60-0.92：每层 y 的偏度（正偏=+Y侧体积多=正面在+Y）")
for z0 in np.arange(0.58, 0.94, 0.04):
    m = (V[:, 2] >= z0) & (V[:, 2] < z0 + 0.04)
    p = V[m]
    if len(p) < 100:
        continue
    ymean = p[:, 1].mean()
    # 前缘/后缘
    hi = np.percentile(p[:, 1], 99)
    lo = np.percentile(p[:, 1], 1)
    fwd = hi - ymean
    back = ymean - lo
    log(f"z={z0:.2f} n={len(p):6d} yc={ymean:+.4f} +Yext={hi:+.3f} -Yext={lo:+.3f} "
        f"fwd(+Y)={fwd:.3f} back(-Y)={back:.3f} ratio={fwd/max(back,1e-6):.2f}")

log("头部段 z>0.97：脸(+?) vs 后脑")
m = V[:, 2] > 0.97
p = V[m]
log(f"n={len(p)} yc={p[:,1].mean():+.4f} y=[{p[:,1].min():+.3f},{p[:,1].max():+.3f}]")

log("脚部 z<0.12：脚尖朝向前方")
m = V[:, 2] < 0.12
p = V[m]
log(f"n={len(p)} yc={p[:,1].mean():+.4f} y=[{p[:,1].min():+.3f},{p[:,1].max():+.3f}] x=[{p[:,0].min():+.3f},{p[:,0].max():+.3f}]")

log("整体 y 分布分位")
for q in [0.5, 1, 5, 25, 50, 75, 95, 99]:
    log(f"y_p{q}={np.percentile(V[:,1], q):+.4f}")

with open(os.path.join(EV, "FP-01-朝向.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(LOG))
log("DONE")
