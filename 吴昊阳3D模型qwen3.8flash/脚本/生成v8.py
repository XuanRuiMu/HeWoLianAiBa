# -*- coding: utf-8 -*-
"""由 v7 生成 v8：躯干UV只映射躯干段、双手收拢持机、眼镜放大、手机立起。"""
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
s = open(r"脚本\建模v7.py", encoding="utf-8").read()

# 1) 躯干 UV：v 只映射躯干段（头端→髋），根治背号落到腰腿
s = s.replace("YMIN, YMAX = -0.26, 0.60   # 头端→脚端", "YMIN, YMAX = -0.26, 0.02   # 躯干：头端→髋")

# 2) 双手收拢贴手机
s = s.replace('"wriL":     ((0.062, -0.352, 0.062), 0.029, 0.027),', '"wriL":     ((0.050, -0.356, 0.066), 0.029, 0.027),')
s = s.replace('"hndL":     ((0.045, -0.388, 0.072), 0.028, 0.021),', '"hndL":     ((0.034, -0.398, 0.074), 0.027, 0.020),')
s = s.replace('"wriR":     ((-0.062, -0.352, 0.062), 0.029, 0.027),', '"wriR":     ((-0.050, -0.356, 0.066), 0.029, 0.027),')
s = s.replace('"hndR":     ((-0.045, -0.388, 0.072), 0.028, 0.021),', '"hndR":     ((-0.034, -0.398, 0.074), 0.027, 0.020),')

# 3) 手机进双手之间、微倾立起
s = s.replace("bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.412, 0.062))", "bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.404, 0.072))")
s = s.replace("机.rotation_euler = (math.radians(80), 0, 0)", "机.rotation_euler = (math.radians(65), 0, 0)")

# 4) 眼镜放大贴脸
s = s.replace('加框("镜圈%d" % s, (0.022*s, -0.3785, HZ+0.044), 0.021, 0.0028, 0.013, C_镜框)', '加框("镜圈%d" % s, (0.023*s, -0.3775, HZ+0.044), 0.026, 0.0032, 0.017, C_镜框)')
s = s.replace('加框("鼻梁", (0, -0.380, HZ+0.047), 0.010, 0.0023, 0.0020, C_镜框)', '加框("鼻梁", (0, -0.3795, HZ+0.048), 0.012, 0.0026, 0.0024, C_镜框)')

# 5) 眼珠随眼镜外移
s = s.replace('加球("眼%d" % s, (0.022*s, -0.373, HZ+0.044), 0.0075, C_头发, sx=0.8, sy=0.5, sz=1.0)', '加球("眼%d" % s, (0.023*s, -0.372, HZ+0.044), 0.008, C_头发, sx=0.8, sy=0.5, sz=1.0)')

s = s.replace("FP-10-v7-", "FP-10-v8-")
s = s.replace("吴昊阳模型v7-重做.blend", "吴昊阳模型v8-重做.blend")
open(r"脚本\建模v8.py", "w", encoding="utf-8").write(s)
print("v8 written", len(s))
