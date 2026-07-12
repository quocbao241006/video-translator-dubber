export const createJobSlice = (set) => ({
  // Step navigation
  currentStep: 1,

  // Job status
  jobId: null,
  jobStatus: 'idle',
  progress: 0,
  progressText: '',

  // Actions
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 7) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),

  setJobStatus: (status) => set({ jobStatus: status }),
  setProgress: (progress, text) =>
    set({ progress, ...(text !== undefined && { progressText: text }) }),

  resetJobSlice: () => set({
    currentStep: 1,
    jobId: null,
    jobStatus: 'idle',
    progress: 0,
    progressText: '',
  }),
});
