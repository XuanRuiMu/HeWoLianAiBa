
import io
base = r"D:\xuanr\Desktop\玄锐暮工作区\和我恋爱吧"
body = io.open(base + "/_tmp_inpage.js", encoding="utf-8").read()
assert body.count("'/wu-2d.png'") == 2
body = body.replace("'/wu-2d.png'", "'./wu-2d.png'")
old = "    var wuCamSigLast = null, wuCamMovedAt = 0;"
assert body.count(old) == 1, body.count(old)
body = body.replace(old, "    var WU_CAM_DEBOUNCE = 180;" + chr(10) + old)
boot = io.open(base + "/_tmp_boot.txt", encoding="utf-8").read()
head = "/* 完整移植：背景实验室/lab-a-base/positioner.html 的 inpage 场景代码（2026-10-21 验收版）。" + chr(10) + "   = 相机定稿位 + 吴昊阳贴地网格 + 压草碰撞 + 原作者极光/星空/云 + 远景释放。 */" + chr(10) + "(function () {" + chr(10)
out = head + body + chr(10) + boot
io.open(base + "/_tmp_full_port.js", "w", encoding="utf-8", newline="").write(out)
print("chars", len(out))
