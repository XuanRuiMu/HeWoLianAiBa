# -*- coding: utf-8 -*-
"""对偶四元数蒙皮核心（纯 numpy，不依赖 mathutils 约定）。
dq 布局: [rx, ry, rz, rw, dx, dy, dz, dw]
变换: v' = rot(v, r) + t,  t = 2*(rw*d_vec - dw*r_vec + cross(r_vec, d_vec))
"""
import numpy as np


def quat_from_matrix(R):
    """R: (3,3) 正交阵 -> 单位四元数 (x,y,z,w)，满足 v_rot = qrot(v, q)"""
    R = np.asarray(R, dtype=np.float64)
    tr = R[0, 0] + R[1, 1] + R[2, 2]
    if tr > 0:
        s = np.sqrt(tr + 1.0) * 2
        w = 0.25 * s
        x = (R[2, 1] - R[1, 2]) / s
        y = (R[0, 2] - R[2, 0]) / s
        z = (R[1, 0] - R[0, 1]) / s
    elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]:
        s = np.sqrt(1.0 + R[0, 0] - R[1, 1] - R[2, 2]) * 2
        w = (R[2, 1] - R[1, 2]) / s
        x = 0.25 * s
        y = (R[0, 1] + R[1, 0]) / s
        z = (R[0, 2] + R[2, 0]) / s
    elif R[1, 1] > R[2, 2]:
        s = np.sqrt(1.0 + R[1, 1] - R[0, 0] - R[2, 2]) * 2
        w = (R[0, 2] - R[2, 0]) / s
        x = (R[0, 1] + R[1, 0]) / s
        y = 0.25 * s
        z = (R[1, 2] + R[2, 1]) / s
    else:
        s = np.sqrt(1.0 + R[2, 2] - R[0, 0] - R[1, 1]) * 2
        w = (R[1, 0] - R[0, 1]) / s
        x = (R[0, 2] + R[2, 0]) / s
        y = (R[1, 2] + R[2, 1]) / s
        z = 0.25 * s
    q = np.array([x, y, z, w], dtype=np.float64)
    return q / np.linalg.norm(q)


def euler_to_matrix(e, order='XYZ'):
    """e=(ex,ey,ez) 弧度；与 mathutils.Euler(order).to_matrix() 同义：R = Rz? 采用 X@Y@Z 复合"""
    def mx(a):
        c, s = np.cos(a), np.sin(a)
        return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], dtype=np.float64)

    def my(a):
        c, s = np.cos(a), np.sin(a)
        return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]], dtype=np.float64)

    def mz(a):
        c, s = np.cos(a), np.sin(a)
        return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], dtype=np.float64)

    # Blender XYZ 欧拉：先绕 X 再绕 Y 再绕 Z（应用顺序 v' = Rz*Ry*Rx*v）
    return mz(e[2]) @ my(e[1]) @ mx(e[0])


def mat_to_dq(M):
    M = np.asarray(M, dtype=np.float64)
    r = quat_from_matrix(M[:3, :3])
    t = M[:3, 3]
    tr = np.array([t[0], t[1], t[2], 0.0], dtype=np.float64)

    def qmul(a, b):
        ax, ay, az, aw = a
        bx, by, bz, bw = b
        return np.array([
            aw * bx + ax * bw + ay * bz - az * by,
            aw * by - ax * bz + ay * bw + az * bx,
            aw * bz + ax * by - ay * bx + az * bw,
            aw * bw - ax * bx - ay * by - az * bz])

    d = 0.5 * qmul(tr, r)
    return np.concatenate([r, d])


def qrot(pts, q):
    x, y, z, w = q[:, 0], q[:, 1], q[:, 2], q[:, 3]
    vx, vy, vz = pts[:, 0], pts[:, 1], pts[:, 2]
    tx = 2 * (y * vz - z * vy)
    ty = 2 * (z * vx - x * vz)
    tz = 2 * (x * vy - y * vx)
    return np.column_stack([
        vx + w * tx + (y * tz - z * ty),
        vy + w * ty + (z * tx - x * tz),
        vz + w * tz + (x * ty - y * tx)])


def apply_dq(pts, D):
    pts = np.asarray(pts, dtype=np.float64)
    D = np.atleast_2d(np.asarray(D, dtype=np.float64))
    if D.shape[0] == 1 and len(pts) != 1:
        D = np.repeat(D, len(pts), axis=0)
    rx, ry, rz, rw = D[:, 0], D[:, 1], D[:, 2], D[:, 3]
    dx, dy, dz, dw = D[:, 4], D[:, 5], D[:, 6], D[:, 7]
    out = qrot(pts, D[:, :4])
    cx = ry * dz - rz * dy
    cy = rz * dx - rx * dz
    cz = rx * dy - ry * dx
    out[:, 0] += 2 * (rw * dx - dw * rx + cx)
    out[:, 1] += 2 * (rw * dy - dw * ry + cy)
    out[:, 2] += 2 * (rw * dz - dw * rz + cz)
    return out


def normalize_blend(B):
    B = np.array(B, dtype=np.float64)
    n = np.linalg.norm(B[:, :4], axis=1)
    n[n <= 1e-12] = 1.0
    B[:, :4] /= n[:, None]
    B[:, 4:] /= n[:, None]
    return B


if __name__ == "__main__":
    E = np.deg2rad
    cases = []
    for e in [(0, 0, 90), (30, -20, 55), (90, 0, 0), (0, 45, 0), (-70, 15, 130)]:
        R = euler_to_matrix(tuple(E(x) for x in e))
        T = [1.5, -2.0, 3.25]
        M = np.eye(4); M[:3, :3] = R; M[:3, 3] = T
        D = mat_to_dq(M)
        p = np.array([[1., 0, 0], [0, 1., 0], [0, 0, 1.], [0.3, -0.7, 1.1]])
        got = apply_dq(p, D)
        exp = (M @ np.hstack([p, np.ones((len(p), 1))]).T).T[:, :3]
        ok = np.allclose(got, exp, atol=1e-9)
        print("case", e, "OK" if ok else "FAIL")
        if not ok:
            print(" got", got[0], "exp", exp[0])
        cases.append(ok)
    I = mat_to_dq(np.eye(4))
    p = np.array([[1., 2., 3.]])
    assert np.allclose(apply_dq(p, I), p, atol=1e-12), "IDENTITY FAIL"
    M2 = np.eye(4); M2[:3, 3] = [5, 0, 0]
    B = normalize_blend(np.array([0.0 * I + 1.0 * mat_to_dq(M2)]))
    assert np.allclose(apply_dq(p, B), p + np.array([5.0, 0, 0]), atol=1e-9), "BLEND FAIL"
    assert all(cases), "ROT+TRANS FAIL"
    print("DQ SELFTEST OK")
