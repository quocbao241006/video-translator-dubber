from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pathlib import Path
import os

from app.routes import upload, jobs, process, srt, download
from app.websocket import websocket_endpoint

load_dotenv()

app = FastAPI(
    title='VietDub Studio API',
    description='API for Chinese to Vietnamese video translation with AI dubbing',
    version='1.0.0'
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Include routers
app.include_router(upload.router)
app.include_router(jobs.router)
app.include_router(process.router)
app.include_router(srt.router)
app.include_router(download.router)

# WebSocket
app.websocket('/ws/progress/{job_id}')(websocket_endpoint)


# Create storage directories on startup
@app.on_event('startup')
def startup():
    for d in ['storage/uploads', 'storage/processing', 'storage/outputs']:
        Path(d).mkdir(parents=True, exist_ok=True)


# Mount storage for static file access
try:
    Path('storage').mkdir(parents=True, exist_ok=True)
    app.mount('/storage', StaticFiles(directory='storage'), name='storage')
except Exception:
    pass


@app.get('/')
def root():
    return {'message': 'VietDub Studio API', 'version': '1.0.0', 'docs': '/docs'}
