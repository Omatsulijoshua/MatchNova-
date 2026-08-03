# Monetization Strategy - MatchNova

To achieve high profitability and sustainability, MatchNova combines subscription tiers, consumable in-app purchases, and multi-region payment systems.

---

## 1. Subscription Tiers

### 1.1 MatchNova Free (Ad-Supported / Restricted)
* **Target Audience**: General signup pool.
* **Features Included**:
  * 50 Swipes per 24 hours.
  * Basic location-based matching.
  * Instant real-time text chat (only after mutual matching).
  * Access to Profile Verification.
* **Limitations**: No AI icebreakers, no video calls, no rewinds, no profile visibility customization.

### 1.2 Nova Premium
* **Pricing**: \$14.99 / Month | \$39.99 / 3 Months | \$99.99 / Year.
* **Features Unlocked**:
  * **Unlimited Likes**: No daily swiping caps.
  * **5 Super Likes per day**: Direct notification and priority placement.
  * **AI Icebreakers**: 10 automated prompts per day to spark conversations.
  * **Rewind**: Undo accidental left-swipes.
  * **Passport Mode**: Match with users in any location globally.
  * **Hide Ads**: Ad-free experience.

### 1.3 Nova Elite
* **Pricing**: \$34.99 / Month | \$89.99 / 3 Months | \$199.99 / Year.
* **Features Unlocked**:
  * All features of **Nova Premium**.
  * **Incognito Mode**: Hide profile from all users except those you swipe right on.
  * **Read Receipts**: See when messages have been read.
  * **Unlimited AI Icebreakers**: Conversational assists in every chat.
  * **Nova Boost**: 1 Free Boost per week (profile prioritized in the deck for 30 minutes).
  * **Video Verification calling**: Unlocks WebRTC video call feature.
  * **Compatibility Deep-Dive**: Visual report showing detailed compatibility score vectors.

---

## 2. Consumable In-App Purchases (Nova Credits)

Users can purchase **Nova Credits** to buy specific consumables on-demand:

* **Pricing**:
  * 100 Credits: \$4.99
  * 500 Credits: \$19.99 (Best Value)

| Consumable Item | Credit Cost | Description |
| :--- | :--- | :--- |
| **Nova Boost** | 100 Credits | Prioritizes profile card in local stacks for 30 minutes. |
| **Super Like Pack** | 50 Credits | Set of 5 additional Super Likes. |
| **Rewind Bundle** | 30 Credits | Unlocks 5 profile rewinds. |
| **AI Bio Optimizer** | 150 Credits | AI writes a highly optimized bio and prompts based on user photos and values. |

---

## 3. Payment Gateway Integrations

MatchNova implements regional payment adapters to capture diverse markets:

### 3.1 Stripe (North America, Europe, Asia Pacific)
* **APIs Used**: Stripe Elements, Subscription billing APIs, webhooks.
* **Supported Methods**: Credit Cards, Debit Cards, Apple Pay, Google Pay, Link.
* **SCA Compliance**: Native 3D Secure verification flow.

### 3.2 Paystack (Nigeria, Ghana, South Africa, Kenya)
* **APIs Used**: Paystack Standard Popup, Subscriptions API, Webhooks.
* **Supported Methods**: Local Bank Cards, Bank Transfers, USSD, Mobile Money (M-Pesa, MTN).

### 3.3 Flutterwave (Pan-African & Cross-Border Payments)
* **APIs Used**: Flutterwave V3 Payments API.
* **Supported Methods**: Mobile Money across 15+ countries, local cards, ACH transfers.

---

## 4. Dynamic Pricing Policy

* **Purchasing Power Parity (PPP)**: Subscription fees will automatically scale depending on the country location determined by IP/GPS checks.
* **Regulatory Compliance**:
  * Clear subscription renewal notification emails (SendGrid).
  * 1-click subscription cancellation in settings (mandated by App Store / Google Play).
  * Comprehensive refund workflows integrated into the Support Dashboard.
