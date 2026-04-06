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
});
