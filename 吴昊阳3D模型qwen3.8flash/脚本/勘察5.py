# FP-01 勘察脚本 v5：从 glb 导入的网格做连通分量分区，输出各部件世界坐标包围盒 + 正交多视渲染
import bpy
import math
import mathutils
import os
import collections

DIR = os.environ.get("FP01_DIR", "")
EV = os.path.join(DIR, "证据")
OUT = os.path.join(EV, "FP-01-勘察5.txt")
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
log(f"imported {ob.name!r} verts={len(me.vertices)} polys={len(me.polygons)} mats={[m.name for m in me.materials]}")
for m in me.materials:
    if m and m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image:
                log(f"  TEX {n.image.name!r} size={tuple(n.image.size)} has_data={n.image.has_data}")

coords = [ob.matrix_world @ v.co for v in me.vertices]
xs = [c.x for c in coords]; ys = [c.y for c in coords]; zs = [c.z for c in coords]
log(f"bbox min=({min(xs):.4f},{min(ys):.4f},{min(zs):.4f}) max=({max(xs):.4f},{max(ys):.4f},{max(zs):.4f})")

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
log(f"components={len(comps)} total_verts={sum(len(c) for c in comps)}")
for ci, comp in enumerate(comps[:40]):
    cc = [coords[i] for i in comp]
    cx = [c.x for c in cc]; cy = [c.y for c in cc]; cz = [c.z for c in cc]
    log(f"COMP[{ci}] n={len(comp)} x=[{min(cx):.3f},{max(cx):.3f}] y=[{min(cy):.3f},{max(cy):.3f}] z=[{min(cz):.3f},{max(cz):.3f}] cen=({sum(cx)/len(cx):.3f},{sum(cy)/len(cy):.3f},{sum(cz)/len(cz):.3f})")

# 每 10cm 一层，记录该层内 x 极值出现的 y（判断肢体前后）
log("--- Z layers 10cm ---")
z = min(zs)
while z < max(zs):
    sel = [coords[i] for i in range(len(coords)) if z <= coords[i].z < z + 0.10]
    if sel:
        lx = [c.x for c in sel]; ly = [c.y for c in sel]
        log(f"z[{z:.2f},{z+0.10:.2f}) n={len(sel)} xw={max(lx)-min(lx):.3f} yd={max(ly)-min(ly):.3f} x=[{min(lx):.3f},{max(lx):.3f}] y=[{min(ly):.3f},{max(ly):.3f}]")
    z += 0.10

# ---------- 正交多视渲染 ----------
for o in list(scene.objects):
    if o.type in {'CAMERA', 'LIGHT'}:
        bpy.data.objects.remove(o, do_unlink=True)

cam_data = bpy.data.cameras.new("Cam")
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 1.35
cam = bpy.data.objects.new("Cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

for lt in list(bpy.data.lights):
    bpy.data.lights.remove(lt)
sun_d = bpy.data.lights.new("Sun", 'SUN'); sun_d.energy = 3.5
sun = bpy.data.objects.new("Sun", sun_d); scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(55), math.radians(-18), math.radians(30))

world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
scene.world = world
if hasattr(world, "use_nodes"):
    world.use_nodes = True
bg = world.node_tree.nodes.get("Background") if world.use_nodes else None
if bg:
    bg.inputs[0].default_value = (0.75, 0.82, 0.92, 1.0)
    bg.inputs[1].default_value = 1.0

scene.render.engine = 'BLENDER_WORKBENCH'
sh = scene.display.shading
log(f"workbench shading attrs: color_type ok")
try:
    sh.color_type = 'MATERIAL'
except Exception as e:
    log(f"color_type fail {e}")
try:
    sh.light_mode = 'STUDIO'
except Exception as e:
    log(f"light_mode fail {e}")

scene.render.resolution_x = 800
scene.render.resolution_y = 800
center = mathutils.Vector((0, 0, 0.57))
views = {
    "正": mathutils.Vector((0, -2.5, 0.60)),
    "背": mathutils.Vector((0, 2.5, 0.60)),
    "右": mathutils.Vector((2.5, 0, 0.60)),
    "左": mathutils.Vector((-2.5, 0, 0.60)),
    "顶": mathutils.Vector((0, 0.0001, 2.6)),
}
for nm, pos in views.items():
    cam.location = pos
    d = center - pos
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(EV, f"FP-01-站资-{nm}.png")
    bpy.ops.render.render(write_still=True)
    log(f"render {nm}")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(msg))
