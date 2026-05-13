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

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   Create `.env` in the project root with:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Run the app**
   ```bash
   npm start
   ```
   Then select your platform:
   - `a` for Android
   - `i` for iOS
   - `w` for web

## Project structure

**Main app** (`src/`)
- `screens/` — App pages (sign up, deal feed, matches, chat, profile, settings)
- `services/` — Business logic and Supabase calls
- `stores/` — Global app state (user data)
- `components/` — Reusable UI parts (buttons, etc)

**Backend** (`database/`)
- `schema.sql` — Complete database setup with all 7 tables, indexes, RLS policies, and grants. Contains users, deals, deal_images, swipes, matches, messages, points_log tables plus compatibility functions and materialized view.

**Scraper** (`scraper/`)
- Separate project for importing deals from external sites
- Run with `cd scraper && npm run dev`
- See `scraper/README.md` for details

## Common tasks

### Run tests
```bash
# Not yet configured
```

### Add a new screen
1. Create file in `src/screens/YourScreen.tsx`
2. Import in `App.tsx`
3. Add to navigator

### Add a new service (Supabase call)
1. Create file in `src/services/yourService.ts`
2. Export functions that call Supabase
3. Import where needed

### Update the scraper
See `scraper/README.md` for scraper configuration and usage.

## Architecture principles

- **Screens** only display UI
- **Services** handle all Supabase calls and business logic
- **Stores** hold global state (Zustand)
- Styling uses Tailwind (NativeWind for React Native)

## Contributing

### How to keep this README updated after major changes

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