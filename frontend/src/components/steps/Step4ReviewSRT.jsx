import { useState, useRef } from 'react';
import useProjectStore from '../../store/projectStore';
import VideoPlayer from '../video/VideoPlayer';

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const formatSrtTimestamp = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

function Step4ReviewSRT() {
  const videoUrl = useProjectStore((s) => s.videoUrl);
  const segments = useProjectStore((s) => s.segments);
  const setSegments = useProjectStore((s) => s.setSegments);
  const updateSegment = useProjectStore((s) => s.updateSegment);
  const deleteSegment = useProjectStore((s) => s.deleteSegment);
  const splitSegment = useProjectStore((s) => s.splitSegment);
  const mergeSegments = useProjectStore((s) => s.mergeSegments);

  const [activeId, setActiveId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editZh, setEditZh] = useState('');
  const [editVi, setEditVi] = useState('');
  const [shiftMs, setShiftMs] = useState(100);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleSegmentClick = (seg) => {
    setActiveId(seg.id);
    videoRef.current?.seekTo(seg.start);
  };

  const handlePlaySegment = (seg, e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.seekTo(seg.start);
    video.play();
    // Stop at segment end
    const checkEnd = setInterval(() => {
      const t = video.getCurrentTime();
      if (t >= seg.end) {
        video.pause();
        clearInterval(checkEnd);
      }
    }, 100);
  };

  const handleEdit = (seg, e) => {
    e.stopPropagation();
    setEditingId(seg.id);
    setEditZh(seg.text_zh);
    setEditVi(seg.text_vi);
  };

  const handleSaveEdit = (id) => {
    updateSegment(id, { text_zh: editZh, text_vi: editVi });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = (seg, e) => {
    e.stopPropagation();
    if (window.confirm(`Xóa đoạn #${seg.index}?`)) {
      deleteSegment(seg.id);
      if (activeId === seg.id) setActiveId(null);
    }
  };

  const handleSplit = () => {
    if (!activeId) return;
    const seg = segments.find((s) => s.id === activeId);
    if (!seg) return;
    const midTime = (seg.start + seg.end) / 2;
    splitSegment(activeId, midTime);
  };

  const handleMerge = () => {
    if (!activeId) return;
    const idx = segments.findIndex((s) => s.id === activeId);
    if (idx < 0 || idx >= segments.length - 1) return;
    mergeSegments([segments[idx].id, segments[idx + 1].id]);
  };

  const handleShift = (direction) => {
    const delta = (direction * shiftMs) / 1000;
    const shifted = segments.map((seg) => ({
      ...seg,
      start: Math.max(0, seg.start + delta),
      end: Math.max(0, seg.end + delta),
    }));
    setSegments(shifted);
  };

  const handleImportSRT = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const blocks = text.trim().split(/\n\n+/);
      const imported = blocks.map((block, i) => {
        const lines = block.split('\n');
        const timeLine = lines.find((l) => l.includes('-->'));
        let start = 0, end = 1;
        if (timeLine) {
          const parts = timeLine.split('-->').map((p) => p.trim());
          start = parseSrtTime(parts[0]);
          end = parseSrtTime(parts[1]);
        }
        const textLines = lines.filter((l) => !l.includes('-->') && !/^\d+$/.test(l.trim()));
        return {
          id: Date.now() + i,
          index: i + 1,
          start,
          end,
          text_zh: textLines[0] || '',
          text_vi: textLines[1] || '',
        };
      });
      setSegments(imported);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const parseSrtTime = (str) => {
    const match = str.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
    if (!match) return 0;
    return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 1000;
  };

  const handleExportSRT = () => {
    let srt = '';
    segments.forEach((seg) => {
      srt += `${seg.index}\n`;
      srt += `${formatSrtTimestamp(seg.start)} --> ${formatSrtTimestamp(seg.end)}\n`;
      if (seg.text_zh) srt += `${seg.text_zh}\n`;
      if (seg.text_vi) srt += `${seg.text_vi}\n`;
      srt += '\n';
    });
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="panel-main">
        <VideoPlayer ref={videoRef} src={videoUrl} />
      </div>

      <div className="panel-tools">
        <div className="panel-tools-header">
          <span className="panel-tools-title">
            📝 Chỉnh sửa phụ đề
          </span>
          <span className="badge badge-info">{segments.length} đoạn</span>
        </div>

        <div style={{ padding: 'var(--space-sm) var(--space-lg)' }}>
          <div className="srt-toolbar">
            <button className="btn btn-ghost btn-sm" onClick={handleSplit} disabled={!activeId} title="Tách đoạn">
              ✂️ Tách
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleMerge} disabled={!activeId} title="Gộp với đoạn kế">
              🔗 Gộp
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => handleShift(-1)}>◀</button>
              <input
                type="number"
                className="input"
                value={shiftMs}
                onChange={(e) => setShiftMs(parseInt(e.target.value) || 0)}
                style={{ width: 60, padding: '4px 6px', fontSize: 'var(--font-xs)', textAlign: 'center' }}
              />
              <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>ms</span>
              <button className="btn btn-ghost btn-sm" onClick={() => handleShift(1)}>▶</button>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()}>
              📥 Nhập SRT
            </button>
            <input ref={fileInputRef} type="file" accept=".srt" onChange={handleImportSRT} style={{ display: 'none' }} />
            <button className="btn btn-ghost btn-sm" onClick={handleExportSRT}>
              📤 Xuất SRT
            </button>
          </div>
        </div>

        <div className="panel-tools-body">
          <div className="srt-list">
            {segments.map((seg) => (
              <div
                key={seg.id}
                className={`srt-segment ${activeId === seg.id ? 'active' : ''}`}
                onClick={() => handleSegmentClick(seg)}
              >
                <div className="srt-segment-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span className="srt-segment-index">#{seg.index}</span>
                    <span className="srt-segment-time">
                      {formatSrtTimestamp(seg.start)} → {formatSrtTimestamp(seg.end)}
                    </span>
                  </div>
                  <div className="srt-segment-actions">
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => handlePlaySegment(seg, e)} title="Play">
                      ▶
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => handleEdit(seg, e)} title="Edit">
                      ✏️
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => handleDelete(seg, e)} title="Delete">
                      🗑️
                    </button>
                  </div>
                </div>

                {editingId === seg.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    <textarea
                      className="srt-segment-text-input"
                      value={editZh}
                      onChange={(e) => setEditZh(e.target.value)}
                      placeholder="Tiếng Trung"
                      rows={2}
                    />
                    <textarea
                      className="srt-segment-text-input"
                      value={editVi}
                      onChange={(e) => setEditVi(e.target.value)}
                      placeholder="Tiếng Việt"
                      rows={2}
                    />
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={handleCancelEdit}>Hủy</button>
                      <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(seg.id)}>Lưu</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="srt-segment-text zh">{seg.text_zh}</div>
                    <div className="srt-segment-text vi">
                      {seg.text_vi || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa dịch</span>}
                    </div>
                  </>
                )}
              </div>
            ))}

            {segments.length === 0 && (
              <div className="processing-status">
                <div style={{ fontSize: 32 }}>📝</div>
                <div className="processing-text">Chưa có phụ đề</div>
                <div className="processing-detail">Hãy chạy STT ở bước 3 hoặc nhập file SRT</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: 'var(--space-md) var(--space-lg)', borderTop: '1px solid var(--border-subtle)' }}>
          <button className="btn btn-secondary" onClick={handleExportSRT} style={{ width: '100%' }}>
            📤 Xuất file SRT
          </button>
        </div>
      </div>
    </>
  );
}

export default Step4ReviewSRT;
