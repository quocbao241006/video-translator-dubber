import { useState, useRef, useEffect } from 'react';
import useProjectStore from '../../store/projectStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Mic2, Download, RefreshCw, CheckCircle2, Circle, Clock, Loader2, Play } from 'lucide-react';

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};



const stages = [
  { key: 'audio', label: 'Tách audio từ video' },
  { key: 'vocal', label: 'Tách vocal / nhạc nền' },
  { key: 'stt', label: 'Nhận dạng giọng nói (STT)' },
];

function Step3STT() {
  const videoUrl = useProjectStore((s) => s.videoUrl);
  const segments = useProjectStore((s) => s.segments);
  const setSegments = useProjectStore((s) => s.setSegments);
  const setProgress = useProjectStore((s) => s.setProgress);
  const jobId = useProjectStore((s) => s.jobId);

  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(segments.length > 0);
  const [currentStage, setCurrentStage] = useState(-1);
  const [stageStatuses, setStageStatuses] = useState(['pending', 'pending', 'pending']);
  const [progressValue, setProgressValue] = useState(0);
  const timerRef = useRef(null);

  const totalWords = segments.reduce((acc, seg) => acc + seg.text_zh.length, 0);

  useEffect(() => {
    if (!jobId || !processing) return;
    const ws = api.connectProgress(jobId, (data) => {
      setProgressValue(data.progress);
      // Cập nhật stage dựa trên text
      if (data.text.includes('Đang trích xuất audio')) {
        setCurrentStage(0);
        setStageStatuses(['active', 'pending', 'pending']);
      } else if (data.text.includes('Đang tách vocal')) {
        setCurrentStage(1);
        setStageStatuses(['done', 'active', 'pending']);
      } else if (data.text.includes('Đang nhận dạng')) {
        setCurrentStage(2);
        setStageStatuses(['done', 'done', 'active']);
      }
    });
    return () => ws.close();
  }, [jobId, processing]);

  const startProcessing = async () => {
    if (!jobId) return toast.error('Chưa upload video!');
    setProcessing(true);
    setDone(false);
    setCurrentStage(0);
    setStageStatuses(['active', 'pending', 'pending']);
    setProgressValue(0);

    try {
      // 1. Tách audio & vocal
      await api.extractAudio(jobId);
      
      // 2. Chạy STT
      const res = await api.runSTT(jobId);
      setSegments(res.segments);
      
      setStageStatuses(['done', 'done', 'done']);
      setDone(true);
      setProgress(100, 'Hoàn tất');
    } catch (e) {
      toast.error('Lỗi xử lý: ' + e.message);
      setStageStatuses(['error', 'error', 'error']);
    } finally {
      setProcessing(false);
    }
  };

  const generateSRT = () => {
    const formatSrtTime = (seconds) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const ms = Math.round((seconds % 1) * 1000);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    };

    let srt = '';
    segments.forEach((seg) => {
      srt += `${seg.index}\n`;
      srt += `${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n`;
      srt += `${seg.text_zh}\n\n`;
    });

    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles_zh.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="step-center">
      {videoUrl && (
        <div className="step-center-video animate-fade-in">
          <video src={videoUrl} style={{ width: '100%', display: 'block' }} />
        </div>
      )}

      {!processing && !done && (
        <div className="processing-status animate-fade-in">
          <Mic2 size={48} className="text-purple-400 mb-4 opacity-80" />
          <div className="processing-text">Sẵn sàng tách và nhận dạng giọng nói</div>
          <div className="processing-detail">
            Hệ thống sẽ tách audio, phân tách vocal và nhận dạng tiếng Trung
          </div>
          <button className="btn btn-primary btn-lg" onClick={startProcessing} style={{ marginTop: 'var(--space-lg)' }}>
            <Play size={18} /> Bắt đầu xử lý
          </button>
        </div>
      )}

      {processing && (
        <div className="processing-status animate-fade-in">
          <div className="processing-spinner" />
          <div className="processing-text">Đang xử lý...</div>

          <div style={{ width: '100%', maxWidth: 400 }}>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progressValue}%` }} />
            </div>
            <div className="processing-detail" style={{ marginTop: 'var(--space-sm)' }}>
              {progressValue}% • ETA: ~{Math.max(0, Math.ceil((100 - progressValue) * 0.06))}s
            </div>
          </div>

          <div className="processing-stages">
            {stages.map((stage, i) => (
              <div
                key={stage.key}
                className={`processing-stage ${stageStatuses[i] === 'active' ? 'active' : ''} ${stageStatuses[i] === 'done' ? 'done' : ''}`}
              >
                <span>
                  {stageStatuses[i] === 'done' ? <CheckCircle2 size={16} className="text-success" /> : stageStatuses[i] === 'active' ? <Loader2 size={16} className="text-purple-400 animate-spin" /> : <Circle size={16} className="text-muted" />}
                </span>
                <span>{stage.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {done && !processing && (
        <div className="processing-status animate-fade-in">
          <CheckCircle2 size={48} className="text-success mb-4" />
          <div className="processing-text" style={{ color: 'var(--success)' }}>Nhận dạng hoàn tất!</div>

          <div className="result-stats">
            <div className="result-stat">
              <div className="result-stat-value">{segments.length}</div>
              <div className="result-stat-label">Đoạn</div>
            </div>
            <div className="result-stat">
              <div className="result-stat-value">{totalWords}</div>
              <div className="result-stat-label">Ký tự</div>
            </div>
            <div className="result-stat">
              <div className="result-stat-value">
                {segments.length > 0 ? formatTime(segments[segments.length - 1].end) : '00:00'}
              </div>
              <div className="result-stat-label">Thời lượng</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
            <button className="btn btn-secondary" onClick={generateSRT}>
              <Download size={16} /> Tải SRT
            </button>
            <button className="btn btn-primary" onClick={startProcessing}>
              <RefreshCw size={16} /> Xử lý lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Step3STT;
