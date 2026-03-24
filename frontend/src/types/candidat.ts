import type {
  CandidateApplicationItem,
  CandidateCvFileItem,
  CandidateDashboardStats,
  CandidatePortfolioItem,
  CandidatePortfolioPdfFiles,
  CandidateScoreFromJson,
  CandidateProfile,
} from '@shared/types/candidat';

export type CandidatStats = CandidateDashboardStats;
export type PortfolioProject = CandidatePortfolioItem;
export type Application = CandidateApplicationItem;
export type CvFile = CandidateCvFileItem;
export type TalentCardFile = CandidateCvFileItem;

export interface PortfolioPdfFile extends CandidateCvFileItem {
  type: 'short' | 'long';
}

export type CandidatScore = CandidateScoreFromJson;
export type CandidatProfile = CandidateProfile;

