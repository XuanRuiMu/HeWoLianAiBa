import io
base = r"D:/xuanr/Desktop/玄锐暮工作区/和我恋爱吧"
p = base + "/背景实验室/lab-a-base/positioner.html"
blk = io.open(base + "/_tmp_blk.js", encoding="utf-8").read()
src = io.open(p, encoding="utf-8").read()
old_hook = "      if (wuMesh) wuApplyParallax(group.position);"
new_hook = old_hook + "\n      try { wuSkyTick(); } catch (eSky) { window.__wuSkyErr = String(eSky && eSky.message || eSky); }"
assert src.count(old_hook) == 1, ("hook", src.count(old_hook))
src = src.replace(old_hook, new_hook)
anchor = "    window.__wuBuildMesh = buildWuGroundMesh;"
assert src.count(anchor) == 1, ("anchor", src.count(anchor))
src = src.replace(anchor, blk + anchor)
io.open(p, "w", encoding="utf-8", newline="").write(src)
print("ok", len(src))