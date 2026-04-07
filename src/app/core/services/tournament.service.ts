import { Injectable, computed, signal, effect } from '@angular/core';
import { Team } from '../models/team.interface';
import { Match } from '../models/match.interface';
import { GroupStanding } from '../models/standings.interface';
import { THIRD_PLACE_TABLE } from '../data/third-place-table';
import data from '../../../assets/data.json';

@Injectable({
  providedIn: 'root'
})
export class TournamentService {
  private matchesSignal = signal<Match[]>(data.matches as Match[]);
  private teamsSignal = signal<Team[]>(data.teams);
  private activeHoverSignal = signal<string | null>(null);
  private readonly STORAGE_KEY = 'world_cup_2026_state';

  public matches = this.matchesSignal.asReadonly();
  public teams = this.teamsSignal.asReadonly();
  public hoveredTeam = this.activeHoverSignal.asReadonly();

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
        matches: this.matchesSignal()
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
      } catch (e) {
        console.error('Failed to parse local storage state:', e);
      }
    }
  }

  public resetTournament() {
    localStorage.removeItem(this.STORAGE_KEY);
    const resetMatches = (JSON.parse(JSON.stringify(data.matches)) as Match[]).map(m => ({
      ...m,
      extraTimeHomeScore: m.extraTimeHomeScore ?? null,
      extraTimeAwayScore: m.extraTimeAwayScore ?? null,
      penaltyHomeScore: m.penaltyHomeScore ?? null,
      penaltyAwayScore: m.penaltyAwayScore ?? null,
    }));
    this.matchesSignal.set(resetMatches);
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

  public simulateKnockoutStage() {
    // Clear all existing knockout scores first
    this.matchesSignal.update(matches =>
      matches.map(m => {
        if (m.stage === 'group') return m;
        return {
          ...m,
          homeScore: null, awayScore: null,
          extraTimeHomeScore: null, extraTimeAwayScore: null,
          penaltyHomeScore: null, penaltyAwayScore: null,
        };
      })
    );

    // Simulate round by round — each updateKnockoutScore triggers recomputation
    // so the next round's teams are available
    const roundOrder = [
      [73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88], // R32
      [89,90,91,92,93,94,95,96],                           // R16
      [97,98,99,100],                                       // QF
      [101,102],                                            // SF
      [103],                                                // Third place
      [104],                                                // Final
    ];

    for (const round of roundOrder) {
      for (const matchId of round) {
        const match = this.knockoutMatches().find(m => m.id === matchId);
        if (!match || !match.homeTeamId || !match.awayTeamId) continue;

        const homeTeam = this.teamsSignal().find(t => t.id === match.homeTeamId);
        const awayTeam = this.teamsSignal().find(t => t.id === match.awayTeamId);

        const homePower = homeTeam?.powerRating || 75;
        const awayPower = awayTeam?.powerRating || 75;
        const powerDiff = homePower - awayPower;

        // Regular time
        let expectedHome = 1.2 + (powerDiff / 20);
        let expectedAway = 1.2 - (powerDiff / 20);
        expectedHome = Math.max(0.2, Math.min(expectedHome, 4.0));
        expectedAway = Math.max(0.2, Math.min(expectedAway, 4.0));

        const homeScore = this.getPoissonRandom(expectedHome);
        const awayScore = this.getPoissonRandom(expectedAway);
        this.updateKnockoutScore(matchId, 'regular', homeScore, awayScore);

        if (homeScore === awayScore) {
          // Extra time — lower expected goals (0.4 base, ~30 min period)
          let etExpHome = homeScore + Math.max(0.1, 0.4 + (powerDiff / 40));
          let etExpAway = awayScore + Math.max(0.1, 0.4 - (powerDiff / 40));
          const etHome = Math.max(homeScore, this.getPoissonRandom(etExpHome));
          const etAway = Math.max(awayScore, this.getPoissonRandom(etExpAway));
          this.updateKnockoutScore(matchId, 'extraTime', etHome, etAway);

          if (etHome === etAway) {
            // Penalties — generate until not equal
            let penHome: number, penAway: number;
            do {
              penHome = 2 + this.getPoissonRandom(2); // typically 3-5
              penAway = 2 + this.getPoissonRandom(2);
            } while (penHome === penAway);
            this.updateKnockoutScore(matchId, 'penalty', penHome, penAway);
          }
        }
      }
    }
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

  public knockoutProgress = computed(() => {
    const matches = this.knockoutMatches();
    const winners = this.knockoutWinners();
    const total = matches.length;
    const predicted = matches.filter(m => winners.has(m.id)).length;
    return { predicted, total };
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

  // Official FIFA bracket flow: source match → {destination match, home/away slot}
  private readonly BRACKET_FLOW: Record<number, {nextId: number, isHome: boolean}> = {
    // R32 → R16 (non-adjacent pairs per FIFA)
    73: {nextId: 90, isHome: true},   74: {nextId: 89, isHome: true},
    75: {nextId: 90, isHome: false},  76: {nextId: 91, isHome: true},
    77: {nextId: 89, isHome: false},  78: {nextId: 91, isHome: false},
    79: {nextId: 92, isHome: true},   80: {nextId: 92, isHome: false},
    81: {nextId: 94, isHome: true},   82: {nextId: 94, isHome: false},
    83: {nextId: 93, isHome: true},   84: {nextId: 93, isHome: false},
    85: {nextId: 96, isHome: true},   86: {nextId: 95, isHome: true},
    87: {nextId: 96, isHome: false},  88: {nextId: 95, isHome: false},
    // R16 → QF (also non-adjacent per FIFA)
    89: {nextId: 97, isHome: true},   90: {nextId: 97, isHome: false},
    91: {nextId: 99, isHome: true},   92: {nextId: 99, isHome: false},
    93: {nextId: 98, isHome: true},   94: {nextId: 98, isHome: false},
    95: {nextId: 100, isHome: true},  96: {nextId: 100, isHome: false},
    // QF → SF
    97: {nextId: 101, isHome: true},  98: {nextId: 101, isHome: false},
    99: {nextId: 102, isHome: true},  100: {nextId: 102, isHome: false},
    // SF → Final
    101: {nextId: 104, isHome: true}, 102: {nextId: 104, isHome: false},
  };

  public knockoutMatches = computed(() => {
    const standings = this.groupStandings();
    const thirds = this.thirdPlaceStandings().slice(0, 8);

    const getSlot = (groupId: string, rank: number) => {
        const s = standings.get(groupId);
        return s && s[rank] ? s[rank].teamId : null;
    };

    // Group winners (1A-1L) and runners-up (2A-2L), indexed 0-11
    const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    const w = groups.map(g => getSlot(g, 0));
    const r = groups.map(g => getSlot(g, 1));

    // Third-place lookup using FIFA Annex C table
    // Determine which groups produced the 8 qualifying thirds
    const qualifyingGroups = thirds.map(th => th?.group).filter(Boolean).sort();
    const lookupKey = qualifyingGroups.join('');
    const thirdAssignment = THIRD_PLACE_TABLE[lookupKey]; // [3rd for 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L]

    // Map from group letter to 3rd-placed team ID from that group
    const thirdByGroup = new Map<string, string | null>();
    for (const th of thirds) {
      if (th?.group && th?.standing?.teamId) {
        thirdByGroup.set(th.group, th.standing.teamId);
      }
    }

    // Resolve third-placed team for a given winner slot index
    // Indices: 0=1A, 1=1B, 2=1D, 3=1E, 4=1G, 5=1I, 6=1K, 7=1L
    const getThird = (slotIndex: number): string | null => {
      if (!thirdAssignment || !thirdAssignment[slotIndex]) return null;
      return thirdByGroup.get(thirdAssignment[slotIndex]) || null;
    };

    // Official FIFA R32 pairings (matches 73-88)
    const r32Pairings: Array<[number, string | null, string | null]> = [
      [73, r[0],  r[1]],            // 2A vs 2B
      [74, w[4],  getThird(3)],     // 1E vs 3rd (slot 3 = 1E)
      [75, w[5],  r[2]],            // 1F vs 2C
      [76, w[2],  r[5]],            // 1C vs 2F
      [77, w[8],  getThird(5)],     // 1I vs 3rd (slot 5 = 1I)
      [78, r[4],  r[8]],            // 2E vs 2I
      [79, w[0],  getThird(0)],     // 1A vs 3rd (slot 0 = 1A)
      [80, w[11], getThird(7)],     // 1L vs 3rd (slot 7 = 1L)
      [81, w[3],  getThird(2)],     // 1D vs 3rd (slot 2 = 1D)
      [82, w[6],  getThird(4)],     // 1G vs 3rd (slot 4 = 1G)
      [83, r[10], r[11]],           // 2K vs 2L
      [84, w[7],  r[9]],            // 1H vs 2J
      [85, w[1],  getThird(1)],     // 1B vs 3rd (slot 1 = 1B)
      [86, w[9],  r[7]],            // 1J vs 2H
      [87, w[10], getThird(6)],     // 1K vs 3rd (slot 6 = 1K)
      [88, r[3],  r[6]],            // 2D vs 2G
    ];

    // Deep clone matches to prevent mutating raw signal
    const knockoutBracket = this.matchesSignal().map(m => ({
      ...m,
      extraTimeHomeScore: m.extraTimeHomeScore ?? null,
      extraTimeAwayScore: m.extraTimeAwayScore ?? null,
      penaltyHomeScore: m.penaltyHomeScore ?? null,
      penaltyAwayScore: m.penaltyAwayScore ?? null,
    }));

    // 1. Assign R32 teams
    for (const [matchId, home, away] of r32Pairings) {
      const m = knockoutBracket.find(x => x.id === matchId);
      if (m) {
        m.homeTeamId = home;
        m.awayTeamId = away;
      }
    }

    // 2. Propagate winners through bracket using scores
    for (let id = 73; id <= 102; id++) {
      const match = knockoutBracket.find(x => x.id === id);
      if (!match) continue;

      const flow = this.BRACKET_FLOW[id];
      if (!flow) continue;

      // Get original match scores from matchesSignal
      const originalMatch = this.matchesSignal().find(x => x.id === id);

      // Build match with propagated teams + original scores for derivation
      const matchForDerivation: Match = {
        ...match,
        homeScore: originalMatch?.homeScore ?? null,
        awayScore: originalMatch?.awayScore ?? null,
        extraTimeHomeScore: originalMatch?.extraTimeHomeScore ?? null,
        extraTimeAwayScore: originalMatch?.extraTimeAwayScore ?? null,
        penaltyHomeScore: originalMatch?.penaltyHomeScore ?? null,
        penaltyAwayScore: originalMatch?.penaltyAwayScore ?? null,
      };

      const validWinnerId = this.deriveKnockoutWinner(matchForDerivation);

      const nextMatch = knockoutBracket.find(x => x.id === flow.nextId);
      if (nextMatch) {
        if (flow.isHome) nextMatch.homeTeamId = validWinnerId;
        else nextMatch.awayTeamId = validWinnerId;
      }

      // Third-place game: losers of semi-finals (M101, M102) → M103
      if (id === 101 || id === 102) {
        const thirdPlaceMatch = knockoutBracket.find(x => x.id === 103);
        if (thirdPlaceMatch) {
          let loserId: string | null = null;
          if (validWinnerId && match.homeTeamId && match.awayTeamId) {
            loserId = validWinnerId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
          }
          if (flow.isHome) thirdPlaceMatch.homeTeamId = loserId;
          else thirdPlaceMatch.awayTeamId = loserId;
        }
      }

      // Copy scores onto the propagated bracket match for UI consumption
      match.homeScore = matchForDerivation.homeScore;
      match.awayScore = matchForDerivation.awayScore;
      match.extraTimeHomeScore = matchForDerivation.extraTimeHomeScore;
      match.extraTimeAwayScore = matchForDerivation.extraTimeAwayScore;
      match.penaltyHomeScore = matchForDerivation.penaltyHomeScore;
      match.penaltyAwayScore = matchForDerivation.penaltyAwayScore;
    }

    return knockoutBracket.filter(m => m.stage && m.stage !== 'group');
  });

  public knockoutWinners = computed(() => {
    const matches = this.knockoutMatches();
    const map = new Map<number, string>();
    for (const m of matches) {
      const winner = this.deriveKnockoutWinner(m);
      if (winner) map.set(m.id, winner);
    }
    return map;
  });

  public updateMatchScore(matchId: number, homeScore: number | null, awayScore: number | null) {
    this.matchesSignal.update(matches =>
      matches.map(m => m.id === matchId ? { ...m, homeScore, awayScore } : m)
    );
  }

  public updateKnockoutScore(
    matchId: number,
    field: 'regular' | 'extraTime' | 'penalty',
    homeScore: number | null,
    awayScore: number | null
  ) {
    // Snapshot team assignments before the score update
    const snapshotBefore = new Map<number, string>();
    for (const m of this.knockoutMatches()) {
      snapshotBefore.set(m.id, `${m.homeTeamId ?? ''}-${m.awayTeamId ?? ''}`);
    }

    this.matchesSignal.update(matches =>
      matches.map(m => {
        if (m.id !== matchId) return m;

        const updated = {
          ...m,
          extraTimeHomeScore: m.extraTimeHomeScore ?? null,
          extraTimeAwayScore: m.extraTimeAwayScore ?? null,
          penaltyHomeScore: m.penaltyHomeScore ?? null,
          penaltyAwayScore: m.penaltyAwayScore ?? null,
        };

        if (field === 'regular') {
          updated.homeScore = homeScore;
          updated.awayScore = awayScore;
          const isDraw = homeScore !== null && awayScore !== null && homeScore === awayScore;
          if (!isDraw) {
            updated.extraTimeHomeScore = null;
            updated.extraTimeAwayScore = null;
            updated.penaltyHomeScore = null;
            updated.penaltyAwayScore = null;
          }
        } else if (field === 'extraTime') {
          updated.extraTimeHomeScore = homeScore;
          updated.extraTimeAwayScore = awayScore;
          const isDraw = homeScore !== null && awayScore !== null && homeScore === awayScore;
          if (!isDraw) {
            updated.penaltyHomeScore = null;
            updated.penaltyAwayScore = null;
          }
        } else if (field === 'penalty') {
          updated.penaltyHomeScore = homeScore;
          updated.penaltyAwayScore = awayScore;
        }

        return updated;
      })
    );

    // Check for downstream matchup changes and clear stale scores
    const currentKnockout = this.knockoutMatches();
    const matchIdsToClean: number[] = [];

    for (const m of currentKnockout) {
      const prevKey = snapshotBefore.get(m.id);
      const currentKey = `${m.homeTeamId ?? ''}-${m.awayTeamId ?? ''}`;

      if (prevKey !== undefined && prevKey !== currentKey) {
        matchIdsToClean.push(m.id);
      }
    }

    if (matchIdsToClean.length > 0) {
      this.matchesSignal.update(matches =>
        matches.map(m => {
          if (matchIdsToClean.includes(m.id)) {
            return {
              ...m,
              homeScore: null,
              awayScore: null,
              extraTimeHomeScore: null,
              extraTimeAwayScore: null,
              penaltyHomeScore: null,
              penaltyAwayScore: null,
            };
          }
          return m;
        })
      );
    }
  }

  public setHoveredTeam(teamId: string | null) {
    if (this.activeHoverSignal() !== teamId) {
      this.activeHoverSignal.set(teamId);
    }
  }

  private deriveKnockoutWinner(match: Match): string | null {
    if (match.homeScore === null || match.awayScore === null) return null;
    if (!match.homeTeamId || !match.awayTeamId) return null;

    if (match.homeScore !== match.awayScore) {
      return match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;
    }

    if (match.extraTimeHomeScore === null || match.extraTimeAwayScore === null) return null;

    if (match.extraTimeHomeScore !== match.extraTimeAwayScore) {
      return match.extraTimeHomeScore > match.extraTimeAwayScore ? match.homeTeamId : match.awayTeamId;
    }

    if (match.penaltyHomeScore === null || match.penaltyAwayScore === null) return null;

    if (match.penaltyHomeScore !== match.penaltyAwayScore) {
      return match.penaltyHomeScore > match.penaltyAwayScore ? match.homeTeamId : match.awayTeamId;
    }

    return null;
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
