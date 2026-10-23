
import bpy
for obj in bpy.data.objects:
    if obj.type in ('MESH', 'CURVE'):
        obj.hide_viewport = False
        obj.hide_render = False
        try: obj.hide_set(False)
        except: pass
        obj.select_set(True)
bpy.ops.export_scene.gltf(filepath='generated/test1.glb', use_selection=True, export_apply=True)
bpy.ops.export_scene.gltf(filepath='generated/test2.glb', use_selection=True, export_apply=False)
