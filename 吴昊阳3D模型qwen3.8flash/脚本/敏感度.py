# -*- coding: utf-8 -*-
"""参数敏感度扫描：逐个角度 +15°，打印对关键指标的影响，用于确认符号与有效自由度。"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import skeleton as SK


def metrics(D):
    own = SK.OWN_from_deg(D)
    pj, _ = SK.posed_joints_ground(own)
    zlow = min(c[2] for c in pj.values())
    rel = {k: c[2] - zlow for k, c in pj.items()}
    ax = pj["chest"] - pj["pelvis"]
    axn = ax / np.linalg.norm(ax)
    incl = math.degrees(math.asin(max(-1.0, min(1.0, axn[2]))))
    ue = pj["elbow_L"] - pj["shoulder_L"]
    ue = ue / np.linalg.norm(ue)
    fe = pj["wrist_L"] - pj["elbow_L"]
    fe = fe / np.linalg.norm(fe)
    th = pj["knee_L"] - pj["hip_L"]
    th = th / np.linalg.norm(th)
    return {
        "incl": incl,
        "chest_lift": rel["chest"] - rel["hip_L"],
        "elbow_z": rel["elbow_L"],
        "wrist_z": rel["wrist_L"],
        "head_z": rel["head"],
        "hip_z": rel["hip_L"],
        "knee_z": rel["knee_L"],
        "upper_yz": (float(ue[1]), float(ue[2])),
        "fore_yz": (float(fe[1]), float(fe[2])),
        "thigh_yz": (float(th[1]), float(th[2])),
    }


BASE = dict(SK.DEFAULT_DEG)
m0 = metrics(BASE)
print("baseline:", {k: (round(v, 3) if isinstance(v, float) else tuple(round(x, 2) for x in v)) for k, v in m0.items()})
print()
KEYS = ["spine", "chest", "neck", "head", "hip_L", "knee_L", "ankle_L",
        "shoulder_L", "arm_in_L", "elbow_L", "fore_twist_L", "hip_spread_L", "yaw"]
print(f"{'param':14s} {'delta':>6s} {'incl':>7s} {'clift':>7s} {'elb_z':>7s} {'wri_z':>7s} {'head_z':>7s} {'knee_z':>7s}")
for k in KEYS:
    for dlt in (-25.0, 25.0):
        D = dict(BASE)
        D[k] = BASE[k] + dlt
        m = metrics(D)
        print(f"{k:14s} {dlt:+6.0f} {m['incl']:+7.1f} {m['chest_lift']:+7.3f} {m['elbow_z']:+7.3f} "
              f"{m['wrist_z']:+7.3f} {m['head_z']:+7.3f} {m['knee_z']:+7.3f}")
