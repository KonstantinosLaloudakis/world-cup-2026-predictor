import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Match } from '../../../core/models/match.interface';
import { Team } from '../../../core/models/team.interface';
import { TournamentService } from '../../../core/services/tournament.service';

interface MatchSection {
  id: string;
  label: string;
  sublabel?: string;
  matches: Match[];
}

@Component({
  selector: 'app-match-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-t-none rounded-b-2xl lg:rounded-2xl shadow-2xl overflow-hidden">

      <!-- Header (hidden on mobile where the parent toggle serves as header) -->
      <div class="hidden lg:block bg-gradient-to-r from-indigo-600/60 to-blue-600/40 px-5 py-4 border-b border-indigo-500/30 shrink-0">
        <h2 class="text-xl font-black tracking-tight text-white drop-shadow-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Group Stage Matches
        </h2>
        <p class="text-indigo-200 text-xs mt-1 font-medium">Predict the scores to dynamically update standings.</p>
        <div class="flex gap-1 mt-2">
          <button (click)="viewMode.set('group')"
                  class="px-3 py-1 rounded-full text-xs font-bold transition-all"
                  [ngClass]="{'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50': viewMode() === 'group', 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:text-slate-300': viewMode() !== 'group'}">
            By Group
          </button>
          <button (click)="viewMode.set('date')"
                  class="px-3 py-1 rounded-full text-xs font-bold transition-all"
                  [ngClass]="{'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50': viewMode() === 'date', 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:text-slate-300': viewMode() !== 'date'}">
            By Date
          </button>
        </div>
      </div>

      <!-- Card Body -->
      <div class="px-3 pb-3 h-full overflow-y-auto custom-scrollbar relative" id="match-scroll-container">

        <!-- Mobile view mode toggle -->
        <div class="flex gap-1 py-2 lg:hidden">
          <button (click)="viewMode.set('group')"
                  class="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  [ngClass]="{'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50': viewMode() === 'group', 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:text-slate-300': viewMode() !== 'group'}">
            By Group
          </button>
          <button (click)="viewMode.set('date')"
                  class="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  [ngClass]="{'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50': viewMode() === 'date', 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:text-slate-300': viewMode() !== 'date'}">
            By Date
          </button>
        </div>

        <!-- Sticky Navigation -->
        <div class="sticky top-0 z-20 -mx-3 px-3 py-2 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 mb-4 shadow-md flex gap-2 overflow-x-auto custom-scrollbar pb-3">
          <button *ngFor="let nav of navItems()"
                  (click)="scrollToSection(nav.id)"
                  class="shrink-0 px-3.5 py-2 sm:px-3 sm:py-1 rounded-full text-sm sm:text-xs font-bold border transition-colors relative"
                  [ngClass]="{
                    'border-emerald-500/50 bg-emerald-500/15 text-emerald-300': nav.complete,
                    'border-slate-700/50 bg-slate-800 text-slate-400 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300': !nav.complete
                  }">
            {{ nav.label }}
            <span *ngIf="nav.complete" class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"></span>
          </button>
        </div>

        <div class="space-y-6 pb-6">
          <div *ngFor="let section of sections(); trackBy: trackBySectionId" [id]="section.id">
          <div class="space-y-3">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 border-l-2 border-indigo-500 relative">
              <span class="bg-slate-900/40 px-2 py-0.5 rounded text-indigo-300">{{ section.label }}</span>
              <span *ngIf="section.sublabel" class="text-slate-500 font-medium normal-case ml-1">{{ section.sublabel }}</span>
            </h3>

            <div class="space-y-2">
              <div *ngFor="let match of section.matches; trackBy: trackByMatchId"
                   class="group/match rounded-xl border p-3 transition-all duration-300 relative overflow-hidden"
                   (mouseenter)="setHover(match.homeTeamId)"
                   (mouseleave)="setHover(null)"
                   [ngClass]="{
                     'bg-slate-900/50 border-slate-700/30 hover:border-indigo-500/40 hover:bg-slate-800/80': !isMatchHovered(match),
                     'bg-indigo-900/40 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)] scale-[1.02] z-10': isMatchHovered(match)
                   }">

                <!-- Subtle background glow for hovered match -->
                <div *ngIf="isMatchHovered(match)" class="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 pointer-events-none"></div>

                <div class="flex items-center justify-between gap-2">

                  <!-- Home Team -->
                  <div class="flex-1 flex items-center gap-1.5 justify-end min-w-0">
                    <span class="text-[13px] font-bold transition-all duration-300 truncate text-right group-hover/match:text-white"
                          [ngClass]="{
                            'text-cyan-300 drop-shadow-md': match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore,
                            'text-slate-500 opacity-80': match.homeScore !== null && match.awayScore !== null && match.homeScore < match.awayScore,
                            'text-slate-200': match.homeScore === null || match.awayScore === null || match.homeScore === match.awayScore
                          }">
                      {{ teamMap.get(match.homeTeamId!)?.name || match.homeTeamId }}
                    </span>
                    <img *ngIf="teamMap.get(match.homeTeamId!)?.flagUrl" [src]="teamMap.get(match.homeTeamId!)?.flagUrl" alt="Flag" class="w-5 h-3.5 object-cover rounded-[2px] shadow-sm shrink-0">
                    <div *ngIf="match.homeTeamId && !teamMap.get(match.homeTeamId!)?.flagUrl" class="w-5 h-3.5 bg-slate-700/50 rounded-[2px] shadow-sm shrink-0"></div>
                  </div>

                  <!-- Score Inputs -->
                  <div class="flex items-center gap-1.5 px-2 bg-slate-950/50 rounded-lg py-1 border border-slate-700/50 shadow-inner shrink-0">
                    <input type="number" min="0" max="15" inputmode="numeric" pattern="[0-9]*"
                           [tabIndex]="match.id * 2"
                           [ngModel]="match.homeScore"
                           (ngModelChange)="onScoreChange(match.id, $event, match.awayScore)"
                           class="w-10 h-10 sm:w-8 sm:h-8 bg-transparent text-center font-black text-lg text-indigo-400 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded appearance-none"
                           placeholder="-" />

                    <span class="text-slate-600 font-black text-sm">:</span>

                    <input type="number" min="0" max="15" inputmode="numeric" pattern="[0-9]*"
                           [tabIndex]="match.id * 2 + 1"
                           [ngModel]="match.awayScore"
                           (ngModelChange)="onScoreChange(match.id, match.homeScore, $event)"
                           class="w-10 h-10 sm:w-8 sm:h-8 bg-transparent text-center font-black text-lg text-indigo-400 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded appearance-none"
                           placeholder="-" />
                  </div>

                  <!-- Away Team -->
                  <div class="flex-1 flex items-center gap-1.5 justify-start min-w-0">
                    <img *ngIf="teamMap.get(match.awayTeamId!)?.flagUrl" [src]="teamMap.get(match.awayTeamId!)?.flagUrl" alt="Flag" class="w-5 h-3.5 object-cover rounded-[2px] shadow-sm shrink-0">
                    <div *ngIf="match.awayTeamId && !teamMap.get(match.awayTeamId!)?.flagUrl" class="w-5 h-3.5 bg-slate-700/50 rounded-[2px] shadow-sm shrink-0"></div>
                    <span class="text-[13px] font-bold transition-all duration-300 truncate text-left group-hover/match:text-white"
                          [ngClass]="{
                            'text-cyan-300 drop-shadow-md': match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore,
                            'text-slate-500 opacity-80': match.homeScore !== null && match.awayScore !== null && match.awayScore < match.homeScore,
                            'text-slate-200': match.homeScore === null || match.awayScore === null || match.homeScore === match.awayScore
                          }">
                      {{ teamMap.get(match.awayTeamId!)?.name || match.awayTeamId }}
                    </span>
                  </div>

                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    /* Custom Scrollbar for the match list */
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(79, 70, 229, 0.3); /* indigo-600 */
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(79, 70, 229, 0.6);
    }

    /* Remove arrows from number inputs */
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type=number] {
      -moz-appearance: textfield;
    }
  `]
})
export class MatchListComponent {
  private tournamentService = inject(TournamentService);

  @Input() set matches(val: Match[]) {
    this.matchesSignal.set(val);
  }
  @Input() teamMap: Map<string, Team> = new Map();

  @Output() scoreUpdate = new EventEmitter<{id: number, home: number | null, away: number | null}>();

  private matchesSignal = signal<Match[]>([]);
  hoveredTeam = this.tournamentService.hoveredTeam;

  viewMode = signal<'group' | 'date'>('group');

  sections = computed((): MatchSection[] => {
    const groupStageMatches = this.matchesSignal().filter(m => m.stage === 'group' && m.groupId);

    if (this.viewMode() === 'group') {
      const groups = new Map<string, Match[]>();
      for (const match of groupStageMatches) {
        if (!groups.has(match.groupId!)) {
          groups.set(match.groupId!, []);
        }
        groups.get(match.groupId!)!.push(match);
      }
      return Array.from(groups.entries())
        .map(([groupId, matches]) => ({
          id: 'group-' + groupId,
          label: 'Group ' + groupId,
          matches
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
    } else {
      const dates = new Map<string, Match[]>();
      for (const match of groupStageMatches) {
        if (!dates.has(match.date)) {
          dates.set(match.date, []);
        }
        dates.get(match.date)!.push(match);
      }
      return Array.from(dates.entries())
        .map(([date, matches]) => {
          matches.sort((a, b) => (a.groupId || '').localeCompare(b.groupId || '') || a.id - b.id);
          const d = new Date(date + 'T12:00:00');
          const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          return {
            id: 'date-' + date,
            label,
            sublabel: `(${matches.length} matches)`,
            matches
          };
        })
        .sort((a, b) => a.id.localeCompare(b.id));
    }
  });

  navItems = computed(() => {
    return this.sections().map(section => ({
      id: section.id,
      label: this.viewMode() === 'group'
        ? section.label.replace('Group ', '')
        : this.formatNavDate(section.id.replace('date-', '')),
      complete: this.isSectionComplete(section)
    }));
  });

  private formatNavDate(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  isSectionComplete(section: MatchSection): boolean {
    return section.matches.length > 0 && section.matches.every(m => m.homeScore !== null && m.awayScore !== null);
  }

  isMatchHovered(match: Match): boolean {
    const active = this.hoveredTeam();
    return active !== null && (match.homeTeamId === active || match.awayTeamId === active);
  }

  setHover(teamId: string | null) {
    this.tournamentService.setHoveredTeam(teamId);
  }

  scrollToSection(sectionId: string) {
    const el = document.getElementById(sectionId);
    const container = document.getElementById('match-scroll-container');
    if (el && container) {
      container.scrollTo({ top: el.offsetTop - 50, behavior: 'smooth' });
    }
  }

  trackBySectionId(index: number, section: MatchSection): string {
    return section.id;
  }

  trackByMatchId(index: number, match: Match): number {
    return match.id;
  }

  onScoreChange(matchId: number, homeScore: number | null | string, awayScore: number | null | string) {
    // Handle empty string as null
    const h = (homeScore === '' || homeScore === null) ? null : Number(homeScore);
    const a = (awayScore === '' || awayScore === null) ? null : Number(awayScore);

    this.scoreUpdate.emit({ id: matchId, home: h, away: a });
  }
}
