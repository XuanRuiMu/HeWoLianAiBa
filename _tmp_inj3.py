
import io
base = r"D:\xuanr\Desktop\玄锐暮工作区\和我恋爱吧"
p = base + "/QianDuan/public/grass-bg/grass-bg.html"
src = io.open(p, encoding="utf-8").read()
i = src.find("/* 完整移植")
assert i > 0
j = src.rfind("<script>", 0, i)
k = src.find("</script>", i)
assert j > 0 and k > j
src = src[:j] + src[k + len("</script>") + 1:]
js = io.open(base + "/_tmp_full_port.js", encoding="utf-8").read()
tail = "</script>" + chr(10) + "</body>"
assert src.count(tail) == 1
src = src.replace(tail, "</script>" + chr(10) + "<script>" + chr(10) + js + chr(10) + "</script>" + chr(10) + "</body>")
io.open(p, "w", encoding="utf-8", newline="").write(src)
print("ok", len(src))
