import io
base = r"D:\xuanr\Desktop\玄锐暮工作区\和我恋爱吧"
p = base + "/背景实验室/lab-a-base/positioner.html"
src = io.open(p, encoding="utf-8").read()
purge = io.open(base + "/_tmp_purge.txt", encoding="utf-8").read()
host = io.open(base + "/_tmp_del.txt", encoding="utf-8").read()
a1 = "    function wuSkyDistant(show) {"
assert src.count(a1) == 1, "a1"
src = src.replace(a1, purge + a1)
a2 = "    window.__wuSky = function (p) {"
api2 = "    window.__wuSkyPurge = function () { var k = wuSkyPurge(); window.__wuSkyPurged = k; return k; };\n"
assert src.count(a2) == 1, "a2"
src = src.replace(a2, api2 + a2)
a3 = "    <div class=\"row\"><label>远景山</label>"
row2 = "    <button class=\"btn\" id=\"btnDistDel\" style=\"border-color:#6b3a3a;color:#e8a0a0\">🗑 删除远景（释放内存）</button>\n"
assert src.count(a3) == 1, "a3"
src = src.replace(a3, row2 + a3)
a4 = "  document.getElementById('auroraI').addEventListener('input', function () { showSky(); pushSky(); });"
assert src.count(a4) == 1, "a4"
src = src.replace(a4, host + a4)
io.open(p, "w", encoding="utf-8", newline="").write(src)
print("ok", len(src))