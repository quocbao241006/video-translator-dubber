import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from app.models.job import get_job, update_job
from app.services.video_service import generate_srt_content, generate_srt_file
from app.config import PROCESSING_DIR

router = APIRouter(prefix='/api/v1')


class SegmentsUpdateRequest(BaseModel):
    segments: list[dict]


@router.get('/jobs/{job_id}/srt')
def get_srt(job_id: str, lang: str = Query(default='vi', regex='^(zh|vi|both)$')):
    """Generate and download SRT file."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    segments = job.get('segments', [])
    if not segments:
        raise HTTPException(status_code=400, detail='No segments found')

    content = generate_srt_content(segments, lang)
    filename = f'{job["original_filename"].rsplit(".", 1)[0]}_{lang}.srt'

    # Also save to disk
    srt_path = str(PROCESSING_DIR / job_id / filename)
    with open(srt_path, 'w', encoding='utf-8') as f:
        f.write(content)
    update_job(job_id, srt_path=srt_path)

    return Response(
        content=content,
        media_type='text/plain; charset=utf-8',
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
    )


@router.put('/jobs/{job_id}/srt')
def update_segments(job_id: str, request: SegmentsUpdateRequest):
    """Update job segments (for manual editing)."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    updated = update_job(job_id, segments=request.segments)
    return {'message': 'Segments updated', 'count': len(updated['segments'])}
