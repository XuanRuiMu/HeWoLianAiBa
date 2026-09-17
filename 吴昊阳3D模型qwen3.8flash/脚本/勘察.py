# FP-01 勘察脚本：打印场景对象树 / 网格 / 骨架 / 材质贴图 / bounding box
import bpy
import sys

print("=== BLENDER VERSION ===", flush=True)
print(bpy.app.version_string, flush=True)

scene = bpy.context.scene
print("=== SCENE ===", scene.name, flush=True)
print("unit_settings scale:", scene.unit_settings.scale_length, flush=True)

print("=== OBJECTS ===", flush=True)
for ob in scene.objects:
    bb = None
    try:
        if ob.type in {'MESH', 'ARMATURE'} and len(ob.data.vertices) > 0 or ob.type == 'MESH':
            pass
    except Exception:
        pass
    loc = tuple(round(v, 4) for v in ob.location)
    scl = tuple(round(v, 4) for v in ob.scale)
    rot = tuple(round(v, 4) for v in ob.rotation_euler)
    print(f"[{ob.type}] name={ob.name!r} data={ob.data.name if ob.data else None!r} "
          f"parent={ob.parent.name if ob.parent else None!r} loc={loc} rot={rot} scale={scl} "
          f"hide_viewport={ob.hide_viewport} hide_render={ob.hide_render}", flush=True)

print("=== MESHES DETAIL ===", flush=True)
for ob in scene.objects:
    if ob.type != 'MESH':
        continue
    me = ob.data
    ws = [tuple(round(c, 4) for c in (ob.matrix_world @ __import__('mathutils').Vector(corner)))
          for corner in ((v.co.x, v.co.y, v.co.z) for v in me.vertices)] if False else None
    import mathutils
    if len(me.vertices):
        coords = [ob.matrix_world @ v.co for v in me.vertices]
        mn = mathutils.Vector((min(c.x for c in coords), min(c.y for c in coords), min(c.z for c in coords)))
        mx = mathutils.Vector((max(c.x for c in coords), max(c.y for c in coords), max(c.z for c in coords)))
    else:
        mn = mx = mathutils.Vector((0, 0, 0))
    mats = [m.name if m else None for m in me.materials]
    print(f"MESH {ob.name!r}: verts={len(me.vertices)} polys={len(me.polygons)} "
          f"uv_layers={[l.name for l in me.uv_layers]} bbox_min={tuple(round(v,3) for v in mn)} "
          f"bbox_max={tuple(round(v,3) for v in mx)} materials={mats} "
          f"shape_keys={[k.name for k in me.shape_keys.key_blocks] if me.shape_keys else []}", flush=True)
    for m in me.materials:
        if not m:
            continue
        print(f"   MAT {m.name!r} use_nodes={m.use_nodes} blend_method={getattr(m,'blend_method',None)} "
              f"surface={m.surface_render_method if hasattr(m,'surface_render_method') else m.diffuse_color}", flush=True)
        if m.use_nodes and m.node_tree:
            for n in m.node_tree.nodes:
                if n.type == 'TEX_IMAGE':
                    img = n.image
                    print(f"      TEX node {n.name!r} image={img.name if img else None!r} "
                          f"size={img.size[0] if img else 0}x{img.size[1] if img else 0} "
                          f"filepath={img.filepath if img else ''}", flush=True)

print("=== ARMATURES ===", flush=True)
for ob in scene.objects:
    if ob.type != 'ARMATURE':
        continue
    print(f"ARMATURE {ob.name!r} data={ob.data.name!r} pose_bones={len(ob.pose.bones)} edit_bones={len(ob.data.bones)}", flush=True)
    for pb in ob.pose.bones:
        eul = tuple(round(v, 4) for v in pb.rotation_quaternion.to_euler()) if pb.rotation_mode == 'QUATERNION' else tuple(round(v, 4) for v in pb.rotation_euler)
        head = ob.matrix_world @ pb.head
        tail = ob.matrix_world @ pb.tail
        print(f"   BONE {pb.name!r} parent={pb.parent.name if pb.parent else None!r} "
              f"roll_mode={pb.rotation_mode} rot={eul} head={tuple(round(v,3) for v in head)} tail={tuple(round(v,3) for v in tail)} "
              f"use_deform={pb.bone.use_deform}", flush=True)

print("=== EMPTY/OTHER ===", flush=True)
for ob in scene.objects:
    if ob.type not in {'MESH', 'ARMATURE'}:
        print(f"OTHER {ob.type} {ob.name!r}", flush=True)

print("=== COLLECTIONS ===", flush=True)
def walk_coll(c, depth=0):
    print("  " * depth + f"COLL {c.name!r} objs={[o.name for o in c.objects]}", flush=True)
    for ch in c.children:
        walk_coll(ch, depth + 1)
walk_coll(scene.collection)

print("=== INSPECT DONE ===", flush=True)
