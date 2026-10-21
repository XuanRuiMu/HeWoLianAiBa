
import numpy as np
from PIL import Image
def load(p): return np.array(Image.open(p).convert("RGB"), dtype=np.float32)
new = load("D:/xuanr/Desktop/玄锐暮工作区/和我恋爱吧/_tmp_cmp/a_night.png")
old = load("D:/xuanr/Desktop/玄锐暮工作区/和我恋爱吧/背景实验室/验收截图/13-靠拢-夜晚.png")
day = load("D:/xuanr/Desktop/玄锐暮工作区/和我恋爱吧/_tmp_cmp/a_day.png")
def stat(img, tag, y0,y1,x0,x1):
    q = img[y0:y1, x0:x1]; m = q.mean(axis=(0,1)); g = q.mean(axis=2)
    print("%-18s RGB=(%.0f,%.0f,%.0f) 亮度%.1f 梯度%.2f" % (tag, m[0],m[1],m[2], m.mean(),
        (np.abs(np.diff(g,axis=1)).mean()+np.abs(np.diff(g,axis=0)).mean())/2))
print("=== 天空上部 ===")
stat(old, "旧极光 上", 0, 90, 0, 1280)
stat(new, "新极光 上", 0, 90, 0, 1280)
print("=== 右下（原远景位置）===")
stat(old, "旧 右下", 300, 520, 860, 1275)
stat(new, "新 右下", 300, 520, 860, 1275)
stat(day, "白天 右下", 300, 520, 860, 1275)
print("=== 右上（参考）===")
stat(new, "新 右上", 0, 120, 860, 1275)
stat(day, "白天 右上", 0, 120, 860, 1275)
a = new; R,G,B = a[:,:,0],a[:,:,1],a[:,:,2]
cyan = (G > 110) & (G - R > 25)
print("青绿极光像素占比 %.1f%%（旧 %.1f%%）" % (100*cyan.mean(),
      100*(((old[:,:,1]>110)&(old[:,:,1]-old[:,:,0]>25)).mean())))
print("全图亮度 新 %.1f  旧 %.1f" % (new.mean(), old.mean()))
