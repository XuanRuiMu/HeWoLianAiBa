# -*- coding: utf-8 -*-
"""FP-01 骨骼定义 + 前向运动学(FK) + 线性蒙皮混合(LBS)。
关节坐标全部来自 脚本/几何标定.py 的实测结果（模型面朝 +Y，上为 +Z，身高 1.134）。
纯 numpy，可离线自检。
"""
import math

import numpy as np

d2r = math.radians

# ---------------- 静止姿态关节（实测） ----------------
REST = {
    "pelvis":     (0.000, -0.005, 0.520),
    "spine":      (0.000, -0.005, 0.660),
    "chest":      (0.000, -0.010, 0.800),
    "neck":       (0.000, -0.010, 0.955),
    "head":       (0.000, +0.010, 1.020),

    "clav_L":     (-0.070, -0.010, 0.915),
    "shoulder_L": (-0.150, -0.010, 0.900),
    "elbow_L":    (-0.198, -0.010, 0.700),
    "wrist_L":    (-0.200, -0.010, 0.510),

    "clav_R":     (+0.070, -0.010, 0.915),
    "shoulder_R": (+0.150, -0.010, 0.900),
    "elbow_R":    (+0.198, -0.010, 0.700),
    "wrist_R":    (+0.200, -0.010, 0.510),

    "hip_L":      (-0.085, -0.005, 0.500),
    "knee_L":     (-0.085, -0.010, 0.280),
    "ankle_L":    (-0.085, -0.010, 0.075),

    "hip_R":      (+0.085, -0.005, 0.500),
    "knee_R":     (+0.085, -0.010, 0.280),
    "ankle_R":    (+0.085, -0.010, 0.075),
}
ORDER = list(REST.keys())
POS = {k: np.array(REST[k], dtype=np.float64) for k in ORDER}
PARENT = {
    "pelvis": None, "spine": "pelvis", "chest": "spine", "neck": "chest", "head": "neck",
    "clav_L": "chest", "shoulder_L": "clav_L", "elbow_L": "shoulder_L", "wrist_L": "elbow_L",
    "clav_R": "chest", "shoulder_R": "clav_R", "elbow_R": "shoulder_R", "wrist_R": "elbow_R",
    "hip_L": "pelvis", "knee_L": "hip_L", "ankle_L": "knee_L",
    "hip_R": "pelvis", "knee_R": "hip_R", "ankle_R": "knee_R",
}
BONE_LEN = {}
for _j in ORDER:
    _p = PARENT[_j]
    BONE_LEN[_j] = 0.30 if _p is None else float(np.linalg.norm(POS[_j] - POS[_p]))

# 每骨影响半径（沿骨轴方向用 t 参数控制，横向用 r）
R_RAD = {
    "pelvis": 0.16, "spine": 0.15, "chest": 0.16, "neck": 0.085, "head": 0.16,
    "clav_L": 0.10, "shoulder_L": 0.11, "elbow_L": 0.10, "wrist_L": 0.11,
    "clav_R": 0.10, "shoulder_R": 0.11, "elbow_R": 0.10, "wrist_R": 0.11,
    "hip_L": 0.13, "knee_L": 0.11, "ankle_L": 0.11,
    "hip_R": 0.13, "knee_R": 0.11, "ankle_R": 0.11,
}


def rot_x(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], dtype=np.float64)


def rot_y(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]], dtype=np.float64)


def rot_z(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], dtype=np.float64)


def euler(e):
    """Blender XYZ 约定：v' = Rz*Ry*Rx*v"""
    return rot_z(e[2]) @ rot_y(e[1]) @ rot_x(e[0])


# ---------------- 目标姿势（趴地持手机） ----------------
# 实测轴向标定结果（脚本/轴向标定.py）：
#   模型面朝 +Y、背朝 -Y、上为 +Z。
#   根 R_x(-90°)：localX->world+X, localY->world-Z, localZ->world+Y。
#   躯干骨 pelvis->spine->chest->neck 沿局部 +Z（根变换后指向世界 +Y = 头方向）。
#   四肢骨（肩->肘->腕、髋->膝->踝）在静止姿态沿世界 -Z，即指向其自身局部 -Z；
#   因此俯仰摆动必须绕"局部 Y"轴：Ry(+) 使末端由下转向世界 +Y（头方向），Ry(-) 转向 -Y（脚方向）。
R_PELVIS = euler((d2r(-90), 0, 0))

# 可调角度表（度）
# 可调角度表（度）。左右对称（基准 2D 图为对称姿势），由 脚本/量姿.py 数值校核。
DEFAULT_DEG = {
    "yaw": 24.0,           # 整体绕世界 Z 偏航（对齐 2D 图斜向构图）
    # 躯干：绕局部 Y 正角 => 上半身向头方向抬起（肘撑地反弓）
    "spine": 26.0,
    "chest": 22.0,
    "neck": -34.0,         # 低头看手机
    "head": -16.0,
    "head_turn": -10.0,
    # 腿：绕局部 Y 负角 => 大腿向后(-Y world)贴地伸展；膝正角 => 小腿向后上翘
    "hip_L": -10.0,
    "hip_R": -14.0,
    "hip_spread_L": 7.0,
    "hip_spread_R": -9.0,
    "knee_L": 26.0,
    "knee_R": 38.0,
    "ankle_L": 22.0,
    "ankle_R": 26.0,
    # 手臂：绕局部 Y 正角 => 上臂由垂直向下摆向头前(+Y)，肘撑地
    "shoulder_L": 52.0,
    "shoulder_R": 52.0,
    "arm_in_L": 14.0,      # 肘内收让双手靠拢
    "arm_in_R": 14.0,
    "elbow_L": 104.0,      # 屈肘把小臂折回胸前上方持机
    "elbow_R": 104.0,
    "fore_twist_L": -14.0,
    "fore_twist_R": 14.0,
}


def OWN_from_deg(D):
    """由角度表构造各骨自身旋转矩阵。
    轴向经 脚本/测躯干轴.py 实测确认：
      * 躯干骨 spine/chest/neck 沿局部 +Z，俯仰绕**局部 X**（+角 = 胸部端抬向世界上方）。
        绕局部 Y 完全无效（实测 incl 不变），因 Blender XYZ 序中 Z 为最内层。
      * head 用 X=低头、Y=左右转头。
      * 四肢骨静止时指向世界 -Z（即自身局部 -Z），俯仰绕**局部 Y**：Ry(+) 末端转向世界 +Y(头方向)。
    """
    return {
        "pelvis": euler((d2r(-90), 0, d2r(D["yaw"]))),
        "spine": euler((d2r(D["spine"]), 0, 0)),
        "chest": euler((d2r(D["chest"]), 0, 0)),
        "neck": euler((d2r(D["neck"]), 0, 0)),
        "head": euler((d2r(D["head"]), d2r(D["head_turn"]), 0)),

        "clav_L": np.eye(3),
        "shoulder_L": euler((0, d2r(D["shoulder_L"]), d2r(-D["arm_in_L"]))),
        "elbow_L": euler((0, d2r(D["elbow_L"]), 0)),
        "wrist_L": euler((0, 0, d2r(D["fore_twist_L"]))),

        "clav_R": np.eye(3),
        "shoulder_R": euler((0, d2r(D["shoulder_R"]), d2r(D["arm_in_R"]))),
        "elbow_R": euler((0, d2r(D["elbow_R"]), 0)),
        "wrist_R": euler((0, 0, d2r(D["fore_twist_R"]))),

        "hip_L": euler((0, d2r(D["hip_L"]), d2r(D["hip_spread_L"]))),
        "knee_L": euler((0, d2r(D["knee_L"]), 0)),
        "ankle_L": euler((0, d2r(D["ankle_L"]), 0)),

        "hip_R": euler((0, d2r(D["hip_R"]), d2r(D["hip_spread_R"]))),
        "knee_R": euler((0, d2r(D["knee_R"]), 0)),
        "ankle_R": euler((0, d2r(D["ankle_R"]), 0)),
    }


OWN = OWN_from_deg(DEFAULT_DEG)


# 每骨的旋转枢轴 = 该骨段的**近端**关节（骨骼绑定惯例：骨从近端关节向外延伸）
PIVOT = {j: (PARENT[j] or j) for j in ORDER}


def world_mats(own=None):
    """标准骨骼绑定 FK：M[j] = M[parent(j)] ∘ RotAbout(pivot_j)。
    骨 j 从近端关节 pivot_j 向远端 POS[j] 延伸，故绕 pivot_j 旋转：
      * 保持 pivot_j 及其上游不动；
      * 带动 POS[j]（该骨远端 = 子骨近端）与其全部 descendants。
    因此骨长严格保持、链不断裂，且每个角度都真实生效。"""
    if own is None:
        own = OWN
    M = {}
    for j in ORDER:
        p = PARENT[j]
        r = own.get(j, np.eye(3))
        pv = POS[PIVOT[j]]
        piv = np.eye(4)
        piv[:3, 3] = pv
        ipiv = np.eye(4)
        ipiv[:3, 3] = -pv
        local = np.eye(4)
        local[:3, :3] = r
        if p is None:
            m = piv @ local @ ipiv
            # 根：再整体平移使 pelvis 回到原位
            t = np.eye(4)
            t[:3, 3] = POS[j] - m[:3, :3] @ POS[j]
            M[j] = t @ m
        else:
            M[j] = M[p] @ piv @ local @ ipiv
    return M


def posed_joints(own=None):
    """变形后的关节世界坐标。
    与蒙皮严格一致：顶点/关节 j 归属骨段 (parent->j)，其变换为 M[j]，
    而 M[j] 已包含父链累积，因此直接对 POS[j] 施加 M[j] 即得 j 的新位置。
    （绕近端枢轴旋转保持 pivot 不动、带动远端 POS[j]，故骨长守恒。）"""
    M = world_mats(own)
    out = {}
    for j in ORDER:
        m = M[j]
        out[j] = m[:3, :3] @ POS[j] + m[:3, 3]
    return out


def posed_joints_ground(own=None):
    """落地版：整体下移使最低关节贴地（z=0）。"""
    pj = posed_joints(own)
    zmin = min(c[2] for c in pj.values())
    return {k: v - np.array([0.0, 0.0, zmin]) for k, v in pj.items()}, zmin


def weights(pts):
    """静止姿态蒙皮权重。
    每个顶点按"到骨段轴线的距离 + 轴向参数 t"归属骨段；关节邻域两段各 0.5 平滑过渡。
    旋转矩阵 M_j 已是链上累积变换，平移由 LBS 自动带入，因此不会产生额外拉伸。
    """
    N = len(pts)
    idx = {j: i for i, j in enumerate(ORDER)}
    raw = np.zeros((N, len(ORDER)), dtype=np.float64)
    rows_all = np.arange(N)
    assigned = np.zeros(N, dtype=bool)
    for j in ORDER:
        p = PARENT[j]
        if p is None:
            continue
        a, b = POS[j], POS[p]
        ab = a - b
        L = float(np.linalg.norm(ab))
        u = ab / L
        rel = pts - b
        t = (rel @ u) / L
        d_perp = np.linalg.norm(rel - np.outer(t * L, u), axis=1)
        r = R_RAD[j]
        core = (t >= 0.0) & (t <= 1.0) & (d_perp < r) & (~assigned)
        raw[:, idx[j]] += np.where(core, 1.0, 0.0)
        assigned |= core
    # 未归属（躯干主体、头、末端超出半径的点）：按最近骨段分配
    un = ~assigned
    if un.any():
        P = pts[un]
        best_d = np.full(len(P), np.inf)
        best_j = np.zeros(len(P), dtype=np.int64)
        for j in ORDER:
            p = PARENT[j]
            if p is None:
                continue
            a, b = POS[j], POS[p]
            ab = a - b
            L2 = float(ab @ ab)
            L = math.sqrt(L2)
            u = ab / L
            rel = P - b
            tt = np.clip((rel @ u) / L, 0.0, 1.0)
            d = np.linalg.norm(P - (b + np.outer(tt, ab)), axis=1)
            m = d < best_d
            best_d[m] = d[m]
            best_j[m] = idx[j]
        rows = np.where(un)[0]
        hit = best_d < np.inf
        raw[rows[hit], best_j[hit]] += 1.0
    s = raw.sum(axis=1)
    empty = s <= 1e-12
    raw[empty, idx["pelvis"]] = 1.0
    s = raw.sum(axis=1)
    return raw / s[:, None], empty


def build_matrices():
    M = world_mats()
    return np.stack([M[j] for j in ORDER])                      # (J,4,4)


def skin(pts, MATS=None, W=None):
    """线性蒙皮混合：out = sum_j w_j * (M_j @ p)"""
    if MATS is None:
        MATS = build_matrices()
    if W is None:
        W, _ = weights(pts)
    hom = np.hstack([pts, np.ones((len(pts), 1))])
    out = np.einsum('nj,jab,nb->na', W, MATS, hom)
    return out[:, :3]
