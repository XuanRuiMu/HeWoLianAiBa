# FP-01 勘察脚本 v3：确认贴图状态、轴向朝向、并渲染站姿基准图（三视）供姿势设计参考
import bpy
import math
import os

OUT = os.environ.get("FP01_OUT", "")
EV = os.environ.get("FP01_EV", "")
msg = []


def log(s):
    msg.append(str(s))


scene = bpy.context.scene
ob = bpy.data.objects["lo"]
me = ob.data
mat = me.materials[0]
nt = mat.node_tree
tex_node = next((n for n in nt.nodes if n.type == 'TEX_IMAGE'), None)
img = tex_node.image if tex_node else None
log(f"TEX img={img.name if img else None} size={img.size if img else None} has_data={img.has_data if img else None} "
    f"filepath_raw={img.filepath_raw if img else None} packed={bool(img.packed_file) if img else False} "
    f"source={img.source if img else None}")

# 输出节点连接情况
out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
if out and out.inputs['Surface'].is_linked:
    log(f"SURFACE from {out.inputs['Surface'].links[0].from_node.type}")
for lk in nt.links:
    log(f"LINK {lk.from_node.name}.{lk.from_socket.name} -> {lk.to_node.name}.{lk.to_socket.name}")

# 顶点法线统计（判断正面朝 -Y 还是 +Y）：看头部区域 z>0.95 的前后深度
import mathutils
coords = [v.co for v in me.vertices]
head = [c for c in coords if c.z > 0.94]
ys_front = sum(1 for c in head if c.y < 0)
ys_back = sum(1 for c in head if c.y > 0)
log(f"HEAD verts={len(head)} y<0:{ys_front} y>0:{ys_back}")

# ---- 渲染三视基准 ----
if EV:
    os.makedirs(EV, exist_ok=True)
    # 清理已有相机/灯
    for o in list(scene.objects):
        if o.type in {'CAMERA', 'LIGHT'}:
            bpy.data.objects.remove(o, do_unlink=True)

    cam_data = bpy.data.cameras.new("Cam")
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam_data.lens = 80
    cam_data.clip_end = 100

    sun_d = bpy.data.lights.new("Sun", 'SUN')
    sun_d.energy = 4.0
    sun = bpy.data.objects.new("Sun", sun_d)
    scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), math.radians(-15), math.radians(20))

    area_d = bpy.data.lights.new("Fill", 'AREA')
    area_d.energy = 60.0
    area_d.size = 2.0
    area = bpy.data.objects.new("Fill", area_d)
    scene.collection.objects.link(area)

    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.72, 0.80, 0.90, 1.0)
        bg.inputs[1].default_value = 1.0

    try:
        scene.render.engine = 'BLENDER_WORKBENCH'
        log("engine=WORKBENCH")
    except Exception as e:
        log(f"workbench fail {e}")
        scene.render.engine = 'CYCLES'
    shading = scene.display.shading
    shading.lighting = 'STUDIO'
    shading.color_type = 'MATERIAL'
    shading.show_cavity = True

    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.film_transparent = False

    center = mathutils.Vector((0, 0, 0.57))
    views = {
        "front": mathutils.Vector((0, -2.2, 0.62)),
        "back": mathutils.Vector((0, 2.2, 0.62)),
        "side": mathutils.Vector((2.2, 0, 0.62)),
        "top": mathutils.Vector((0, 0.001, 2.4)),
    }
    for name, pos in views.items():
        cam.location = pos
        direction = center - pos
        cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = os.path.join(EV, f"FP-01-站资-{name}.png")
        bpy.ops.render.render(write_still=True)
        log(f"rendered {name}")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(msg))
