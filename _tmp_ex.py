
import io, re
p = r"D:\xuanr\Desktop\玄锐暮工作区\和我恋爱吧/背景实验室/lab-a-base/positioner.html"
L = io.open(p, encoding="utf-8").read().split(chr(10))
body = L[483:4336]
src = chr(10).join(body)
io.open(r"D:\xuanr\Desktop\玄锐暮工作区\和我恋爱吧/_tmp_inpage.js", "w", encoding="utf-8", newline="").write(src)
print("chars", len(src))
for kw in ["parent.", "document.getElementById", "localStorage", "window.top", "postMessage", "__wuSetLayerRect", "wuLayer"]:
    print(kw, src.count(kw))
