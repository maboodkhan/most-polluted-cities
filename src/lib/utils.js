// Utility helpers: normalization, validation, title-casing.
export function normalizeName(raw) {
  if (!raw || typeof raw !== 'string') return null;
  // remove surrounding whitespace, collapse internal whitespace, strip weird punctuation at ends
  let s = raw.replace(/[\u0000-\u001F]/g, '').trim();
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/^[,.;:()\-\s]+|[,.;:()\-\s]+$/g, '');
  if (!s) return null;
  // title case words, but keep common particles lowercased
  const lowerParticles = new Set(['of','and','the','de','la','di','da','du','von','van','al','el','le','la','del']);
  s = s.split(' ').map((w, i) => {
    const lw = w.toLowerCase();
    if (i > 0 && lowerParticles.has(lw)) return lw;
    // handle hyphenated and apostrophes
    return lw.split('-').map(seg => seg.charAt(0).toUpperCase() + seg.slice(1)).join('-')
             .split("'").map(seg => seg.charAt(0).toUpperCase() + seg.slice(1)).join("'");  
  }).join(' ');
  return s;
}

export function normalizeCountry(raw) {
  return normalizeName(raw);
}

export function isLikelyCity(name) {
  if (!name) return false;
  if (name.length < 2) return false;
  // reject if contains digits or obvious non-place tokens
  if (/\d/.test(name)) return false;
  const banned = /(Province|Region|District|County|State|Prefecture|Oblast|Krai|Governorate|Department|River|Lake|Sea|Mount|Island|Islands|Archipelago|Desert|Airport|Station|University|Company|Corp|Ltd|Inc)\b/i;
  if (banned.test(name)) return false;
  // reject if it's clearly a country-only value or 'N/A' etc.
  const junk = /^(N\/A|Unknown|null|City|TBD|NA)$/i;
  if (junk.test(name)) return false;
  // if more than 5 words it's unlikely a city
  if (name.split(/\s+/).length > 5) return false;
  return true;
}

export function toNumber(n) {
  if (typeof n === 'number') return n;
  if (typeof n === 'string') {
    const parsed = parseFloat(n.replace(/,/g, '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
