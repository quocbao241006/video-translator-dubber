from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.models.job import jobs_store, get_job, update_job, delete_job

router = APIRouter(prefix='/api/v1')


class BlurZonesRequest(BaseModel):
    blur_zones: list[dict]


class SubtitleZoneRequest(BaseModel):
    subtitle_zone: dict


@router.delete('/cleanup')
def cleanup_all():
    """Delete all jobs and clean up all storage directories."""
    import shutil
    from app.config import PROCESSING_DIR, UPLOAD_DIR, OUTPUT_DIR
    
    # Clear store
    jobs_store.clear()
    
    # Empty directories
    for directory in [PROCESSING_DIR, UPLOAD_DIR, OUTPUT_DIR]:
        if directory.exists():
            for path in directory.glob('*'):
                try:
                    if path.is_dir():
                        shutil.rmtree(path)
                    else:
                        path.unlink()
                except Exception:
                    pass
            
    return {'message': 'All junk files and jobs cleared'}


@router.get('/jobs')
def list_jobs():
    """List all jobs."""
    jobs = list(jobs_store.values())
    # Return summary without heavy data
    summaries = []
    for job in jobs:
        summaries.append({
            'id': job['id'],
            'status': job['status'],
            'progress': job['progress'],
            'progress_text': job['progress_text'],
            'original_filename': job['original_filename'],
            'genre': job['genre'],
            'tts_voice': job['tts_voice'],
            'created_at': job['created_at'],
            'updated_at': job['updated_at'],
        })
    return {'jobs': summaries}


@router.get('/jobs/{job_id}')
def get_job_detail(job_id: str):
    """Get detailed job information."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')
    return {'job': job}


@router.delete('/jobs/{job_id}')
def delete_job_route(job_id: str):
    """Delete a job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    # Clean up files
    import os
    import shutil
    from pathlib import Path
    from app.config import PROCESSING_DIR

    job_dir = PROCESSING_DIR / job_id
    if job_dir.exists():
        shutil.rmtree(str(job_dir))

    if job.get('video_path') and os.path.exists(job['video_path']):
        try:
            os.remove(job['video_path'])
        except OSError:
            pass

    delete_job(job_id)
    return {'message': 'Job deleted', 'job_id': job_id}


@router.post('/jobs/{job_id}/blur-zones')
def save_blur_zones(job_id: str, request: BlurZonesRequest):
    """Save blur zones configuration for a job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    updated = update_job(job_id, blur_zones=request.blur_zones)
    return {'message': 'Blur zones saved', 'blur_zones': updated['blur_zones']}


@router.post('/jobs/{job_id}/subtitle-zone')
def save_subtitle_zone(job_id: str, request: SubtitleZoneRequest):
    """Save subtitle zone configuration for a job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    updated = update_job(job_id, subtitle_zone=request.subtitle_zone)
    return {'message': 'Subtitle zone saved', 'subtitle_zone': updated['subtitle_zone']}
