# -*- coding: utf-8 -*-
"""姿势数值优化：以关节离地高度/朝向/双手间距为目标做坐标下降，输出达标角度表。"""
import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import skeleton as SK

DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def evaluate(D, verbose=False):
    own = SK.OWN_from_deg(D)
    pj, zmin = SK.posed_joints_ground(own)
    pen = 0.0
    parts = {}

    # 期望离地高度（模型原始单位，身高 1.134；趴姿肘撑地上半身微抬）
    target = {
        "hip_L": 0.105, "hip_R": 0.105,
        "knee_L": 0.075, "knee_R": 0.075,
        "ankle_L": 0.065, "ankle_R": 0.065,
        "chest": 0.215, "elbow_L": 0.075, "elbow_R": 0.075,
        "wrist_L": 0.235, "wrist_R": 0.235,
        "head": 0.155, "neck": 0.205,
    }
    for j, tv in target.items():
        d = pj[j][2] - tv
        pen += (d / 0.028) ** 2
        parts[j] = round(pj[j][2], 3)

    ank = (pj["ankle_L"] + pj["ankle_R"]) / 2
    yspan = pj["head"][1] - ank[1]
    pen += ((yspan - 0.80) / 0.05) ** 2

    ws = float(np.linalg.norm(pj["wrist_L"] - pj["wrist_R"]))
    pen += ((ws - 0.175) / 0.025) ** 2
    parts["wrist_sep"] = round(ws, 3)

    mid_w = (pj["wrist_L"] + pj["wrist_R"]) / 2
    pen += ((mid_w[1] - pj["head"][1] + 0.30) / 0.05) ** 2 * 0.5

    for j, c in pj.items():
        if c[2] < -0.002:
            pen += 60.0 * (abs(c[2]) / 0.01) ** 2
    for j in ("knee_L", "knee_R", "ankle_L", "ankle_R", "hip_L", "hip_R"):
        if pj[j][2] > 0.20:
            pen += ((pj[j][2] - 0.20) / 0.025) ** 2 * 4

    if verbose:
        print(f"penalty={pen:.1f} head_y={pj['head'][1]:+.3f} ank_y={ank[1]:+.3f} span={yspan:.3f}")
        for k in sorted(parts):
            print(f"   {k:10s} {parts[k]}")
    return pen, pj


BOUNDS = {
    "spine": (0.0, 40.0), "chest": (0.0, 40.0), "neck": (-60.0, 0.0),
    "head": (-45.0, 15.0), "head_turn": (-35.0, 35.0), "yaw": (0.0, 45.0),
    "hip_L": (-45.0, 15.0), "hip_R": (-45.0, 15.0),
    "hip_spread_L": (-5.0, 30.0), "hip_spread_R": (-30.0, 5.0),
    "knee_L": (0.0, 80.0), "knee_R": (0.0, 80.0),
    "ankle_L": (0.0, 60.0), "ankle_R": (0.0, 60.0),
    "shoulder_L": (20.0, 110.0), "shoulder_R": (20.0, 110.0),
    "arm_in_L": (0.0, 45.0), "arm_in_R": (0.0, 45.0),
    "elbow_L": (30.0, 140.0), "elbow_R": (30.0, 140.0),
    "fore_twist_L": (-45.0, 45.0), "fore_twist_R": (-45.0, 45.0),
}


def optimize(D0, keys, steps=(8.0, 3.0, 1.0, 0.35, 0.12)):
    D = dict(D0)
    for k in keys:
        lo, hi = BOUNDS[k]
        D[k] = min(max(D[k], lo), hi)
    cur, _ = evaluate(D)
    print(f"start penalty={cur:.2f}")
    for st in steps:
        for _pass in range(3):
            improved = False
            for k in keys:
                lo, hi = BOUNDS[k]
                base = D[k]
                best = (cur, base)
                for delta in (-st, st):
                    v_ = min(max(base + delta, lo), hi)
                    if abs(v_ - base) < 1e-9:
                        continue
                    D[k] = v_
                    v, _ = evaluate(D)
                    if v < best[0] - 1e-9:
                        best = (v, v_)
                D[k] = best[1]
                if best[0] < cur - 1e-9:
                    cur = best[0]
                    improved = True
            if not improved:
                break
        print(f"step={st} penalty={cur:.2f}")
    return D, cur


KEYS = ["spine", "chest", "neck", "head", "head_turn", "yaw",
        "hip_L", "hip_R", "hip_spread_L", "hip_spread_R",
        "knee_L", "knee_R", "ankle_L", "ankle_R",
        "shoulder_L", "shoulder_R", "arm_in_L", "arm_in_R",
        "elbow_L", "elbow_R", "fore_twist_L", "fore_twist_R"]

if __name__ == "__main__":
    print("=== initial ===")
    evaluate(SK.DEFAULT_DEG, verbose=True)
    D, pen = optimize(SK.DEFAULT_DEG, KEYS)
    print("=== optimized ===")
    _, pj = evaluate(D, verbose=True)
    out = os.path.join(DIR, "证据", "FP-01-角度.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(D, f, ensure_ascii=False, indent=1)
    print("SAVED", out)
    print(json.dumps({k: round(v, 2) for k, v in D.items()}, ensure_ascii=False))
