# -*- coding: utf-8 -*-
"""由 v9 生成 v10：
1) 躯干 UV v 方向翻转（PNG 顶行=Blender v=1，需 v=1 对应头端）→ 背号字顶朝头
2) 腿压低贴地：hip/kne/ank/toe z 各降，根治侧视拱腿
"""
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
s = open(r"脚本\建模v9.py", encoding="utf-8").read()

# 1) UV v 翻转
s = s.replace("        vv = (vco.y - YMIN) / (YMAX - YMIN)",
              "        vv = 1.0 - (vco.y - YMIN) / (YMAX - YMIN)")

# 2) 腿压低贴地
s = s.replace('"hipL":     ((0.075,  0.055, 0.062), 0.056, 0.054),', '"hipL":     ((0.075,  0.055, 0.054), 0.056, 0.050),')
s = s.replace('"kneL":     ((0.135,  0.250, 0.046), 0.047, 0.045),', '"kneL":     ((0.135,  0.250, 0.038), 0.047, 0.040),')
s = s.replace('"ankL":     ((0.175,  0.450, 0.036), 0.035, 0.034),', '"ankL":     ((0.175,  0.450, 0.030), 0.035, 0.030),')
s = s.replace('"toeL":     ((0.195,  0.545, 0.016), 0.033, 0.018),', '"toeL":     ((0.195,  0.545, 0.012), 0.033, 0.014),')
s = s.replace('"hipR":     ((-0.075,  0.055, 0.062), 0.056, 0.054),', '"hipR":     ((-0.075,  0.055, 0.054), 0.056, 0.050),')
s = s.replace('"kneR":     ((-0.135,  0.250, 0.046), 0.047, 0.045),', '"kneR":     ((-0.135,  0.250, 0.038), 0.047, 0.040),')
s = s.replace('"ankR":     ((-0.175,  0.450, 0.036), 0.035, 0.034),', '"ankR":     ((-0.175,  0.450, 0.030), 0.035, 0.030),')
s = s.replace('"toeR":     ((-0.195,  0.545, 0.016), 0.033, 0.018),', '"toeR":     ((-0.195,  0.545, 0.012), 0.033, 0.014),')

# 环半径随腿微调
s = s.replace('腿环("短裤粉条%d" % side, hip, kne, 0.80, 0.049, 0.006, C_粉线)', '腿环("短裤粉条%d" % side, hip, kne, 0.80, 0.046, 0.006, C_粉线)')
s = s.replace('腿环("短裤青摆%d" % side, hip, kne, 0.92, 0.047, 0.006, C_青边)', '腿环("短裤青摆%d" % side, hip, kne, 0.92, 0.044, 0.006, C_青边)')
s = s.replace('腿环("袜青边%d" % side, kne, ank, 0.10, 0.037, 0.005, C_青边)', '腿环("袜青边%d" % side, kne, ank, 0.10, 0.035, 0.005, C_青边)')

s = s.replace("FP-10-v9-", "FP-10-v10-")
s = s.replace("吴昊阳模型v9-重做.blend", "吴昊阳模型v10-重做.blend")

# 3) 末尾追加 glb 导出（删地面后导出全角色）
导出代码 = '''
# ---------- 导出 glb（删地面，角色+配件全静态） ----------
地 = bpy.data.objects.get("地面")
if 地:
    bpy.data.objects.remove(地, do_unlink=True)
for o in bpy.data.objects:
    o.select_set(o.type == 'MESH')
bpy.context.view_layer.objects.active = ob
bpy.ops.export_scene.gltf(
    filepath=os.path.join(DIR, "wu3d-pazi.glb"),
    export_format='GLB', use_selection=True,
    export_apply=True, export_yup=True,
)
print("FP10] glb exported")
'''
s = s.replace('bpy.ops.wm.save_as_mainfile(filepath=os.path.join(DIR, "吴昊阳模型v10-重做.blend"))',
              导出代码 + '\nbpy.ops.wm.save_as_mainfile(filepath=os.path.join(DIR, "吴昊阳模型v10-重做.blend"))')

open(r"脚本\建模v10.py", "w", encoding="utf-8").write(s)
print("v10 written", len(s))
