# -*- coding: utf-8 -*-
"""对称姿势优化：左右共用一组角度（仅腿/髋外展允许小幅不对称），坐标下降求最优。"""
import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import skeleton as SK

DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 对称参数名 -> (左键, 右键, 是否取反)
PAIRS = {
    "spine": ("spine", "spine", False),
    "chest": ("chest", "chest", False),
    "neck": ("neck", "neck", False),
    "head": ("head", "head", False),
    "yaw": ("yaw", "yaw", False),
    "hip": ("hip_L", "hip_R", False),
    "knee": ("knee_L", "knee_R", False),
    "ankle": ("ankle_L", "ankle_R", False),
    "shoulder": ("shoulder_L", "shoulder_R", False),
    "arm_in": ("arm_in_L", "arm_in_R", False),
    "elbow": ("elbow_L", "elbow_R", False),
    "spread": ("hip_spread_L", "hip_spread_R", True),
    "twist": ("fore_twist_L", "fore_twist_R", True),
}
RANGES = {
    "spine": (0.0, 45.0), "chest": (0.0, 45.0), "neck": (-60.0, 5.0),
    "head": (-45.0, 20.0), "yaw": (0.0, 45.0),
    "hip": (-45.0, 10.0), "knee": (0.0, 80.0), "ankle": (0.0, 60.0),
    "shoulder": (20.0, 115.0), "arm_in": (0.0, 45.0), "elbow": (30.0, 145.0),
    "spread": (0.0, 25.0), "twist": (0.0, 45.0),
}


def expand(S):
    D = dict(SK.DEFAULT_DEG)
    for k, (lk, rk, neg) in PAIRS.items():
        v = S[k]
        D[lk] = v
        D[rk] = -v if neg else v
    return D


def score(S, verbose=False):
    D = expand(S)
    own = SK.OWN_from_deg(D)
    pj, _ = SK.posed_joints_ground(own)
    pen = 0.0
    parts = {}

    # ---- 以"最低点贴地"为基准：先求全关节最低 z，再按相对高度差评分（避免整体平移自证） ----
    zlow = min(c[2] for c in pj.values())
    rel = {k: c[2] - zlow for k, c in pj.items()}

    # 躯干矢状面倾角（pelvis->chest 相对水平面），肘撑地上半身约抬 14°
    ax = pj["chest"] - pj["pelvis"]
    axn = ax / np.linalg.norm(ax)
    incl = math.degrees(math.asin(max(-1.0, min(1.0, axn[2]))))
    pen += ((incl - 14.0) / 3.0) ** 2
    parts["torso_incl"] = round(incl, 1)

    # 腿贴地后展：膝/踝不应高于髋太多
    hip_z = (rel["hip_L"] + rel["hip_R"]) / 2
    for j in ("knee_L", "knee_R"):
        pen += ((rel[j] - hip_z) / 0.035) ** 2
    for j in ("ankle_L", "ankle_R"):
        pen += ((rel[j] - (hip_z - 0.02)) / 0.035) ** 2
    # 大腿向后下压（髋->膝 指向世界 -Y 且略向下）
    thL = pj["knee_L"] - pj["hip_L"]
    thR = pj["knee_R"] - pj["hip_R"]
    for t in (thL, thR):
        tn = t / np.linalg.norm(t)
        pen += ((tn[1] + 0.965) / 0.05) ** 2      # 期望几乎纯 -Y，略微向下
        parts["thigh_dir_y"] = round(float(tn[1]), 3)

    # 上臂：肩->肘 应向前下方（+Y 前、-Z 下），把肘送到地面附近
    ueL = pj["elbow_L"] - pj["shoulder_L"]
    ueLn = ueL / np.linalg.norm(ueL)
    pen += ((ueLn[1] - 0.72) / 0.08) ** 2         # 前向分量
    pen += ((ueLn[2] + 0.68) / 0.08) ** 2         # 向下分量
    parts["upper_arm"] = (round(float(ueLn[1]), 2), round(float(ueLn[2]), 2))

    # 小臂：肘->腕 应向前上方抬起持机
    feL = pj["wrist_L"] - pj["elbow_L"]
    feLn = feL / np.linalg.norm(feL)
    pen += ((feLn[1] - 0.55) / 0.10) ** 2
    pen += ((feLn[2] - 0.80) / 0.10) ** 2
    parts["forearm"] = (round(float(feLn[1]), 2), round(float(feLn[2]), 2))

    # 肘接近地面（撑地点）
    for j in ("elbow_L", "elbow_R"):
        pen += ((rel[j] - 0.012) / 0.022) ** 2
        parts[j] = round(rel[j], 3)
    # 手腕抬高到胸前看手机
    for j in ("wrist_L", "wrist_R"):
        pen += ((rel[j] - 0.235) / 0.035) ** 2
        parts[j] = round(rel[j], 3)
    # 胸部高于髋（上半身撑起）
    pen += (((rel["chest"] - hip_z) - 0.115) / 0.03) ** 2
    parts["chest_lift"] = round(rel["chest"] - hip_z, 3)
    # 头颈：低头看手机 => head 略低于 chest 且在头前方
    pen += (((rel["chest"] - rel["head"]) - 0.055) / 0.03) ** 2
    parts["head_drop"] = round(rel["chest"] - rel["head"], 3)

    ank = (pj["ankle_L"] + pj["ankle_R"]) / 2
    pen += ((pj["head"][1] - ank[1] - 0.80) / 0.06) ** 2
    ws = float(np.linalg.norm(pj["wrist_L"] - pj["wrist_R"]))
    pen += ((ws - 0.170) / 0.030) ** 2
    parts["wrist_sep"] = round(ws, 3)
    mid_w = (pj["wrist_L"] + pj["wrist_R"]) / 2
    pen += ((mid_w[1] - 0.52) / 0.07) ** 2
    for a, b in (("elbow_L", "elbow_R"), ("wrist_L", "wrist_R"), ("hip_L", "hip_R")):
        pen += ((pj[a][2] - pj[b][2]) / 0.02) ** 2 * 0.5
    if verbose:
        print(f"score={pen:.1f}")
        for k in sorted(parts):
            print(f"   {k:12s} {parts[k]}")
    return pen


RANGES = {
    "spine": (0.0, 45.0), "chest": (0.0, 45.0), "neck": (-60.0, 5.0),
    "head": (-45.0, 20.0), "yaw": (0.0, 45.0),
    "hip": (-45.0, 10.0), "knee": (0.0, 80.0), "ankle": (0.0, 60.0),
    "shoulder": (20.0, 115.0), "arm_in": (0.0, 45.0), "elbow": (30.0, 145.0),
    "spread": (0.0, 25.0), "twist": (0.0, 45.0),
}


S0 = {
    "spine": 26.0, "chest": 22.0, "neck": -34.0, "head": -16.0, "yaw": 24.0,
    "hip": -12.0, "knee": 32.0, "ankle": 24.0,
    "shoulder": 52.0, "arm_in": 14.0, "elbow": 104.0,
    "spread": 8.0, "twist": 14.0,
}

if __name__ == "__main__":
    S = dict(S0)
    cur = score(S)
    print(f"start score={cur:.2f}")
    score(S, verbose=True)
    for st in (8.0, 3.0, 1.0, 0.4, 0.15):
        for _ in range(4):
            improved = False
            for k in RANGES:
                lo, hi = RANGES[k]
                base = S[k]
                best = (cur, base)
                for delta in (-st, st):
                    v_ = min(max(base + delta, lo), hi)
                    if abs(v_ - base) < 1e-9:
                        continue
                    S[k] = v_
                    v = score(S)
                    if v < best[0] - 1e-9:
                        best = (v, v_)
                S[k] = best[1]
                if best[0] < cur - 1e-9:
                    cur = best[0]
                    improved = True
            if not improved:
                break
        print(f"step={st} score={cur:.2f}  " + " ".join(f"{k}={S[k]:.1f}" for k in RANGES))
    print("=== final ===")
    score(S, verbose=True)
    D = expand(S)
    out = os.path.join(DIR, "证据", "FP-01-角度.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(D, f, ensure_ascii=False, indent=1)
    print("SAVED", out)
    print(json.dumps({k: round(v, 1) for k, v in D.items()}, ensure_ascii=False))
