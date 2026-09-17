# -*- coding: utf-8 -*-
"""FP-10 重做 v7：修复 v6 读图发现的4个问题。
1) 躯干 UV 手工映射（u=左右x，v=头端0→脚端1），根治背号错位到腰臀
2) 手机归位到双手之间
3) 腿压低贴地：髋/膝/踝 z 降，两腿分开更大，膝盖微弯外八
4) 胸腹贴地：chest/waist/pelvis z 降低
"""
import os, sys, math, random
import bpy
import bmesh
from mathutils import Vector

DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(DIR, "证据")
TEX = os.path.join(DIR, "贴图")

bpy.ops.wm.read_factory_settings(use_empty=True)

def 材质贴图(名, png, rough=0.55):
    m = bpy.data.materials.new(名)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = rough
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(os.path.join(TEX, png), check_existing=False)
    uv = nt.nodes.new("ShaderNodeUVMap"); uv.uv_map = "UVMap"
    nt.links.new(uv.outputs["UV"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return m

def 材质纯色(名, r, g, b, rough=0.6):
    m = bpy.data.materials.new(名)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1)
    bsdf.inputs["Roughness"].default_value = rough
    return m

C_皮肤 = 材质纯色("皮肤", 0.96, 0.78, 0.62)
C_头发 = 材质纯色("头发", 0.045, 0.045, 0.06, 0.45)
C_球衣 = 材质贴图("球衣", "背绘.png")
M_胸绘 = 材质贴图("胸绘", "胸绘.png")
M_侧绘 = 材质贴图("侧绘", "侧绘.png")
C_护臂 = 材质贴图("护臂", "护臂绘.png", 0.65)
C_短裤 = 材质贴图("短裤", "短裤绘.png")
C_白袜 = 材质贴图("袜子", "袜绘.png", 0.7)
C_白鞋 = 材质贴图("鞋子", "鞋绘.png", 0.5)
C_手机 = 材质纯色("手机", 0.05, 0.05, 0.06, 0.3)
C_镜框 = 材质纯色("镜框", 0.97, 0.97, 0.97, 0.4)
C_青边 = 材质纯色("青边", 0.31, 0.76, 0.85, 0.5)
C_粉线 = 材质纯色("粉线", 0.94, 0.39, 0.57, 0.5)

# ---------- 骨架（v7：躯干贴地、腿分开压低）----------
J = {
    "pelvis":   ((0.000,  0.020, 0.070), 0.078, 0.056),
    "waist":    ((0.000, -0.060, 0.066), 0.064, 0.050),
    "chest":    ((0.000, -0.150, 0.070), 0.086, 0.062),
    "neck":     ((0.000, -0.235, 0.086), 0.032, 0.032),
    "headb":    ((0.000, -0.266, 0.096), 0.044, 0.044),
    "shoL":     ((0.098, -0.185, 0.086), 0.045, 0.045),
    "elbL":     ((0.150, -0.268, 0.040), 0.038, 0.038),
    "wriL":     ((0.050, -0.356, 0.066), 0.029, 0.027),
    "hndL":     ((0.034, -0.398, 0.074), 0.027, 0.020),
    "shoR":     ((-0.098, -0.185, 0.086), 0.045, 0.045),
    "elbR":     ((-0.150, -0.268, 0.040), 0.038, 0.038),
    "wriR":     ((-0.050, -0.356, 0.066), 0.029, 0.027),
    "hndR":     ((-0.034, -0.398, 0.074), 0.027, 0.020),
    "hipL":     ((0.075,  0.055, 0.062), 0.056, 0.054),
    "kneL":     ((0.135,  0.250, 0.046), 0.047, 0.045),
    "ankL":     ((0.175,  0.450, 0.036), 0.035, 0.034),
    "toeL":     ((0.195,  0.545, 0.016), 0.033, 0.018),
    "hipR":     ((-0.075,  0.055, 0.062), 0.056, 0.054),
    "kneR":     ((-0.135,  0.250, 0.046), 0.047, 0.045),
    "ankR":     ((-0.175,  0.450, 0.036), 0.035, 0.034),
    "toeR":     ((-0.195,  0.545, 0.016), 0.033, 0.018),
}
E = [("pelvis","waist"),("waist","chest"),("chest","neck"),("neck","headb"),
     ("chest","shoL"),("shoL","elbL"),("elbL","wriL"),("wriL","hndL"),
     ("chest","shoR"),("shoR","elbR"),("elbR","wriR"),("wriR","hndR"),
     ("pelvis","hipL"),("hipL","kneL"),("kneL","ankL"),("ankL","toeL"),
     ("pelvis","hipR"),("hipR","kneR"),("kneR","ankR"),("ankR","toeR")]

names = list(J.keys())
idx = {n: i for i, n in enumerate(names)}
P = {n: Vector(J[n][0]) for n in names}
me = bpy.data.meshes.new("body")
me.from_pydata([J[n][0] for n in names], [(idx[a], idx[b]) for a, b in E], [])
ob = bpy.data.objects.new("身体", me)
bpy.context.collection.objects.link(ob)
bpy.context.view_layer.objects.active = ob
ob.select_set(True)

skin = ob.modifiers.new("skin", 'SKIN')
sub = ob.modifiers.new("sub", 'SUBSURF'); sub.levels = 2; sub.render_levels = 2
sv = me.skin_vertices[0].data
for i, n in enumerate(names):
    sv[i].radius = (J[n][1], J[n][2])
sv[idx["pelvis"]].use_root = True
bpy.ops.object.modifier_apply(modifier="skin")
bpy.ops.object.modifier_apply(modifier="sub")

# ---------- 躯干手工 UV：u=左右(x归一)，v=头端0→脚端1(y归一) ----------
uvl = ob.data.uv_layers.new(name="UVMap")
XMIN, XMAX = -0.30, 0.30
YMIN, YMAX = -0.26, 0.02   # 躯干：头端→髋
for poly in ob.data.polygons:
    for li in poly.loop_indices:
        vco = ob.data.vertices[ob.data.loops[li].vertex_index].co
        u = (vco.x - XMIN) / (XMAX - XMIN)
        vv = (vco.y - YMIN) / (YMAX - YMIN)
        uvl.data[li].uv = (u, vv)

for slot, mat in enumerate([C_皮肤, C_球衣, M_胸绘, M_侧绘, C_短裤, C_白袜, C_白鞋, C_护臂]):
    ob.data.materials.append(mat)
# 槽位: 0皮肤 1背绘 2胸绘 3侧绘 4短裤 5袜 6鞋 7护臂

段表 = [
    (P["pelvis"], P["waist"], 1),
    (P["waist"],  P["chest"], 1),
    (P["chest"],  P["neck"],  1),
    (P["neck"],   P["headb"], 0),
    (P["chest"],  P["shoL"],  7), (P["shoL"], P["elbL"], 7), (P["elbL"], P["wriL"], 7),
    (P["chest"],  P["shoR"],  7), (P["shoR"], P["elbR"], 7), (P["elbR"], P["wriR"], 7),
    (P["wriL"],   P["hndL"],  0), (P["wriR"], P["hndR"], 0),
    (P["pelvis"], P["hipL"],  4), (P["pelvis"], P["hipR"], 4),
    (P["hipL"],   P["kneL"],  4), (P["hipR"],   P["kneR"], 4),
    (P["kneL"],   P["ankL"],  5), (P["kneR"],   P["ankR"], 5),
    (P["ankL"],   P["toeL"],  6), (P["ankR"],   P["toeR"], 6),
]

def 最近段(p):
    best = None; bd = 1e9
    for a, b, mat in 段表:
        ab = b - a
        t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
        d = (p - (a + ab * t)).length
        if d < bd:
            bd = d; best = mat
    return best

def 区域(p, n):
    base = 最近段(p)
    if base == 1:
        if n.z > 0.55:  return 1
        if n.z < -0.55: return 2
        return 3
    return base

cnt = [0]*8
for poly in ob.data.polygons:
    mi = 区域(poly.center, poly.normal)
    poly.material_index = mi
    cnt[mi] += 1
print("FP10] 分区 皮肤%d 背%d 胸%d 侧%d 短裤%d 袜%d 鞋%d 护臂%d" % tuple(cnt))

def 加球(名, 心, r, mat, sx=1, sy=1, sz=1, seg=32, ring=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, radius=r, location=心)
    o = bpy.context.active_object; o.name = 名
    o.scale = (sx, sy, sz)
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return o

# ---------- 头（随躯干压低：颈 z=0.086）----------
HZ = 0.094
头 = 加球("头", (0, -0.310, HZ+0.040), 0.066, C_皮肤, sx=0.94, sy=1.08, sz=1.04)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.330, HZ+0.014))
颌 = bpy.context.active_object; 颌.name = "下颌"
颌.scale = (0.046, 0.053, 0.032)
颌.data.materials.append(C_皮肤); bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.009, radius2=0.003, depth=0.016,
                                location=(0, -0.379, HZ+0.036), rotation=(math.radians(-105), 0, 0))
鼻 = bpy.context.active_object; 鼻.name = "鼻"; 鼻.data.materials.append(C_皮肤); bpy.ops.object.shade_smooth()
for s in (1, -1):
    加球("耳%d" % s, (0.060*s, -0.300, HZ+0.040), 0.013, C_皮肤, sx=0.5, sy=0.9, sz=1.1)
for s in (1, -1):
    加球("眼%d" % s, (0.023*s, -0.372, HZ+0.044), 0.008, C_头发, sx=0.8, sy=0.5, sz=1.0)

# ---------- 头发 ----------
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.071, location=(0, -0.307, HZ+0.052))
帽 = bpy.context.active_object; 帽.name = "发帽"
帽.scale = (0.96, 1.07, 1.00)
bm = bmesh.new(); bm.from_mesh(帽.data)
切割 = [v for v in bm.verts if v.co.z < -0.002 or (v.co.y < -0.030 and v.co.z < 0.022)]
bmesh.ops.delete(bm, geom=切割, context='VERTS')
bm.to_mesh(帽.data); bm.free()
帽.data.materials.append(C_头发); bpy.ops.object.shade_smooth()
random.seed(7)
for i in range(24):
    ang = random.uniform(0, math.pi*2); rr = random.uniform(0.015, 0.050)
    px = rr*math.cos(ang)*0.92
    py = -0.307 + rr*math.sin(ang)*1.02
    if py > -0.268 and abs(px) < 0.05:
        continue
    pz = HZ + 0.098 + random.uniform(0.0, 0.015)
    L = random.uniform(0.026, 0.044)
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.0095, radius2=0.0015, depth=L,
        location=(px, py, pz + L*0.4),
        rotation=(random.uniform(-0.6, 0.6), random.uniform(-0.6, 0.6), random.uniform(0, 3)))
    c = bpy.context.active_object; c.name = "刺%d" % i
    c.data.materials.append(C_头发)

# ---------- 眼镜 ----------
def 加框(名, 心, w, h, t, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=心)
    o = bpy.context.active_object; o.name = 名
    o.scale = (w, t, h)
    o.data.materials.append(mat)
    return o

for s in (1, -1):
    加框("镜圈%d" % s, (0.023*s, -0.3775, HZ+0.044), 0.026, 0.0032, 0.017, C_镜框)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.0014, depth=0.062,
        location=(0.054*s, -0.344, HZ+0.046), rotation=(math.radians(84), 0, math.radians(5*s)))
    腿 = bpy.context.active_object; 腿.name = "镜腿%d" % s
    腿.data.materials.append(C_镜框)
加框("鼻梁", (0, -0.3795, HZ+0.048), 0.012, 0.0026, 0.0024, C_镜框)

# ---------- 手机（归位双手之间：hndL/R 中点前下）----------
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.404, 0.072))
机 = bpy.context.active_object; 机.name = "手机"
机.scale = (0.034, 0.005, 0.068)
机.rotation_euler = (math.radians(65), 0, 0)
机.data.materials.append(C_手机)

# ---------- 领口装饰 ----------
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.040, depth=0.012,
    location=(0, -0.236, HZ-0.004), rotation=(math.radians(80), 0, 0))
领 = bpy.context.active_object; 领.name = "领青边"
领.data.materials.append(C_青边); bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.0425, depth=0.007,
    location=(0, -0.230, HZ-0.007), rotation=(math.radians(80), 0, 0))
领2 = bpy.context.active_object; 领2.name = "领粉线"
领2.data.materials.append(C_粉线); bpy.ops.object.shade_smooth()

# ---------- 地面 ----------
bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0.1, 0))
地 = bpy.context.active_object; 地.name = "地面"
地.data.materials.append(材质纯色("草", 0.25, 0.45, 0.2, 0.9))

# ---------- 落地对齐 ----------
deps = bpy.context.evaluated_depsgraph_get()
zs = []
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name != "地面":
        oe = o.evaluated_get(deps)
        for corner in oe.bound_box:
            zs.append((oe.matrix_world @ Vector(corner)).z)
dz = min(zs)
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name != "地面":
        o.location.z -= dz
print("FP10] 落地平移 dz=%.4f" % dz)

def 渲染(名, 位, 目标, res=900):
    sc = bpy.context.scene
    cam_d = bpy.data.cameras.new(名); cam_d.lens = 50
    cam = bpy.data.objects.new(名, cam_d)
    sc.collection.objects.link(cam)
    cam.location = 位
    d = (Vector(目标) - Vector(位)).normalized()
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    if not sc.objects.get("sun"):
        bpy.ops.object.light_add(type='SUN', location=(0, 0, 3))
        sun = bpy.context.active_object; sun.name = "sun"
        sun.data.energy = 3.0
        sun.rotation_euler = (math.radians(35), math.radians(15), math.radians(20))
    w = bpy.context.scene.world or bpy.data.worlds.new("w")
    bpy.context.scene.world = w; w.use_nodes = True
    bg = None
    for nd in w.node_tree.nodes:
        if nd.type == 'BACKGROUND': bg = nd
    if bg: bg.inputs[0].default_value = (0.75, 0.82, 0.9, 1)
    for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try:
            sc.render.engine = eng; break
        except Exception:
            continue
    sc.view_settings.view_transform = 'Standard'
    sc.render.resolution_x = res; sc.render.resolution_y = res
    sc.render.filepath = os.path.join(OUT, "FP-10-v8-%s.png" % 名)
    bpy.ops.render.render(write_still=True)
    print("FP10] render", 名)

C0 = (0, -0.10, 0.08)
渲染("正", (0, -1.4, 0.16), C0)
渲染("背", (0, 1.4, 0.20), C0)
渲染("左", (1.4, -0.1, 0.12), C0)
渲染("右", (-1.4, -0.1, 0.12), C0)
渲染("后上", (0.55, -1.05, 0.65), (0, -0.15, 0.06))
渲染("顶", (0, -0.10, 1.5), (0, -0.10, 0.06))

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(DIR, "吴昊阳模型v8-重做.blend"))
print("FP10] DONE")
