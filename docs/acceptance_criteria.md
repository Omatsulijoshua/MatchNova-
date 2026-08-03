# Acceptance Criteria - MatchNova

To maintain enterprise-grade quality, every major system module must meet these functional and technical acceptance criteria.

---

## 1. Authentication & Onboarding

### AC-1.1: Registration & Social Sign-In
* **Scenario**: A user registers via Google/Apple OAuth or Phone OTP.
* **Criteria**:
  1. The user must receive a JWT access token (expiry 15m) and refresh token (expiry 7d) upon successful authentication.
  2. Refresh tokens must be stored in secure, `HttpOnly`, `SameSite=Strict` cookies.
  3. User details must be validated (RFC-compliant email, mobile number format check).
  4. First-time users must be redirected to the profile creation wizard; existing users must bypass the wizard.

### AC-1.2: Identity Verification (Selfie Match)
* **Scenario**: A user requests verification by submitting a live selfie.
* **Criteria**:
  1. The AI service must compare the uploaded selfie against existing profile photos.
  2. Face matching confidence score must exceed 90% to auto-verify.
  3. Under 90% confidence, the profile status remains unverified and is flagged for manual moderator approval.
  4. Verification badge must be rendered next to the user's name on both Next.js and Flutter UI layers.

---

## 2. Swiping & Matching

### AC-2.1: Recommendation Deck Query
* **Scenario**: User opens the match deck.
* **Criteria**:
  1. The backend must query Qdrant to retrieve compatible matches based on vector proximity (Cosine Similarity).
  2. Returned profiles must match basic filter settings (age range, gender preference, and distance limit).
  3. The query must exclude profiles that the user has already swiped on, blocked, or reported.
  4. The deck query response time must be under 150ms for P95 metrics.

### AC-2.2: Match Event Trigger
* **Scenario**: User swipes right on a profile that has already swiped right on them.
* **Criteria**:
  1. The backend must instantly create a match record in PostgreSQL.
  2. A real-time WebSocket event (`match_created`) must be emitted to both users.
  3. An asynchronous background job (BullMQ) must trigger a push notification (FCM/APNs) to both users.

---

## 3. Real-Time Chat & Media Security

### AC-3.1: Message Transmission
* **Scenario**: A user sends a text message to a match.
* **Criteria**:
  1. Messages must be sent over WebSockets with a fallback to long-polling.
  2. Under active connection, message delivery latency must be under 100ms.
  3. If the recipient is offline, the message must trigger a background push notification within 3 seconds.
  4. Messages must be sanitized on the backend to prevent Cross-Site Scripting (XSS).

### AC-3.2: Photo Moderation In Chat
* **Scenario**: User attaches a photo in a chat session.
* **Criteria**:
  1. The image file must be uploaded to a secure, private bucket in AWS S3/Cloudflare R2.
  2. Before being rendered to the recipient, the AI moderation pipeline must screen the image.
  3. If NSFW content is detected (confidence > 85%), the image must be blurred, and a warning displayed.
  4. All image compression and scaling (WebP conversion) must complete in under 800ms.

---

## 4. Subscriptions & Payments

### AC-4.1: Subscription Purchase & Renewal
* **Scenario**: User upgrades to Nova Premium using Stripe.
* **Criteria**:
  1. Payments must be processed securely without card details touching MatchNova servers (PCI-DSS compliance).
  2. Stripe webhook events (`customer.subscription.created`, `invoice.payment_succeeded`) must be handled reliably.
  3. Upon payment completion, user's role metadata in PostgreSQL/Redis must update within 2 seconds.
  4. Auto-renewal settings and invoice histories must be visible in user profile settings.
