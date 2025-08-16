# Polluted Cities Service

A small Express service providing a single endpoint:

GET /cities?page=1&limit=10&country=FR

It fetches a list of *most polluted cities by country* from a mock API, normalizes and filters out non-city/invalid entries, enriches each city with a short description from Wikipedia, and returns a paginated JSON response.

## Quick start
npm install
npm start
# Server on http://localhost:3000

### Environment

Configure `.env`:
- `POLLUTION_API_BASE_URL` - default `https://be-recruitment-task.onrender.com`
- `POLLUTION_API_USERNAME` - `testuser`
- `POLLUTION_API_PASSWORD` - `testpass`
- `POLLUTION_DATA_ENDPOINT` - `/pollution`
- `PORT` - default `3000`
- `WIKI_BASE_URL` - default `https://en.wikipedia.org/api/rest_v1`

> The mock API requires Basic Auth and has random data corruption. The service tries an endpoint path to be compatible with the provided docs.

## Response format

json
{
  "page": 1,
  "limit": 10,
  "total": 50,
  "cities": [
    {
      "name": "Berlin",
      "country": "Germany",
      "pollution": 51.3,
      "description": "Berlin is the capital of Germany..."
    }
  ]
}

## How do we determine whether something is a city?

We combine **heuristics** and **Wikipedia validation** to minimize extra API calls:

1. **Normalization:** We trim and title‑case `city`/`country`, map fields from various possible keys, and coerce `pollution` to a number.
2. **Heuristics (fast, local):**
   - Reject names containing digits or junk tokens (`N/A`, `Unknown`, etc.).
   - Reject obvious non-city/place types by keywords: `Province`, `Region`, `District`, `County`, `State`, `River`, `Lake`, `Sea`, `Mount`, `Island`, `Airport`, `Station`, `University`, `Company`, etc.
   - Require reasonable length (2–5 words) and a plausible pollution value (0–1000).
3. **Wikipedia enrichment (rate‑limited):**
   - For requested page items only, we lookup the summary via REST endpoint `page/summary/{title}` with `"{city}, {country}"` then `"{city}"` as fallback.
   - We **skip disambiguation pages** and cache results for one day (`node-cache`).

This approach filters many corrupted entries without incurring high Wikipedia traffic.

## Assumptions & limitations

- **Heuristics:** Some legitimate cities with unusual names (e.g., numbers or special administrative suffixes) might be filtered out. Conversely, rare false positives may slip through.
- **Wikipedia:** Summaries may be missing for small towns/settlements or return non‑city pages; we avoid extra category lookups to respect rate limits.
- **Pagination:** We enrich only the current page to reduce Wikipedia calls. Sorting is by descending `pollution` after normalization and de‑duplication by `city|country`.

## Project structure

src/
  server.js               # Express app
  lib/
    cities-router.js      # GET /cities implementation
    pollution-client.js   # Mock API client (basic auth supported)
    utils.js              # normalization & validation helpers
    wiki.js               # Wikipedia summary fetcher
.env
package.json
README.md