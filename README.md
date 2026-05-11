# Tidalfy

A web application for importing Spotify track exports and matching them against
MusicBrainz, as a first step toward syncing your music library to Tidal.

## Features

- Upload a Spotify CSV export (exported via third-party tools)
- Parse and persist imported tracks into a PostgreSQL database
- View imported track batches with artist, album, and duration metadata
- Search MusicBrainz for each track and select the correct recording
- Search Discogs for album metadata enrichment, including EAN and cover art
- Persist selected MusicBrainz or Discogs matches per track, revisitable at any time
- Clear surfacing of import errors and failed rows

## Architecture

| Layer        | Technology                                         |
|--------------|----------------------------------------------------|
| Backend      | Node.js · Fastify · Prisma ORM                    |
| Database     | PostgreSQL (Docker Compose for local dev)          |
| Frontend     | React · Vite · Tailwind CSS · shadcn/ui primitives |
| Validation   | Zod (API schemas + environment config)             |
| HTTP client  | got (MusicBrainz API)                              |

## Getting started

### Prerequisites

- Node.js ≥ 24
- Docker (for PostgreSQL)

### Setup

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Start PostgreSQL
docker compose up -d

# Copy the example env file (already populated for Docker Compose)
# DATABASE_URL and PORT are read from .env
# Edit .env if you need a different port or credentials

# Apply database migrations
npx prisma migrate deploy

# Start the development server (backend with hot reload)
npm run start:dev
```

Open <http://localhost:3000> in your browser.

For frontend development with hot module replacement:

```bash
cd frontend && npm run dev   # proxies /api to http://localhost:3000
```

### Production build

```bash
npm run build     # compiles TypeScript backend + Vite frontend bundle
npm start         # serves API + frontend static files on PORT (default 3000)
```

## Development commands

| Command                  | Purpose                                    |
|--------------------------|--------------------------------------------|
| `npm run start:dev`      | Backend with hot reload                    |
| `npm test`               | Run test suite                             |
| `npm run test:watch`     | Watch mode tests                           |
| `npm run lint`           | ESLint                                     |
| `npm run build`          | Compile backend + build frontend           |
| `npm run build:backend`  | Backend TypeScript compilation only        |
| `npm run build:frontend` | Vite frontend bundle only                  |
| `npx prisma studio`      | Visual database browser                    |

## Environment variables

| Variable       | Required | Default       | Description                          |
|----------------|----------|---------------|--------------------------------------|
| `DATABASE_URL` | Yes      | —             | PostgreSQL connection string         |
| `PORT`         | No       | `3000`        | HTTP server port                     |
| `NODE_ENV`     | No       | `development` | `development`, `production`, `test`  |
| `DISCOGS_USER_TOKEN` | No | — | Discogs API user token for catalog search and metadata enrichment |

## Spotify CSV format

The importer expects a CSV with the following header columns (in any order):

```
Track URI, Track Name, Album Name, Artist Name(s), Release Date,
Duration (ms), Popularity, Explicit, Added By, Added At,
Genres, Record Label, …
```

Rows that fail validation are recorded as import errors and surfaced in the UI.
