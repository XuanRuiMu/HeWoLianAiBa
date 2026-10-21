
import io, json, re
p = r"D:\xuanr\Desktop\玄锐暮工作区\和我恋爱吧/背景实验室/lab-a-base/positioner.html"
L = io.open(p, encoding="utf-8").read().split("\n")
line = L[3255]
s = line.strip()
i = s.index('"')
j = s.rindex('"')
lit = s[i:j+1]
txt = json.loads(lit)
print(txt)
