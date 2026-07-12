export const createVideoSlice = (set, get) => ({
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

  // Audio mix
  audioMix: { original: 15, dubbed: 85, bgm: 40 },
  bgmFile: null,
  bgmUrl: null,

  // Export
  exportFormat: 'mp4',
  exportQuality: '720p',
  subtitleMode: 'burn',

  // Actions
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

  setSubtitleZone: (updates) =>
    set((s) => ({ subtitleZone: { ...s.subtitleZone, ...updates } })),

  setAudioMix: (updates) =>
    set((s) => ({ audioMix: { ...s.audioMix, ...updates } })),
  
  setBgmFile: (file) => {
    const url = file ? URL.createObjectURL(file) : null;
    set({ bgmFile: file, bgmUrl: url });
  },
  
  resetVideoSlice: () => set({
    videoFile: null,
    videoUrl: null,
    videoMetadata: { duration: 0, resolution: '', codec: '', size: 0, filename: '' },
    blurZones: [],
    subtitleZone: { y: 85, fontFamily: 'Inter', fontSize: 24, color: '#FFFFFF', outlineColor: '#000000', outlineWidth: 2, bgOpacity: 50 },
    audioMix: { original: 15, dubbed: 85, bgm: 40 },
    bgmFile: null,
    bgmUrl: null,
    exportFormat: 'mp4',
    exportQuality: '720p',
    subtitleMode: 'burn',
  }),
});
