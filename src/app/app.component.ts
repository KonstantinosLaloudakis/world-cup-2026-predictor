import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TournamentService } from './core/services/tournament.service';
import { GroupTableComponent } from './features/group-stage/group-table/group-table.component';
import { MatchListComponent } from './features/group-stage/match-list/match-list.component';
import { ThirdPlaceTableComponent } from './features/group-stage/third-place-table/third-place-table.component';
import { BracketComponent } from './features/knockout-stage/bracket/bracket.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, GroupTableComponent, MatchListComponent, ThirdPlaceTableComponent, BracketComponent],
  template: `
    <div class="min-h-screen pb-20 relative overflow-hidden">
      <!-- Ambient Background Glows -->
      <div class="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
      <div class="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px] -z-10 pointer-events-none"></div>
      
      <div class="container mx-auto px-2 sm:px-6 lg:px-8 py-6 sm:py-12 max-w-[1600px]">
        
        <!-- Header -->
        <header class="mb-8 sm:mb-16 text-center space-y-4 sm:space-y-6">

          <h1 class="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 drop-shadow-sm">
            World Cup 2026
          </h1>
          <p class="text-base sm:text-xl md:text-2xl text-slate-400 font-medium max-w-3xl mx-auto px-2">
            Dynamic engine rendering 104 matches. Set predictions and compute advancing permutations instantly.
          </p>
          <div *ngIf="groupProgress().scoredMatches > 0" class="mt-4 flex justify-center items-center gap-3 text-sm">
            <span class="text-slate-500 font-medium">{{ groupProgress().scoredMatches }}/{{ groupProgress().totalMatches }} matches</span>
            <span class="text-slate-700">|</span>
            <span class="font-bold" [ngClass]="{'text-emerald-400': groupProgress().complete === groupProgress().total, 'text-indigo-400': groupProgress().complete < groupProgress().total}">
              {{ groupProgress().complete }}/{{ groupProgress().total }} groups complete
            </span>
          </div>
          <div class="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
             <button (click)="simulateGroupStage()" class="px-6 py-2.5 rounded-full border border-indigo-500/50 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold tracking-widest transition-all uppercase text-xs shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] flex items-center gap-2">
               <span>Simulate Group Stage</span>
               <span class="text-lg leading-none">✨</span>
             </button>
             <button (click)="resetTournament()" class="px-6 py-2.5 rounded-full border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold tracking-widest transition-all uppercase text-xs shadow-[0_0_15px_rgba(243,24,96,0.1)] hover:shadow-[0_0_20px_rgba(243,24,96,0.2)]">
               Reset All
             </button>
          </div>
        </header>

        <!-- Main Content Area -->
        <div class="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 items-start">
          
          <!-- Match List Sidebar -->
          <div class="w-full lg:w-80 shrink-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto custom-scrollbar rounded-2xl shadow-xl">
            <!-- Mobile toggle -->
            <button (click)="matchListOpen.set(!matchListOpen())"
                    class="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-600/60 to-blue-600/40 border border-indigo-500/30 text-white font-black tracking-tight text-lg lg:hidden transition-all"
                    [ngClass]="{'rounded-2xl': !matchListOpen(), 'rounded-t-2xl rounded-b-none border-b-0': matchListOpen()}">
              <span class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Group Stage Matches
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transition-transform duration-300" [ngClass]="{'rotate-180': matchListOpen()}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div class="max-h-[70vh] lg:max-h-none overflow-y-auto custom-scrollbar" [ngClass]="{'hidden lg:block': !matchListOpen(), 'block': matchListOpen()}">
              <app-match-list
                [matches]="matches()"
                [teamMap]="teamMap()"
                (scoreUpdate)="onScoreUpdate($event)"
                class="block"
                [ngClass]="{'lg:rounded-t-2xl': !matchListOpen()}">
              </app-match-list>
            </div>
          </div>

          <!-- Group Tables Grid & Third Place Table -->
          <div class="flex-1 pb-8 min-w-0">
            <div class="grid grid-cols-1 xl:grid-cols-2 min-[1700px]:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12">
              <ng-container *ngFor="let group of groupKeys()">
                <app-group-table
                  [groupName]="group"
                  [standings]="standings().get(group) || []"
                  [teamMap]="teamMap()"
                  class="h-full">
                </app-group-table>
              </ng-container>
            </div>

            <!-- Third Place Ranking Table -->
            <div class="w-full mb-12">
              <app-third-place-table
                [thirds]="thirdPlaceStandings()"
                [teamMap]="teamMap()">
              </app-third-place-table>
            </div>

            <!-- Section Divider -->
            <div class="w-full flex items-center gap-4 mb-12">
              <div class="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
              <span class="text-xs font-bold tracking-[0.2em] uppercase text-slate-500">Knockout Phase</span>
              <div class="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
            </div>

            <!-- Knockout Bracket -->
            <div id="knockout-bracket-section" class="w-full">
              <app-bracket
                [matches]="knockoutMatches()"
                [teamMap]="teamMap()">
              </app-bracket>
            </div>
          </div>
        </div>

      </div>
    
      <!-- Floating Navigation -->
      <div class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-10 lg:right-10 z-50 flex flex-col gap-2 sm:gap-3 shadow-2xl">
        <button (click)="scrollTo('top')" title="Back to Top"
                class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-800/90 backdrop-blur border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-slate-800 transition-all shadow-lg active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button (click)="scrollTo('bracket')" title="Jump to Knockouts"
                class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-800/90 backdrop-blur border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-slate-800 transition-all shadow-lg active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.2); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
  `]
})
export class AppComponent {
  private tournamentService = inject(TournamentService);
  matchListOpen = signal(false);
  
  matches = this.tournamentService.matches;
  knockoutMatches = this.tournamentService.knockoutMatches;
  standings = this.tournamentService.groupStandings;
  thirdPlaceStandings = this.tournamentService.thirdPlaceStandings;
  teams = this.tournamentService.teams;
  teamMap = this.tournamentService.teamMap;
  groupProgress = this.tournamentService.groupProgress;

  groupKeys = computed(() => {
    return Array.from(this.standings().keys()).sort();
  });

  onScoreUpdate(event: {id: number, home: number | null, away: number | null}) {
    this.tournamentService.updateMatchScore(event.id, event.home, event.away);
  }

  resetTournament() {
    if (confirm('Are you sure you want to clear all your predictions and restart?')) {
      this.tournamentService.resetTournament();
    }
  }

  scrollTo(target: 'top' | 'bracket') {
    if (target === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById('knockout-bracket-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  simulateGroupStage() {
    if (confirm('This will overwrite all current group stage predictions with a realistic simulation. Proceed?')) {
      this.tournamentService.simulateGroupStage();
    }
  }
}
