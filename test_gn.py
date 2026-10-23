
import bpy
for obj in bpy.data.objects:
    for mod in obj.modifiers:
        if mod.type == 'NODES':
            print(f'{obj.name} has GN: {mod.name}')
