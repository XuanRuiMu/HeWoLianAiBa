# -*- coding: utf-8 -*-
"""FP-02 主处理（Blender 5.3 后台模式）：
blender -b 工具/fp02工作.blend --python 工具/fp02处理.py

流程：还原缺失贴图(baked_color_v2) → 超2048²则缩放 → 打包 →
Decimate(COLLAPSE) 减面至 15~30 万面（目标 25 万）→ 应用 →
导出 GLB（Draco 压缩）→ 脚本内自检（面数/Draco/贴图/体积）。
所有输出经 Tee 同时写入 工具/fp02导出日志.txt。
"""
import bpy
import json
import os
import struct
import sys
import traceback

TASK_DIR = r"D:\xuanr\Desktop\燃烧之陨我的世界服务端\和我恋爱吧\吴昊阳3D模型glm5.3flash"
TOOL_DIR = os.path.join(TASK_DIR, "工具")
OUT_DIR = os.path.join(TASK_DIR, "成品")
TEXTURE_PNG = os.path.join(TOOL_DIR, "提取贴图", "baked_color_v2.png")
OUT_GLB = os.path.join(OUT_DIR, "吴昊阳趴姿优化.glb")
LOG_PATH = os.path.join(TOOL_DIR, "fp02导出日志.txt")

TARGET_MIN = 150_000
TARGET_MAX = 300_000
TARGET_IDEAL = 250_000
MAX_TEX = 2048
SIZE_LIMIT = 20 * 1024 * 1024
PNG_SIG = b"\x89PNG\r\n\x1a\n"


class Tee(object):
    """把 print 内容同时写入日志文件与 Blender stdout。"""

    def __init__(self, path):
        self.file = open(path, "w", encoding="utf-8", newline="\n")

    def write(self, s):
        try:
            sys.__stdout__.write(s)
            sys.__stdout__.flush()
        except Exception:
            pass
        self.file.write(s)
        self.file.flush()

    def flush(self):
        try:
            self.file.flush()
        except Exception:
            pass


def log(msg=""):
    print(msg)


def log_json(obj):
    log(json.dumps(obj, ensure_ascii=False))


def get_mesh_obj():
    if "lo" in bpy.data.objects and bpy.data.objects["lo"].type == "MESH":
        return bpy.data.objects["lo"]
    for o in bpy.data.objects:
        if o.type == "MESH":
            return o
    return None


def used_images():
    """收集材质节点树中实际引用的图像（去重），返回 [(图像名, [节点...], 图像)]。
    精确修改：只动材质用到的图像，不碰未使用的数据块。"""
    order = []
    groups = {}
    for mat in bpy.data.materials:
        if not mat.use_nodes or mat.node_tree is None:
            continue
        for node in mat.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image is not None:
                key = node.image.name
                if key not in groups:
                    groups[key] = ([], node.image)
                    order.append(key)
                groups[key][0].append(node)
    return [(name, groups[name][0], groups[name][1]) for name in order]


def fix_textures():
    log("---- 步骤A: 贴图还原 ----")
    used = used_images()
    if not used:
        raise RuntimeError("材质中未找到任何 TEX_IMAGE 节点，无法还原贴图")
    fixed = []
    for _, nodes, img in used:
        info = {
            "图像": img.name, "引用节点数": len(nodes),
            "原路径": img.filepath, "原尺寸": list(img.size),
            "已加载": bool(img.has_data), "已打包": img.packed_file is not None,
        }
        log_json({"处理前": info})
        if not img.has_data or img.size[0] == 0:
            if not os.path.isfile(TEXTURE_PNG):
                raise RuntimeError("贴图 %s 缺失且提取贴图不存在: %s" % (img.name, TEXTURE_PNG))
            # 诊断结论：缺失数据块 img.reload() 在 5.3 Alpha 无效，全新加载可行
            new_img = bpy.data.images.load(TEXTURE_PNG)
            old_name = img.name
            try:
                img.name = old_name + "_missing"
                new_img.name = old_name
            except Exception as e:
                log("重命名跳过: %s" % e)
            for nd in nodes:
                nd.image = new_img
            img = new_img
            forced = tuple(img.size)  # 访问 size 强制加载缓冲（has_data 为惰性求值，直接查会误判 False）
            if not img.has_data or forced[0] == 0:
                raise RuntimeError("全新加载后仍无像素数据: %s" % TEXTURE_PNG)
            fixed.append("用源glb提取贴图全新加载并重绑 %s -> %dx%d"
                         % (img.name, img.size[0], img.size[1]))
            log(fixed[-1])
            if old_name + "_missing" in bpy.data.images:
                stale = bpy.data.images[old_name + "_missing"]
                if stale.users == 0:
                    bpy.data.images.remove(stale)
                    fixed.append("清理孤立缺失数据块 %s_missing" % old_name)
                    log(fixed[-1])
        w, h = img.size
        if w > MAX_TEX or h > MAX_TEX:
            factor = MAX_TEX / float(max(w, h))
            nw, nh = max(1, int(round(w * factor))), max(1, int(round(h * factor)))
            img.scale(nw, nh)
            fixed.append("缩放 %s %dx%d -> %dx%d" % (img.name, w, h, nw, nh))
            log(fixed[-1])
        if img.packed_file is None:
            img.pack()
            fixed.append("已打包 %s（随导出内嵌）" % img.name)
            log(fixed[-1])
        log_json({"处理后": {"图像": img.name, "尺寸": list(img.size),
                             "已打包": img.packed_file is not None}})
    return fixed


def check_material_binding():
    log("---- 步骤B: 材质绑定核验 ----")
    result = []
    for mat in bpy.data.materials:
        entry = {"材质": mat.name, "有节点树": bool(mat.use_nodes)}
        if mat.use_nodes and mat.node_tree:
            for node in mat.node_tree.nodes:
                if node.type == "BSDF_PRINCIPLED":
                    inp = node.inputs.get("Base Color")
                    linked = inp is not None and inp.is_linked
                    src = inp.links[0].from_node if linked else None
                    entry["BaseColor连接"] = (
                        "%s->%s(%s)" % (src.type, src.image.name,
                                        "%dx%d" % tuple(src.image.size))
                        if src is not None and src.type == "TEX_IMAGE"
                        and getattr(src, "image", None) is not None
                        else (str(src.type) if src is not None else "无连接"))
                if node.type == "TEX_IMAGE":
                    entry.setdefault("图像节点", []).append(node.image.name if node.image else None)
        result.append(entry)
    log_json(result)
    ok = any(e.get("BaseColor连接") for e in result)
    if not ok:
        raise RuntimeError("未检测到 Principled BSDF Base Color 贴图连接")
    return result


def evaluated_faces(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    n = len(me.polygons) if me is not None else 0
    ev.to_mesh_clear()
    return n


def decimate(obj):
    log("---- 步骤C: Decimate 减面 ----")
    base_faces = len(obj.data.polygons)
    base_verts = len(obj.data.vertices)
    uv_names = [uv.name for uv in obj.data.uv_layers]
    log("减面前: 顶点=%d 面=%d UV层=%s 材质槽=%d"
        % (base_verts, base_faces, uv_names, len(obj.material_slots)))
    mod = obj.modifiers.new(name="FP02减面", type="DECIMATE")
    mod.decimate_type = "COLLAPSE"
    ratio = TARGET_IDEAL / float(base_faces)
    best = None
    for it in range(7):
        mod.ratio = ratio
        cnt = evaluated_faces(obj)
        log("迭代%d: ratio=%.5f -> 评估面数=%d" % (it, ratio, cnt))
        if best is None or abs(cnt - TARGET_IDEAL) < abs(best[1] - TARGET_IDEAL):
            best = (ratio, cnt)
        if TARGET_MIN <= cnt <= TARGET_MAX and abs(cnt - TARGET_IDEAL) <= TARGET_IDEAL * 0.08:
            break
        ratio = min(max(ratio * TARGET_IDEAL / max(cnt, 1), 1e-4), 1.0)
    mod.ratio = best[0]
    log("采用 ratio=%.5f（预估面数=%d）" % best)
    if not (TARGET_MIN <= best[1] <= TARGET_MAX):
        raise RuntimeError("减面评估面数 %d 超出目标区间 [%d, %d]"
                           % (best[1], TARGET_MIN, TARGET_MAX))
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.modifier_apply(modifier=mod.name)
    except Exception:
        log("modifier_apply 常规调用失败，改用上下文覆盖重试")
        bpy.ops.object.modifier_apply(
            {"object": obj, "active_object": obj, "selected_objects": [obj]},
            modifier=mod.name)
    final_faces = len(obj.data.polygons)
    final_verts = len(obj.data.vertices)
    uv_after = [uv.name for uv in obj.data.uv_layers]
    log("减面后: 顶点=%d 面=%d UV层=%s 材质槽=%d"
        % (final_verts, final_faces, uv_after, len(obj.material_slots)))
    if not (TARGET_MIN <= final_faces <= TARGET_MAX):
        raise RuntimeError("应用后面数 %d 超出目标区间 [%d, %d]"
                           % (final_faces, TARGET_MIN, TARGET_MAX))
    if not uv_after:
        raise RuntimeError("减面后 UV 层丢失")
    return {"减面前面数": base_faces, "减面后实际面数": final_faces,
            "减面前顶点": base_verts, "减面后顶点": final_verts,
            "ratio": best[0], "UV层前": uv_names, "UV层后": uv_after}


def read_glb(path):
    with open(path, "rb") as f:
        data = f.read()
    if data[:4] != b"glTF":
        raise ValueError("输出不是合法 glb")
    off = 12
    js, binchunk = None, b""
    while off + 8 <= len(data):
        clen, ctype = struct.unpack("<II", data[off:off + 8])
        off += 8
        chunk = data[off:off + clen]
        off += clen
        if ctype == 0x4E4F534A:
            js = json.loads(chunk.decode("utf-8"))
        elif ctype == 0x004E4942:
            binchunk = chunk
    return js, binchunk


def png_dims(raw):
    if len(raw) >= 24 and raw[:8] == PNG_SIG and raw[12:16] == b"IHDR":
        w, h = struct.unpack(">II", raw[16:24])
        return [w, h]
    return None


def analyze_glb(path):
    js, binchunk = read_glb(path)
    bvs = js.get("bufferViews", [])
    accs = js.get("accessors", [])
    faces = 0
    per_mesh = []
    for m in js.get("meshes", []):
        mf = 0
        for p in m.get("primitives", []):
            if p.get("mode", 4) != 4:
                continue
            if "indices" in p:
                mf += accs[p["indices"]]["count"] // 3
            elif "POSITION" in p.get("attributes", {}):
                mf += accs[p["attributes"]["POSITION"]]["count"] // 3
        per_mesh.append({"名称": m.get("name", ""), "面数": mf})
        faces += mf
    images = []
    for i, im in enumerate(js.get("images", [])):
        e = {"index": i, "name": im.get("name", ""), "mimeType": im.get("mimeType", ""),
             "bufferView": im.get("bufferView")}
        if im.get("bufferView") is not None:
            bv = bvs[im["bufferView"]]
            raw = binchunk[bv.get("byteOffset", 0):bv.get("byteOffset", 0) + bv["byteLength"]]
            e["bytes"] = bv["byteLength"]
            e["尺寸"] = png_dims(raw)
        elif "uri" in im:
            e["uri"] = im["uri"]
        images.append(e)
    mats = []
    for m in js.get("materials", []):
        pbr = m.get("pbrMetallicRoughness", {})
        bct = pbr.get("baseColorTexture")
        e = {"name": m.get("name", ""), "baseColorTexture": bct}
        if bct is not None:
            src = js.get("textures", [])[bct["index"]]["source"]
            e["baseColor图像"] = js["images"][src].get("name", "")
        mats.append(e)
    return {
        "generator": js.get("asset", {}).get("generator", ""),
        "extensionsUsed": js.get("extensionsUsed", []),
        "meshes": per_mesh, "实际面数": faces,
        "images": images, "materials": mats,
        "draco图元数": sum(
            1 for m in js.get("meshes", []) for p in m.get("primitives", [])
            if "KHR_draco_mesh_compression" in p.get("extensions", {})),
    }


def export_glb():
    log("---- 步骤D: 导出 GLB (Draco) ----")
    os.makedirs(OUT_DIR, exist_ok=True)
    op = bpy.ops.export_scene.gltf
    keys = set(op.get_rna_type().properties.keys())
    want = {
        "filepath": OUT_GLB,
        "export_format": "GLB",
        "export_draco_mesh_compression_enable": True,
        "export_draco_mesh_compression_level": 6,
        "export_draco_position_quantization": 14,
        "export_draco_normal_quantization": 10,
        "export_draco_texcoord_quantization": 12,
        "export_image_format": "AUTO",
        "export_materials": "EXPORT",
        "export_texcoords": True,
        "export_normals": True,
        "export_yup": True,
        "export_apply": False,
        "use_selection": False,
    }
    dropped = sorted(k for k in want if k not in keys)
    kw = {k: v for k, v in want.items() if k in keys}
    log_json({"导出丢弃参数": dropped, "导出使用参数": {k: str(v) for k, v in kw.items()}})
    res = op(**kw)
    log("export_scene.gltf 返回: %s" % str(res))
    if not os.path.isfile(OUT_GLB):
        raise RuntimeError("导出后文件不存在: %s" % OUT_GLB)

    info = analyze_glb(OUT_GLB)
    size = os.path.getsize(OUT_GLB)
    info["体积字节"] = size
    log("==== 导出自检 ====")
    log_json(info)
    draco_ok = ("KHR_draco_mesh_compression" in info["extensionsUsed"]
                and info["draco图元数"] > 0)
    if not draco_ok:
        cands = sorted(k for k in keys if "draco" in k.lower())
        raise RuntimeError("导出结果缺少 Draco 压缩。可用 draco 参数: %s" % cands)
    if not (TARGET_MIN <= info["实际面数"] <= TARGET_MAX):
        raise RuntimeError("导出面数 %d 超出 [%d, %d]"
                           % (info["实际面数"], TARGET_MIN, TARGET_MAX))
    for im in info["images"]:
        if im.get("尺寸") is None:
            raise RuntimeError("导出贴图无有效 PNG 头: %s" % json.dumps(im, ensure_ascii=False))
        if im["尺寸"][0] > MAX_TEX or im["尺寸"][1] > MAX_TEX:
            raise RuntimeError("导出贴图超 %d²: %s" % (MAX_TEX, json.dumps(im, ensure_ascii=False)))
        if im.get("bytes", 0) <= 0:
            raise RuntimeError("导出贴图数据为空: %s" % json.dumps(im, ensure_ascii=False))
    if size > SIZE_LIMIT:
        raise RuntimeError("体积 %d 字节超过上限 %d" % (size, SIZE_LIMIT))
    if not any(m.get("baseColor图像") for m in info["materials"]):
        raise RuntimeError("导出材质缺少 baseColor 贴图绑定")
    return info


def main():
    log("==== FP-02 处理开始 ====")
    log("Blender: %s" % bpy.app.version_string)
    log("工作文件: %s" % bpy.data.filepath)
    obj = get_mesh_obj()
    if obj is None:
        raise RuntimeError("场景中未找到网格对象")
    log("网格对象: %s 顶点=%d 面=%d 尺寸=%s"
        % (obj.name, len(obj.data.vertices), len(obj.data.polygons),
           [round(d, 4) for d in obj.dimensions]))
    fix_result = fix_textures()
    check_material_binding()
    dec_result = decimate(obj)
    info = export_glb()
    base_faces = dec_result["减面前面数"]
    log("==== FP-02 汇总 ====")
    log_json({
        "贴图动作": fix_result,
        "减面前面数": base_faces,
        "减面后实际面数": info["实际面数"],
        "减面比例": "%.2f%%" % (100.0 * (1 - info["实际面数"] / float(base_faces))),
        "输出路径": OUT_GLB,
        "体积MB": round(info["体积字节"] / 1048576.0, 2),
        "Draco": True,
    })
    log("FP02_RESULT: OK")


sys.stdout = Tee(LOG_PATH)
sys.stderr = sys.stdout
try:
    main()
except Exception:
    log("FP02_RESULT: FAIL")
    log(traceback.format_exc())
