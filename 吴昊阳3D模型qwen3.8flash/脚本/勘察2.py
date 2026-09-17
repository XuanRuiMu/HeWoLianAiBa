# FP-01 勘察脚本 v2：由脚本自身写 UTF-8 报告，并做几何分区分析（无骨架场景下定位身体部位）
import bpy
import math
import mathutils
import os

OUT = os.environ.get("FP01_OUT", "")
lines = []


def log(s):
    lines.append(str(s))


scene = bpy.context.scene
log(f"blender={bpy.app.version_string} unit_scale={scene.unit_settings.scale_length}")

meshes = [o for o in scene.objects if o.type == 'MESH']
log(f"objects_total={len(scene.objects)} meshes={len(meshes)}")
for ob in scene.objects:
    log(f"OBJ type={ob.type} name={ob.name!r} data={ob.data.name if ob.data else None!r} "
        f"parent={ob.parent.name if ob.parent else None!r} loc={tuple(round(v,4) for v in ob.location)} "
        f"rot={tuple(round(v,4) for v in ob.rotation_euler)} scale={tuple(round(v,4) for v in ob.scale)}")

for ob in meshes:
    me = ob.data
    log(f"\n### MESH {ob.name!r} verts={len(me.vertices)} polys={len(me.polygons)} "
        f"uv={[l.name for l in me.uv_layers]} shapekeys={[k.name for k in me.shape_keys.key_blocks] if me.shape_keys else []} "
        f"modifiers={[(m.name, m.type) for m in ob.modifiers]}")
    coords = [ob.matrix_world @ v.co for v in me.vertices]
    xs = [c.x for c in coords]; ys = [c.y for c in coords]; zs = [c.z for c in coords]
    log(f"bbox min=({min(xs):.4f},{min(ys):.4f},{min(zs):.4f}) max=({max(xs):.4f},{max(ys):.4f},{max(zs):.4f})")
    log(f"dim=({max(xs)-min(xs):.4f},{max(ys)-min(ys):.4f},{max(zs)-min(zs):.4f})")
    mat_idx = {}
    for i, m in enumerate(me.materials):
        mat_idx[i] = m.name if m else None
        log(f"  SLOT[{i}] mat={m.name if m else None!r} use_nodes={getattr(m,'use_nodes',None)}")
        if m and m.use_nodes and m.node_tree:
            for n in m.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image:
                    img = n.image
                    log(f"     TEX {n.name!r} img={img.name!r} size={img.size[0]}x{img.size[1]} "
                        f"has_data={bool(img.has_data)} colorspace={img.colorspace_settings.name} "
                        f"filepath_raw={img.filepath!r} packed={bool(img.packed_file)}")
    # 每个材质槽的顶点 z 范围（判断哪些部件覆盖哪些高度）
    counts = {}
    zrange = {}
    for p in me.polygons:
        counts[p.material_index] = counts.get(p.material_index, 0) + 1
        cz = sum(coords[vi].z for vi in p.vertices) / len(p.vertices)
        cur = zrange.setdefault(p.material_index, [cz, cz])
        cur[0] = min(cur[0], cz); cur[1] = max(cur[1], cz)
    for k in sorted(counts):
        log(f"  POLYS slot{k}={mat_idx.get(k)} count={counts[k]} z=[{zrange[k][0]:.3f},{zrange[k][1]:.3f}]")

    # 按高度分层统计横截面半径，用于识别躯干/腿/头
    log("  Z-LAYERS (每 5cm 一层: 顶点数, x范围, y范围):")
    step = 0.05
    zmin, zmax = min(zs), max(zs)
    z = zmin
    while z < zmax:
        sel = [coords[i] for i in range(len(coords)) if z <= coords[i].z < z + step]
        if sel:
            lx = [c.x for c in sel]; ly = [c.y for c in sel]
            log(f"    z[{z:.2f},{z+step:.2f}) n={len(sel)} x=[{min(lx):.3f},{max(lx):.3f}] w={max(lx)-min(lx):.3f} y=[{min(ly):.3f},{max(ly):.3f}] d={max(ly)-min(ly):.3f}")
        z += step

    # 连通分量分析（识别独立部件：眼镜、护臂等）
    import collections
    adj = collections.defaultdict(set)
    for e in me.edges:
        adj[e.vertices[0]].add(e.vertices[1])
        adj[e.vertices[1]].add(e.vertices[0])
    seen = set()
    comps = []
    for v in me.vertices:
        if v.index in seen:
            continue
        stack = [v.index]; comp = []
        seen.add(v.index)
        while stack:
            cur = stack.pop(); comp.append(cur)
            for nb in adj[cur]:
                if nb not in seen:
                    seen.add(nb); stack.append(nb)
        comps.append(comp)
    comps.sort(key=len, reverse=True)
    log(f"  CONNECTED_COMPONENTS={len(comps)}")
    for ci, comp in enumerate(comps[:25]):
        cc = [coords[i] for i in comp]
        cx = [c.x for c in cc]; cy = [c.y for c in cc]; cz = [c.z for c in cc]
        log(f"    COMP[{ci}] n={len(comp)} x=[{min(cx):.3f},{max(cx):.3f}] y=[{min(cy):.3f},{max(cy):.3f}] z=[{min(cz):.3f},{max(cz):.3f}] centroid=({sum(cx)/len(cx):.3f},{sum(cy)/len(cy):.3f},{sum(cz)/len(cz):.3f})")

if OUT:
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
else:
    print("\n".join(lines))
log("done")
