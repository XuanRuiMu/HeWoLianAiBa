import bpy
import addon_utils

addon_utils.enable("blender_mcp", default_set=True, persistent=True)

scene = bpy.context.scene
if hasattr(scene, "blendermcp_use_hyper3d"):
    scene.blendermcp_use_hyper3d = True
    scene.blendermcp_hyper3d_api_key = "vibecoding"
if hasattr(scene, "blendermcp_use_hunyuan3d"):
    scene.blendermcp_use_hunyuan3d = True
if hasattr(scene, "blendermcp_auto_start_server"):
    scene.blendermcp_auto_start_server = True

try:
    bpy.ops.wm.save_userpref()
except Exception:
    pass

try:
    bpy.ops.blendermcp.start_server()
    print("MCP_SERVER_STARTED")
except Exception as e:
    print("MCP_START_ERR", e)

work = r"D:\xuanr\Desktop\燃烧之陨我的世界服务端\和我恋爱吧\吴昊阳3D模型mimo\work\lo_posed.blend"
try:
    bpy.ops.wm.open_mainfile(filepath=work)
    print("OPENED_WORK_FILE")
except Exception as e:
    print("OPEN_ERR", e)
