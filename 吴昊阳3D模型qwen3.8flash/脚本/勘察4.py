# FP-01 勘察脚本 v4：贴图/朝向诊断 + 从 GLB 提取贴图落盘（只读源文件，不保存 blend）
import bpy
import math
import mathutils
import os

DIR = os.environ.get("FP01_DIR", "")
OUT = os.path.join(DIR, "证据", "FP-01-勘察4.txt")
EV = os.path.join(DIR, "证据")
msg = []


def log(s):
    msg.append(str(s))


scene = bpy.context.scene
ob = bpy.data.objects["lo"]
me = ob.data
mat = me.materials[0]
nt = mat.node_tree
log(f"material={mat.name!r} node_count={len(nt.nodes)}")
for n in nt.nodes:
    log(f"  NODE {n.name!r} type={n.type} label={getattr(n,'label','')}")
    if n.type == 'TEX_IMAGE':
        im = n.image
        log(f"     image={im.name if im else None!r} size={tuple(im.size) if im else None} has_data={im.has_data if im else None} source={im.source if im else None} filepath_raw={im.filepath_raw if im else None!r} users={im.users if im else None}")
for lk in nt.links:
    log(f"  LINK {lk.from_node.name}.{lk.from_socket.name} -> {lk.to_node.name}.{lk.to_socket.name}")

log("--- all images in file ---")
for im in bpy.data.images:
    log(f"IMG {im.name!r} size={tuple(im.size)} has_data={im.has_data} source={im.source} filepath={im.filepath!r} packed={bool(im.packed_file)} colorspace={im.colorspace_settings.name}")

# 朝向判定：头部 z>0.95；鼻子/脸在哪个 y 侧 —— 用该区域顶点 y 分布偏度
coords = [v.co for v in me.vertices]
head = [c for c in coords if c.z > 0.93]
log(f"head verts={len(head)} y_mean={sum(c.y for c in head)/len(head):.4f}")
# 躯干最宽处 z~0.60
torso = [c for c in coords if 0.55 < c.z < 0.72]
log(f"torso y range=[{min(c.y for c in torso):.4f},{max(c.y for c in torso):.4f}] mean={sum(c.y for c in torso)/len(torso):.4f}")

# ---- 从站姿 GLB 提取贴图并写 PNG ----
bpy.ops.wm.read_factory_settings(use_empty=True)
glb = os.path.join(DIR, "吴昊阳模型v2.glb")
bpy.ops.import_scene.gltf(filepath=glb)
log("--- after glb import ---")
for o in bpy.context.scene.objects:
    log(f"OBJ {o.type} {o.name!r}")
for im in bpy.data.images:
    log(f"GLBIMG {im.name!r} size={tuple(im.size)} has_data={im.has_data} source={im.source}")
    if im.has_data and im.size[0] >= 512:
        png = os.path.join(EV, "_tex_" + im.name.replace("/", "_") + ".png")
        tmp = bpy.data.images.new("tmpcopy", im.size[0], im.size[1], alpha=True)
        tmp.colorspace_settings.name = im.colorspace_settings.name
        px = list(im.pixels[:])
        tmp.pixels = px
        tmp.filepath_raw = png
        tmp.file_format = 'PNG'
        tmp.save()
        bpy.data.images.remove(tmp)
        log(f"   saved -> {png}")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(msg))
log("ok")
