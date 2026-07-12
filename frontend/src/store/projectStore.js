import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createVideoSlice } from './slices/videoSlice';
import { createSegmentSlice } from './slices/segmentSlice';
import { createJobSlice } from './slices/jobSlice';

const useProjectStore = create(
  persist(
    (...a) => ({
      ...createVideoSlice(...a),
      ...createSegmentSlice(...a),
      ...createJobSlice(...a),

      // Reset
      reset: () => {
        const [, get] = a; // to access methods if needed, though we can just call the slice resetters
        // Note: we can either call set directly or use the individual slice resetters
        a[0]({ // set
          currentStep: 1,
          videoFile: null,
          videoUrl: null,
          videoMetadata: { duration: 0, resolution: '', codec: '', size: 0, filename: '' },
          blurZones: [],
          subtitleZone: { y: 85, fontFamily: 'Inter', fontSize: 24, color: '#FFFFFF', outlineColor: '#000000', outlineWidth: 2, bgOpacity: 50 },
          segments: [],
          ttsVoice: 'vi-VN-HoaiMyNeural',
          translationQuality: 'quality',
          genre: 'animation',
          ttsGenerated: false,
          audioMix: { original: 15, dubbed: 85, bgm: 40 },
          bgmFile: null,
          bgmUrl: null,
          jobId: null,
          jobStatus: 'idle',
          progress: 0,
          progressText: '',
          exportFormat: 'mp4',
          exportQuality: '720p',
          subtitleMode: 'burn',
          glossary: [
            { zh: '修炼', vi: 'tu luyện' },
            { zh: '前辈', vi: 'tiền bối' },
            { zh: '灵气', vi: 'linh khí' },
            { zh: '丹药', vi: 'đan dược' },
            { zh: '渡劫', vi: 'độ kiếp' },
          ],
        });
      },
    }),
    {
      name: 'vietdub-storage',
      partialize: (state) => Object.fromEntries(
        Object.entries(state).filter(([key]) => 
          !['videoFile', 'videoUrl', 'bgmFile', 'bgmUrl'].includes(key)
        )
      ),
    }
  )
);

export default useProjectStore;
