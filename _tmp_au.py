
import numpy as np
from PIL import Image
p = r"D:/xuanr/Desktop/玄锐暮工作区/和我恋爱吧/背景实验室/极光.png"
im = Image.open(p); print("size", im.size, im.mode)
a = np.array(im.convert("RGB"), dtype=np.float32)
h, w, _ = a.shape
print("全图 平均RGB (%.0f,%.0f,%.0f)" % tuple(a.mean(axis=(0,1))))
lum = a.mean(axis=2)
print("亮度 分位: min %.0f  p10 %.0f  p50 %.0f  p90 %.0f  max %.0f" % (
    lum.min(), np.percentile(lum,10), np.percentile(lum,50), np.percentile(lum,90), lum.max()))
bright = lum > np.percentile(lum, 95)
print("最亮 5%% 占比 %.1f%%" % (100*bright.mean()))
sub = a[bright]
print("最亮 5%% 平均RGB (%.0f,%.0f,%.0f)" % tuple(sub.mean(axis=0)))
mid = (lum > np.percentile(lum, 70)) & (lum <= np.percentile(lum, 95))
print("中间带 平均RGB (%.0f,%.0f,%.0f)" % tuple(a[mid].mean(axis=0)))
dark = lum <= np.percentile(lum, 30)
print("最暗 30%% 平均RGB (%.0f,%.0f,%.0f)" % tuple(a[dark].mean(axis=0)))
col = lum.mean(axis=0)
print("按列亮度(16段):", [int(x) for x in np.array_split(col, 16).__getitem__(i).mean() for i in range(16)] if False else [int(x.mean()) for x in np.array_split(col, 16)])
r = lum.mean(axis=1)
print("按行亮度(10段):", [int(x.mean()) for x in np.array_split(r, 10)])
