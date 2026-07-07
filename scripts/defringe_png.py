from PIL import Image, ImageFilter
import numpy as np
import os

def defringe(input_path, output_path, erode_radius=4, sample_radius=8):
    """
    去除 PNG 抠图后残留的实体毛边。
    1. 反解白色背景混合；
    2. 腐蚀不透明 mask 得到内部区域；
    3. 边缘像素用窗口内最近的内部像素颜色替换。
    """
    img = Image.open(input_path).convert('RGBA')
    arr = np.array(img, dtype=np.float32)
    h, w, _ = arr.shape

    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]

    # 第一步：反解白色背景混合（半透明像素）
    mask = (a > 0) & (a < 255)
    inv_a = 255.0 - a[mask]
    r[mask] = np.clip((r[mask] * 255.0 - inv_a * 255.0) / a[mask], 0, 255)
    g[mask] = np.clip((g[mask] * 255.0 - inv_a * 255.0) / a[mask], 0, 255)
    b[mask] = np.clip((b[mask] * 255.0 - inv_a * 255.0) / a[mask], 0, 255)

    # 第二步：二进制 mask，腐蚀得到内部区域
    binary = (a > 0).astype(np.uint8) * 255
    binary_pil = Image.fromarray(binary)
    for _ in range(erode_radius):
        binary_pil = binary_pil.filter(ImageFilter.MinFilter(size=3))
    inner_mask = np.array(binary_pil, dtype=bool)

    # 第三步：边缘像素用窗口内最近的内部像素颜色替换
    edge_mask = (a > 0) & (~inner_mask)
    ys, xs = np.where(edge_mask)
    half = sample_radius
    out = arr.copy()

    yy, xx = np.mgrid[-half:half + 1, -half:half + 1]

    for y, x in zip(ys, xs):
        y0, y1 = max(0, y - half), min(h, y + half + 1)
        x0, x1 = max(0, x - half), min(w, x + half + 1)
        local_inner = inner_mask[y0:y1, x0:x1]
        if not local_inner.any():
            out[y, x, 3] *= 0.3
            continue

        # 计算窗口内每个内部像素到中心 (y,x) 的距离
        ly, lx = np.where(local_inner)
        ly += y0
        lx += x0
        dists = (ly - y) ** 2 + (lx - x) ** 2
        nearest_idx = np.argmin(dists)
        ny, nx = ly[nearest_idx], lx[nearest_idx]
        out[y, x, :3] = arr[ny, nx, :3]

    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(output_path)
    print(f'已处理并保存: {output_path}')

if __name__ == '__main__':
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    inp = os.path.join(base, 'frontend', 'public', 'wuhao-yang-zhonggao.png')
    out = os.path.join(base, 'frontend', 'public', 'wuhao-yang-zhonggao.png')
    defringe(inp, out)
