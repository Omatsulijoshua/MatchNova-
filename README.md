# MatchNova - AI-Powered Premium Dating Platform

MatchNova is a production-ready, AI-driven dating application built with a high-performance NestJS backend gateway, a Next.js web application (moderator & user client), and a Flutter mobile application skeleton.

---

## 🚀 Key Features

*   **Vector Recommendation Engine**: Determines matches using cosine similarity embeddings of user interests inside Qdrant database.
*   **Real-Time messaging**: WebSockets via Socket.IO backed by Redis adapters for horizontal clustering. Includes real-time typing indicators and read receipts.
*   **Multi-Gateway Payment Integration**: Checkout sessions and webhooks for Stripe, Paystack, and Flutterwave.
*   **Trust, Safety, & Moderation**: Admin guards and moderator tables to inspect reports queues, resolve incident logs, and suspend user accounts instantly.
*   **Privacy-First Geolocations**: Blurs coordinates (2 decimal points) for matches searches and calculates distances using high-performance bounding box Haversine algorithms.

---

## 📁 Repository Structure

```
MatchNova/
├── backend/            # NestJS API Gateway & Services
├── frontend/           # Next.js Web App & Admin Client
├── mobile/             # Flutter Mobile Skeleton (iOS & Android)
├── database/           # PostgreSQL Schema & Prisma Migrations
├── docs/               # System Specifications & PRDs
└── shared/             # Assets and shared design resources
```

---

## 🛠️ Tech Stack

*   **Backend**: NestJS, TypeScript, Prisma ORM, PostgreSQL, Redis, BullMQ, Socket.IO, Stripe, Paystack, Flutterwave.
*   **Web Client**: Next.js 16 (App Router), React 19, Tailwind CSS, Lucide Icons, Socket.IO Client.
*   **Mobile Client**: Flutter 3.x, Dart, Riverpod, GoRouter, Dio, Socket.IO Client.

---

## 💻 Development Commands

Manage the entire monorepo using standard scripts configured in the root directory:

### Run Development Servers
*   **Backend NestJS Server**: `npm run dev:backend`
*   **Frontend Next.js Client**: `npm run dev:frontend`

### Build Operations
*   **Build Backend**: `npm run build:backend`
*   **Build Frontend**: `npm run build:frontend`

### Code Testing & Quality
*   **Backend Unit Tests**: `npm run test:backend`
*   **Backend E2E Tests**: `npm run test:backend:e2e`
*   **Lint Backend**: `npm run lint:backend`
*   **Lint Frontend**: `npm run lint:frontend`
*   **Lint Mobile (Flutter)**: `npm run lint:mobile`

---

## ⚙️ Setup & Configuration

1.  **Environment Variables**:
    Configure configurations in `/backend/.env` containing:
    *   `DATABASE_URL` (PostgreSQL Connection String)
    *   `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`
    *   `REDIS_HOST` & `REDIS_PORT`
    *   `QDRANT_URL` & `QDRANT_API_KEY`
    *   `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`

2.  **Database Migration**:
    Initialize tables in your PostgreSQL instance:
    ```bash
    cd database
    npx prisma migrate dev
    ```

3.  **Run Mobile Client**:
    Launch the mobile skeleton in the emulator:
    ```bash
    cd mobile
    flutter run
    ```
