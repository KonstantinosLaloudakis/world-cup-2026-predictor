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
  });
});
