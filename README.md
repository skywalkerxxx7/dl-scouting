# Patron Scouting

A scouting board for **Deadlock**. Look up any player, save them to a shared board, see what they've done recently and over their whole history, and compare two players side by side.

Player links go to their [Statlocker](https://statlocker.gg) profile. The stats come from the free, public [Deadlock API](https://deadlock-api.com), which is the same match data that Statlocker and other community trackers use. Statlocker doesn't offer a public API of its own.

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Getting started](#getting-started)
4. [Project structure](#project-structure)
5. [How it works](#how-it-works)
   - [Request flow](#request-flow)
   - [Player lookup and ID parsing](#player-lookup-and-id-parsing)
   - [Building a player report](#building-a-player-report)
   - [Stat definitions](#stat-definitions)
   - [Ranks](#ranks)
   - [Saving players (database)](#saving-players-database)
   - [Comparison logic](#comparison-logic)
   - [Caching](#caching)
6. [Pages and routes](#pages-and-routes)
7. [Components](#components)
8. [External APIs used](#external-apis-used)
9. [Design system](#design-system)
10. [Security notes](#security-notes)
11. [Known limitations and ideas](#known-limitations-and-ideas)

---

## Features

- **Search** by Steam name, Deadlock account ID, SteamID64, or a pasted Statlocker profile URL. Results appear as you type.
- **Save** players to a board that's stored in Postgres. Each saved card shows rank, win rate, KDA, souls per minute and a strip of recent wins and losses.
- **Player profile pages** show:
  - current rank badge and rank score
  - a rank trend chart (last 40 ranked updates)
  - stats from the last 50 matches
  - lifetime stats from hero data
  - the 5 most-played heroes
  - a full match log
  - notes you can edit for saved players
  - a link out to Statlocker
- **Side-by-side comparison** of any two players: rank, recent form, top heroes, and 16 stats where the better value on each row is highlighted.

## Tech stack

| Area          | Choice                                                      |
| ------------- | ----------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, Server Components, Server Actions)  |
| Language      | TypeScript                                                  |
| Styling       | Tailwind CSS v4 + shadcn/ui components                      |
| Database      | Neon Postgres                                               |
| ORM / driver  | Drizzle ORM over `pg` (node-postgres)                       |
| Client data   | SWR (live search)                                           |
| Fonts         | Oswald (display), Geist (UI), Geist Mono (numbers)          |
| Data source   | Deadlock API (`api.deadlock-api.com`)                       |

## Getting started

### Prerequisites

- Node.js 20 or newer
- pnpm
- A Postgres database (a free Neon database works)

### 1. Install

```bash
pnpm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill it in:

```bash
cp .env.example .env.local
```

| Variable       | Required | Description                         |
| -------------- | -------- | ----------------------------------- |
| `DATABASE_URL` | Yes      | Postgres connection string.         |

The Deadlock API is public and doesn't need a key.

### 3. Create the database table

Run [`scripts/001_create_scouted_players.sql`](scripts/001_create_scouted_players.sql) against your database, for example:

```bash
psql "$DATABASE_URL" -f scripts/001_create_scouted_players.sql
```

### 4. Run

```bash
pnpm dev
```

Open http://localhost:3000.

### Deploy

The app deploys to Vercel as is. Set `DATABASE_URL` in the project's environment variables. If you add the Neon integration on Vercel, it's set for you.

## Project structure

```
app/
  layout.tsx                Root layout: fonts, metadata, header
  page.tsx                  Home: search + saved board
  globals.css               Tailwind v4 theme tokens (dark palette)
  player/[id]/page.tsx      Player profile / scouting report
  compare/page.tsx          Side-by-side comparison
  api/search/route.ts       GET /api/search?q=... (used by live search)
  actions/players.ts        Server Actions: save, remove, update notes

components/
  site-header.tsx           Top navigation
  player-search.tsx         Live search box with results (client, SWR)
  save-button.tsx           Save / remove toggle (client, Server Action)
  roster-card.tsx           Saved-player card on the home board
  form-strip.tsx            Row of W/L squares for recent matches
  rank-badge.tsx            Rank image + name + subrank
  rank-sparkline.tsx        Small SVG line chart of rank score history
  stat-tile.tsx             Label + value tile
  notes-editor.tsx          Scouting notes textarea (client, Server Action)
  compare-picker.tsx        Two dropdowns that set ?a= and ?b= (client)
  ui/                       shadcn/ui primitives

lib/
  deadlock.ts               Deadlock API client + all stat calculations
  roster.ts                 Database reads for saved players
  format.ts                 Number formatting helpers (pct, fixed, int)
  db/index.ts               Shared pg Pool + Drizzle instance
  db/schema.ts              Drizzle table definition
  utils.ts                  cn() class-name helper

scripts/
  001_create_scouted_players.sql   Database setup
```

## How it works

### Request flow

```
Browser
  │
  ├── types in search ──► SWR ──► GET /api/search?q= ──► lib/deadlock.searchPlayers()
  │                                                         └─► Deadlock API
  │
  ├── clicks "Save" ────► Server Action savePlayer() ──► Steam profile lookup
  │                                                   └─► INSERT ... ON CONFLICT (Postgres)
  │                                                   └─► revalidatePath('/')
  │
  └── opens /player/:id or /compare?a=&b=
          └─► Server Component ──► getPlayerReport(id)   (parallel API calls)
                               └─► getRoster() / getScouted()   (Postgres)
```

Every Deadlock API call runs on the server, in `lib/deadlock.ts`, which is marked `server-only`. The browser only talks to this app's own `/api/search` route and its Server Actions.

### Player lookup and ID parsing

`parseAccountId(input)` in `lib/deadlock.ts` turns whatever you type into a Deadlock account ID (a 32-bit Steam account ID):

1. If the input contains a profile URL (`statlocker.gg/profile/<id>`, `tracklock.gg/player/<id>`, or a Steam `/profiles/<id>` URL), it takes the number from the URL.
2. Otherwise it accepts the input if it's only digits.
3. If the number is a **SteamID64** (larger than `76561197960265728`), it subtracts that offset to get the 32-bit account ID.
4. It returns `null` for anything that isn't a valid 32-bit ID.

`searchPlayers(query)` tries the parsed ID first (`/players/steam?account_ids=`). If that finds nothing, it does a name search (`/players/steam-search?search_query=`, up to 10 results).

### Building a player report

`getPlayerReport(accountId)` makes five requests in parallel and merges the results into one `PlayerReport` object:

| Request                                         | Used for                          |
| ----------------------------------------------- | --------------------------------- |
| `/players/steam?account_ids={id}`               | Name, avatar, country             |
| `/players/{id}/match-history?only_stored_history=true` | Recent form + match log    |
| `/players/{id}/hero-stats`                      | Lifetime stats + top heroes       |
| `/players/{id}/mmr-history`                     | Current rank + rank trend         |
| `/assets/heroes?only_active=true`               | Hero names and icons              |

If the Steam profile isn't found, the function returns `null` and the page shows a 404. Any other request that fails is treated as empty data, so the page still loads with zeros instead of crashing.

### Stat definitions

**Recent form** uses the last `RECENT_WINDOW = 50` matches that have a duration above zero, newest first.

| Stat              | Formula                                                        |
| ----------------- | -------------------------------------------------------------- |
| Win               | `match_result === player_team`                                 |
| Win rate          | wins ÷ matches                                                 |
| KDA ratio         | (total kills + total assists) ÷ max(total deaths, 1)           |
| Kills/Deaths/Assists per game | simple average per match                           |
| Souls / min       | total net worth ÷ total minutes played                         |
| Last hits / min   | total last hits ÷ total minutes played                         |
| Denies / game     | average denies per match                                       |
| Avg match length  | average match duration in minutes                              |

**Lifetime** stats add up the per-hero rows from `hero-stats`:

| Stat            | Formula                                                               |
| --------------- | --------------------------------------------------------------------- |
| Matches         | sum of `matches_played`                                               |
| Win rate        | sum of `wins` ÷ matches                                               |
| KDA ratio       | (Σ kills + Σ assists) ÷ max(Σ deaths, 1)                              |
| Damage / min    | average of `damage_per_min`, weighted by `time_played` on each hero   |
| Souls / min     | average of `networth_per_min`, weighted by `time_played`              |
| Accuracy        | average of `accuracy`, weighted by `time_played`                      |
| Hours played    | Σ `time_played` ÷ 3600                                                |
| Heroes played   | number of heroes with at least one match                              |

**Top heroes** are the 5 heroes with the most `matches_played`, each with its own win rate, KDA and damage per minute.

### Ranks

The MMR history gives a `rank` value where the **tens digit is the tier** and the **ones digit is the subrank** (1–6). For example, `103` means Ascendant 3.

| Tier | Name      | Tier | Name      |
| ---- | --------- | ---- | --------- |
| 0    | Obscurus  | 6    | Ritualist |
| 1    | Initiate  | 7    | Emissary  |
| 2    | Seeker    | 8    | Oracle    |
| 3    | Acolyte   | 9    | Phantom   |
| 4    | Sentinel  | 10   | Ascendant |
| 5    | Mystic    | 11   | Eternus   |

The badge image comes from `/assets/ranks/{tier}/{subrank}/image?format=webp`. The rank chart plots `player_score` for the last 40 MMR entries.

### Saving players (database)

The only table is `scouted_players`:

| Column         | Type          | Notes                                    |
| -------------- | ------------- | ---------------------------------------- |
| `account_id`   | `BIGINT` PK   | Deadlock / Steam 32-bit account ID       |
| `persona_name` | `TEXT`        | Steam name when saved (max 64 chars)     |
| `avatar_url`   | `TEXT`        | Steam avatar                             |
| `country_code` | `TEXT`        | Steam country, if public                 |
| `notes`        | `TEXT`        | Scouting notes (max 2000 chars)          |
| `created_at`   | `TIMESTAMPTZ` | When the player was first saved          |
| `updated_at`   | `TIMESTAMPTZ` | Last save or notes edit                  |

Only basic identity and notes are saved. **Stats are never stored.** They're fetched fresh (with caching) every time a page loads, so the board always shows up-to-date numbers.

The Server Actions in `app/actions/players.ts`:

- `savePlayer(accountId)`: checks the ID, confirms the player exists on Steam, then inserts the row. If the player is already saved, it updates their name and avatar instead. Then it refreshes the pages.
- `removePlayer(accountId)`: deletes the row.
- `updateNotes(accountId, notes)`: saves notes, cut off at 2000 characters.

`lib/db/index.ts` creates one shared `pg` Pool and reuses it across hot reloads during development. It forces `sslmode=verify-full` so the connection is fully verified and the warning from `pg` about upcoming SSL-mode changes goes away.

### Comparison logic

`/compare?a={id}&b={id}` builds both reports in parallel. Stats are defined in one `GROUPS` array (`app/compare/page.tsx`), where each entry is:

```ts
{ label: string, get: (r: PlayerReport) => number, format: (n) => string, lowerIsBetter?: boolean }
```

For each row, the higher value is highlighted. For rows marked `lowerIsBetter` (deaths per game) the lower value is highlighted. A thin bar under each row shows how the two values compare. To add a stat, add one entry to `GROUPS`.

The two dropdowns list saved players, plus anyone already passed in the URL, so you can also compare players you haven't saved. Changing a dropdown updates the URL, so comparison links can be shared.

### Caching

Requests to the Deadlock API use Next.js `fetch` caching (`next: { revalidate }`):

| Data                  | Revalidate |
| --------------------- | ---------- |
| Hero list             | 24 hours   |
| Steam profiles        | 1 hour     |
| Match / hero / MMR history | 10 minutes |
| Name search           | 5 minutes  |

Pages that read the database use `dynamic = 'force-dynamic'`, so saved players always show up right away.

## Pages and routes

| Route                 | Type             | Description                                 |
| --------------------- | ---------------- | ------------------------------------------- |
| `/`                   | Server Component | Search + saved board                        |
| `/player/[id]`        | Server Component | Full scouting report (`id` = account ID)    |
| `/compare?a=&b=`      | Server Component | Side-by-side comparison                     |
| `GET /api/search?q=`  | Route Handler    | Returns `{ accountId, name, avatar, country }[]`; the query must be 2–200 characters |

## Components

| Component          | Client? | Purpose                                                    |
| ------------------ | ------- | ---------------------------------------------------------- |
| `PlayerSearch`     | Yes     | Search box that waits until you stop typing, then queries `/api/search` with SWR |
| `SaveButton`       | Yes     | Calls `savePlayer` / `removePlayer` with `useTransition`   |
| `NotesEditor`      | Yes     | Edits notes and saves them with `updateNotes`              |
| `ComparePicker`    | Yes     | Updates `?a=` / `?b=` in the URL                           |
| `RosterCard`       | No      | Saved-player card (rank, key stats, form strip)            |
| `RankBadge`        | No      | Rank image, name and subrank                               |
| `RankSparkline`    | No      | Small SVG line chart of rank score                         |
| `FormStrip`        | No      | Recent W/L squares                                         |
| `StatTile`         | No      | Label + value tile                                         |

## External APIs used

All requests go to `https://api.deadlock-api.com/v1`. No authentication is needed.

- `GET /players/steam-search?search_query=&limit=`
- `GET /players/steam?account_ids=`
- `GET /players/{id}/match-history?only_stored_history=true`
- `GET /players/{id}/hero-stats`
- `GET /players/{id}/mmr-history`
- `GET /assets/heroes?only_active=true`
- `GET /assets/ranks/{tier}/{subrank}/image?format=webp`

Profile links use `https://statlocker.gg/profile/{accountId}`.

API docs: https://api.deadlock-api.com/docs

## Design system

The app has one dark theme, set with CSS variables in `app/globals.css`:

- **Primary:** a warm amber/brass color, matching Deadlock's art-deco look
- **Win / Loss:** green and red (`--win`, `--loss`), available as `text-win`, `bg-loss` and so on
- **Rival:** cyan (`--rival`), used for the second player on the compare page
- **Fonts:** Oswald for headings (`font-display`), Geist for UI text, Geist Mono for numbers

## Security notes

- Every database query uses Drizzle's parameterized queries, so user input is never pasted directly into SQL.
- Server Actions check that account IDs are positive integers below 2³², cut text fields down to a maximum length, and confirm the player exists on Steam before saving.
- The Deadlock API is only called from the server (`server-only`).
- **There's no sign-in.** The board is shared by everyone who can open the app, so anyone with the URL can add or remove players and edit notes. If you deploy it publicly, add authentication (for example Better Auth) and a `user_id` column on `scouted_players`, and filter every query by that user.

## Known limitations and ideas

- Statlocker doesn't have a public API, so the stats come from the Deadlock API instead. Numbers can differ slightly from what Statlocker shows.
- Match history only includes matches the Deadlock API has stored. Players who barely play, or who hide their profiles, may show very little data.
- Ideas for later:
  - per-user boards (sign-in)
  - tags or tiers for saved players
  - saving stat snapshots over time to track progress
  - comparing three or more players
  - filtering stats by hero
