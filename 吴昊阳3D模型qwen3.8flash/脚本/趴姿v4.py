# -*- coding: utf-8 -*-
"""FP-01 v4：连续平滑蒙皮（修复上版逐顶点单骨硬分配导致的碎片裂缝）+ 趴撑肘持机姿势。
模型无骨架、783 个连通壳；关键：权重场对空间连续 => 缝隙处重合点同步位移，不再开裂。
FP01_MODE=debug(默认，灰壳低模看形不导出) / full(写回导出glb) / iter(debug且渲染多视角调参)
"""
import json
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
SCALE = float(os.environ.get("FP01_SCALE", "1.62"))
d2r = math.radians

# ---- 可调角度表（趴撑肘持机：俯卧，双肘撑地，小臂抬起胸前持机，头低下看机，双腿后伸）----
# 骨语义见 skeleton.world_mats：segment j = pivot(parent)->POS[j]；绕 pivot 旋转带动下游。
#   躯干 pelvis 全局 R_x(-90) 趴下；spine/chest/neck 控制反弓；head/neck 低头。
#   手臂：elbow 骨=上臂(绕肩)、wrist 骨=小臂(绕肘)、shoulder 骨=肩带微动。
#   腿：knee 骨=大腿(绕髋)、ankle 骨=小腿(绕膝)。
DEG = {
    "yaw": 0.0,             # 头朝 +Y = 引擎相机侧（2D基准：头近相机、脚远）
    "spine": 8.0,           # 腰反弓
    "chest": 16.0,          # 胸段抬起（撑肘挺胸）
    "neck": -16.0,          # 颈低头看手机（稍抬起露出眼镜/手机）
    "head": -10.0,          # 头下倾
    "head_turn": 0.0,
    # 手臂：upper=上臂绝对角(90=肘垂地撑地)，fore=相对肘弯角(135=小臂折向脸前)
    "upper_L": 90.0, "arm_in_L": 17.0, "fore_L": 140.0, "twist_L": 0.0,
    "upper_R": 90.0, "arm_in_R": 17.0, "fore_R": 140.0, "twist_R": 0.0,
    # 腿：向后贴地，脚掌落地（基准图脚不翘），双脚分开
    "thigh_L": -4.0, "shin_L": -4.0, "hip_spread_L": 8.0,
    "thigh_R": -4.0, "shin_R": -4.0, "hip_spread_R": -8.0,
}

# 平滑蒙皮：各骨影响半径（连续衰减，越大过渡越柔、越少硬缝）
SIG = {
    "spine": 0.20, "chest": 0.20, "neck": 0.11, "head": 0.22,
    "clav_L": 0.09, "shoulder_L": 0.11, "elbow_L": 0.13, "wrist_L": 0.11,
    "clav_R": 0.09, "shoulder_R": 0.11, "elbow_R": 0.13, "wrist_R": 0.11,
    "hip_L": 0.15, "knee_L": 0.16, "ankle_L": 0.15,
    "hip_R": 0.15, "knee_R": 0.16, "ankle_R": 0.15,
}


def own_from_deg(D):
    # 关键：world_mats 中 OWN 作用于静止姿态坐标系。四肢静止指向 -Z（下垂），
    # Rx(+a) 把 -Z 摆向 +Y(静止) = 世界 -Z(地面) => 撑地；Ry 会把左右臂甩向相反侧（上版不对称根因）。
    # 绝对方向 = Rx(upper+fore)，fore 为相对肘弯角。
    return {
        "pelvis": SK.euler((d2r(-90), 0, d2r(D["yaw"]))),
        "spine": SK.euler((d2r(D["spine"]), 0, 0)),
        "chest": SK.euler((d2r(D["chest"]), 0, 0)),
        "neck": SK.euler((d2r(D["neck"]), 0, 0)),
        "head": SK.euler((d2r(D["head"]), d2r(D["head_turn"]), 0)),
        "clav_L": np.eye(3),
        "shoulder_L": SK.euler((0, 0, d2r(-D["arm_in_L"]))),
        "elbow_L": SK.euler((d2r(D["upper_L"]), 0, 0)),
        "wrist_L": SK.euler((d2r(D["fore_L"]), 0, d2r(D["twist_L"]))),
        "clav_R": np.eye(3),
        "shoulder_R": SK.euler((0, 0, d2r(D["arm_in_R"]))),
        "elbow_R": SK.euler((d2r(D["upper_R"]), 0, 0)),
        "wrist_R": SK.euler((d2r(D["fore_R"]), 0, d2r(-D["twist_R"]))),
        "hip_L": SK.euler((0, 0, d2r(D["hip_spread_L"]))),
        "knee_L": SK.euler((d2r(D["thigh_L"]), 0, 0)),
        "ankle_L": SK.euler((d2r(D["shin_L"]), 0, 0)),
        "hip_R": SK.euler((0, 0, d2r(D["hip_spread_R"]))),
        "knee_R": SK.euler((d2r(D["thigh_R"]), 0, 0)),
        "ankle_R": SK.euler((d2r(D["shin_R"]), 0, 0)),
    }


def smooth_weights(pts):
    """连续空间权重：raw_j = exp(-(d_j/sigma_j)^2)，d_j 为到骨段(含端点延伸)的垂直+端帽距离。
    躯干/髋部顶点若无骨段覆盖，由 pelvis 兜底。权重场连续 => 碎片缝隙同步形变，不裂。"""
    N = len(pts)
    idx = {j: i for i, j in enumerate(SK.ORDER)}
    raw = np.zeros((N, len(SK.ORDER)))
    for j in SK.ORDER:
        p = SK.PARENT[j]
        if p is None:
            continue
        a, b = SK.POS[j], SK.POS[p]
        ab = a - b
        L2 = float(ab @ ab)
        L = math.sqrt(L2)
        u = ab / L
        rel = pts - b
        t = (rel @ u) / L                       # 沿轴参数（允许 <0 或 >1，用端帽距离处理）
        along = np.clip(t, 0.0, 1.0)
        proj = b + np.outer(along * L, u)
        d = np.linalg.norm(pts - proj, axis=1)  # 到线段最近距离（端点外含端帽增长）
        s = SIG.get(j, 0.12)
        raw[:, idx[j]] = np.exp(-(d / s) ** 2)
    # 兜底 pelvis：给全身一点基权，避免远离所有骨段的点权重归零抖动
    raw[:, idx["pelvis"]] += 0.02
    sm = raw.sum(axis=1, keepdims=True)
    sm[sm < 1e-9] = 1.0
    return raw / sm


def build_mats(D):
    own = own_from_deg(D)
    M = SK.world_mats(own)
    return np.stack([M[j] for j in SK.ORDER])


def skin(pts, MATS, W):
    hom = np.hstack([pts, np.ones((len(pts), 1))])
    out = np.einsum("nj,jab,nb->na", W, MATS, hom)
    return out[:, :3]


LOG = []


def log(s):
    LOG.append(str(s))
    print("[V4] " + str(s), flush=True)


t0 = time.time()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.open_mainfile(filepath=os.path.join(DIR, "吴昊阳模型v2.blend"))
scene = bpy.context.scene
ob = next(o for o in scene.objects if o.type == "MESH")
me = ob.data
nv = len(me.vertices)
a = np.empty(nv * 3, dtype=np.float32)
me.vertices.foreach_get("co", a)
REST = a.reshape(-1, 3).astype(np.float64)
log(f"verts={nv} open={time.time()-t0:.1f}s")

MATS = build_mats(DEG)
t0 = time.time()
W = smooth_weights(REST)
log(f"weights {time.time()-t0:.1f}s")
t0 = time.time()
POSED = skin(REST, MATS, W)
log(f"skin {time.time()-t0:.1f}s")

# 落地 + 缩放
zmin = POSED[:, 2].min()
K = SCALE / 1.134
OUT = (POSED - np.array([0.0, 0.0, zmin])) * K
log(f"bbox x=[{OUT[:,0].min():+.2f},{OUT[:,0].max():+.2f}] "
    f"y=[{OUT[:,1].min():+.2f},{OUT[:,1].max():+.2f}] z=[{OUT[:,2].min():+.2f},{OUT[:,2].max():+.2f}]")

pj = SK.posed_joints(own_from_deg(DEG))
for j in SK.ORDER:
    log(f"J {j:12s} ({(pj[j]-[0,0,zmin])[0]*K:+.2f},{(pj[j]-[0,0,zmin])[1]*K:+.2f},{(pj[j]-[0,0,zmin])[2]*K:+.2f})")

# 写回（debug 用低模壳，full 用原网格）
if MODE == "full":
    me.vertices.foreach_set("co", OUT.astype(np.float32).ravel())
    me.update()
    # 重算法线
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    body = ob
    log("normals recomputed on full mesh")
else:
    # 降采样显示壳：仅渲染用，按顶点每 k 取一仍用原拓扑难；这里直接建低模=对原面抽样
    dm = bpy.data.meshes.new("dbg")
    faces = [list(p.vertices) for p in me.polygons]
    dm.from_pydata(OUT.tolist(), [], faces)
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
        if o.type == "MESH" and o.name != "dbg_pose":
            bpy.data.objects.remove(o, do_unlink=True)

# 手机（两手之间，头前下方）
wl = (pj["wrist_L"] - [0, 0, zmin]) * K
wr = (pj["wrist_R"] - [0, 0, zmin]) * K
mid = (wl + wr) * 0.5
bpy.ops.mesh.primitive_cube_add(size=1)
ph = bpy.context.active_object
ph.name = "手机"
ph.scale = (0.062, 0.125, 0.012)
bpy.ops.object.transform_apply(scale=True)
d = wr - wl
ang = math.atan2(d[1], d[0])
ph.rotation_euler = (math.radians(52), 0, ang + math.radians(90))
ph.location = (mid[0], mid[1] - 0.02, mid[2] + 0.03)
bv = ph.modifiers.new("bev", "BEVEL")
bv.width = 0.006
bv.segments = 2
bpy.ops.object.modifier_apply(modifier="bev")
pm = bpy.data.materials.new("手机材质")
pm.use_nodes = True
pb = pm.node_tree.nodes.get("Principled BSDF")
if pb:
    pb.inputs["Base Color"].default_value = (0.02, 0.02, 0.025, 1.0)
    pb.inputs["Roughness"].default_value = 0.35
ph.data.materials.append(pm)
log(f"phone mid=({mid[0]:+.2f},{mid[1]:+.2f},{mid[2]:+.2f})")

# 地面 + 灯 + 世界
for o in list(scene.objects):
    if o.type in {"CAMERA", "LIGHT"}:
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0.0))
ground = bpy.context.active_object
gm = bpy.data.materials.new("地面材质")
gm.use_nodes = True
gbe = gm.node_tree.nodes.get("Principled BSDF")
if gbe:
    gbe.inputs["Base Color"].default_value = (0.28, 0.46, 0.18, 1.0)
ground.data.materials.append(gm)

sun_d = bpy.data.lights.new("Sun", "SUN")
sun_d.energy = 3.5
sun = bpy.data.objects.new("Sun", sun_d)
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(140))
ww = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
scene.world = ww
bg = ww.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.85, 0.9, 0.95, 1.0)
    bg.inputs[1].default_value = 1.0

# 相机
cam_d = bpy.data.cameras.new("Cam")
cam_d.lens = 55
cam = bpy.data.objects.new("Cam", cam_d)
scene.collection.objects.link(cam)
scene.camera = cam
scene.render.engine = "BLENDER_WORKBENCH"
try:
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
except Exception as ex:
    log(f"shading {ex}")
scene.render.resolution_x = 900
scene.render.resolution_y = 900

ctr = OUT.mean(axis=0)
head = (pj["head"] - [0, 0, zmin]) * K
feetx = ((pj["ankle_L"] + pj["ankle_R"]) / 2 - [0, 0, zmin]) * K
axis = head - feetx
L = np.linalg.norm(axis); axis = axis / L
# 身体沿 Y 躺平：head 近 y=0，feet 远 y=-1.4。用能一眼看出"趴/躺"的视角。
views = {
    "侧": np.array([ctr[0] + 2.4, ctr[1], 0.55]),                 # +X 侧视：身体水平、背朝上
    "后上": np.array([ctr[0] + 0.9, ctr[1] - 1.7, 1.5]),          # 头后方斜上（对齐2D机位）
    "前低": np.array([ctr[0] + 0.6, ctr[1] + 1.6, 0.5]),          # 头前方低角看脸/手机
}
tag = "v4-" + MODE
for vn, pos in views.items():
    cam.location = mathutils.Vector(pos)
    look = mathutils.Vector(ctr) - cam.location
    cam.rotation_euler = look.to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = os.path.join(EV, f"FP-01-{tag}-{vn}.png")
    bpy.ops.render.render(write_still=True)
    log(f"render {vn}")

if MODE == "full":
    # 贴图降采样压体积（57MB 主要来自烘焙贴图）
    for img in bpy.data.images:
        if img.name.startswith("R:") or img.size[0] == 0:
            continue
        if max(img.size[0], img.size[1]) > 2048:
            img.scale(2048, 2048)
            log(f"scaled tex {img.name} -> 2048")
    blend_out = os.path.join(DIR, "吴昊阳模型v3-趴姿.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_out)
    log("saved " + blend_out)
    # 只导出身体+手机（排除地面/灯/相机）
    for o in bpy.data.objects:
        o.select_set(o in (body, ph))
    glb_out = os.path.join(DIR, "吴昊阳趴姿.glb")
    bpy.ops.export_scene.gltf(
        filepath=glb_out, export_format="GLB", use_selection=True,
        export_apply=True, export_yup=True,
        export_draco_mesh_compression_enable=True,
        export_image_format="AUTO",
    )
    sz = os.path.getsize(glb_out) / 1e6
    log(f"glb {glb_out} = {sz:.1f}MB draco=True")
    if sz > 20.0:
        # Draco 不够则关 Draco 再试（贴图已降采样，可能反而更小）并记录
        log(f"WARN glb>20MB ({sz:.1f})")

with open(os.path.join(EV, f"FP-01-{tag}.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(LOG))
    json.dump(DEG, open(os.path.join(EV, "FP-01-DEG.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
log(f"DONE {time.time()-t0:.1f}s")
