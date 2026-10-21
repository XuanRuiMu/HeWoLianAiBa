
import numpy as np
from PIL import Image, ImageFilter
def load(p): return Image.open(p).convert("L")
for tag, p in (("夜晚-右下","D:/xuanr/Desktop/玄锐暮工作区/和我恋爱吧/_tmp_cmp/a_night.png"),
               ("白天-右下","D:/xuanr/Desktop/玄锐暮工作区/和我恋爱吧/_tmp_cmp/a_day.png")):
    im = load(p).crop((860, 300, 1276, 560))
    a = np.asarray(im, dtype=np.float32)
    med = np.asarray(im.filter(ImageFilter.MedianFilter(5)), dtype=np.float32)
    d = a - med
    print("%s 亮点(>18): %d  强亮点(>35): %d  区域像素 %d  背景均值 %.1f" % (
        tag, int((d > 18).sum()), int((d > 35).sum()), d.size, float(np.median(a))))
