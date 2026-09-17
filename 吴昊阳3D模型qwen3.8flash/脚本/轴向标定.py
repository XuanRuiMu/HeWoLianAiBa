# -*- coding: utf-8 -*-
"""轴向标定：打印各骨静止朝向，以及根旋转后局部轴到世界轴的映射。"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import skeleton as SK

print("rest bone dirs (parent -> child, unit):")
for j in SK.ORDER:
    p = SK.PARENT[j]
    if p is None:
        continue
    v = SK.POS[j] - SK.POS[p]
    v = v / np.linalg.norm(v)
    print(f"  {p:>9s}->{j:<11s} ({v[0]:+.2f},{v[1]:+.2f},{v[2]:+.2f})")

R0 = SK.euler((math.radians(-90), 0, 0))
print("\nroot R_x(-90): local axes -> world")
for nm, ax in (("localX", (1, 0, 0)), ("localY", (0, 1, 0)), ("localZ", (0, 0, 1))):
    print(f"  {nm} -> {np.round(R0 @ np.array(ax, dtype=float), 3)}")

print("\nsingle-bone Rx effect on that bone's own axis (world, after root):")
for a in (-40, -20, 20, 40, 60, 90, 120):
    R = SK.euler((math.radians(a), 0, 0))
    tot = R0 @ R
    print(f"  boneRx({a:+4d}) bone_local+Z -> world {np.round(tot @ np.array([0.,0.,1.]), 2)}")

print("\nsingle-bone Ry effect:")
for a in (-30, 30, 60):
    R = SK.euler((0, math.radians(a), 0))
    tot = R0 @ R
    print(f"  boneRy({a:+4d}) bone_local+Z -> world {np.round(tot @ np.array([0.,0.,1.]), 2)}")
