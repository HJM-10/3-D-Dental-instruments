import bpy
import json
import sys
import argparse

def generate_model(config_path, output_path):
    obj = None
    modifier = None
    
    # Load configuration
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
    except Exception as e:
        print(f"Error reading config: {e}")
        sys.exit(1)
        
    parameters = config.get("parameters", {})
    
    # Apply parameters to targets based on key format "Object::Modifier::Socket"
    for full_key, value in parameters.items():
        parts = full_key.split("::")
        if len(parts) == 3:
            obj_name, mod_name, socket_id = parts
            if obj_name in bpy.data.objects:
                obj = bpy.data.objects[obj_name]
                if mod_name in obj.modifiers:
                    modifier = obj.modifiers[mod_name]
                    # Determine valid identifiers for geometry nodes modifier
                    valid_identifiers = set()
                    if modifier.type == 'NODES' and modifier.node_group:
                        node_group = modifier.node_group
                        if hasattr(node_group, 'interface'):
                            valid_identifiers = {item.identifier for item in node_group.interface.items_tree if item.item_type == 'SOCKET' and item.in_out == 'INPUT'}
                        else:
                            valid_identifiers = {item.identifier for item in node_group.inputs}
                    
                    if socket_id in valid_identifiers:
                        print(f"Setting {obj_name}.{mod_name}['{socket_id}'] = {value}")
                        if hasattr(modifier, 'properties') and hasattr(modifier.properties, 'inputs'):
                            try:
                                prop = modifier.properties.inputs[socket_id]
                                prop['value'] = value
                            except Exception:
                                try:
                                    modifier[socket_id] = value
                                except Exception:
                                    print(f"Warning: Failed to set socket {socket_id} on {obj_name}'s {mod_name}")
                        else:
                            try:
                                modifier[socket_id] = value
                            except Exception:
                                print(f"Warning: Failed to set socket {socket_id} on {obj_name}'s {mod_name}")
                    else:
                        # Fallback try-except for other properties/modifiers
                        try:
                            modifier[socket_id] = value
                            print(f"Setting fallback {obj_name}.{mod_name}['{socket_id}'] = {value}")
                        except Exception:
                            print(f"Warning: Socket ID {socket_id} not found or supported on {obj_name}'s {mod_name}")
                else:
                    print(f"Warning: Modifier {mod_name} not found on {obj_name}")
            else:
                print(f"Warning: Object {obj_name} not found")
        else:
            print(f"Warning: Invalid parameter key format: {full_key}")
            
    # Update the scene's dependency graph to ensure geometry nodes are evaluated
    for obj in bpy.data.objects:
        obj.update_tag()
    bpy.context.view_layer.update()
    
    # Deselect all objects
    bpy.ops.object.select_all(action='DESELECT')
    
    # Force unhide and select all meshes and curves to export the entire scene geometry
    has_target = False
    for obj in bpy.data.objects:
        if obj.type in ('MESH', 'CURVE'):
            # Clear any hidden flags that might prevent export in background/headless mode
            obj.hide_viewport = False
            obj.hide_render = False
            try:
                obj.hide_set(False)
            except Exception:
                pass
                
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            has_target = True
            
    if not has_target:
        print("Error: No meshes or curves found in the scene to export.")
        sys.exit(1)
    
    # Export as GLB
    # Export all selected meshes
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True, # Apply modifiers
        export_materials='EXPORT',
        export_normals=True,
        export_draco_mesh_compression_enable=False
    )
    
    print(f"Successfully generated model at {output_path}")

if __name__ == "__main__":
    try:
        argv = sys.argv
        if "--" not in argv:
            print("Error: expected '--' to separate blender args from script args.")
            sys.exit(1)
            
        script_args = argv[argv.index("--") + 1:]
        
        parser = argparse.ArgumentParser(description="Generate GLB from Geometry Nodes")
        parser.add_argument("--config", required=True, help="Path to input JSON configuration")
        parser.add_argument("--output", required=True, help="Path to output GLB file")
        args = parser.parse_args(script_args)
        
        generate_model(args.config, args.output)
    except Exception as e:
        print(f"Unhandled exception during generation: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
