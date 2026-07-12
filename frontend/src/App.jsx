import { useEffect } from 'react';
import './App.css';
import useProjectStore from './store/projectStore';
import api from './services/api';
import AppHeader from './components/layout/AppHeader';
import BottomBar from './components/layout/BottomBar';
import Step1Upload from './components/steps/Step1Upload';
import Step2BlurZone from './components/steps/Step2BlurZone';
import Step3STT from './components/steps/Step3STT';
import Step4ReviewSRT from './components/steps/Step4ReviewSRT';
import Step5Translation from './components/steps/Step5Translation';
import Step6TTS from './components/steps/Step6TTS';
import Step7Export from './components/steps/Step7Export';

const stepComponents = {
  1: Step1Upload,
  2: Step2BlurZone,
  3: Step3STT,
  4: Step4ReviewSRT,
  5: Step5Translation,
  6: Step6TTS,
  7: Step7Export,
};

function App() {
  const currentStep = useProjectStore((s) => s.currentStep);
  const jobId = useProjectStore((s) => s.jobId);
  const videoUrl = useProjectStore((s) => s.videoUrl);
  const StepComponent = stepComponents[currentStep];

  useEffect(() => {
    // Rehydrate videoUrl from backend if we have a job but lost the local blob URL due to page refresh
    if (jobId && !videoUrl) {
      useProjectStore.setState({ videoUrl: api.getDownloadUrl(jobId, 'original_video') });
    }
  }, [jobId, videoUrl]);

  return (
    <div className="app">
      <AppHeader />
      <main className="app-content">
        <div className="step-content" key={currentStep}>
          <StepComponent />
        </div>
      </main>
      <BottomBar />
    </div>
  );
}

export default App;
