import numpy as np, mathutils
def qmul(a,b):
    ax,ay,az,aw=a; bx,by,bz,bw=b
    return np.array([aw*bx+ax*bw+ay*bz-az*by, aw*by-ax*bz+ay*bw+az*bx, aw*bz+ax*by-ay*bx+az*bw, aw*bw-ax*bx-ay*by-az*bz])
def rot(v,q_):
    x,y,z,w=q_; vx,vy,vz=v[:,0],v[:,1],v[:,2]
    tx=2*(y*vz-z*vy); ty=2*(z*vx-x*vz); tz=2*(x*vy-y*vx)
    return np.column_stack([vx+w*tx+(y*tz-z*ty), vy+w*ty+(z*tx-x*tz), vz+w*tz+(x*ty-y*tx)])
R=np.array(mathutils.Euler((0,0,np.pi/2),'XYZ').to_matrix(),dtype=np.float64)
M=np.eye(4); M[:3,:3]=R; M[:3,3]=[1,2,3]
# Blender 约定: R = q.to_matrix() == 用 -q 作用到 v 上（本环境实测）
qneg = -np.array(mathutils.Matrix(R).to_quaternion(),dtype=np.float64)
p=np.array([[1.,0,0],[0,1.,0],[0,0,1.]])
print("rot with -q:", rot(p,qneg)[0], "want", (R@p[0]))
q_use = qneg
rx,ry,rz,rw=q_use
tr=np.array([1.,2.,3.,0.])
for nm,dq in [("q*T",0.5*qmul(q_use,tr)),("T*q",0.5*qmul(tr,q_use))]:
    dx,dy,dz,dw=dq
    o=rot(p,q_use)
    for tn,f in [("tA",lambda: 2*np.array([dx*rw-dw*rx, dy*rw-dw*ry, dz*rw-dw*rz])+2*np.array([ry*dz-rz*dy, rz*dx-rx*dz, rx*dy-ry*dx])),
                ("tB",lambda: 2*np.array([dw*rx-dx*rw, dw*ry-dy*rw, dw*rz-dz*rw])+2*np.array([ry*dz-rz*dy, rz*dx-rx*dz, rx*dy-ry*dx])),
                ("tC",lambda: 2*np.array([dx*rw-dw*rx, dy*rw-dw*ry, dz*rw-dw*rz])-2*np.array([ry*dz-rz*dy, rz*dx-rx*dz, rx*dy-ry*dx]))]:
        print(nm,tn,(o+f())[0])
print("want [1,2,3]+rot =>", ((M@np.hstack([p,np.ones((3,1))]).T).T[:,:3])[0])
