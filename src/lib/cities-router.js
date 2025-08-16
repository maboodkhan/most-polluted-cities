import express from 'express';
import { fetchRawPollution } from './pollution-client.js';
import { normalizeName, normalizeCountry, isLikelyCity, toNumber } from './utils.js';
import { getCitySummary } from './wiki.js';

function normalizeRecord(rec) {
  // Accept various possible shapes; attempt to map to { name, country, pollution }
  const name = normalizeName(rec?.city || rec?.name || rec?.town || rec?.place);
  const country = normalizeCountry(rec?.country || rec?.nation || rec?.iso_country || rec?.countryName);
  const pollution = toNumber(rec?.pollution || rec?.aqi || rec?.pm25 || rec?.value);
  return { name, country, pollution };
}

function recordLooksValid({ name, country, pollution }) {
  if (!name || !country) return false;
  if (!isLikelyCity(name)) return false;
  if (typeof pollution !== 'number' || !Number.isFinite(pollution)) return false;
  // pollution plausible range
  if (pollution < 0 || pollution > 1000) return false;
  return true;
}

export default function citiesRouter({ logger }) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    const country = req.query.country;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '10', 10)));

    try {
      const raw = await fetchRawPollution({country: country, page: page, limit: limit});

      // Normalize: ensure array
      const list = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);

      // Map, filter, dedupe by city-country
      const mapped = list.map(normalizeRecord).filter(recordLooksValid);
      const seen = new Set();
      const deduped = [];
      for (const r of mapped) {
        const key = `${r.name}|${r.country}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(r);
      }

      // Sort by pollution desc (most polluted first)
      deduped.sort((a,b) => b.pollution - a.pollution);

      // Enrich WITH minimal extra calls: unique city-country and paginate first, then fetch summaries for the current page only
      const total = deduped.length;
      const start = (page - 1) * limit;
      const pageItems = deduped.slice(start, start + limit);

      // Fetch Wikipedia descriptions in parallel but capped to avoid spikes
      const concurrency = 5;
      async function pMap(items, fn, pool=concurrency) {
        const ret = [];
        let i = 0;
        const running = new Set();
        async function runNext() {
          if (i >= items.length) return;
          const idx = i++;
          const p = (async () => {
            try {
              ret[idx] = await fn(items[idx], idx);
            } catch (e) {
              ret[idx] = null;
            } finally {
              running.delete(p);
              await runNext();
            }
          })();
          running.add(p);
        }
        const initial = Math.min(pool, items.length);
        for (let k = 0; k < initial; k++) await runNext();
        await Promise.all([...running]);
        return ret;
      }

      const descriptions = await pMap(pageItems, async (r) => (await getCitySummary(r.name, r.country)) || '');
      const cities = pageItems.map((r, idx) => ({ ...r, description: descriptions[idx] || '' }));

      res.json({ page, limit, total, cities });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
