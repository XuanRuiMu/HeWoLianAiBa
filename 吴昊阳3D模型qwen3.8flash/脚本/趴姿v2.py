# -*- coding: utf-8 -*-
"""FP-01 趴姿重定 v2：实测骨骼 LBS（脚本 skeleton.py，逐骨刚性自检 0.00%）
+ 落地平移 + 手机道具 + 多机位渲染。
FP01_MODE=debug  -> 低模灰壳快速看形（不写回原网格、不导出）
FP01_MODE=full   -> 写回原网格、另存 blend、导出 glb
"""
import math
import os
import sys
import time

import numpy as np

DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EV = os.path.join(DIR, "证据")
sys.path.insert(0, os.path.join(DIR, "脚本"))
import bpy
import mathutils
import skeleton as SK

MODE = os.environ.get("FP01_MODE", "debug")
SCALE = float(os.environ.get("FP01_SCALE", "1.70"))   # 目标身高（原始 1.134 单位）
ANG = os.path.join(EV, "FP-01-角度.json")
LOG = []

# 载入优化后的角度表覆盖默认值
if os.path.exists(ANG):
    import json
    with open(ANG, encoding="utf-8") as f:
        _a = json.load(f)
    SK.DEFAULT_DEG.update(_a)
    SK.OWN = SK.OWN_from_deg(SK.DEFAULT_DEG)
    LOG.append("angles loaded from " + os.path.basename(ANG))


def log(s):
    LOG.append(str(s))
    print("[V2] " + str(s), flush=True)


t_start = time.time()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.open_mainfile(filepath=os.path.join(DIR, "吴昊阳模型v2.blend"))
scene = bpy.context.scene
ob = next(o for o in scene.objects if o.type == 'MESH')
me = ob.data
nv = len(me.vertices)
log(f"obj={ob.name} verts={nv} mats={[m.name for m in me.materials]} open={time.time()-t_start:.1f}s")

a = np.empty(nv * 3, dtype=np.float32)
me.vertices.foreach_get("co", a)
REST = a.reshape(-1, 3).astype(np.float64)

# ---------- 蒙皮 ----------
t0 = time.time()
W, zero = SK.weights(REST)
log(f"weights {time.time()-t0:.1f}s zero={int(zero.sum())}")
MATS = SK.build_matrices()
t0 = time.time()
POSED = SK.skin(REST, MATS, W)
log(f"skin {time.time()-t0:.1f}s")

# ---------- 落地 + 缩放 ----------
zmin = POSED[:, 2].min()
K = SCALE / 1.134
OUT = (POSED - np.array([0.0, 0.0, zmin])) * K
log(f"zmin={zmin:.4f} k={K:.4f}")
log(f"posed bbox x=[{OUT[:,0].min():+.3f},{OUT[:,0].max():+.3f}] "
    f"y=[{OUT[:,1].min():+.3f},{OUT[:,1].max():+.3f}] z=[{OUT[:,2].min():+.3f},{OUT[:,2].max():+.3f}]")

JP = {}
pj = SK.posed_joints()
for j, c in pj.items():
    JP[j] = (c - np.array([0.0, 0.0, zmin])) * K
for j in SK.ORDER:
    log(f"J {j:12s} ({JP[j][0]:+.3f},{JP[j][1]:+.3f},{JP[j][2]:+.3f})")

# 贴地部件检查（肘/胸/髋/膝应接近地面）
for j in ("elbow_L", "elbow_R", "wrist_L", "wrist_R", "hip_L", "hip_R", "knee_L", "knee_R", "ankle_L", "ankle_R", "head"):
    log(f"GROUND {j:10s} z={JP[j][2]:.3f}")

if MODE == "full":
    me.vertices.foreach_set("co", OUT.astype(np.float32).ravel())
    me.update()
    body = ob
else:
    dm = bpy.data.meshes.new("dbg")
    dm.from_pydata((OUT / 1.0).tolist(), [], [list(p.vertices) for p in me.polygons])
    dm.update()
    body = bpy.data.objects.new("dbg_pose", dm)
    scene.collection.objects.link(body)
    m0 = bpy.data.materials.new("dbgmat")
    m0.use_nodes = True
    b = m0.node_tree.nodes.get("Principled BSDF")
    if b:
        b.inputs["Base Color"].default_value = (0.80, 0.60, 0.45, 1.0)
    dm.materials.append(m0)
    for o in list(scene.objects):
        if o.type == 'MESH' and o.name != "dbg_pose":
            bpy.data.objects.remove(o, do_unlink=True)

# ---------- 手机 ----------
hl, hr = JP["hand_L"] if "hand_L" in JP else JP["wrist_L"], JP["wrist_R"]
wl, wr = JP["wrist_L"], JP["wrist_R"]
hd = JP["head"]
mid = (wl + wr) * 0.5
# 手机放在两手连线中点偏头侧、略高于手
phone_loc = mid + np.array([0.0, 0.035, 0.020])
bpy.ops.mesh.primitive_cube_add(size=1)
ph = bpy.context.active_object
ph.name = "手机"
ph.scale = (0.074, 0.150, 0.016)
bpy.ops.object.transform_apply(scale=True)
d = wr - wl
ang = math.atan2(d[1], d[0])
ph.rotation_euler = (math.radians(90 - 34), 0, ang + math.radians(90))
ph.location = (phone_loc[0], phone_loc[1], phone_loc[2])
bv = ph.modifiers.new("bev", 'BEVEL')
bv.width = 0.008
bv.segments = 3
bpy.ops.object.modifier_apply(modifier="bev")
pm = bpy.data.materials.new("手机材质")
pm.use_nodes = True
pb = pm.node_tree.nodes.get("Principled BSDF")
if pb:
    pb.inputs["Base Color"].default_value = (0.02, 0.02, 0.025, 1.0)
    pb.inputs["Roughness"].default_value = 0.35
ph.data.materials.append(pm)
log(f"phone loc=({phone_loc[0]:+.3f},{phone_loc[1]:+.3f},{phone_loc[2]:+.3f}) rot_z={math.degrees(ang):.1f}")

# ---------- 场景 / 相机 ----------
for o in list(scene.objects):
    if o.type in {'CAMERA', 'LIGHT'}:
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.mesh.primitive_plane_add(size=16, location=(0, 0, 0.0))
ground = bpy.context.active_object
ground.name = "地面"
gm = bpy.data.materials.new("地面材质")
gm.use_nodes = True
gb = gm.node_tree.nodes.get("Principled BSDF")
if gb:
    gb.inputs["Base Color"].default_value = (0.30, 0.48, 0.20, 1.0)
ground.data.materials.append(gm)

sun_d = bpy.data.lights.new("Sun", 'SUN')
sun_d.energy = 4.0
sun = bpy.data.objects.new("Sun", sun_d)
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(38), math.radians(-12), math.radians(150))

ww = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
scene.world = ww
bg = ww.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.80, 0.87, 0.95, 1.0)
    bg.inputs[1].default_value = 1.0

cam_d = bpy.data.cameras.new("Cam")
cam_d.lens = 60
cam = bpy.data.objects.new("Cam", cam_d)
scene.collection.objects.link(cam)
scene.camera = cam
scene.render.engine = 'BLENDER_WORKBENCH'
try:
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
except Exception as ex:
    log(f"shading: {ex}")
scene.render.resolution_x = 1000
scene.render.resolution_y = 1000

body_c = OUT.mean(axis=0)
tag = "调试" if MODE == "debug" else "姿势"

# 引擎登录页机位换算到 Blender：引擎 Y-up -> Blender Z-up
#   B(x, y, z) = E(x, z, -y)
anchorE = mathutils.Vector((3.24, 2.77, 0.161))
camE = mathutils.Vector((5.75, 1.34, 5.27))
toB = lambda v: mathutils.Vector((v.x, -v.z, v.y))
anchorB = toB(anchorE)
camB = toB(camE)
log(f"engine cam(Blender coords)=({camB.x:.3f},{camB.y:.3f},{camB.z:.3f}) anchor=({anchorB.x:.3f},{anchorB.y:.3f},{anchorB.z:.3f})")

views = {}
# 基准图机位：人物后上方约45°俯视
ax = JP["head"][0] - (JP["ankle_L"][0] + JP["ankle_R"][0]) / 2
ay = JP["head"][1] - (JP["ankle_L"][1] + JP["ankle_R"][1]) / 2
L = math.hypot(ax, ay)
ax, ay = ax / L, ay / L
ctr = np.array([(JP["head"][0] + JP["ankle_L"][0] + JP["ankle_R"][0]) / 3,
                (JP["head"][1] + JP["ankle_L"][1] + JP["ankle_R"][1]) / 3, 0.25])
perp = np.array([-ay, ax, 0.0])
views["后上45"] = ctr - np.array([ax, ay, 0]) * 1.30 + perp * 0.55 + np.array([0, 0, 1.35])
views["侧后"] = ctr - np.array([ax, ay, 0]) * 0.45 - perp * 1.60 + np.array([0, 0, 0.85])
views["正前"] = ctr + np.array([ax, ay, 0]) * 1.70 + np.array([0, 0, 0.70])
views["引擎视角"] = np.array([camB.x, camB.y, camB.z])

for vn, pos in views.items():
    cam.location = mathutils.Vector(pos)
    look = mathutils.Vector(ctr) - cam.location
    if vn == "引擎视角":
        look = anchorB - cam.location
    cam.rotation_euler = look.to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(EV, f"FP-01-{tag}-{vn}.png")
    bpy.ops.render.render(write_still=True)
    log(f"render {vn}")

with open(os.path.join(EV, f"FP-01-姿态v2-{MODE}.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(LOG))
log(f"DONE total={time.time()-t_start:.1f}s")
