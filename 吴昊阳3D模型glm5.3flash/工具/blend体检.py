# -*- coding: utf-8 -*-
# FP-01 资产体检：后台模式读取吴昊阳模型v2.blend 结构，输出 JSON 报告
# 用法: blender.exe -b <blend路径> --python blend体检.py -- <输出json路径>
import bpy
import json
import sys

输出路径 = None
argv = sys.argv
if '--' in argv:
    输出路径 = argv[argv.index('--') + 1]

报告 = {'objects': [], 'armatures': [], 'materials': [], 'images': [], 'actions': [], 'scene': {}}

sc = bpy.context.scene
报告['scene'] = {
    'name': sc.name,
    'unit_scale': sc.unit_settings.scale_length,
    'frame_start': sc.frame_start,
    'frame_end': sc.frame_end,
    'objects_total': len(bpy.data.objects),
}

for o in bpy.data.objects:
    条目 = {
        'name': o.name,
        'type': o.type,
        'dims': [round(v, 4) for v in o.dimensions],
        'loc_world': [round(v, 4) for v in o.matrix_world.translation],
        'parent': o.parent.name if o.parent else None,
        'verts': None,
        'polys': None,
        'materials': [],
    }
    if o.type == 'MESH':
        条目['verts'] = len(o.data.vertices)
        条目['polys'] = len(o.data.polygons)
        条目['materials'] = [m.name if m else None for m in o.data.materials]
    报告['objects'].append(条目)
    if o.type == 'ARMATURE':
        报告['armatures'].append({
            'name': o.name,
            'bones_count': len(o.data.bones),
            'bones': [b.name for b in o.data.bones],
        })

for m in bpy.data.materials:
    贴图 = []
    if m.use_nodes and m.node_tree:
        for n in m.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image:
                贴图.append({
                    'node': n.name,
                    'image': n.image.name,
                    'filepath': n.image.filepath,
                    'size': list(n.image.size),
                })
    报告['materials'].append({'name': m.name, 'use_nodes': m.use_nodes, 'textures': 贴图})

for img in bpy.data.images:
    报告['images'].append({'name': img.name, 'filepath': img.filepath, 'size': list(img.size)})

for a in bpy.data.actions:
    报告['actions'].append({'name': a.name, 'frame_range': [a.frame_range[0], a.frame_range[1]]})

if 输出路径:
    with open(输出路径, 'w', encoding='utf-8') as f:
        json.dump(报告, f, ensure_ascii=False, indent=1)
    print('WUHAOYANG_INSPECT_DONE ' + 输出路径)
else:
    print(json.dumps(报告, ensure_ascii=False)[:8000])
