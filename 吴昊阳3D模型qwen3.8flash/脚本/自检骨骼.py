# -*- coding: utf-8 -*-
"""skeleton.py 离线自检：骨长保持、关节落点、权重覆盖、朝向判定。"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import skeleton as SK


def main():
    PJ = SK.posed_joints()
    print("--- posed joints (world) ---")
    for j in SK.ORDER:
        c = PJ[j]
        print(f"{j:12s} ({c[0]:+.3f},{c[1]:+.3f},{c[2]:+.3f})")

    print("--- bone length preservation ---")
    worst = 0.0
    for j in SK.ORDER:
        p = SK.PARENT[j]
        if p is None:
            continue
        d0 = float(np.linalg.norm(SK.POS[j] - SK.POS[p]))
        d1 = float(np.linalg.norm(PJ[j] - PJ[p]))
        err = abs(d1 - d0) / max(d0, 1e-9)
        worst = max(worst, err)
        flag = "OK " if err < 0.02 else "!! "
        print(f"{flag}{p:>9s}->{j:<11s} rest={d0:.4f} posed={d1:.4f} err={err*100:.2f}%")
    assert worst < 0.02, f"BONE STRETCH {worst*100:.2f}%"

    # 朝向检查：局部 -Y = 背；局部 +Y = 胸/脸；局部 +Z = 头顶方向
    R = SK.R_PELVIS
    back_local = np.array([0.0, -1.0, 0.0])
    face_local = np.array([0.0, 1.0, 0.0])
    b = R @ back_local
    fa = R @ face_local
    print(f"back_dir(world)={np.round(b,3)} face_dir={np.round(fa,3)}")
    assert b[2] > 0.9, "背部未朝上"
    assert fa[2] < -0.9, "面部未朝下"

    # 头应在脚的前方(+Y)，且手在头附近、胸前
    hy = PJ["head"][1]
    ay = (PJ["ankle_L"][1] + PJ["ankle_R"][1]) / 2
    print(f"head y={hy:+.3f} ankle_mid y={ay:+.3f} -> head forward of feet: {hy > ay}")
    assert hy > ay, "头脚前后关系错误"
    for side in ("L", "R"):
        w = PJ["wrist_" + side]
        h = PJ["head"]
        print(f"wrist_{side} dist to head = {np.linalg.norm(w-h):.3f}")
        assert w[2] > 0.05, "手腕沉到地下"
        assert w[1] > 0, "手腕未在身体前方"

    # 高度：趴姿整体厚度（身体贴地）
    zs = np.array([c[2] for c in PJ.values()])
    print(f"joint z range [{zs.min():.3f},{zs.max():.3f}]")
    assert zs.min() >= -0.06, "关节穿地"

    # 权重覆盖：抽样网格盒内的点，检查零权重比例与主导骨合理性
    g = np.mgrid[-0.22:0.221:0.02, -0.10:0.121:0.02, 0.0:1.141:0.04].reshape(3, -1).T
    W, zero = SK.weights(g)
    print(f"grid samples={len(g)} zero_weight={int(zero.sum())} rowsum_err={np.abs(W.sum(1)-1).max():.2e}")
    assert int(zero.sum()) == 0, "存在零权重样本"
    prim = np.argmax(W, axis=1)
    cnt = {}
    for i, j in enumerate(SK.ORDER):
        cnt[j] = int((prim == i).sum())
    print("primary bone counts:", {k: v for k, v in cnt.items() if v})
    # 刚性检查：同一主骨内点对距离应保持
    rng = np.random.default_rng(1)
    MATS = SK.build_matrices()
    errs = {}
    for bi, j in enumerate(SK.ORDER):
        idx = np.where(prim == bi)[0]
        if len(idx) < 30 or j == "pelvis":
            continue
        sel = rng.choice(idx, size=min(160, len(idx)), replace=False)
        A = g[sel]
        B = SK.skin(A, MATS, W[sel])
        d0 = np.linalg.norm(A[:, None] - A[None], axis=-1)
        d1 = np.linalg.norm(B[:, None] - B[None], axis=-1)
        iu = np.triu_indices(len(sel), 1)
        e = np.abs(d1[iu] - d0[iu]) / np.maximum(d0[iu], 1e-6)
        errs[j] = float(e.max())
    for k, v in sorted(errs.items(), key=lambda kv: -kv[1]):
        print(f"{'OK ' if v < 0.02 else '!! '}{k:12s} intra-bone max_rel_err={v*100:.2f}%")
    ok = all(v < 0.02 for v in errs.values())
    # 全身刚体性：pelvis 主骨区域应完全刚性（躯干只做整体旋转）
    print("SELFTEST PASS" if ok else "SELFTEST FAIL")


if __name__ == "__main__":
    main()
