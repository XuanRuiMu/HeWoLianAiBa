
import numpy as np
from PIL import Image
O = "D:/xuanr/Desktop/玄锐暮工作区/和我恋爱吧/_tmp_aur"
def load(n): return np.array(Image.open(O + "/" + n).convert("RGB"), dtype=np.float32)
A = load("k_off.png"); B = load("k_on.png"); C = load("k_on2.png")
def blocks(S, bs=20):
    H, W = S.shape[:2]; gh, gw = H // bs, W // bs
    return S[:gh*bs, :gw*bs].reshape(gh, bs, gw, bs, 3).mean(axis=(1, 3))
def report(tag, D, y1=200):
    L = blocks(D).mean(axis=2); sub = L[:y1//20]
    idx = np.dstack(np.unravel_index(np.argsort(-sub), sub.shape))[0]
    top = [(int(i[0])*20, int(i[1])*20, round(float(sub[i[0], i[1]]), 1)) for i in idx[:5]]
    print(tag, "top20pct=%.2f" % float(np.mean(sub)), "blocks_gt6=%d" % int((sub > 6).sum()), top)
for tag, D in (("ON-OFF ", B - A), ("ON2-ON ", C - B), ("ON2-OFF", C - A)):
    report(tag, D)
D = B - A
print("net rgb all  ", np.round(D.mean(axis=(0,1)), 2))
print("net rgb upper", np.round(D[:360].mean(axis=(0,1)), 2))
print("net rgb lower", np.round(D[420:].mean(axis=(0,1)), 2))
