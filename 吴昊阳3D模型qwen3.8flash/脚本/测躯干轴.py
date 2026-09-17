# -*- coding: utf-8 -*-
"""躯干俯仰轴实测：分别用绕局部 X / Y 的脊柱旋转，看胸部端在世界系的实际移动方向。"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import skeleton as SK


def probe(axis_name, deg):
    """把 spine/chest/neck 的旋转临时改为绕指定轴，返回关键位移。"""
    base = dict(SK.DEFAULT_DEG)
    for k in ("spine", "chest", "neck"):
        base[k] = deg

    def own_custom():
        d2r = math.radians
        def ax_rot(which):
            a = d2r(deg)
            return SK.euler((a, 0, 0)) if which == "X" else SK.euler((0, a, 0))
        return {
            "pelvis": SK.euler((d2r(-90), 0, 0)),
            "spine": ax_rot(axis_name),
            "chest": ax_rot(axis_name),
            "neck": ax_rot(axis_name),
            "head": np.eye(3),
            "clav_L": np.eye(3), "shoulder_L": np.eye(3), "elbow_L": np.eye(3), "wrist_L": np.eye(3),
            "clav_R": np.eye(3), "shoulder_R": np.eye(3), "elbow_R": np.eye(3), "wrist_R": np.eye(3),
            "hip_L": np.eye(3), "knee_L": np.eye(3), "ankle_L": np.eye(3),
            "hip_R": np.eye(3), "knee_R": np.eye(3), "ankle_R": np.eye(3),
        }

    M = SK.world_mats(own_custom())
    pj = SK.posed_joints(own_custom())
    zlow = min(c[2] for c in pj.values())
    rel = {k: c[2] - zlow for k, c in pj.items()}
    ax = pj["chest"] - pj["pelvis"]
    axn = ax / np.linalg.norm(ax)
    incl = math.degrees(math.asin(max(-1.0, min(1.0, axn[2]))))
    print(f"axis={axis_name} deg={deg:+6.1f} torso_incl={incl:+7.2f} "
          f"chest_z={rel['chest']:+.3f} hip_z={rel['hip_L']:+.3f} head_z={rel['head']:+.3f} "
          f"chest_y={pj['chest'][1]:+.3f} pelvis_y={pj['pelvis'][1]:+.3f}")


for axis in ("X", "Y"):
    for d in (0, 15, 30, -15):
        probe(axis, d)
    print()
