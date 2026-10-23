import os
import json
import uuid
import hashlib
import subprocess
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
import shutil
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter(prefix="/blender", tags=["blender"])

def get_blender_executable():
    path = shutil.which("blender")
    if path:
        return path
    
    common_paths = [
        r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe",
        r"C:\Program Files\Blender Foundation\Blender 4.5\blender.exe",
        r"C:\Program Files\Blender Foundation\Blender 4.4\blender.exe",
        r"C:\Program Files\Blender Foundation\Blender 4.3\blender.exe",
        r"C:\Program Files\Blender Foundation\Blender 4.2\blender.exe",
        r"C:\Program Files\Blender Foundation\Blender 4.1\blender.exe",
        r"C:\Program Files\Blender Foundation\Blender 4.0\blender.exe",
        r"C:\Program Files\Blender Foundation\Blender 3.6\blender.exe",
    ]
    for p in common_paths:
        if os.path.exists(p):
            return p
            
    return "blender"

BLENDER_CMD = get_blender_executable()

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TEMPLATES_DIR = os.path.join(WORKSPACE_ROOT, "templates")
GENERATED_DIR = os.path.join(WORKSPACE_ROOT, "generated")
CACHE_DIR = os.path.join(WORKSPACE_ROOT, "cache")
BLENDER_DIR = os.path.join(WORKSPACE_ROOT, "blender")

os.makedirs(TEMPLATES_DIR, exist_ok=True)
os.makedirs(GENERATED_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

@router.post("/models/{model_id}/template")
async def upload_template(model_id: str, file: UploadFile = File(...)):
    template_dir = os.path.join(TEMPLATES_DIR, model_id)
    os.makedirs(template_dir, exist_ok=True)
    
    blend_file = os.path.join(template_dir, "model.blend")
    with open(blend_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Attempt to regenerate schema
    schema_path = os.path.join(template_dir, "schema.json")
    inspect_script = os.path.join(BLENDER_DIR, "inspect_template.py")
    try:
        subprocess.run([
            BLENDER_CMD, "--background", blend_file,
            "--python", inspect_script, "--", "--output", schema_path
        ], check=True, capture_output=True)
    except Exception as e:
        pass # Optional to fail here, but we save the file at least
        
    return {"message": "Template uploaded successfully"}

# In-memory job store for simple MVP
jobs = {}

class GenerateRequest(BaseModel):
    parameters: Dict[str, Any]

def get_hash(model_id: str, parameters: dict):
    # Sort parameters to ensure consistent hashing
    param_str = "|".join([f"{k}={v}" for k, v in sorted(parameters.items())])
    raw = f"{model_id}|v2|{param_str}"
    return hashlib.md5(raw.encode()).hexdigest()

@router.get("/models/{model_id}/schema")
def get_schema(model_id: str):
    template_dir = os.path.join(TEMPLATES_DIR, model_id)
    if not os.path.exists(template_dir):
        raise HTTPException(status_code=404, detail="Model template not found")
        
    schema_path = os.path.join(template_dir, "schema.json")
    if os.path.exists(schema_path):
        with open(schema_path, "r") as f:
            return json.load(f)
            
    # Alternatively, run inspect_template.py to generate it if missing
    blend_file = os.path.join(template_dir, "model.blend")
    if not os.path.exists(blend_file):
        raise HTTPException(status_code=404, detail="model.blend not found in template")

    inspect_script = os.path.join(BLENDER_DIR, "inspect_template.py")
    
    # Run blender headlessly
    try:
        subprocess.run([
            BLENDER_CMD, "--background", blend_file,
            "--python", inspect_script, "--", "--output", schema_path
        ], check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        err_msg = e.stderr.decode('utf-8', errors='replace') if e.stderr else e.stdout.decode('utf-8', errors='replace') if e.stdout else str(e)
        print(f"Blender inspect error: {err_msg}".encode('ascii', errors='replace').decode('ascii'))
        # Clean up the output to find our custom sys.exit error strings
        lines = [line for line in err_msg.split('\n') if "Error:" in line]
        user_error = lines[0] if lines else err_msg
        raise HTTPException(status_code=400, detail=user_error)
    except Exception as e:
        print(f"Blender inspect error: {e}".encode('ascii', errors='replace').decode('ascii'))
        raise HTTPException(status_code=500, detail="Failed to execute Blender. Is it installed and in PATH?")
        
    if os.path.exists(schema_path):
        with open(schema_path, "r") as f:
            return json.load(f)
            
    raise HTTPException(status_code=500, detail="Schema generation failed")

@router.put("/models/{model_id}/schema")
def update_schema(model_id: str, schema: dict):
    template_dir = os.path.join(TEMPLATES_DIR, model_id)
    if not os.path.exists(template_dir):
        raise HTTPException(status_code=404, detail="Model template not found")
        
    schema_path = os.path.join(template_dir, "schema.json")
    with open(schema_path, "w") as f:
        json.dump(schema, f, indent=2)
        
    return {"status": "success", "message": "Schema updated"}

def run_blender_generation(job_id: str, model_id: str, parameters: dict, output_path: str):
    template_dir = os.path.join(TEMPLATES_DIR, model_id)
    blend_file = os.path.join(template_dir, "model.blend")
    generate_script = os.path.join(BLENDER_DIR, "generate_model.py")
    
    config_path = os.path.join(CACHE_DIR, f"{job_id}_config.json")
    with open(config_path, "w") as f:
        json.dump({"parameters": parameters}, f)
        
    jobs[job_id]["status"] = "processing"
    
    try:
        res = subprocess.run([
            BLENDER_CMD, "--background", blend_file,
            "--python", generate_script, "--",
            "--config", config_path, "--output", output_path
        ], check=True, capture_output=True)
        stdout_str = res.stdout.decode('utf-8', errors='replace')
        print(f"Blender generate stdout: {stdout_str}".encode('ascii', errors='replace').decode('ascii'))
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["modelUrl"] = f"/generated/{os.path.basename(output_path)}"
    except subprocess.CalledProcessError as e:
        err_msg = e.stderr.decode('utf-8', errors='replace') if getattr(e, 'stderr', None) else str(e)
        stdout_msg = e.stdout.decode('utf-8', errors='replace') if getattr(e, 'stdout', None) else ''
        print(f"Blender generate error: {err_msg}\nStdout: {stdout_msg}".encode('ascii', errors='replace').decode('ascii'))
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = err_msg
    except Exception as e:
        print(f"Blender generate unexpected error: {e}".encode('ascii', errors='replace').decode('ascii'))
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
    finally:
        if os.path.exists(config_path):
            os.remove(config_path)

@router.post("/models/{model_id}/generate")
def generate_model(model_id: str, request: GenerateRequest, background_tasks: BackgroundTasks):
    template_dir = os.path.join(TEMPLATES_DIR, model_id)
    if not os.path.exists(template_dir):
        raise HTTPException(status_code=404, detail="Model template not found")
        
    param_hash = get_hash(model_id, request.parameters)
    output_filename = f"{param_hash}.glb"
    output_path = os.path.join(GENERATED_DIR, output_filename)
    
    print(f"Generating model {model_id} with hash {param_hash}. Parameters: {request.parameters}")
    
    # Check cache
    if os.path.exists(output_path):
        return {
            "jobId": "cached",
            "status": "completed",
            "modelUrl": f"/generated/{output_filename}"
        }
        
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "queued",
        "modelUrl": None
    }
    
    background_tasks.add_task(run_blender_generation, job_id, model_id, request.parameters, output_path)
    
    return {
        "jobId": job_id,
        "status": "queued"
    }
    
@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]
