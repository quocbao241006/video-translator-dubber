import { useRef, useState, useEffect, useCallback } from 'react';
import useProjectStore from '../../store/projectStore';
import VideoPlayer from '../video/VideoPlayer';

function Step2BlurZone() {
  const videoUrl = useProjectStore((s) => s.videoUrl);
  const blurZones = useProjectStore((s) => s.blurZones);
  const addBlurZone = useProjectStore((s) => s.addBlurZone);
  const removeBlurZone = useProjectStore((s) => s.removeBlurZone);
  const updateBlurZone = useProjectStore((s) => s.updateBlurZone);
  const subtitleZone = useProjectStore((s) => s.subtitleZone);
  const setSubtitleZone = useProjectStore((s) => s.setSubtitleZone);
  const videoMetadata = useProjectStore((s) => s.videoMetadata);

  const canvasRef = useRef(null);
  const videoContainerRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing blur zones
    const vW = videoMetadata.width || canvas.width;
    const vH = videoMetadata.height || canvas.height;
    const scaleX = canvas.width / vW;
    const scaleY = canvas.height / vH;

    blurZones.forEach((zone) => {
      ctx.fillStyle = zone.color || 'rgba(0, 100, 255, 0.3)';
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.lineWidth = 2;
      const zx = zone.x * scaleX;
      const zy = zone.y * scaleY;
      const zw = zone.width * scaleX;
      const zh = zone.height * scaleY;
      ctx.fillRect(zx, zy, zw, zh);
      ctx.strokeRect(zx, zy, zw, zh);
    });

    // Draw current drawing rectangle
    if (currentRect) {
      ctx.fillStyle = 'rgba(139, 92, 246, 0.3)';
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      ctx.setLineDash([]);
    }

    // Draw subtitle zone indicator
    const subY = (subtitleZone.y / 100) * canvas.height;
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(0, subY);
    ctx.lineTo(canvas.width, subY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Subtitle label
    ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('📝 Phụ đề', 8, subY - 6);
  }, [blurZones, currentRect, subtitleZone.y]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e) => {
    const pos = getCanvasPos(e);
    setDrawing(true);
    setStartPos(pos);
    setCurrentRect(null);
  };

  const handleMouseMove = (e) => {
    if (!drawing) return;
    const pos = getCanvasPos(e);
    setCurrentRect({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      width: Math.abs(pos.x - startPos.x),
      height: Math.abs(pos.y - startPos.y),
    });
  };

  const handleMouseUp = () => {
    if (!drawing) return;
    setDrawing(false);
    if (currentRect && currentRect.width > 10 && currentRect.height > 10) {
      const vW = videoMetadata.width || canvasRef.current.width;
      const vH = videoMetadata.height || canvasRef.current.height;
      const scaleX = vW / canvasRef.current.width;
      const scaleY = vH / canvasRef.current.height;

      addBlurZone({
        x: Math.round(currentRect.x * scaleX),
        y: Math.round(currentRect.y * scaleY),
        width: Math.round(currentRect.width * scaleX),
        height: Math.round(currentRect.height * scaleY),
        blur: 10,
        color: 'rgba(0, 100, 255, 0.3)',
      });
    }
    setCurrentRect(null);
  };

  return (
    <>
      <div className="panel-main">
        <div className="video-container" ref={videoContainerRef} style={{ position: 'relative' }}>
          {videoUrl ? (
            <video className="video-element" src={videoUrl} controls />
          ) : (
            <div className="video-placeholder">
              <div className="video-placeholder-icon">🎬</div>
              <div className="video-placeholder-text">Chưa có video</div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="blur-zone-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>

      <div className="panel-tools">
        <div className="panel-tools-header">
          <span className="panel-tools-title">🔲 Vùng mờ &amp; Phụ đề</span>
        </div>
        <div className="panel-tools-body">
          {/* Blur Zones Section */}
          <div className="section-title">🔲 Blur Zones <span className="badge badge-info">{blurZones.length}</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            {blurZones.map((zone) => (
              <div key={zone.id} className="blur-zone-item">
                <div className="blur-zone-inputs">
                  <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>X</label>
                  <input
                    type="number"
                    className="input"
                    value={zone.x}
                    onChange={(e) => updateBlurZone(zone.id, { x: parseInt(e.target.value) || 0 })}
                  />
                  <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Y</label>
                  <input
                    type="number"
                    className="input"
                    value={zone.y}
                    onChange={(e) => updateBlurZone(zone.id, { y: parseInt(e.target.value) || 0 })}
                  />
                  <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>W</label>
                  <input
                    type="number"
                    className="input"
                    value={zone.width}
                    onChange={(e) => updateBlurZone(zone.id, { width: parseInt(e.target.value) || 0 })}
                  />
                  <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>H</label>
                  <input
                    type="number"
                    className="input"
                    value={zone.height}
                    onChange={(e) => updateBlurZone(zone.id, { height: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
                  <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Blur</label>
                  <input
                    type="range"
                    className="slider"
                    min={0}
                    max={30}
                    value={zone.blur}
                    onChange={(e) => updateBlurZone(zone.id, { blur: parseInt(e.target.value) })}
                  />
                  <span className="slider-value">{zone.blur}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeBlurZone(zone.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const cx = videoMetadata.width ? videoMetadata.width / 2 : 100;
              const cy = videoMetadata.height ? videoMetadata.height / 2 : 100;
              addBlurZone({ x: Math.round(cx - 100), y: Math.round(cy - 50), width: 200, height: 100, blur: 10, color: 'rgba(0, 100, 255, 0.3)' });
            }}
          >
            + Thêm vùng mờ
          </button>

          <div className="section-divider" />

          {/* Subtitle Zone Section */}
          <div className="section-title">📝 Subtitle Zone</div>

          <div className="field-group">
            <label className="label">Vị trí Y ({subtitleZone.y}%)</label>
            <div className="slider-container">
              <input
                type="range"
                className="slider"
                min={0}
                max={100}
                value={subtitleZone.y}
                onChange={(e) => setSubtitleZone({ y: parseInt(e.target.value) })}
              />
              <span className="slider-value">{subtitleZone.y}%</span>
            </div>
          </div>

          <div className="field-group">
            <label className="label">Cỡ chữ ({subtitleZone.fontSize}px)</label>
            <div className="slider-container">
              <input
                type="range"
                className="slider"
                min={16}
                max={48}
                value={subtitleZone.fontSize}
                onChange={(e) => setSubtitleZone({ fontSize: parseInt(e.target.value) })}
              />
              <span className="slider-value">{subtitleZone.fontSize}px</span>
            </div>
          </div>

          <div className="field-group">
            <label className="label">Màu chữ</label>
            <div className="field-row">
              <input
                type="color"
                value={subtitleZone.color}
                onChange={(e) => setSubtitleZone({ color: e.target.value })}
                style={{ width: 36, height: 36, border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{subtitleZone.color}</span>
            </div>
          </div>

          <div className="field-group">
            <label className="label">Màu viền</label>
            <div className="field-row">
              <input
                type="color"
                value={subtitleZone.outlineColor}
                onChange={(e) => setSubtitleZone({ outlineColor: e.target.value })}
                style={{ width: 36, height: 36, border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{subtitleZone.outlineColor}</span>
            </div>
          </div>

          <div className="field-group">
            <label className="label">Độ dày viền ({subtitleZone.outlineWidth}px)</label>
            <div className="slider-container">
              <input
                type="range"
                className="slider"
                min={0}
                max={5}
                value={subtitleZone.outlineWidth}
                onChange={(e) => setSubtitleZone({ outlineWidth: parseInt(e.target.value) })}
              />
              <span className="slider-value">{subtitleZone.outlineWidth}px</span>
            </div>
          </div>

          <div className="field-group">
            <label className="label">Độ mờ nền ({subtitleZone.bgOpacity}%)</label>
            <div className="slider-container">
              <input
                type="range"
                className="slider"
                min={0}
                max={100}
                value={subtitleZone.bgOpacity}
                onChange={(e) => setSubtitleZone({ bgOpacity: parseInt(e.target.value) })}
              />
              <span className="slider-value">{subtitleZone.bgOpacity}%</span>
            </div>
          </div>

          <div className="subtitle-preview-box">
            <span
              style={{
                fontFamily: subtitleZone.fontFamily,
                fontSize: `${subtitleZone.fontSize}px`,
                color: subtitleZone.color,
                textShadow: `
                  -${subtitleZone.outlineWidth}px -${subtitleZone.outlineWidth}px 0 ${subtitleZone.outlineColor},
                  ${subtitleZone.outlineWidth}px -${subtitleZone.outlineWidth}px 0 ${subtitleZone.outlineColor},
                  -${subtitleZone.outlineWidth}px ${subtitleZone.outlineWidth}px 0 ${subtitleZone.outlineColor},
                  ${subtitleZone.outlineWidth}px ${subtitleZone.outlineWidth}px 0 ${subtitleZone.outlineColor}
                `,
                backgroundColor: `rgba(0, 0, 0, ${subtitleZone.bgOpacity / 100})`,
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Đây là phụ đề mẫu tiếng Việt
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export default Step2BlurZone;
