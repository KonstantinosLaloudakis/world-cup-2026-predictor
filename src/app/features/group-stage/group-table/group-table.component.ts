import { Component, ChangeDetectionStrategy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupStanding } from '../../../core/models/standings.interface';
import { Team } from '../../../core/models/team.interface';
import { TournamentService } from '../../../core/services/tournament.service';

@Component({
  selector: 'app-group-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-cyan-500/20 hover:border-slate-600/60 flex flex-col h-full">
      
      <!-- Card Header -->
      <div class="bg-gradient-to-r from-slate-800/80 to-slate-900/40 px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <h2 class="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-sm flex items-center gap-2">
          Group {{ groupName }}
        </h2>
        <div class="flex gap-2 relative">
          <!-- Randomize Button -->
          <button (click)="randomizeGroup()" title="Randomize group scores"
                  class="w-9 h-9 sm:w-7 sm:h-7 rounded bg-slate-800/50 hover:bg-indigo-500/20 active:bg-indigo-500/30 text-slate-400 hover:text-indigo-400 border border-slate-700 hover:border-indigo-500/50 flex items-center justify-center transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </button>
          <!-- Clear Button -->
          <button (click)="clearGroup()" title="Clear group scores"
                  class="w-9 h-9 sm:w-7 sm:h-7 rounded bg-slate-800/50 hover:bg-rose-500/20 active:bg-rose-500/30 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/50 flex items-center justify-center transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Table Body -->
      <div class="overflow-hidden grow">
        <table class="w-full text-sm text-left">
          <thead class="text-[10px] uppercase bg-slate-900/40 text-slate-400 tracking-wider">
            <tr>
              <th scope="col" class="pl-3 pr-0 py-2.5 font-bold w-7">Pos</th>
              <th scope="col" class="px-1 py-2.5 font-bold">Team</th>
              <th scope="col" class="px-0.5 py-2.5 font-bold text-center w-6">P</th>
              <th scope="col" class="px-0.5 py-2.5 font-bold text-center w-6">W</th>
              <th scope="col" class="px-0.5 py-2.5 font-bold text-center w-6 hidden sm:table-cell">D</th>
              <th scope="col" class="px-0.5 py-2.5 font-bold text-center w-6 hidden sm:table-cell">L</th>
              <th scope="col" class="px-0.5 py-2.5 font-bold text-center w-8">GD</th>
              <th scope="col" class="pl-0.5 pr-2 py-2.5 font-black text-center text-cyan-400 w-8">Pts</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-700/30">
            <tr *ngFor="let s of standings; let i = index; trackBy: trackByTeamId" 
                class="transition-all duration-300 group cursor-default"
                (mouseenter)="setHover(s.teamId)"
                (mouseleave)="setHover(null)"
                [ngClass]="{
                  'bg-cyan-900/10': i < 2, 
                  'bg-amber-900/10': i === 2,
                  'bg-indigo-900/30 ring-1 ring-indigo-500/50 shadow-inner z-10 relative': hoveredTeam() === s.teamId,
                  'hover:bg-slate-700/40': hoveredTeam() !== s.teamId
                }">
              <td class="pl-3 pr-0 py-3 font-mono font-bold text-slate-400 text-xs relative text-left w-7">
                <div class="absolute left-0 top-0 bottom-0 w-1 rounded-r-sm"
                     [ngClass]="{'bg-cyan-400': i < 2, 'bg-amber-400': i === 2, 'bg-transparent': i > 2}">
                </div>
                {{ i + 1 }}
              </td>
              <td class="px-1 py-2.5 max-w-0">
                <div class="flex items-center gap-1.5">
                  <img *ngIf="teamMap.get(s.teamId)?.flagUrl" [src]="teamMap.get(s.teamId)?.flagUrl" alt="Flag" class="w-5 h-3.5 object-cover rounded-[2px] shadow-sm ring-1 ring-slate-800/50 shrink-0">
                  <div *ngIf="!teamMap.get(s.teamId)?.flagUrl" class="w-5 h-3.5 bg-slate-700 rounded-[2px] shadow-sm shrink-0"></div>
                  <span class="text-slate-100 group-hover:text-white transition-colors text-[13px] font-bold truncate" [title]="teamMap.get(s.teamId)?.name || s.teamId">
                    {{ teamMap.get(s.teamId)?.name || s.teamId }}
                  </span>
                  <!-- Qualification Badge -->
                  <span *ngIf="i < 2" class="shrink-0 text-[8px] font-black tracking-wider px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Q
                  </span>
                  <span *ngIf="i === 2" class="shrink-0 text-[8px] font-black tracking-wider px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    3rd
                  </span>
                </div>
              </td>
              <td class="px-0.5 py-3 text-center text-slate-300 font-medium text-xs">{{ s.played }}</td>
              <td class="px-0.5 py-3 text-center text-slate-400 text-xs">{{ s.won }}</td>
              <td class="px-0.5 py-3 text-center text-slate-400 text-xs hidden sm:table-cell">{{ s.drawn }}</td>
              <td class="px-0.5 py-3 text-center text-slate-400 text-xs hidden sm:table-cell">{{ s.lost }}</td>
              <td class="px-0.5 py-3 text-center font-medium text-xs" [ngClass]="{'text-emerald-400': s.goalDifference > 0, 'text-rose-400': s.goalDifference < 0, 'text-slate-400': s.goalDifference === 0}">
                {{ s.goalDifference > 0 ? '+' : '' }}{{ s.goalDifference }}
              </td>
              <td class="pl-1 pr-2 py-3 text-center font-black text-sm text-slate-100 group-hover:text-cyan-300 transition-colors">{{ s.points }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer Legend -->
      <div class="px-4 py-2 mt-auto bg-slate-900/60 text-[10px] uppercase tracking-widest font-bold text-slate-500 flex gap-4 border-t border-slate-700/50">
        <span class="flex items-center gap-1.5"><div class="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div> Advance</span>
        <span class="flex items-center gap-1.5"><div class="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></div> Potential</span>
      </div>
    </div>
  `
})
export class GroupTableComponent {
  private tournamentService = inject(TournamentService);
  
  @Input() groupName!: string;
  @Input() standings: GroupStanding[] = [];
  @Input() teamMap: Map<string, Team> = new Map();

  hoveredTeam = this.tournamentService.hoveredTeam;

  setHover(teamId: string | null) {
    this.tournamentService.setHoveredTeam(teamId);
  }

  trackByTeamId(index: number, standing: GroupStanding): string {
    return standing.teamId;
  }

  randomizeGroup() {
    this.tournamentService.randomizeGroupScores(this.groupName);
  }

  clearGroup() {
    this.tournamentService.clearGroupScores(this.groupName);
  }
}
