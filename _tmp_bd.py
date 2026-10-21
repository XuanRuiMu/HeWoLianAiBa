
import io
p = r"D:\xuanr\Desktop\玄锐暮工作区\和我恋爱吧/背景实验室/lab-a-base/positioner.html"
src = io.open(p, encoding="utf-8").read()
i = src.index("function inpage() {")
j = src.index("{", i)
depth = 0
k = j
in_str = None
while k < len(src):
    ch = src[k]
    if in_str:
        if ch == "\\":
            k += 2
            continue
        if ch == in_str:
            in_str = None
        k += 1
        continue
    if ch in "'\"":
        in_str = ch
    elif ch == "{":
        depth += 1
    elif ch == "}":
        depth -= 1
        if depth == 0:
            break
    k += 1
print("start line", src[:i].count(chr(10))+1, "end line", src[:k].count(chr(10))+1)
print("body chars", k-i)
