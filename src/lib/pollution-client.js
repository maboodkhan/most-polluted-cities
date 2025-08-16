// Client to fetch pollution data from mock API.
// The docs require basic auth. We'll support that via env.
import axios from 'axios';

function getAuth() {
  const username = process.env.POLLUTION_API_USERNAME;
  const password = process.env.POLLUTION_API_PASSWORD;
  if (username && password) {
    return { username, password };
  }
  return undefined;
}

export async function fetchRawPollution(obj) {
  const auth = getAuth();
  let lastError;
  const url = process.env.POLLUTION_API_BASE_URL + process.env.POLLUTION_DATA_ENDPOINT;
  try {
    const resp = await axios.get(url, { auth, timeout: 10000, country: obj.country, page: obj.page, limit: obj.limit});
    if (resp && resp.data) return resp.data;
  } catch (err) {
    lastError = err;
    // continue trying other endpoints
  }
  
  // If all failed, throw the last error
  const e = new Error('Failed to fetch pollution data from mock API. Check base URL and credentials.');
  e.cause = lastError;
  e.status = 502;
  throw e;
}
