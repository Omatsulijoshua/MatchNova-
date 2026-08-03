# Vector Database Payload & Indexing Schema - MatchNova

To calculate multi-dimensional compatibility recommendations in sub-50ms, MatchNova uses the Qdrant vector database. This document defines the vector dimensions, payload structure, and indexing strategies.

---

## 1. Vector Configuration

* **Collection Name**: `profiles`
* **Embedding Model**: OpenAI `text-embedding-3-small` (or equivalent enterprise transformer).
* **Vector Dimensions**: `1536`
* **Distance Metric**: `Cosine` (optimal for normalized semantic similarity).

---

## 2. Payload Structure

Each vector entry in the Qdrant database is associated with a JSON payload containing query-filtering attributes.

```json
{
  "user_id": "7ca64b4c-9f89-49bb-9c24-4f51e06d9a19",
  "gender": "female",
  "gender_pref": ["male", "non-binary"],
  "birth_year": 1997,
  "verified": true,
  "location": {
    "lat": 37.7749,
    "lon": -122.4194
  },
  "blocked_users": [
    "1d2c3b4a-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
  ]
}
```

---

## 3. Qdrant Payload Indexing

To prevent full collection scans when performing radius or attribute filters, payload fields must have active indexes.

| Field Path | Index Type | Purpose |
| :--- | :--- | :--- |
| `gender` | `Keyword` | Pre-filters candidates by gender. |
| `gender_pref` | `Keyword` | Pre-filters candidates by preference lists. |
| `birth_year` | `Integer` | Enforces age range filters during query. |
| `verified` | `Bool` | Allows filtering for verified profiles only. |
| `location` | `Geo` | Performs geofencing and radius search (e.g. within 25 miles). |

---

## 4. Query Pipeline (Hybrid Search)

When a user requests their recommendation stack, the NestJS gateway issues a hybrid query to Qdrant combining strict logical filters and vector similarity calculations:

```json
{
  "filter": {
    "must": [
      {
        "key": "gender",
        "match": { "value": "female" }
      },
      {
        "key": "gender_pref",
        "match": { "value": "male" }
      },
      {
        "key": "birth_year",
        "range": {
          "gte": 1991,
          "lte": 2004
        }
      },
      {
        "key": "location",
        "geo_radius": {
          "center": {
            "lat": 37.7749,
            "lon": -122.4194
          },
          "radius": 40233.6
        }
      }
    ],
    "must_not": [
      {
        "key": "user_id",
        "match": { "value": "1d2c3b4a-5e6f-7a8b-9c0d-1e2f3a4b5c6d" }
      }
    ]
  },
  "params": {
    "hnsw_ef": 128,
    "exact": false
  },
  "limit": 20
}
```

*Note: Coordinates in the geo-filter are blurred (fuzzy coords) to protect user location privacy while querying.*
