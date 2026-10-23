import bpy
print([(obj.name, obj.type) for obj in bpy.data.objects])