import useProjectStore from '../../store/projectStore';
import api from '../../services/api';

const steps = [
  { label: 'Upload', icon: '📥' },
  { label: 'Vùng mờ', icon: '🔲' },
  { label: 'Tách âm', icon: '🎙️' },
  { label: 'Phụ đề', icon: '📝' },
  { label: 'Dịch thuật', icon: '🌐' },
  { label: 'Lồng tiếng', icon: '🗣️' },
  { label: 'Xuất video', icon: '🎬' },
];

function AppHeader() {
  const currentStep = useProjectStore((s) => s.currentStep);
  const setStep = useProjectStore((s) => s.setStep);
  const reset = useProjectStore((s) => s.reset);

  const handleCleanup = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tất cả rác video và reset dự án hiện tại không?')) return;
    try {
      await api.cleanup();
      reset();
      window.location.reload(); // Force full reload to wipe any object URLs
    } catch (e) {
      alert('Lỗi xóa rác: ' + e.message);
    }
  };

  return (
    <header className="app-header">
      <div className="app-logo">
        <span className="app-logo-icon">🎬</span>
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
                  {isCompleted ? '✓' : step.icon}
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
        <button className="btn btn-secondary btn-sm" onClick={handleCleanup}>
          🧹 Xóa rác
        </button>
      </div>
    </header>
  );
}

export default AppHeader;
