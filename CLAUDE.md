# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Ritual Tracker** — a habit tracker + daily planner built with Expo (React Native + React Native Web). Runs on Android and in the browser from a single codebase.

## Commands

```bash
npm start              # start Expo dev server (then press w for web, scan QR for Android)
npm run web            # open directly in browser
npm run android        # open on Android
npm run export:web     # build for web deployment → /dist folder → deploy to Netlify/Vercel
```

To preview on Android: run `npm start`, scan the QR code with Expo Go.

## Architecture

```
App.tsx                      # root: mounts TopTabBar + active screen
src/
  theme.ts                   # all colors (Colors.*) and typography (Typography.*) — edit here first
  components/
    TopTabBar.tsx             # custom top tab bar with rune glyph; manages TabName state
  screens/
    HomeScreen.tsx            # tarot image + rune display + weekly intentions
    HabitsScreen.tsx          # month grid, streaks, add/edit habit modal
    TodoScreen.tsx            # task list grouped by project, domain tabs
  store/
    habits.ts                 # Habit type, loadHabits/saveHabits (AsyncStorage key: ritual:habits)
    tasks.ts                  # Task type, loadTasks/saveTasks (AsyncStorage key: ritual:tasks)
    home.ts                   # HomeData type, loadHome/saveHome (AsyncStorage key: ritual:home)
  utils/
    rune.ts                   # getCurrentRune() — deterministic weekly rune from Elder Futhark
    streaks.ts                # streak/goal calculation helpers
```

**Navigation** is plain `useState` in `App.tsx` (no navigation library) — the three screens are rendered conditionally based on `TabName`.

**Persistence** is AsyncStorage only — no backend, no sync.

## Data Models

**Habit** (`src/store/habits.ts`):
- `completions`: keyed by `"YYYY-MM-DD"`. Value is `true` (plain) or `{ sym: string }` (subtype).
- `types`: array of full subtype strings; only the first character is displayed in the grid cell.

**Task** (`src/store/tasks.ts`):
- `parent: number | null` — `null` = top-level task; a task id = subtask.
- Completed tasks are pruned at midnight via `loadTasks()` (filters `done && doneAt < midnight`).
- `domain`: `'work' | 'life' | 'creative'`

## Design Rules

- **Colors**: always use `Colors.*` from `src/theme.ts` — never hardcode hex values in components.
- **Typography**: serif font throughout (Georgia fallback). Nav and section labels are ALL CAPS with letter-spacing.
- **No emoji** anywhere in the UI. Subtypes use typed characters or Unicode symbols only.
- Habit drag handle: `⋮⋮` (two vertical ellipsis characters). Task drag handle: `⋮`.
- Cell size for the habit month grid: 19×19px, tightly spaced.
- Tarot image: aspect ratio 11:19, displayed with a peach-tinted monochrome filter.

## Rune Logic

`getCurrentRune()` in `src/utils/rune.ts`:
```ts
Math.floor(Date.now() / 604800000) % 24
```
One of 24 Elder Futhark runes. Refreshes every Monday. Same glyph in nav bar (small) and Home screen (large, 64px).

## Screen Build Order

Per spec: scaffold first (done), then build each screen one at a time with user review between screens. Order: **HOME → HABITS → TO-DO**.
