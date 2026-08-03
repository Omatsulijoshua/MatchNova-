# Feature Matrix - MatchNova

The MatchNova feature set is organized by module and prioritized using the MoSCoW methodology.

---

## 1. Authentication & Security

| Feature | Description | Priority |
| :--- | :--- | :--- |
| **Phone OTP & Email Login** | Passwordless secure login via SMS (Twilio) or verification emails. | **Must Have** |
| **Social OAuth (Google, Apple)** | Quick login using Google and Apple accounts. | **Must Have** |
| **JWT Access/Refresh Tokens** | Short-lived access tokens with secure HTTP-only cookie refresh. | **Must Have** |
| **Selfie Liveness Verification** | AI-driven facial matching to verify identity against uploaded photos. | **Must Have** |
| **Social OAuth (Facebook)** | Facebook authentication integration. | **Should Have** |
| **Device Fingerprinting** | Detection of multi-account spam setups on a single device. | **Should Have** |
| **Biometric Lock (FaceID/Fingerprint)**| Local application locking on mobile platforms. | **Could Have** |

---

## 2. Profiles & Onboarding

| Feature | Description | Priority |
| :--- | :--- | :--- |
| **Basic Profile Setup** | Name, age, gender, sexual orientation, bio, and 3+ photos. | **Must Have** |
| **Location Tracking (GPS/IP)** | Geolocation capture for matching purposes. | **Must Have** |
| **AI Profile Onboarding** | Conversational flow where an AI interviews the user to generate their bio. | **Should Have** |
| **Dynamic Bio Optimization** | Suggests alternative edits to user bios for better match rates. | **Should Have** |
| **Interests & Values Badges** | Selection of tags representing hobbies, values, and lifestyle traits. | **Must Have** |
| **Instagram/Spotify Integration** | Pulling media and top tracks to enhance profile content. | **Could Have** |

---

## 3. Matching & Geolocation

| Feature | Description | Priority |
| :--- | :--- | :--- |
| **Basic Radius Filter** | Querying matches within a specific distance (e.g., 5-50 miles). | **Must Have** |
| **Swipe Deck Interface** | Standard left/right/up swiping controls with smooth gestures. | **Must Have** |
| **Semantic Vector Matching** | Using Qdrant/Milvus embeddings to match users based on textual affinity. | **Must Have** |
| **Fuzzy Geofencing** | Blurring precise GPS locations to protect privacy. | **Must Have** |
| **Daily Curated recommendations** | Top 10 highly compatible profiles selected daily by AI. | **Should Have** |
| **Super Like Mechanics** | Direct messaging or priority placement in swipe decks. | **Should Have** |
| **Second Chance (Rewind)** | Rewinding the last accidental swipe. | **Should Have** |

---

## 4. Real-time Communication

| Feature | Description | Priority |
| :--- | :--- | :--- |
| **Real-time Text Messaging** | WebSocket communication with persistent database storage. | **Must Have** |
| **NSFW Image Censoring** | Automated blurring of nudity or offensive images in-transit. | **Must Have** |
| **Dynamic Conversation Starters** | AI-generated questions based on profile comparisons. | **Should Have** |
| **WebRTC Audio/Video Calls** | Direct video calls with verification that a match is active. | **Should Have** |
| **Media Attachments (Giphy/Voice)** | Sending voice notes, stickers, and gifs in chat. | **Should Have** |
| **Message Read Receipts** | Toggleable read indicators for messages. | **Could Have** |

---

## 5. Billing & Payments

| Feature | Description | Priority |
| :--- | :--- | :--- |
| **Stripe Integration** | Support for major international credit cards and Apple Pay/Google Pay. | **Must Have** |
| **Subscription tiers** | Nova Premium and Nova Elite plans with distinct feature unlocks. | **Must Have** |
| **Paystack & Flutterwave** | Localized payment integrations for African markets. | **Should Have** |
| **In-app Consumables** | Purchase of standalone boosts, superlikes, and profile rewinds. | **Should Have** |
| **Localized Currency Pricing** | Dynamic price calculation depending on the IP geolocation. | **Should Have** |

---

## 6. Dashboards (Admin/Moderator/Support)

| Feature | Description | Priority |
| :--- | :--- | :--- |
| **Profile Moderation Queue** | Queues profiles flagged by AI or users for manual inspection. | **Must Have** |
| **Support Ticket Desk** | Management dashboard to handle inquiries, refunds, and appeals. | **Must Have** |
| **Analytics Dashboard** | Charts tracking user registrations, premium conversions, and DAU/MAU. | **Should Have** |
| **Shadow-ban Controller** | Silently flags malicious/scammer accounts without alerting them. | **Should Have** |
| **Automated System Alerts** | Slack/Discord integrations for server status changes. | **Could Have** |
