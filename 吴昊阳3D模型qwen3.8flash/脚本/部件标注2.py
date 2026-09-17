# FP-01 部件标注 v2：按面质心 z 归组（避免跨部件分量），渲染多视 + 输出各分量与相机朝向关系
import bpy
import math
import mathutils
import os
import random
import collections

DIR = os.environ.get("FP01_DIR", "")
EV = os.path.join(DIR, "证据")
OUT = os.path.join(EV, "FP-01-部件2.txt")
msg = []


def log(s):
    msg.append(str(s))


scene = bpy.context.scene
for o in list(scene.objects):
    if o.type != 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)

glb = os.path.join(DIR, "吴昊阳模型v2.glb")
bpy.ops.import_scene.gltf(filepath=glb)
ob = next(o for o in scene.objects if o.type == 'MESH')
me = ob.data
coords = [ob.matrix_world @ v.co for v in me.vertices]

adj = collections.defaultdict(set)
for e in me.edges:
    adj[e.vertices[0]].add(e.vertices[1])
    adj[e.vertices[1]].add(e.vertices[0])
seen = set(); comps = []
for v in me.vertices:
    if v.index in seen:
        continue
    stack = [v.index]; comp = []; seen.add(v.index)
    while stack:
        cur = stack.pop(); comp.append(cur)
        for nb in adj[cur]:
            if nb not in seen:
                seen.add(nb); stack.append(nb)
    comps.append(comp)
comps.sort(key=len, reverse=True)
big = [c for c in comps if len(c) >= 400]
log(f"comps>=400 verts: {len(big)} / total {len(comps)}; covered_verts={sum(len(c) for c in big)}")

vert_comp = {}
for ci, comp in enumerate(big):
    for vi in comp:
        vert_comp[vi] = ci

random.seed(11)
mats = []
for ci in range(len(big)):
    m = bpy.data.materials.new(f"part_{ci}")
    m.diffuse_color = (random.random(), random.random(), random.random(), 1.0)
    mats.append(m)
rest = bpy.data.materials.new("part_other"); rest.diffuse_color = (0.5, 0.5, 0.5, 1.0)
me.materials.clear()
for m in mats:
    me.materials.append(m)
me.materials.append(rest)

# 面归属：多数顶点所属分量
poly_comp = []
for p in me.polygons:
    cs = [vert_comp.get(vi) for vi in p.vertices]
    cs = [c for c in cs if c is not None]
    if cs:
        cnt = collections.Counter(cs)
        poly_comp.append(cnt.most_common(1)[0][0])
    else:
        poly_comp.append(-1)
for pi, sl in enumerate(poly_comp):
    me.polygons[pi].material_index = sl if sl >= 0 else len(big)

for ci, comp in enumerate(big):
    cc = [coords[i] for i in comp]
    cx = [c.x for c in cc]; cy = [c.y for c in cc]; cz = [c.z for c in cc]
    col = tuple(round(v, 3) for v in mats[ci].diffuse_color[:3])
    log(f"P{ci:03d} n={len(comp):6d} x=[{min(cx):+.3f},{max(cx):+.3f}] y=[{min(cy):+.3f},{max(cy):+.3f}] z=[{min(cz):+.3f},{max(cz):+.3f}] cen=({sum(cx)/len(cx):+.3f},{sum(cy)/len(cy):+.3f},{sum(cz)/len(cz):+.3f}) rgb={col}")

# ---- 渲染：透视、材质纯色、无光照 ----
for o in list(scene.objects):
    if o.type in {'CAMERA', 'LIGHT'}:
        bpy.data.objects.remove(o, do_unlink=True)
cam_data = bpy.data.cameras.new("Cam"); cam_data.lens = 90
cam = bpy.data.objects.new("Cam", cam_data); scene.collection.objects.link(cam); scene.camera = cam
world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
scene.world = world
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (1, 1, 1, 1); bg.inputs[1].default_value = 1.0
scene.render.engine = 'BLENDER_WORKBENCH'
sh = scene.display.shading
try:
    sh.color_type = 'MATERIAL'
except Exception as ex:
    log(f"ct {ex}")
try:
    sh.show_cavity = False
except Exception:
    pass
scene.render.resolution_x = 800
scene.render.resolution_y = 800
center = mathutils.Vector((0, 0, 0.57))
views = {"正面": (0, -2.4, 0.6), "背面": (0, 2.4, 0.6), "右侧": (2.4, 0, 0.6), "左侧": (-2.4, 0, 0.6)}
for nm, pos in views.items():
    cam.location = pos
    d = center - mathutils.Vector(pos)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(EV, f"FP-01-色块-{nm}.png")
    bpy.ops.render.render(write_still=True)
    log(f"render {nm}")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(msg))
