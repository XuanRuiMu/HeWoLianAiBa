# -*- coding: utf-8 -*-
"""FP-02 体检：独立解析输出 glb 的 JSON chunk（不依赖 Blender），逐项验收并写 fp02体检.json。
验收项：①Blender 无错误退出（日志标记）②体积 ≤20MB（目标 ≤15MB）
③面数 15~30 万 ④Draco 压缩 ⑤贴图内嵌且可用（PNG 头/尺寸≤2048²/绑定 baseColor）。
"""
import hashlib
import json
import os
import struct

TASK_DIR = r"D:\xuanr\Desktop\燃烧之陨我的世界服务端\和我恋爱吧\吴昊阳3D模型glm5.3flash"
OUT_GLB = os.path.join(TASK_DIR, "成品", "吴昊阳趴姿优化.glb")
SRC_GLB = os.path.join(TASK_DIR, "吴昊阳模型v2.glb")
EXPORT_LOG = os.path.join(TASK_DIR, "工具", "fp02导出日志.txt")
CHECK_JSON = os.path.join(TASK_DIR, "工具", "fp02体检.json")

PNG_SIG = b"\x89PNG\r\n\x1a\n"
FACE_MIN, FACE_MAX = 150_000, 300_000
SIZE_LIMIT = 20 * 1024 * 1024
SIZE_GOAL = 15 * 1024 * 1024
MAX_TEX = 2048


def png_dims(raw):
    if len(raw) >= 24 and raw[:8] == PNG_SIG and raw[12:16] == b"IHDR":
        w, h = struct.unpack(">II", raw[16:24])
        return [w, h]
    return None


def parse_glb(path):
    with open(path, "rb") as f:
        data = f.read()
    magic, version, declared = struct.unpack("<III", data[:12])
    if magic != 0x46546C67:
        raise ValueError("不是 glb: %s" % path)
    if declared != len(data):
        raise ValueError("声明长度 %d != 实际 %d" % (declared, len(data)))
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
        raise ValueError("无 JSON chunk")
    return version, js, binchunk


def faces_of(js):
    accs = js.get("accessors", [])
    total, per = 0, []
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


def main():
    size = os.path.getsize(OUT_GLB)
    with open(OUT_GLB, "rb") as f:
        digest = hashlib.sha256(f.read()).hexdigest()
    version, js, binchunk = parse_glb(OUT_GLB)
    bvs = js.get("bufferViews", [])
    faces, per_mesh = faces_of(js)

    draco_prims = 0
    for m in js.get("meshes", []):
        for p in m.get("primitives", []):
            ext = p.get("extensions", {}).get("KHR_draco_mesh_compression")
            if ext is not None and bvs[ext["bufferView"]]["byteLength"] > 0:
                draco_prims += 1

    images = []
    for i, im in enumerate(js.get("images", [])):
        e = {"index": i, "name": im.get("name", ""), "mimeType": im.get("mimeType", ""),
             "bufferView": im.get("bufferView")}
        if im.get("bufferView") is not None:
            bv = bvs[im["bufferView"]]
            raw = binchunk[bv.get("byteOffset", 0):bv.get("byteOffset", 0) + bv["byteLength"]]
            e["bytes"] = bv["byteLength"]
            e["PNG头有效"] = raw[:8] == PNG_SIG
            e["尺寸"] = png_dims(raw)
        else:
            e["bytes"] = 0
            e["PNG头有效"] = False
            e["尺寸"] = None
        images.append(e)

    textures = js.get("textures", [])
    materials = []
    for m in js.get("materials", []):
        e = {"name": m.get("name", "")}
        pbr = m.get("pbrMetallicRoughness", {})
        bct = pbr.get("baseColorTexture")
        if bct is not None:
            src = textures[bct["index"]]["source"]
            e["baseColor绑定"] = {"texture": bct["index"], "image": js["images"][src].get("name", "")}
        else:
            e["baseColor绑定"] = None
        e["normalTexture"] = "normalTexture" in m
        materials.append(e)

    _, js_src, _ = parse_glb(SRC_GLB)
    src_faces, _ = faces_of(js_src)

    with open(EXPORT_LOG, "r", encoding="utf-8") as f:
        log_tail = f.read()
    blender_ok = "FP02_RESULT: OK" in log_tail and "FP02_RESULT: FAIL" not in log_tail

    checks = {
        "①Blender后台导出无错误(FP02_RESULT: OK)": blender_ok,
        "②体积≤20MB": size <= SIZE_LIMIT,
        "②目标体积≤15MB": size <= SIZE_GOAL,
        "③面数15万~30万": FACE_MIN <= faces <= FACE_MAX,
        "④Draco压缩生效": "KHR_draco_mesh_compression" in js.get("extensionsUsed", [])
                          and draco_prims > 0,
        "⑤贴图内嵌且PNG可用": all(
            im["PNG头有效"] and im["bytes"] > 0 and im["尺寸"] is not None
            and im["尺寸"][0] <= MAX_TEX and im["尺寸"][1] <= MAX_TEX
            for im in images) and len(images) > 0,
        "⑤材质绑定baseColor贴图": any(m["baseColor绑定"] for m in materials),
    }
    hard_pass = (checks["①Blender后台导出无错误(FP02_RESULT: OK)"]
                 and checks["②体积≤20MB"]
                 and checks["③面数15万~30万"]
                 and checks["④Draco压缩生效"]
                 and checks["⑤贴图内嵌且PNG可用"]
                 and checks["⑤材质绑定baseColor贴图"])

    report = {
        "体检对象": OUT_GLB,
        "体积字节": size,
        "体积MB": round(size / 1048576.0, 2),
        "SHA256": digest,
        "glTF版本": version,
        "asset": js.get("asset", {}),
        "extensionsUsed": js.get("extensionsUsed", []),
        "Draco图元数": draco_prims,
        "meshes": per_mesh,
        "实际总面数": faces,
        "images": images,
        "materials": materials,
        "textures数": len(textures),
        "nodes数": len(js.get("nodes", [])),
        "scenes数": len(js.get("scenes", [])),
        "对照_源glb": {"文件": SRC_GLB, "面数": src_faces},
        "减面比例": "%.2f%%" % (100.0 * (1 - faces / float(src_faces))),
        "验收": checks,
        "结论": "PASS" if hard_pass else "FAIL",
    }
    with open(CHECK_JSON, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)

    print("FP02_CHECK_DONE")
    print(json.dumps({"结论": report["结论"], "体积MB": report["体积MB"],
                      "实际总面数": faces, "减面比例": report["减面比例"],
                      "验收": checks}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
