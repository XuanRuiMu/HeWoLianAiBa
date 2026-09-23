# FP-03 取证工人独立复核（一次性脚本，取证后可删）。
# 直接读已落盘的 after png，逐行逐列取色，给出 ±6px 判定带的「最大色差」硬数值。
import sys
import numpy as np
from PIL import Image

def rel_lum(rgb):
    c = rgb / 255.0
    lin = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]

def 分析(路径):
    im = Image.open(路径).convert('RGB')
    a = np.asarray(im).astype(np.int32)
    高, 宽, _ = a.shape
    flat = a.reshape(-1, 3)
    vals, counts = np.unique(flat, axis=0, return_counts=True)
    底 = vals[counts.argmax()]
    L底 = float(rel_lum(底.astype(np.float64)))
    差 = np.abs(a - 底).max(axis=2)                     # 逐像素与卡底的最大通道差
    亮 = rel_lum(a.astype(np.float64)) >= L底 + 0.05     # 比卡面更亮
    命中 = (差 >= 24) & 亮
    暗条 = (差 >= 24) & (rel_lum(a.astype(np.float64)) <= L底 - 0.05)  # 浅色档的焦点环比卡面更暗
    近白 = 命中 & (rel_lum(a.astype(np.float64)) >= 0.30)
    起点, 终点 = 6, max(7, 宽 - 6)
    清单 = []
    暗行 = []
    for y in range(高):
        row = 命中[y, 起点:终点]
        idx = np.flatnonzero(np.diff(np.concatenate(([0], row.view(np.int8), [0]))))
        段 = idx.reshape(-1, 2)
        if len(段):
            最长 = int((段[:, 1] - 段[:, 0]).max())
            if 最长 >= 40:
                s, e = 段[(段[:, 1] - 段[:, 0]).argmax()]
                中位 = a[y, 起点 + int((s + e) / 2)]
                清单.append((y, 最长, int(差[y, 起点:终点].max()), tuple(int(v) for v in 中位),
                             round(float(rel_lum(中位.astype(np.float64))), 4), bool(近白[y, 起点 + s:起点 + e].any())))
        drow = 暗条[y, 起点:终点]
        didx = np.flatnonzero(np.diff(np.concatenate(([0], drow.view(np.int8), [0])))).reshape(-1, 2)
        if len(didx) and int((didx[:, 1] - didx[:, 0]).max()) >= 200:
            暗行.append((y, int((didx[:, 1] - didx[:, 0]).max()), int(差[y, 起点:终点].max())))
    return 宽, 高, tuple(int(v) for v in 底), round(L底, 4), 清单, 暗行, 差, 命中, 近白, 起点, 终点

if __name__ == '__main__':
    for 路径 in sys.argv[1:]:
        宽, 高, 底, L底, 清单, 暗行, 差, 命中, 近白, 起点, 终点 = 分析(路径)
        print(f'\n### {路径.replace(chr(92), "/").split("/")[-1]}  尺寸 {宽}x{高} 卡底 rgb{底} L={L底}')
        候选 = [(t[0], t[1]) for t in 清单 if t[1] >= 200] + [(t[0], t[1]) for t in 暗行]
        # 只保留「薄」带（连续行组 ≤4 行，容 ≤2 行空隙），排除按钮/铺底这类块状填充
        组, 当前 = [], []
        for y, _ in sorted(候选):
            if 当前 and y - 当前[-1] > 3:
                组.append(当前)
                当前 = []
            当前.append(y)
        if 当前:
            组.append(当前)
        环 = [y for g in 组 if len(g) <= 4 for y in g]
        # 聚焦输入框的焦点环 = 一对相距 20~80px（输入框实高 ~48px）的等长薄带；据此定位，排除卡顶棱线等常驻装饰
        长表 = dict(候选)
        对 = [(a, b) for a in 环 for b in 环 if 20 <= b - a <= 80]
        对 = sorted(对, key=lambda p: -min(长表[p[0]], 长表[p[1]]))
        上, 下 = 对[0] if 对 else (None, None)
        近白行 = [t[0] for t in 清单 if t[5]]
        for y, 最长, 最大差, 中位, Lv, 白 in 清单:
            print(f'  亮条行{y:4d} 连续{最长:4d}px 行内最大Δ={最大差:3d} 中位rgb{中位} L={Lv} {"近白" if 白 else "亮条"} {"<<薄带" if y in 环 else ""}')
        for y, 最长, 最大差 in 暗行:
            print(f'  暗条行{y:4d} 连续{最长:4d}px 行内最大Δ={最大差:3d} {"<<薄带" if y in 环 else ""}')
        print(f'  全卡近白（L≥0.30 且 Δ≥24 且更亮）连续≥40px 的行数 = {len(近白行)}  行号 = {近白行}')
        if 上 is None:
            print(f'  未找到成对薄带（间距 20~80px）⇒ 无法在图内定位焦点输入框；全卡亮条行（连续≥40px）数 = {len(清单)}')
            continue
        带 = sorted({y for e in (上, 下) for y in range(e - 6, e + 7)})
        带 = [y for y in 带 if 0 <= y < 高]
        非环 = [y for y in 带 if y not in 环]
        print(f'  焦点环定位 = 上边行{上} / 下边行{下}（薄带环占有行 = {sorted(y for y in 环 if 上 - 2 <= y <= 下 + 2)}）')
        for 名, 行 in (('含环行', 带), ('不含环行', 非环)):
            w = 差[行][:, 起点:终点]
            h = 命中[行][:, 起点:终点]
            n = 近白[行][:, 起点:终点]
            print(f'  ±6px 带（{名}，{len(行)} 行）：逐像素最大Δ={int(w.max())}  Δ≥24且更亮像素={int(h.sum())}  近白像素={int(n.sum())}')
