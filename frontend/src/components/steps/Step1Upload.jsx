import { useState, useRef } from 'react';
import useProjectStore from '../../store/projectStore';

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const formatSize = (bytes) => {
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

function Step1Upload() {
  const videoFile = useProjectStore((s) => s.videoFile);
  const videoUrl = useProjectStore((s) => s.videoUrl);
  const videoMetadata = useProjectStore((s) => s.videoMetadata);
  const setVideoFile = useProjectStore((s) => s.setVideoFile);
  const updateVideoMetadata = useProjectStore((s) => s.updateVideoMetadata);
  const ttsVoice = useProjectStore((s) => s.ttsVoice);
  const translationQuality = useProjectStore((s) => s.translationQuality);
  const genre = useProjectStore((s) => s.genre);

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const store = useProjectStore;

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('video/')) return;
    setVideoFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  const handleVideoLoaded = (e) => {
    const video = e.target;
    updateVideoMetadata({
      duration: video.duration,
      resolution: `${video.videoWidth}×${video.videoHeight}`,
      codec: videoFile?.type || 'video/mp4',
    });
  };

  const voiceOptions = [
    { value: 'vi-VN-HoaiMyNeural', label: '🗣️ Nữ (Hoài My)' },
    { value: 'vi-VN-NamMinhNeural', label: '🗣️ Nam (Nam Minh)' },
  ];

  const qualityOptions = [
    { value: 'speed', label: '⚡ Nhanh' },
    { value: 'quality', label: '✨ Tốt' },
  ];

  const genreOptions = [
    { value: 'animation', label: 'Animation / Donghua' },
    { value: 'drama', label: 'Phim truyện' },
    { value: 'documentary', label: 'Tài liệu' },
    { value: 'news', label: 'Tin tức' },
    { value: 'education', label: 'Giáo dục' },
  ];

  return (
    <div className="upload-page">
      <div className="upload-left">
        {!videoUrl ? (
          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-zone-icon">📥</div>
            <div className="upload-zone-title">Kéo thả video vào đây</div>
            <div className="upload-zone-subtitle">hoặc nhấp để chọn file</div>
            <div className="upload-zone-formats">
              <span className="upload-zone-format">MP4</span>
              <span className="upload-zone-format">MKV</span>
              <span className="upload-zone-format">AVI</span>
              <span className="upload-zone-format">WebM</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <>
            <div className="upload-preview animate-fade-in">
              <video
                src={videoUrl}
                controls
                onLoadedMetadata={handleVideoLoaded}
              />
            </div>
            <div className="upload-meta animate-fade-in">
              <div className="upload-meta-item">
                <div className="upload-meta-label">📁 Tên file</div>
                <div className="upload-meta-value">{videoMetadata.filename}</div>
              </div>
              <div className="upload-meta-item">
                <div className="upload-meta-label">⏱️ Thời lượng</div>
                <div className="upload-meta-value">
                  {videoMetadata.duration > 0 ? formatTime(videoMetadata.duration) : '...'}
                </div>
              </div>
              <div className="upload-meta-item">
                <div className="upload-meta-label">📐 Độ phân giải</div>
                <div className="upload-meta-value">
                  {videoMetadata.resolution || '...'}
                </div>
              </div>
              <div className="upload-meta-item">
                <div className="upload-meta-label">💾 Kích thước</div>
                <div className="upload-meta-value">
                  {videoMetadata.size > 0 ? formatSize(videoMetadata.size) : '...'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="glass-card config-panel animate-slide-in">
        <div className="section-title">⚙️ Cấu hình</div>

        <div className="field-group">
          <label className="label">Giọng đọc</label>
          <div className="radio-group">
            {voiceOptions.map((opt) => (
              <div
                key={opt.value}
                className={`radio-item ${ttsVoice === opt.value ? 'selected' : ''}`}
                onClick={() => store.setState({ ttsVoice: opt.value })}
              >
                <div className="radio-dot" />
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="field-group">
          <label className="label">Chất lượng dịch</label>
          <div className="radio-group">
            {qualityOptions.map((opt) => (
              <div
                key={opt.value}
                className={`radio-item ${translationQuality === opt.value ? 'selected' : ''}`}
                onClick={() => store.setState({ translationQuality: opt.value })}
              >
                <div className="radio-dot" />
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="field-group">
          <label className="label">Thể loại video</label>
          <select
            className="select"
            value={genre}
            onChange={(e) => store.setState({ genre: e.target.value })}
          >
            {genreOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default Step1Upload;
