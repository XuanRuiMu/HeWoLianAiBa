# -*- coding: utf-8 -*-
"""FP-10 手绘贴图生成（PIL，2048px，供 Blender 材质采样）。
风格依据四张参考图特征（比例不照搬）：深蓝球衣+白 YOUNG/3+G.O.T.A、青领边+粉细线、
侧面粉色梯纹、短裤粉横条+青下摆+红菱、白袜青顶边、深色护臂针织暗纹。
"""
import os
from PIL import Image, ImageDraw, ImageFont

DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(DIR, "贴图")
os.makedirs(OUT, exist_ok=True)
S = 2048

深蓝 = (26, 33, 56)
深蓝2 = (20, 26, 46)
青 = (79, 195, 214)
粉 = (240, 100, 145)
白 = (245, 245, 245)
红 = (217, 51, 77)
护蓝 = (36, 43, 66)
袜白 = (238, 238, 240)

def 字体(px):
    for f in ("arialbd.ttf", "arial.ttf", "segoeui.ttf"):
        try:
            return ImageFont.truetype(os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts", f), px)
        except Exception:
            continue
    return ImageFont.load_default()

def 画布():
    im = Image.new("RGB", (S, S), 深蓝)
    return im, ImageDraw.Draw(im)

# ---------- 背绘（躯干顶面：u=左右 x，v=头到脚 y）----------
im, d = 画布()
# 领口：青边 + 粉细线（v 小端=头颈）
d.rectangle([0, 0, S, int(S*0.055)], fill=青)
d.rectangle([0, int(S*0.055), S, int(S*0.075)], fill=粉)
# 后领红菱
d.polygon([(S//2, int(S*0.012)), (S//2+70, int(S*0.032)), (S//2, int(S*0.052)), (S//2-70, int(S*0.032))], fill=红)
# YOUNG 字（rotation=180：实测 UV 映射后字顶朝头端）
f1 = 字体(300)
d.text((S//2, int(S*0.30)), "YOUNG", font=f1, fill=白, anchor="mm", rotation=180)
# 大号 3
f2 = 字体(1100)
d.text((S//2, int(S*0.66)), "3", font=f2, fill=白, anchor="mm")
im.save(os.path.join(OUT, "背绘.png"))

# ---------- 胸绘（底面，实际贴地不可见，保持深蓝+小G.O.T.A）----------
im, d = 画布()
d.rectangle([0, 0, S, int(S*0.055)], fill=青)
d.rectangle([0, int(S*0.055), S, int(S*0.075)], fill=粉)
f3 = 字体(220)
d.text((S//2, int(S*0.30)), "G.O.T.A", font=f3, fill=白, anchor="mm")
d.text((S//2, int(S*0.62)), "3", font=f2, fill=白, anchor="mm")
im.save(os.path.join(OUT, "胸绘.png"))

# ---------- 侧绘（躯干侧面：粉色梯纹）----------
im, d = 画布()
d.rectangle([0, 0, S, int(S*0.06)], fill=青)
d.rectangle([0, int(S*0.06), S, int(S*0.085)], fill=粉)
for i in range(7):
    y0 = int(S*0.16) + i*int(S*0.10)
    d.polygon([(int(S*0.25), y0), (int(S*0.75), y0+int(S*0.03)),
               (int(S*0.75), y0+int(S*0.055)), (int(S*0.25), y0+int(S*0.025))], fill=粉)
im.save(os.path.join(OUT, "侧绘.png"))

# ---------- 短裤绘（粉横条+青下摆+红菱）----------
im, d = 画布()
d.rectangle([0, int(S*0.62), S, int(S*0.72)], fill=粉)
d.rectangle([0, int(S*0.72), S, int(S*0.78)], fill=青)
d.polygon([(S//2, int(S*0.30)), (S//2+90, int(S*0.40)), (S//2, int(S*0.50)), (S//2-90, int(S*0.40))], fill=红)
im.save(os.path.join(OUT, "短裤绘.png"))

# ---------- 护臂绘（暗针织线）----------
im, d = 画布()
im = Image.new("RGB", (S, S), 护蓝); d = ImageDraw.Draw(im)
for i in range(48):
    y = i*int(S/48)
    d.line([(0, y), (S, y)], fill=(28, 34, 54), width=3)
im.save(os.path.join(OUT, "护臂绘.png"))

# ---------- 袜绘（青顶边+罗纹）----------
im, d = 画布()
im = Image.new("RGB", (S, S), 袜白); d = ImageDraw.Draw(im)
d.rectangle([0, 0, S, int(S*0.10)], fill=青)
for i in range(40):
    x = i*int(S/40)
    d.line([(x, int(S*0.12)), (x, S)], fill=(222, 226, 232), width=4)
im.save(os.path.join(OUT, "袜绘.png"))

# ---------- 鞋绘（白+青底条）----------
im, d = 画布()
im = Image.new("RGB", (S, S), (242, 242, 242)); d = ImageDraw.Draw(im)
d.rectangle([0, int(S*0.80), S, S], fill=青)
im.save(os.path.join(OUT, "鞋绘.png"))

print("手绘贴图生成完成:", os.listdir(OUT))
