import asyncio
import os
import subprocess
from pathlib import Path
import edge_tts
from pydub import AudioSegment
from pydub.silence import detect_nonsilent


async def generate_tts(text: str, voice: str, output_path: str) -> str:
    """Generate TTS audio for a single text segment."""
    try:
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(output_path)
        return output_path
    except Exception as e:
        print(f"Error generating TTS for text '{text}': {e}")
        raise


def process_audio_sync(raw_path: str, final_path: str, target_duration: float):
    """Blocking audio processing using Pydub and FFmpeg."""
    # Trim silence
    audio = AudioSegment.from_mp3(raw_path)
    nonsilent = detect_nonsilent(audio, min_silence_len=100, silence_thresh=-42)
    if nonsilent:
        start_trim = max(0, nonsilent[0][0] - 30)
        end_trim = min(len(audio), nonsilent[-1][1] + 50)
        trimmed = audio[start_trim:end_trim]
    else:
        trimmed = audio

    trimmed_path = raw_path.replace('_raw.mp3', '_trimmed.mp3')
    trimmed.export(trimmed_path, format='mp3')

    # Adjust tempo to fit target duration (ONLY speed up, never slow down)
    tts_duration = len(trimmed) / 1000.0
    
    if tts_duration > target_duration and target_duration > 0:
        ratio = tts_duration / target_duration
        # Cap speedup at 1.35x to avoid "chipmunk" effect
        atempo = min(ratio, 1.35)
        
        if atempo > 1.05:
            subprocess.run([
                'ffmpeg', '-y', '-i', trimmed_path,
                '-filter:a', f'atempo={atempo:.3f}',
                final_path
            ], capture_output=True)
        else:
            trimmed.export(final_path, format='mp3')
    else:
        # If TTS is shorter than the target, play it at natural speed (1.0x).
        # The remaining time will just be natural silence.
        trimmed.export(final_path, format='mp3')

    # Cleanup
    for p in [raw_path, trimmed_path]:
        if os.path.exists(p):
            try:
                os.remove(p)
            except OSError:
                pass


async def process_single_segment(seg: dict, voice: str, output_dir: str, semaphore: asyncio.Semaphore) -> dict:
    """Process a single TTS segment concurrently."""
    async with semaphore:
        text_vi = seg.get('text_vi', '').strip()
        if not text_vi:
            return None

        target_duration = seg['end'] - seg['start']
        raw_path = os.path.join(output_dir, f"seg_{seg['id']:04d}_raw.mp3")
        final_path = os.path.join(output_dir, f"seg_{seg['id']:04d}.mp3")

        try:
            # Generate TTS (Network IO)
            await generate_tts(text_vi, voice, raw_path)

            # Process Audio (CPU/Disk IO)
            await asyncio.to_thread(process_audio_sync, raw_path, final_path, target_duration)

            return {'segment_id': seg['id'], 'path': final_path}
        except Exception as e:
            print(f"Failed to process segment {seg['id']}: {e}")
            return None


def combine_audio_segments(segments: list, output_dir: str):
    """Combine all TTS segments into a single full-length audio file."""
    if not segments:
        return
    
    max_end = max([s['end'] for s in segments])
    full_audio = AudioSegment.silent(duration=int((max_end + 2) * 1000))
    
    for seg in segments:
        if not seg.get('text_vi'):
            continue
            
        final_path = os.path.join(output_dir, f"seg_{seg['id']:04d}.mp3")
        if os.path.exists(final_path):
            seg_audio = AudioSegment.from_mp3(final_path)
            start_ms = int(seg['start'] * 1000)
            
            # Right Alignment Logic
            target_duration_ms = int((seg['end'] - seg['start']) * 1000)
            tts_duration_ms = len(seg_audio)
            
            if tts_duration_ms < target_duration_ms - 300: # Only adjust if the gap is > 300ms
                padding_ms = int(target_duration_ms - tts_duration_ms)
                start_ms += padding_ms
                
            full_audio = full_audio.overlay(seg_audio, position=start_ms)
            
    job_dir = os.path.dirname(output_dir)
    dubbed_path = os.path.join(job_dir, 'dubbed_full.mp3')
    full_audio.export(dubbed_path, format='mp3')


async def generate_all_tts(segments: list, voice: str, output_dir: str) -> list:
    """Generate TTS for all segments with timing adjustment concurrently."""
    os.makedirs(output_dir, exist_ok=True)
    
    # Process 10 segments at the same time to avoid rate limits while maximizing speed
    semaphore = asyncio.Semaphore(10)
    tasks = [process_single_segment(seg, voice, output_dir, semaphore) for seg in segments]
    
    results = await asyncio.gather(*tasks)
    valid_results = [r for r in results if r is not None]
    
    # Combine into full dubbed audio
    await asyncio.to_thread(combine_audio_segments, segments, output_dir)
    
    return valid_results
