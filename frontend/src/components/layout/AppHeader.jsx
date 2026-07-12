import useProjectStore from '../../store/projectStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Trash2, CheckCircle2, UploadCloud, Maximize, Mic2, FileText, Globe2, Speech, Clapperboard, Video } from 'lucide-react';

const steps = [
  { label: 'Upload', icon: <UploadCloud size={16} /> },
  { label: 'Vùng mờ', icon: <Maximize size={16} /> },
  { label: 'Tách âm', icon: <Mic2 size={16} /> },
  { label: 'Phụ đề', icon: <FileText size={16} /> },
  { label: 'Dịch thuật', icon: <Globe2 size={16} /> },
  { label: 'Lồng tiếng', icon: <Speech size={16} /> },
  { label: 'Xuất video', icon: <Clapperboard size={16} /> },
];

function AppHeader() {
  const currentStep = useProjectStore((s) => s.currentStep);
  const setStep = useProjectStore((s) => s.setStep);
  const reset = useProjectStore((s) => s.reset);

  const handleCleanup = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn Xóa toàn bộ file rác (video gốc, file xử lý, kết quả cũ) trên máy chủ? Thao tác này KHÔNG THỂ HÀNH QUẢN và sẽ tải lại trang!')) return;
    const loadingToast = toast.loading('Đang dọn dẹp hệ thống...');
    try {
      await api.cleanup();
      reset();
      toast.success('Đã dọn rác thành công!', { id: loadingToast });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e) {
      toast.error('Lỗi xóa rác: ' + e.message, { id: loadingToast });
    }
  };

  return (
    <header className="app-header">
      <div className="app-logo">
        <span className="app-logo-icon"><Video size={24} className="text-purple-400" /></span>
        <span>VietDub Studio</span>
      </div>

      <nav className="step-nav">
        {steps.map((step, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div key={stepNum} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                className={`step-nav-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => setStep(stepNum)}
              >
                <span className="step-nav-number">
                  {isCompleted ? <CheckCircle2 size={16} /> : step.icon}
                </span>
                <span>{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`step-nav-connector ${isCompleted ? 'completed' : ''}`} />
              )}
            </div>
          );
        })}
      </nav>
      
      <div style={{ marginLeft: 'auto' }}>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={handleCleanup}
          style={{ color: 'var(--error)' }}
        >
          <Trash2 size={16} /> Xóa rác
        </button>
      </div>
    </header>
  );
}

export default AppHeader;
