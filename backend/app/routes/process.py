import os
import asyncio
import traceback
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.models.job import get_job, update_job
from app.services import video_service, stt_service, translation_service, tts_service
from app.config import PROCESSING_DIR
from app.websocket import broadcast_progress

router = APIRouter(prefix='/api/v1')


class TranslateRequest(BaseModel):
    glossary: Optional[list[dict]] = None


@router.post('/jobs/{job_id}/extract-audio')
async def extract_audio(job_id: str):
    """Extract audio from video file."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    video_path = job['video_path']
    if not video_path or not os.path.exists(video_path):
        raise HTTPException(status_code=400, detail='Video file not found')

    # Set output path
    job_dir = PROCESSING_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    audio_path = str(job_dir / 'audio.wav')

    try:
        await broadcast_progress(job_id, 10, 'Extracting audio from video...')
        update_job(job_id, status='extracting_audio', progress=10, progress_text='Extracting audio...')

        result = video_service.extract_audio(video_path, audio_path)

        update_job(job_id, audio_path=audio_path, status='audio_extracted', progress=20, progress_text='Audio extracted')
        await broadcast_progress(job_id, 20, 'Audio extracted successfully')

        return {'message': 'Audio extracted', 'audio_path': audio_path}
    except Exception as e:
        update_job(job_id, status='error', progress_text=f'Audio extraction failed: {str(e)}')
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/jobs/{job_id}/stt')
async def speech_to_text(job_id: str):
    """Transcribe audio to text segments."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    audio_path = job.get('audio_path')
    if not audio_path or not os.path.exists(audio_path):
        raise HTTPException(status_code=400, detail='Audio file not found. Extract audio first.')

    try:
        await broadcast_progress(job_id, 30, 'Transcribing audio (Speech-to-Text)...')
        update_job(job_id, status='transcribing', progress=30, progress_text='Transcribing audio...')

        segments = stt_service.transcribe_audio(audio_path)

        update_job(job_id, segments=segments, status='transcribed', progress=50, progress_text='Transcription complete')
        await broadcast_progress(job_id, 50, f'Transcription complete: {len(segments)} segments')

        return {'message': 'Transcription complete', 'segments': segments, 'count': len(segments)}
    except Exception as e:
        update_job(job_id, status='error', progress_text=f'Transcription failed: {str(e)}')
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/jobs/{job_id}/translate')
async def translate(job_id: str, request: TranslateRequest = None):
    """Translate Chinese segments to Vietnamese."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    segments = job.get('segments', [])
    if not segments:
        raise HTTPException(status_code=400, detail='No segments found. Run STT first.')

    glossary = request.glossary if request else None

    try:
        await broadcast_progress(job_id, 55, 'Translating to Vietnamese...')
        update_job(job_id, status='translating', progress=55, progress_text='Translating...')

        translated = translation_service.translate_segments(
            segments=segments,
            genre=job.get('genre', 'animation'),
            glossary=glossary
        )

        update_job(job_id, segments=translated, status='translated', progress=65, progress_text='Translation complete')
        await broadcast_progress(job_id, 65, 'Translation complete')

        return {'message': 'Translation complete', 'segments': translated, 'count': len(translated)}
    except Exception as e:
        update_job(job_id, status='error', progress_text=f'Translation failed: {str(e)}')
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/jobs/{job_id}/tts')
async def text_to_speech(job_id: str):
    """Generate TTS audio for all translated segments."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    segments = job.get('segments', [])
    translated_count = sum(1 for s in segments if s.get('text_vi'))
    if translated_count == 0:
        raise HTTPException(status_code=400, detail='No translated segments found. Run translation first.')

    voice = job.get('tts_voice', 'vi-VN-HoaiMyNeural')
    tts_dir = str(PROCESSING_DIR / job_id / 'tts')

    try:
        await broadcast_progress(job_id, 70, 'Generating Vietnamese speech (TTS)...')
        update_job(job_id, status='generating_tts', progress=70, progress_text='Generating TTS...')

        results = await tts_service.generate_all_tts(segments, voice, tts_dir)

        update_job(job_id, status='tts_complete', progress=85, progress_text='TTS generation complete')
        await broadcast_progress(job_id, 85, f'TTS complete: {len(results)} audio files generated')

        return {'message': 'TTS generation complete', 'files': len(results)}
    except Exception as e:
        traceback.print_exc()
        update_job(job_id, status='error', progress_text=f'TTS failed: {str(e)}')
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/jobs/{job_id}/compose')
async def compose_video(job_id: str):
    """Compose final video with subtitles, blur, and dubbed audio."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    try:
        await broadcast_progress(job_id, 90, 'Composing final video...')
        update_job(job_id, status='composing', progress=90, progress_text='Composing final video...')

        output_path = video_service.compose_video(job)

        update_job(
            job_id,
            output_path=output_path,
            status='completed',
            progress=100,
            progress_text='Video composition complete'
        )
        await broadcast_progress(job_id, 100, 'Video composition complete!')

        return {'message': 'Video composition complete', 'output_path': output_path}
    except Exception as e:
        traceback.print_exc()
        update_job(job_id, status='error', progress_text=f'Composition failed: {str(e)}')
        raise HTTPException(status_code=500, detail=str(e))
