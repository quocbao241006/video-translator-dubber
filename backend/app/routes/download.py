import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.models.job import get_job
from app.services.video_service import generate_srt_file
from app.config import PROCESSING_DIR

router = APIRouter(prefix='/api/v1')


@router.get('/jobs/{job_id}/download/{file_type}')
def download_file(job_id: str, file_type: str, download: int = 0):
    """Download output files.

    file_type can be: video, srt_vi, srt_zh, srt_both, audio_dubbed
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    job_dir = PROCESSING_DIR / job_id
    base_name = job['original_filename'].rsplit('.', 1)[0]

    if file_type == 'original_video':
        file_path = job.get('video_path')
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail='Original video not found.')
        return FileResponse(
            file_path,
            media_type='video/mp4',
            filename=file_path.split('/')[-1].split('\\')[-1],
            content_disposition_type='attachment' if download else 'inline'
        )

    elif file_type == 'video':
        file_path = job.get('output_path')
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail='Output video not found. Run compose first.')
        return FileResponse(
            file_path,
            media_type='video/mp4',
            filename=f'{base_name}_dubbed.mp4',
            content_disposition_type='attachment' if download else 'inline'
        )

    elif file_type in ('srt_vi', 'srt_zh', 'srt_both'):
        lang = file_type.replace('srt_', '')
        segments = job.get('segments', [])
        if not segments:
            raise HTTPException(status_code=400, detail='No segments available')

        srt_path = str(job_dir / f'{base_name}_{lang}.srt')
        generate_srt_file(segments, lang, srt_path)

        return FileResponse(
            srt_path,
            media_type='text/plain; charset=utf-8',
            filename=f'{base_name}_{lang}.srt'
        )

    elif file_type == 'audio_dubbed':
        dubbed_path = str(job_dir / 'dubbed_full.mp3')
        if not os.path.exists(dubbed_path):
            raise HTTPException(status_code=404, detail='Dubbed audio not found. Run TTS first.')
        return FileResponse(
            dubbed_path,
            media_type='audio/mpeg',
            filename=f'{base_name}_dubbed.mp3'
        )

    else:
        raise HTTPException(
            status_code=400,
            detail=f'Invalid file_type: {file_type}. Must be one of: video, srt_vi, srt_zh, srt_both, audio_dubbed'
        )
