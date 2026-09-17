import bpy
import json
import os
import math
import sys
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAND = os.path.join(ROOT, "candidates")
REND = os.path.join(CAND, "renders")
WORK = os.path.join(ROOT, "prone_work")

CANDIDATES = [
    {"file": "Xbot.glb",      "name": "Xbot",      "src": "three.js examples/models/gltf/Xbot.glb",
     "license": "three.js 官方示例模型（源自 Adobe Mixamo，免版税；仓库内无独立 LICENSE，授权以 Mixamo 条款为准）"},
    {"file": "Soldier.glb",   "name": "Soldier",   "src": "three.js examples/models/gltf/Soldier.glb",
     "license": "three.js 官方示例模型（源自 Adobe Mixamo，免版税；仓库内无独立 LICENSE）"},
    {"file": "Michelle.glb",  "name": "Michelle",  "src": "three.js examples/models/gltf/Michelle.glb",
     "license": "three.js 官方示例模型（源自 Adobe Mixamo，免版税；仓库内无独立 LICENSE）"},
    {"file": "CesiumMan.glb", "name": "CesiumMan", "src": "Khronos glTF-Sample-Assets / Models/CesiumMan",
     "license": "CC-BY 4.0 (Cesium)"},
    {"file": "RPM_Brunette.glb", "name": "RPMBrunette", "src": "github.com/met4citizen/TalkingHead avatars/brunette.glb（Ready Player Me 参考素体，T-pose）",
     "license": "Ready Player Me 头像（RPM 服务条款，公开文档参考模型；非 CC0，商用前需复核）"},
]

TARGET_H = 1.8


def pick_engine(scene):
    for pref in ("BLENDER_WORKBENCH", "BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "CYCLES"):
        try:
            scene.render.engine = pref
            return pref
        except TypeError:
            continue
    return scene.render.engine


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def world_verts(objs):
    pts = []
    for o in objs:
        if o.type != "MESH" or not o.data.vertices:
            continue
        mw = o.matrix_world
        for v in o.data.vertices:
            pts.append(mw @ v.co)
    return pts


def band_width(pts, z_hi, z_lo, limit_x=None):
    xs = []
    for p in pts:
        if z_lo <= p.z <= z_hi:
            if limit_x is None or abs(p.x) <= limit_x:
                xs.append(p.x)
    if len(xs) < 2:
        return None
    return max(xs) - min(xs)


def setup_camera(name, loc, target, ortho_scale=None):
    cam_data = bpy.data.cameras.new(name)
    if ortho_scale:
        cam_data.type = "ORTHO"
        cam_data.ortho_scale = ortho_scale
    cam = bpy.data.objects.new(name, cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = loc
    direction = Vector(target) - Vector(loc)
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return cam


def render_view(scene, cam, path, w, h):
    scene.camera = cam
    scene.render.resolution_x = w
    scene.render.resolution_y = h
    scene.render.filepath = path
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    bpy.ops.render.render(write_still=True)


def process(cand):
    res = {"name": cand["name"], "file": cand["file"], "source": cand["src"],
           "license": cand["license"], "imported": False, "error": None}
    path = os.path.join(CAND, cand["file"])
    if not os.path.exists(path):
        res["error"] = "file missing"
        return res
    res["file_size"] = os.path.getsize(path)

    clear_scene()
    try:
        bpy.ops.import_scene.gltf(filepath=path)
    except Exception as e:
        res["error"] = "import failed: %s" % str(e)
        return res
    # Blender 5.3 alpha glTF 导入器会额外塞入一个 Icosphere 对象（不在 GLB 内），删除
    for o in list(bpy.data.objects):
        if o.name.startswith("Icosphere"):
            bpy.data.objects.remove(o, do_unlink=True)
    res["imported"] = True

    scene = bpy.context.scene
    engine = pick_engine(scene)
    res["engine"] = engine

    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    armatures = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    res["mesh_count"] = len(meshes)
    res["armature_count"] = len(armatures)

    verts = sum(len(o.data.vertices) for o in meshes)
    faces = sum(len(o.data.polygons) for o in meshes)
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons if len(p.vertices) >= 3) for o in meshes)
    res["vertex_count"] = verts
    res["face_count"] = faces
    res["tri_count"] = tris
    res["meshes"] = [{"name": o.name, "verts": len(o.data.vertices),
                      "uv_layers": len(o.data.uv_layers),
                      "materials": len(o.data.materials)} for o in meshes]

    res["material_count"] = len(bpy.data.materials)
    res["image_count"] = len(bpy.data.images)
    res["has_texture"] = any(i.size[0] > 0 for i in bpy.data.images)

    bone_names = []
    for a in armatures:
        a.data.pose_position = "REST"
        bone_names += [b.name for b in a.data.bones]
    res["bone_count"] = len(bone_names)
    res["bones"] = bone_names
    low = [b.lower() for b in bone_names]
    res["has_fingers"] = sum(1 for b in low if "hand" in b and any(ch.isdigit() for ch in b)) >= 5 or \
        sum(1 for b in low if "thumb" in b) >= 1
    res["has_neck"] = any("neck" in b for b in low)
    res["has_head"] = any("head" in b for b in low)
    res["has_foot_toe"] = any("toe" in b for b in low) or any("foot" in b for b in low)
    res["has_twist"] = any("twist" in b for b in low)

    # 归一化：缩放到 1.8m 高，居中于原点，脚底 z=0
    bpy.context.view_layer.update()
    mesh_objs = [o for o in bpy.data.objects if o.type in ("MESH", "ARMATURE")]
    pts = world_verts([o for o in bpy.data.objects if o.type == "MESH"])
    if not pts:
        res["error"] = "no mesh vertices"
        return res
    zmin = min(p.z for p in pts)
    zmax = max(p.z for p in pts)
    xmin = min(p.x for p in pts); xmax = max(p.x for p in pts)
    ymin = min(p.y for p in pts); ymax = max(p.y for p in pts)
    h = zmax - zmin
    res["raw_height_m"] = round(h, 4) if h > 0.01 else round(h, 4)
    res["bbox_x"] = round(xmax - xmin, 4)
    res["bbox_y"] = round(ymax - ymin, 4)
    if h <= 0.0001:
        res["error"] = "degenerate height"
        return res

    s = TARGET_H / h
    parent = bpy.data.objects.new("Root", None)
    bpy.context.scene.collection.objects.link(parent)
    for o in bpy.data.objects:
        if o.type in ("MESH", "ARMATURE") and o.parent is None:
            o.parent = parent
    parent.scale = (s, s, s)
    bpy.context.view_layer.update()

    pts = world_verts([o for o in bpy.data.objects if o.type == "MESH"])
    zmin = min(p.z for p in pts); zmax = max(p.z for p in pts)
    cx = (min(p.x for p in pts) + max(p.x for p in pts)) / 2.0
    cy = (min(p.y for p in pts) + max(p.y for p in pts)) / 2.0
    parent.location = (-cx, -cy, -zmin)
    bpy.context.view_layer.update()

    pts = world_verts([o for o in bpy.data.objects if o.type == "MESH"])
    H = max(p.z for p in pts) - min(p.z for p in pts)
    head_w = band_width(pts, H, H - 0.14 * H)
    shoulder_w = band_width(pts, H - 0.17 * H, H - 0.20 * H, limit_x=0.16 * H)
    res["height_m"] = round(H, 3)
    res["head_width_est"] = round(head_w, 3) if head_w else None
    res["torso_width_shoulder_est"] = round(shoulder_w, 3) if shoulder_w else None
    res["shoulder_head_ratio"] = round(shoulder_w / head_w, 2) if (head_w and shoulder_w) else None

    # 灯光/背景
    world = bpy.data.worlds.get("World")
    if world is None:
        world = bpy.data.worlds.new("World")
    scene.world = world
    if hasattr(world, "color"):
        world.color = (0.85, 0.85, 0.87)
    if engine in ("BLENDER_WORKBENCH",):
        try:
            scene.display.shading.light = "STUDIO"
            scene.display.shading.color_type = "MATERIAL"
        except Exception:
            pass
    else:
        bpy.ops.object.light_add(type="SUN", location=(3, -4, 6))
        sun = bpy.context.object
        sun.data.energy = 3.0
        bpy.ops.object.light_add(type="SUN", location=(-4, 2, 3))
        bpy.context.object.data.energy = 1.2
    if engine == "CYCLES":
        scene.cycles.samples = 24

    cz = H * 0.5
    dist = H * 2.0
    views = [
        ("front", (0, -dist, cz), (0, 0, cz), H * 1.25),
        ("side", (dist, 0, cz), (0, 0, cz), H * 1.25),
        ("top", (0, -0.001, H * 2.2), (0, 0, 0), H * 1.35),
    ]
    res["renders"] = {}
    for vname, loc, tgt, oscale in views:
        cam = setup_camera("cam_%s" % vname, loc, tgt, ortho_scale=oscale)
        out = os.path.join(REND, "%s_%s.png" % (cand["name"], vname))
        if vname == "top":
            render_view(scene, cam, out, 900, 700)
        else:
            render_view(scene, cam, out, 700, 900)
        res["renders"][vname] = out
        res["renders"][vname + "_size"] = os.path.getsize(out) if os.path.exists(out) else 0
    return res


def main():
    only = None
    argv = sys.argv
    if "--" in argv:
        rest = argv[argv.index("--") + 1:]
        if rest:
            only = rest[0]
    os.makedirs(REND, exist_ok=True)
    out = []
    for c in CANDIDATES:
        if only and c["name"].lower() != only.lower():
            continue
        try:
            out.append(process(c))
        except Exception as e:
            out.append({"name": c["name"], "file": c["file"], "error": "fatal: %s" % str(e)})
    dst = os.path.join(WORK, "candidates_stats.json")
    if only:
        dst = os.path.join(WORK, "candidates_stats_%s.json" % only)
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("RENDER_DONE", dst)


main()
