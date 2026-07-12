import os
from groq import Groq
from pathlib import Path
from pydub import AudioSegment


def transcribe_audio(audio_path: str, language: str = 'zh') -> list:
    """Transcribe audio using Groq Whisper API with word-level timestamps."""
    client = Groq(api_key=os.getenv('GROQ_API_KEY'))

    audio_file_path = Path(audio_path)
    file_size = audio_file_path.stat().st_size

    # Groq limit: 25MB per file
    if file_size > 25 * 1024 * 1024:
        return _transcribe_chunked(audio_path, language, client)

    with open(audio_path, 'rb') as f:
        result = client.audio.transcriptions.create(
            file=f,
            model='whisper-large-v3',
            response_format='verbose_json',
            language=language,
            timestamp_granularities=['segment', 'word']
        )

    segments = []
    for i, seg in enumerate(result.segments):
        segments.append({
            'id': i + 1,
            'index': i + 1,
            'start': round(seg['start'], 2),
            'end': round(seg['end'], 2),
            'text_zh': seg['text'].strip(),
            'text_vi': ''
        })

    return segments


def _transcribe_chunked(audio_path: str, language: str, client) -> list:
    """Split audio into <25MB chunks and transcribe each."""
    audio = AudioSegment.from_wav(audio_path)
    chunk_duration_ms = 5 * 60 * 1000  # 5 minutes per chunk
    chunks = [audio[i:i + chunk_duration_ms] for i in range(0, len(audio), chunk_duration_ms)]

    all_segments = []
    time_offset = 0.0
    global_index = 1

    for chunk_idx, chunk in enumerate(chunks):
        chunk_path = audio_path.replace('.wav', f'_chunk{chunk_idx}.wav')
        chunk.export(chunk_path, format='wav')

        with open(chunk_path, 'rb') as f:
            result = client.audio.transcriptions.create(
                file=f,
                model='whisper-large-v3',
                response_format='verbose_json',
                language=language,
                timestamp_granularities=['segment']
            )

        for seg in result.segments:
            all_segments.append({
                'id': global_index,
                'index': global_index,
                'start': round(seg['start'] + time_offset, 2),
                'end': round(seg['end'] + time_offset, 2),
                'text_zh': seg['text'].strip(),
                'text_vi': ''
            })
            global_index += 1

        time_offset += chunk_duration_ms / 1000
        os.remove(chunk_path)

    return all_segments
