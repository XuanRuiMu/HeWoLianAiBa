
import io
p = r"D:\xuanr\Desktop\玄锐暮工作区\和我恋爱吧/背景实验室/lab-a-base/positioner.html"
L = io.open(p, encoding="utf-8").read().split(chr(10))
idx = [i for i, l in enumerate(L) if l.strip().startswith("var WU_AUR_GLSL")]
assert len(idx) == 1, idx
txt = io.open(r"D:\xuanr\Desktop\玄锐暮工作区\和我恋爱吧/_tmp_newglsl.txt", encoding="utf-8").read().strip()
L[idx[0]] = "    var WU_AUR_GLSL = " + txt + ";"
io.open(p, "w", encoding="utf-8", newline="").write(chr(10).join(L))
print("replaced", idx[0]+1, len(txt))
