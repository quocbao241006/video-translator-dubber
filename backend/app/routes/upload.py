import os
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.config import UPLOAD_DIR, PROCESSING_DIR, MAX_FILE_SIZE, ALLOWED_EXTENSIONS
from app.models.job import create_job
from app.services.video_service import get_video_metadata

router = APIRouter(prefix='/api/v1')


@router.post('/upload')
async def upload_video(
    file: UploadFile = File(...),
    tts_voice: str = Form(default='vi-VN-HoaiMyNeural'),
    translation_quality: str = Form(default='standard'),
    genre: str = Form(default='animation')
):
    """Upload a video file and create a processing job."""
    # Validate file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f'Invalid file type: {ext}. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'
        )

    # Read and validate file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f'File too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB'
        )

    # Save file
    safe_filename = file.filename.replace(' ', '_')
    upload_path = UPLOAD_DIR / safe_filename
    with open(upload_path, 'wb') as f:
        f.write(contents)

    # Create processing directory for this job
    job_config = {
        'tts_voice': tts_voice,
        'translation_quality': translation_quality,
        'genre': genre
    }

    # Get video metadata
    try:
        metadata = get_video_metadata(str(upload_path))
    except Exception as e:
        metadata = {'error': str(e), 'duration': 0, 'width': 0, 'height': 0}

    # Create job
    job = create_job(
        filename=file.filename,
        video_path=str(upload_path),
        config=job_config
    )

    # Create processing subdirectory for this job
    job_processing_dir = PROCESSING_DIR / job['id']
    job_processing_dir.mkdir(parents=True, exist_ok=True)

    # Copy video to processing dir
    processing_video_path = job_processing_dir / safe_filename
    shutil.copy2(str(upload_path), str(processing_video_path))

    # Update job video_path to processing dir copy
    from app.models.job import update_job
    update_job(job['id'], video_path=str(processing_video_path))

    return {
        'job_id': job['id'],
        'filename': file.filename,
        'metadata': metadata,
        'status': job['status']
    }
