import io
base = r"D:/xuanr/Desktop/玄锐暮工作区/和我恋爱吧"
p = base + "/背景实验室/lab-a-base/positioner.html"
src = io.open(p, encoding="utf-8").read()
api = io.open(base + "/_tmp_api.txt", encoding="utf-8").read()
panel = io.open(base + "/_tmp_panel.txt", encoding="utf-8").read()
host = io.open(base + "/_tmp_host.txt", encoding="utf-8").read()
a1 = "    window.__wuBuildMesh = buildWuGroundMesh;"
assert src.count(a1) == 1
src = src.replace(a1, api + a1)
a2 = "  <div class=\"sec\">\n    <h2>自由放置</h2>"
assert src.count(a2) == 1, ("a2", src.count(a2))
src = src.replace(a2, panel + a2)
a3 = "  document.getElementById('btnCopy').addEventListener('click', function () {"
assert src.count(a3) == 1, ("a3", src.count(a3))
src = src.replace(a3, host + a3)
io.open(p, "w", encoding="utf-8", newline="").write(src)
print("ok", len(src))