export const ALIAS_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;
export const DEFAULT_URL_TTL_DAYS = 30;

/**
 * Returns true if the value is a valid http or https URL.
 * @param {string} value
 * @returns {boolean}
 */
export function validateUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Returns true if the alias matches the allowed format (3–32 chars, a-z A-Z 0-9 _ -).
 * An empty or undefined alias is also considered valid (means "generate one").
 * @param {string|undefined} alias
 * @returns {boolean}
 */
export function validateAlias(alias) {
  if (alias === undefined || alias === null || alias === '') return true;
  return ALIAS_REGEX.test(alias);
}

/**
 * Builds a full short URL from a base URL and a short code.
 * @param {string} baseUrl  e.g. "https://linkbin.io" or "http://localhost:3001"
 * @param {string} code     e.g. "my-link"
 * @returns {string}        e.g. "https://linkbin.io/my-link"
 */
export function formatShortUrl(baseUrl, code) {
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/${code}`;
}
