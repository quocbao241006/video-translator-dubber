import uuid
from datetime import datetime

# In-memory job storage
jobs_store: dict[str, dict] = {}


def create_job(filename: str, video_path: str, config: dict = None) -> dict:
    """Create a new job and store it."""
    config = config or {}
    job_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    job = {
        'id': job_id,
        'status': 'uploaded',
        'progress': 0,
        'progress_text': 'Video uploaded',
        'original_filename': filename,
        'video_path': video_path,
        'audio_path': None,
        'vocal_path': None,
        'segments': [],
        'blur_zones': [],
        'subtitle_zone': {},
        'tts_voice': config.get('tts_voice', 'vi-VN-HoaiMyNeural'),
        'translation_quality': config.get('translation_quality', 'standard'),
        'genre': config.get('genre', 'animation'),
        'audio_mix': {'original': 15, 'dubbed': 85},
        'output_path': None,
        'srt_path': None,
        'created_at': now,
        'updated_at': now,
    }

    jobs_store[job_id] = job
    return job


def get_job(job_id: str) -> dict | None:
    """Get a job by ID."""
    return jobs_store.get(job_id)


def update_job(job_id: str, **kwargs) -> dict | None:
    """Update a job with given keyword arguments."""
    job = jobs_store.get(job_id)
    if job is None:
        return None

    for key, value in kwargs.items():
        if key in job:
            job[key] = value

    job['updated_at'] = datetime.utcnow().isoformat()
    return job


def delete_job(job_id: str) -> bool:
    """Delete a job by ID."""
    if job_id in jobs_store:
        del jobs_store[job_id]
        return True
    return False
