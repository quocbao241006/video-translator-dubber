from fastapi import WebSocket, WebSocketDisconnect
import asyncio
import json

# Store active WebSocket connections per job_id
active_connections: dict[str, list[WebSocket]] = {}


async def websocket_endpoint(websocket: WebSocket, job_id: str):
    """Handle WebSocket connections for real-time progress updates."""
    await websocket.accept()
    if job_id not in active_connections:
        active_connections[job_id] = []
    active_connections[job_id].append(websocket)

    try:
        while True:
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        active_connections[job_id].remove(websocket)
        if not active_connections[job_id]:
            del active_connections[job_id]


async def broadcast_progress(job_id: str, progress: int, text: str):
    """Broadcast progress update to all connected clients for a job."""
    if job_id in active_connections:
        message = json.dumps({'progress': progress, 'text': text})
        disconnected = []
        for ws in active_connections[job_id]:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            active_connections[job_id].remove(ws)
