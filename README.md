# FleetTrack – Real-Time Logistics & Fleet Tracking Platform

A college summer-training full-stack project for managing vehicles and shipments, viewing simulated live vehicle locations, calculating simple route estimates, and viewing fleet analytics.

## Features
- Dashboard with fleet and delivery KPIs
- Vehicle list and simulated GPS locations on an OpenStreetMap-powered Leaflet map
- Shipment list with status updates
- Simple nearest-stop route ordering demo (not production-grade routing)
- Analytics charts
- PostgreSQL persistence with automatic demo-data seeding
- Demo mode: the frontend can run with sample data even if PostgreSQL is not configured

## Technology
React + Vite, Node.js + Express, PostgreSQL (`pg`), Leaflet / OpenStreetMap, Recharts.

## Requirements
- Node.js 18+
- npm
- PostgreSQL 14+ (optional for demo mode; required for persistent backend data)

## 1. Install and run the backend
Open a terminal in `backend`:

```bash
npm install
cp .env.example .env
```

Edit `.env` and set your PostgreSQL connection details. Create the database first:

```sql
CREATE DATABASE fleettrack;
```

Then run:

```bash
npm run db:init
npm run dev
```

Backend runs at `http://localhost:5000`.

If you don't configure PostgreSQL, the API starts in demo mode and uses in-memory sample data. Data changes will reset when the server restarts.

## 2. Install and run the frontend
Open another terminal in `frontend`:

```bash
npm install
cp .env.example .env
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

## 3. Useful API endpoints
- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/vehicles`
- `GET /api/shipments`
- `PATCH /api/shipments/:id/status`
- `POST /api/routes/optimize`

## Notes for your project report
- Vehicle positions are simulated, not obtained from physical GPS devices.
- Route optimization uses a nearest-neighbor distance heuristic for demonstration.
- OpenStreetMap tiles are used through Leaflet; follow the tile usage policy if deploying publicly.
- This is an educational prototype, not a production dispatch or navigation system.

## GitHub upload
Create a new GitHub repository named `FleetTrack`, then from this project root run:

```bash
git init
git add .
git commit -m "Initial FleetTrack project"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/FleetTrack.git
git push -u origin main
```

Never commit your real `.env` file or database password. `.env` is ignored by Git.
