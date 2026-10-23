import bpy
import json
import sys
import argparse

def get_type_string(socket_type):
    mapping = {
        'VALUE': 'float',
        'NodeSocketFloat': 'float',
        'NodeSocketFloatAngle': 'float',
        'NodeSocketFloatFactor': 'float',
        'NodeSocketFloatTime': 'float',
        'NodeSocketFloatDistance': 'float',
        'INT': 'integer',
        'NodeSocketInt': 'integer',
        'BOOLEAN': 'boolean',
        'NodeSocketBool': 'boolean',
        'RGBA': 'color',
        'NodeSocketColor': 'color',
        'VECTOR': 'vector',
        'NodeSocketVector': 'vector',
        'NodeSocketVectorXYZ': 'vector',
        'NodeSocketVectorTranslation': 'vector',
        'NodeSocketVectorEuler': 'vector',
        'STRING': 'string',
        'NodeSocketString': 'string'
    }
    return mapping.get(socket_type, None)

def get_default_value(socket):
    if hasattr(socket, 'default_value'):
        # Handle vector/color arrays
        if type(socket.default_value).__name__ in ('Vector', 'Color') or hasattr(socket.default_value, '__len__'):
            return list(socket.default_value)
        return socket.default_value
    return None

def inspect_template(output_path):
    inputs_schema = []

    for obj in bpy.data.objects:
        for modifier in obj.modifiers:
            if modifier.type != 'NODES' or not modifier.node_group:
                continue
                
            node_group = modifier.node_group
            
            if hasattr(node_group, 'interface'):
                # Blender 4.0+
                items = [item for item in node_group.interface.items_tree if item.item_type == 'SOCKET' and item.in_out == 'INPUT']
                for item in items:
                    mapped_type = get_type_string(item.socket_type)
                    if not mapped_type:
                        continue
                        
                    input_def = {
                        "id": f"{obj.name}::{modifier.name}::{item.identifier}",
                        "name": item.name,
                        "type": mapped_type,
                        "default": get_default_value(item),
                        "object": obj.name,
                        "modifier": modifier.name,
                        "hidden": True  # Hidden by default — admin must explicitly show each field
                    }
                    if hasattr(item, 'min_value'):
                        input_def["minimum"] = item.min_value
                    if hasattr(item, 'max_value'):
                        input_def["maximum"] = item.max_value
                        
                    inputs_schema.append(input_def)
            else:
                # Blender < 4.0
                for item in node_group.inputs:
                    mapped_type = get_type_string(item.type)
                    if not mapped_type:
                        continue
                        
                    input_def = {
                        "id": f"{obj.name}::{modifier.name}::{item.identifier}",
                        "name": item.name,
                        "type": mapped_type,
                        "default": get_default_value(item),
                        "object": obj.name,
                        "modifier": modifier.name,
                        "hidden": True  # Hidden by default — admin must explicitly show each field
                    }
                    if hasattr(item, 'min_value'):
                        input_def["minimum"] = item.min_value
                    if hasattr(item, 'max_value'):
                        input_def["maximum"] = item.max_value
                        
                    inputs_schema.append(input_def)

    # Output schema
    schema = {
        "inputs": inputs_schema,
        "objects": [obj.name for obj in bpy.data.objects],
    }

    
    with open(output_path, 'w') as f:
        json.dump(schema, f, indent=2)
        
    print(f"Successfully wrote schema to {output_path}")

if __name__ == "__main__":
    argv = sys.argv
    if "--" not in argv:
        print("Error: expected '--' to separate blender args from script args.")
        sys.exit(1)
        
    script_args = argv[argv.index("--") + 1:]
    
    parser = argparse.ArgumentParser(description="Extract Geometry Nodes Schema")
    parser.add_argument("--output", required=True, help="Path to output JSON schema")
    args = parser.parse_args(script_args)
    
    inspect_template(args.output)
