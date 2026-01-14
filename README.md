# bad-vibes

Vibe coded DJ multi tool for traktor collection management, playlist scraping and soulseek bulk downloads.
I have barely looked at the code and wouldn't trust it if I was you.

## Features
- **Traktor Collection** — Manage your playlists and folders. Upload your `collection.nml`.
Traktor Collection is quite shit so this add a bunch of features i'd like to see
- **Playlists** — Create standalone tracklists via text parsing or Spotify/YouTube links.
Scrape playlists from spotify plex, youtube and your discogs collection
- **Soulseek Integration** — Bulk download tracks from Soulseek.
Download tracks from the playlists created. BYO Soulseek server.
It does some AI shit to improve the soulseek search results.

## Prerequisites

Before running this project install the following:

- **Node.js** (v20.19+, v22.12+, or v24.0+) — [Install via Homebrew](https://formulae.brew.sh/formula/node): `brew install node`
- **npm** (comes with Node.js)

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd bad-vibes
```

### 2. Install dependencies

```bash
npm install
```

This will also automatically generate the Prisma client via the `postinstall` script.

### 3. Set up environment variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` and configure the following:

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | NextAuth secret (generate with `npx auth secret`) |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | Discord OAuth credentials | 
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth credentials |
| `GOOGLE_API_KEY` | Google Gemini API key |
| `DISCOGS_CLIENT_ID` / `DISCOGS_CLIENT_SECRET` | Discogs API credentials |
| `SLSKD_URL` / `SLSKD_API_KEY` | Soulseek daemon URL and API key |
| `DATABASE_URL` | Database connection string (default: `file:./db.sqlite`) |

### 4. Set up the database

Push the Prisma schema to your database:

```bash
npx prisma db push
```

Or run migrations (if available):

```bash
npm run db:migrate
```

### 5. Run the development server

```bash
npm run dev
```

The app will be available at **http://localhost:3000**

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run preview` | Build and start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format:check` | Check code formatting with Prettier |
| `npm run format:write` | Format code with Prettier |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run check` | Run lint and typecheck |
| `npm run test` | Run tests with Vitest |
| `npm run db:generate` | Run Prisma migrations (dev) |
| `npm run db:migrate` | Deploy Prisma migrations |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:studio` | Open Prisma Studio |

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Database**: [Prisma](https://www.prisma.io/) with SQLite/PostgreSQL
- **API**: [tRPC](https://trpc.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **State Management**: [TanStack Query](https://tanstack.com/query)

## License

See [LICENSE](LICENSE) for details.
