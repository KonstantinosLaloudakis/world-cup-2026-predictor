export interface Match {
  id: number;
  stage: 'group' | 'round_32' | 'round_16' | 'quarter' | 'semi' | 'final';
  groupId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  date: string;
  extraTimeHomeScore: number | null;
  extraTimeAwayScore: number | null;
  penaltyHomeScore: number | null;
  penaltyAwayScore: number | null;
}
