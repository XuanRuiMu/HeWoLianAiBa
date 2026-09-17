# -*- coding: utf-8 -*-
"""解析式求解趴姿角度：躯干/头颈用几何推导，四肢用两连杆 IK。
坐标系：模型面朝 +Y、背朝 -Y、上为 +Z；根 R_x(-90) 后局部+Z(肢体末端方向)->世界+Y。
"""
import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import skeleton as SK

DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d2r = math.radians
r2d = math.degrees


def two_link(l1, l2, target):
    """平面两连杆 IK：给定肩/髋在原点、目标点 (x_forward, z_up)，求 (a1,a2) 度。
    a1 = 上段相对水平前方(+F)的下倾角(正=向下)；a2 = 下段相对上段的折角(正=向后上)。"""
    F, U = target
    d = math.hypot(F, U)
    d = min(d, l1 + l2 - 1e-6)
    d = max(d, abs(l1 - l2) + 1e-6)
    # 余弦定理：上段与"指向目标的连线"夹角
    cos_a = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)
    cos_a = max(-1.0, min(1.0, cos_a))
    alpha = math.acos(cos_a)
    beta = math.atan2(U, F)                      # 目标方向仰角
    th1 = beta + alpha                           # 上段仰角（相对 +F）
    # 下段
    e = np.array([F, U]) - l1 * np.array([math.cos(th1), math.sin(th1)])
    th2 = math.atan2(e[1], e[0])
    return r2d(th1), r2d(th2)


def solve():
    D = dict(SK.DEFAULT_DEG)

    # ---------- 躯干：让胸比髋高约 0.09（肘撑地上半身微抬），脊柱轴近似水平 ----------
    # spine/chest 各绕局部 Y 正角 = 局部+Z(向头) 转向世界 +Z(上)？实测：局部 Y 正角使躯干前倾
    # 直接用数值扫描这两个量 + neck/head，找 torso_z 与 head 高度达标
    best = None
    for sp in np.arange(0, 30, 1.0):
        for ch in np.arange(0, 30, 1.0):
            D["spine"], D["chest"] = float(sp), float(ch)
            own = SK.OWN_from_deg(D)
            pj, _ = SK.posed_joints_ground(own)
            hip_z = (pj["hip_L"][2] + pj["hip_R"][2]) / 2
            chest_z = pj["chest"][2]
            ax = pj["chest"] - pj["pelvis"]
            axn = ax / np.linalg.norm(ax)
            score = ((chest_z - hip_z - 0.075) / 0.01) ** 2 + ((abs(axn[2]) - 0.0) / 0.02) ** 2
            if best is None or score < best[0]:
                best = (score, float(sp), float(ch), chest_z - hip_z, axn[2])
    _, D["spine"], D["chest"], dz, tz = best
    print(f"[torso] spine={D['spine']:.1f} chest={D['chest']:.1f} chest-hip={dz:+.3f} torso_z={tz:+.3f}")

    own = SK.OWN_from_deg(D)
    pj_raw = SK.posed_joints(own)
    # ---------- 手臂两连杆 IK（在矢状面内：前后=Y, 上下=Z） ----------
    # 目标：肘在肩的下方偏前、腕在肘的前上方靠近胸前中线
    sh = pj_raw["shoulder_L"]
    l_up = SK.BONE_LEN["shoulder_L"]
    l_fore = SK.BONE_LEN["elbow_L"]
    print(f"[arm] upper={l_up:.3f} fore={l_fore:.3f} shoulder=({sh[1]:+.3f},{sh[2]:+.3f})")
    # 期望肘：肩前方 0.10、下方 0.30（撑地）；腕：肘前方 0.16、上方 0.24
    for side, sgn in (("L", 1), ("R", 1)):
        tgt_elbow = np.array([0.10, -0.30])       # (forward +Y, up +Z) 相对肩
        elbow_pos = sh[:1] * 0 + np.array([sh[1], sh[2]]) + tgt_elbow
        tgt_wrist_rel = np.array([0.17, 0.235])   # 相对肘
        wrist_pos = elbow_pos + tgt_wrist_rel
        # 反推：上段仰角 th1（相对 +Y 水平，正=向上），下段折角
        th1 = math.degrees(math.atan2(tgt_elbow[1], tgt_elbow[0]))
        e = tgt_wrist_rel
        th2 = math.degrees(math.atan2(e[1], e[0]))
        # shoulder 局部 X 角 = 90 - th1（局部+Z 初始指向世界 -Z，即 th1=-90）
        D["shoulder_" + side] = -90.0 - th1
        D["elbow_" + side] = th1 - th2
        print(f"[arm{side}] th1={th1:+.1f} th2={th2:+.1f} -> shoulder={D['shoulder_'+side]:+.1f} elbow={D['elbow_'+side]:+.1f}")

    # ---------- 腿两连杆 IK ----------
    hip = pj_raw["hip_L"]
    l_th = SK.BONE_LEN["hip_L"]
    l_sh = SK.BONE_LEN["knee_L"]
    print(f"[leg] thigh={l_th:.3f} shin={l_sh:.3f} hip=({hip[1]:+.3f},{hip[2]:+.3f})")
    for side in ("L", "R"):
        tgt_knee = np.array([-0.24, -0.03])      # 膝在髋的后方、略低
        tgt_ankle_rel = np.array([-0.20, -0.02])
        th1 = math.degrees(math.atan2(tgt_knee[1], tgt_knee[0]))
        e = tgt_ankle_rel
        th2 = math.degrees(math.atan2(e[1], e[0]))
        # hip 局部 X 角：局部+Z 初始指向世界 -Y(th1=0)；正角转向上 => 需 -th1... 实测标定
        D["hip_pitch_" + side] = th1
        D["knee_" + side] = th2 - th1
        print(f"[leg{side}] th1={th1:+.1f} th2={th2:+.1f} -> hip={D['hip_pitch_'+side]:+.1f} knee={D['knee_'+side]:+.1f}")

    D["neck"] = -26.0
    D["head"] = -12.0
    D["ankle_L"] = 22.0
    D["ankle_R"] = 26.0
    D["hip_spread_L"] = 8.0
    D["hip_spread_R"] = -9.0
    D["arm_in_L"] = 14.0
    D["arm_in_R"] = 14.0
    D["yaw"] = 22.0

    own = SK.OWN_from_deg(D)
    pj, zmin = SK.posed_joints_ground(own)
    print("\n--- solved joints (grounded) ---")
    for j in SK.ORDER:
        print(f"{j:12s} ({pj[j][0]:+.3f},{pj[j][1]:+.3f},{pj[j][2]:+.3f})")
    ank = (pj["ankle_L"] + pj["ankle_R"]) / 2
    print(f"\nhead_y={pj['head'][1]:+.3f} ankle_y={ank[1]:+.3f} span={pj['head'][1]-ank[1]:.3f}")
    print(f"wrist_sep={np.linalg.norm(pj['wrist_L']-pj['wrist_R']):.3f}")
    zs = np.array([c[2] for c in pj.values()])
    print(f"z range [{zs.min():+.3f},{zs.max():+.3f}]")
    out = os.path.join(DIR, "证据", "FP-01-角度.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(D, f, ensure_ascii=False, indent=1)
    print("SAVED", out)


if __name__ == "__main__":
    solve()
