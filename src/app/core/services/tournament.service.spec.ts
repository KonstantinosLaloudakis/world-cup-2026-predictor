import { TestBed } from '@angular/core/testing';
import { TournamentService } from './tournament.service';

describe('TournamentService', () => {
  let service: TournamentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TournamentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should calculate initial standings as 0 points for everyone', () => {
    const standings = service.groupStandings();
    expect(standings).toBeDefined();
    
    // Group A should exist
    const groupA = standings.get('A');
    expect(groupA).toBeDefined();
    expect(groupA?.length).toBe(4);
    expect(groupA![0].points).toBe(0);
  });

  it('should update match score and dynamically recalculate points correctly', () => {
    // Find the first match in group A
    const matchA = service.matches().find(m => m.groupId === 'A' && m.stage === 'group');
    if (!matchA) return;

    service.updateMatchScore(matchA.id, 2, 0); // Home wins 2-0

    const standings = service.groupStandings();

    const homeTeamId = matchA.homeTeamId;
    const groupData = standings.get('A');

    if (groupData && homeTeamId) {
      const homeTeamStanding = groupData.find(s => s.teamId === homeTeamId);
      expect(homeTeamStanding?.points).toBe(3);
      expect(homeTeamStanding?.goalDifference).toBe(2);
      expect(homeTeamStanding?.goalsFor).toBe(2);
    }
  });

  describe('knockout score derivation', () => {
    it('should derive winner from regular time scores when not a draw', () => {
      const r32Match = service.matches().find(m => m.stage === 'round_32');
      if (!r32Match) return;

      service.updateKnockoutScore(r32Match.id, 'regular', 2, 1);

      const match = service.matches().find(m => m.id === r32Match.id);
      expect(match?.homeScore).toBe(2);
      expect(match?.awayScore).toBe(1);
    });

    it('should not derive winner when regular time is a draw', () => {
      const r32Match = service.matches().find(m => m.stage === 'round_32');
      if (!r32Match) return;

      service.updateKnockoutScore(r32Match.id, 'regular', 1, 1);

      const winners = service.knockoutWinners();
      expect(winners.has(r32Match.id)).toBe(false);
    });

    it('should derive winner from extra time when regular time is a draw', () => {
      const r32Match = service.matches().find(m => m.stage === 'round_32');
      if (!r32Match) return;

      service.updateKnockoutScore(r32Match.id, 'regular', 1, 1);
      service.updateKnockoutScore(r32Match.id, 'extraTime', 2, 1);

      const match = service.matches().find(m => m.id === r32Match.id);
      expect(match?.extraTimeHomeScore).toBe(2);
      expect(match?.extraTimeAwayScore).toBe(1);
    });

    it('should derive winner from penalties when extra time is also a draw', () => {
      const r32Match = service.matches().find(m => m.stage === 'round_32');
      if (!r32Match) return;

      service.updateKnockoutScore(r32Match.id, 'regular', 1, 1);
      service.updateKnockoutScore(r32Match.id, 'extraTime', 2, 2);
      service.updateKnockoutScore(r32Match.id, 'penalty', 4, 3);

      const match = service.matches().find(m => m.id === r32Match.id);
      expect(match?.penaltyHomeScore).toBe(4);
      expect(match?.penaltyAwayScore).toBe(3);
    });

    it('should clear extra time and penalty scores when regular time changes from draw to non-draw', () => {
      const r32Match = service.matches().find(m => m.stage === 'round_32');
      if (!r32Match) return;

      service.updateKnockoutScore(r32Match.id, 'regular', 1, 1);
      service.updateKnockoutScore(r32Match.id, 'extraTime', 2, 2);
      service.updateKnockoutScore(r32Match.id, 'penalty', 4, 3);

      service.updateKnockoutScore(r32Match.id, 'regular', 2, 1);

      const match = service.matches().find(m => m.id === r32Match.id);
      expect(match?.extraTimeHomeScore).toBeNull();
      expect(match?.extraTimeAwayScore).toBeNull();
      expect(match?.penaltyHomeScore).toBeNull();
      expect(match?.penaltyAwayScore).toBeNull();
    });

    it('should clear penalty scores when extra time changes from draw to non-draw', () => {
      const r32Match = service.matches().find(m => m.stage === 'round_32');
      if (!r32Match) return;

      service.updateKnockoutScore(r32Match.id, 'regular', 1, 1);
      service.updateKnockoutScore(r32Match.id, 'extraTime', 2, 2);
      service.updateKnockoutScore(r32Match.id, 'penalty', 4, 3);

      service.updateKnockoutScore(r32Match.id, 'extraTime', 3, 2);

      const match = service.matches().find(m => m.id === r32Match.id);
      expect(match?.penaltyHomeScore).toBeNull();
      expect(match?.penaltyAwayScore).toBeNull();
      expect(match?.extraTimeHomeScore).toBe(3);
      expect(match?.extraTimeAwayScore).toBe(2);
    });

    it('should clear extra time and penalty when regular time score is cleared', () => {
      const r32Match = service.matches().find(m => m.stage === 'round_32');
      if (!r32Match) return;

      service.updateKnockoutScore(r32Match.id, 'regular', 1, 1);
      service.updateKnockoutScore(r32Match.id, 'extraTime', 2, 2);
      service.updateKnockoutScore(r32Match.id, 'penalty', 4, 3);

      service.updateKnockoutScore(r32Match.id, 'regular', null, null);

      const match = service.matches().find(m => m.id === r32Match.id);
      expect(match?.homeScore).toBeNull();
      expect(match?.awayScore).toBeNull();
      expect(match?.extraTimeHomeScore).toBeNull();
      expect(match?.extraTimeAwayScore).toBeNull();
      expect(match?.penaltyHomeScore).toBeNull();
      expect(match?.penaltyAwayScore).toBeNull();
    });

    it('should propagate knockout winner to next round via scores', () => {
      service.simulateGroupStage();

      const knockoutMatches = service.knockoutMatches();
      const r32Match = knockoutMatches.find(m => m.stage === 'round_32' && m.homeTeamId && m.awayTeamId);
      if (!r32Match) return;

      service.updateKnockoutScore(r32Match.id, 'regular', 3, 0);

      const winners = service.knockoutWinners();
      expect(winners.get(r32Match.id)).toBe(r32Match.homeTeamId!);
    });

    it('should propagate penalty winner to next round', () => {
      service.simulateGroupStage();

      const knockoutMatches = service.knockoutMatches();
      const r32Match = knockoutMatches.find(m => m.stage === 'round_32' && m.homeTeamId && m.awayTeamId);
      if (!r32Match) return;

      service.updateKnockoutScore(r32Match.id, 'regular', 1, 1);
      service.updateKnockoutScore(r32Match.id, 'extraTime', 2, 2);
      service.updateKnockoutScore(r32Match.id, 'penalty', 4, 2);

      const winners = service.knockoutWinners();
      expect(winners.get(r32Match.id)).toBe(r32Match.homeTeamId!);
    });

    it('should clear downstream match scores when upstream winner changes', () => {
      service.simulateGroupStage();

      const knockoutMatches = service.knockoutMatches();
      const r32Match = knockoutMatches.find(m => m.stage === 'round_32' && m.homeTeamId && m.awayTeamId);
      if (!r32Match) return;

      // Enter score for R32 match — home wins
      service.updateKnockoutScore(r32Match.id, 'regular', 3, 0);

      // Find the R16 match that this R32 winner feeds into
      const updatedKnockout = service.knockoutMatches();
      const r16Match = updatedKnockout.find(m =>
        m.stage === 'round_16' && (m.homeTeamId === r32Match.homeTeamId || m.awayTeamId === r32Match.homeTeamId)
      );
      if (!r16Match) return;

      // Enter score for the R16 match
      service.updateKnockoutScore(r16Match.id, 'regular', 2, 0);

      // Now change the R32 result — away wins instead
      service.updateKnockoutScore(r32Match.id, 'regular', 0, 3);

      // The R16 match scores should be cleared because the matchup changed
      const finalKnockout = service.knockoutMatches();
      const r16After = finalKnockout.find(m => m.id === r16Match.id);
      expect(r16After?.homeScore).toBeNull();
      expect(r16After?.awayScore).toBeNull();
    });
  });

  describe('importState', () => {
    it('should import matches and allow undo back to previous state', () => {
      // Set a known score first
      const matchA = service.matches().find(m => m.groupId === 'A' && m.stage === 'group');
      if (!matchA) return;
      service.updateMatchScore(matchA.id, 3, 0);

      const previousMatches = service.matches();
      expect(previousMatches.find(m => m.id === matchA.id)?.homeScore).toBe(3);

      // Import new state with different scores
      const newMatches = service.matches().map(m =>
        m.id === matchA.id ? { ...m, homeScore: 0, awayScore: 5 } : m
      );
      service.importState(newMatches);

      expect(service.matches().find(m => m.id === matchA.id)?.homeScore).toBe(0);
      expect(service.matches().find(m => m.id === matchA.id)?.awayScore).toBe(5);

      // Undo should restore the previous state
      service.undo();
      expect(service.matches().find(m => m.id === matchA.id)?.homeScore).toBe(3);
      expect(service.matches().find(m => m.id === matchA.id)?.awayScore).toBe(0);
    });
  });
});
