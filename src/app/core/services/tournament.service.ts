import { Injectable, computed, signal, effect } from '@angular/core';
import { Team } from '../models/team.interface';
import { Match } from '../models/match.interface';
import { GroupStanding } from '../models/standings.interface';
import data from '../../../assets/data.json';

@Injectable({
  providedIn: 'root'
})
export class TournamentService {
  private matchesSignal = signal<Match[]>(data.matches as Match[]);
  private teamsSignal = signal<Team[]>(data.teams);
  private activeHoverSignal = signal<string | null>(null);
  public knockoutWinnersSignal = signal<Map<number, string>>(new Map());

  private readonly STORAGE_KEY = 'world_cup_2026_state';

  public matches = this.matchesSignal.asReadonly();
  public teams = this.teamsSignal.asReadonly();
  public hoveredTeam = this.activeHoverSignal.asReadonly();
  public knockoutWinners = this.knockoutWinnersSignal.asReadonly();

  public teamMap = computed(() => {
    const map = new Map<string, Team>();
    for (const t of this.teamsSignal()) map.set(t.id, t);
    return map;
  });

  constructor() {
    this.loadState();

    // Auto-save to localStorage whenever critical state changes
    effect(() => {
      const stateToSave = {
        matches: this.matchesSignal(),
        knockoutWinners: Array.from(this.knockoutWinnersSignal().entries())
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateToSave));
    });
  }

  private loadState() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.matches && Array.isArray(parsed.matches)) {
          this.matchesSignal.set(parsed.matches);
        }
        if (parsed.knockoutWinners && Array.isArray(parsed.knockoutWinners)) {
          this.knockoutWinnersSignal.set(new Map(parsed.knockoutWinners));
        }
      } catch (e) {
        console.error('Failed to parse local storage state:', e);
      }
    }
  }

  public resetTournament() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.matchesSignal.set(JSON.parse(JSON.stringify(data.matches)));
    this.knockoutWinnersSignal.set(new Map());
    this.activeHoverSignal.set(null);
  }

  private getPoissonRandom(lambda: number): number {
    let L = Math.exp(-lambda), k = 0, p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  }

  public simulateGroupStage() {
    this.matchesSignal.update(matches => {
      return matches.map(match => {
        if (match.stage !== 'group') return match;

        if (!match.homeTeamId || !match.awayTeamId) return match;

        const homeTeam = this.teamsSignal().find(t => t.id === match.homeTeamId);
        const awayTeam = this.teamsSignal().find(t => t.id === match.awayTeamId);
        
        const homePower = homeTeam?.powerRating || 75;
        const awayPower = awayTeam?.powerRating || 75;

        const powerDiff = homePower - awayPower;
        
        // Base expected goals is ~1.2. A power difference shifts this.
        let expectedHome = 1.2 + (powerDiff / 20);
        let expectedAway = 1.2 - (powerDiff / 20);

        // Prevent negative lambda and absurdly high averages
        expectedHome = Math.max(0.2, Math.min(expectedHome, 4.0));
        expectedAway = Math.max(0.2, Math.min(expectedAway, 4.0));

        return { 
          ...match, 
          homeScore: this.getPoissonRandom(expectedHome), 
          awayScore: this.getPoissonRandom(expectedAway) 
        };
      });
    });
  }

  public groupProgress = computed(() => {
    const matches = this.matchesSignal().filter(m => m.stage === 'group' && m.groupId);
    const groups = new Map<string, { total: number, scored: number }>();
    for (const m of matches) {
      const g = groups.get(m.groupId!) || { total: 0, scored: 0 };
      g.total++;
      if (m.homeScore !== null && m.awayScore !== null) g.scored++;
      groups.set(m.groupId!, g);
    }
    const total = groups.size;
    const complete = Array.from(groups.values()).filter(g => g.scored === g.total).length;
    const scoredMatches = matches.filter(m => m.homeScore !== null && m.awayScore !== null).length;
    return { complete, total, scoredMatches, totalMatches: matches.length };
  });

  public groupStandings = computed(() => {
    return this.calculateStandings(this.teamsSignal(), this.matchesSignal());
  });

  public thirdPlaceStandings = computed(() => {
    const standings = this.groupStandings();
    const thirds: {group: string, standing: GroupStanding}[] = [];
    
    for (const [group, teams] of standings.entries()) {
      if (teams.length >= 3) {
        // Teams are already sorted in group rankings, so index 2 is 3rd place
        thirds.push({ group, standing: teams[2] });
      }
    }

    // Sort the 3rd place teams to find the top 8 that advance
    thirds.sort((a, b) => {
      if (a.standing.points !== b.standing.points) return b.standing.points - a.standing.points;
      if (a.standing.goalDifference !== b.standing.goalDifference) return b.standing.goalDifference - a.standing.goalDifference;
      if (a.standing.goalsFor !== b.standing.goalsFor) return b.standing.goalsFor - a.standing.goalsFor;
      return a.standing.manualTiebreakerRank - b.standing.manualTiebreakerRank;
    });

    return thirds;
  });

  public knockoutMatches = computed(() => {
    const standings = this.groupStandings();
    const thirds = this.thirdPlaceStandings().slice(0, 8); // Top 8 third-place teams advance
    
    // Extract specific group positions
    const getSlot = (groupId: string, rank: number) => {
        const t = standings.get(groupId);
        return t && t[rank] ? t[rank].teamId : null;
    };

    const w = [getSlot('A',0), getSlot('B',0), getSlot('C',0), getSlot('D',0), getSlot('E',0), getSlot('F',0), getSlot('G',0), getSlot('H',0), getSlot('I',0), getSlot('J',0), getSlot('K',0), getSlot('L',0)];
    const r = [getSlot('A',1), getSlot('B',1), getSlot('C',1), getSlot('D',1), getSlot('E',1), getSlot('F',1), getSlot('G',1), getSlot('H',1), getSlot('I',1), getSlot('J',1), getSlot('K',1), getSlot('L',1)];
    const t = thirds.map(th => th?.standing?.teamId).filter(Boolean); // Array of 8 3rd-placed teams

    // Deep clone matches to prevent mutating raw signal
    const knockoutBracket = this.matchesSignal().map(m => ({...m}));
    const winnersMap = this.knockoutWinnersSignal();

    // Authentic deterministic pairings (No 1st vs 1st)
    const pairs = [
        [w[0], t[0] || null],   // M73: 1A vs 3rd(1)
        [r[1], r[2]],           // M74: 2B vs 2C
        [w[3], t[1] || null],   // M75: 1D vs 3rd(2)
        [r[4], r[5]],           // M76: 2E vs 2F
        [w[6], t[2] || null],   // M77: 1G vs 3rd(3)
        [r[7], r[8]],           // M78: 2H vs 2I
        [w[9], t[3] || null],   // M79: 1J vs 3rd(4)
        [r[10], r[11]],         // M80: 2K vs 2L
        [w[1], t[4] || null],   // M81: 1B vs 3rd(5)
        [w[2], t[5] || null],   // M82: 1C vs 3rd(6)
        [w[4], t[6] || null],   // M83: 1E vs 3rd(7)
        [w[5], t[7] || null],   // M84: 1F vs 3rd(8)
        [w[7], r[0]],           // M85: 1H vs 2A
        [w[8], r[3]],           // M86: 1I vs 2D
        [w[10], r[6]],          // M87: 1K vs 2G
        [w[11], r[9]],          // M88: 1L vs 2J
    ];
    
    // 1. Map R32 teams into matches 73-88
    let pairIndex = 0;
    for (let id = 73; id <= 88; id++) {
        const m = knockoutBracket.find(x => x.id === id);
        if (m && pairs[pairIndex]) {
            m.homeTeamId = pairs[pairIndex][0];
            m.awayTeamId = pairs[pairIndex][1];
        }
        pairIndex++;
    }

    // 2. Propagate matches through the phases
    for (let id = 73; id <= 102; id++) {
        const match = knockoutBracket.find(x => x.id === id);
        if (!match) continue;
        
        let nextId = 0;
        if (id >= 73 && id <= 88) nextId = Math.floor((id - 73) / 2) + 89;
        else if (id >= 89 && id <= 96) nextId = Math.floor((id - 89) / 2) + 97;
        else if (id >= 97 && id <= 100) nextId = Math.floor((id - 97) / 2) + 101;
        else if (id >= 101 && id <= 102) nextId = 104; // Final

        const isAway = id % 2 === 0;
        
        // Ensure the winner is in the current match (cascade wipe if group stages changed)
        let validWinnerId = winnersMap.get(id) || null;
        if (validWinnerId !== match.homeTeamId && validWinnerId !== match.awayTeamId) {
            validWinnerId = null;
        }

        const nextMatch = knockoutBracket.find(x => x.id === nextId);
        if (nextMatch) {
            if (!isAway) nextMatch.homeTeamId = validWinnerId;
            else nextMatch.awayTeamId = validWinnerId;
        }

        // Third-place game propagation (Match 103)
        if (id === 101 || id === 102) {
            const thirdPlaceMatch = knockoutBracket.find(x => x.id === 103);
            if (thirdPlaceMatch) {
               let validLoserId = null;
               if (validWinnerId && match.homeTeamId && match.awayTeamId) {
                   validLoserId = validWinnerId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
               }
               if (!isAway) thirdPlaceMatch.homeTeamId = validLoserId;
               else thirdPlaceMatch.awayTeamId = validLoserId;
            }
        }
    }

    return knockoutBracket.filter(m => m.stage && m.stage !== 'group');
  });

  public updateMatchScore(matchId: number, homeScore: number | null, awayScore: number | null) {
    this.matchesSignal.update(matches => 
      matches.map(m => m.id === matchId ? { ...m, homeScore, awayScore } : m)
    );
  }

  public setHoveredTeam(teamId: string | null) {
    if (this.activeHoverSignal() !== teamId) {
      this.activeHoverSignal.set(teamId);
    }
  }

  public setKnockoutWinner(matchId: number, teamId: string | null) {
    this.knockoutWinnersSignal.update(map => {
      const newMap = new Map(map);
      if (teamId) newMap.set(matchId, teamId);
      else newMap.delete(matchId);
      return newMap;
    });
  }

  public clearGroupScores(groupId: string) {
    this.matchesSignal.update(matches => 
      matches.map(m => m.groupId === groupId ? { ...m, homeScore: null, awayScore: null } : m)
    );
  }

  public randomizeGroupScores(groupId: string) {
    this.matchesSignal.update(matches => 
      matches.map(m => {
        if (m.groupId === groupId) {
          // Generate a realistic football score (0-4 usually)
          const homeScore = Math.floor(Math.random() * 5);
          const awayScore = Math.floor(Math.random() * 5);
          return { ...m, homeScore, awayScore };
        }
        return m;
      })
    );
  }

  private calculateStandings(teams: Team[], matches: Match[]): Map<string, GroupStanding[]> {
    const rawStandings = new Map<string, GroupStanding>();
    
    // Initialize empty standings
    for (const team of teams) {
      rawStandings.set(team.id, {
        teamId: team.id, played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
        manualTiebreakerRank: 0
      });
    }

    // Accumulate basic stats
    const groupMatches = matches.filter(m => m.stage === 'group' && m.homeScore !== null && m.awayScore !== null);
    
    for (const match of groupMatches) {
      const home = rawStandings.get(match.homeTeamId!);
      const away = rawStandings.get(match.awayTeamId!);
      
      if (!home || !away) continue;
      
      const homeScore = match.homeScore!;
      const awayScore = match.awayScore!;

      home.played++;
      away.played++;
      home.goalsFor += homeScore;
      away.goalsFor += awayScore;
      home.goalsAgainst += awayScore;
      away.goalsAgainst += homeScore;
      home.goalDifference += (homeScore - awayScore);
      away.goalDifference += (awayScore - homeScore);

      if (homeScore > awayScore) {
        home.won++;
        away.lost++;
        home.points += 3;
      } else if (homeScore < awayScore) {
        away.won++;
        home.lost++;
        away.points += 3;
      } else {
        home.drawn++;
        away.drawn++;
        home.points += 1;
        away.points += 1;
      }
    }

    // Grouping teams
    const grouped = new Map<string, GroupStanding[]>();
    for (const team of teams) {
      if (!grouped.has(team.group)) grouped.set(team.group, []);
      grouped.get(team.group)!.push(rawStandings.get(team.id)!);
    }

    // Apply Tiebreakers for each group
    for (const [group, groupTeams] of grouped.entries()) {
      groupTeams.sort((a, b) => {
        // 1. Points
        if (a.points !== b.points) return b.points - a.points;
        // 2. Goal Difference
        if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
        // 3. Goals Scored
        if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
        
        // 4. Head-to-Head
        const h2hMatches = groupMatches.filter(m => 
          (m.homeTeamId === a.teamId && m.awayTeamId === b.teamId) ||
          (m.homeTeamId === b.teamId && m.awayTeamId === a.teamId)
        );

        let aH2hPts = 0, bH2hPts = 0, aH2hGd = 0, bH2hGd = 0;
        
        for (const m of h2hMatches) {
          if (m.homeTeamId === a.teamId) {
             const diff = m.homeScore! - m.awayScore!;
             if (diff > 0) aH2hPts += 3;
             else if (diff < 0) bH2hPts += 3;
             else { aH2hPts += 1; bH2hPts += 1; }
             aH2hGd += diff;
             bH2hGd -= diff;
          } else {
             const diff = m.homeScore! - m.awayScore!;
             if (diff > 0) bH2hPts += 3;
             else if (diff < 0) aH2hPts += 3;
             else { aH2hPts += 1; bH2hPts += 1; }
             bH2hGd += diff;
             aH2hGd -= diff;
          }
        }

        if (aH2hPts !== bH2hPts) return bH2hPts - aH2hPts;
        if (aH2hGd !== bH2hGd) return bH2hGd - aH2hGd;
        
        // 5. Fallback Manual Toggle (simulates fair play or drawn lots)
        return a.manualTiebreakerRank - b.manualTiebreakerRank;
      });
    }

    return grouped;
  }
}
