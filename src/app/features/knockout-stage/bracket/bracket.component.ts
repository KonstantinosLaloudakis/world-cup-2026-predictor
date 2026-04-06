import { Component, ChangeDetectionStrategy, Input, inject, ViewChild, ElementRef, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import { Match } from '../../../core/models/match.interface';
import { Team } from '../../../core/models/team.interface';
import { TournamentService } from '../../../core/services/tournament.service';

@Component({
  selector: 'app-bracket',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div #bracketContent class="bg-slate-900/40 backdrop-blur-3xl border border-slate-700/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl relative overflow-hidden">
      <!-- Glows -->
      <div class="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div class="mb-6 sm:mb-8 pr-12 sm:pr-0">
        <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tighter">Knockout Stage</h2>
        <p class="text-slate-400 font-medium text-sm sm:text-base">Round of 32 to the Final</p>
      </div>

      <!-- Download Button -->
      <button (click)="exportBracket()" class="absolute top-3 right-3 sm:top-5 sm:right-5 z-30 flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 rounded-xl bg-slate-800/90 backdrop-blur hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-bold tracking-wide transition-all border border-slate-600 shadow-lg hover:text-white">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span class="hidden sm:inline">Download</span>
      </button>

      <!-- Empty state hint -->
      <div *ngIf="bracketEmpty()" class="mb-6 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-medium flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Enter group stage scores above to populate the knockout bracket.
      </div>

      <!-- ========== MOBILE VIEW: Round tabs + single round ========== -->
      <div class="sm:hidden">
        <!-- Round Tabs -->
        <div class="flex gap-1.5 mb-4 overflow-x-auto pb-2">
          <button *ngFor="let round of mobileRounds; let idx = index"
                  (click)="setMobileRound(idx)"
                  class="shrink-0 px-3 py-2 rounded-lg text-xs font-bold tracking-wide transition-all border active:scale-95"
                  [ngClass]="{
                    'bg-indigo-500/30 border-indigo-500/50 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.2)]': mobileRound() === idx,
                    'bg-slate-800/60 border-slate-700/50 text-slate-400': mobileRound() !== idx
                  }">
            {{ round }}
          </button>
        </div>

        <!-- Active Round Content -->
        <div class="flex flex-col gap-3">
          <!-- R32 -->
          <ng-container *ngIf="mobileRound() === 0">
            <ng-container *ngFor="let match of r32(); trackBy: trackByMatchId">
              <ng-container *ngTemplateOutlet="matchCard; context: { match: match }"></ng-container>
            </ng-container>
          </ng-container>
          <!-- R16 -->
          <ng-container *ngIf="mobileRound() === 1">
            <ng-container *ngFor="let match of r16(); trackBy: trackByMatchId">
              <ng-container *ngTemplateOutlet="matchCard; context: { match: match }"></ng-container>
            </ng-container>
          </ng-container>
          <!-- QF -->
          <ng-container *ngIf="mobileRound() === 2">
            <ng-container *ngFor="let match of qf(); trackBy: trackByMatchId">
              <ng-container *ngTemplateOutlet="matchCard; context: { match: match }"></ng-container>
            </ng-container>
          </ng-container>
          <!-- SF -->
          <ng-container *ngIf="mobileRound() === 3">
            <ng-container *ngFor="let match of sf(); trackBy: trackByMatchId">
              <ng-container *ngTemplateOutlet="matchCard; context: { match: match }"></ng-container>
            </ng-container>
          </ng-container>
          <!-- Final -->
          <ng-container *ngIf="mobileRound() === 4">
            <ng-container *ngIf="finalMatch() as match">
              <div class="bg-gradient-to-br from-amber-500/20 to-amber-900/20 border border-amber-500/50 rounded-2xl p-4 shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col gap-2 relative">
                <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <div class="flex justify-between items-center z-10 p-3 rounded-lg cursor-pointer transition-all border border-transparent active:scale-[0.98]"
                     (click)="selectWinner(match, match.homeTeamId)"
                     [ngClass]="{ 'bg-amber-500/20 border-amber-500 shadow-inner scale-[1.02]': isWinner(match, match.homeTeamId), 'opacity-40 grayscale': hasWinner(match) && !isWinner(match, match.homeTeamId), 'hover:bg-amber-500/10': match.homeTeamId && !hasWinner(match) }">
                  <div class="flex items-center gap-2">
                    <img *ngIf="getTeam(match.homeTeamId)?.flagUrl" [src]="getTeam(match.homeTeamId)?.flagUrl" alt="Flag" class="w-6 h-4 object-cover rounded-[2px] shadow-sm">
                    <span class="font-black text-amber-300 text-base" [ngClass]="{'opacity-50': !match.homeTeamId}">{{ getTeam(match.homeTeamId)?.name || 'TBD' }}</span>
                  </div>
                  <div class="w-7 h-7 rounded-full flex items-center justify-center bg-amber-950/50 border border-amber-500/30" [ngClass]="{'!bg-amber-500': isWinner(match, match.homeTeamId)}">
                    <svg *ngIf="isWinner(match, match.homeTeamId)" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                  </div>
                </div>
                <div class="h-px w-full bg-gradient-to-r from-transparent via-amber-500/50 to-transparent my-0.5 z-10"></div>
                <div class="flex justify-between items-center z-10 p-3 rounded-lg cursor-pointer transition-all border border-transparent active:scale-[0.98]"
                     (click)="selectWinner(match, match.awayTeamId)"
                     [ngClass]="{ 'bg-amber-500/20 border-amber-500 shadow-inner scale-[1.02]': isWinner(match, match.awayTeamId), 'opacity-40 grayscale': hasWinner(match) && !isWinner(match, match.awayTeamId), 'hover:bg-amber-500/10': match.awayTeamId && !hasWinner(match) }">
                  <div class="flex items-center gap-2">
                    <img *ngIf="getTeam(match.awayTeamId)?.flagUrl" [src]="getTeam(match.awayTeamId)?.flagUrl" alt="Flag" class="w-6 h-4 object-cover rounded-[2px] shadow-sm">
                    <span class="font-black text-amber-300 text-base" [ngClass]="{'opacity-50': !match.awayTeamId}">{{ getTeam(match.awayTeamId)?.name || 'TBD' }}</span>
                  </div>
                  <div class="w-7 h-7 rounded-full flex items-center justify-center bg-amber-950/50 border border-amber-500/30" [ngClass]="{'!bg-amber-500': isWinner(match, match.awayTeamId)}">
                    <svg *ngIf="isWinner(match, match.awayTeamId)" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                  </div>
                </div>
              </div>
            </ng-container>
            <!-- Third Place -->
            <div class="mt-4">
              <h3 class="text-center text-xs font-bold tracking-widest text-slate-500 uppercase mb-3">Third Place</h3>
              <ng-container *ngIf="thirdPlaceMatch() as match">
                <ng-container *ngTemplateOutlet="matchCard; context: { match: match }"></ng-container>
              </ng-container>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- ========== DESKTOP VIEW: Horizontal scroll bracket ========== -->
      <div class="hidden sm:block overflow-x-auto custom-scrollbar pb-6">
        <div class="flex items-stretch min-w-max px-4">

          <!-- Column: Round of 32 -->
          <div class="flex flex-col w-64 shrink-0">
            <h3 class="text-center text-sm font-bold tracking-widest text-slate-500 uppercase mb-4">Round of 32</h3>
            <div class="flex flex-col gap-3 flex-1">
              <ng-container *ngFor="let match of r32(); trackBy: trackByMatchId">
                <ng-container *ngTemplateOutlet="matchCard; context: { match: match }"></ng-container>
              </ng-container>
            </div>
          </div>

          <!-- Connector: R32 → R16 -->
          <div class="flex flex-col w-12 shrink-0">
            <div class="text-sm mb-4 invisible">&nbsp;</div>
            <div class="flex flex-col flex-1">
              <div *ngFor="let c of r32Connectors()" class="flex-1 bracket-connector"
                   [ngClass]="{'top-active': c.topActive, 'bot-active': c.botActive, 'out-active': c.outActive}">
                <div class="arm-top"></div>
                <div class="arm-bot"></div>
                <div class="arm-out"></div>
              </div>
            </div>
          </div>

          <!-- Column: Round of 16 -->
          <div class="flex flex-col w-64 shrink-0">
            <h3 class="text-center text-sm font-bold tracking-widest text-slate-500 uppercase mb-4">Round of 16</h3>
            <div class="flex flex-col justify-around flex-1">
              <ng-container *ngFor="let match of r16(); trackBy: trackByMatchId">
                <ng-container *ngTemplateOutlet="matchCard; context: { match: match }"></ng-container>
              </ng-container>
            </div>
          </div>

          <!-- Connector: R16 → QF -->
          <div class="flex flex-col w-12 shrink-0">
            <div class="text-sm mb-4 invisible">&nbsp;</div>
            <div class="flex flex-col flex-1">
              <div *ngFor="let c of r16Connectors()" class="flex-1 bracket-connector"
                   [ngClass]="{'top-active': c.topActive, 'bot-active': c.botActive, 'out-active': c.outActive}">
                <div class="arm-top"></div>
                <div class="arm-bot"></div>
                <div class="arm-out"></div>
              </div>
            </div>
          </div>

          <!-- Column: Quarter Finals -->
          <div class="flex flex-col w-64 shrink-0">
            <h3 class="text-center text-sm font-bold tracking-widest text-slate-500 uppercase mb-4">Quarter-Finals</h3>
            <div class="flex flex-col justify-around flex-1">
              <ng-container *ngFor="let match of qf(); trackBy: trackByMatchId">
                <ng-container *ngTemplateOutlet="matchCard; context: { match: match }"></ng-container>
              </ng-container>
            </div>
          </div>

          <!-- Connector: QF → SF -->
          <div class="flex flex-col w-12 shrink-0">
            <div class="text-sm mb-4 invisible">&nbsp;</div>
            <div class="flex flex-col flex-1">
              <div *ngFor="let c of qfConnectors()" class="flex-1 bracket-connector"
                   [ngClass]="{'top-active': c.topActive, 'bot-active': c.botActive, 'out-active': c.outActive}">
                <div class="arm-top"></div>
                <div class="arm-bot"></div>
                <div class="arm-out"></div>
              </div>
            </div>
          </div>

          <!-- Column: Semi Finals -->
          <div class="flex flex-col w-64 shrink-0">
            <h3 class="text-center text-sm font-bold tracking-widest text-slate-500 uppercase mb-4">Semi-Finals</h3>
            <div class="flex flex-col justify-around flex-1">
              <ng-container *ngFor="let match of sf(); trackBy: trackByMatchId">
                <ng-container *ngTemplateOutlet="matchCard; context: { match: match }"></ng-container>
              </ng-container>
            </div>
          </div>

          <!-- Connector: SF → Final -->
          <div class="flex flex-col w-12 shrink-0">
            <div class="text-sm mb-4 invisible">&nbsp;</div>
            <div class="flex flex-col flex-1">
              <div class="flex-1 bracket-connector"
                   [ngClass]="{'top-active': sfConnector().topActive, 'bot-active': sfConnector().botActive, 'out-active': sfConnector().outActive}">
                <div class="arm-top"></div>
                <div class="arm-bot"></div>
                <div class="arm-out"></div>
              </div>
            </div>
          </div>

          <!-- Column: Final & Third Place -->
          <div class="flex flex-col justify-center w-72 shrink-0">

            <div class="flex flex-col">
              <h3 class="text-center text-sm font-bold tracking-widest text-amber-500 uppercase mb-4 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">Final</h3>
              <ng-container *ngIf="finalMatch() as match">
                <!-- Golden Final Match -->
                <div class="bg-gradient-to-br from-amber-500/20 to-amber-900/20 border border-amber-500/50 rounded-2xl p-4 shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col gap-2 relative">
                  <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>

                  <div class="flex justify-between items-center z-10 p-3 sm:p-2 rounded-lg cursor-pointer transition-all border border-transparent active:scale-[0.98]"
                       (click)="selectWinner(match, match.homeTeamId)"
                       [ngClass]="{
                         'bg-amber-500/20 border-amber-500 shadow-inner scale-[1.02]': isWinner(match, match.homeTeamId),
                         'opacity-40 grayscale': hasWinner(match) && !isWinner(match, match.homeTeamId),
                         'hover:bg-amber-500/10 hover:border-amber-500/30': match.homeTeamId && !hasWinner(match)
                       }">
                    <div class="flex items-center gap-2">
                      <img *ngIf="getTeam(match.homeTeamId)?.flagUrl" [src]="getTeam(match.homeTeamId)?.flagUrl" alt="Flag" class="w-6 h-4 object-cover rounded-[2px] shadow-sm">
                      <div *ngIf="match.homeTeamId && !getTeam(match.homeTeamId)?.flagUrl" class="w-6 h-4 bg-slate-700/50 rounded-[2px] shadow-sm shrink-0"></div>
                      <span class="font-black text-amber-300 text-base sm:text-lg" [ngClass]="{'opacity-50': !match.homeTeamId}">{{ getTeam(match.homeTeamId)?.name || match.homeTeamId || 'TBD' }}</span>
                    </div>
                    <div class="w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all bg-amber-950/50 border border-amber-500/30"
                         [ngClass]="{'!bg-amber-500': isWinner(match, match.homeTeamId)}">
                      <svg *ngIf="isWinner(match, match.homeTeamId)" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  <div class="h-px w-full bg-gradient-to-r from-transparent via-amber-500/50 to-transparent my-0.5 z-10"></div>

                  <div class="flex justify-between items-center z-10 p-3 sm:p-2 rounded-lg cursor-pointer transition-all border border-transparent active:scale-[0.98]"
                       (click)="selectWinner(match, match.awayTeamId)"
                       [ngClass]="{
                         'bg-amber-500/20 border-amber-500 shadow-inner scale-[1.02]': isWinner(match, match.awayTeamId),
                         'opacity-40 grayscale': hasWinner(match) && !isWinner(match, match.awayTeamId),
                         'hover:bg-amber-500/10 hover:border-amber-500/30': match.awayTeamId && !hasWinner(match)
                       }">
                    <div class="flex items-center gap-2">
                      <img *ngIf="getTeam(match.awayTeamId)?.flagUrl" [src]="getTeam(match.awayTeamId)?.flagUrl" alt="Flag" class="w-6 h-4 object-cover rounded-[2px] shadow-sm">
                      <div *ngIf="match.awayTeamId && !getTeam(match.awayTeamId)?.flagUrl" class="w-6 h-4 bg-slate-700/50 rounded-[2px] shadow-sm shrink-0"></div>
                      <span class="font-black text-amber-300 text-base sm:text-lg" [ngClass]="{'opacity-50': !match.awayTeamId}">{{ getTeam(match.awayTeamId)?.name || match.awayTeamId || 'TBD' }}</span>
                    </div>
                    <div class="w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all bg-amber-950/50 border border-amber-500/30"
                         [ngClass]="{'!bg-amber-500': isWinner(match, match.awayTeamId)}">
                      <svg *ngIf="isWinner(match, match.awayTeamId)" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </ng-container>
            </div>

            <div class="flex flex-col mt-8">
              <h3 class="text-center text-xs font-bold tracking-widest text-slate-500 uppercase mb-3">Third Place</h3>
              <ng-container *ngIf="thirdPlaceMatch() as match">
                <ng-container *ngTemplateOutlet="matchCard; context: { match: match }"></ng-container>
              </ng-container>
            </div>

          </div>

        </div>
      </div>
    </div>

    <!-- Reusable Match Card Template -->
    <ng-template #matchCard let-match="match">
      <div class="transition-colors rounded-xl p-1 flex flex-col relative z-10"
           [ngClass]="{
             'bg-slate-800/80 border border-slate-700 shadow-lg': match.homeTeamId || match.awayTeamId,
             'bg-slate-800/30 border border-dashed border-slate-700/40 opacity-50': !match.homeTeamId && !match.awayTeamId
           }">

        <!-- Home Team -->
        <div class="flex justify-between items-center p-2.5 sm:p-2 rounded cursor-pointer transition-all border border-transparent active:scale-[0.98]"
             (click)="selectWinner(match, match.homeTeamId)"
             [ngClass]="{
               'bg-indigo-900/60 border-indigo-500/50': isWinner(match, match.homeTeamId),
               'opacity-30 grayscale': hasWinner(match) && !isWinner(match, match.homeTeamId),
               'hover:bg-slate-700/80 hover:border-slate-500/50': match.homeTeamId && !hasWinner(match)
             }">
          <div class="flex items-center gap-2 truncate pr-2 flex-1 min-w-0 relative z-10">
            <img *ngIf="getTeam(match.homeTeamId)?.flagUrl" [src]="getTeam(match.homeTeamId)?.flagUrl" alt="Flag" class="w-4 h-3 object-cover rounded-[1px] shadow-sm shrink-0">
            <div *ngIf="match.homeTeamId && !getTeam(match.homeTeamId)?.flagUrl" class="w-4 h-3 bg-slate-700/50 rounded-[1px] shadow-sm shrink-0"></div>
            <span class="font-bold text-slate-200 truncate group-hover:text-white text-[13px] sm:text-sm" [ngClass]="{'text-slate-500': !match.homeTeamId}">
              {{ getTeam(match.homeTeamId)?.name || match.homeTeamId || 'TBD' }}
            </span>
          </div>
          <div class="w-6 h-6 sm:w-5 sm:h-5 rounded shrink-0 flex items-center justify-center transition-colors border border-slate-700 bg-slate-900"
               [ngClass]="{'!bg-indigo-500 !border-indigo-400': isWinner(match, match.homeTeamId)}">
            <svg *ngIf="isWinner(match, match.homeTeamId)" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:h-3 sm:w-3 text-white shadow-sm" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>

        <!-- Divider -->
        <div class="absolute left-2 right-2 top-1/2 -mt-[0.5px] h-px bg-slate-700/50 pointer-events-none z-0"></div>

        <!-- Away Team -->
        <div class="flex justify-between items-center p-2.5 sm:p-2 rounded cursor-pointer transition-all border border-transparent active:scale-[0.98]"
             (click)="selectWinner(match, match.awayTeamId)"
             [ngClass]="{
               'bg-indigo-900/60 border-indigo-500/50': isWinner(match, match.awayTeamId),
               'opacity-30 grayscale': hasWinner(match) && !isWinner(match, match.awayTeamId),
               'hover:bg-slate-700/80 hover:border-slate-500/50': match.awayTeamId && !hasWinner(match)
             }">
          <div class="flex items-center gap-2 truncate pr-2 flex-1 min-w-0 relative z-10">
            <img *ngIf="getTeam(match.awayTeamId)?.flagUrl" [src]="getTeam(match.awayTeamId)?.flagUrl" alt="Flag" class="w-4 h-3 object-cover rounded-[1px] shadow-sm shrink-0">
            <div *ngIf="match.awayTeamId && !getTeam(match.awayTeamId)?.flagUrl" class="w-4 h-3 bg-slate-700/50 rounded-[1px] shadow-sm shrink-0"></div>
            <span class="font-bold text-slate-200 truncate group-hover:text-white text-[13px] sm:text-sm" [ngClass]="{'text-slate-500': !match.awayTeamId}">
              {{ getTeam(match.awayTeamId)?.name || match.awayTeamId || 'TBD' }}
            </span>
          </div>
          <div class="w-6 h-6 sm:w-5 sm:h-5 rounded shrink-0 flex items-center justify-center transition-colors border border-slate-700 bg-slate-900"
               [ngClass]="{'!bg-indigo-500 !border-indigo-400': isWinner(match, match.awayTeamId)}">
             <svg *ngIf="isWinner(match, match.awayTeamId)" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:h-3 sm:w-3 text-white shadow-sm" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>

      </div>
    </ng-template>
  `,
  styles: [`
    .custom-scrollbar { -webkit-overflow-scrolling: touch; scroll-behavior: smooth; }
    .custom-scrollbar::-webkit-scrollbar { height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(79, 70, 229, 0.5); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(79, 70, 229, 0.8); }
    @media (max-width: 639px) {
      .custom-scrollbar::-webkit-scrollbar { height: 4px; }
    }

    .bracket-connector {
      position: relative;
    }
    .bracket-connector .arm-top {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 50%;
      right: 50%;
      border-bottom: 2px solid rgba(148, 163, 184, 0.5);
      border-right: 2px solid rgba(148, 163, 184, 0.5);
      border-bottom-right-radius: 4px;
    }
    .bracket-connector .arm-bot {
      position: absolute;
      left: 0;
      top: 50%;
      bottom: 0;
      right: 50%;
      border-top: 2px solid rgba(148, 163, 184, 0.5);
      border-right: 2px solid rgba(148, 163, 184, 0.5);
      border-top-right-radius: 4px;
    }
    .bracket-connector .arm-out {
      position: absolute;
      top: 50%;
      left: 50%;
      right: 0;
      height: 0;
      border-top: 2px solid rgba(148, 163, 184, 0.5);
      transform: translateY(-1px);
    }

    /* Active connector states */
    .bracket-connector.top-active .arm-top {
      border-color: rgba(129, 140, 248, 0.7);
    }
    .bracket-connector.bot-active .arm-bot {
      border-color: rgba(129, 140, 248, 0.7);
    }
    .bracket-connector.out-active .arm-out {
      border-color: rgba(129, 140, 248, 0.7);
    }
  `]
})
export class BracketComponent {
  private tournamentService = inject(TournamentService);

  @Input() set matches(val: Match[]) {
    this.matchesSignal.set(val);
  }
  @Input() teamMap: Map<string, Team> = new Map();

  private matchesSignal = signal<Match[]>([]);
  winners = this.tournamentService.knockoutWinners;
  mobileRound = signal(0);
  mobileRounds = ['R32', 'R16', 'QF', 'Semi', 'Final'];

  // Visual bracket order (top-to-bottom) matching official FIFA bracket layout
  private readonly R32_ORDER = [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87];
  private readonly R16_ORDER = [89, 90, 93, 94, 91, 92, 95, 96];
  private readonly QF_ORDER = [97, 98, 99, 100];
  private readonly SF_ORDER = [101, 102];

  r32 = computed(() => {
    const matches = this.matchesSignal();
    return this.R32_ORDER.map(id => matches.find(m => m.id === id)!).filter(Boolean);
  });
  r16 = computed(() => {
    const matches = this.matchesSignal();
    return this.R16_ORDER.map(id => matches.find(m => m.id === id)!).filter(Boolean);
  });
  qf = computed(() => {
    const matches = this.matchesSignal();
    return this.QF_ORDER.map(id => matches.find(m => m.id === id)!).filter(Boolean);
  });
  sf = computed(() => {
    const matches = this.matchesSignal();
    return this.SF_ORDER.map(id => matches.find(m => m.id === id)!).filter(Boolean);
  });
  finalMatch = computed(() => this.matchesSignal().find(m => m.id === 104));
  thirdPlaceMatch = computed(() => this.matchesSignal().find(m => m.id === 103));

  bracketEmpty = computed(() => {
    const r16 = this.r16();
    return r16.length > 0 && r16.every(m => !m.homeTeamId && !m.awayTeamId);
  });

  r32Connectors = computed(() => this.r16().map(m => ({
    topActive: !!m.homeTeamId, botActive: !!m.awayTeamId, outActive: !!m.homeTeamId && !!m.awayTeamId
  })));
  r16Connectors = computed(() => this.qf().map(m => ({
    topActive: !!m.homeTeamId, botActive: !!m.awayTeamId, outActive: !!m.homeTeamId && !!m.awayTeamId
  })));
  qfConnectors = computed(() => this.sf().map(m => ({
    topActive: !!m.homeTeamId, botActive: !!m.awayTeamId, outActive: !!m.homeTeamId && !!m.awayTeamId
  })));
  sfConnector = computed(() => {
    const f = this.finalMatch();
    return { topActive: !!f?.homeTeamId, botActive: !!f?.awayTeamId, outActive: !!f?.homeTeamId && !!f?.awayTeamId };
  });

  getTeam(teamId: string | null): Team | undefined {
    return teamId ? this.teamMap.get(teamId) : undefined;
  }

  hasWinner(match: Match): boolean {
    return this.winners().has(match.id);
  }

  isWinner(match: Match, teamId: string | null): boolean {
    if (!teamId) return false;
    return this.winners().get(match.id) === teamId;
  }

  trackByMatchId(index: number, match: Match): number {
    return match.id;
  }

  @ViewChild('bracketContent') bracketContent!: ElementRef;

  setMobileRound(idx: number) {
    this.mobileRound.set(idx);
    this.bracketContent?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  selectWinner(match: Match, teamId: string | null) {
    if (!teamId) return;

    if (this.isWinner(match, teamId)) {
      this.tournamentService.setKnockoutWinner(match.id, null);
    } else {
      this.tournamentService.setKnockoutWinner(match.id, teamId);

      if (match.id === 104) {
        this.triggerConfetti();
      }
    }
  }

  triggerConfetti() {
    const duration = 2500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#38bdf8', '#818cf8', '#fcd34d', '#ffffff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#38bdf8', '#818cf8', '#fcd34d', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }

  exportBracket() {
    if (!this.bracketContent) return;
    toPng(this.bracketContent.nativeElement, { backgroundColor: '#0f172a', cacheBust: true })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'my-world-cup-bracket.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Oops, something went wrong generating the image!', err);
      });
  }
}
