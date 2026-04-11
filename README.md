# CycleLink - Full-Stack Cycling Rewards & Community Platform

CycleLink is a full-stack web application for cyclists. Riders track rides and earn tokens, redeem them at partner shops, discover and rate routes, report road hazards, chat in real time, and get help from an AI cycling assistant. Partners manage rewards and payouts; admins moderate content and approve payments.

This repository contains both the **Express.js REST API backend** and the **React frontend**, developed as a group project for the *Full Stack Application Development* assignment.

---

## Tech Stack

| Layer     | Technologies |
|-----------|-------------|
| **Backend**  | Node.js, Express.js, MongoDB (Mongoose), JWT, Socket.IO, Joi, Swagger (OpenAPI 3.0.3), Jest, Supertest, Artillery |
| **Frontend** | React 18, Vite, React Router 7, Tailwind CSS, Context API, TanStack React Query, Axios, Socket.IO Client, Leaflet, Google Maps API, Formik + Yup, Chart.js, Framer Motion |
| **Third-party APIs** | Google OAuth 2.0, Google Maps, Google Gemini (AI chatbot), Cloudinary (image uploads), PayHere (payments) |
| **DevOps**   | Render (backend), Vercel (frontend), GitHub Actions |

---

## Repository Structure

```
Cycling/
├── backend/                 # Express REST API (Controller → Service → Model)
│   ├── src/
│   │   ├── config/          # DB, Swagger
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express routers + Swagger JSDoc
│   │   ├── middleware/      # Auth, role, validate, error, rate limiter
│   │   ├── validations/     # Joi schemas
│   │   ├── socket/          # Socket.IO chat events
│   │   └── utils/           # Tokens, formatters, PayHere helpers
│   ├── tests/               # unit, integration, performance
│   └── server.js
├── frontend/                # React + Vite SPA
│   └── src/
│       ├── pages/           # Route-level components
│       ├── components/      # Shared + feature components
│       ├── context/         # Auth, Theme, Sidebar, ChatUnread
│       ├── services/        # Axios API clients
│       ├── features/        # Feature modules (auth, partner)
│       ├── hooks/           # useAuth, useSidebar
│       ├── utils/, config/, constants/
│       ├── App.jsx
│       └── main.jsx
├── render.yaml              # Render deployment config (backend)
├── .github/workflows/       # Vercel deploy workflow (frontend)
├── Assignment.txt
└── README.md
```

---

## Functional Components

CycleLink is organized into the following domain components (all with full CRUD and role-based access where applicable):

1. **Authentication & Users** — email/password, Google OAuth, JWT sessions, profile management.
2. **Cyclist & Rides** — ride tracking, statistics, leaderboard, token earnings.
3. **Partner & Rewards** — partner shop profiles, reward offers, bank details, payout requests.
4. **Hazards & Routes** — community-driven hazard reporting, route creation/rating, admin approval.
5. **Admin Moderation** — users, routes, hazards, payouts, payments dashboards.
6. **Payments** — PayHere gateway integration for partner payouts.
7. **Real-time Chat** — Socket.IO one-on-one and group messaging.
8. **AI Assistant** — Google Gemini-powered cycling chatbot.

---

## Backend

### Architecture (Clean Code)

| Layer          | Location         | Responsibility |
|----------------|------------------|----------------|
| **Routes**     | `routes/`        | HTTP routing, auth middleware, Swagger JSDoc |
| **Controllers**| `controllers/`   | Parse request, validate input, call service, format response |
| **Services**   | `services/`      | Business logic, orchestration, DB access |
| **Models**     | `models/`        | Mongoose schemas, DB validation |
| **Validations**| `validations/`   | Joi schemas for input validation |
| **Middleware** | `middleware/`    | Auth (JWT), role checks, error handler, rate limiter |
| **Config**     | `config/`        | Database connection, Swagger spec |
| **Socket**     | `socket/`        | Socket.IO chat events |
| **Utils**      | `utils/`         | Shared utilities (tokens, formatters, PayHere helpers) |

### API Endpoints

80+ REST endpoints across 12 domains. Full interactive documentation at **Swagger UI → `/api-docs`**.

| Domain    | Base Path        | Endpoints | Description |
|-----------|------------------|-----------|-------------|
| Auth      | `/api/auth`      | 7  | Register, login, Google OAuth, profile |
| Cyclist   | `/api/cyclist`   | 11 | Rides, stats, leaderboard, partner shops |
| Partner   | `/api/partner`   | 13 | Profile, bank details, payouts, earnings |
| Rewards   | `/api/rewards`   | 4  | CRUD for partner reward offers |
| Tokens    | `/api/tokens`    | 1  | Token redemption |
| Redeem    | `/api/redeem`    | 1  | Confirm reward redemption |
| Hazards   | `/api/hazards`   | 10 | Report, verify, moderate hazards |
| Routes    | `/api/routes`    | 8  | Create, rate, manage cycling routes |
| Admin     | `/api/admin`     | 26 | Users, routes, hazards, payouts, payments |
| Payments  | `/api/payments`  | 1  | PayHere payment processing |
| Chat      | `/api/chat`      | 7  | REST + Socket.IO real-time messaging |
| AI        | `/api/ai`        | 2  | Gemini-powered cycling chatbot |

### Authentication

Protected routes require an `Authorization: Bearer <JWT>` header. JWTs are issued at login/register and verified by `middleware/auth.js`. Role-based access (cyclist / partner / admin) is enforced by `middleware/role.js`.

### Example: Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Jane Rider",
  "email": "jane@example.com",
  "password": "Passw0rd!",
  "role": "cyclist"
}
```

Response `201 Created`:

```json
{
  "success": true,
  "data": {
    "user": { "id": "66f...", "name": "Jane Rider", "role": "cyclist" },
    "token": "eyJhbGciOiJIUzI1NiIsInR..."
  }
}
```

### Example: Authenticated GET

```http
GET /api/cyclist/stats
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "totalRides": 42,
    "totalDistanceKm": 318.5,
    "tokensEarned": 1590,
    "rank": 7
  }
}
```

### Mongoose Models

| Model          | File                      | Description |
|----------------|---------------------------|-------------|
| User           | `models/User.js`          | Auth, cyclist stats, partner profile, bank details |
| Ride           | `models/Ride.js`          | Rides with distance, duration, tokens earned |
| Hazard         | `models/Hazard.js`        | Road hazards with verification |
| Route          | `models/Route.js`         | Cycling routes with ratings and approval workflow |
| Reward         | `models/Reward.js`        | Partner reward offers with token cost |
| Redemption     | `models/Redemption.js`    | Token redemption transactions |
| Payment        | `models/Payment.js`       | PayHere payment records |
| Payout         | `models/Payout.js`        | Monthly partner payout calculations |
| PayoutRequest  | `models/PayoutRequest.js` | Partner-initiated payout requests |
| Chat           | `models/Chat.js`          | Chat rooms (one-on-one / group) |
| Message        | `models/Message.js`       | Chat messages with edit/delete |

### API Documentation

Interactive Swagger UI is auto-generated from JSDoc annotations in route files via `swagger-jsdoc`, and served at **`/api-docs`** when the backend is running. Config lives in `backend/src/config/swagger.js`.

---

## Frontend

### Overview

The frontend is a React 18 single-page application built with **Vite**, styled with **Tailwind CSS**, and routed with **React Router 7**. State is managed via the **Context API** (Auth, Theme, Sidebar, ChatUnread) and **TanStack React Query** handles server-state caching. API calls flow through a central **Axios client with interceptors** that attach the JWT and handle 401 refresh/logout.

### Key Libraries

- **Routing** — `react-router-dom`
- **Data fetching** — `@tanstack/react-query`, `axios`
- **Real-time** — `socket.io-client`
- **Maps** — `@react-google-maps/api`, `leaflet` + `react-leaflet`
- **Auth** — `@react-oauth/google`
- **Forms & validation** — `formik`, `yup`
- **Charts** — `chart.js`, `react-chartjs-2`
- **UI** — `tailwindcss`, `framer-motion`, `lucide-react`, `react-hot-toast`
- **QR / scanning** — `qrcode.react`, `html5-qrcode`, `jsqr`

### Folder Layout (`frontend/src`)

```
src/
├── pages/          # Landing, Login, Cyclist/Partner/Admin dashboards,
│                   # Map, Leaderboard, Rewards, TripHistory, Chat, ...
├── components/     # Navbar, Sidebar, LiveMap, ChatBot, WeatherWidget,
│                   # PaymentHistoryTable, admin/*, ...
├── context/        # AuthContext, ThemeContext, SidebarContext, ChatUnreadContext
├── services/       # axiosClient, interceptors, authStorage,
│                   # auth/admin/cyclist/partner/hazard/route/chat/ai services
├── features/       # auth/, partner/
├── hooks/          # useAuth, useSidebar
├── utils/, config/, constants/
├── App.jsx
└── main.jsx        # React Query, Google OAuth, Theme providers
```

### State & Session Management

- **AuthContext** stores the current user and JWT; persisted via `authStorage.js` (localStorage).
- **Axios interceptors** inject `Authorization: Bearer <token>` on every request and log the user out on 401.
- **Protected routes** redirect unauthenticated users to `/login` and enforce role-based views (cyclist / partner / admin).
- **TanStack React Query** provides caching, refetching, and optimistic updates for server state.

---

## Setup & Run

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local instance or MongoDB Atlas connection string)

### 1. Clone

```bash
git clone <repo-url>
cd Cycling
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in the values below
npm run dev            # http://localhost:5000  (Swagger at /api-docs)
```

`backend/.env`:

```bash
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/cyclelink

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id_here

# PayHere Payment Gateway
PAYHERE_MERCHANT_ID=your_merchant_id
PAYHERE_SECRET=your_merchant_secret
PAYHERE_BASE_URL=https://sandbox.payhere.lk/pay/checkout
PAYHERE_SANDBOX=true
BACKEND_URL=http://localhost:5000

# Cloudinary (image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google Gemini AI (chatbot)
GEMINI_API_KEY=your_gemini_api_key

# CORS
FRONTEND_ORIGIN=http://localhost:5173
```

### 3. Frontend

```bash
cd ../frontend
npm install
cp .env.example .env   # then fill in the values below
npm run dev            # http://localhost:5173
```

`frontend/.env`:

```bash
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Build for Production

```bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm run build && npm run preview
```

---

## Third-Party Integrations

| Service            | Purpose                          | Where |
|--------------------|----------------------------------|-------|
| Google OAuth 2.0   | Social login                     | `authController`, frontend `@react-oauth/google` |
| Google Maps        | Map rendering, route drawing     | `LiveMap`, `MapPage` |
| Google Gemini      | AI cycling chatbot               | `aiController`, `aiService` |
| Cloudinary         | Image uploads (avatars, routes)  | backend upload utilities |
| PayHere            | Payment gateway for payouts      | `paymentController`, `payhereHelper` |
| Socket.IO          | Real-time chat                   | `socket/` + `socket.io-client` |

### PayHere Integration Detail

1. Admin clicks **Approve & Pay** on a pending payout request.
2. Frontend calls `POST /api/admin/payout-requests/:id/payhere-init`.
3. PayHere checkout opens in a popup.
4. On success, PayHere posts to `POST /api/payments/payhere/notify`.
5. Backend verifies the MD5 hash `MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret))` and, for `status_code=2`, marks the payout **Paid**.

Sandbox card for testing: `5555 5555 5555 4444` (any future expiry, any CVV).

---

## Testing Report

Backend: **307 tests** across unit, integration, and performance suites.

### Unit Tests — 18 files, 228 tests

Services, validations, and utilities — `authService`, `cyclistService`, `partnerService`, `adminService`, `hazardService`, `rewardService`, `routeService`, `transactionService`, plus Joi validation schemas and helpers (`responseFormatter`, `generateToken`, `validateMiddleware`).

### Integration Tests — 8 files, 79 tests

HTTP endpoint testing via **Supertest** against an in-memory / test MongoDB instance — `auth`, `cyclist`, `partner`, `admin`, `hazard`, `route`, `reward`, `transaction` endpoint suites.

### Performance Tests

**Artillery.io** load/stress script at `backend/tests/performance/artillery-script.yml`.

### Running Tests

```bash
cd backend
npm test                 # all tests
npm run test:unit        # unit tests only
npm run test:integration # integration tests only
npm run test:coverage    # coverage report (./coverage)
npm run test:perf        # Artillery performance run
```

### Test Environment

- Tests use a separate Mongo database (configured via `MONGO_URI_TEST` or `NODE_ENV=test`).
- Integration tests spin up the Express app via Supertest — no need to run the server separately.
- Coverage output: `backend/coverage/lcov-report/index.html`.

> **Frontend:** manual QA via the Vite dev server. No automated frontend test suite yet.

---

## Deployment Report

### Backend → Render

Defined in `render.yaml`.

- **Service name:** `CycleLink-api`
- **Runtime:** Node
- **Build command:** `cd backend && npm install`
- **Start command:** `cd backend && npm start`
- **Environment variables** (set in the Render dashboard, never committed):
  `MONGO_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `PAYHERE_MERCHANT_ID`, `PAYHERE_SECRET`, `PAYHERE_BASE_URL`, `BACKEND_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `GEMINI_API_KEY`, `FRONTEND_ORIGIN`

**Setup steps:**
1. Push the repo to GitHub.
2. In Render, create a new Web Service from the repo; Render auto-detects `render.yaml`.
3. Add the environment variables above in the Render dashboard.
4. Deploy — Swagger UI will be available at `https://cyclelink.onrender.com/api/api-docs`.

### Frontend → Vercel

Defined in `.github/workflows/vercel-deploy.yml` — every push to `main` triggers a Vercel deploy hook.

**Setup steps:**
1. Import the `frontend/` directory into Vercel as a Vite project.
2. Set environment variables: `VITE_API_URL` (your Render backend URL + `/api`), `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_MAPS_API_KEY`.
3. Copy the Vercel deploy hook URL into the GitHub Actions secret used by the workflow.
4. Push to `main` — GitHub Actions triggers the hook and Vercel rebuilds.

### Live URLs

| Environment | URL |
|-------------|-----|
| Frontend (Vercel)    | https://cycle-link-eta.vercel.app/|
| Backend (Render)     | https://cyclelink-1.onrender.com |
| Swagger UI           | `https://cyclelink-1.onrender.com/api/api-docs` |

### Screenshots

Deployment evidence and app screenshots live in `docs/screenshots/` — add images there and reference them here before submission.

---

## Contributors

Group project — 4 members. 
IT23334892 S.W.N Amarasekara
IT23386136 Vinoshan A.G.S
IT23325050 Weerasinghe G.A.A.I
IT23140998 Hansika R.A.K.

---

## License

For academic use only (Full Stack Application Development assignment). No open-source license is attached.
