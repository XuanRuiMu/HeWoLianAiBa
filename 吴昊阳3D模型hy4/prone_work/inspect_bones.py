import bpy
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLB = os.path.join(BASE, "base_model", "base_model.glb")
OUT = os.path.join(BASE, "prone_work", "bones_report.json")

report = {"blender": bpy.app.version_string, "imported": False, "error": None}


def vec(v):
    return [round(float(c), 6) for c in v]


try:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=GLB)

    arm_objs = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    mesh_objs = [o for o in bpy.data.objects if o.type == "MESH"]

    report["imported"] = True
    report["armature_objects"] = [o.name for o in arm_objs]
    report["mesh_objects"] = [o.name for o in mesh_objs]
    report["scene_object_types"] = {o.name: o.type for o in bpy.data.objects}

    arm = arm_objs[0]
    arm_mw = arm.matrix_world.copy()
    report["armature_matrix_world"] = [vec(r) for r in arm_mw]
    report["armature_scale"] = vec(arm.scale)
    report["armature_rotation_euler"] = vec(arm.rotation_euler)

    bones = []
    for b in arm.data.bones:
        head_w = arm_mw @ b.head_local
        tail_w = arm_mw @ b.tail_local
        bones.append({
            "name": b.name,
            "parent": b.parent.name if b.parent else None,
            "children": [c.name for c in b.children],
            "head_local": vec(b.head_local),
            "tail_local": vec(b.tail_local),
            "head_world": vec(head_w),
            "tail_world": vec(tail_w),
            "length": round(float(b.length), 6),
            "use_connect": bool(b.use_connect),
            "roll": round(float(b.roll if hasattr(b, "roll") else 0.0), 6),
        })
    report["bones"] = bones
    report["bone_count"] = len(bones)

    order = {b["name"]: i for i, b in enumerate(bones)}
    report["topology_lines"] = [
        "  " * 0 + "%s -> parent=%s children=%s" % (b["name"], b["parent"], ",".join(b["children"]))
        for b in bones
    ]

    meshes = []
    for m in mesh_objs:
        mw = m.matrix_world
        ws = [mw @ v.co for v in m.data.vertices]
        if ws:
            bb_min = [min(p[i] for p in ws) for i in range(3)]
            bb_max = [max(p[i] for p in ws) for i in range(3)]
        else:
            bb_min = bb_max = [0.0, 0.0, 0.0]
        meshes.append({
            "name": m.name,
            "vertices": len(m.data.vertices),
            "polygons": len(m.data.polygons),
            "vertex_groups": [g.name for g in m.vertex_groups],
            "modifiers": [(md.name, md.type, getattr(md, "object", None).name if getattr(md, "object", None) else None)
                          for md in m.modifiers],
            "world_bbox_min": vec(bb_min),
            "world_bbox_max": vec(bb_max),
            "matrix_world": [vec(r) for r in mw],
            "materials": [ms.name if ms else None for ms in m.data.materials],
        })
    report["meshes"] = meshes

    # 全局包围盒（rest 姿态）
    all_pts = []
    for m in mesh_objs:
        mw = m.matrix_world
        all_pts.extend([mw @ v.co for v in m.data.vertices])
    if all_pts:
        report["rest_scene_bbox_min"] = vec([min(p[i] for p in all_pts) for i in range(3)])
        report["rest_scene_bbox_max"] = vec([max(p[i] for p in all_pts) for i in range(3)])

    # 关键骨名候选
    kw = ["hip", "spine", "chest", "neck", "head", "shoulder", "arm", "forearm",
          "hand", "thigh", "shin", "leg", "foot", "toe", "root", "pelvis"]
    report["keybone_candidates"] = {k: [b["name"] for b in bones if k in b["name"].lower()] for k in kw}

except Exception as e:
    import traceback
    report["error"] = str(e)
    report["traceback"] = traceback.format_exc()

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

print("INSPECT_DONE imported=%s bones=%d" % (report["imported"], report.get("bone_count", 0)))
if report["error"]:
    print("INSPECT_ERROR %s" % report["error"])
