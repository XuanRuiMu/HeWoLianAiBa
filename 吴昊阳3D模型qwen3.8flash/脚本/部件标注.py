# FP-01 部件标注：按连通分量给每个较大部件赋随机纯色，渲染多视定位身体部位
import bpy
import math
import mathutils
import os
import random
import collections

DIR = os.environ.get("FP01_DIR", "")
EV = os.path.join(DIR, "证据")
OUT = os.path.join(EV, "FP-01-部件.txt")
msg = []


def log(s):
    msg.append(str(s))


scene = bpy.context.scene
for o in list(scene.objects):
    if o.type != 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)
for m in list(bpy.data.meshes):
    if m.users == 0:
        bpy.data.meshes.remove(m)

glb = os.path.join(DIR, "吴昊阳模型v2.glb")
bpy.ops.import_scene.gltf(filepath=glb)
ob = next(o for o in scene.objects if o.type == 'MESH')
me = ob.data
log(f"{ob.name!r} verts={len(me.vertices)} polys={len(me.polygons)}")

coords = [ob.matrix_world @ v.co for v in me.vertices]

adj = collections.defaultdict(set)
for e in me.edges:
    adj[e.vertices[0]].add(e.vertices[1])
    adj[e.vertices[1]].add(e.vertices[0])
seen = set()
comps = []
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
big = [c for c in comps if len(c) >= 1500]
log(f"components>=1500verts: {len(big)} (of {len(comps)})")

random.seed(7)
mat_for_comp = {}
polys_of = collections.defaultdict(list)
for pi, p in enumerate(me.polygons):
    zs = [coords[vi].z for vi in p.vertices]
    polys_of[min(zs, key=lambda z: 0)].append(pi)

# 用顶点所属分量给面分配材质槽
vert_comp = {}
for ci, comp in enumerate(big):
    for vi in comp:
        vert_comp[vi] = ci
ncomp = len(big)
slot_of_poly = []
for p in me.polygons:
    cs = [vert_comp.get(vi) for vi in p.vertices]
    cs = [c for c in cs if c is not None]
    slot_of_poly.append(cs[0] if cs else -1)
uniq = sorted(set(slot_of_poly))
log(f"poly slots used={len(uniq)} (incl -1 for unassigned)")

# 建立材质
mats = []
for ci in range(ncomp):
    m = bpy.data.materials.new(f"part_{ci}")
    m.diffuse_color = (random.random(), random.random(), random.random(), 1.0)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = m.diffuse_color
    mats.append(m)
rest = bpy.data.materials.new("part_other")
rest.diffuse_color = (0.3, 0.3, 0.3, 1.0)
me.materials.clear()
for m in mats:
    me.materials.append(m)
me.materials.append(rest)
other_slot = ncomp
for pi, sl in enumerate(slot_of_poly):
    me.polygons[pi].material_index = sl if sl >= 0 else other_slot

# 打印每个分量的信息（含材质索引）
for ci, comp in enumerate(big):
    cc = [coords[i] for i in comp]
    cx = [c.x for c in cc]; cy = [c.y for c in cc]; cz = [c.z for c in cc]
    col = tuple(round(v, 2) for v in mats[ci].diffuse_color[:3])
    log(f"P{ci:02d} n={len(comp):6d} x=[{min(cx):+.3f},{max(cx):+.3f}] y=[{min(cy):+.3f},{max(cy):+.3f}] z=[{min(cz):+.3f},{max(cz):+.3f}] cen=({sum(cx)/len(cx):+.3f},{sum(cy)/len(cy):+.3f},{sum(cz)/len(cz):+.3f}) rgb={col}")

# ---------- 渲染 ----------
for o in list(scene.objects):
    if o.type in {'CAMERA', 'LIGHT'}:
        bpy.data.objects.remove(o, do_unlink=True)
cam_data = bpy.data.cameras.new("Cam"); cam_data.type = 'ORTHO'; cam_data.ortho_scale = 1.3
cam = bpy.data.objects.new("Cam", cam_data); scene.collection.objects.link(cam); scene.camera = cam
sun_d = bpy.data.lights.new("Sun", 'SUN'); sun_d.energy = 3.0
sun = bpy.data.objects.new("Sun", sun_d); scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(55), math.radians(-18), math.radians(30))
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
    sh.show_shadows = False
except Exception as ex:
    log(f"sh {ex}")
scene.render.resolution_x = 900
scene.render.resolution_y = 900
center = mathutils.Vector((0, 0, 0.57))
views = {"正": (0, -2.5, 0.6), "背": (0, 2.5, 0.6), "右": (2.5, 0, 0.6), "左": (-2.5, 0, 0.6), "顶": (0, 0.0001, 2.6)}
for nm, pos in views.items():
    cam.location = pos
    d = center - mathutils.Vector(pos)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(EV, f"FP-01-部件-{nm}.png")
    bpy.ops.render.render(write_still=True)
    log(f"render {nm}")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(msg))
