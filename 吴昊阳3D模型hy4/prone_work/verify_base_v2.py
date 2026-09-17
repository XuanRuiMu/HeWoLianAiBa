import bpy
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
glb = os.path.join(ROOT, "base_model", "base_model_v2.glb")
report_path = os.path.join(ROOT, "prone_work", "base_model_v2_verify.json")

result = {
    "model": "base_model_v2.glb (Xbot.glb)",
    "model_path": glb,
    "imported": False,
    "armature_count": 0,
    "bone_count": 0,
    "mesh_count": 0,
    "vertex_count": 0,
    "error": None,
}

try:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    for o in list(bpy.data.objects):
        if o.name.startswith("Icosphere"):
            bpy.data.objects.remove(o, do_unlink=True)
    for obj in bpy.data.objects:
        if obj.type == "ARMATURE":
            result["armature_count"] += 1
            result["bone_count"] += len(obj.data.bones)
        elif obj.type == "MESH":
            result["mesh_count"] += 1
            result["vertex_count"] += len(obj.data.vertices)
    result["imported"] = result["armature_count"] >= 1 and result["mesh_count"] >= 1
except Exception as e:
    result["error"] = str(e)

with open(report_path, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print("VERIFY_DONE imported=%s armature=%d bone=%d mesh=%d vertex=%d" % (
    result["imported"], result["armature_count"], result["bone_count"],
    result["mesh_count"], result["vertex_count"]))
