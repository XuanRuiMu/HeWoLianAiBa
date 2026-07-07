from PIL import Image, ImageFilter
import numpy as np
import os

def recut(input_path, output_path):
    img = Image.open(input_path).convert('RGBA')
    arr = np.array(img, dtype=np.float32)
    h, w, _ = arr.shape

    # 从四个角采样背景色（取中位数避免噪点）
    corner_size = 24
    corners = [
        arr[:corner_size, :corner_size, :3],
        arr[:corner_size, -corner_size:, :3],
        arr[-corner_size:, :corner_size, :3],
        arr[-corner_size:, -corner_size:, :3],
    ]
    bg_color = np.median(np.concatenate([c.reshape(-1, 3) for c in corners]), axis=0)
    print(f'背景色: {bg_color}')

    # 计算每个像素与背景色的欧氏距离
    dist = np.linalg.norm(arr[..., :3] - bg_color, axis=2)

    # alpha 阈值：距离背景近的像素透明，保留主体但切掉染色边缘
    t1, t2 = 5.0, 24.0
    alpha = np.clip((dist - t1) / (t2 - t1), 0, 1) * 255.0

    # 中值滤波去 alpha 噪点
    alpha_pil = Image.fromarray(alpha.astype(np.uint8))
    alpha_pil = alpha_pil.filter(ImageFilter.MedianFilter(size=3))
    alpha = np.array(alpha_pil, dtype=np.float32)

    # 反解背景混合，得到真实前景色
    a = alpha / 255.0
    inv_a = 1.0 - a
    rgb = arr[..., :3]
    F = np.zeros_like(rgb)
    valid = a > 0.01
    F[valid] = (rgb[valid] - inv_a[valid, None] * bg_color) / a[valid, None]
    F = np.clip(F, 0, 255)

    # 边缘颜色修复
    out = np.dstack((F, alpha))
    out = clean_edges(out, bg_color)

    Image.fromarray(out.astype(np.uint8)).save(output_path)
    print(f'已保存: {output_path}')


def clean_edges(img_arr, bg_color, sample_radius=12):
    """
    修复边缘像素颜色：
    1. 找出 alpha 过渡区（10~250）的边缘像素；
    2. 用最近的“安全内部”像素颜色替换其 RGB；
    3. 把边缘 alpha 提到 235 左右，避免半透明毛边/噪点。
    """
    h, w, _ = img_arr.shape
    a = img_arr[..., 3]

    # 安全内部：alpha 高且颜色明显远离背景
    dist_to_bg = np.linalg.norm(img_arr[..., :3] - bg_color, axis=2)
    inner_mask = (a > 200) & (dist_to_bg > 14.0)

    # 边缘：有透明度但还不是完全透明，且不在安全内部
    edge_mask = (a > 10) & (a < 250) & (~inner_mask)
    ys, xs = np.where(edge_mask)
    out = img_arr.copy()

    def nearest_inner_color(y, x):
        y0, y1 = max(0, y - sample_radius), min(h, y + sample_radius + 1)
        x0, x1 = max(0, x - sample_radius), min(w, x + sample_radius + 1)
        local_inner = inner_mask[y0:y1, x0:x1]
        if not local_inner.any():
            return None
        ly, lx = np.where(local_inner)
        ly += y0
        lx += x0
        dists = (ly - y) ** 2 + (lx - x) ** 2
        nearest_idx = np.argmin(dists)
        ny, nx = ly[nearest_idx], lx[nearest_idx]
        return img_arr[ny, nx, :3]

    for y, x in zip(ys, xs):
        col = nearest_inner_color(y, x)
        if col is None:
            out[y, x, 3] = 0
            continue
        out[y, x, :3] = col
        out[y, x, 3] = 235

    # 最后对 alpha 做一次中值滤波，清除孤立噪点
    alpha_pil = Image.fromarray(out[..., 3].astype(np.uint8))
    alpha_pil = alpha_pil.filter(ImageFilter.MedianFilter(size=3))
    out[..., 3] = np.array(alpha_pil, dtype=np.float32)

    return out


if __name__ == '__main__':
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    inp = os.path.join(base, 'frontend', 'public', 'wuhao-yang.png')
    out = os.path.join(base, 'frontend', 'public', 'wuhao-yang-zhonggao.png')
    recut(inp, out)
