# -*- coding: utf-8 -*-
# FP-01 部件标定：打开 吴昊阳模型v2.blend，按连通壳分组，渲染各壳高亮图并输出壳统计。
# 目的：为「分部件刚体变换」提供解剖分区依据（本模型无骨架）。
import bpy
import bmesh
import json
import math
import os
import sys
import time

DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EV = os.path.join(DIR, "证据")
OUT_JSON = os.path.join(EV, "FP-01-壳.json")
LOG = []


def log(s):
    LOG.append(str(s))
    print("[SHELL] " + str(s), flush=True)


t0 = time.time()
bpy.ops.wm.read_factory_settings(use_empty=True)
src_blend = os.path.join(DIR, "吴昊阳模型v2.blend")
bpy.ops.wm.open_mainfile(filepath=src_blend)
log(f"open blend {time.time()-t0:.1f}s version={bpy.app.version_string}")

scene = bpy.context.scene
meshes = [o for o in scene.objects if o.type == 'MESH']
others = [(o.name, o.type) for o in scene.objects if o.type != 'MESH']
log(f"mesh objects={[o.name for o in meshes]} other={others}")
log(f"armatures={[a.name for a in bpy.data.armatures]}")

ob = meshes[0]
me = ob.data
log(f"obj={ob.name} verts={len(me.vertices)} polys={len(me.polygons)} uv={len(me.uv_layers)}")
_bb = [ob.matrix_world @ __import__("mathutils").Vector(c) for c in ob.bound_box]
log(f"bbox_min={tuple(round(min(p[i] for p in _bb),4) for i in range(3))} max={tuple(round(max(p[i] for p in _bb),4) for i in range(3))}")
for m in me.materials:
    log(f"mat={m.name!r} nodes={m.use_nodes}")
    if m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == 'TEX_IMAGE':
                im = n.image
                log(f"   tex node={n.name} image={im.name if im else None} size={tuple(im.size) if im else None}")

# ---------- 连通壳分解 ----------
bm = bmesh.new()
bm.from_mesh(me)
bm.verts.ensure_lookup_table()
visited = [False] * len(bm.verts)
shells = []
for v in bm.verts:
    if visited[v.index]:
        continue
    stack = [v]
    visited[v.index] = True
    grp = []
    while stack:
        cur = stack.pop()
        grp.append(cur.index)
        for e in cur.link_edges:
            o = e.other_vert(cur)
            if not visited[o.index]:
                visited[o.index] = True
                stack.append(o)
    shells.append(grp)
shells.sort(key=len, reverse=True)
log(f"shells={len(shells)} total_verts={sum(len(s) for s in shells)}")
big = [s for s in shells if len(s) >= 30]
log(f"shells>=30v: {len(big)}")

mw = None
import numpy as np
arr = np.empty(len(me.vertices) * 3, dtype=np.float32)
me.vertices.foreach_get("co", arr)
V = arr.reshape(-1, 3).astype(np.float64)
mw = np.array(ob.matrix_world, dtype=np.float64)
Vw = (np.hstack([V, np.ones((len(V), 1))]) @ mw.T)[:, :3]

info = []
for i, s in enumerate(shells):
    if len(s) < 30:
        continue
    p = Vw[s]
    info.append({
        "id": i,
        "n": len(s),
        "center": [round(float(x), 4) for x in p.mean(axis=0)],
        "min": [round(float(x), 4) for x in p.min(axis=0)],
        "max": [round(float(x), 4) for x in p.max(axis=0)],
    })
    log(f"S{i:02d} n={len(s):6d} c=({p.mean(axis=0)[0]:+.3f},{p.mean(axis=0)[1]:+.3f},{p.mean(axis=0)[2]:+.3f}) "
        f"x=[{p[:,0].min():+.3f},{p[:,0].max():+.3f}] y=[{p[:,1].min():+.3f},{p[:,1].max():+.3f}] z=[{p[:,2].min():+.3f},{p[:,2].max():+.3f}]")

with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump({"shell_count": len(shells), "shells": info}, f, ensure_ascii=False, indent=1)

# ---------- 高亮渲染 ----------
for o in list(scene.objects):
    if o.type in {'CAMERA', 'LIGHT'}:
        bpy.data.objects.remove(o, do_unlink=True)

# 给每个大壳一个独立材质槽用于识别
bm.free()
me.materials.clear()
pal = []
rng = np.random.default_rng(7)
for k in range(min(len(info), 40)):
    c = rng.uniform(0.15, 0.95, 3)
    mm = bpy.data.materials.new(f"壳色{k}")
    mm.use_nodes = True
    bsdf = mm.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (float(c[0]), float(c[1]), float(c[2]), 1.0)
    else:
        mm.diffuse_color = (float(c[0]), float(c[1]), float(c[2]), 1.0)
    pal.append(mm.name)
    me.materials.append(mm)

slot_of = {info[k]["id"]: k for k in range(len(info))}
vid2slot = {}
for k, sid in slot_of.items():
    pass
poly_vid = [list(p.vertices) for p in me.polygons]
face_slot = [0] * len(me.polygons)
vert_slot = np.full(len(me.vertices), -1, dtype=np.int64)
for k, item in enumerate(info):
    for vi in shells[item["id"]]:
        vert_slot[vi] = k
for fi, vs in enumerate(poly_vid):
    best = -1
    for vi in vs:
        if vert_slot[vi] >= 0:
            best = vert_slot[vi]
            break
    face_slot[fi] = best if best >= 0 else 0
me.materials.clear()
for nm in pal:
    me.materials.append(bpy.data.materials[nm])
for fi, sl in enumerate(face_slot):
    me.polygons[fi].material_index = sl
me.update()

cam_d = bpy.data.cameras.new("Cam")
cam_d.lens = 50
cam = bpy.data.objects.new("Cam", cam_d)
scene.collection.objects.link(cam)
scene.camera = cam
sun_d = bpy.data.lights.new("Sun", 'SUN')
sun_d.energy = 4.0
sun = bpy.data.objects.new("Sun", sun_d)
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(50), math.radians(-16), math.radians(30))
ww = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
scene.world = ww
bg = ww.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.85, 0.88, 0.92, 1.0)
    bg.inputs[1].default_value = 1.0
scene.render.engine = 'BLENDER_WORKBENCH'
try:
    scene.display.shading.light = 'FLAT'
    scene.display.shading.color_type = 'MATERIAL'
except Exception as ex:
    log(f"shading: {ex}")
scene.render.resolution_x = 1000
scene.render.resolution_y = 1000

ctr = Vw.mean(axis=0)
radius = float(np.linalg.norm(Vw - ctr, axis=1).max())
views = {"正(+Y)": (0, 1), "背(-Y)": (0, -1), "右(+X)": (1, 0), "左(-X)": (-1, 0)}
import mathutils
for nm, (dx, dy) in views.items():
    d = mathutils.Vector((dx, dy, 0.30)).normalized()
    cam.location = mathutils.Vector(ctr) + d * radius * 2.6
    look = mathutils.Vector(ctr) - cam.location
    cam.rotation_euler = look.to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(EV, f"FP-01-标定-{nm}.png")
    bpy.ops.render.render(write_still=True)
    log(f"render {nm}")

top = Vw.copy()
with open(os.path.join(EV, "FP-01-标定.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(LOG))
log("DONE")
