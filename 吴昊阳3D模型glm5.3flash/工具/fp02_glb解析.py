# -*- coding: utf-8 -*-
"""FP-02 前置：只读解析源 glb，提取材质绑定的 baseColor 贴图（baked_color_v2），
供后续 Blender 工作副本还原贴图使用。输出 glb源清单.json。
不修改源 glb，不依赖第三方库。
"""
import json
import os
import struct

TASK_DIR = r"D:\xuanr\Desktop\燃烧之陨我的世界服务端\和我恋爱吧\吴昊阳3D模型glm5.3flash"
SRC_GLB = os.path.join(TASK_DIR, "吴昊阳模型v2.glb")
EXTRACT_DIR = os.path.join(TASK_DIR, "工具", "提取贴图")
LIST_JSON = os.path.join(TASK_DIR, "工具", "glb源清单.json")

PNG_SIG = b"\x89PNG\r\n\x1a\n"


def png_dims(raw):
    """从 PNG 字节流读 IHDR 宽高，非 PNG 返回 None。"""
    if len(raw) >= 24 and raw[:8] == PNG_SIG and raw[12:16] == b"IHDR":
        w, h = struct.unpack(">II", raw[16:24])
        return [w, h]
    return None


def parse_glb(path):
    with open(path, "rb") as f:
        data = f.read()
    magic, version, declared = struct.unpack("<III", data[:12])
    if magic != 0x46546C67:
        raise ValueError("magic 不符，不是 glb: %s" % path)
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
    if js is None:
        raise ValueError("未找到 JSON chunk")
    return version, js, binchunk, declared, len(data)


def face_count(js):
    accs = js.get("accessors", [])
    total = 0
    per = []
    for m in js.get("meshes", []):
        mf = 0
        for p in m.get("primitives", []):
            if p.get("mode", 4) != 4:
                continue
            if "indices" in p:
                mf += accs[p["indices"]]["count"] // 3
            elif "POSITION" in p.get("attributes", {}):
                mf += accs[p["attributes"]["POSITION"]]["count"] // 3
        per.append({"name": m.get("name", ""), "faces": mf})
        total += mf
    return total, per


def bv_bytes(binchunk, bvs, idx):
    bv = bvs[idx]
    start = bv.get("byteOffset", 0)
    return binchunk[start:start + bv["byteLength"]]


def main():
    version, js, binchunk, declared, filesize = parse_glb(SRC_GLB)
    bvs = js.get("bufferViews", [])
    faces, per_mesh = face_count(js)

    images = []
    for i, im in enumerate(js.get("images", [])):
        entry = {"index": i, "name": im.get("name", ""), "mimeType": im.get("mimeType", ""),
                 "bufferView": im.get("bufferView")}
        if im.get("bufferView") is not None:
            raw = bv_bytes(binchunk, bvs, im["bufferView"])
            entry["bytes"] = len(raw)
            entry["png头有效"] = raw[:8] == PNG_SIG
            entry["尺寸"] = png_dims(raw)
        elif "uri" in im:
            entry["uri"] = im["uri"]
        images.append(entry)

    textures = js.get("textures", [])
    materials = []
    for m in js.get("materials", []):
        e = {"name": m.get("name", "")}
        pbr = m.get("pbrMetallicRoughness", {})
        if "baseColorTexture" in pbr:
            ti = pbr["baseColorTexture"]["index"]
            si = textures[ti]["source"]
            e["baseColorTexture"] = {"texture": ti, "image": images[si]["name"], "imageIndex": si}
        else:
            e["baseColorTexture"] = None
        e["baseColorFactor"] = pbr.get("baseColorFactor")
        e["normalTexture"] = "normalTexture" in m
        e["metallicRoughnessTexture"] = "metallicRoughnessTexture" in m
        materials.append(e)

    report = {
        "文件": SRC_GLB,
        "文件大小字节": filesize,
        "glTF版本": version,
        "声明总长": declared,
        "asset": js.get("asset", {}),
        "extensionsUsed": js.get("extensionsUsed", []),
        "meshes": per_mesh,
        "实际总面数": faces,
        "materials": materials,
        "images": images,
        "textures数": len(textures),
        "nodes数": len(js.get("nodes", [])),
    }

    # 定位要提取的贴图：优先名称含 baked_color，否则取第一个材质的 baseColor
    pick = None
    for im in images:
        if "baked_color" in (im.get("name") or "").lower():
            pick = im
            break
    if pick is None:
        for m in materials:
            if m.get("baseColorTexture"):
                pick = images[m["baseColorTexture"]["imageIndex"]]
                break
    if pick is None or pick.get("bufferView") is None:
        raise RuntimeError("未找到可提取的 baseColor 贴图，images=%s"
                           % json.dumps(images, ensure_ascii=False))

    raw = bv_bytes(binchunk, bvs, js["images"][pick["index"]]["bufferView"])
    if raw[:8] != PNG_SIG:
        raise RuntimeError("提取内容不是 PNG，头字节=%s" % raw[:8].hex())

    os.makedirs(EXTRACT_DIR, exist_ok=True)
    out_png = os.path.join(EXTRACT_DIR, "baked_color_v2.png")
    with open(out_png, "wb") as f:
        f.write(raw)

    report["提取"] = {
        "来源image": pick["name"],
        "提取路径": out_png,
        "字节数": len(raw),
        "尺寸": png_dims(raw),
    }
    with open(LIST_JSON, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)

    print("FP02_EXTRACT_OK")
    print("贴图提取:", json.dumps(report["提取"], ensure_ascii=False))
    print("源glb实际总面数:", faces)


if __name__ == "__main__":
    main()
