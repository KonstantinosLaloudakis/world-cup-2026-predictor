import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupStanding } from '../../../core/models/standings.interface';
import { Team } from '../../../core/models/team.interface';

@Component({
  selector: 'app-third-place-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="bg-indigo-950/40 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
      
      <!-- Card Header -->
      <div class="bg-gradient-to-r from-indigo-800/80 to-purple-900/40 px-5 py-4 border-b border-indigo-500/30">
        <h2 class="text-lg sm:text-2xl font-black tracking-tight text-white drop-shadow-sm flex items-center gap-2">
          Ranking of Third-Placed Teams
        </h2>
        <p class="text-indigo-200 text-xs mt-1 font-medium">Top 8 teams advance to the Round of 32.</p>
      </div>
      
      <!-- Table Body -->
      <div class="overflow-x-auto grow">
        <table class="w-full text-sm text-left table-fixed">
          <thead class="text-[10px] uppercase bg-indigo-950/60 text-indigo-300 tracking-wider">
            <tr>
              <th scope="col" class="px-3 sm:px-4 py-3 font-bold w-10">Pos</th>
              <th scope="col" class="px-1 sm:px-2 py-3 font-bold w-9">Grp</th>
              <th scope="col" class="px-1 sm:px-2 py-3 font-bold">Team</th>
              <th scope="col" class="px-1 sm:px-2 py-3 font-bold text-center w-8">P</th>
              <th scope="col" class="px-1 sm:px-2 py-3 font-bold text-center w-8">W</th>
              <th scope="col" class="px-1 sm:px-2 py-3 font-bold text-center hidden sm:table-cell w-8">D</th>
              <th scope="col" class="px-1 sm:px-2 py-3 font-bold text-center hidden sm:table-cell w-8">L</th>
              <th scope="col" class="px-1 sm:px-2 py-3 font-bold text-center w-9">GD</th>
              <th scope="col" class="px-2 sm:px-4 py-3 font-black text-center text-indigo-400 w-10">Pts</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-indigo-900/30">
            <!-- Cutoff divider row between position 8 and 9 -->
            <ng-container *ngFor="let item of thirds; let i = index">
            <tr *ngIf="i === 8" class="pointer-events-none">
              <td colspan="9" class="py-0 relative">
                <div class="h-px bg-gradient-to-r from-transparent via-rose-500 to-transparent"></div>
                <span class="absolute right-4 -top-2.5 text-[10px] font-bold tracking-widest uppercase text-rose-400/80 bg-indigo-950 px-2">Eliminated</span>
              </td>
            </tr>
            <tr class="transition-colors hover:bg-indigo-800/40 group cursor-default"
                [ngClass]="{
                  'bg-cyan-900/10': i < 7 && item.standing.played > 0,
                  'bg-amber-900/15 border-l-2 border-l-amber-500': i === 7 && item.standing.played > 0,
                  'opacity-50': i >= 8,
                  'opacity-30 italic': item.standing.played === 0 && i < 8
                }">
              <td class="px-3 sm:px-4 py-3.5 font-mono font-medium text-indigo-300 text-xs relative w-10">
                <div class="absolute left-0 top-0 bottom-0 w-1 rounded-r-sm"
                     [ngClass]="{'bg-cyan-400': i < 8, 'bg-rose-500': i >= 8}">
                </div>
                {{ i + 1 }}
                <span *ngIf="i === 7" class="absolute -right-1 top-1/2 -translate-y-1/2 text-[7px] font-black tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/40 whitespace-nowrap">CUT</span>
              </td>
              <td class="px-1 sm:px-2 py-3.5 font-bold text-indigo-200">{{ item.group }}</td>
              <td class="px-1 sm:px-2 py-3.5 max-w-0 w-full">
                <div class="flex items-center gap-2.5 w-full">
                  <img *ngIf="teamMap.get(item.standing.teamId)?.flagUrl" [src]="teamMap.get(item.standing.teamId)?.flagUrl" alt="Flag" class="w-5 h-3.5 object-cover rounded-[2px] shadow-sm ring-1 ring-indigo-900/50 shrink-0">
                  <div *ngIf="!teamMap.get(item.standing.teamId)?.flagUrl" class="w-5 h-3.5 bg-indigo-950 rounded-[2px] shadow-sm shrink-0"></div>
                  <span class="text-slate-100 group-hover:text-white transition-colors text-[13px] sm:text-sm font-bold flex-1 min-w-0 truncate max-w-[120px] xl:max-w-[200px]" [title]="teamMap.get(item.standing.teamId)?.name || item.standing.teamId">
                    {{ teamMap.get(item.standing.teamId)?.name || item.standing.teamId }}
                  </span>
                </div>
              </td>
              <td class="px-1 sm:px-2 py-3.5 text-center text-indigo-200 font-medium">{{ item.standing.played }}</td>
              <td class="px-1 sm:px-2 py-3.5 text-center text-indigo-300">{{ item.standing.won }}</td>
              <td class="px-1 sm:px-2 py-3.5 text-center text-indigo-300 hidden sm:table-cell">{{ item.standing.drawn }}</td>
              <td class="px-1 sm:px-2 py-3.5 text-center text-indigo-300 hidden sm:table-cell">{{ item.standing.lost }}</td>
              <td class="px-1 sm:px-2 py-3.5 text-center font-medium" [ngClass]="{'text-emerald-400': item.standing.goalDifference > 0, 'text-rose-400': item.standing.goalDifference < 0, 'text-indigo-300': item.standing.goalDifference === 0}">
                {{ item.standing.goalDifference > 0 ? '+' : '' }}{{ item.standing.goalDifference }}
              </td>
              <td class="px-3 sm:px-4 py-3.5 text-center font-black text-lg text-slate-100 group-hover:text-cyan-300 transition-colors">{{ item.standing.points }}</td>
            </tr>
            </ng-container>
          </tbody>
        </table>
      </div>

    </div>
  `
})
export class ThirdPlaceTableComponent {
  @Input() thirds: Array<{group: string, standing: GroupStanding}> = [];
  @Input() teamMap: Map<string, Team> = new Map();
}
