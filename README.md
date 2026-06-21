# Production-Ready Reservation API

This repository contains a documented Node.js backend plus a Next.js frontend that demonstrates a complete reservation workflow.

## What is included

- A REST API with validation, idempotency, concurrency-safe stock updates, and health checks
- A Next.js 16 frontend with:
  - an inventory shop page
  - a single product detail page
  - a reservation dashboard for `demo_user`
- SQLite-backed sample data so the frontend has real inventory and reservation states to display

## Repository Layout

```text
.
|-- src/            # Backend source code
|-- front-end/      # Next.js frontend
|-- docs/           # Learning and architecture docs
|-- tests/          # Test suite
`-- README.md       # This file
```

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Environment Files

- Root backend config: `.env`
- Frontend config: `front-end/.env.local`
- Example templates:
  - `.env.example`
  - `front-end/.env.example`

The standard local frontend API setting is:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

## How To Run

### 1. Install dependencies

```bash
npm install
cd front-end
npm install
cd ..
```

### 2. Prepare the backend database

```bash
npm run db:migrate
npm run db:seed
```

### 3. Start the backend

```bash
npm run dev
```

Backend defaults:

- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`
- API base path: `http://localhost:3000/api/v1`

### 4. Start the frontend

Open a second terminal:

```bash
cd front-end
npm run dev
```

Frontend defaults:

- App: `http://localhost:3001`

## Main Frontend Routes

- `/` - reservation dashboard for `demo_user`
- `/shop` - inventory listing
- `/shop/[id]` - single product detail and reservation form

## Backend API Summary

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Backend health check |
| GET | `/api/v1/items` | List inventory |
| GET | `/api/v1/items/:id` | View one item |
| GET | `/api/v1/reservations/user/:userId` | List user reservations |
| GET | `/api/v1/reservations/:id` | View one reservation |
| POST | `/api/v1/reserve` | Create a reservation |
| POST | `/api/v1/confirm` | Confirm a reservation |
| POST | `/api/v1/cancel` | Cancel a reservation |
| POST | `/api/v1/expire/run` | Run the expiration sweep |

## Recommended Workflow

1. Start the backend first.
2. Confirm `/health` returns healthy.
3. Start the frontend.
4. Use the shop page to reserve stock for `demo_user`.
5. Use the dashboard to confirm, cancel, or inspect the active and completed reservation history.

## Notes

- Reservations expire automatically and return stock when the backend sweep runs.
- The frontend reads real API responses, so if the backend is not running you will see a backend unavailable state instead of mock-only data.
- If you change `.env` or `.env.local`, restart the affected dev server.

## Troubleshooting

- `Backend not reachable`: start the backend on port `3000`.
- `Content-Type text/plain;charset=UTF-8 is not supported`: the frontend expected JSON but received a non-JSON response, usually because the backend is down or returned an error page.
- Changes not appearing: refresh the browser after the dev server rebuilds, and restart the server if you changed env files.

## Documentation

- `docs/` contains the learning material and architecture notes
- `front-end/README.md` explains the frontend setup in more detail
