# -*- coding: utf-8 -*-
"""由 v8 生成 v9：
1) 腿部改纯色材质+几何装饰环（根治贴图在腿上环形错乱）：
   短裤=深蓝纯色+粉条+青下摆+红菱（小圆柱环/菱形片沿腿轴放置）
   袜=白纯色+青顶边环；鞋=白纯色
2) 眼镜前移贴出脸表面（镜圈 y 从 -0.3775 → -0.388）
3) 手臂护臂贴图保留（针织纹观感好）
"""
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
s = open(r"脚本\建模v8.py", encoding="utf-8").read()

# ---------- 1) 腿/袜/鞋材质改纯色 ----------
s = s.replace('C_短裤 = 材质贴图("短裤", "短裤绘.png")', 'C_短裤 = 材质纯色("短裤", 0.09, 0.12, 0.21, 0.55)')
s = s.replace('C_白袜 = 材质贴图("袜子", "袜绘.png", 0.7)', 'C_白袜 = 材质纯色("袜子", 0.94, 0.94, 0.95, 0.7)')
s = s.replace('C_白鞋 = 材质贴图("鞋子", "鞋绘.png", 0.5)', 'C_白鞋 = 材质纯色("鞋子", 0.96, 0.96, 0.96, 0.5)')

# ---------- 腿部装饰：在"领口装饰"段之前插入 ----------
装饰代码 = '''
# ---------- 腿部装饰（纯色腿+几何环，任意角度锐利）----------
def 腿环(名, a, b, t, 半径, 厚, mat):
    """在线段 a-b 参数 t 处放一个垂直于腿轴的扁环"""
    a = Vector(a); b = Vector(b)
    c = a.lerp(b, t)
    d = (b - a).normalized()
    ring = bpy.ops.mesh.primitive_torus_add(major_radius=半径, minor_radius=厚,
        location=c, rotation=(0, 0, 0), major_segments=28, minor_segments=8)
    o = bpy.context.active_object; o.name = 名
    qt = d.to_track_quat('Z', 'Y')
    o.rotation_euler = qt.to_euler()
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return o

for side in (1, -1):
    hip = J["hip%d" % (1 if side > 0 else 2)][0] if False else (J["hipL"] if side > 0 else J["hipR"])[0]
    kne = (J["kneL"] if side > 0 else J["kneR"])[0]
    ank = (J["ankL"] if side > 0 else J["ankR"])[0]
    # 短裤：粉横条 + 青下摆（膝上方）
    腿环("短裤粉条%d" % side, hip, kne, 0.80, 0.049, 0.006, C_粉线)
    腿环("短裤青摆%d" % side, hip, kne, 0.92, 0.047, 0.006, C_青边)
    # 短裤侧红菱（菱形片贴大腿外侧）
    c = Vector(hip).lerp(Vector(kne), 0.45)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(c.x + 0.045*side, c.y, c.z + 0.02))
    d = bpy.context.active_object; d.name = "短裤红菱%d" % side
    d.scale = (0.006, 0.014, 0.014)
    d.rotation_euler = (0, math.radians(45), math.radians(45))
    d.data.materials.append(材质纯色("红菱", 0.85, 0.2, 0.3, 0.5))
    # 袜：青顶边（踝上方）
    腿环("袜青边%d" % side, kne, ank, 0.10, 0.037, 0.005, C_青边)

'''
s = s.replace("# ---------- 领口装饰 ----------", 装饰代码 + "# ---------- 领口装饰 ----------")

# ---------- 2) 眼镜前移贴脸 ----------
s = s.replace('加框("镜圈%d" % s, (0.023*s, -0.3775, HZ+0.044), 0.026, 0.0032, 0.017, C_镜框)',
              '加框("镜圈%d" % s, (0.023*s, -0.3885, HZ+0.044), 0.026, 0.0032, 0.017, C_镜框)')
s = s.replace('加框("鼻梁", (0, -0.3795, HZ+0.048), 0.012, 0.0026, 0.0024, C_镜框)',
              '加框("鼻梁", (0, -0.3905, HZ+0.048), 0.012, 0.0026, 0.0024, C_镜框)')
s = s.replace('location=(0.054*s, -0.344, HZ+0.046), rotation=(math.radians(84), 0, math.radians(5*s))',
              'location=(0.054*s, -0.352, HZ+0.046), rotation=(math.radians(84), 0, math.radians(5*s))')

s = s.replace("FP-10-v8-", "FP-10-v9-")
s = s.replace("吴昊阳模型v8-重做.blend", "吴昊阳模型v9-重做.blend")
open(r"脚本\建模v9.py", "w", encoding="utf-8").write(s)
print("v9 written", len(s))
