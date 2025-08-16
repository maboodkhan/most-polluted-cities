// Wikipedia summary fetcher with in-memory caching and rate-limit friendliness.
import axios from 'axios';
import NodeCache from 'node-cache';

const CACHE_TTL = parseInt(process.env.CACHE_SECONDS);
const cache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: Math.min(120, Math.max(30, Math.floor(CACHE_TTL/10))) });

const WIKI_BASE = (process.env.WIKI_BASE_URL || 'https://en.wikipedia.org/api/rest_v1').replace(/\/$/, '');

// Compose a title like 'Berlin, Germany'. Try multiple variants to maximize hit rate.
function candidateTitles(city, country) {
  const base = `${city}, ${country}`;
  const parts = [base, city];
  return parts;
}

export async function getCitySummary(city, country) {
  const key = `summary:${city}|${country}`;
  const cached = cache.get(key);
  if (cached) return cached;

  for (const title of candidateTitles(city, country)) {
    try {
      const url = `${WIKI_BASE}/page/summary/${encodeURIComponent(title)}`;
      const resp = await axios.get(url, {
        timeout: 9000,
        headers: { 'Accept': 'application/json', 'User-Agent': 'polluted-cities-service/1.0' }
      });
      if (resp?.data) {
        const d = resp.data;
        // skip disambiguation pages
        if (d?.type === 'disambiguation') continue;
        const description = d?.extract || d?.description || null;
        if (description) {
          cache.set(key, description);
          return description;
        }
      }
    } catch (_err) {
      // try next variant
    }
  }
  const fallback = null;
  cache.set(key, fallback);
  return fallback;
}

export function _cacheStats() {
  return { keys: cache.keys().length };
}
