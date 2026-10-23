import bpy

bpy.ops.wm.open_mainfile(filepath=r"d:\dnf-trd\templates\1\model.blend")
obj = bpy.data.objects['Cube']
mod = obj.modifiers['GeometryNodes']

dg = bpy.context.evaluated_depsgraph_get()
eval_obj = obj.evaluated_get(dg)
mesh = eval_obj.to_mesh()
print("Vertex 0 before:", mesh.vertices[0].co)
eval_obj.to_mesh_clear()

mod['Socket_2'] = 10.0
bpy.context.view_layer.update()

dg = bpy.context.evaluated_depsgraph_get()
eval_obj = obj.evaluated_get(dg)
mesh = eval_obj.to_mesh()
print("Vertex 0 after:", mesh.vertices[0].co)
eval_obj.to_mesh_clear()
