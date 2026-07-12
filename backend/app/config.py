import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# API Keys
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')

# Storage directories
STORAGE_DIR = Path('storage')
UPLOAD_DIR = STORAGE_DIR / 'uploads'
PROCESSING_DIR = STORAGE_DIR / 'processing'
OUTPUT_DIR = STORAGE_DIR / 'outputs'

# File limits
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB
ALLOWED_EXTENSIONS = {'.mp4', '.mkv', '.avi', '.mov', '.webm'}

# Create directories on import
for d in [UPLOAD_DIR, PROCESSING_DIR, OUTPUT_DIR]:
    d.mkdir(parents=True, exist_ok=True)
