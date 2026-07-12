const API_BASE = 'http://localhost:8000/api/v1';

class ApiService {
  // ========================
  // UPLOAD
  // ========================
  
  async uploadVideo(file, config = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (config.ttsVoice) formData.append('tts_voice', config.ttsVoice);
    if (config.translationQuality) formData.append('translation_quality', config.translationQuality);
    if (config.genre) formData.append('genre', config.genre);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
    return res.json();
  }

  // ========================
  // JOB MANAGEMENT
  // ========================

  async getJob(jobId) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`);
    if (!res.ok) throw new Error(`Get job failed: ${res.statusText}`);
    return res.json();
  }

  async listJobs() {
    const res = await fetch(`${API_BASE}/jobs`);
    if (!res.ok) throw new Error(`List jobs failed: ${res.statusText}`);
    return res.json();
  }

  async deleteJob(jobId) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Delete job failed: ${res.statusText}`);
    return res.json();
  }

  async cleanup() {
    const res = await fetch(`${API_BASE}/cleanup`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Cleanup failed: ${res.statusText}`);
    return res.json();
  }

  // ========================
  // BLUR & SUBTITLE ZONES
  // ========================

  async saveBlurZones(jobId, blurZones) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/blur-zones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blur_zones: blurZones }),
    });
    if (!res.ok) throw new Error(`Save blur zones failed: ${res.statusText}`);
    return res.json();
  }

  async saveSubtitleZone(jobId, subtitleZone) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/subtitle-zone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtitle_zone: subtitleZone }),
    });
    if (!res.ok) throw new Error(`Save subtitle zone failed: ${res.statusText}`);
    return res.json();
  }

  // ========================
  // PROCESSING
  // ========================

  async extractAudio(jobId) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/extract-audio`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Extract audio failed: ${res.statusText}`);
    return res.json();
  }

  async runSTT(jobId) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/stt`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`STT failed: ${res.statusText}`);
    return res.json();
  }

  async runTranslation(jobId, glossary = null) {
    const body = {};
    if (glossary) body.glossary = glossary;

    const res = await fetch(`${API_BASE}/jobs/${jobId}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Translation failed: ${res.statusText}`);
    return res.json();
  }

  async runTTS(jobId) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/tts`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`TTS failed: ${res.statusText}`);
    return res.json();
  }

  async composeVideo(jobId) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/compose`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Compose failed: ${res.statusText}`);
    return res.json();
  }

  // ========================
  // SRT
  // ========================

  async getSRT(jobId, lang = 'vi') {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/srt?lang=${lang}`);
    if (!res.ok) throw new Error(`Get SRT failed: ${res.statusText}`);
    return res.text();
  }

  async updateSRT(jobId, segments) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/srt`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segments }),
    });
    if (!res.ok) throw new Error(`Update SRT failed: ${res.statusText}`);
    return res.json();
  }

  // ========================
  // DOWNLOAD
  // ========================

  getDownloadUrl(jobId, fileType, download = false) {
    return `${API_BASE}/jobs/${jobId}/download/${fileType}${download ? '?download=1' : ''}`;
  }

  // ========================
  // WEBSOCKET
  // ========================

  connectProgress(jobId, onProgress) {
    const ws = new WebSocket(`ws://localhost:8000/ws/progress/${jobId}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onProgress(data);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return ws;
  }
}

const api = new ApiService();
export default api;
