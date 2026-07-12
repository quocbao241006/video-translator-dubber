import { useState } from 'react';
import useProjectStore from '../../store/projectStore';

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

function BottomBar() {
  const currentStep = useProjectStore((s) => s.currentStep);
  const nextStep = useProjectStore((s) => s.nextStep);
  const prevStep = useProjectStore((s) => s.prevStep);
  const videoMetadata = useProjectStore((s) => s.videoMetadata);
  const videoFile = useProjectStore((s) => s.videoFile);
  const jobId = useProjectStore((s) => s.jobId);
  const ttsVoice = useProjectStore((s) => s.ttsVoice);
  const translationQuality = useProjectStore((s) => s.translationQuality);
  const genre = useProjectStore((s) => s.genre);

  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!videoFile) return alert("Vui lòng chọn video!");
      if (!jobId) {
        try {
          setLoading(true);
          const { default: api } = await import('../../services/api');
          const res = await api.uploadVideo(videoFile, { ttsVoice, translationQuality, genre });
          useProjectStore.setState({ jobId: res.job_id, jobStatus: 'uploaded' });
        } catch (e) {
          alert("Lỗi upload: " + e.message);
          return;
        } finally {
          setLoading(false);
        }
      }
    } else if (currentStep === 2) {
      if (jobId) {
        try {
          setLoading(true);
          const { default: api } = await import('../../services/api');
          const state = useProjectStore.getState();
          await api.saveBlurZones(jobId, state.blurZones);
          await api.saveSubtitleZone(jobId, state.subtitleZone);
        } catch (e) {
          alert("Lỗi lưu cấu hình: " + e.message);
          return;
        } finally {
          setLoading(false);
        }
      }
    } else if (currentStep === 4 || currentStep === 5) {
      if (jobId) {
        try {
          setLoading(true);
          const { default: api } = await import('../../services/api');
          const state = useProjectStore.getState();
          await api.updateSRT(jobId, state.segments);
        } catch (e) {
          alert("Lỗi lưu phụ đề: " + e.message);
          return;
        } finally {
          setLoading(false);
        }
      }
    }
    nextStep();
  };

  return (
    <div className="bottom-bar">
      <div className="bottom-bar-left">
        {videoMetadata.filename && (
          <span className="bottom-bar-info">
            🎬 {videoMetadata.filename}
            {videoMetadata.duration > 0 && ` • ${formatTime(videoMetadata.duration)}`}
          </span>
        )}
      </div>

      <div className="bottom-bar-right">
        <button
          className="btn btn-secondary"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          ← Quay lại
        </button>
        {currentStep === 7 ? (
          <button className="btn btn-primary btn-lg" onClick={() => {}}>
            🎬 Xuất Video
          </button>
        ) : (
          <button className="btn btn-success" onClick={handleNext} disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Xác nhận & Tiếp tục →'}
          </button>
        )}
      </div>
    </div>
  );
}

export default BottomBar;
