import bpy
import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))
glb = os.path.join(BASE, "base_model.glb")
report = os.path.join(BASE, "import_report.json")

result = {
    "model": "RiggedFigure.glb",
    "model_path": glb,
    "license": "CC0 (Khronos glTF-Sample-Assets, RiggedFigure)",
    "imported": False,
    "armature_count": 0,
    "mesh_count": 0,
    "bone_count": 0,
    "vertex_count": 0,
    "meshes": [],
    "error": None,
}

try:
    # 清空默认场景
    bpy.ops.wm.read_factory_settings(use_empty=True)
    before = len(bpy.data.objects)

    bpy.ops.import_scene.gltf(filepath=glb)

    arm_count = 0
    bone_count = 0
    mesh_count = 0
    vertex_count = 0
    mesh_names = []
    for obj in bpy.data.objects:
        if obj.type == "ARMATURE":
            arm_count += 1
            bone_count += len(obj.data.bones)
        elif obj.type == "MESH":
            mesh_count += 1
            mesh_names.append(obj.name)
            if obj.data and obj.data.vertices:
                vertex_count += len(obj.data.vertices)

    result["imported"] = True
    result["armature_count"] = arm_count
    result["bone_count"] = bone_count
    result["mesh_count"] = mesh_count
    result["vertex_count"] = vertex_count
    result["meshes"] = mesh_names
except Exception as e:
    result["error"] = str(e)

with open(report, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print("VERIFY_DONE imported=%s armature=%d bone=%d mesh=%d vertex=%d" % (
    result["imported"], result["armature_count"], result["bone_count"],
    result["mesh_count"], result["vertex_count"]))
