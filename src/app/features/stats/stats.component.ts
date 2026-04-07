import { Component, ChangeDetectionStrategy, inject, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TournamentService } from '../../core/services/tournament.service';
import { Team } from '../../core/models/team.interface';

@Component({
  selector: 'app-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="space-y-8 pb-8">
      <!-- Empty State -->
      <div *ngIf="!hasScores()" class="flex flex-col items-center justify-center py-20 space-y-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p class="text-slate-500 text-lg font-medium">Enter some scores to see your prediction stats</p>
        <button (click)="switchToPredictions.emit()"
                class="px-4 py-2 rounded-full border border-indigo-500/50 bg-indigo-500/20 text-indigo-300 text-sm font-bold hover:bg-indigo-500/30 transition-all">
          Go to Predictions
        </button>
      </div>

      <!-- Stats Content -->
      <ng-container *ngIf="hasScores()">
        <!-- Tier 1: Highlight Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <!-- Top Scoring Team -->
          <div *ngIf="topScoringTeam()" class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 border-l-4 border-l-emerald-500">
            <div class="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Top Scorer</div>
            <div class="flex items-center gap-2">
              <img [src]="topScoringTeam()!.team.flagUrl" class="w-6 h-4 rounded-sm object-cover" [alt]="topScoringTeam()!.team.name">
              <span class="text-white font-bold text-sm truncate">{{ topScoringTeam()!.team.name }}</span>
            </div>
            <div class="text-2xl font-black text-emerald-300 mt-1">{{ topScoringTeam()!.goals }} goals</div>
          </div>

          <!-- Best Defense -->
          <div *ngIf="bestDefense()" class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 border-l-4 border-l-blue-500">
            <div class="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Best Defense</div>
            <div class="flex items-center gap-2">
              <img [src]="bestDefense()!.team.flagUrl" class="w-6 h-4 rounded-sm object-cover" [alt]="bestDefense()!.team.name">
              <span class="text-white font-bold text-sm truncate">{{ bestDefense()!.team.name }}</span>
            </div>
            <div class="text-2xl font-black text-blue-300 mt-1">{{ bestDefense()!.conceded }} conceded</div>
          </div>

          <!-- Biggest Upset -->
          <div *ngIf="biggestUpset()" class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 border-l-4 border-l-pink-500">
            <div class="text-xs font-bold text-pink-400 uppercase tracking-wider mb-2">Biggest Upset</div>
            <div class="flex items-center gap-2">
              <img [src]="biggestUpset()!.winner.flagUrl" class="w-5 h-3.5 rounded-sm object-cover" [alt]="biggestUpset()!.winner.name">
              <span class="text-white font-bold text-sm">{{ biggestUpset()!.winner.name }}</span>
            </div>
            <div class="text-slate-400 text-xs mt-0.5">def. {{ biggestUpset()!.loser.name }}</div>
            <div class="text-pink-300 text-xs font-bold mt-1">Rating gap: {{ biggestUpset()!.ratingDiff }}</div>
          </div>

          <!-- Highest Scoring Group -->
          <div *ngIf="highestScoringGroup()" class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 border-l-4 border-l-amber-500">
            <div class="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Top Group</div>
            <div class="text-2xl font-black text-amber-300">Group {{ highestScoringGroup()!.group }}</div>
            <div class="text-slate-400 text-sm">{{ highestScoringGroup()!.goals }} goals</div>
          </div>
        </div>

        <!-- Tier 2: Stat Pills -->
        <div class="flex flex-wrap gap-2 sm:gap-3">
          <div class="bg-slate-800/80 border border-slate-700/50 rounded-full px-4 py-2 flex items-center gap-2">
            <span class="text-slate-400 text-xs font-medium">Total Goals</span>
            <span class="text-white font-bold text-sm">{{ totalGoals() }}</span>
          </div>
          <div class="bg-slate-800/80 border border-slate-700/50 rounded-full px-4 py-2 flex items-center gap-2">
            <span class="text-slate-400 text-xs font-medium">Avg/Match</span>
            <span class="text-white font-bold text-sm">{{ avgGoalsPerMatch() | number:'1.1-1' }}</span>
            <span class="text-slate-500 text-xs">({{ scoredMatchCount() }} matches)</span>
          </div>
          <div *ngIf="mostCommonScoreline()" class="bg-slate-800/80 border border-slate-700/50 rounded-full px-4 py-2 flex items-center gap-2">
            <span class="text-slate-400 text-xs font-medium">Top Scoreline</span>
            <span class="text-white font-bold text-sm">{{ mostCommonScoreline()!.scoreline }}</span>
            <span class="text-slate-500 text-xs">({{ mostCommonScoreline()!.count }}x)</span>
          </div>
          <div class="bg-slate-800/80 border border-slate-700/50 rounded-full px-4 py-2 flex items-center gap-2">
            <span class="text-slate-400 text-xs font-medium">Clean Sheets</span>
            <span class="text-white font-bold text-sm">{{ cleanSheets() }}</span>
          </div>
          <div class="bg-slate-800/80 border border-slate-700/50 rounded-full px-4 py-2 flex items-center gap-2">
            <span class="text-slate-400 text-xs font-medium">Draws</span>
            <span class="text-white font-bold text-sm">{{ draws() }}</span>
          </div>
        </div>

        <!-- Tier 3: Team Journey Table -->
        <div class="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-700/50">
            <h3 class="text-sm font-bold text-slate-300 uppercase tracking-wider">Team Journeys</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-700/50">
                  <th class="sticky left-0 bg-slate-900/95 backdrop-blur px-3 py-2 text-left">Team</th>
                  <th class="px-2 py-2 text-center">Grp</th>
                  <th class="px-2 py-2 text-center">Pos</th>
                  <th class="px-2 py-2 text-center">Pts</th>
                  <th class="px-2 py-2 text-center">GF</th>
                  <th class="px-2 py-2 text-center">GA</th>
                  <th class="px-3 py-2 text-left">Exit Round</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let journey of teamJourneys(); trackBy: trackByTeamId"
                    class="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                    [ngClass]="{
                      'bg-amber-500/5 border-l-2 border-l-amber-500': journey.exitRound === 'Champion',
                      'border-l-2 border-l-indigo-500/50': journey.exitRoundOrder < 8 && journey.exitRound !== 'Champion'
                    }">
                  <td class="sticky left-0 bg-slate-900/95 backdrop-blur px-3 py-2">
                    <div class="flex items-center gap-2">
                      <img [src]="journey.flagUrl" class="w-5 h-3.5 rounded-sm object-cover" [alt]="journey.teamName">
                      <span class="text-white font-medium text-xs whitespace-nowrap">{{ journey.teamName }}</span>
                    </div>
                  </td>
                  <td class="px-2 py-2 text-center text-slate-400">{{ journey.group }}</td>
                  <td class="px-2 py-2 text-center font-bold" [ngClass]="{
                    'text-emerald-400': journey.position <= 2,
                    'text-indigo-400': journey.position === 3 && journey.exitRoundOrder < 8,
                    'text-slate-500': journey.position >= 3 && journey.exitRoundOrder >= 8
                  }">{{ journey.position }}</td>
                  <td class="px-2 py-2 text-center text-slate-300">{{ journey.points }}</td>
                  <td class="px-2 py-2 text-center text-slate-400">{{ journey.goalsFor }}</td>
                  <td class="px-2 py-2 text-center text-slate-400">{{ journey.goalsAgainst }}</td>
                  <td class="px-3 py-2">
                    <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                          [ngClass]="{
                            'bg-amber-500/20 text-amber-300': journey.exitRound === 'Champion',
                            'bg-slate-600/30 text-slate-300': journey.exitRound === 'Runner-up',
                            'bg-emerald-500/15 text-emerald-400': journey.exitRound === '3rd Place',
                            'bg-blue-500/15 text-blue-400': journey.exitRound === '4th Place',
                            'bg-indigo-500/15 text-indigo-300': journey.exitRoundOrder >= 4 && journey.exitRoundOrder <= 7 && !journey.exitRound.includes('TBD'),
                            'bg-slate-700/30 text-slate-500': journey.exitRound === 'Group Stage',
                            'bg-slate-700/30 text-slate-400': journey.exitRound.includes('TBD')
                          }">
                      {{ journey.exitRound }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [``]
})
export class StatsComponent {
  private tournamentService = inject(TournamentService);
  @Output() switchToPredictions = new EventEmitter<void>();

  // --- Data sources ---

  private allScoredMatches = computed(() => {
    const groupMatches = this.tournamentService.matches()
      .filter(m => m.stage === 'group' && m.homeScore !== null && m.awayScore !== null);
    const koMatches = this.tournamentService.knockoutMatches()
      .filter(m => m.homeScore !== null && m.awayScore !== null);
    return [...groupMatches, ...koMatches];
  });

  hasScores = computed(() => this.allScoredMatches().length > 0);
  scoredMatchCount = computed(() => this.allScoredMatches().length);

  // --- Stat Pills ---

  totalGoals = computed(() => {
    return this.allScoredMatches().reduce((sum, m) => sum + m.homeScore! + m.awayScore!, 0);
  });

  avgGoalsPerMatch = computed(() => {
    const count = this.scoredMatchCount();
    return count === 0 ? 0 : this.totalGoals() / count;
  });

  mostCommonScoreline = computed(() => {
    const freq = new Map<string, number>();
    for (const match of this.allScoredMatches()) {
      const high = Math.max(match.homeScore!, match.awayScore!);
      const low = Math.min(match.homeScore!, match.awayScore!);
      const key = `${high}-${low}`;
      freq.set(key, (freq.get(key) || 0) + 1);
    }
    let best: { scoreline: string, count: number } | null = null;
    for (const [scoreline, count] of freq) {
      if (!best || count > best.count) best = { scoreline, count };
    }
    return best;
  });

  cleanSheets = computed(() => {
    return this.allScoredMatches().filter(m => m.homeScore === 0 || m.awayScore === 0).length;
  });

  draws = computed(() => {
    return this.allScoredMatches().filter(m => m.stage === 'group' && m.homeScore === m.awayScore).length;
  });

  // --- Highlight Cards ---

  private teamGoalStats = computed(() => {
    const stats = new Map<string, { goalsFor: number, goalsAgainst: number, matchesPlayed: number }>();
    for (const match of this.allScoredMatches()) {
      if (match.homeTeamId) {
        const s = stats.get(match.homeTeamId) || { goalsFor: 0, goalsAgainst: 0, matchesPlayed: 0 };
        s.goalsFor += match.homeScore!;
        s.goalsAgainst += match.awayScore!;
        s.matchesPlayed++;
        stats.set(match.homeTeamId, s);
      }
      if (match.awayTeamId) {
        const s = stats.get(match.awayTeamId) || { goalsFor: 0, goalsAgainst: 0, matchesPlayed: 0 };
        s.goalsFor += match.awayScore!;
        s.goalsAgainst += match.homeScore!;
        s.matchesPlayed++;
        stats.set(match.awayTeamId, s);
      }
    }
    return stats;
  });

  topScoringTeam = computed(() => {
    const stats = this.teamGoalStats();
    const teamMap = this.tournamentService.teamMap();
    let best: { teamId: string, goals: number } | null = null;
    for (const [teamId, s] of stats) {
      if (!best || s.goalsFor > best.goals) best = { teamId, goals: s.goalsFor };
    }
    if (!best) return null;
    const team = teamMap.get(best.teamId);
    return team ? { team, goals: best.goals } : null;
  });

  bestDefense = computed(() => {
    const stats = this.teamGoalStats();
    const teamMap = this.tournamentService.teamMap();
    let best: { teamId: string, conceded: number } | null = null;
    for (const [teamId, s] of stats) {
      if (s.matchesPlayed < 3) continue;
      if (!best || s.goalsAgainst < best.conceded) best = { teamId, conceded: s.goalsAgainst };
    }
    if (!best) return null;
    const team = teamMap.get(best.teamId);
    return team ? { team, conceded: best.conceded } : null;
  });

  biggestUpset = computed(() => {
    const teamMap = this.tournamentService.teamMap();
    const knockoutWinners = this.tournamentService.knockoutWinners();
    let biggest: { winner: Team, loser: Team, ratingDiff: number } | null = null;

    for (const match of this.allScoredMatches()) {
      if (!match.homeTeamId || !match.awayTeamId) continue;
      const homeTeam = teamMap.get(match.homeTeamId);
      const awayTeam = teamMap.get(match.awayTeamId);
      if (!homeTeam || !awayTeam) continue;

      let winnerId: string | null = null;
      if (match.stage === 'group') {
        if (match.homeScore! > match.awayScore!) winnerId = match.homeTeamId;
        else if (match.awayScore! > match.homeScore!) winnerId = match.awayTeamId;
      } else {
        winnerId = knockoutWinners.get(match.id) ?? null;
      }
      if (!winnerId) continue;

      const winner = winnerId === match.homeTeamId ? homeTeam : awayTeam;
      const loser = winnerId === match.homeTeamId ? awayTeam : homeTeam;

      if (winner.powerRating < loser.powerRating) {
        const diff = loser.powerRating - winner.powerRating;
        if (!biggest || diff > biggest.ratingDiff) {
          biggest = { winner, loser, ratingDiff: diff };
        }
      }
    }
    return biggest;
  });

  highestScoringGroup = computed(() => {
    const groupMatches = this.allScoredMatches().filter(m => m.stage === 'group' && m.groupId);
    const groupGoals = new Map<string, number>();
    for (const match of groupMatches) {
      const current = groupGoals.get(match.groupId!) || 0;
      groupGoals.set(match.groupId!, current + match.homeScore! + match.awayScore!);
    }
    let best: { group: string, goals: number } | null = null;
    for (const [group, goals] of groupGoals) {
      if (!best || goals > best.goals) best = { group, goals };
    }
    return best;
  });

  // --- Team Journey Table ---

  teamJourneys = computed(() => {
    const teams = this.tournamentService.teams();
    const standings = this.tournamentService.groupStandings();
    const knockoutMatches = this.tournamentService.knockoutMatches();
    const knockoutWinners = this.tournamentService.knockoutWinners();
    const thirdPlaceStandings = this.tournamentService.thirdPlaceStandings();
    const qualifyingThirds = new Set(thirdPlaceStandings.slice(0, 8).map(t => t.standing.teamId));

    const stageOrder: Record<string, number> = {
      'round_32': 7, 'round_16': 6, 'quarter': 5, 'semi': 4
    };
    const stageLabels: Record<string, string> = {
      'round_32': 'R32', 'round_16': 'R16', 'quarter': 'QF', 'semi': 'SF'
    };

    const journeys = teams.map(team => {
      const groupList = standings.get(team.group);
      const posIndex = groupList?.findIndex(s => s.teamId === team.id) ?? -1;
      const standing = groupList?.[posIndex];

      const base = {
        teamId: team.id,
        teamName: team.name,
        flagUrl: team.flagUrl,
        group: team.group,
        position: posIndex >= 0 ? posIndex + 1 : 4,
        points: standing?.points ?? 0,
        goalsFor: standing?.goalsFor ?? 0,
        goalsAgainst: standing?.goalsAgainst ?? 0,
        exitRound: 'Group Stage',
        exitRoundOrder: 8
      };

      const qualifies = posIndex === 0 || posIndex === 1 || (posIndex === 2 && qualifyingThirds.has(team.id));
      if (!qualifies) return base;

      const teamKOMatches = knockoutMatches.filter(m => m.homeTeamId === team.id || m.awayTeamId === team.id);
      if (teamKOMatches.length === 0) return { ...base, exitRound: 'R32 (TBD)', exitRoundOrder: 7 };

      // Check Final (match 104)
      const inFinal = teamKOMatches.find(m => m.id === 104);
      if (inFinal) {
        const w = knockoutWinners.get(104);
        if (w === team.id) return { ...base, exitRound: 'Champion', exitRoundOrder: 0 };
        if (w) return { ...base, exitRound: 'Runner-up', exitRoundOrder: 1 };
        return { ...base, exitRound: 'Final (TBD)', exitRoundOrder: 1 };
      }

      // Check 3rd place match (match 103)
      const inThirdPlace = teamKOMatches.find(m => m.id === 103);
      if (inThirdPlace) {
        const w = knockoutWinners.get(103);
        if (w === team.id) return { ...base, exitRound: '3rd Place', exitRoundOrder: 2 };
        if (w) return { ...base, exitRound: '4th Place', exitRoundOrder: 3 };
        return { ...base, exitRound: '3rd/4th (TBD)', exitRoundOrder: 2 };
      }

      // Find deepest knockout round
      const deepest = teamKOMatches.reduce((a, b) =>
        (stageOrder[a.stage] ?? 99) < (stageOrder[b.stage] ?? 99) ? a : b
      );
      const winner = knockoutWinners.get(deepest.id);
      const label = stageLabels[deepest.stage] ?? deepest.stage;
      const order = stageOrder[deepest.stage] ?? 99;

      if (!winner) return { ...base, exitRound: `${label} (TBD)`, exitRoundOrder: order };
      if (winner !== team.id) return { ...base, exitRound: label, exitRoundOrder: order };
      return { ...base, exitRound: `${label} (TBD)`, exitRoundOrder: order - 1 };
    });

    return journeys.sort((a, b) => a.exitRoundOrder - b.exitRoundOrder || b.points - a.points);
  });

  trackByTeamId(index: number, journey: { teamId: string }): string {
    return journey.teamId;
  }
}
