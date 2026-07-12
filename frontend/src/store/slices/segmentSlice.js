export const createSegmentSlice = (set) => ({
  // Segments (STT / SRT)
  segments: [],
  ttsGenerated: false,

  // Settings
  ttsVoice: 'vi-VN-HoaiMyNeural',
  translationQuality: 'quality',
  genre: 'animation',

  // Glossary
  glossary: [
    { zh: '修炼', vi: 'tu luyện' },
    { zh: '前辈', vi: 'tiền bối' },
    { zh: '灵气', vi: 'linh khí' },
    { zh: '丹药', vi: 'đan dược' },
    { zh: '渡劫', vi: 'độ kiếp' },
  ],

  // Actions
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

  setTtsGenerated: (val) => set({ ttsGenerated: val }),

  addGlossaryTerm: (term) =>
    set((s) => ({ glossary: [...s.glossary, term] })),
  removeGlossaryTerm: (index) =>
    set((s) => ({ glossary: s.glossary.filter((_, i) => i !== index) })),

  resetSegmentSlice: () => set({
    segments: [],
    ttsVoice: 'vi-VN-HoaiMyNeural',
    translationQuality: 'quality',
    genre: 'animation',
    ttsGenerated: false,
    glossary: [
      { zh: '修炼', vi: 'tu luyện' },
      { zh: '前辈', vi: 'tiền bối' },
      { zh: '灵气', vi: 'linh khí' },
      { zh: '丹药', vi: 'đan dược' },
      { zh: '渡劫', vi: 'độ kiếp' },
    ],
  }),
});
