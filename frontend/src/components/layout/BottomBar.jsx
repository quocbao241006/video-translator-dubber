import { useState } from 'react';
import useProjectStore from '../../store/projectStore';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, CheckCircle2, Film } from 'lucide-react';

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
      if (!videoFile) return toast.error("Vui lòng chọn video!");
      if (!jobId) {
        try {
          setLoading(true);
          const { default: api } = await import('../../services/api');
          const res = await api.uploadVideo(videoFile, { ttsVoice, translationQuality, genre });
          useProjectStore.setState({ jobId: res.job_id, jobStatus: 'uploaded' });
        } catch (e) {
          toast.error("Lỗi upload: " + e.message);
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
          toast.error("Lỗi lưu cấu hình: " + e.message);
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
          toast.error("Lỗi lưu phụ đề: " + e.message);
          return;
        } finally {
          setLoading(false);
        }
      }
    } else if (currentStep === 6) {
      if (!useProjectStore.getState().ttsGenerated) {
        return toast.error("Vui lòng Bấm tạo TTS trước khi tiếp tục!");
      }
    }
    nextStep();
  };

  return (
    <div className="bottom-bar">
      <div className="bottom-bar-left">
        {videoMetadata.filename && (
          <span className="bottom-bar-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Film size={16} className="text-purple-400" /> {videoMetadata.filename}
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
          <ArrowLeft size={16} /> Quay lại
        </button>
        {currentStep === 7 ? (
          <button className="btn btn-primary btn-lg" onClick={() => {}}>
            <CheckCircle2 size={18} /> Hoàn tất
          </button>
        ) : (
          <button className="btn btn-success" onClick={handleNext} disabled={loading}>
            {loading ? 'Đang xử lý...' : (
              <>Xác nhận & Tiếp tục <ArrowRight size={16} /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default BottomBar;
