# Prediction Stats Dashboard Design Spec

## Goal

Add a "Stats" view toggle to the main content area that shows a dashboard of prediction statistics — scoring highlights, compact numerical stats, and a full team journey table — computed reactively from the user's entered scores.

## Constraints

- No new dependencies — pure Angular signals/computed, Tailwind CSS
- No router — conditional rendering via `*ngIf` on a `viewMode` signal, matching the existing app pattern
- All stats derived from existing TournamentService signals (`matches`, `teams`, `teamMap`, `groupStandings`, `knockoutMatches`, `knockoutWinners`)
- Responsive: mobile-first, scales to desktop
- Must handle empty and partial prediction states gracefully

## View Toggle

A `viewMode` signal (`'predictions' | 'stats'`) on `AppComponent` controls which view is shown. The toggle lives in the existing header area, near the Simulate/Undo/Reset buttons. Two options:

- **Predictions** (default): current group tables + bracket view
- **Stats**: hides group tables, third-place table, and bracket; shows `<app-stats>` component

The toggle is a segmented control matching the existing "By Group / By Date" toggle style (pill buttons with indigo active state).

## Component: StatsComponent

New standalone component: `src/app/features/stats/stats.component.ts`

Injects `TournamentService` directly. All stats are `computed()` signals derived from the service's existing signals. No additional state management.

## Layout: Three Tiers

### Tier 1: Highlight Cards

3-4 visually prominent cards in a responsive grid (2x2 on mobile, 4 across on desktop). Each card has a colored left-border accent, a label, and a value with context.

1. **Top Scoring Team** (emerald accent)
   - Team flag + name + total goals scored across all matches (group + knockout)
   - Computed by summing goals for each team across all matches where they appear as home or away

2. **Best Defense** (blue accent)
   - Team flag + name + fewest goals conceded
   - Minimum 3 matches played to qualify (prevents a team with 1 match and 0 conceded from winning)

3. **Biggest Upset** (pink accent)
   - The match where the team with the lowest power rating beat the team with the highest power rating
   - Shows "Winner def. Loser" with the power rating difference
   - Only considers matches with a decisive result (not draws)
   - For knockout matches, the winner is derived from regular time, extra time, or penalties

4. **Highest Scoring Group** (amber accent)
   - Group letter + total goals scored in that group's matches
   - Only considers group stage matches

### Tier 2: Stat Pills

A row of compact pill-shaped badges below the highlight cards. Horizontally scrollable on mobile, wrapping on desktop.

1. **Total Goals** — sum of all homeScore + awayScore values across all matches with scores entered
2. **Avg Goals/Match** — total goals divided by number of matches with scores entered (not all 104). Displayed to 1 decimal place. Shows match count as context, e.g., "2.4 (32 matches)"
3. **Most Common Scoreline** — the most frequent combination of home/away scores, normalized so the higher score is always first (2-1 and 1-2 both count as "2-1"; 0-0 stays as "0-0"). Shows count in parentheses, e.g., "2-1 (12x)"
4. **Clean Sheets** — number of matches where at least one team scored 0 (regular time only)
5. **Draws** — number of group stage matches ending level in regular time. Knockout matches are excluded since they proceed to ET/penalties.

### Tier 3: Team Journey Table

A table of all 48 teams showing their predicted tournament path.

**Columns:**
| Flag | Team | Group | Pos | Pts | GF | GA | Exit Round |

- **Flag + Team**: flag icon (from `team.flagUrl`) and team name
- **Group**: group letter (A-L)
- **Pos**: predicted group finish (1st, 2nd, 3rd, 4th) — derived from `groupStandings`
- **Pts / GF / GA**: from the team's `GroupStanding` entry
- **Exit Round**: how far the team goes in the tournament. Values: "Group Stage", "R32", "R16", "QF", "SF", "3rd Place", "Runner-up", "Champion"

**Exit Round derivation:**
- If the team does not qualify for the knockout stage (finished 4th, or 3rd but not in the best-third list), Exit Round = "Group Stage"
- If the team qualifies but has no knockout match result yet, Exit Round = the round they're in + " (TBD)"
- Trace each team through `knockoutMatches`: find the last match where the team was a participant and lost (or the final if they won it). The round of that match determines the exit.
- Special cases: Final winner = "Champion", Final loser = "Runner-up", 3rd place match winner = "3rd Place", 3rd place match loser = "4th Place"

**Default sort:** Exit Round depth (Champion first, Group Stage last), then by group points as tiebreaker within the same exit round.

**Styling:**
- Rows for knockout qualifiers get a subtle indigo left-border accent
- Champion row gets a gold/amber highlight
- Mobile: horizontal scroll with sticky first column (flag + team name)
- Standard dark slate table rows matching the existing group table aesthetic

## Empty & Partial States

- **No scores entered**: Centered message — "Enter some scores to see your prediction stats" with a pill button to switch back to the Predictions view. No cards, pills, or table shown.
- **Partial group stage**: Highlight cards and pills compute from available data. Team journey table shows all 48 teams; Exit Round shows "TBD" for teams whose path is undetermined. Stat pills include match count context (e.g., "2.4 avg (32 matches)").
- **Group stage complete, knockout empty**: Table shows group positions. Exit Round shows the knockout round the team enters with "(TBD)" for teams without knockout results yet. Highlight cards that depend on knockout data (e.g., biggest upset) use only group stage data.

## Files Involved

- **Modify:** `src/app/app.component.ts` — add `viewMode` signal, toggle UI in header, conditional rendering of stats vs predictions
- **Create:** `src/app/features/stats/stats.component.ts` — standalone component with all stats computeds, template, and styles
