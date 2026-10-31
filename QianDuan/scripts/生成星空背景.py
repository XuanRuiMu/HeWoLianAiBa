import os
import random
import numpy as np
from PIL import Image, ImageDraw

random.seed(20261013)
rng = np.random.default_rng(20261013)

W, H = 800, 1280
x = np.tile(np.linspace(0, 1, W), (H, 1))
y = np.tile(np.linspace(0, 1, H), (W, 1)).T
base = np.zeros((H, W, 3), dtype=np.float64)
base[..., 0] = 10 + 26 * (1 - y) + 30 * x * y
base[..., 1] = 10 + 24 * (1 - y) + 40 * x * y
base[..., 2] = 35 + 40 * (1 - y) + 55 * x * y
band = np.exp(-((x * 0.75 + y * 0.65 - 0.62) ** 2) / 0.035)
base[..., 0] += band * 46
base[..., 1] += band * 40
base[..., 2] += band * 78
img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), 'RGB')
画 = ImageDraw.Draw(img)
for _ in range(900):
    px = rng.integers(0, W)
    py = rng.integers(0, H)
    亮 = float(rng.uniform(120, 255))
    半径 = int(rng.choice([1, 1, 1, 2, 2, 3]))
    色 = (int(亮), int(亮), int(min(255, 亮 + 10)))
    画.ellipse([px - 半径, py - 半径, px + 半径, py + 半径], fill=色)
for _ in range(60):
    px = rng.integers(0, W)
    py = rng.integers(0, H)
    亮 = float(rng.uniform(180, 255))
    画.line([px - 4, py, px + 4, py], fill=(int(亮), int(亮), 255), width=1)
    画.line([px, py - 4, px, py + 4], fill=(int(亮), int(亮), 255), width=1)
    画.ellipse([px - 1, py - 1, px + 1, py + 1], fill=(255, 255, 255))
输出 = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', '背景', '夜空星河.jpg')
os.makedirs(os.path.dirname(输出), exist_ok=True)
img.save(输出, 'JPEG', quality=82)
print(输出)
print(os.path.getsize(输出))
