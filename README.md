# 🌌 MatchNova - AI-Powered Premium Dating Platform

MatchNova is a production-ready, enterprise-grade, AI-driven dating application. The platform features a high-performance **NestJS API Gateway**, a responsive **Next.js Web Client & Administration Panel**, and a cross-platform **Flutter Mobile Client Skeleton** (iOS & Android).

---

## 🏗️ System Architecture & Data Flow

MatchNova utilizes a modular backend topology backed by PostgreSQL for transactional storage, Redis + BullMQ for background queuing/caching, and Qdrant for high-dimensional vector search.

```mermaid
graph TD
    A[Clients: Next.js / Flutter] -->|HTTPS REST| B[NestJS API Gateway]
    A -->|WebSockets| C[Socket.IO Gateway]
    B -->|Prisma ORM| D[(PostgreSQL)]
    B -->|Vector Search| E[(Qdrant Vector DB)]
    C -->|Redis Adapter| F[(Redis Cluster)]
    B -->|Async Tasks| G[BullMQ Queue Manager]
    G -->|Worker threads| H[Notification Service]
```

### 📂 Repository Tree

```
MatchNova/
├── backend/                  # NestJS API Gateway & Microservices
│   ├── src/
│   │   ├── auth/            # JWT, Social OAuth, & Phone OTP Services
│   │   ├── profile/         # Coordinate Blurring & Haversine Distance Filters
│   │   ├── swipe/           # Swipe limits, cosine recommendations & matchmaking
│   │   ├── chat/            # Live message persistence & socket gateways
│   │   ├── payment/         # Stripe, Paystack & Flutterwave multi-gateways
│   │   └── report/          # Trust, Safety, & Moderation incident logs
│   └── test/                # E2E Integration Suite (jest)
├── frontend/                 # Next.js 16 Web Client & Admin Panel
│   ├── src/app/
│   │   ├── auth/            # Onboarding & OTP code input modals
│   │   ├── deck/            # Swiping candidate recommendation deck UI
│   │   ├── chat/            # Real-time WebSocket chat & matches threads sidebar
│   │   └── admin/           # Moderator Incident queue & user suspension controls
├── mobile/                   # Flutter Mobile App (iOS & Android)
│   └── lib/
│       ├── core/            # Theme designs, GoRouter configs & Dio network API client
│       └── features/        # Riverpod State Providers & Screens
├── database/                 # PostgreSQL relational schema (Prisma)
├── docs/                     # Product requirement docs (PRD) & contracts
└── shared/                   # Assets (branded logo and icons)
```

---

## 🌟 Core Features Detailed

### 1. AI-Powered Compatibility & Cosine Matching
MatchNova shifts away from superficial swiping by generating high-dimensional compatibility vectors.
*   **Vector Construction**: Hashing user interest tags into a 1536-dimensional unit vector.
*   **Ranking**: Running vector cosine similarity queries in **Qdrant** to rank recommendation decks.
*   **Distance calculation**: Bounding box queries run in PostgreSQL, calculating distance using exact Haversine mathematical formulas.

### 2. Privacy-Preserving Geolocation
*   **Fuzzy Coordinates**: Coordinates are masked by rounding to two decimal places on client queries. Precise coordinates remain encrypted at rest.

### 3. Real-Time WebSockets Communications
*   **Sub-100ms Messaging**: Socket.IO gateway joined with Redis PubSub adapters.
*   **Interactions**: Includes real-time typing indicators and message read receipts.
*   **Queue workers**: Publishes push notifications asynchronously to BullMQ background workers to prevent I/O blocking.

### 4. Subscription & Payment Gateways
*   Enforces daily swiping caps on the free tier (100 likes, 1 superlike per 24 hours).
*   **Elevations**: Automatic subscription upgrade checking for Stripe, Paystack, and Flutterwave checkout webhook events.

### 5. Administration & Moderation tools
*   **Roles Guard**: Restricts sensitive moderator routes via custom NestJS `@Roles(...)` metadata.
*   **UserStatusGuard**: Automatically rejects incoming requests from accounts flagged as `SUSPENDED`.

---

## 🔑 Database Schema Models

The PostgreSQL schema contains the following primary relation tables:

| Model | Description | Key Relationships |
| :--- | :--- | :--- |
| `User` | Stores credentials, status, and role. | `Profile`, `Subscription`, `Swipe`, `Message`, `Report` |
| `Profile` | Detailed profile properties & masked geolocations. | `User` (1-to-1 Cascade) |
| `Swipe` | Records `LIKE`, `PASS`, and `SUPERLIKE` actions. | `User` (sender/receiver) |
| `Match` | Formed on mutual reciprocal Likes. | `Message` (1-to-many) |
| `Message` | Log of dialog messages history. | `Match`, `User` (sender) |
| `Subscription` | Logs payment gateway records and tiers. | `User` |
| `Report` | Logs abuse incident logs filed by users. | `User` (reporter/reported) |

---

## 📡 API Interface Map

### Authentication Module
*   `POST /api/v1/auth/register` - Create user credentials.
*   `POST /api/v1/auth/login` - Exchanges credentials for access & refresh tokens.
*   `POST /api/v1/auth/otp/send` - Dispatches Twilio Phone OTP verification code.
*   `POST /api/v1/auth/otp/verify` - Verifies Phone OTP code to activate register status.

### Profiles & Recommendations
*   `POST /api/v1/profile` - Creates user profile properties.
*   `GET /api/v1/swipes/recommendations` - Fetches candidates ranked by compatibility and filtered by radius.
*   `POST /api/v1/swipes` - Post swipe action (`LIKE`, `DISLIKE`, `SUPERLIKE`) on candidate.

### Chat & Messaging
*   `GET /api/v1/swipes/matches` - Retrieves matched users.
*   `GET /api/v1/chat/history/:matchId` - Retrieves messages log history.

### Payments & webhooks
*   `POST /api/v1/payments/checkout` - Returns Stripe session checkout links.
*   `POST /api/v1/payments/webhook/:gateway` - Webhook handlers for Stripe, Paystack, and Flutterwave.

### Administrative Control
*   `GET /api/v1/reports` - Fetch pending abuse tickets (*Admin/Moderator only*).
*   `PATCH /api/v1/reports/:id/resolve` - Mark report status resolved/dismissed.
*   `POST /api/v1/reports/moderate/:reportedId` - Suspend a violating user account.

---

## 🔌 Socket.IO Event Map

All WebSocket endpoints require a valid JWT passed inside the authorization headers at connection handshake.

| Event Type | Event Name | Payload Shape | Description |
| :--- | :--- | :--- | :--- |
| **Emit** | `join_room` | `{ "matchId": "UUID" }` | Subscribe to a specific match chat room. |
| **Emit** | `send_message` | `{ "matchId": "UUID", "content": "Text" }` | Sends a message to a match room. |
| **Emit** | `typing` | `{ "matchId": "UUID", "typing": true }` | Emits active keyboard typing status. |
| **Listen** | `message` | `Message JSON Object` | Fired when a new message is received. |
| **Listen** | `typing` | `{ "matchId": "UUID", "typing": boolean }` | Received when match partner is typing. |

---

## 🛠️ Setup & Installation

### Prerequisite Services
Ensure you have the following services active:
1.  **PostgreSQL** (Port `5432`)
2.  **Redis** (Port `6379`)
3.  **Qdrant** (Port `6333`)

### Environment Variables
Configure `/backend/.env` file in the backend directory:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/matchnova"
JWT_ACCESS_SECRET="super-secret-access-key"
JWT_REFRESH_SECRET="super-secret-refresh-key"
REDIS_HOST="localhost"
REDIS_PORT=6379
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Database Migration
Prepare tables and compile Client:
```bash
cd database
npx prisma migrate dev
```

---

## 💻 Monorepo Workspace CLI Commands

Control all workspace components from the root directory:

| Task | Command | Action |
| :--- | :--- | :--- |
| **Run Backend** | `npm run dev:backend` | Boots NestJS dev gateway with hot reload. |
| **Run Frontend** | `npm run dev:frontend` | Launch Next.js local server at port `3000`. |
| **Build Backend** | `npm run build:backend` | Compiles NestJS to `/dist`. |
| **Build Frontend** | `npm run build:frontend` | Runs Next.js compiler optimizer. |
| **Run Tests** | `npm run test:backend` | Executes NestJS spec unit tests. |
| **Run E2E** | `npm run test:backend:e2e` | Executes NestJS spec E2E tests. |
| **Lint Check** | `npm run lint:backend` | Lints backend directory. |
| **Lint Check** | `npm run lint:frontend` | Lints frontend directory. |
| **Lint Mobile** | `npm run lint:mobile` | Statically analyzes Flutter code. |
| **Launch Mobile** | `cd mobile && flutter run` | Runs mobile client in emulator. |
