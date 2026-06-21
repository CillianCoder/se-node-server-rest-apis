# Frontend

This is the Next.js 16 frontend for the reservation system.

It connects to the backend API, shows inventory, renders a single product detail page, and provides a reservation dashboard for the fixed demo account `demo_user`.

## Folder Structure

```text
front-end/
|-- app/
|-- components/
|-- lib/
|-- public/
|-- .env.example
|-- package.json
`-- README.md
```

## Setup

1. Make sure the backend is running on `http://localhost:3000`.
2. Create `front-end/.env.local` from `front-end/.env.example`.
3. Keep the API base URL pointed at the backend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

## Run

```bash
npm run dev
```

The frontend runs on `http://localhost:3001`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server on port 3001 |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server on port 3001 |
| `npm run lint` | Run ESLint |

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Reservation dashboard for `demo_user` |
| `/shop` | Inventory listing |
| `/shop/[id]` | Product detail page with quantity validation and reserve action |

## UI Behavior

- Reads live backend inventory and reservation data
- Uses a real reservation lifecycle instead of mock-only state
- Supports confirm, cancel, and expiration sweep actions
- Shows exact timestamps and validation errors clearly

## Best Practices Used

- Environment variables for API configuration
- Server-driven data loading where it helps keep the UI consistent
- Client-side actions for interactive reservation changes
- Clear empty states, error states, and loading states
- Quantity validation before and after the API request

## Notes

- If the backend is down, the frontend will show a service-unavailable state.
- If you change `front-end/.env.local`, restart `npm run dev`.
- The `demo_user` account is used intentionally so the dashboard has a stable default context.
