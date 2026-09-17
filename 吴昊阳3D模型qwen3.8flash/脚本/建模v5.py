# -*- coding: utf-8 -*-
"""FP-10 重做 v5：
1) 腿/臂材质改"关节距离分区"（根治 y 阈值误判：白袜从臀开始）
2) 球衣文字：背 YOUNG+3、胸 G.O.T.A+3（文字转网格，零贴图零模糊）
3) 领口青边+粉细线、后领红菱、背领红菱
4) 眼镜缩小贴脸
5) 手机贴手
"""
import os, sys, math, random
import bpy
import bmesh
from mathutils import Vector

DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get("FP10_OUT", os.path.join(DIR, "证据"))
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)

def 颜色(r, g, b, rough=0.6):
    m = bpy.data.materials.new("m_%d%d%d" % (r*255, g*255, b*255))
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (r, g, b, 1)
        bsdf.inputs["Roughness"].default_value = rough
    return m

C_皮肤 = 颜色(0.96, 0.78, 0.62)
C_头发 = 颜色(0.045, 0.045, 0.06, 0.45)
C_球衣 = 颜色(0.08, 0.11, 0.20, 0.55)
C_青边 = 颜色(0.31, 0.76, 0.85, 0.5)
C_粉线 = 颜色(0.94, 0.39, 0.57, 0.5)
C_护臂 = 颜色(0.14, 0.17, 0.30, 0.6)
C_白袜 = 颜色(0.93, 0.93, 0.92, 0.7)
C_白鞋 = 颜色(0.95, 0.95, 0.95, 0.5)
C_手机 = 颜色(0.05, 0.05, 0.06, 0.3)
C_镜框 = 颜色(0.97, 0.97, 0.97, 0.4)
C_白字 = 颜色(0.96, 0.96, 0.96, 0.5)
C_红菱 = 颜色(0.85, 0.2, 0.3, 0.5)

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

for slot, mat in enumerate([C_皮肤, C_球衣, C_护臂, C_球衣, C_白袜, C_白鞋]):
    ob.data.materials.append(mat)

# ---------- 关节距离分区 ----------
def 区域(p):
    x, y, z = p
    dL = (p - P["hipL"]).length; dR = (p - P["hipR"]).length
    dleg = min(dL, dR)
    d_toeL = (p - P["toeL"]).length; d_toeR = (p - P["toeR"]).length
    d_toe = min(d_toeL, d_toeR)
    if d_toe < 0.075:
        return 5                                  # 脚 → 鞋
    d_kL = (p - P["kneL"]).length; d_kR = (p - P["kneR"]).length
    d_knee = min(d_kL, d_kR)
    if d_knee < 0.175:
        return 4                                  # 膝以下 → 白袜
    if dleg < 0.24 and y > 0.0:
        return 3                                  # 大腿/臀 → 短裤
    d_wL = (p - P["wriL"]).length; d_wR = (p - P["wriR"]).length
    d_wrist = min(d_wL, d_wR)
    d_sL = (p - P["shoL"]).length; d_sR = (p - P["shoR"]).length
    d_sho = min(d_sL, d_sR)
    d_eL = (p - P["elbL"]).length; d_eR = (p - P["elbR"]).length
    d_elb = min(d_eL, d_eR)
    if d_wrist < 0.085:
        return 0                                  # 手 → 皮肤
    if d_sho < 0.20 and d_elb < 0.20 and y < -0.10:
        return 2                                  # 臂 → 护臂
    if y < -0.235 and z > 0.115 and abs(x) < 0.075:
        return 0                                  # 颈头 → 皮肤
    return 1                                      # 躯干 → 球衣

cnt = [0]*6
for poly in ob.data.polygons:
    mi = 区域(poly.center)
    poly.material_index = mi
    cnt[mi] += 1
print("FP10] 材质分区面数 皮肤%d 球衣%d 护臂%d 短裤%d 袜%d 鞋%d" % tuple(cnt))

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
    加球("眼%d" % s, (0.022*s, -0.376, HZ+0.048), 0.008, C_头发, sx=0.8, sy=0.5, sz=1.0)

# ---------- 头发 ----------
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

# ---------- 眼镜（缩小贴脸）----------
def 加框(名, 心, w, h, t, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=心)
    o = bpy.context.active_object; o.name = 名
    o.scale = (w, t, h)
    o.data.materials.append(mat)
    return o

for s in (1, -1):
    加框("镜圈%d" % s, (0.023*s, -0.3795, HZ+0.048), 0.024, 0.0035, 0.015, C_镜框)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.0016, depth=0.070,
        location=(0.055*s, -0.345, HZ+0.050), rotation=(math.radians(80), 0, math.radians(6*s)))
    腿 = bpy.context.active_object; 腿.name = "镜腿%d" % s
    腿.data.materials.append(C_镜框)
加框("鼻梁", (0, -0.3815, HZ+0.052), 0.012, 0.003, 0.0025, C_镜框)

# ---------- 手机（贴手）----------
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.420, 0.090))
机 = bpy.context.active_object; 机.name = "手机"
机.scale = (0.036, 0.006, 0.072)
机.rotation_euler = (math.radians(75), 0, 0)
机.data.materials.append(C_手机)

# ---------- 领口装饰（青边+粉线）+ 红菱 ----------
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.041, depth=0.014,
    location=(0, -0.238, HZ+0.002), rotation=(math.radians(78), 0, 0))
领 = bpy.context.active_object; 领.name = "领青边"
领.data.materials.append(C_青边); bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.0435, depth=0.008,
    location=(0, -0.232, HZ-0.001), rotation=(math.radians(78), 0, 0))
领2 = bpy.context.active_object; 领2.name = "领粉线"
领2.data.materials.append(C_粉线); bpy.ops.object.shade_smooth()
for (位, 名) in [((0, -0.208, HZ+0.068), "后领菱"), ((0, 0.020, 0.168), "背领菱")]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=位)
    d = bpy.context.active_object; d.name = 名
    d.scale = (0.008, 0.008, 0.008)
    d.rotation_euler = (math.radians(45), math.radians(45), 0)
    d.data.materials.append(C_红菱)

# ---------- 球衣文字（转网格，零模糊）----------
def 文字(内容, 心, 字号, 旋, 材质):
    cu = bpy.data.curves.new("t_" + 内容, 'FONT')
    cu.body = 内容
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    cu.size = 字号
    cu.extrude = 0.0015
    o = bpy.data.objects.new("文_" + 内容, cu)
    bpy.context.collection.objects.link(o)
    o.location = 心
    o.rotation_euler = 旋
    bpy.context.view_layer.objects.active = o
    for x in bpy.context.selected_objects: x.select_set(False)
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.active_object
    o.data.materials.clear()
    o.data.materials.append(材质)
    return o

R = math.radians
# 背面：YOUNG + 3（字面朝上，字顶朝头=-Y）
文字("YOUNG", (0, -0.062, 0.170), 0.045, (R(100), 0, R(180)), C_白字)
文字("3", (0, -0.135, 0.176), 0.075, (R(100), 0, R(180)), C_白字)
# 胸前：G.O.T.A + 3（字面朝前下=-Y，字顶朝上=+Z）
文字("G.O.T.A", (0, -0.222, 0.120), 0.028, (R(-100), 0, 0), C_白字)
文字("3", (0, -0.226, 0.088), 0.045, (R(-100), 0, 0), C_白字)

# ---------- 地面 ----------
bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0.1, 0))
地 = bpy.context.active_object; 地.name = "地面"
地.data.materials.append(颜色(0.25, 0.45, 0.2, 0.9))

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

# ---------- 渲染矩阵 ----------
def 设引擎(sc):
    for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try:
            sc.render.engine = eng
            return eng
        except Exception:
            continue
    sc.render.engine = 'BLENDER_WORKBENCH'
    return sc.render.engine

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
    设引擎(sc)
    sc.view_settings.view_transform = 'Standard'
    sc.render.resolution_x = res; sc.render.resolution_y = res
    sc.render.filepath = os.path.join(OUT, "FP-10-v5-%s.png" % 名)
    bpy.ops.render.render(write_still=True)
    print("FP10] render", 名)

C0 = (0, -0.10, 0.10)
渲染("正", (0, -1.4, 0.20), C0)
渲染("背", (0, 1.4, 0.24), C0)
渲染("左", (1.4, -0.1, 0.16), C0)
渲染("右", (-1.4, -0.1, 0.16), C0)
渲染("后上", (0.55, -1.05, 0.75), (0, -0.15, 0.08))
渲染("顶", (0, -0.10, 1.5), (0, -0.10, 0.08))

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(DIR, "吴昊阳模型v5e-重做.blend"))
print("FP10] DONE")
