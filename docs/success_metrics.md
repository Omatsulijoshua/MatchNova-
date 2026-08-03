# Success Metrics - MatchNova

Observing and measuring performance is essential to ensuring a high-quality product. MatchNova tracks KPIs across four core pillars: Business/Financial, User Engagement, AI/Machine Learning, and Technical/Infrastructure.

---

## 1. Business & Financial Metrics

| Metric | Target | Tracking Tool | Description |
| :--- | :--- | :--- | :--- |
| **Monthly Recurring Revenue (MRR)** | \$100k+ by Month 6 | Stripe Dashboard | Total active subscription revenue per month. |
| **Annual Recurring Revenue (ARR)** | \$1.2M+ | Stripe Dashboard | Projected subscription revenue annualized. |
| **Average Revenue Per Paid User (ARPPU)** | \$20.00 | Mixpanel / Stripe | Total revenue divided by paying users. |
| **User Churn Rate** | < 5% Monthly | PostHog | Percentage of users cancelling subscriptions. |
| **Customer Acquisition Cost (CAC)** | < \$5.00 | Marketing Dashboard| Spend required to acquire a new active user. |
| **Lifetime Value (LTV)** | > \$60.00 | Mixpanel | Total projected revenue from a single user. |

---

## 2. User Engagement & Retention

| Metric | Target | Tracking Tool | Description |
| :--- | :--- | :--- | :--- |
| **Daily Active Users / Monthly Active (DAU/MAU)** | > 40% ratio | PostHog / Mixpanel | Measures user stickiness and app habituation. |
| **Average Session Length** | 8 - 12 Minutes | PostHog | Time spent per app visit. |
| **Conversation Starter Rate** | > 65% of matches | PostHog / Redis | Percentage of matches where at least one message is sent. |
| **Profile Verification Rate** | > 80% of active | PostgreSQL db | Percentage of users who complete face verification. |
| **1-Day, 7-Day, 30-Day Retention** | D1 > 50%, D30 > 20% | PostHog Cohorts | Core retention metrics. |

---

## 3. AI & Machine Learning Metrics

| Metric | Target | Tracking Tool | Description |
| :--- | :--- | :--- | :--- |
| **NSFW Precision & Recall** | Precision > 99%, Recall > 98% | FastStream Logs | Performance of image moderation microservices. |
| **Recommendation Relevance** | > 35% swipe-right rate | Qdrant query stats | Accuracy of the vector search matching engine. |
| **Icebreaker Acceptance Rate** | > 45% prompts used | Redis match counters | Percentage of matches utilizing AI-generated conversation starters. |
| **Vector Search Latency** | P95 < 50ms | Prometheus / Qdrant | Response time of high-dimensional vector similarity lookups. |
| **Facial Match Accuracy (Liveness)** | False Accept < 0.1% | Face API logs | Identity fraud and catfish detection accuracy. |

---

## 4. Technical & Infrastructure Performance

| Metric | Target | Tracking Tool | Description |
| :--- | :--- | :--- | :--- |
| **System Uptime** | 99.99% | Grafana / Cloudflare | System availability metrics. |
| **API Response Latency** | P95 < 150ms | Prometheus / Sentry | Core HTTP endpoint execution times. |
| **WebSocket Connection Success** | > 99.5% | Socket.IO / Redis | Reliability of real-time messaging pipelines. |
| **Push Notification Delivery Rate** | > 95% | BullMQ / FCM / APNs | Success rate of background push messages. |
| **Crash-Free Sessions (Mobile)** | > 99.9% | Sentry (Flutter) | Stability of iOS and Android builds. |
| **WebRTC Call Success Rate** | > 98% | Twilio Dashboard | Successful establishment of audio/video connections. |
