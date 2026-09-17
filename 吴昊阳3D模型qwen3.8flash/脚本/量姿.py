# -*- coding: utf-8 -*-
"""姿势数值评估：不渲染，直接量化 贴地部件高度 / 躯干倾角 / 头脚朝向 / 双手间距。"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import skeleton as SK


def report():
    pj, zmin = SK.posed_joints_ground()
    print(f"zmin_before_ground={zmin:+.4f}")
    print("--- joints ---")
    for j in SK.ORDER:
        c = pj[j]
        print(f"{j:12s} ({c[0]:+.3f},{c[1]:+.3f},{c[2]:+.3f})")

    # 躯干轴：pelvis -> chest
    axis = pj["chest"] - pj["pelvis"]
    ax = axis / np.linalg.norm(axis)
    print(f"\ntorso_axis={np.round(ax,3)}  elevation_deg={math.degrees(math.asin(np.clip(ax[2],-1,1))):+.1f}")
    back = ax @ np.array([0, 0, 1.0])
    print(f"torso_up_component={back:+.3f} (趴姿应接近 0 => 躯干水平)")

    head_dir = pj["head"] - pj["pelvis"]
    hd = head_dir / np.linalg.norm(head_dir)
    print(f"head_dir={np.round(hd,3)} (应 +Y 为主、z 近 0)")

    ank = (pj["ankle_L"] + pj["ankle_R"]) / 2
    print(f"ankle_mid={np.round(ank,3)} foot_dir={np.round((ank-pj['pelvis'])/np.linalg.norm(ank-pj['pelvis']),3)} (应 -Y)")

    print("\n--- ground clearance (趴姿期望值) ---")
    exp = {
        "elbow_L": (0.06, 0.16), "elbow_R": (0.06, 0.16),
        "wrist_L": (0.14, 0.30), "wrist_R": (0.14, 0.30),
        "hip_L": (0.10, 0.24), "hip_R": (0.10, 0.24),
        "knee_L": (0.08, 0.22), "knee_R": (0.08, 0.22),
        "ankle_L": (0.05, 0.22), "ankle_R": (0.05, 0.22),
        "chest": (0.16, 0.34), "head": (0.10, 0.30),
    }
    bad = []
    for j, (lo, hi) in exp.items():
        z = pj[j][2]
        ok = lo <= z <= hi
        if not ok:
            bad.append(j)
        print(f"{'OK ' if ok else '!! '}{j:10s} z={z:+.3f} expect[{lo:.2f},{hi:.2f}]")

    print("\n--- symmetry / spread ---")
    for pair in (("shoulder_L", "shoulder_R"), ("elbow_L", "elbow_R"), ("wrist_L", "wrist_R")):
        a_, b_ = pj[pair[0]], pj[pair[1]]
        print(f"{pair[0]}/{pair[1]} span_x={abs(a_[0]-b_[0]):.3f} mid=({(a_+b_)[0]/2:+.3f},{(a_+b_)[1]/2:+.3f},{(a_+b_)[2]/2:+.3f})")
    ws = np.linalg.norm(pj["wrist_L"] - pj["wrist_R"])
    print(f"wrist separation={ws:.3f} (持手机期望 0.12~0.26)")
    sh_w_l = np.linalg.norm(pj["shoulder_L"] - pj["wrist_L"])
    print(f"shoulder->wrist L={sh_w_l:.3f} (骨长和上限 {SK.BONE_LEN['shoulder_L']+SK.BONE_LEN['elbow_L']+SK.BONE_LEN['wrist_L']:.3f})")

    zs = np.array([c[2] for c in pj.values()])
    print(f"\nz range [{zs.min():+.3f},{zs.max():+.3f}] max_clearance={zs.max():.3f}")
    ys = np.array([c[1] for c in pj.values()])
    print(f"y range [{ys.min():+.3f},{ys.max():+.3f}] total_len={ys.ptp() if hasattr(ys,'ptp') else (ys.max()-ys.min()):.3f}")
    print("RESULT:", "PASS" if not bad and 0.12 <= ws <= 0.26 else f"FAIL {bad} wrist_sep={ws:.3f}")


if __name__ == "__main__":
    report()
