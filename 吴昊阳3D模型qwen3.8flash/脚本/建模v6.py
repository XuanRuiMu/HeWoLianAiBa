# -*- coding: utf-8 -*-
"""FP-10 重做 v6：手绘贴图材质 + 分区修复。
1) 躯干：按面法线方向采样 背绘/胸绘/侧绘（三向投影，无需UV展开，细节锐利）
2) 腿：白袜严格从膝以下（用 膝-踝 段参数 t 判定，根治 v5 白袜从臀开始）
3) 删除浮空文字块（YOUNG/3 已在背绘贴图里）
4) 眼镜缩小贴脸；手机贴手；短裤/护臂/袜/鞋用各自手绘图
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
    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = rough
    tex = nt.nodes.new("ShaderNodeTexImage")
    img = bpy.data.images.load(os.path.join(TEX, png), check_existing=False)
    tex.image = img
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
C_红菱 = 材质纯色("红菱", 0.85, 0.2, 0.3, 0.5)

J = {
    "pelvis":   ((0.000,  0.020, 0.092), 0.080, 0.062),
    "waist":    ((0.000, -0.060, 0.090), 0.064, 0.054),
    "chest":    ((0.000, -0.150, 0.096), 0.088, 0.070),
    "neck":     ((0.000, -0.235, 0.112), 0.034, 0.034),
    "headb":    ((0.000, -0.268, 0.120), 0.046, 0.046),
    "shoL":     ((0.100, -0.185, 0.112), 0.047, 0.047),
    "elbL":     ((0.150, -0.272, 0.052), 0.039, 0.039),
    "wriL":     ((0.052, -0.360, 0.078), 0.030, 0.028),
    "hndL":     ((0.040, -0.392, 0.090), 0.030, 0.022),
    "shoR":     ((-0.100, -0.185, 0.112), 0.047, 0.047),
    "elbR":     ((-0.150, -0.272, 0.052), 0.039, 0.039),
    "wriR":     ((-0.052, -0.360, 0.078), 0.030, 0.028),
    "hndR":     ((-0.040, -0.392, 0.090), 0.030, 0.022),
    "hipL":     ((0.078,  0.060, 0.082), 0.058, 0.058),
    "kneL":     ((0.115,  0.270, 0.058), 0.048, 0.048),
    "ankL":     ((0.130,  0.480, 0.046), 0.036, 0.036),
    "toeL":     ((0.138,  0.575, 0.020), 0.034, 0.020),
    "hipR":     ((-0.078,  0.060, 0.082), 0.058, 0.058),
    "kneR":     ((-0.115,  0.270, 0.058), 0.048, 0.048),
    "ankR":     ((-0.130,  0.480, 0.046), 0.036, 0.036),
    "toeR":     ((-0.138,  0.575, 0.020), 0.034, 0.020),
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

# UV：按世界坐标盒投影（供贴图采样）
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.cube_project(cube_size=0.5, correct_aspect=True)
bpy.ops.object.mode_set(mode='OBJECT')
if not ob.data.uv_layers:
    ob.data.uv_layers.new(name="UVMap")
else:
    ob.data.uv_layers[0].name = "UVMap"

for slot, mat in enumerate([C_皮肤, C_球衣, M_胸绘, M_侧绘, C_短裤, C_白袜, C_白鞋, C_护臂]):
    ob.data.materials.append(mat)
# 槽位: 0皮肤 1背绘 2胸绘 3侧绘 4短裤 5袜 6鞋 7护臂

# ---------- 最近骨骼段 → 材质映射（无重叠，根治分区抢占）----------
段表 = [
    (P["pelvis"], P["waist"], 1),   # 躯干→背绘(法线再细分)
    (P["waist"],  P["chest"], 1),
    (P["chest"],  P["neck"],  1),
    (P["neck"],   P["headb"], 0),   # 颈→皮肤
    (P["chest"],  P["shoL"],  7), (P["shoL"], P["elbL"], 7), (P["elbL"], P["wriL"], 7),
    (P["chest"],  P["shoR"],  7), (P["shoR"], P["elbR"], 7), (P["elbR"], P["wriR"], 7),
    (P["wriL"],   P["hndL"],  0), (P["wriR"], P["hndR"], 0),   # 手→皮肤
    (P["pelvis"], P["hipL"],  4), (P["pelvis"], P["hipR"], 4), # 髋→短裤
    (P["hipL"],   P["kneL"],  4), (P["hipR"],   P["kneR"], 4), # 大腿→短裤
    (P["kneL"],   P["ankL"],  5), (P["kneR"],   P["ankR"], 5), # 小腿→袜
    (P["ankL"],   P["toeL"],  6), (P["ankR"],   P["toeR"], 6), # 脚→鞋
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
        # 躯干按法线细分：朝上背绘/朝下胸绘/侧面侧绘
        if n.z > 0.5:  return 1
        if n.z < -0.5: return 2
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

HZ = 0.120
头 = 加球("头", (0, -0.310, HZ+0.045), 0.068, C_皮肤, sx=0.94, sy=1.08, sz=1.04)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.330, HZ+0.018))
颌 = bpy.context.active_object; 颌.name = "下颌"
颌.scale = (0.048, 0.055, 0.034)
颌.data.materials.append(C_皮肤); bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.010, radius2=0.004, depth=0.020,
                                location=(0, -0.382, HZ+0.040), rotation=(math.radians(-100), 0, 0))
鼻 = bpy.context.active_object; 鼻.name = "鼻"; 鼻.data.materials.append(C_皮肤); bpy.ops.object.shade_smooth()
for s in (1, -1):
    加球("耳%d" % s, (0.062*s, -0.300, HZ+0.042), 0.014, C_皮肤, sx=0.5, sy=0.9, sz=1.1)
for s in (1, -1):
    加球("眼%d" % s, (0.023*s, -0.376, HZ+0.048), 0.008, C_头发, sx=0.8, sy=0.5, sz=1.0)

# 头发
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.073, location=(0, -0.307, HZ+0.057))
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
    pz = HZ + 0.105 + random.uniform(0.0, 0.015)
    L = random.uniform(0.028, 0.046)
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.010, radius2=0.0015, depth=L,
        location=(px, py, pz + L*0.4),
        rotation=(random.uniform(-0.6, 0.6), random.uniform(-0.6, 0.6), random.uniform(0, 3)))
    c = bpy.context.active_object; c.name = "刺%d" % i
    c.data.materials.append(C_头发)

# 眼镜（贴脸小框）
def 加框(名, 心, w, h, t, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=心)
    o = bpy.context.active_object; o.name = 名
    o.scale = (w, t, h)
    o.data.materials.append(mat)
    return o

for s in (1, -1):
    加框("镜圈%d" % s, (0.023*s, -0.3805, HZ+0.048), 0.022, 0.0030, 0.014, C_镜框)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.0015, depth=0.068,
        location=(0.056*s, -0.345, HZ+0.050), rotation=(math.radians(82), 0, math.radians(5*s)))
    腿 = bpy.context.active_object; 腿.name = "镜腿%d" % s
    腿.data.materials.append(C_镜框)
加框("鼻梁", (0, -0.382, HZ+0.051), 0.011, 0.0025, 0.0022, C_镜框)

# 手机
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.420, 0.090))
机 = bpy.context.active_object; 机.name = "手机"
机.scale = (0.036, 0.006, 0.072)
机.rotation_euler = (math.radians(75), 0, 0)
机.data.materials.append(C_手机)

# 领口装饰
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.041, depth=0.014,
    location=(0, -0.238, HZ+0.002), rotation=(math.radians(78), 0, 0))
领 = bpy.context.active_object; 领.name = "领青边"
领.data.materials.append(C_青边); bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.0435, depth=0.008,
    location=(0, -0.232, HZ-0.001), rotation=(math.radians(78), 0, 0))
领2 = bpy.context.active_object; 领2.name = "领粉线"
领2.data.materials.append(C_粉线); bpy.ops.object.shade_smooth()

# 地面
bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0.1, 0))
地 = bpy.context.active_object; 地.name = "地面"
地.data.materials.append(材质纯色("草", 0.25, 0.45, 0.2, 0.9))

# 落地对齐
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
    sc.render.filepath = os.path.join(OUT, "FP-10-v6-%s.png" % 名)
    bpy.ops.render.render(write_still=True)
    print("FP10] render", 名)

C0 = (0, -0.10, 0.10)
渲染("正", (0, -1.4, 0.20), C0)
渲染("背", (0, 1.4, 0.24), C0)
渲染("左", (1.4, -0.1, 0.16), C0)
渲染("右", (-1.4, -0.1, 0.16), C0)
渲染("后上", (0.55, -1.05, 0.75), (0, -0.15, 0.08))
渲染("顶", (0, -0.10, 1.5), (0, -0.10, 0.08))

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(DIR, "吴昊阳模型v6-重做.blend"))
print("FP10] DONE")
