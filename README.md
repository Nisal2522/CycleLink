# CycleLink Backend API

Node.js/Express backend with **Controller → Service → Model architecture**, Mongoose (MongoDB), JWT auth, and Socket.IO real-time chat.

---

## Architecture Pattern (Clean Code)

| Layer          | Location         | Responsibility |
|----------------|------------------|----------------|
| **Routes**     | `routes/`        | HTTP routing, auth middleware, Swagger JSDoc |
| **Controllers**| `controllers/`   | Parse request, validate input, call service, format response |
| **Services**   | `services/`      | Business logic, orchestration, DB access |
| **Models**     | `models/`        | Mongoose schemas, DB validation |
| **Validations**| `validatons/`    | Joi schemas for input validation |
| **Middleware**  | `middleware/`    | Auth (JWT), role checks, error handler, rate limiter |
| **Config**     | `config/`        | Database connection, Swagger spec |
| **Socket**     | `socket/`        | Socket.IO chat events (real-time messaging) |
| **Interfaces** | `interfaces/`    | Shared type/contract definitions |
| **Utils**      | `utils/`         | Shared utilities (tokens, formatters, PayHere helpers) |

---

## API Endpoints

80+ REST endpoints across 12 domains. Full interactive documentation available via **Swagger UI** at `/api-docs`.

| Domain | Base Path | Endpoints | Description |
|--------|-----------|-----------|-------------|
| Auth | `/api/auth` | 7 | Register, login, Google OAuth, profile |
| Cyclist | `/api/cyclist` | 11 | Rides, stats, leaderboard, partner shops |
| Partner | `/api/partner` | 13 | Profile, bank details, payouts, earnings |
| Rewards | `/api/rewards` | 4 | CRUD for partner reward offers |
| Tokens | `/api/tokens` | 1 | Token redemption |
| Redeem | `/api/redeem` | 1 | Confirm reward redemption |
| Hazards | `/api/hazards` | 10 | Report, verify, moderate hazards |
| Routes | `/api/routes` | 8 | Create, rate, manage cycling routes |
| Admin | `/api/admin` | 26 | Users, routes, hazards, payouts, payments |
| Payments | `/api/payments` | 1 | PayHere payment processing |
| Chat | `/api/chat` | 7 | REST endpoints + Socket.IO real-time messaging |
| AI | `/api/ai` | 2 | Gemini-powered cycling chatbot |

---

## Mongoose Models

| Model | File | Description |
|-------|------|-------------|
| User | `models/User.js` | Auth fields, cyclist stats, partner profile, bank details |
| Ride | `models/Ride.js` | Cycling rides with distance, duration, tokens earned |
| Hazard | `models/Hazard.js` | Road hazards with verification system |
| Route | `models/Route.js` | Cycling routes with ratings and approval workflow |
| Reward | `models/Reward.js` | Partner reward offers with token cost |
| Redemption | `models/Redemption.js` | Token redemption transactions |
| Payment | `models/Payment.js` | PayHere payment records |
| Payout | `models/Payout.js` | Monthly partner payout calculations |
| PayoutRequest | `models/PayoutRequest.js` | Partner-initiated payout requests |
| Chat | `models/Chat.js` | Chat rooms (one-on-one and group) |
| Message | `models/Message.js` | Chat messages with edit/delete support |

---

## API Documentation

Interactive API docs powered by **Swagger UI** with OpenAPI 3.0.3.

- **URL**: `/api-docs` (available when the server is running)
- **Source**: Auto-generated from JSDoc annotations in route files via `swagger-jsdoc`
- **Config**: `src/config/swagger.js`

---

## Testing

**307 tests** across unit, integration, and performance suites.

### Unit Tests — 18 files, 228 tests

Services, validations, and utilities:

- `authService`, `cyclistService`, `partnerService`, `adminService`, `hazardService`, `rewardService`, `routeService`, `transactionService`
- `authValidation`, `hazardValidation`, `rewardValidation`, `routeValidation`, `rideValidation`, `transactionValidation`, `payoutValidation`
- `responseFormatter`, `generateToken`, `validateMiddleware`

### Integration Tests — 8 files, 79 tests

HTTP endpoint testing via supertest:

- `auth-endpoints`, `cyclist-endpoints`, `partner-endpoints`, `admin-endpoints`
- `hazard-endpoints`, `route-endpoints`, `reward-endpoints`, `transaction-endpoints`

### Performance Tests

Artillery.io load and stress testing: `tests/performance/artillery-script.yml`

### npm Scripts

```bash
npm test                # Run all tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
npm run test:coverage   # Tests with coverage report
npm run test:perf       # Artillery performance test
```

---

## PayHere Payment Integration

CycleLink uses **PayHere** (Sri Lankan payment gateway) for processing partner payout requests.

### How It Works

1. **Admin Dashboard**: Admin clicks "Approve & Pay" on a pending payout request
2. **Payment Initialization**: Frontend calls `/api/admin/payout-requests/:id/payhere-init`
3. **PayHere Checkout**: Opens PayHere payment form in popup window
4. **Payment Processing**: User completes payment on PayHere
5. **Webhook Notification**: PayHere sends POST to `/api/payments/payhere/notify`
6. **Status Update**: Backend verifies signature and updates payout request to "Paid"

### Required Environment Variables

```bash
PAYHERE_MERCHANT_ID=your_merchant_id
PAYHERE_SECRET=your_merchant_secret
PAYHERE_BASE_URL=https://sandbox.payhere.lk/pay/checkout  # Use live URL for production
BACKEND_URL=http://localhost:5000  # For webhook notify_url
```

### Testing with PayHere Sandbox

1. Sign up at [PayHere Sandbox](https://sandbox.payhere.lk/)
2. Get your Merchant ID and Secret from the dashboard
3. Use sandbox URL: `https://sandbox.payhere.lk/pay/checkout`
4. Test card: `5555 5555 5555 4444` (any future expiry, any CVV)

### Key Files

- **Controllers**: `adminController.js` (getPayhereInit), `paymentController.js` (payhereNotify)
- **Utils**: `payhereHelper.js` (hash generation, payment params)
- **Services**: `payoutService.js` (approvePayoutRequest)
- **Frontend**: `AdminDashboard.jsx` (handleApproveAndPayPayHere)

### Security

- **MD5 Hash Verification**: All PayHere webhooks are verified using MD5 signature
- **Formula**: `MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret))`
- **Status Codes**: Only `status_code=2` (success) triggers payout approval

---

## Setup & Run

### Install

```bash
npm install
```

### Environment Variables

Create a `.env` file based on `.env.example`:

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
```

### Start

```bash
npm start       # Production
npm run dev     # Development (nodemon)
```
