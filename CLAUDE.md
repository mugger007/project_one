# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

## Commands

### App (root)

```bash
npm install          # install dependencies
npm start            # start Expo dev server
npm run android      # run on Android
npm run ios          # run on iOS
npm run web          # run on web
```

### Scraper (separate project)

```bash
cd scraper
npm install
npm run dev          # build + run in one step
npm run build        # compile TypeScript only
npm start            # run compiled output
```

## Environment Variables

Create `.env` in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## Architecture

**UI layer → Service layer → Supabase** is the core pattern. Screens never call Supabase directly.

### App entry

- `App.tsx` — root navigator + auth gate; boots Supabase session and routes to onboarding or main tabs
- `src/supabase.ts` — singleton Supabase client (session persistence + token refresh)

### State

- `src/stores/userStore.ts` — Zustand store; holds `userId` and helpers for `match_settings`

### Screens (`src/screens/`)

| Screen | Role |
|--------|------|
| `Onboarding.tsx` | Sign up / sign in / OAuth |
| `DealFeed.tsx` | Swipe deck; loads active deals, logs swipes, triggers match check |
| `AddDeal.tsx` | Deal creation with camera/gallery and storage upload |
| `Matches.tsx` | Match list; navigates into Chat |
| `Chat.tsx` | Realtime messaging via Supabase broadcast + Gifted Chat |
| `Profile.tsx` | Profile editing; serializes GPS to PostGIS format |
| `Settings.tsx` | Match preferences; triggers compatibility cache refresh RPC on save |

### Services (`src/services/`)

All Supabase queries and business logic live here.

| Service | Responsibility |
|---------|----------------|
| `authService.ts` | Sign up/in/OAuth; awards daily login points |
| `profileService.ts` | Load/save profile; GPS → PostGIS serialization |
| `settingsService.ts` | Load/save `match_settings`; calls RPC to refresh compatibility cache; sign out |
| `dealService.ts` | Fetch active unswiped deals; resolve image URLs from storage; create deals with `deal_images` row |
| `matchService.ts` | Log swipes; mutual-interest + compatibility check via SQL RPC; create matches; push notifications |
| `pointsService.ts` | Award/check points; log to `points_log`; supports once-ever and daily guards |

### Database (`database/`)

- `schema.sql` — Complete database schema: all 7 tables, indexes, RLS policies, grants, functions, and materialized views. Run this on Supabase to set up the database.
- Tables: users, deals, deal_images, swipes, matches, messages, points_log
- Functions: `check_user_compatibility`, `get_user_location_coords`, `refresh_user_compatibility_cache`
- Materialized view: `user_compatibility_cache` for pre-computed compatible pairs

### Supabase Storage

- Bucket `deals_images` — deal photos uploaded from `AddDeal` screen, referenced by rows in `deal_images` table (includes `size_bytes`, `is_primary`).

### Scraper (`scraper/`)

Standalone TypeScript project. Produces JSON files in `scraper/output/` (git-ignored).

- `src/index.ts` — CLI entry; orchestrates scrape runs
- `src/scrapers/genericScraper.ts` — pagination + optional JS rendering (Puppeteer)
- `src/scrapers/siteScrapers.ts` — site-specific handlers
- `src/parsers/dealParser.ts` — deal pattern detection and date extraction
- `src/utils/httpClient.ts` — HTTP client with retry

### Styling

NativeWind (Tailwind for React Native). Config in `tailwind.config.js`. Use Tailwind class names via `className` prop.
