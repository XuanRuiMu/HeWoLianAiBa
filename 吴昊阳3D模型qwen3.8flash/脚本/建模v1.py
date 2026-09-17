# -*- coding: utf-8 -*-
"""FP-10 重做 v1：Blender 从零程序化建模标准人形（趴撑肘持机姿势）。
- 身体=关节边骨架 + skin 修改器 + subdivision → 连续完整网格（根治碎片）
- 材质=纯 Principled 颜色，零贴图（根治像素模糊）
- 姿势=直接按趴姿构建（头-Y 脚+Y 面朝-Z 肘撑地 双手胸前持机）
用法: blender -b -P 建模v1.py ；环境变量 FP10_OUT=输出前缀目录
"""
import os, sys, math
import bpy
import bmesh
from mathutils import Vector, Matrix

DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get("FP10_OUT", os.path.join(DIR, "证据"))
os.makedirs(OUT, exist_ok=True)

# ---------- 清场 ----------
bpy.ops.wm.read_factory_settings(use_empty=True)

def 颜色(r, g, b, rough=0.6):
    m = bpy.data.materials.new("m_%d%d%d" % (r*255, g*255, b*255))
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        for key in ("Base Color",):
            if key in bsdf.inputs:
                bsdf.inputs[key].default_value = (r, g, b, 1)
        for key in ("Roughness",):
            if key in bsdf.inputs:
                bsdf.inputs[key].default_value = rough
    return m

C_皮肤 = 颜色(0.96, 0.78, 0.62)
C_头发 = 颜色(0.09, 0.09, 0.13, 0.45)
C_球衣 = 颜色(0.10, 0.13, 0.22, 0.55)
C_青边 = 颜色(0.31, 0.76, 0.85, 0.5)
C_粉线 = 颜色(0.94, 0.39, 0.57, 0.5)
C_护臂 = 颜色(0.16, 0.19, 0.32, 0.6)
C_短裤 = 颜色(0.10, 0.13, 0.22, 0.55)
C_白袜 = 颜色(0.93, 0.93, 0.92, 0.7)
C_白鞋 = 颜色(0.95, 0.95, 0.95, 0.5)
C_手机 = 颜色(0.05, 0.05, 0.06, 0.3)
C_镜框 = 颜色(0.97, 0.97, 0.97, 0.4)
C_镜片 = 颜色(0.8, 0.9, 0.95, 0.1)
C_白字 = 颜色(0.96, 0.96, 0.96, 0.5)
C_红菱 = 颜色(0.85, 0.2, 0.3, 0.5)

# ---------- 身体：关节骨架 ----------
# 趴姿：胸朝下(-Z)，背朝上(+Z)，头朝 -Y（近相机端），脚朝 +Y
J = {  # name: (pos, 半径x, 半径y)
    "pelvis":   ((0.000,  0.020, 0.130), 0.075, 0.060),
    "waist":    ((0.000, -0.060, 0.128), 0.062, 0.052),
    "chest":    ((0.000, -0.150, 0.135), 0.085, 0.068),
    "neck":     ((0.000, -0.235, 0.150), 0.033, 0.033),
    "headb":    ((0.000, -0.270, 0.158), 0.045, 0.045),
    "shoL":     ((0.100, -0.200, 0.150), 0.046, 0.046),
    "elbL":     ((0.150, -0.270, 0.085), 0.038, 0.038),
    "wriL":     ((0.075, -0.345, 0.110), 0.030, 0.028),
    "hndL":     ((0.052, -0.372, 0.128), 0.030, 0.022),
    "shoR":     ((-0.100, -0.200, 0.150), 0.046, 0.046),
    "elbR":     ((-0.150, -0.270, 0.085), 0.038, 0.038),
    "wriR":     ((-0.075, -0.345, 0.110), 0.030, 0.028),
    "hndR":     ((-0.052, -0.372, 0.128), 0.030, 0.022),
    "hipL":     ((0.075,  0.060, 0.115), 0.056, 0.056),
    "kneL":     ((0.095,  0.260, 0.085), 0.046, 0.046),
    "ankL":     ((0.105,  0.460, 0.062), 0.034, 0.034),
    "toeL":     ((0.110,  0.545, 0.030), 0.032, 0.020),
    "hipR":     ((-0.075,  0.060, 0.115), 0.056, 0.056),
    "kneR":     ((-0.095,  0.260, 0.085), 0.046, 0.046),
    "ankR":     ((-0.105,  0.460, 0.062), 0.034, 0.034),
    "toeR":     ((-0.110,  0.545, 0.030), 0.032, 0.020),
}
E = [("pelvis","waist"),("waist","chest"),("chest","neck"),("neck","headb"),
     ("chest","shoL"),("shoL","elbL"),("elbL","wriL"),("wriL","hndL"),
     ("chest","shoR"),("shoR","elbR"),("elbR","wriR"),("wriR","hndR"),
     ("pelvis","hipL"),("hipL","kneL"),("kneL","ankL"),("ankL","toeL"),
     ("pelvis","hipR"),("hipR","kneR"),("kneR","ankR"),("ankR","toeR")]

names = list(J.keys())
idx = {n: i for i, n in enumerate(names)}
me = bpy.data.meshes.new("body")
me.from_pydata([J[n][0] for n in names], [(idx[a], idx[b]) for a, b in E], [])
ob = bpy.data.objects.new("身体", me)
bpy.context.collection.objects.link(ob)

skin = ob.modifiers.new("skin", 'SKIN')
sub = ob.modifiers.new("sub", 'SUBSURF'); sub.levels = 2; sub.render_levels = 2
sv = me.skin_vertices[0].data
for i, n in enumerate(names):
    sv[i].radius = (J[n][1], J[n][2])
sv[idx["pelvis"]].use_root = True

# 材质槽：0皮肤 1球衣 2护臂 3短裤 4白袜 5白鞋
for slot, mat in enumerate([C_皮肤, C_球衣, C_护臂, C_短裤, C_白袜, C_白鞋]):
    ob.data.materials.append(mat)

# 按区域给面赋材质：用顶点组引导太繁，改面中心 z/y/x 规则
def 区域(p):
    x, y, z = p
    ay, ax = abs(y), abs(x)
    if y > 0.40:   # 脚背以下 → 鞋（趾段）
        return 5
    if y > 0.24:   # 小腿 → 袜
        return 4
    if 0.0 < y <= 0.24 or (y <= 0.0 and y > -0.02 and z < 0.10):  # 大腿/臀 → 短裤
        return 3
    if y > -0.02:
        return 3
    # 躯干区
    if ax > 0.085 and y < -0.10:  # 肩以下手臂
        pass
    # 手臂：|x|>0.10 且 y<-0.10 且 z<0.17 → 护臂；上臂段也护臂（全臂）
    if (ax > 0.09 and y < -0.12):
        return 2
    if y < -0.20 and z > 0.13 and ax < 0.06:  # 胸背 → 球衣
        return 1
    if y <= -0.02:
        return 1
    return 1

for poly in me.polygons:
    poly.material_index = 区域(poly.center)

# ---------- 头 ----------
def 加球(名, 心, r, mat, sx=1, sy=1, sz=1, seg=32, ring=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, radius=r, location=心)
    o = bpy.context.active_object; o.name = 名
    o.scale = (sx, sy, sz)
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return o

头 = 加球("头", (0, -0.315, 0.165), 0.062, C_皮肤, sx=0.92, sy=1.06, sz=1.02)
# 下颌：略方
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.335, 0.135))
颌 = bpy.context.active_object; 颌.name = "下颌"
颌.scale = (0.045, 0.052, 0.032)
颌.data.materials.append(C_皮肤); bpy.ops.object.shade_smooth()
# 鼻
bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.010, radius2=0.004, depth=0.020,
                                location=(0, -0.377, 0.160), rotation=(math.radians(-100), 0, 0))
鼻 = bpy.context.active_object; 鼻.name = "鼻"; 鼻.data.materials.append(C_皮肤); bpy.ops.object.shade_smooth()
# 耳
for s in (1, -1):
    e = 加球("耳%d" % s, (0.058*s, -0.305, 0.160), 0.014, C_皮肤, sx=0.5, sy=0.9, sz=1.1)
# 眼（简化：深色小椭球嵌在镜片后）
for s in (1, -1):
    加球("眼%d" % s, (0.021*s, -0.372, 0.168), 0.008, C_头发, sx=0.8, sy=0.5, sz=1.0)

# ---------- 头发：帽壳 + 刺 ----------
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.066, location=(0, -0.312, 0.175))
帽 = bpy.context.active_object; 帽.name = "发帽"
帽.scale = (0.94, 1.05, 0.98)
# 切掉下半（保留 z>0 半球偏后）
bm = bmesh.new(); bm.from_mesh(帽.data)
for v in [v for v in bm.verts if v.co.z < -0.006 or (v.co.y > 0.02 and v.co.z < 0.015)]:
    pass
切割 = [v for v in bm.verts if v.co.z < -0.008]
bmesh.ops.delete(bm, geom=切割, context='VERTS')
bm.to_mesh(帽.data); bm.free()
帽.data.materials.append(C_头发); bpy.ops.object.shade_smooth()
# 前额刘海刺 + 顶部刺
import random
random.seed(7)
for i in range(26):
    ang = random.uniform(0, math.pi*2); rr = random.uniform(0.02, 0.055)
    px = rr*math.cos(ang)*0.9
    py = -0.312 + rr*math.sin(ang)*1.0
    if py > -0.285 and abs(px) < 0.05:  # 不遮脸
        continue
    pz = 0.215 + random.uniform(0.0, 0.02)
    L = random.uniform(0.028, 0.048)
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.010, radius2=0.0015, depth=L,
        location=(px, py, pz + L*0.35),
        rotation=(random.uniform(-0.7, 0.7), random.uniform(-0.7, 0.7), random.uniform(0, 3)))
    c = bpy.context.active_object; c.name = "刺%d" % i
    c.data.materials.append(C_头发)

# ---------- 白框眼镜 ----------
def 加框(名, 心, w, h, t, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=心)
    o = bpy.context.active_object; o.name = 名
    o.scale = (w, t, h)
    o.data.materials.append(mat)
    return o

for s in (1, -1):
    加框("镜圈%d" % s, (0.021*s, -0.376, 0.168), 0.030, 0.020, 0.004, C_镜框)
    g = 加球("镜片%d" % s, (0.021*s, -0.3775, 0.168), 0.012, C_镜片, sx=1.2, sy=0.25, sz=0.8)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.0018, depth=0.075,
        location=(0.050*s, -0.340, 0.170), rotation=(math.radians(80), 0, math.radians(8*s)))
    腿 = bpy.context.active_object; 腿.name = "镜腿%d" % s
    腿.data.materials.append(C_镜框)
加框("鼻梁", (0, -0.378, 0.172), 0.014, 0.004, 0.003, C_镜框)

# ---------- 手机 ----------
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.395, 0.150))
机 = bpy.context.active_object; 机.name = "手机"
机.scale = (0.037, 0.006, 0.075)
机.rotation_euler = (math.radians(18), 0, 0)
机.data.materials.append(C_手机)
b = 加球("屏幕", (0, -0.4015, 0.1505), 0.030, 颜色(0.25, 0.35, 0.5, 0.2), sx=1.18, sy=0.15, sz=2.3)

# ---------- 地面（仅渲染参考，导出时删） ----------
bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0.1, 0))
地 = bpy.context.active_object; 地.name = "地面"
地.data.materials.append(颜色(0.25, 0.45, 0.2, 0.9))

# ---------- 落地对齐：min z = 0 ----------
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

# ---------- 渲染矩阵 ----------
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
        bpy.context.active_object.name = "sun"
        bpy.context.active_object.data.energy = 3.0
        bpy.context.active_object.rotation_euler = (math.radians(35), math.radians(15), math.radians(20))
    w = bpy.context.scene.world or bpy.data.worlds.new("w")
    bpy.context.scene.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.85, 0.9, 0.95, 1)
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'
    sc.render.resolution_x = res; sc.render.resolution_y = res
    sc.render.filepath = os.path.join(OUT, "FP-10-v1-%s.png" % 名)
    bpy.ops.render.render(write_still=True)
    print("FP10] render", 名)

C0 = (0, -0.10, 0.14)
渲染("正", (0, -1.4, 0.25), C0)
渲染("背", (0, 1.4, 0.30), C0)
渲染("左", (1.4, -0.1, 0.22), C0)
渲染("右", (-1.4, -0.1, 0.22), C0)
渲染("引擎", (2.51, 2.40, 1.18), (3.24-2.5, 2.77-2.0, 0.2))  # 相对角色锚点
渲染("后上", (0.55, -1.05, 0.85), (0, -0.15, 0.12))

# ---------- 另存 ----------
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(DIR, "吴昊阳模型v5-重做.blend"))
print("FP10] DONE")
