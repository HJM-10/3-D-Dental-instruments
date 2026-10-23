
import bpy
drill = bpy.data.objects.get('Drill')
print('Drill:', drill)
if drill:
    print('Type:', drill.type)
    print('Hide render:', drill.hide_render)
    print('Hide viewport:', drill.hide_viewport)
    print('Modifiers:', [m.name for m in drill.modifiers])
    print('Data vertices:', len(drill.data.vertices))
    # Check if geometry nodes has realize instances
    for mod in drill.modifiers:
        if mod.type == 'NODES':
            print('Nodes:', [n.name for n in mod.node_group.nodes])
