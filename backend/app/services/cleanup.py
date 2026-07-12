import os
import shutil
import time
import asyncio
from pathlib import Path
from app.config import UPLOAD_DIR, PROCESSING_DIR, OUTPUT_DIR

# 24 hours in seconds
MAX_AGE_SECONDS = 24 * 60 * 60

async def cleanup_loop():
    """Background task to periodically clean up old storage files."""
    while True:
        try:
            _cleanup_old_files()
        except Exception as e:
            print(f"Cleanup task error: {e}")
        
        # Sleep for 1 hour before checking again
        await asyncio.sleep(3600)

def _cleanup_old_files():
    current_time = time.time()
    
    for directory in [UPLOAD_DIR, PROCESSING_DIR, OUTPUT_DIR]:
        if not directory.exists():
            continue
            
        for path in directory.glob('*'):
            try:
                # Check file/folder modification time
                mtime = path.stat().st_mtime
                if current_time - mtime > MAX_AGE_SECONDS:
                    if path.is_dir():
                        shutil.rmtree(path)
                        print(f"Cleanup: Deleted old directory {path}")
                    else:
                        path.unlink()
                        print(f"Cleanup: Deleted old file {path}")
            except Exception as e:
                print(f"Error deleting {path}: {e}")
