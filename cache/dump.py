import bpy
import sys

for obj in bpy.data.objects:
    print(f"Object: {obj.name}")
    for mod in obj.modifiers:
        print(f"  Modifier: {mod.name} (type: {mod.type})")
        if mod.type == 'NODES' and mod.node_group:
            print(f"    NodeGroup: {mod.node_group.name}")
            if hasattr(mod.node_group, 'interface'):
                print(f"    Interface Items: {len(mod.node_group.interface.items_tree)}")
                for item in mod.node_group.interface.items_tree:
                    print(f"      - {item.name}, {item.item_type}, {getattr(item, 'in_out', 'N/A')}, {getattr(item, 'socket_type', 'N/A')}")
            else:
                print("    No interface attribute (old Blender?)")
                for inp in mod.node_group.inputs:
                    print(f"      - {inp.name}, {inp.type}")
sys.exit(0)
