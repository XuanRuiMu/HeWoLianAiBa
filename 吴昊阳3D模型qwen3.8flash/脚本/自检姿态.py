# -*- coding: utf-8 -*-
"""姿态场自检：21 关节 dq 蒙皮，检查刚体性（骨长保持）与权重覆盖。纯 numpy，可离线跑。"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dqskin import mat_to_dq, apply_dq, normalize_blend, euler_to_matrix

d2r = math.radians
SC0 = 1.70

J_RAW = {
    "pelvis": (0.0, -0.020, 1.060),
    "waist": (0.0, -0.010, 1.200),
    "chest": (0.0, -0.010, 1.400),
    "neck": (0.0, -0.010, 1.600),
    "head": (0.006, 0.024, 1.760),
    "shoulder_L": (-0.250, -0.010, 1.545), "shoulder_R": (0.250, -0.010, 1.545),
    "elbow_L": (-0.305, -0.010, 1.230), "elbow_R": (0.305, -0.010, 1.230),
    "wrist_L": (-0.300, 0.000, 0.960), "wrist_R": (0.300, 0.000, 0.960),
    "hand_L": (-0.295, 0.010, 0.870), "hand_R": (0.295, 0.010, 0.870),
    "hip_L": (-0.125, -0.010, 1.020), "hip_R": (0.125, -0.010, 1.020),
    "knee_L": (-0.128, 0.055, 0.650), "knee_R": (0.128, 0.055, 0.650),
    "ankle_L": (-0.128, -0.036, 0.180), "ankle_R": (0.128, -0.036, 0.180),
    "toe_L": (-0.128, 0.150, 0.020), "toe_R": (0.128, 0.150, 0.020),
}
NAMES = list(J_RAW.keys())
PARENT = {
    "pelvis": None, "waist": "pelvis", "chest": "waist", "neck": "chest", "head": "neck",
    "shoulder_L": "chest", "elbow_L": "shoulder_L", "wrist_L": "elbow_L", "hand_L": "wrist_L",
    "shoulder_R": "chest", "elbow_R": "shoulder_R", "wrist_R": "elbow_R", "hand_R": "wrist_R",
    "hip_L": "pelvis", "knee_L": "hip_L", "ankle_L": "knee_L", "toe_L": "ankle_L",
    "hip_R": "pelvis", "knee_R": "hip_R", "ankle_R": "knee_R", "toe_R": "ankle_R",
}
RAD = {
    "pelvis": 10.0, "waist": 0.26, "chest": 0.30, "neck": 0.14, "head": 0.24,
    "shoulder_L": 0.32, "elbow_L": 0.34, "wrist_L": 0.16, "hand_L": 0.15,
    "shoulder_R": 0.32, "elbow_R": 0.34, "wrist_R": 0.16, "hand_R": 0.15,
    "hip_L": 0.40, "knee_L": 0.48, "ankle_L": 0.20, "toe_L": 0.16,
    "hip_R": 0.40, "knee_R": 0.48, "ankle_R": 0.20, "toe_R": 0.16,
}


def make_own_euler(P):
    def own(name):
        if name == "pelvis":
            return (d2r(P["pitch"]), 0, d2r(P["yaw"]))
        if name == "waist":
            return (d2r(P["torso"]), 0, 0)
        if name == "neck":
            return (d2r(P["head"]), 0, 0)
        if name.startswith("shoulder_"):
            s = name[-1]; return (d2r(P["sh_x" + s]), d2r(P["sh_y" + s]), d2r(P["sh_z" + s]))
        if name.startswith("elbow_"):
            s = name[-1]; return (d2r(P["el_x" + s]), 0, 0)
        if name.startswith("hip_"):
            s = name[-1]; return (d2r(P["hip_x" + s]), 0, d2r(P["hip_z" + s]))
        if name.startswith("knee_"):
            s = name[-1]; return (d2r(P["kn_x" + s]), 0, 0)
        if name.startswith("ankle_"):
            s = name[-1]; return (d2r(P["an_x" + s]), 0, 0)
        return (0, 0, 0)
    return own


PATHS = {}
for _n in NAMES:
    _p = []; _c = _n
    while _c is not None:
        _p.append(_c); _c = PARENT[_c]
    PATHS[_n] = list(reversed(_p))

NP_J = {n: np.array(J_RAW[n], dtype=np.float64) * SC0 for n in NAMES}


def build(P):
    own = make_own_euler(P)
    DQ = {}
    for name in NAMES:
        m = np.eye(4)
        for n in PATHS[name]:
            R = euler_to_matrix(own(n))
            rr = np.eye(4); rr[:3, :3] = R
            p = NP_J[n]
            piv = np.eye(4); piv[:3, 3] = p
            ipiv = np.eye(4); ipiv[:3, 3] = -p
            m = piv @ rr @ ipiv @ m
        DQ[name] = mat_to_dq(m)
    return np.stack([DQ[n] for n in NAMES])


def weights(pts):
    N = len(pts)
    W = np.empty((N, len(NAMES)))
    for i, n in enumerate(NAMES):
        a = NP_J[n]; pn = PARENT[n]
        if pn is None:
            d = np.linalg.norm(pts - a, axis=1)
        else:
            b = NP_J[pn]; ab = b - a
            L2 = float(ab @ ab)
            t = np.clip((pts - a) @ ab / L2, 0.0, 1.0)
            d = np.linalg.norm(pts - (a + np.outer(t, ab)), axis=1)
        r = RAD[n]
        W[:, i] = np.where(d < r, (1.0 - d / r) ** 2, 0.0)
    s = W.sum(axis=1)
    return W, s


def deform(pts, DQS):
    W, raw = weights(pts)
    zero = raw <= 1e-12
    Wn = W.copy()
    Wn[zero] = 0.0
    Wn[zero, 0] = 1.0
    s = Wn.sum(axis=1)
    Wn /= s[:, None]
    I = np.tile(mat_to_dq(np.eye(4)), (len(NAMES), 1))
    B = np.einsum('nb,bk->nk', Wn, DQS)
    Bi = np.einsum('nb,bk->nk', Wn, I)
    flip = (B * Bi).sum(axis=1) < 0
    B[flip] *= -1.0
    B = normalize_blend(B)
    return apply_dq(pts, B), Wn, zero


if __name__ == "__main__":
    P = {
        "pitch": 90.0, "yaw": 24.0, "torso": -6.0, "head": -32.0,
        "sh_xL": 6.0, "sh_xR": 6.0, "sh_yL": 62.0, "sh_yR": 62.0, "sh_zL": -18.0, "sh_zR": 18.0,
        "el_xL": -95.0, "el_xR": -95.0,
        "hip_xL": -8.0, "hip_xR": -8.0, "hip_zL": 9.0, "hip_zR": -9.0,
        "kn_xL": 24.0, "kn_xR": 30.0, "an_xL": -70.0, "an_xR": -70.0,
    }
    DQS = build(P)
    # 采样网格：包围盒内规则点阵
    g = np.mgrid[-0.4:0.4:0.02, -0.2:0.25:0.02, 0.0:1.95:0.05].reshape(3, -1).T * SC0
    out, Wn, zero = deform(g, DQS)
    print(f"samples={len(g)} zero_weight={(zero).sum()}")
    # 刚体性检查：同一主骨内的点对，变形前后距离应保持
    primary = np.argmax(Wn, axis=1)
    maxerr = {}
    rng = np.random.default_rng(0)
    for bi, n in enumerate(NAMES):
        idx = np.where(primary == bi)[0]
        if len(idx) < 20 or n == "pelvis":
            continue
        sel = rng.choice(idx, size=min(400, len(idx)), replace=False)
        A = g[sel]; B_ = out[sel]
        d0 = np.linalg.norm(A[:, None] - A[None, :], axis=-1)
        d1 = np.linalg.norm(B_[:, None] - B_[None, :], axis=-1)
        iu = np.triu_indices(len(sel), 1)
        e = np.abs(d1[iu] - d0[iu]) / np.maximum(d0[iu], 1e-6)
        maxerr[n] = (float(e.max()), float(np.median(e)))
    for n, v in sorted(maxerr.items(), key=lambda kv: -kv[1][0]):
        print(f"{n:14s} max_rel_err={v[0]*100:6.2f}%  median={v[1]*100:5.2f}%")
    print("--- posed joint positions ---")
    jp, _, _ = deform(np.array([J_RAW[x] for x in NAMES]) * SC0, DQS)
    for nm, c in zip(NAMES, jp):
        print(f"{nm:12s} ({c[0]/SC0:+.3f},{c[1]/SC0:+.3f},{c[2]/SC0:+.3f})")
