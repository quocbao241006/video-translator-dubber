import { useState, useRef, useEffect } from 'react';
import useProjectStore from '../../store/projectStore';
import api from '../../services/api';
import VideoPlayer from '../video/VideoPlayer';

function Step7Export() {
  const videoUrl = useProjectStore((s) => s.videoUrl);
  const exportFormat = useProjectStore((s) => s.exportFormat);
  const exportQuality = useProjectStore((s) => s.exportQuality);
  const subtitleMode = useProjectStore((s) => s.subtitleMode);
  const jobId = useProjectStore((s) => s.jobId);
  const setProgress = useProjectStore((s) => s.setProgress);

  const store = useProjectStore;

  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!jobId || !exporting) return;
    const ws = api.connectProgress(jobId, (data) => {
      setExportProgress(data.progress);
    });
    return () => ws.close();
  }, [jobId, exporting]);

  const formatOptions = [
    { value: 'mp4', label: 'MP4' },
    { value: 'mkv', label: 'MKV' },
    { value: 'webm', label: 'WebM' },
  ];

  const qualityOptions = [
    { value: '1080p', label: 'Gốc (1080p)' },
    { value: '720p', label: '720p' },
    { value: '480p', label: '480p' },
  ];

  const subtitleOptions = [
    { value: 'burn', label: 'Burn (ghi trực tiếp)' },
    { value: 'soft', label: 'Soft sub (phụ đề mềm)' },
    { value: 'both', label: 'Cả hai' },
  ];

  const handleExport = async () => {
    if (!jobId) return alert('Chưa có Job ID!');
    setExporting(true);
    setExportProgress(0);
    setExported(false);

    try {
      await api.composeVideo(jobId);
      setExported(true);
      setProgress(100, 'Xuất video hoàn tất');
    } catch (e) {
      alert('Lỗi xuất video: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  const downloads = [
    { id: 'video', icon: '🎬', name: `video_dubbed.${exportFormat}`, size: '---' },
    { id: 'srt_vi', icon: '📝', name: 'subtitles_vi.srt', size: '---' },
    { id: 'audio_dubbed', icon: '🎵', name: 'audio_dubbed.mp3', size: '---' },
  ];

  const handleDownload = (fileType, filename) => {
    if (!jobId) return;
    const url = api.getDownloadUrl(jobId, fileType, true);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

    const outputVideoUrl = exported ? api.getDownloadUrl(jobId, 'video') : videoUrl;

  return (
    <>
      <div className="panel-main">
        <VideoPlayer ref={videoRef} src={outputVideoUrl} key={outputVideoUrl} />
      </div>

      <div className="panel-tools">
        <div className="panel-tools-header">
          <span className="panel-tools-title">🎬 Xuất video</span>
        </div>
        <div className="panel-tools-body">
          {/* Format */}
          <div className="field-group">
            <label className="label">Định dạng</label>
            <div className="radio-group">
              {formatOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`radio-item ${exportFormat === opt.value ? 'selected' : ''}`}
                  onClick={() => store.setState({ exportFormat: opt.value })}
                >
                  <div className="radio-dot" />
                  <span>{opt.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div className="field-group">
            <label className="label">Chất lượng</label>
            <div className="radio-group">
              {qualityOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`radio-item ${exportQuality === opt.value ? 'selected' : ''}`}
                  onClick={() => store.setState({ exportQuality: opt.value })}
                >
                  <div className="radio-dot" />
                  <span>{opt.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subtitle mode */}
          <div className="field-group">
            <label className="label">Chế độ phụ đề</label>
            <div className="radio-group">
              {subtitleOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`radio-item ${subtitleMode === opt.value ? 'selected' : ''}`}
                  onClick={() => store.setState({ subtitleMode: opt.value })}
                >
                  <div className="radio-dot" />
                  <span>{opt.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section-divider" />

          {/* Export button */}
          <button
            className="btn btn-primary btn-lg"
            onClick={handleExport}
            disabled={exporting}
            style={{ width: '100%', fontSize: 'var(--font-lg)', padding: '16px' }}
          >
            {exporting ? (
              <>
                <span className="processing-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                Đang xuất... {Math.round(exportProgress)}%
              </>
            ) : exported ? (
              '🔄 Xuất lại'
            ) : (
              '🎬 Xuất Video'
            )}
          </button>

          {/* Progress bar during export */}
          {exporting && (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${exportProgress}%` }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: 'var(--space-xs)', fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
                {Math.round(exportProgress)}% • Encoding {exportFormat.toUpperCase()}...
              </div>
            </div>
          )}

          {/* Download section */}
          {exported && (
            <>
              <div className="section-divider" />
              <div className="section-title">📥 Tải xuống</div>
              <div className="download-list animate-fade-in">
                {downloads.map((item, i) => (
                  <div key={i} className="download-item">
                    <div className="download-item-icon">{item.icon}</div>
                    <div className="download-item-info">
                      <div className="download-item-name">{item.name}</div>
                      <div className="download-item-size">{item.size}</div>
                    </div>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDownload(item.id, item.name)}
                    >
                      📥 Tải
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default Step7Export;
