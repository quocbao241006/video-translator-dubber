import subprocess
import json
import os
from pathlib import Path


def get_video_metadata(video_path: str) -> dict:
    """Get video metadata using ffprobe."""
    cmd = [
        'ffprobe', '-v', 'quiet',
        '-print_format', 'json',
        '-show_format', '-show_streams',
        video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f'ffprobe error: {result.stderr}')

    data = json.loads(result.stdout)

    duration = float(data.get('format', {}).get('duration', 0))
    size = int(data.get('format', {}).get('size', 0))

    video_stream = next((s for s in data.get('streams', []) if s['codec_type'] == 'video'), None)
    width = int(video_stream.get('width', 0)) if video_stream else 0
    height = int(video_stream.get('height', 0)) if video_stream else 0
    codec = video_stream.get('codec_name', 'unknown') if video_stream else 'unknown'

    return {
        'duration': round(duration, 2),
        'width': width,
        'height': height,
        'resolution': f'{width}x{height}',
        'codec': codec,
        'size': size,
        'size_mb': round(size / (1024 * 1024), 1)
    }


def extract_audio(video_path: str, output_path: str) -> dict:
    """Extract audio from video as WAV (16kHz mono)."""
    cmd = [
        'ffmpeg', '-y', '-i', video_path,
        '-vn', '-ac', '1', '-ar', '16000', '-f', 'wav',
        output_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f'FFmpeg error: {result.stderr}')
    return {'audio_path': output_path}


def _wrap_text(text: str, max_chars: int = 42) -> str:
    """Word-wrap text to prevent it from stretching off-screen."""
    if not text:
        return ""
    
    final_lines = []
    for paragraph in text.split('\n'):
        if len(paragraph) <= max_chars:
            final_lines.append(paragraph)
            continue
            
        if ' ' in paragraph:
            words = paragraph.split()
            lines = []
            current_line = []
            current_len = 0
            for word in words:
                if current_len + len(word) + 1 > max_chars and current_line:
                    lines.append(' '.join(current_line))
                    current_line = [word]
                    current_len = len(word)
                else:
                    current_line.append(word)
                    current_len += len(word) + 1
            if current_line:
                lines.append(' '.join(current_line))
            final_lines.extend(lines)
        else:
            # For languages without spaces like Chinese
            lines = [paragraph[i:i+max_chars] for i in range(0, len(paragraph), max_chars)]
            final_lines.extend(lines)
            
    return '\n'.join(final_lines)


def generate_srt_content(segments: list, lang: str = 'vi') -> str:
    """Generate SRT content string from segments."""
    lines = []
    for i, seg in enumerate(segments, 1):
        start = _format_srt_time(seg['start'])
        end = _format_srt_time(seg['end'])

        if lang == 'zh':
            text = _wrap_text(seg.get('text_zh', ''))
        elif lang == 'vi':
            text = _wrap_text(seg.get('text_vi', seg.get('text_zh', '')))
        elif lang == 'both':
            text = _wrap_text(seg.get('text_zh', '')) + '\n' + _wrap_text(seg.get('text_vi', ''))
        else:
            text = _wrap_text(seg.get('text_vi', ''))

        lines.append(f'{i}')
        lines.append(f'{start} --> {end}')
        lines.append(text)
        lines.append('')

    return '\n'.join(lines)


def generate_srt_file(segments: list, lang: str, output_path: str) -> str:
    """Generate SRT file from segments."""
    content = generate_srt_content(segments, lang)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    return output_path


def compose_video(job: dict) -> str:
    """Compose final video with blur zones, subtitles, and mixed audio."""
    video_path = job['video_path']
    job_dir = str(Path(video_path).parent)
    output_path = os.path.join(job_dir, 'output.mp4')

    # Generate SRT file for burning
    srt_path = os.path.join(job_dir, 'subtitle_vi.srt')
    generate_srt_file(job['segments'], 'vi', srt_path)

    # Build video filter chain
    vf_filters = []

    # Add blur zones
    for zone in job.get('blur_zones', []):
        x, y = int(zone['x']), int(zone['y'])
        w, h = int(zone['width']), int(zone['height'])
        
        # FFmpeg filters require positive width/height
        if w > 0 and h > 0:
            vf_filters.append(f"delogo=x={x}:y={y}:w={w}:h={h}")

    # Add subtitles
    sub_zone = job.get('subtitle_zone', {})
    # FFmpeg default PlayResY is 288. To match UI scale, we multiply frontend fontSize by ~0.6
    raw_font_size = sub_zone.get('fontSize', 24)
    font_size = max(10, int(raw_font_size * 0.6))
    
    srt_escaped = srt_path.replace('\\', '/').replace(':', '\\:')
    vf_filters.append(
        f"subtitles='{srt_escaped}':force_style='FontSize={font_size},PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2'"
    )

    vf_string = ','.join(vf_filters) if vf_filters else None

    # Build audio mix
    audio_mix = job.get('audio_mix', {'original': 15, 'dubbed': 85})
    orig_vol = audio_mix.get('original', 15) / 100
    dub_vol = audio_mix.get('dubbed', 85) / 100

    dubbed_audio = os.path.join(job_dir, 'dubbed_full.mp3')

    # Build command
    cmd = ['ffmpeg', '-y', '-i', video_path]
    has_dub = os.path.exists(dubbed_audio)
    
    if has_dub:
        cmd.extend(['-i', dubbed_audio])

    filter_complex_parts = []
    video_map = '0:v'
    audio_map = '0:a'

    if vf_string:
        filter_complex_parts.append(f"[0:v]{vf_string}[vout]")
        video_map = '[vout]'
        
    if has_dub:
        filter_complex_parts.append(f"[0:a]volume={orig_vol}[bg];[1:a]volume={dub_vol}[voice];[bg][voice]amix=inputs=2[aout]")
        audio_map = '[aout]'

    if filter_complex_parts:
        cmd.extend(['-filter_complex', ';'.join(filter_complex_parts)])
        cmd.extend(['-map', video_map, '-map', audio_map])
    else:
        # Fallback if no filters at all
        cmd.extend(['-map', '0:v', '-map', '0:a'])

    cmd.extend(['-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac', output_path])

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f'FFmpeg compose error: {result.stderr}')

    return output_path


def _format_srt_time(seconds: float) -> str:
    """Convert seconds to SRT time format (HH:MM:SS,mmm)."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f'{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}'
