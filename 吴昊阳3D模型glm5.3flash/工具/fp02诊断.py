# -*- coding: utf-8 -*-
"""FP-02 诊断：验证提取贴图 PNG 的完整性，以及 Blender 能否加载。只读诊断，不改文件。"""
import bpy
import os

P = r"D:\xuanr\Desktop\燃烧之陨我的世界服务端\和我恋爱吧\吴昊阳3D模型glm5.3flash\工具\提取贴图\baked_color_v2.png"

print("== 文件检查 ==")
print("exists:", os.path.isfile(P), "size:", os.path.getsize(P) if os.path.isfile(P) else None)
with open(P, "rb") as f:
    head = f.read(33)
    f.seek(-12, 2)
    tail = f.read(12)
print("签名:", head[:8].hex())
print("IHDR块:", head[12:16])
w = int.from_bytes(head[16:20], "big")
h = int.from_bytes(head[20:24], "big")
print("宽高:", w, h, "位深:", head[24], "颜色类型:", head[25],
      "压缩:", head[26], "滤波:", head[27], "隔行:", head[28])
print("尾部12字节:", tail)

print("== Blender 全新加载 ==")
try:
    img = bpy.data.images.load(P)
    print("load OK:", img.name, "size:", tuple(img.size), "has_data:", img.has_data,
          "channels:", img.channels, "source:", img.source, "depth:", img.depth)
except Exception as e:
    print("load FAIL:", repr(e))

print("== copy+reload 复现 ==")
try:
    img2 = bpy.data.images["baked_color_v2"]
    print("已有数据块:", img2.name, "size:", tuple(img2.size), "has_data:", img2.has_data,
          "filepath:", img2.filepath)
    img2.filepath = P.replace("\\", "/")
    img2.source = "FILE"
    img2.reload()
    print("reload 后:", "size:", tuple(img2.size), "has_data:", img2.has_data)
except Exception as e:
    print("reload 复现 FAIL:", repr(e))
