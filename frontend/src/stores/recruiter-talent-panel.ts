import { create } from 'zustand';

export type RecruiterTalentPanelState = {
  candidateId: number;
  candidateName: string;
} | null;

interface RecruiterTalentPanelStore {
  talentPanel: RecruiterTalentPanelState;
  openTalentPanel: (p: { candidateId: number; candidateName: string }) => void;
  closeTalentPanel: () => void;
}

export const useRecruiterTalentPanelStore = create<RecruiterTalentPanelStore>((set) => ({
  talentPanel: null,
  openTalentPanel: (p) => set({ talentPanel: p }),
  closeTalentPanel: () => set({ talentPanel: null }),
}));
