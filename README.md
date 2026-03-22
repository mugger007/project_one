# Project One

Mobile-first Expo React Native app for social deal discovery, matching, and chat, with Supabase as backend (auth, database, storage, realtime).

## What the app does

- Users sign up/sign in and manage profile + match preferences.
- Users browse deals in a swipe-based feed.
- Mutual interest and compatibility rules create matches.
- Matched users chat in realtime.
- Users can add new deals with image upload and metadata.
- A points system rewards user activity.

## Tech stack

- Expo + React Native + TypeScript
- React Navigation (stack + tabs)
- Supabase (Auth, Postgres, Storage, Realtime)
- Zustand for lightweight app state
- Gifted Chat for messaging UI
- Expo Location and Expo Image Picker

## Repository structure and responsibilities

### Root files and folders

- `App.tsx`
	- Root navigator and auth gate.
	- Boots session from Supabase and routes users to onboarding or main app.
- `index.ts`
	- Expo entry point.
- `app.json`
	- Expo app config (name, plugins, EAS project id, web options).
- `package.json`
	- Root dependencies and scripts for app runtime.
- `babel.config.js`, `tailwind.config.js`, `tsconfig.json`
	- Build, style, and type configuration.
- `assets/`
	- Static app assets (icons, splash, etc).
- `src/`
	- Main app source code (screens, services, stores, backend client).
- `database/`
	- SQL functions and performance objects for compatibility matching.
- `scraper/`
	- Separate TypeScript scraper project for collecting deal data.

### src folder

#### `src/supabase.ts`

- Creates the shared Supabase client using `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Enables session persistence and token refresh.

#### `src/stores/`

- `src/stores/userStore.ts`
	- Global user state (`userId`) and helpers for loading/saving `match_settings`.

#### `src/components/`

- `src/components/Button.tsx`
	- Reusable UI button component.

#### `src/screens/`

- `src/screens/Onboarding.tsx`
	- Email/password sign up and sign in, plus OAuth entry.
	- Uses `authService` and updates `userStore` on success.

- `src/screens/DealFeed.tsx`
	- Swipe deck UI for deals.
	- Loads active unswiped deals with images.
	- Handles left/right swipes and match checks.
	- Includes Add Deal flow:
		- form fields
		- custom cross-platform calendar modal
		- image capture/gallery selection
		- create deal submission

- `src/screens/Matches.tsx`
	- Match list UI with deal image and matched user name.
	- Navigates into chat for a selected match.

- `src/screens/Chat.tsx`
	- Realtime chat screen using Gifted Chat.
	- Loads message history and subscribes to Supabase broadcast updates.

- `src/screens/Profile.tsx`
	- Profile editing and validation.
	- Location retrieval from device.
	- Saves profile data (including PostGIS location format via service).

- `src/screens/Settings.tsx`
	- Match preference controls:
		- gender preference
		- distance slider
		- age range slider
	- Save/cancel behavior and logout.

#### `src/services/`

- `src/services/authService.ts`
	- Auth operations (sign up/sign in/OAuth).
	- Awards login points once per day.

- `src/services/profileService.ts`
	- Profile load/save and current GPS lookup.
	- Handles location serialization to PostGIS string format.
	- Awards profile completion points once.

- `src/services/settingsService.ts`
	- Loads/saves `match_settings` and triggers compatibility cache refresh RPC.
	- Handles sign out.

- `src/services/dealService.ts`
	- Fetches active deals, excludes already swiped deals, resolves image URLs.
	- Creates deals with:
		- `created_by`
		- default SG location fallback
		- storage upload to `deals_images`
		- `deal_images` row insertion including `size_bytes` and `is_primary`

- `src/services/matchService.ts`
	- Logs swipes.
	- Checks mutual interest and compatibility via SQL RPC.
	- Creates matches and awards points.
	- Handles new match notifications.

- `src/services/matchesService.ts`
	- Fetches and enriches match list data:
		- deal names
		- primary deal images
		- matched user names

- `src/services/chatService.ts`
	- Message CRUD + realtime channel subscription/broadcast.

- `src/services/pointsService.ts`
	- Points rules and persistence in `points_log`.
	- Supports totals, history, once-ever checks, and daily checks.

#### `src` utility scripts

- `src/updateDeals.js`
	- One-off helper script for inserting sample deals.
- `src/updateDealImages.js`
	- One-off helper script for syncing storage images into `deal_images`.

## Database folder

- `database/match_compatibility.sql`
	- Defines compatibility logic function used by matching flow.
	- Includes indexes for performance.
	- Defines materialized view cache and refresh function.

## Scraper subproject

The `scraper/` folder is a separate project used for extracting deal data from external sites.

- `scraper/src/index.ts`
	- CLI entry point that runs site scraping and writes output JSON.
- `scraper/src/scrapers/genericScraper.ts`
	- Generic scraping engine (pagination + optional JS page load).
- `scraper/src/scrapers/siteScrapers.ts`
	- Site-specific scraping handlers.
- `scraper/src/parsers/dealParser.ts`
	- Deal pattern detection and deal/date extraction.
- `scraper/src/utils/httpClient.ts`
	- HTTP request utility with retry behavior.
- `scraper/src/types/index.ts`
	- Shared scraper type definitions.

See `scraper/README.md` for scraper-specific setup and usage.

## High-level architecture

- UI layer (screens/components) calls service layer.
- Service layer contains all business logic and Supabase interactions.
- Supabase provides Auth + Postgres + Storage + Realtime.
- SQL compatibility function and cache optimize match decisions.

## Local setup

1. Install dependencies

```bash
npm install
```

2. Add environment values in `.env`

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

3. Run app

```bash
npm start
```

4. Run target platform

```bash
npm run android
npm run ios
npm run web
```

## How to keep this README updated after major changes

Use this lightweight process for every feature PR:

1. Treat README update as part of the feature definition of done.
2. In each PR, add a section called "Docs impact" with:
	 - changed files/folders
	 - new env vars
	 - schema/API behavior changes
3. If any of the above changed, update README in the same PR before merge.
4. Keep a short "Recent major changes" section in PR description for reviewer context.
5. During code review, include a required check: "README/docs updated if behavior changed".

Recommended automation:

- Add a pull request template checklist item:
	- "I updated README/documentation for functional or architectural changes."
- Optionally add a CI lint step that fails if key files changed (for example in `src/services/`, `database/`, `app.json`) and README did not change.

## Suggested maintenance cadence

- Minor UI-only change: update README only if feature behavior changed.
- New service/screen/database function: always update README structure section.
- Breaking behavior or new setup requirement: always update setup/architecture sections.