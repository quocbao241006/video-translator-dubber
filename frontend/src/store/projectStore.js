import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useProjectStore = create(
  persist(
    (set, get) => ({
  // Step navigation
  currentStep: 1,

  // Video
  videoFile: null,
  videoUrl: null,
  videoMetadata: {
    duration: 0,
    resolution: '',
    codec: '',
    size: 0,
    filename: '',
  },

  // Blur zones
  blurZones: [],

  // Subtitle zone
  subtitleZone: {
    y: 85,
    fontFamily: 'Inter',
    fontSize: 24,
    color: '#FFFFFF',
    outlineColor: '#000000',
    outlineWidth: 2,
    bgOpacity: 50,
  },

  // Segments (STT / SRT)
  segments: [],

  // TTS
  ttsVoice: 'vi-VN-HoaiMyNeural',
  translationQuality: 'quality',
  genre: 'animation',
  ttsGenerated: false,

  // Audio mix
  audioMix: { original: 15, dubbed: 85, bgm: 40 },
  bgmFile: null,
  bgmUrl: null,

  // Job status
  jobId: null,
  jobStatus: 'idle',
  progress: 0,
  progressText: '',

  // Export
  exportFormat: 'mp4',
  exportQuality: '720p',
  subtitleMode: 'burn',

  // Glossary
  glossary: [
    { zh: '修炼', vi: 'tu luyện' },
    { zh: '前辈', vi: 'tiền bối' },
    { zh: '灵气', vi: 'linh khí' },
    { zh: '丹药', vi: 'đan dược' },
    { zh: '渡劫', vi: 'độ kiếp' },
  ],

  // ========================
  // ACTIONS
  // ========================

  // Step navigation
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 7) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),

  // Video
  setVideoFile: (file) => {
    const url = file ? URL.createObjectURL(file) : null;
    set({
      videoFile: file,
      videoUrl: url,
      videoMetadata: file
        ? { ...get().videoMetadata, filename: file.name, size: file.size }
        : { duration: 0, resolution: '', codec: '', size: 0, filename: '' },
    });
  },
  updateVideoMetadata: (meta) =>
    set((s) => ({ videoMetadata: { ...s.videoMetadata, ...meta } })),

  // Blur zones
  addBlurZone: (zone) =>
    set((s) => ({
      blurZones: [
        ...s.blurZones,
        { id: Date.now(), x: 0, y: 0, width: 100, height: 100, blur: 10, color: 'rgba(0,0,255,0.3)', ...zone },
      ],
    })),
  removeBlurZone: (id) =>
    set((s) => ({ blurZones: s.blurZones.filter((z) => z.id !== id) })),
  updateBlurZone: (id, updates) =>
    set((s) => ({
      blurZones: s.blurZones.map((z) => (z.id === id ? { ...z, ...updates } : z)),
    })),

  // Subtitle zone
  setSubtitleZone: (updates) =>
    set((s) => ({ subtitleZone: { ...s.subtitleZone, ...updates } })),

  // Segments
  setSegments: (segments) => set({ segments, ttsGenerated: false }),
  updateSegment: (id, updates) =>
    set((s) => ({
      segments: s.segments.map((seg) =>
        seg.id === id ? { ...seg, ...updates } : seg
      ),
      ttsGenerated: false,
    })),
  deleteSegment: (id) =>
    set((s) => ({
      segments: s.segments
        .filter((seg) => seg.id !== id)
        .map((seg, i) => ({ ...seg, index: i + 1 })),
      ttsGenerated: false,
    })),
  addSegment: (segment) =>
    set((s) => {
      const newSegs = [
        ...s.segments,
        {
          id: Date.now(),
          index: s.segments.length + 1,
          start: 0,
          end: 1,
          text_zh: '',
          text_vi: '',
          ...segment,
        },
      ].sort((a, b) => a.start - b.start);
      return { segments: newSegs.map((seg, i) => ({ ...seg, index: i + 1 })), ttsGenerated: false };
    }),
  splitSegment: (id, splitTime) =>
    set((s) => {
      const idx = s.segments.findIndex((seg) => seg.id === id);
      if (idx === -1) return s;
      const seg = s.segments[idx];
      if (splitTime <= seg.start || splitTime >= seg.end) return s;
      const seg1 = { ...seg, end: splitTime };
      const seg2 = {
        ...seg,
        id: Date.now(),
        start: splitTime,
        text_zh: seg.text_zh,
        text_vi: seg.text_vi,
      };
      const newSegs = [...s.segments.slice(0, idx), seg1, seg2, ...s.segments.slice(idx + 1)];
      return { segments: newSegs.map((s2, i) => ({ ...s2, index: i + 1 })), ttsGenerated: false };
    }),
  mergeSegments: (ids) =>
    set((s) => {
      if (!ids || ids.length < 2) return s;
      const toMerge = s.segments.filter((seg) => ids.includes(seg.id)).sort((a, b) => a.start - b.start);
      if (toMerge.length < 2) return s;
      const merged = {
        id: toMerge[0].id,
        index: toMerge[0].index,
        start: toMerge[0].start,
        end: toMerge[toMerge.length - 1].end,
        text_zh: toMerge.map((s2) => s2.text_zh).join(' '),
        text_vi: toMerge.map((s2) => s2.text_vi).filter(Boolean).join(' '),
      };
      const remaining = s.segments.filter((seg) => !ids.includes(seg.id));
      const newSegs = [...remaining, merged].sort((a, b) => a.start - b.start);
      return { segments: newSegs.map((s2, i) => ({ ...s2, index: i + 1 })), ttsGenerated: false };
    }),

  // Audio
  setAudioMix: (updates) =>
    set((s) => ({ audioMix: { ...s.audioMix, ...updates } })),
  setBgmFile: (file) => {
    const url = file ? URL.createObjectURL(file) : null;
    set({ bgmFile: file, bgmUrl: url });
  },

  // Job
  setJobStatus: (status) => set({ jobStatus: status }),
  setProgress: (progress, text) =>
    set({ progress, ...(text !== undefined && { progressText: text }) }),
  setTtsGenerated: (val) => set({ ttsGenerated: val }),

  // Glossary
  addGlossaryTerm: (term) =>
    set((s) => ({ glossary: [...s.glossary, term] })),
  removeGlossaryTerm: (index) =>
    set((s) => ({ glossary: s.glossary.filter((_, i) => i !== index) })),

  // Reset
  reset: () =>
    set({
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
    }),
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
