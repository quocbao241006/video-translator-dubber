import { useState, useRef, useEffect } from 'react';
import useProjectStore from '../../store/projectStore';
import api from '../../services/api';
import VideoPlayer from '../video/VideoPlayer';

function Step6TTS() {
  const videoUrl = useProjectStore((s) => s.videoUrl);
  const segments = useProjectStore((s) => s.segments);
  const audioMix = useProjectStore((s) => s.audioMix);
  const setAudioMix = useProjectStore((s) => s.setAudioMix);
  const setBgmFile = useProjectStore((s) => s.setBgmFile);
  const ttsVoice = useProjectStore((s) => s.ttsVoice);
  const jobId = useProjectStore((s) => s.jobId);
  const setProgress = useProjectStore((s) => s.setProgress);

  const [speed, setSpeed] = useState(1.0);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [playingIdx, setPlayingIdx] = useState(null);
  const videoRef = useRef(null);
  const bgmInputRef = useRef(null);

  useEffect(() => {
    if (!jobId || !generating) return;
    const ws = api.connectProgress(jobId, (data) => {
      setProgressValue(data.progress);
    });
    return () => ws.close();
  }, [jobId, generating]);

  const handleGenerate = async () => {
    if (!jobId) return alert('Chưa có Job ID!');
    setGenerating(true);
    setProgressValue(0);
    try {
      await api.runTTS(jobId);
      setGenerated(true);
      setProgress(100, 'Tạo TTS hoàn tất');
    } catch (e) {
      alert('Lỗi tạo TTS: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePlaySegment = (seg) => {
    setPlayingIdx(seg.id);
    // Simulate playing
    setTimeout(() => setPlayingIdx(null), 2000);
  };

  const handleBgmUpload = (e) => {
    const file = e.target.files[0];
    if (file) setBgmFile(file);
  };

  const voiceDisplay = ttsVoice === 'vi-VN-HoaiMyNeural' ? 'Hoài My (Nữ)' : 'Nam Minh (Nam)';

  return (
    <>
      <div className="panel-main">
        <VideoPlayer ref={videoRef} src={videoUrl} />
      </div>

      <div className="panel-tools">
        <div className="panel-tools-header">
          <span className="panel-tools-title">🗣️ Lồng tiếng &amp; Mixer</span>
        </div>
        <div className="panel-tools-body">
          {/* Audio Mixer */}
          <div className="section-title">🎚️ Audio Mixer</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            {/* Dubbed voice channel */}
            <div className="mixer-channel">
              <div className="mixer-channel-header">
                <span className="mixer-channel-label">🗣️ Giọng lồng tiếng</span>
                <span className="mixer-channel-value">{audioMix.dubbed}%</span>
              </div>
              <div className="slider-container">
                <input
                  type="range"
                  className="slider"
                  min={0}
                  max={100}
                  value={audioMix.dubbed}
                  onChange={(e) => setAudioMix({ dubbed: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* Original audio channel */}
            <div className="mixer-channel">
              <div className="mixer-channel-header">
                <span className="mixer-channel-label">🎬 Audio gốc</span>
                <span className="mixer-channel-value">{audioMix.original}%</span>
              </div>
              <div className="slider-container">
                <input
                  type="range"
                  className="slider"
                  min={0}
                  max={100}
                  value={audioMix.original}
                  onChange={(e) => setAudioMix({ original: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* BGM channel */}
            <div className="mixer-channel">
              <div className="mixer-channel-header">
                <span className="mixer-channel-label">🎵 Nhạc nền</span>
                <span className="mixer-channel-value">{audioMix.bgm}%</span>
              </div>
              <div className="slider-container">
                <input
                  type="range"
                  className="slider"
                  min={0}
                  max={100}
                  value={audioMix.bgm}
                  onChange={(e) => setAudioMix({ bgm: parseInt(e.target.value) })}
                />
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => bgmInputRef.current?.click()}>
                📁 Tải nhạc nền
              </button>
              <input
                ref={bgmInputRef}
                type="file"
                accept="audio/*"
                onChange={handleBgmUpload}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="section-divider" />

          {/* TTS Settings */}
          <div className="section-title">⚙️ Cài đặt TTS</div>
          <div className="field-group">
            <label className="label">Giọng đọc</label>
            <div style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: 'var(--font-md)',
            }}>
              🗣️ {voiceDisplay}
            </div>
          </div>

          <div className="field-group">
            <label className="label">Tốc độ ({speed.toFixed(1)}x)</label>
            <div className="slider-container">
              <input
                type="range"
                className="slider"
                min={0.5}
                max={2.0}
                step={0.1}
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
              />
              <span className="slider-value">{speed.toFixed(1)}x</span>
            </div>
          </div>

          <div className="field-group">
            <label className="label">Pitch</label>
            <div style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: 'var(--font-md)',
              color: 'var(--text-secondary)',
            }}>
              Mặc định (0)
            </div>
          </div>

          <div className="section-divider" />

          {/* Segment list */}
          <div className="section-title">📋 Danh sách đoạn <span className="badge badge-info">{segments.length}</span></div>
          <div className="tts-segment-list" style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 'var(--space-md)' }}>
            {segments.map((seg) => (
              <div
                key={seg.id}
                className="tts-segment-item"
                onClick={() => handlePlaySegment(seg)}
              >
                <span className="tts-segment-item-index">#{seg.index}</span>
                <span className="tts-segment-item-text">{seg.text_vi || seg.text_zh}</span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '2px 8px' }}
                >
                  {playingIdx === seg.id ? '⏸' : '▶'}
                </button>
              </div>
            ))}
          </div>

          {/* Generate button */}
          <button
            className="btn btn-primary btn-lg"
            onClick={handleGenerate}
            disabled={generating || segments.length === 0}
            style={{ width: '100%' }}
          >
            {generating ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="processing-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  Đang tạo TTS... {progressValue}%
                </div>
                <div className="progress-bar" style={{ width: '80%', height: '4px' }}>
                  <div className="progress-bar-fill" style={{ width: `${progressValue}%` }} />
                </div>
              </div>
            ) : generated ? (
              '✅ Tạo lại TTS'
            ) : (
              '🗣️ Tạo TTS'
            )}
          </button>

          {generated && (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-sm)', color: 'var(--success)', fontSize: 'var(--font-sm)' }}>
              ✅ Đã tạo {segments.length} file âm thanh TTS
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Step6TTS;
