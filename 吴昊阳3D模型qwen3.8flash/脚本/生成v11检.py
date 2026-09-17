# -*- coding: utf-8 -*-
"""生成 建模v11检.py：在 v10 基础上加渲一张"头在画面上方"的正背视图，
用于无歧义判定背号字向（对照 背面.png：YOUNG 在上、3 在下、字顶朝上）。"""
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
s = open(r"脚本\建模v10.py", encoding="utf-8").read()

add = (
    "\n# 正背对照视图：相机在脚端+Y上方看向角色，画面里头(-Y)在上方\n"
    "def 渲染2(名, 位, 目标, up=(0,0,1), res=900):\n"
    "    sc = bpy.context.scene\n"
    "    cam_d = bpy.data.cameras.new(名); cam_d.lens = 50\n"
    "    cam = bpy.data.objects.new(名, cam_d)\n"
    "    sc.collection.objects.link(cam)\n"
    "    cam.location = 位\n"
    "    d = (Vector(目标) - Vector(位)).normalized()\n"
    "    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()\n"
    "    sc.camera = cam\n"
    "    sc.render.filepath = os.path.join(OUT, 'FP-10-v11-%s.png' % 名)\n"
    "    bpy.ops.render.render(write_still=True)\n"
    "    print('FP10] render2', 名)\n"
    "渲染2(\"背对照\", (0, 1.45, 0.30), (0, -0.10, 0.10))\n"
)
s = s.replace('bpy.ops.wm.save_as_mainfile', add + '\nbpy.ops.wm.save_as_mainfile')
s = s.replace("吴昊阳模型v10-重做.blend", "吴昊阳模型v11检-临时.blend")
open(r"脚本\建模v11检.py", "w", encoding="utf-8").write(s)
print("v11检 written", len(s))
