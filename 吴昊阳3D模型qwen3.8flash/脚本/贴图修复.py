# -*- coding: utf-8 -*-
"""FP-01 贴图修复：把提取出的烘焙贴图重新挂进材质节点链，导出带贴图 glb。
先 dump 节点树与图像状态，再修复，再导出，再存 1024 缩略图供读图核对。"""
import os
import sys

import bpy

DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EV = os.path.join(DIR, "证据")
TEX = os.path.join(EV, "_tex_baked_color_v2.png")
LOG = []


def log(s):
    LOG.append(str(s))
    print("[FIX] " + str(s), flush=True)


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.open_mainfile(filepath=os.path.join(DIR, "吴昊阳模型v3-趴姿.blend"))

log("--- images ---")
for img in bpy.data.images:
    log(f"img {img.name!r} size={tuple(img.size)} filepath={img.filepath!r} packed={img.packed_file is not None}")

log("--- materials/nodes ---")
for mat in bpy.data.materials:
    log(f"MAT {mat.name!r} use_nodes={mat.use_nodes}")
    if not mat.use_nodes:
        continue
    nt = mat.node_tree
    for n in nt.nodes:
        info = f"  node {n.type:20s} name={n.name!r}"
        if n.type == "TEX_IMAGE" and n.image:
            info += f" image={n.image.name!r} size={tuple(n.image.size)}"
        nt_out = [f"{lk.to_node.name}.{lk.to_socket.name}" for sock in n.outputs for lk in sock.links]
        info += f" -> {nt_out}"
        log(info)
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf:
        for sname in ("Base Color", "Roughness", "Metallic", "Normal"):
            s = bsdf.inputs.get(sname)
            if s and s.links:
                log(f"  BSDF.{sname} <- {s.links[0].from_node.name}.{s.links[0].from_socket.name}")
            elif s:
                try:
                    log(f"  BSDF.{sname} = {tuple(s.default_value)}")
                except Exception:
                    log(f"  BSDF.{sname} = {s.default_value!r}")

# ---- 修复：把提取的烘焙贴图载入并挂到 Base Color ----
name = "baked_color_v2"
img = bpy.data.images.get(name)
if img is None:
    img = bpy.data.images.load(TEX, check_existing=False)
    img.name = name
else:
    img.filepath = TEX
    img.source = "FILE"
try:
    img.packed_file = None
except Exception:
    pass
img.reload()
log(f"loaded {img.name!r} size={tuple(img.size)}")
if max(img.size) < 2:
    log("ERROR: image still empty after load")
    sys.exit(2)
# 降采样到 2048 控体积
if max(img.size) > 2048:
    img.scale(2048, 2048)
    log(f"scaled -> {tuple(img.size)}")

for mat in bpy.data.materials:
    if mat.name == "手机材质":
        continue
    if not mat.use_nodes:
        continue
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED" or (n.type == "BSDF_PRINCIPLED")), None)
    bsdf = next((n for n in nt.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled"), None)
    tex = next((n for n in nt.nodes if n.type == "TEX_IMAGE"), None)
    if tex is None:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.name = "BakedColor"
        tex.location = (-600, 0)
    tex.image = img
    if bsdf:
        bc = bsdf.inputs.get("Base Color")
        if bc is not None and not bc.links:
            nt.links.new(tex.outputs["Color"], bc)
            log(f"{mat.name}: linked BakedColor -> Base Color")
        elif bc is not None and bc.links:
            log(f"{mat.name}: Base Color already linked from {bc.links[0].from_node.name}")

# 存 1024 缩略图供读图核对
thumb = os.path.join(EV, "FP-01-贴图核对.png")
img.scale(1024, 1024)
img.filepath_raw = thumb
img.file_format = "PNG"
img.save()
log("thumb saved " + thumb)

# 导出：减面到 ~10 万顶点 + 不压 Draco（引擎只有 r128 GLTFLoader，无 DRACOLoader，
# 无压缩是最稳路径；10万顶点 raw 约 3MB + 2048 贴图 ≈ 6MB，仍 <20MB 门禁）
body = bpy.data.objects.get("lo")
if body is not None:
    dec = body.modifiers.new("减面", 'DECIMATE')
    dec.ratio = 100000.0 / max(1, len(body.data.vertices))
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier="减面")
    log(f"decimated -> {len(body.data.vertices)} verts")
for o in bpy.data.objects:
    o.select_set(o.type == "MESH" and o.name in ("lo", "手机"))
glb_out = os.path.join(DIR, "吴昊阳趴姿.glb")
bpy.ops.export_scene.gltf(
    filepath=glb_out, export_format="GLB", use_selection=True,
    export_apply=True, export_yup=True,
    export_draco_mesh_compression_enable=False,
    export_image_format="AUTO",
)
sz = os.path.getsize(glb_out) / 1e6
log(f"glb {glb_out} = {sz:.1f}MB")

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(DIR, "吴昊阳模型v3-趴姿.blend"))
log("blend saved")
with open(os.path.join(EV, "FP-01-贴图修复.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(LOG))
log("DONE")
