# -*- coding: utf-8 -*-
# FP-01 趴姿重定：对偶四元数蒙皮（脚本 dqskin.py，已单元验证）+ 手机道具 + 渲染/导出
import bpy
import math
import os
import sys
import time

DIR = os.environ.get("FP01_DIR", "")
MODE = os.environ.get("FP01_MODE", "debug")     # debug | full
EV = os.path.join(DIR, "证据")
sys.path.insert(0, os.path.join(DIR, "脚本"))
import numpy as np
from dqskin import mat_to_dq, apply_dq, normalize_blend, euler_to_matrix

LOG = []


def log(s):
    LOG.append(str(s))
    print("[POSE] " + str(s), flush=True)


d2r = math.radians
DEF_P = {
    "pitch": 90.0, "yaw": 24.0, "torso": -6.0, "head": -32.0,
    "sh_xL": 6.0, "sh_xR": 6.0, "sh_yL": 62.0, "sh_yR": 62.0, "sh_zL": -18.0, "sh_zR": 18.0,
    "el_xL": -95.0, "el_xR": -95.0,
    "hip_xL": -8.0, "hip_xR": -8.0, "hip_zL": 9.0, "hip_zR": -9.0,
    "kn_xL": 24.0, "kn_xR": 30.0, "an_xL": -70.0, "an_xR": -70.0,
    "scale": 1.70,
}
P = {k: float(os.environ.get("FP01_P_" + k, v)) for k, v in DEF_P.items()}
SC0 = 1.70   # 原始高 1.134 -> ~1.93m 尺度做变形

J_RAW = {
    # 以下均为标定实测（真实尺度，脚底 z=0，面朝 +Y）
    "pelvis": (0.0, -0.020, 1.060),
    "waist": (0.0, -0.010, 1.200),
    "chest": (0.0, -0.010, 1.400),
    "neck": (0.0, -0.010, 1.600),
    "head": (0.006, 0.024, 1.760),
    "shoulder_L": (-0.250, -0.010, 1.545), "shoulder_R": (0.250, -0.010, 1.545),
    "elbow_L": (-0.305, -0.010, 1.230), "elbow_R": (0.305, -0.010, 1.230),
    "wrist_L": (-0.300, 0.000, 0.960), "wrist_R": (0.300, 0.000, 0.960),
    "hand_L": (-0.295, 0.010, 0.870), "hand_R": (0.295, 0.010, 0.870),
    "hip_L": (-0.125, -0.010, 1.020), "hip_R": (0.125, -0.010, 1.020),
    "knee_L": (-0.128, 0.055, 0.650), "knee_R": (0.128, 0.055, 0.650),
    "ankle_L": (-0.128, -0.036, 0.180), "ankle_R": (0.128, -0.036, 0.180),
    "toe_L": (-0.128, 0.150, 0.020), "toe_R": (0.128, 0.150, 0.020),
}
NAMES = list(J_RAW.keys())
PARENT = {
    "pelvis": None, "waist": "pelvis", "chest": "waist", "neck": "chest", "head": "neck",
    "shoulder_L": "chest", "elbow_L": "shoulder_L", "wrist_L": "elbow_L", "hand_L": "wrist_L",
    "shoulder_R": "chest", "elbow_R": "shoulder_R", "wrist_R": "elbow_R", "hand_R": "wrist_R",
    "hip_L": "pelvis", "knee_L": "hip_L", "ankle_L": "knee_L", "toe_L": "ankle_L",
    "hip_R": "pelvis", "knee_R": "hip_R", "ankle_R": "knee_R", "toe_R": "ankle_R",
}
RAD = {
    "pelvis": 10.0, "waist": 0.26, "chest": 0.30, "neck": 0.14, "head": 0.24,
    "shoulder_L": 0.32, "elbow_L": 0.34, "wrist_L": 0.16, "hand_L": 0.15,
    "shoulder_R": 0.32, "elbow_R": 0.34, "wrist_R": 0.16, "hand_R": 0.15,
    "hip_L": 0.40, "knee_L": 0.48, "ankle_L": 0.20, "toe_L": 0.16,
    "hip_R": 0.40, "knee_R": 0.48, "ankle_R": 0.20, "toe_R": 0.16,
}


def own_euler(name):
    if name == "pelvis":
        return (d2r(P["pitch"]), 0, d2r(P["yaw"]))
    if name == "waist":
        return (d2r(P["torso"]), 0, 0)
    if name == "neck":
        return (d2r(P["head"]), 0, 0)
    if name.startswith("shoulder_"):
        s = name[-1]; return (d2r(P["sh_x" + s]), d2r(P["sh_y" + s]), d2r(P["sh_z" + s]))
    if name.startswith("elbow_"):
        s = name[-1]; return (d2r(P["el_x" + s]), 0, 0)
    if name.startswith("hip_"):
        s = name[-1]; return (d2r(P["hip_x" + s]), 0, d2r(P["hip_z" + s]))
    if name.startswith("knee_"):
        s = name[-1]; return (d2r(P["kn_x" + s]), 0, 0)
    if name.startswith("ankle_"):
        s = name[-1]; return (d2r(P["an_x" + s]), 0, 0)
    return (0, 0, 0)


PATHS = {}
for _n in NAMES:
    _p = []; _c = _n
    while _c is not None:
        _p.append(_c); _c = PARENT[_c]
    PATHS[_n] = list(reversed(_p))

NP_J = {n: np.array(J_RAW[n], dtype=np.float64) * SC0 for n in NAMES}


def chain_mat(name):
    m = np.eye(4)
    for n in PATHS[name]:
        R = euler_to_matrix(own_euler(n))
        rr = np.eye(4); rr[:3, :3] = R
        p = NP_J[n]
        piv = np.eye(4); piv[:3, 3] = p
        ipiv = np.eye(4); ipiv[:3, 3] = -p
        m = piv @ rr @ ipiv @ m
    return m


DQ_BONE = {n: mat_to_dq(chain_mat(n)) for n in NAMES}
DQ_ID = mat_to_dq(np.eye(4))
DQ_STACK = np.stack([DQ_BONE[n] for n in NAMES])       # (B,8)
ID_STACK = np.tile(DQ_ID, (len(NAMES), 1))


def weights(pts):
    N = len(pts)
    W = np.empty((N, len(NAMES)), dtype=np.float64)
    for i, n in enumerate(NAMES):
        a = NP_J[n]; pn = PARENT[n]
        if pn is None:
            d = np.linalg.norm(pts - a, axis=1)
        else:
            b = NP_J[pn]; ab = b - a
            L2 = float(ab @ ab)
            t = np.clip((pts - a) @ ab / L2, 0.0, 1.0) if L2 > 1e-12 else np.zeros(N)
            d = np.linalg.norm(pts - (a + np.outer(t, ab)), axis=1)
        r = RAD[n]
        W[:, i] = np.where(d < r, (1.0 - d / r) ** 2, 0.0)
    s = W.sum(axis=1)
    s[s <= 1e-12] = 1.0
    return W / s[:, None]


def deform_np(pts, W=None):
    if W is None:
        W = weights(pts)
    B = np.einsum('nb,bk->nk', W, DQ_STACK)
    I = np.einsum('nb,bk->nk', W, ID_STACK)
    flip = (B * I).sum(axis=1) < 0
    B[flip] *= -1.0
    B = normalize_blend(B)
    return apply_dq(pts, B)


# ---------------- 载入 ----------------
t_load = time.time()
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
orig_mats = [m for m in me.materials if m]
log(f"verts={len(me.vertices)} mats={[m.name for m in orig_mats]} load={time.time()-t_load:.1f}s")

nv = len(me.vertices)
arr = np.empty(nv * 3, dtype=np.float32)
me.vertices.foreach_get("co", arr)
src = arr.reshape(nv, 3).astype(np.float64)
mw = np.array(ob.matrix_world, dtype=np.float64)
pts = (np.hstack([src, np.ones((nv, 1))]) @ mw.T)[:, :3] * SC0
log(f"src z=[{pts[:,2].min():.3f},{pts[:,2].max():.3f}]")

t0 = time.time()
Wmat = weights(pts)
posed = deform_np(pts, Wmat)
log(f"deform {time.time()-t0:.1f}s")
# 在真实尺度下落地并整体缩放到目标体型
zmin = posed[:, 2].min()
k = P["scale"] / SC0
out = (posed - np.array([0.0, 0.0, zmin])) * k
log(f"posed bbox x=[{out[:,0].min():.3f},{out[:,0].max():.3f}] y=[{out[:,1].min():.3f},{out[:,1].max():.3f}] z=[{out[:,2].min():.3f},{out[:,2].max():.3f}]")

jd = deform_np(np.array([J_RAW[x] for x in NAMES], dtype=np.float64) * SC0)
jzmin = jd[:, 2].min()
JP = {nm: (c - np.array([0.0, 0.0, jzmin])) * k for nm, c in zip(NAMES, jd)}
for nm in NAMES:
    log(f"J {nm} = ({JP[nm][0]:+.3f},{JP[nm][1]:+.3f},{JP[nm][2]:+.3f})")

if MODE == "full":
    me.vertices.foreach_set("co", out.astype(np.float32).ravel())
    me.update()
    body = ob
else:
    dbg_mesh = bpy.data.meshes.new("dbg")
    dbg_mesh.from_pydata(out.tolist(), [], [list(p.vertices) for p in me.polygons])
    dbg_mesh.update()
    body = bpy.data.objects.new("dbg_pose", dbg_mesh)
    scene.collection.objects.link(body)
    dm = bpy.data.materials.new("dbgmat"); dm.diffuse_color = (0.85, 0.62, 0.45, 1.0)
    dbg_mesh.materials.append(dm)
    for o in list(scene.objects):
        if o.type == 'MESH' and o.name != "dbg_pose":
            bpy.data.objects.remove(o, do_unlink=True)

# ---------------- 手机 ----------------
wl, wr = JP["wrist_L"], JP["wrist_R"]
hl, hr = JP["hand_L"], JP["hand_R"]
mid = (hl + hr) * 0.5
bpy.ops.mesh.primitive_cube_add(size=1)
ph = bpy.context.active_object; ph.name = "手机"
ph.scale = (0.052, 0.098, 0.011)
direction = wl - wr
ang = math.atan2(direction[1], direction[0])
ph.rotation_euler = (d2r(52), 0, ang)
ph.location = (mid[0], mid[1], max(hl[2], hr[2]) + 0.030)
bv = ph.modifiers.new("bev", 'BEVEL'); bv.width = 0.006; bv.segments = 3
bpy.ops.object.modifier_apply(modifier="bev")
pm = bpy.data.materials.new("手机材质"); pm.diffuse_color = (0.03, 0.03, 0.04, 1.0)
ph.data.materials.append(pm)
log(f"phone loc={tuple(round(v,3) for v in ph.location)} rotz={math.degrees(ang):.1f}")

# ---------------- 场景 ----------------
for o in list(scene.objects):
    if o.type in {'CAMERA', 'LIGHT'}:
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.mesh.primitive_plane_add(size=14, location=(0, 0, 0.0))
ground = bpy.context.active_object; ground.name = "地面"
gm = bpy.data.materials.new("地面材质"); gm.diffuse_color = (0.34, 0.52, 0.26, 1.0)
ground.data.materials.append(gm)
sun_d = bpy.data.lights.new("Sun", 'SUN'); sun_d.energy = 3.5
sun = bpy.data.objects.new("Sun", sun_d); scene.collection.objects.link(sun)
sun.rotation_euler = (d2r(40), d2r(-14), d2r(35))
ww = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
scene.world = ww
bg = ww.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.78, 0.85, 0.94, 1.0); bg.inputs[1].default_value = 1.0
cam_d = bpy.data.cameras.new("Cam"); cam_d.lens = 62
cam = bpy.data.objects.new("Cam", cam_d); scene.collection.objects.link(cam)
scene.camera = cam
scene.render.engine = 'BLENDER_WORKBENCH'
try:
    scene.display.shading.color_type = 'MATERIAL'
except Exception as ex:
    log(f"shading {ex}")
scene.render.resolution_x = 900
scene.render.resolution_y = 900

hx, hy = JP["head"][0], JP["head"][1]
ax = (JP["ankle_L"][0] + JP["ankle_R"][0]) / 2
ay = (JP["ankle_L"][1] + JP["ankle_R"][1]) / 2
target = np.array([(hx + ax) / 2, (hy + ay) / 2, 0.18])
axisv = np.array([hx - ax, hy - ay, 0.0])
axisv = axisv / np.linalg.norm(axisv)
perp = np.array([-axisv[1], axisv[0], 0.0])
log(f"axis(head-dir)=({axisv[0]:.2f},{axisv[1]:.2f}) target={tuple(round(v,2) for v in target)}")
views = {
    "后上45": target - axisv * 1.25 + perp * 0.45 + np.array([0, 0, 1.25]),
    "侧后": target - axisv * 0.35 - perp * 1.45 + np.array([0, 0, 0.80]),
    "正前": target + axisv * 1.80 + perp * 0.15 + np.array([0, 0, 0.65]),
}
tag = "调试" if MODE == "debug" else "姿势"
import mathutils
for vn, pos in views.items():
    cam.location = pos
    dd = mathutils.Vector(target - pos)
    cam.rotation_euler = dd.to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(EV, f"FP-01-{tag}-{vn}.png")
    bpy.ops.render.render(write_still=True)
    log(f"render {vn}")

with open(os.path.join(EV, f"FP-01-姿态-{MODE}.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(LOG))
